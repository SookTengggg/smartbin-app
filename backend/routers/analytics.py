from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from database.supabase_client import supabase

router = APIRouter(prefix="/api/analytics", tags=["Analytics Dashboard"])

@router.get("/dashboard")
async def get_analytics_dashboard(
    range: str = Query("7days", description="today, 7days, 30days, custom"),
    station: str = Query("Main Kitchen", description="Kitchen station filter"),
    start_date: str = Query(None, description="Format YYYY-MM-DD if range=custom"),
    end_date: str = Query(None, description="Format YYYY-MM-DD if range=custom")
):
    """
    Endpoint B.2: Analytics Aggregations Dashboard
    Queries Supabase, computes KPI deltas, pending reviews, and chart series.
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Determine date filtering boundaries for current and prior periods
        if range == "today":
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=1)
            prior_end_dt = start_dt
        elif range == "7days":
            start_dt = now - timedelta(days=7)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=7)
            prior_end_dt = start_dt
        elif range == "30days":
            start_dt = now - timedelta(days=30)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=30)
            prior_end_dt = start_dt
        elif range == "custom" and start_date and end_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            duration = end_dt - start_dt
            prior_start_dt = start_dt - duration
            prior_end_dt = start_dt
        else:
            start_dt = now - timedelta(days=7)
            end_dt = now
            prior_start_dt = start_dt - timedelta(days=7)
            prior_end_dt = start_dt

        # Fetch verified records for the active date range
        response = supabase.table("waste_logs") \
            .select("*") \
            .eq("station", station) \
            .eq("status", "VERIFIED") \
            .gte("created_at", start_dt.isoformat()) \
            .lte("created_at", end_dt.isoformat()) \
            .execute()
        
        records = response.data if response.data else []

        # Fetch pending review records count and weight
        pending_response = supabase.table("waste_logs") \
            .select("total_weight_grams") \
            .eq("station", station) \
            .eq("status", "PENDING_REVIEW") \
            .gte("created_at", start_dt.isoformat()) \
            .lte("created_at", end_dt.isoformat()) \
            .execute()
        
        pending_records = pending_response.data if pending_response.data else []
        pending_count = len(pending_records)
        pending_weight_kg = round(sum(float(r.get("total_weight_grams", 0)) for r in pending_records) / 1000.0, 2)

        # Fetch prior period records for comparative growth metrics
        prior_response = supabase.table("waste_logs") \
            .select("total_weight_kg", "total_financial_loss_myr") \
            .eq("station", station) \
            .eq("status", "VERIFIED") \
            .gte("created_at", prior_start_dt.isoformat()) \
            .lte("created_at", prior_end_dt.isoformat()) \
            .execute()
        
        prior_records = prior_response.data if prior_response.data else []
        prior_weight_kg = sum(float(r.get("total_weight_kg", 0.0)) for r in prior_records)
        prior_cost_myr = sum(float(r.get("total_financial_loss_myr", 0.0)) for r in prior_records)

        # Initialize aggregation containers
        total_weight_kg = 0.0
        total_profit_leakage_myr = 0.0
        total_carbon_impact_co2 = 0.0
        
        daily_trends_map = {}
        taxonomy_shares = {}
        root_causes = {
            "Plate waste": {"weight_kg": 0.0, "count": 0},
            "Over-preparation": {"weight_kg": 0.0, "count": 0},
            "Expiration or spoilage": {"weight_kg": 0.0, "count": 0},
            "Prep trimmings": {"weight_kg": 0.0, "count": 0},
            "Others": {"weight_kg": 0.0, "count": 0}
        }
        category_confidences = {}

        # Process each verified database record
        for row in records:
            w_kg = float(row.get("total_weight_kg", 0.0))
            cost = float(row.get("total_financial_loss_myr", 0.0))
            co2 = float(row.get("carbon_impact_co2_kg", 0.0))
            reason = row.get("waste_reason", "Others")
            
            total_weight_kg += w_kg
            total_profit_leakage_myr += cost
            total_carbon_impact_co2 += co2

            # Aggregate daily trend totals
            date_key = row.get("created_at", "").split("T")[0]
            if date_key not in daily_trends_map:
                daily_trends_map[date_key] = {"weight_kg": 0.0, "cost_myr": 0.0}
            daily_trends_map[date_key]["weight_kg"] += w_kg
            daily_trends_map[date_key]["cost_myr"] += cost

            # Aggregate root-cause categories
            if reason not in root_causes:
                root_causes[reason] = {"weight_kg": 0.0, "count": 0}
            root_causes[reason]["weight_kg"] += w_kg
            root_causes[reason]["count"] += 1

            # Aggregate category breakdown shares and confidences
            breakdown = row.get("density_breakdown", {})
            for cat, details in breakdown.items():
                cat_w = float(details.get("weight_g", 0.0)) / 1000.0
                cat_cost = float(details.get("cost_myr", 0.0))
                cat_conf = float(details.get("confidence", 0.0))

                if cat not in taxonomy_shares:
                    taxonomy_shares[cat] = {"weight_kg": 0.0, "cost_myr": 0.0}
                taxonomy_shares[cat]["weight_kg"] += cat_w
                taxonomy_shares[cat]["cost_myr"] += cat_cost

                if cat not in category_confidences:
                    category_confidences[cat] = []
                category_confidences[cat].append(cat_conf)

        # Calculate period-over-period percentage changes
        weight_growth_pct = round(((total_weight_kg - prior_weight_kg) / prior_weight_kg) * 100.0, 1) if prior_weight_kg > 0 else 0.0
        cost_growth_pct = round(((total_profit_leakage_myr - prior_cost_myr) / prior_cost_myr) * 100.0, 1) if prior_cost_myr > 0 else 0.0

        # Finalize averages and format datasets for Recharts
        avg_category_confidences = {cat: round(sum(vals)/len(vals), 4) for cat, vals in category_confidences.items()}
        
        formatted_daily_trends = [
            {"date": d, "weight_kg": round(v["weight_kg"], 2), "cost_myr": round(v["cost_myr"], 2)}
            for d, v in sorted(daily_trends_map.items())
        ]
        
        total_tax_w = sum(item["weight_kg"] for item in taxonomy_shares.values())
        formatted_taxonomy_share = [
            {
                "category": c, 
                "display_name": c.replace("_", " ").title(), 
                "weight_kg": round(v["weight_kg"], 2), 
                "percentage": round((v["weight_kg"] / total_tax_w) * 100, 1) if total_tax_w > 0 else 0, 
                "cost_myr": round(v["cost_myr"], 2)
            } 
            for c, v in taxonomy_shares.items()
        ]
        
        formatted_root_causes = [
            {"reason": r, "weight_kg": round(v["weight_kg"], 2), "count": v["count"]} 
            for r, v in root_causes.items()
        ]

        # Return structured JSON payload matching frontend and API contracts
        return {
            "kpi_cards": {
                "total_weight_kg": round(total_weight_kg, 2),
                "weight_growth_percentage": weight_growth_pct,
                "total_profit_leakage_myr": round(total_profit_leakage_myr, 2),
                "cost_growth_percentage": cost_growth_pct,
                "total_carbon_impact_co2_kg": round(total_carbon_impact_co2, 2),
                "category_confidence_breakdown": avg_category_confidences,
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