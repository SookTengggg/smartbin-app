import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.ai_service import run_ai_inference
from services.storage_service import upload_file_to_storage
from database.supabase_client import supabase

router = APIRouter(prefix="/api/waste", tags=["Waste Disposal"])

@router.post("/disposal")
async def record_disposal(
    weight_grams: float = Form(..., description="Waste weight in grams"),
    waste_reason: str = Form(..., description="e.g. Plate Waste, Over-preparation"),
    file: UploadFile = File(..., description="Uploaded food photo")
):
    """
    Endpoint B.1: Record Waste Disposal (Waste Receiver Page)
    """
    try:
        # Generate unique event ID
        event_id = f"E{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"

        # Read uploaded image bytes
        image_bytes = await file.read()

        # Upload photo to Supabase Storage
        snapshot_url = upload_file_to_storage(
            file_bytes=image_bytes,
            original_filename=file.filename,
            bucket_name="disposal-snapshots"
        )

        # Run AI inference
        ai_result = run_ai_inference(
            event_id=event_id,
            image_filename=file.filename,
            total_scale_weight_grams=weight_grams
        )

        # Calculate carbon footprint
        weight_kg = round(weight_grams / 1000.0, 3)
        co2_kg = round(weight_kg * 0.7, 3)

        # Extract AI gating decision and confidence
        gate = ai_result["calibration_security_gate"]
        action_decision = gate["action_routing_decision"]
        calibrated_conf = gate["calibrated_confidence_score"]

        # Extract composition breakdown
        comp = ai_result["density_scaled_composition"]
        breakdown = comp["breakdown"]

        # Determine top 3 categories by area percentage
        top_3_guesses = [
            category for category, data in sorted(
                breakdown.items(), 
                key=lambda item: item[1].get("area_percentage", 0), 
                reverse=True
            )[:3]
        ]

        # Determine primary category by weight
        primary_cat = max(
            breakdown.items(), 
            key=lambda item: item[1].get("calculated_weight_grams", 0)
        )[0]

        # Format clean density breakdown for non-zero items
        density_breakdown = {}
        for cat, data in breakdown.items():
            if data.get("calculated_weight_grams", 0) > 0:
                density_breakdown[cat] = {
                    "area_pct": data.get("area_percentage", 0.0),
                    "weight_g": data.get("calculated_weight_grams", 0.0),
                    "cost_myr": data.get("financial_cost_loss_myr", 0.0),
                    "confidence": data.get("confidence_score", 0.0)
                }

        heatmap_url = ai_result["explainable_ai_logs"]["heatmap_image_url"]

        # Assign status based on decision
        record_status = "VERIFIED" if action_decision == "auto_accept" else "PENDING_REVIEW"
        recorded_primary = primary_cat if action_decision == "auto_accept" else "Unrecognized"

        # Prepare database entry
        log_entry = {
            "event_id": event_id,
            "station": "Main Kitchen",
            "total_weight_grams": weight_grams,
            "total_weight_kg": weight_kg,
            "waste_reason": waste_reason,
            "primary_category": recorded_primary,
            "total_financial_loss_myr": comp["total_financial_loss_myr"],
            "carbon_impact_co2_kg": co2_kg,
            "calibrated_confidence_score": calibrated_conf,
            "action_routing_decision": action_decision,
            "density_breakdown": density_breakdown,
            "snapshot_url": snapshot_url,
            "heatmap_url": heatmap_url,
            "status": record_status
        }

        # Insert record into Supabase waste_logs table
        supabase.table("waste_logs").insert(log_entry).execute()

        # Route unconfident predictions to flagged reviews queue
        if action_decision == "manual_review":
            supabase.table("flagged_reviews").insert({
                "event_id": event_id,
                "snapshot_url": snapshot_url,
                "total_weight_grams": weight_grams,
                "raw_ai_guesses": density_breakdown,
                "review_status": "PENDING"
            }).execute()

        # Return standardized response payload
        return {
            "status": "SUCCESS",
            "event_id": event_id,
            "action_routing_decision": action_decision,
            "calibrated_confidence_score": calibrated_conf,
            "top_3_guesses": top_3_guesses,
            "summary": {
                "total_weight_grams": weight_grams,
                "total_weight_kg": weight_kg,
                "waste_reason": waste_reason,
                "total_financial_loss_myr": comp["total_financial_loss_myr"],
                "carbon_impact_co2_kg": co2_kg,
                "primary_category": recorded_primary
            },
            "density_breakdown": density_breakdown,
            "snapshot_url": snapshot_url,
            "heatmap_url": heatmap_url
        }

    except Exception as e:
        print(f"Error in record_disposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))