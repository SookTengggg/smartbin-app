from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List
from database.supabase_client import supabase

router = APIRouter(prefix="/api/config", tags=["Admin & Pricing Configuration"])

# Pydantic schemas for request validation
class PriceItem(BaseModel):
    category_key: str
    price_per_100g_myr: float

class BatchPriceUpdate(BaseModel):
    prices: List[PriceItem]

class NewCategoryAdd(BaseModel):
    category_key: str
    display_name: str
    price_per_100g_myr: float


@router.get("/pricing")
async def get_all_pricing():
    """
    Endpoint B.5 (Read): Fetches all food category price configurations from Supabase.
    """
    try:
        response = supabase.table("pricing_config").select("*").order("display_name").execute()
        data = response.data if response.data else []
        return data
    except Exception as e:
        print(f"Error in get_all_pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/pricing")
async def update_single_pricing(payload: PriceItem):
    """
    Endpoint B.5 (Update single): Updates the price per 100g for a specific category key.
    """
    try:
        update_data = {
            "price_per_100g_myr": payload.price_per_100g_myr,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        response = supabase.table("pricing_config") \
            .update(update_data) \
            .eq("category_key", payload.category_key) \
            .execute()

        return {
            "status": "UPDATED",
            "category_key": payload.category_key,
            "new_price_per_100g_myr": payload.price_per_100g_myr,
            "updated_at": update_data["updated_at"]
        }
    except Exception as e:
        print(f"Error in update_single_pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/pricing/batch")
async def update_batch_pricing(payload: BatchPriceUpdate):
    """
    Supports the 'Save prices' button on the Admin page which saves multiple categories at once.
    """
    try:
        current_time = datetime.now(timezone.utc).isoformat()
        
        for item in payload.prices:
            supabase.table("pricing_config") \
                .update({
                    "price_per_100g_myr": item.price_per_100g_myr,
                    "updated_at": current_time
                }) \
                .eq("category_key", item.category_key) \
                .execute()

        return {
            "status": "BATCH_UPDATED",
            "count": len(payload.prices),
            "updated_at": current_time
        }
    except Exception as e:
        print(f"Error in update_batch_pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pricing/category")
async def add_new_category(payload: NewCategoryAdd):
    """
    Supports the 'Add category' form on the Admin page to create a brand new food category.
    """
    try:
        new_row = {
            "category_key": payload.category_key.lower().replace(" ", "_"),
            "display_name": payload.display_name,
            "price_per_100g_myr": payload.price_per_100g_myr,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        supabase.table("pricing_config").insert(new_row).execute()

        return {
            "status": "CREATED",
            "data": new_row
        }
    except Exception as e:
        print(f"Error in add_new_category: {e}")
        raise HTTPException(status_code=500, detail=str(e))