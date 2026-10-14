import uuid
from fastapi import HTTPException
from database.supabase_client import supabase

def upload_file_to_storage(file_bytes: bytes, original_filename: str, bucket_name: str = "disposal-snapshots") -> str:
    """
    Uploads an image to Supabase Storage bucket and returns its public URL.
    Raises HTTPException(400) if upload fails to trigger frontend re-upload.
    """
    try:
        extension = original_filename.split(".")[-1] if "." in original_filename else "jpg"
        unique_filename = f"{uuid.uuid4().hex}.{extension}"

        # Upload file bytes to Supabase Storage bucket
        supabase.storage.from_(bucket_name).upload(
            path=unique_filename,
            file=file_bytes,
            file_options={"content-type": f"image/{extension}"}
        )

        # Retrieve and return public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
        return public_url

    except Exception as e:
        print(f"Storage upload error: {e}")
        # Explicit error for frontend to catch and show Re-upload dialog
        raise HTTPException(
            status_code=400,
            detail=f"Image upload failed: {str(e)}. Please re-upload the photo."
        )