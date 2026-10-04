from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SmartBin Backend API", version="1.0.0")

# 1. Enable CORS so your UI teammate can connect without browser errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "online", "message": "SmartBin Backend API is running"}

# 2. Endpoint: Waste Receiver (Simulates Hardware/Page 1 entry)
@app.post("/api/waste/disposal")
async def log_disposal(
    weight_grams: float = Form(...),
    waste_reason: str = Form(...),
    file: UploadFile = File(...)
):
    # Placeholder logic (To be connected to Supabase and AI model)
    cost_rm = round((weight_grams / 100) * 0.80, 2)
    co2_kg = round((weight_grams / 1000) * 2.5, 2)
    
    return {
        "status": "SUCCESS",
        "disposal_id": 101,
        "received_filename": file.filename,
        "weight_grams": weight_grams,
        "calculated_cost_rm": cost_rm,
        "carbon_co2e_kg": co2_kg,
        "predicted_category": "Rice Waste",
        "confidence_score": 95.4
    }

# 3. Endpoint: Executive Analytics KPIs (For UI Page 2)
@app.get("/api/analytics/kpi")
def get_kpis():
    return {
        "total_weight_kg": 1240.5,
        "weight_growth_pct": 3.2,
        "total_profit_leakage_rm": 18600.0,
        "total_carbon_impact_co2": 3100.0,
        "category_accuracies": {
            "Rice Waste": 95.4,
            "Meat / Poultry": 89.2,
            "Vegetables": 92.0
        }
    }