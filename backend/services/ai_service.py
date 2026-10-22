import os
import requests
from fastapi import HTTPException

AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://localhost:8001/ai/infer")

def run_ai_inference(event_id: str, image_filename: str, total_scale_weight_grams: float, image_bytes: bytes = None):
    """
    Forwards the image and weight to your AI teammate's real cloud model on Render 
    and returns her actual JSON response.
    """
    try:
        # Prepare multipart/form-data payload for her FastAPI server
        files = {
            "image_file": (image_filename, image_bytes, "image/jpeg") if image_bytes else ("test.jpg", b"fake_bytes", "image/jpeg")
        }
        data = {
            "event_id": event_id,
            "total_scale_weight_grams": str(total_scale_weight_grams)
        }

        # Send HTTP POST request to  live cloud AI service (with a 90s timeout for ML latency)
        print(f"🚀 Calling AI Server at: {AI_SERVER_URL}")
        response = requests.post(AI_SERVER_URL, files=files, data=data, timeout=180)

        if response.status_code == 200:
            return response.json() # Returns real YOLOv11 cloud JSON output!
        else:
            raise HTTPException(
                status_code=502, 
                detail=f"AI Server Error ({response.status_code}): {response.text}"
            )

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503, 
            detail="Could not connect to AI cloud model server on Render."
        )
    except Exception as e:
        print(f"AI Inference bridge error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"AI bridging failed: {str(e)}"
        )