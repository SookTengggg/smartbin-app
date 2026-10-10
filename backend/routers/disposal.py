from fastapi import APIRouter, UploadFile, File, Form
from services.ai_service import run_ai_inference

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
    # Run AI inference using the service
    ai_result = run_ai_inference(
        image_filename=file.filename,
        total_scale_weight_grams=weight_grams
    )

    weight_kg = round(weight_grams / 1000.0, 3)
    co2_kg = round(weight_kg * 0.7, 3) 

    # Extract AI Gating & Confidence
    gate = ai_result["calibration_security_gate"]
    action_decision = gate["action_routing_decision"]
    calibrated_conf = gate["calibrated_confidence_score"]

    # Extract Composition
    comp = ai_result["density_scaled_composition"]
    breakdown = comp["breakdown"]

    # Extract top 3 guesses for the user review modal
    top_3_guesses = [
        category for category, data in sorted(
            breakdown.items(), 
            key=lambda item: item[1].get("area_percentage", 0), 
            reverse=True
        )[:3]
    ]

    # Find Primary Category (whichever has the largest weight)
    primary_cat = max(
        breakdown.items(), 
        key=lambda item: item[1].get("calculated_weight_grams", 0)
    )[0]

    # Format clean density breakdown for Frontend
    density_breakdown = {}
    for cat, data in breakdown.items():
        if data.get("calculated_weight_grams", 0) > 0:
            density_breakdown[cat] = {
                "area_pct": data.get("area_percentage", 0.0),
                "weight_g": data.get("calculated_weight_grams", 0.0),
                "cost_myr": data.get("financial_cost_loss_myr", 0.0),
                "confidence": data.get("confidence_score", 0.0)
            }

    # Return exact JSON matching Endpoint B.1 Contract
    return {
        "status": "SUCCESS",
        "event_id": ai_result["event_id"],
        "action_routing_decision": action_decision,
        "calibrated_confidence_score": calibrated_conf,
        "top_3_guesses": top_3_guesses,
        "summary": {
            "total_weight_grams": weight_grams,
            "total_weight_kg": weight_kg,
            "waste_reason": waste_reason,
            "total_financial_loss_myr": comp["total_financial_loss_myr"],
            "carbon_impact_co2_kg": co2_kg,
            "primary_category": primary_cat
        },
        "density_breakdown": density_breakdown,
        # Temporary placeholder links until Supabase Storage upload is hooked up
        "snapshot_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
        "heatmap_url": ai_result["explainable_ai_logs"]["heatmap_image_url"]
    }