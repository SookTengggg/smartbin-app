from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Query
from database.supabase_client import supabase

router = APIRouter(prefix="/api/waste", tags=["Live Log History"])

# Define Malaysia Timezone (UTC +8)
MY_TZ = timezone(timedelta(hours=8))

@router.get("/logs")
async def get_waste_logs(
    range: str = Query("7days", description="today, 7days, 30days, custom"),
    station: str = Query("Main Kitchen", description="Kitchen station filter"),
    start_date: str = Query(None, alias="from", description="Filter from YYYY-MM-DD or MM/DD/YYYY"),
    end_date: str = Query(None, alias="to", description="Filter to YYYY-MM-DD or MM/DD/YYYY"),
    category: str = Query(None, description="Filter by food category key"),
    status: str = Query(None, description="VERIFIED or PENDING_REVIEW"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Records per page")
):
    """
    Endpoint B.3: Live Disposal Logs Table (Live Log Page)
    Supports date range filtering (Malaysia time UTC+8), status, category, sorting, and pagination.
    """
    try:
        now = datetime.now(MY_TZ)
        clean_range = range.lower().replace(" ", "").replace("_", "")

        # Determine Malaysia timezone date boundaries
        if clean_range in ["today", "todays"]:
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif clean_range in ["7days", "last7days", "week"]:
            start_dt = now - timedelta(days=7)
            end_dt = now
        elif clean_range in ["30days", "last30days", "month"]:
            start_dt = now - timedelta(days=30)
            end_dt = now
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
        else:
            start_dt = now - timedelta(days=7)
            end_dt = now

        # Base Supabase query with station filter
        query = supabase.table("waste_logs").select("*", count="exact").eq("station", station)

        # Apply Malaysia-to-UTC converted date boundaries for database matching
        query = query.gte("created_at", start_dt.astimezone(timezone.utc).isoformat()) \
                     .lte("created_at", end_dt.astimezone(timezone.utc).isoformat())

        # Apply Optional Filters
        if status:
            query = query.eq("status", status.upper())
        if category:
            query = query.not_.is_(f"density_breakdown->{category}->weight_g", "null")

        # Apply Sorting
        is_desc = (sort_order.lower() == "desc")
        query = query.order(sort_by, desc=is_desc)

        # Apply Pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        response = query.execute()
        records = response.data if response.data else []
        total_records = response.count if response.count is not None else len(records)

        formatted_records = []
        for row in records:
            status_val = row.get("status", "VERIFIED")
            
            # Format category summary for the table column
            if status_val == "PENDING_REVIEW":
                summary_str = "Not labelled yet"
            else:
                breakdown = row.get("density_breakdown", {})
                summary_parts = []
                for cat, data in breakdown.items():
                    pct = data.get("area_pct", 0)
                    if pct > 0:
                        clean_name = cat.replace("_", " ").title()
                        summary_parts.append(f"{clean_name}")
                summary_str = ", ".join(summary_parts) if summary_parts else row.get("primary_category", "Unrecognized").replace("_", " ").title()

            formatted_records.append({
                "id": row.get("id"),
                "event_id": row.get("event_id"),
                "timestamp_utc": row.get("created_at"),
                "summary_category": summary_str,
                "total_weight_grams": row.get("total_weight_grams"),
                "total_cost_myr": row.get("total_financial_loss_myr"),
                "waste_reason": row.get("waste_reason"),
                "status": status_val,
                "snapshot_thumbnail_url": row.get("snapshot_url")
            })

        return {
            "total_records": total_records,
            "current_page": page,
            "per_page": limit,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1,
            "records": formatted_records
        }

    except Exception as e:
        print(f"Error in get_waste_logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{event_id}")
async def get_log_detail(event_id: str):
    """
    Endpoint B.4: Log Detail & XAI Modal Inspection (Modal)
    Returns data structured for both Verified and Pending Review modal popups.
    """
    try:
        response = supabase.table("waste_logs").select("*").eq("event_id", event_id).execute()
        data = response.data

        if not data or len(data) == 0:
            raise HTTPException(status_code=404, detail=f"Disposal event '{event_id}' not found.")

        row = data[0]
        status_val = row.get("status", "VERIFIED")

        return {
            "event_id": row.get("event_id"),
            "status": status_val,
            "system_metadata": {
                "model_version": "smartbin-yolov11s-seg-v1.2",
                "timestamp_utc": row.get("created_at"),
                "latency_ms": 118.5
            },
            "media": {
                "snapshot_url": row.get("snapshot_url"),
                "heatmap_url": row.get("heatmap_url")
            },
            "sensor_telemetry": {
                "total_scale_weight_grams": row.get("total_weight_grams"),
                "scale_sensor_status": "stable",
                "camera_lux_level": 420.0
            },
            "explainable_ai": {
                "algorithm_applied": "Grad-CAM",
                "target_backbone_layer": "model.model.model.22.conv",
                "calibrated_confidence_score": row.get("calibrated_confidence_score"),
                "audit_trail_status": "verified_trustworthy" if status_val == "VERIFIED" else "pending_manual_audit"
            },
            "summary": {
                "waste_reason": row.get("waste_reason"),
                "total_weight_grams": row.get("total_weight_grams"),
                "total_financial_loss_myr": row.get("total_financial_loss_myr") if status_val == "VERIFIED" else 0.0,
                "carbon_impact_co2_kg": row.get("carbon_impact_co2_kg") if status_val == "VERIFIED" else 0.0
            },
            "volumetric_composition": {
                "breakdown": row.get("density_breakdown") if status_val == "VERIFIED" else {}
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in get_log_detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))