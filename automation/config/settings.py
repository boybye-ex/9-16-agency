"""
Configuration settings for the Client Acquisition Automation Workflow.
All sensitive values are loaded from environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
TEMPLATES_DIR = BASE_DIR / "templates"

# Database
DATABASE_PATH = DATA_DIR / "leads.db"

# Meta Ad Library API
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_API_VERSION = "v26.0"
META_API_BASE_URL = f"https://graph.facebook.com/{META_API_VERSION}"
META_RATE_LIMIT_CALLS = 200
META_RATE_LIMIT_PERIOD = 3600  # seconds (1 hour)

# Target countries for ad scraping (ISO codes)
TARGET_COUNTRIES = ["ZA"]  # South Africa

# Industry keywords to search for
INDUSTRY_KEYWORDS = [
    "ecommerce",
    "beauty",
    "fashion",
    "fitness",
    "skincare",
    "clothing",
    "online store",
    "shop now",
    "lifestyle brand",
]

# Minimum estimated spend to target (in local currency range indicator)
MIN_SPEND_INDICATOR = "5000"  # R5,000+

# Telegram Bot
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o"  # or "gpt-4o-mini" for cost efficiency
OPENAI_MODEL_MINI = "gpt-4o-mini"

# Google AI (Google Flow)
GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY", "")
GOOGLE_AI_MODEL = "gemini-1.5-pro"

# SendGrid
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "outreach@916.agency")
SENDGRID_FROM_NAME = "9:16 Agency"

# Email discovery (optional - Hunter.io)
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY", "")

# Agency details for templates
AGENCY_NAME = "9:16 Agency"
AGENCY_WEBSITE = "https://916.agency"
AGENCY_PHONE = "+27 XX XXX XXXX"
AGENCY_ADDRESS = "Johannesburg, South Africa"
AGENCY_EMAIL = "hello@916.agency"

# Lead status values
class LeadStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONTENT_READY = "content_ready"
    SENT = "sent"
    RESPONDED = "responded"
    CONVERTED = "converted"

# Scheduling
SCRAPE_HOUR = 9  # 9 AM
PROCESS_INTERVAL_HOURS = 2
SEND_HOUR = 10  # 10 AM

# Rate limiting delays (seconds)
API_DELAY_META = 18  # ~200 calls/hour = 1 call every 18 seconds
API_DELAY_OPENAI = 1
API_DELAY_SENDGRID = 0.1

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
