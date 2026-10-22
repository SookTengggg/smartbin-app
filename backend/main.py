import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import disposal, analytics, logs, admin, reports

# Automatically wake up the AI server on Render when backend starts up
@asynccontextmanager
async def lifespan(app: FastAPI):
    AI_BASE_URL = "https://smartbin-ai-ikxi.onrender.com"
    print("🔄 Pinging AI server to wake it up from sleep mode...")
    try:
        async with httpx.AsyncClient() as client:
            await client.get(AI_BASE_URL, timeout=10.0)
        print("✅ AI server is awake!")
    except Exception as e:
        print(f"⚠️ Could not ping AI server: {e}")
    yield

app = FastAPI(
    title="SmartBin Backend API", 
    description="IoT & AI-Powered Food Waste Management API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(disposal.router)
app.include_router(analytics.router)
app.include_router(logs.router)
app.include_router(admin.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"status": "online", "message": "SmartBin Backend API is running"}