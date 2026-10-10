from datetime import datetime, timezone

def run_ai_inference(event_id: str, image_filename: str, total_scale_weight_grams: float):
    """
    Simulates the YOLOv11s-seg + TS-AURC + Grad-CAM inference pipeline.
    """
    total_segmented_pixels = 264000

    # Decision threshold evaluation
    calibrated_confidence = 0.9247
    decision_threshold = 0.55
    action_decision = "auto_accept" if calibrated_confidence >= decision_threshold else "manual_review"

    # Dynamic weight distribution based on scale reading
    rice_weight = round(total_scale_weight_grams * 0.50, 2)
    chicken_weight = round(total_scale_weight_grams * 0.30, 2)
    veg_weight = round(total_scale_weight_grams * 0.15, 2)
    soup_weight = round(total_scale_weight_grams * 0.05, 2)

    # Cost calculations based on benchmark rates
    rice_cost = round((rice_weight / 100.0) * 0.261, 2)
    chicken_cost = round((chicken_weight / 100.0) * 0.954, 2)
    veg_cost = round((veg_weight / 100.0) * 1.20, 2)
    soup_cost = round((soup_weight / 100.0) * 1.50, 2)
    total_cost = round(rice_cost + chicken_cost + veg_cost + soup_cost, 2)

    breakdown_data = {
        "rice_rice_dishes": {
            "allocated_pixels": int(total_segmented_pixels * 0.50),
            "area_percentage": 50.0,
            "density_rho": 1.00,
            "calculated_weight_grams": rice_weight,
            "financial_cost_loss_myr": rice_cost,
            "confidence_score": 0.9540
        },
        "chicken": {
            "allocated_pixels": int(total_segmented_pixels * 0.30),
            "area_percentage": 30.0,
            "density_rho": 1.15,
            "calculated_weight_grams": chicken_weight,
            "financial_cost_loss_myr": chicken_cost,
            "confidence_score": 0.9540
        },
        "vegetables_cooked": {
            "allocated_pixels": int(total_segmented_pixels * 0.15),
            "area_percentage": 15.0,
            "density_rho": 0.55,
            "calculated_weight_grams": veg_weight,
            "financial_cost_loss_myr": veg_cost,
            "confidence_score": 0.9540
        },
        "soup_curry": {
            "allocated_pixels": int(total_segmented_pixels * 0.05),
            "area_percentage": 5.0,
            "density_rho": 1.05,
            "calculated_weight_grams": soup_weight,
            "financial_cost_loss_myr": soup_cost,
            "confidence_score": 0.9540
        },
        "noodles_pasta": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 0.95, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "beef_lamb": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 1.20, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "seafood": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 1.10, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "fruits_raw": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 0.60, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "bread_bakery": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 0.70, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "eggs_dairy": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 1.02, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "desserts_sweets": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 0.85, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "mixed_leftovers": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 1.00, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 },
        "non_food": { "allocated_pixels": 0, "area_percentage": 0.0, "density_rho": 1.00, "calculated_weight_grams": 0.0, "financial_cost_loss_myr": 0.0, "confidence_score": 0.0 }
    }

    return {
        "event_id": event_id,
        "system_metadata": {
            "model_version": "smartbin-yolov11s-seg-v1.2",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "latency_ms": 118.5
        },
        "hardware_sensor_inputs": {
            "total_scale_weight_grams": total_scale_weight_grams,
            "scale_sensor_status": "stable",
            "camera_lux_level": 420.0
        },
        "calibration_security_gate": {
            "optimization_method": "TS-AURC",
            "calibrated_confidence_score": calibrated_confidence,
            "operational_thresholds": {
                "decision_threshold": decision_threshold
            },
            "action_routing_decision": action_decision
        },
        "density_scaled_composition": {
            "total_segmented_food_pixels": total_segmented_pixels,
            "composition_metric_type": "volumetric_density_apportionment",
            "breakdown": breakdown_data,
            "total_financial_loss_myr": total_cost
        },
        "explainable_ai_logs": {
            "algorithm_applied": "Grad-CAM",
            "target_backbone_layer": "model.model.model.22.conv",
            "heatmap_image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
            "audit_trail_status": "verified_trustworthy"
        }
    }