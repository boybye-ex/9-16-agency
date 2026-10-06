"""
9:16 Agency Client Acquisition Automation Modules.

Available modules:
- database: SQLite database operations for lead management
- meta_scraper: Meta Ad Library scraper for finding potential clients
- telegram_bot: Telegram notifications and approval workflow
- content_generator: ChatGPT-powered content generation
- strategy_pack: 14-day strategy PDF generator
- video_generator: Video prompt generator for Google Flow
- email_sender: SendGrid email delivery
"""

from modules.database import (
    init_database,
    add_lead,
    get_lead,
    get_leads_by_status,
    update_lead,
    update_lead_status,
    save_generated_content,
    mark_email_sent,
    get_pipeline_stats,
    get_stats_sync,
)

__all__ = [
    "init_database",
    "add_lead",
    "get_lead",
    "get_leads_by_status",
    "update_lead",
    "update_lead_status",
    "save_generated_content",
    "mark_email_sent",
    "get_pipeline_stats",
    "get_stats_sync",
]
