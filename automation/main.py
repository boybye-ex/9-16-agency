#!/usr/bin/env python3
"""
9:16 Agency Client Acquisition Automation
Main orchestration script with CLI commands.

Usage:
    python main.py scrape              # Run Meta Ad Library scraper
    python main.py notify              # Send Telegram notifications for new leads
    python main.py generate            # Generate content for approved leads
    python main.py strategy <lead_id>  # Generate strategy pack for a lead
    python main.py video <lead_id>     # Generate video prompts for a lead
    python main.py send                # Send emails to content-ready leads
    python main.py process             # Run full pipeline (scrape → notify → generate → send)
    python main.py bot                 # Start Telegram bot in polling mode
    python main.py stats               # Show pipeline statistics
    python main.py digest              # Send daily digest to Telegram
    python main.py init                # Initialize database
"""

import asyncio
import logging
import sys
from datetime import datetime

import click

from config.settings import (
    LOG_LEVEL,
    LOG_FORMAT,
    TELEGRAM_BOT_TOKEN,
    OPENAI_API_KEY,
    SENDGRID_API_KEY,
    META_ACCESS_TOKEN,
    LeadStatus,
)
from modules.database import init_database, get_pipeline_stats, get_stats_sync

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT
)
logger = logging.getLogger(__name__)


def check_config(required: list) -> bool:
    """Check if required API keys are configured."""
    config_map = {
        "meta": ("META_ACCESS_TOKEN", META_ACCESS_TOKEN),
        "telegram": ("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN),
        "openai": ("OPENAI_API_KEY", OPENAI_API_KEY),
        "sendgrid": ("SENDGRID_API_KEY", SENDGRID_API_KEY),
    }
    
    missing = []
    for key in required:
        if key in config_map:
            name, value = config_map[key]
            if not value:
                missing.append(name)
    
    if missing:
        click.echo(click.style(f"Missing configuration: {', '.join(missing)}", fg="red"))
        click.echo("Add these to your .env file")
        return False
    return True


@click.group()
@click.version_option(version="1.0.0", prog_name="916 Automation")
def cli():
    """9:16 Agency Client Acquisition Automation CLI."""
    pass


@cli.command()
def init():
    """Initialize the database."""
    click.echo("Initializing database...")
    init_database()
    click.echo(click.style("Database initialized successfully!", fg="green"))


@cli.command()
def stats():
    """Show pipeline statistics."""
    click.echo("\n📊 Pipeline Statistics\n")
    
    try:
        stats = get_stats_sync()
        
        click.echo(f"  Pending:       {stats.get(LeadStatus.PENDING, 0)}")
        click.echo(f"  Approved:      {stats.get(LeadStatus.APPROVED, 0)}")
        click.echo(f"  Rejected:      {stats.get(LeadStatus.REJECTED, 0)}")
        click.echo(f"  Content Ready: {stats.get(LeadStatus.CONTENT_READY, 0)}")
        click.echo(f"  Sent:          {stats.get(LeadStatus.SENT, 0)}")
        click.echo(f"  Responded:     {stats.get(LeadStatus.RESPONDED, 0)}")
        click.echo(f"  Converted:     {stats.get(LeadStatus.CONVERTED, 0)}")
        click.echo(f"\n  Total:         {stats.get('total', 0)}")
        
    except Exception as e:
        click.echo(click.style(f"Error: {e}", fg="red"))


@cli.command()
@click.option("--limit", "-l", default=50, help="Maximum leads to scrape")
@click.option("--keywords", "-k", multiple=True, help="Search keywords (overrides defaults)")
def scrape(limit, keywords):
    """Scrape potential clients from Meta Ad Library."""
    if not check_config(["meta"]):
        return
    
    click.echo(f"🔍 Starting Meta Ad Library scrape (limit: {limit})...")
    
    async def run_scrape():
        from modules.meta_scraper import MetaAdLibraryScraper
        from modules.database import add_lead
        
        async with MetaAdLibraryScraper() as scraper:
            search_keywords = list(keywords) if keywords else None
            leads = await scraper.scrape_leads(
                keywords=search_keywords,
                limit=limit
            )
            
            new_count = 0
            for lead_data in leads:
                lead_id = await add_lead(lead_data)
                if lead_id:
                    new_count += 1
            
            return len(leads), new_count
    
    try:
        total, new = asyncio.run(run_scrape())
        click.echo(click.style(f"✅ Found {total} leads, {new} new added to database", fg="green"))
    except Exception as e:
        click.echo(click.style(f"❌ Scrape failed: {e}", fg="red"))
        logger.exception("Scrape error")


@cli.command()
@click.option("--limit", "-l", default=10, help="Maximum notifications to send")
def notify(limit):
    """Send Telegram notifications for pending leads."""
    if not check_config(["telegram"]):
        return
    
    click.echo(f"📱 Sending Telegram notifications (limit: {limit})...")
    
    async def run_notify():
        from modules.telegram_bot import notify_new_leads
        from modules.database import get_leads_by_status
        
        leads = await get_leads_by_status(LeadStatus.PENDING, limit=limit)
        
        if not leads:
            return 0
        
        return await notify_new_leads(leads)
    
    try:
        sent = asyncio.run(run_notify())
        click.echo(click.style(f"✅ Sent {sent} notifications", fg="green"))
    except Exception as e:
        click.echo(click.style(f"❌ Notification failed: {e}", fg="red"))
        logger.exception("Notify error")


@cli.command()
@click.option("--limit", "-l", default=10, help="Maximum leads to process")
def generate(limit):
    """Generate content for approved leads."""
    if not check_config(["openai"]):
        return
    
    click.echo(f"🤖 Generating content for approved leads (limit: {limit})...")
    
    async def run_generate():
        from modules.content_generator import process_approved_leads
        return await process_approved_leads(limit=limit)
    
    try:
        processed = asyncio.run(run_generate())
        click.echo(click.style(f"✅ Generated content for {processed} leads", fg="green"))
    except Exception as e:
        click.echo(click.style(f"❌ Content generation failed: {e}", fg="red"))
        logger.exception("Generate error")


@cli.command()
@click.argument("lead_id", type=int)
def strategy(lead_id):
    """Generate strategy pack PDF for a specific lead."""
    if not check_config(["openai"]):
        return
    
    click.echo(f"📄 Generating strategy pack for lead {lead_id}...")
    
    async def run_strategy():
        from modules.strategy_pack import generate_strategy_for_lead
        return await generate_strategy_for_lead(lead_id)
    
    try:
        pdf_path = asyncio.run(run_strategy())
        if pdf_path:
            click.echo(click.style(f"✅ Strategy pack saved: {pdf_path}", fg="green"))
        else:
            click.echo(click.style("❌ Failed to generate strategy pack", fg="red"))
    except Exception as e:
        click.echo(click.style(f"❌ Error: {e}", fg="red"))
        logger.exception("Strategy error")


@cli.command()
@click.argument("lead_id", type=int)
def video(lead_id):
    """Generate video prompts for a specific lead."""
    if not check_config(["openai"]):
        return
    
    click.echo(f"🎬 Generating video prompts for lead {lead_id}...")
    
    async def run_video():
        from modules.video_generator import generate_video_prompts_for_lead
        return await generate_video_prompts_for_lead(lead_id)
    
    try:
        prompts_path = asyncio.run(run_video())
        if prompts_path:
            click.echo(click.style(f"✅ Video prompts saved: {prompts_path}", fg="green"))
        else:
            click.echo(click.style("❌ Failed to generate video prompts", fg="red"))
    except Exception as e:
        click.echo(click.style(f"❌ Error: {e}", fg="red"))
        logger.exception("Video error")


@cli.command()
@click.option("--limit", "-l", default=10, help="Maximum emails to send")
@click.option("--sandbox", is_flag=True, help="Test mode (validate without sending)")
def send(limit, sandbox):
    """Send outreach emails to content-ready leads."""
    if not check_config(["sendgrid"]):
        return
    
    mode = "SANDBOX" if sandbox else "LIVE"
    click.echo(f"📧 Sending emails [{mode}] (limit: {limit})...")
    
    async def run_send():
        from modules.email_sender import send_outreach_to_ready_leads
        return await send_outreach_to_ready_leads(limit=limit, sandbox_mode=sandbox)
    
    try:
        results = asyncio.run(run_send())
        
        if results["success"]:
            click.echo(click.style(f"✅ Sent {results['sent']} emails", fg="green"))
        else:
            click.echo(click.style(
                f"⚠️  Sent {results['sent']}, failed {results.get('failed', 0)}",
                fg="yellow"
            ))
            
        if results.get("details"):
            click.echo("\nDetails:")
            for detail in results["details"]:
                status = "✓" if detail["success"] else "✗"
                click.echo(f"  {status} {detail['business_name']} ({detail['email']})")
                
    except Exception as e:
        click.echo(click.style(f"❌ Send failed: {e}", fg="red"))
        logger.exception("Send error")


@cli.command()
@click.option("--limit", "-l", default=20, help="Maximum leads per step")
@click.option("--skip-scrape", is_flag=True, help="Skip scraping step")
@click.option("--skip-notify", is_flag=True, help="Skip notification step")
@click.option("--sandbox", is_flag=True, help="Sandbox mode for emails")
def process(limit, skip_scrape, skip_notify, sandbox):
    """Run the full acquisition pipeline."""
    click.echo("\n🚀 Starting full pipeline...\n")
    click.echo(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo(f"  Limit: {limit} per step")
    click.echo(f"  Sandbox: {sandbox}\n")
    
    async def run_pipeline():
        results = {}
        
        if not skip_scrape:
            if check_config(["meta"]):
                click.echo("Step 1/5: Scraping Meta Ad Library...")
                from modules.meta_scraper import MetaAdLibraryScraper
                from modules.database import add_lead
                
                async with MetaAdLibraryScraper() as scraper:
                    leads = await scraper.scrape_leads(limit=limit)
                    new_count = 0
                    for lead_data in leads:
                        if await add_lead(lead_data):
                            new_count += 1
                    results["scrape"] = {"found": len(leads), "new": new_count}
                    click.echo(f"         Found {len(leads)}, added {new_count} new\n")
            else:
                results["scrape"] = {"skipped": "Missing config"}
        else:
            results["scrape"] = {"skipped": "User skip"}
            click.echo("Step 1/5: Scraping... SKIPPED\n")
        
        if not skip_notify:
            if check_config(["telegram"]):
                click.echo("Step 2/5: Sending Telegram notifications...")
                from modules.telegram_bot import notify_new_leads
                from modules.database import get_leads_by_status
                
                pending = await get_leads_by_status(LeadStatus.PENDING, limit=limit)
                if pending:
                    sent = await notify_new_leads(pending)
                    results["notify"] = {"sent": sent}
                    click.echo(f"         Sent {sent} notifications\n")
                else:
                    results["notify"] = {"sent": 0, "message": "No pending leads"}
                    click.echo("         No pending leads\n")
            else:
                results["notify"] = {"skipped": "Missing config"}
        else:
            results["notify"] = {"skipped": "User skip"}
            click.echo("Step 2/5: Notifications... SKIPPED\n")
        
        if check_config(["openai"]):
            click.echo("Step 3/5: Generating content for approved leads...")
            from modules.content_generator import process_approved_leads
            
            processed = await process_approved_leads(limit=limit)
            results["generate"] = {"processed": processed}
            click.echo(f"         Generated content for {processed} leads\n")
        else:
            results["generate"] = {"skipped": "Missing config"}
        
        click.echo("Step 4/5: Generating strategy packs...")
        from modules.database import get_leads_by_status
        from modules.strategy_pack import generate_strategy_for_lead
        
        content_ready = await get_leads_by_status(LeadStatus.CONTENT_READY, limit=limit)
        strategy_count = 0
        for lead in content_ready:
            if not lead.get("strategy_pack_path"):
                if await generate_strategy_for_lead(lead["id"]):
                    strategy_count += 1
        results["strategy"] = {"generated": strategy_count}
        click.echo(f"         Generated {strategy_count} strategy packs\n")
        
        if check_config(["sendgrid"]):
            click.echo(f"Step 5/5: Sending emails {'[SANDBOX]' if sandbox else ''}...")
            from modules.email_sender import send_outreach_to_ready_leads
            
            send_results = await send_outreach_to_ready_leads(
                limit=limit,
                sandbox_mode=sandbox
            )
            results["send"] = send_results
            click.echo(f"         Sent {send_results['sent']} emails\n")
        else:
            results["send"] = {"skipped": "Missing config"}
        
        return results
    
    try:
        results = asyncio.run(run_pipeline())
        
        click.echo("\n" + "=" * 50)
        click.echo("📊 Pipeline Summary")
        click.echo("=" * 50)
        for step, data in results.items():
            if isinstance(data, dict):
                if "skipped" in data:
                    click.echo(f"  {step}: SKIPPED ({data['skipped']})")
                else:
                    click.echo(f"  {step}: {data}")
        click.echo("=" * 50 + "\n")
        
    except Exception as e:
        click.echo(click.style(f"\n❌ Pipeline failed: {e}", fg="red"))
        logger.exception("Pipeline error")


@cli.command()
def bot():
    """Start Telegram bot in polling mode."""
    if not check_config(["telegram"]):
        return
    
    click.echo("🤖 Starting Telegram bot...")
    click.echo("Press Ctrl+C to stop\n")
    
    from modules.telegram_bot import run_bot
    
    try:
        run_bot()
    except KeyboardInterrupt:
        click.echo("\n\nBot stopped.")


@cli.command()
def digest():
    """Send daily digest to Telegram."""
    if not check_config(["telegram"]):
        return
    
    click.echo("📊 Sending daily digest...")
    
    async def run_digest():
        from modules.telegram_bot import send_daily_digest
        await send_daily_digest()
    
    try:
        asyncio.run(run_digest())
        click.echo(click.style("✅ Digest sent", fg="green"))
    except Exception as e:
        click.echo(click.style(f"❌ Failed: {e}", fg="red"))


@cli.command()
def test_config():
    """Test all API configurations."""
    click.echo("\n🔧 Testing API Configurations\n")
    
    configs = [
        ("Meta Ad Library", META_ACCESS_TOKEN),
        ("Telegram Bot", TELEGRAM_BOT_TOKEN),
        ("OpenAI", OPENAI_API_KEY),
        ("SendGrid", SENDGRID_API_KEY),
    ]
    
    for name, value in configs:
        if value:
            masked = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
            click.echo(f"  ✓ {name}: {masked}")
        else:
            click.echo(click.style(f"  ✗ {name}: Not configured", fg="red"))
    
    click.echo("\n💡 Add missing keys to your .env file")
    
    async def test_sendgrid():
        from modules.email_sender import test_email_config
        return await test_email_config()
    
    if SENDGRID_API_KEY:
        click.echo("\n📧 Testing SendGrid...")
        result = asyncio.run(test_sendgrid())
        if result["success"]:
            click.echo(click.style("  ✓ SendGrid API working (sandbox test)", fg="green"))
        else:
            click.echo(click.style(f"  ✗ SendGrid test failed: {result.get('error')}", fg="red"))


if __name__ == "__main__":
    cli()
