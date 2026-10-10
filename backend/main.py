from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import disposal

app = FastAPI(
    title="SmartBin Backend API", 
    description="IoT & AI-Powered Food Waste Management API",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(disposal.router)

# Health check root endpoint
@app.get("/")
def root():
    return {"status": "online", "message": "SmartBin Backend API is running"}

# Analytics KPI (Temporary mock for UI teammate until routers/analytics.py is built)
@app.get("/api/analytics/kpi")
def get_kpis():
    return {
        "total_weight_kg": 1240.5,
        "weight_growth_pct": 3.2,
        "total_profit_leakage_rm": 18600.0,
        "total_carbon_impact_co2": 868.35,  
        "category_accuracies": {
            "Rice & Dishes": 95.4,
            "Chicken Meat": 95.4,
            "Cooked Vegetables": 95.4,
            "Soup & Curry": 95.4
        }
    }