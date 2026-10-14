from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from database.supabase_client import supabase

router = APIRouter(prefix="/api/analytics", tags=["Analytics Dashboard"])

MY_TZ = timezone(timedelta(hours=8))

@router.get("/dashboard")
async def get_analytics_dashboard(
    range: str = Query("7days", description="today, 7days, 30days, custom"),
    station: str = Query("Main Kitchen", description="Kitchen station filter"),
    start_date: str = Query(None, alias="from", description="Supports start_date or 'from'"),
    end_date: str = Query(None, alias="to", description="Supports end_date or 'to'")
):
    """
    Endpoint B.2: Analytics Aggregations Dashboard
    """
    try:
        now = datetime.now(MY_TZ)
        clean_range = (range or "7days").lower().replace(" ", "").replace("_", "")

        is_today = clean_range in ["today", "todays"]

        # Date boundaries
        if is_today:
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=1)
            prior_end_dt = start_dt
        elif clean_range in ["30days", "last30days", "month"]:
            start_dt = now - timedelta(days=30)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=30)
            prior_end_dt = start_dt
        elif clean_range in ["custom", "customrange"] and start_date and end_date:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
                try:
                    start_dt = datetime.strptime(start_date, fmt).replace(tzinfo=MY_TZ)
                    end_dt = datetime.strptime(end_date, fmt).replace(hour=23, minute=59, second=59, tzinfo=MY_TZ)
                    break
                except ValueError:
                    continue
            else:
                start_dt = now - timedelta(days=7)
                end_dt = now
            duration = end_dt - start_dt
            prior_start_dt = start_dt - duration
            prior_end_dt = start_dt
        else: # Default 7days
            start_dt = now - timedelta(days=7)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=7)
            prior_end_dt = start_dt

        # Fetch verified records
        response = supabase.table("waste_logs") \
            .select("*") \
            .eq("station", station) \
            .eq("status", "VERIFIED") \
            .gte("created_at", start_dt.astimezone(timezone.utc).isoformat()) \
            .lte("created_at", end_dt.astimezone(timezone.utc).isoformat()) \
            .execute()
        records = response.data if response.data else []

        # Fetch pending review records
        pending_response = supabase.table("waste_logs") \
            .select("total_weight_grams") \
            .eq("station", station) \
            .eq("status", "PENDING_REVIEW") \
            .gte("created_at", start_dt.astimezone(timezone.utc).isoformat()) \
            .lte("created_at", end_dt.astimezone(timezone.utc).isoformat()) \
            .execute()
        pending_records = pending_response.data if pending_response.data else []
        pending_count = len(pending_records)
        pending_weight_kg = round(sum(float(r.get("total_weight_grams") or 0.0) for r in pending_records) / 1000.0, 2)

        # Fetch prior period records for comparison
        prior_response = supabase.table("waste_logs") \
            .select("total_weight_kg, total_financial_loss_myr") \
            .eq("station", station) \
            .eq("status", "VERIFIED") \
            .gte("created_at", prior_start_dt.astimezone(timezone.utc).isoformat()) \
            .lte("created_at", prior_end_dt.astimezone(timezone.utc).isoformat()) \
            .execute()
        prior_records = prior_response.data if prior_response.data else []
        prior_weight_kg = sum(float(r.get("total_weight_kg") or 0.0) for r in prior_records)
        prior_cost_myr = sum(float(r.get("total_financial_loss_myr") or 0.0) for r in prior_records)

        # Aggregators
        total_weight_kg = 0.0
        total_profit_leakage_myr = 0.0
        total_carbon_impact_co2 = 0.0

        daily_trends_map = {}
        taxonomy_shares = {}
        root_causes = {
            "Plate waste": {"weight_kg": 0.0, "count": 0, "foods": {}},
            "Over-preparation": {"weight_kg": 0.0, "count": 0, "foods": {}},
            "Expiration or spoilage": {"weight_kg": 0.0, "count": 0, "foods": {}},
            "Prep trimmings": {"weight_kg": 0.0, "count": 0, "foods": {}},
            "Others": {"weight_kg": 0.0, "count": 0, "foods": {}}
        }

        # Process each record
        for row in records:
            w_kg = float(row.get("total_weight_kg") or 0.0)
            cost = float(row.get("total_financial_loss_myr") or 0.0)
            co2 = float(row.get("carbon_impact_co2_kg") or (w_kg * 0.7))
            reason = row.get("waste_reason") or "Others"

            total_weight_kg += w_kg
            total_profit_leakage_myr += cost
            total_carbon_impact_co2 += co2

            # Time grouping: Hourly if 'today', Daily otherwise
            utc_dt = datetime.fromisoformat(row.get("created_at").replace("Z", "+00:00"))
            my_dt = utc_dt.astimezone(MY_TZ)
            time_key = my_dt.strftime("%H:00") if is_today else my_dt.strftime("%Y-%m-%d")

            if time_key not in daily_trends_map:
                daily_trends_map[time_key] = {"date": time_key, "weight_kg": 0.0, "cost_myr": 0.0, "disposals_count": 0, "foods": {}}
            
            daily_trends_map[time_key]["weight_kg"] += w_kg
            daily_trends_map[time_key]["cost_myr"] += cost
            daily_trends_map[time_key]["disposals_count"] += 1

            if reason not in root_causes:
                root_causes[reason] = {"weight_kg": 0.0, "count": 0, "foods": {}}
            root_causes[reason]["weight_kg"] += w_kg
            root_causes[reason]["count"] += 1

            # Food breakdowns
            breakdown = row.get("density_breakdown") or {}
            for cat, details in breakdown.items():
                cat_w = float(details.get("weight_g") or 0.0) / 1000.0
                cat_cost = float(details.get("cost_myr") or 0.0)

                # Overall taxonomy shares
                if cat not in taxonomy_shares:
                    taxonomy_shares[cat] = {"weight_kg": 0.0, "cost_myr": 0.0}
                taxonomy_shares[cat]["weight_kg"] += cat_w
                taxonomy_shares[cat]["cost_myr"] += cat_cost

                # Daily/hourly trend foods breakdown (for tooltip)
                t_foods = daily_trends_map[time_key]["foods"]
                if cat not in t_foods:
                    t_foods[cat] = {"weight_kg": 0.0, "cost_myr": 0.0}
                t_foods[cat]["weight_kg"] += cat_w
                t_foods[cat]["cost_myr"] += cat_cost

                # Root cause foods breakdown (for "what was over-prepared?")
                r_foods = root_causes[reason]["foods"]
                if cat not in r_foods:
                    r_foods[cat] = {"weight_kg": 0.0, "cost_myr": 0.0}
                r_foods[cat]["weight_kg"] += cat_w
                r_foods[cat]["cost_myr"] += cat_cost

        # Growth rates
        weight_growth_pct = round(((total_weight_kg - prior_weight_kg) / prior_weight_kg) * 100.0, 1) if prior_weight_kg > 0 else 0.0
        cost_growth_pct = round(((total_profit_leakage_myr - prior_cost_myr) / prior_cost_myr) * 100.0, 1) if prior_cost_myr > 0 else 0.0

        # Format Daily Trends with nested foods array
        formatted_daily_trends = []
        for k, v in sorted(daily_trends_map.items()):
            trend_foods = [
                {"category": cat_key.replace("_", " ").title(), "weight_kg": round(f["weight_kg"], 2), "cost_myr": round(f["cost_myr"], 2)}
                for cat_key, f in sorted(v["foods"].items(), key=lambda x: x[1]["weight_kg"], reverse=True)
            ]
            formatted_daily_trends.append({
                "date": v["date"],
                "weight_kg": round(v["weight_kg"], 2),
                "cost_myr": round(v["cost_myr"], 2),
                "disposals_count": v["disposals_count"],
                "foods": trend_foods
            })

        # Format Taxonomy Share
        total_tax_w = sum(item["weight_kg"] for item in taxonomy_shares.values())
        formatted_taxonomy_share = [
            {
                "category": c,
                "display_name": c.replace("_", " ").title(),
                "weight_kg": round(v["weight_kg"], 2),
                "percentage": round((v["weight_kg"] / total_tax_w) * 100, 1) if total_tax_w > 0 else 0,
                "cost_myr": round(v["cost_myr"], 2)
            }
            for c, v in sorted(taxonomy_shares.items(), key=lambda x: x[1]["weight_kg"], reverse=True)
        ]

        # Format Root Causes with nested foods array
        formatted_root_causes = []
        for r, v in root_causes.items():
            r_foods = [
                {"category": cat_key.replace("_", " ").title(), "weight_kg": round(f["weight_kg"], 2), "cost_myr": round(f["cost_myr"], 2)}
                for cat_key, f in sorted(v["foods"].items(), key=lambda x: x[1]["weight_kg"], reverse=True)
            ]
            formatted_root_causes.append({
                "reason": r,
                "weight_kg": round(v["weight_kg"], 2),
                "count": v["count"],
                "foods": r_foods
            })

        return {
            "kpi_cards": {
                "total_waste_weight_kg": round(total_weight_kg, 2),
                "weight_growth_percentage": weight_growth_pct,
                "total_profit_leakage_myr": round(total_profit_leakage_myr, 2),
                "cost_growth_percentage": cost_growth_pct,
                "total_carbon_impact_co2_kg": round(total_carbon_impact_co2, 2),
                "pending_review_notice": {
                    "count": pending_count,
                    "weight_kg": pending_weight_kg
                }
            },
            "charts": {
                "daily_trends": formatted_daily_trends,
                "taxonomy_category_share": formatted_taxonomy_share,
                "root_cause_analysis": formatted_root_causes
            }
        }

    except Exception as e:
        print(f"Error in get_analytics_dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))