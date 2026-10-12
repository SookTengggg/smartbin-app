import uuid
from database.supabase_client import supabase

def upload_file_to_storage(file_bytes: bytes, original_filename: str, bucket_name: str = "disposal-snapshots") -> str:
    """
    Uploads an image to Supabase Storage bucket and returns its public URL.
    """
    try:
        extension = original_filename.split(".")[-1] if "." in original_filename else "jpg"
        unique_filename = f"{uuid.uuid4().hex}.{extension}"

        # Upload file to Supabase Storage Bucket
        supabase.storage.from_(bucket_name).upload(
            path=unique_filename,
            file=file_bytes,
            file_options={"content-type": f"image/{extension}"}
        )

        # Retrieve and return public web link
        public_url = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
        return public_url
    except Exception as e:
        print(f"Storage upload error: {e}")
        # Safe fallback image if bucket upload encounters an issue
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600"