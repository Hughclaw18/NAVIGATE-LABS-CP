import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables if using dotenv
load_dotenv()

# Default configuration - replace with your actual project URL
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project-id.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sbp_43920ff81b020b837e8131183ccedbaffd60145d")

# Access token for MCP
SUPABASE_ACCESS_TOKEN = os.getenv("SUPABASE_ACCESS_TOKEN", "sbp_43920ff81b020b837e8131183ccedbaffd60145d")

def get_supabase_client():
    """
    Creates and returns a Supabase client.
    Returns:
        Supabase client instance
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Example usage:
# client = get_supabase_client()
# response = client.table('user_settings').select('*').execute() 