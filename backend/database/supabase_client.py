import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load secrets from backend/.env
load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file!")

# Initialize the Supabase Client
supabase: Client = create_client(supabase_url, supabase_key)