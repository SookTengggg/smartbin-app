from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from database.supabase_client import supabase

router = APIRouter(prefix="/api", tags=["Reports"])

MY_TZ = timezone(timedelta(hours=8))
CO2_PER_KG = 0.7
REASONS = ["Plate waste", "Over-preparation", "Expiration or spoilage", "Prep trimmings", "Others"]

def resolve_range(range_name, start_date, end_date):
    now = datetime.now(MY_TZ)
    clean = (range_name or "7days").lower().replace(" ", "").replace("_", "")
    if clean in ["today"]:
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    if clean in ["30days", "last30days"]:
        return now - timedelta(days=30), now
    if clean in ["custom", "customrange"] and start_date and end_date:
        for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
            try:
                start_dt = datetime.strptime(start_date, fmt).replace(tzinfo=MY_TZ)
                end_dt = datetime.strptime(end_date, fmt).replace(hour=23, minute=59, second=59, tzinfo=MY_TZ)
                return start_dt, end_dt
            except ValueError:
                continue
    return now - timedelta(days=7), now

def fetch_all(station, start_dt, end_dt, reason):
    rows, page_size, offset = [], 1000, 0
    while True:
        query = supabase.table("waste_logs").select("*") \
            .eq("station", station) \
            .gte("created_at", start_dt.astimezone(timezone.utc).isoformat()) \
            .lte("created_at", end_dt.astimezone(timezone.utc).isoformat())
        if reason:
            query = query.eq("waste_reason", reason)
        batch = query.order("created_at").range(offset, offset + page_size - 1).execute().data or []
        rows.extend(batch)
        if len(batch) < page_size:
            return rows
        offset += page_size

@router.get("/reports")
async def get_report(
    range: str = Query("7days", description="today, 7days, 30days, custom"),
    station: str = Query("Main Kitchen", description="Kitchen station filter"),
    start_date: str = Query(None, alias="from", description="YYYY-MM-DD for custom range"),
    end_date: str = Query(None, alias="to", description="YYYY-MM-DD for custom range"),
    reason: str = Query(None, description="Waste reason filter; leave empty for all")
):
    """
    Endpoint for ESG Report and Cost Analysis Report.
    """
    try:
        start_dt, end_dt = resolve_range(range, start_date, end_date)
        rows = fetch_all(station, start_dt, end_dt, reason)

        verified = [r for r in rows if r.get("status") == "VERIFIED"]
        pending = [r for r in rows if r.get("status") == "PENDING_REVIEW"]

        totals = {"disposals": 0, "weight_kg": 0.0, "cost_myr": 0.0, "carbon_kg": 0.0}
        by_day, by_food = {}, {}
        by_reason = {r: {"reason": r, "count": 0, "weight_kg": 0.0, "cost_myr": 0.0} for r in REASONS}

        for row in verified:
            w_raw = row.get("total_weight_grams") or 0.0
            w_kg = float(w_raw) / 1000.0
            cost = float(row.get("total_financial_loss_myr") or 0.0)
            co2 = float(row.get("carbon_impact_co2_kg") or (w_kg * CO2_PER_KG))
            reason_name = row.get("waste_reason") or "Others"

            totals["disposals"] += 1
            totals["weight_kg"] += w_kg
            totals["cost_myr"] += cost
            totals["carbon_kg"] += co2

            # Group by day in Malaysia time
            utc_dt = datetime.fromisoformat(row.get("created_at").replace("Z", "+00:00"))
            day = utc_dt.astimezone(MY_TZ).strftime("%Y-%m-%d")
            d = by_day.setdefault(day, {"date": day, "count": 0, "weight_kg": 0.0, "cost_myr": 0.0, "carbon_kg": 0.0, "foods": {}})
            d["count"] += 1
            d["weight_kg"] += w_kg
            d["cost_myr"] += cost
            d["carbon_kg"] += co2

            r = by_reason.setdefault(reason_name, {"reason": reason_name, "count": 0, "weight_kg": 0.0, "cost_myr": 0.0})
            r["count"] += 1
            r["weight_kg"] += w_kg
            r["cost_myr"] += cost

            # Breakdown per food category
            for cat, details in (row.get("density_breakdown") or {}).items():
                cat_kg = float(details.get("weight_g") or 0.0) / 1000.0
                cat_cost = float(details.get("cost_myr") or 0.0)
                for target in (by_food, d["foods"]):
                    f = target.setdefault(cat, {"category": cat.replace("_", " ").title(), "weight_kg": 0.0, "cost_myr": 0.0})
                    f["weight_kg"] += cat_kg
                    f["cost_myr"] += cat_cost

        def rounded(item):
            return {k: (round(v, 2) if isinstance(v, float) else v) for k, v in item.items()}

        def food_list(foods):
            return [rounded(f) for f in sorted(foods.values(), key=lambda f: f["cost_myr"], reverse=True)]

        return {
            "period": {
                "start": start_dt.strftime("%Y-%m-%d"),
                "end": min(end_dt, datetime.now(MY_TZ)).strftime("%Y-%m-%d")
            },
            "filters": {"station": station, "reason": reason or "All reasons"},
            "totals": rounded(totals),
            "pending": {
                "count": len(pending),
                "weight_kg": round(sum(float(r.get("total_weight_grams") or 0.0) for r in pending) / 1000.0, 2)
            },
            "by_day": [
                {**rounded({k: v for k, v in d.items() if k != "foods"}), "foods": food_list(d["foods"])}
                for _, d in sorted(by_day.items())
            ],
            "by_food": food_list(by_food),
            "by_reason": [rounded(r) for r in by_reason.values()]
        }

    except Exception as e:
        print(f"Error in get_report: {e}")
        raise HTTPException(status_code=500, detail=str(e))