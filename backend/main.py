from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import disposal, analytics, logs, admin, reports

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
app.include_router(analytics.router)
app.include_router(logs.router)
app.include_router(admin.router)
app.include_router(reports.router)

# Health check root endpoint
@app.get("/")
def root():
    return {"status": "online", "message": "SmartBin Backend API is running"}
