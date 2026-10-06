"""
Telegram Bot Module.
Handles notifications and approval workflow for leads.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)

from config.settings import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    LeadStatus,
    AGENCY_NAME,
)
from modules.database import (
    get_lead,
    get_leads_by_status,
    update_lead_status,
    set_telegram_message_id,
    get_lead_by_telegram_message,
    get_pipeline_stats,
)

logger = logging.getLogger(__name__)


class LeadApprovalBot:
    """
    Telegram bot for lead notification and approval workflow.
    
    Features:
    - Send new lead notifications with approve/reject buttons
    - Handle callback queries for approvals
    - Provide stats and pending lead summaries
    """
    
    def __init__(self, token: str = None, chat_id: str = None):
        self.token = token or TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or TELEGRAM_CHAT_ID
        self.application: Optional[Application] = None
        
    def _create_lead_message(self, lead: Dict[str, Any]) -> str:
        """Format a lead notification message."""
        creative_preview = lead.get("ad_creative_sample", "")[:200]
        if len(lead.get("ad_creative_sample", "")) > 200:
            creative_preview += "..."
            
        return f"""
🎯 *New Lead Found*

*Business:* {lead.get('business_name', 'Unknown')}
*Industry:* {lead.get('industry', 'Unknown')}
*Est. Spend:* {lead.get('estimated_spend', 'Unknown')}

📝 *Ad Preview:*
_{creative_preview}_

🔗 [View Facebook Page]({lead.get('page_url', '#')})
        """.strip()
    
    def _create_approval_keyboard(self, lead_id: int) -> InlineKeyboardMarkup:
        """Create inline keyboard for lead approval."""
        keyboard = [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"approve_{lead_id}"),
                InlineKeyboardButton("❌ Reject", callback_data=f"reject_{lead_id}"),
            ],
            [
                InlineKeyboardButton("⏸️ Skip for Now", callback_data=f"skip_{lead_id}"),
            ]
        ]
        return InlineKeyboardMarkup(keyboard)
    
    async def send_lead_notification(
        self,
        lead: Dict[str, Any],
        application: Application = None
    ) -> Optional[int]:
        """
        Send a lead notification to the configured chat.
        
        Args:
            lead: Lead data dictionary
            application: Telegram Application (optional, for standalone use)
            
        Returns:
            Message ID if sent successfully
        """
        app = application or self.application
        
        if not app:
            # Create a temporary application for sending
            app = Application.builder().token(self.token).build()
            await app.initialize()
        
        message_text = self._create_lead_message(lead)
        keyboard = self._create_approval_keyboard(lead["id"])
        
        try:
            message = await app.bot.send_message(
                chat_id=self.chat_id,
                text=message_text,
                parse_mode="Markdown",
                reply_markup=keyboard,
                disable_web_page_preview=True
            )
            
            # Store message ID for callback handling
            await set_telegram_message_id(lead["id"], message.message_id)
            
            logger.info(f"Sent notification for lead {lead['id']}: {lead['business_name']}")
            return message.message_id
            
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return None
    
    async def send_batch_notifications(
        self,
        leads: List[Dict[str, Any]],
        delay: float = 1.0
    ) -> int:
        """
        Send notifications for multiple leads.
        
        Args:
            leads: List of lead dictionaries
            delay: Delay between messages (to avoid rate limits)
            
        Returns:
            Number of successfully sent notifications
        """
        app = Application.builder().token(self.token).build()
        await app.initialize()
        
        sent_count = 0
        
        for lead in leads:
            message_id = await self.send_lead_notification(lead, app)
            if message_id:
                sent_count += 1
            await asyncio.sleep(delay)
        
        logger.info(f"Sent {sent_count}/{len(leads)} lead notifications")
        return sent_count
    
    async def send_daily_digest(self) -> None:
        """Send a daily summary of pending leads."""
        stats = await get_pipeline_stats()
        pending_leads = await get_leads_by_status(LeadStatus.PENDING, limit=10)
        
        message = f"""
📊 *{AGENCY_NAME} - Daily Pipeline Digest*

*Pipeline Status:*
• Pending: {stats.get(LeadStatus.PENDING, 0)}
• Approved: {stats.get(LeadStatus.APPROVED, 0)}
• Content Ready: {stats.get(LeadStatus.CONTENT_READY, 0)}
• Sent: {stats.get(LeadStatus.SENT, 0)}
• Responded: {stats.get(LeadStatus.RESPONDED, 0)}
• Converted: {stats.get(LeadStatus.CONVERTED, 0)}

*Total Leads:* {stats.get('total', 0)}
        """.strip()
        
        if pending_leads:
            message += "\n\n*Recent Pending Leads:*\n"
            for lead in pending_leads[:5]:
                message += f"• {lead['business_name']} ({lead['industry']})\n"
        
        app = Application.builder().token(self.token).build()
        await app.initialize()
        
        try:
            await app.bot.send_message(
                chat_id=self.chat_id,
                text=message,
                parse_mode="Markdown"
            )
            logger.info("Sent daily digest")
        except Exception as e:
            logger.error(f"Failed to send daily digest: {e}")
    
    async def _handle_approval_callback(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle approval button callbacks."""
        query = update.callback_query
        await query.answer()
        
        data = query.data
        action, lead_id_str = data.rsplit("_", 1)
        lead_id = int(lead_id_str)
        
        lead = await get_lead(lead_id)
        if not lead:
            await query.edit_message_text("❌ Lead not found")
            return
        
        if action == "approve":
            await update_lead_status(lead_id, LeadStatus.APPROVED)
            status_text = "✅ *Approved* - Content will be generated"
            
        elif action == "reject":
            await update_lead_status(lead_id, LeadStatus.REJECTED)
            status_text = "❌ *Rejected* - Lead archived"
            
        elif action == "skip":
            # Keep as pending
            status_text = "⏸️ *Skipped* - Will review later"
        else:
            return
        
        # Update the message
        updated_text = self._create_lead_message(lead)
        updated_text += f"\n\n{status_text}"
        
        try:
            await query.edit_message_text(
                text=updated_text,
                parse_mode="Markdown",
                disable_web_page_preview=True
            )
        except Exception as e:
            logger.error(f"Failed to update message: {e}")
        
        logger.info(f"Lead {lead_id} ({lead['business_name']}): {action}")
    
    async def _handle_stats_command(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /stats command."""
        stats = await get_pipeline_stats()
        
        message = f"""
📊 *Pipeline Statistics*

• Pending: {stats.get(LeadStatus.PENDING, 0)}
• Approved: {stats.get(LeadStatus.APPROVED, 0)}
• Rejected: {stats.get(LeadStatus.REJECTED, 0)}
• Content Ready: {stats.get(LeadStatus.CONTENT_READY, 0)}
• Sent: {stats.get(LeadStatus.SENT, 0)}
• Responded: {stats.get(LeadStatus.RESPONDED, 0)}
• Converted: {stats.get(LeadStatus.CONVERTED, 0)}

*Total:* {stats.get('total', 0)}
        """.strip()
        
        await update.message.reply_text(message, parse_mode="Markdown")
    
    async def _handle_pending_command(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /pending command - show pending leads."""
        leads = await get_leads_by_status(LeadStatus.PENDING, limit=10)
        
        if not leads:
            await update.message.reply_text("✅ No pending leads!")
            return
        
        message = f"*Pending Leads ({len(leads)}):*\n\n"
        
        for i, lead in enumerate(leads, 1):
            message += f"{i}. {lead['business_name']} ({lead['industry']})\n"
        
        message += "\nUse /review to get notifications for pending leads."
        
        await update.message.reply_text(message, parse_mode="Markdown")
    
    async def _handle_review_command(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /review command - send pending leads for review."""
        leads = await get_leads_by_status(LeadStatus.PENDING, limit=5)
        
        if not leads:
            await update.message.reply_text("✅ No pending leads to review!")
            return
        
        await update.message.reply_text(f"📤 Sending {len(leads)} leads for review...")
        
        for lead in leads:
            await self.send_lead_notification(lead, self.application)
            await asyncio.sleep(0.5)
    
    async def _handle_help_command(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /help command."""
        message = f"""
🤖 *{AGENCY_NAME} Lead Bot*

*Commands:*
/stats - View pipeline statistics
/pending - List pending leads
/review - Send pending leads for review
/help - Show this help message

*How it works:*
1. New leads are discovered from Meta Ad Library
2. You receive notifications with Approve/Reject buttons
3. Approved leads get personalized content generated
4. Emails are sent automatically at optimal times

*Button Actions:*
✅ Approve - Queue for content generation
❌ Reject - Archive the lead
⏸️ Skip - Review later
        """.strip()
        
        await update.message.reply_text(message, parse_mode="Markdown")
    
    async def _handle_start_command(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /start command."""
        await self._handle_help_command(update, context)
    
    def run(self) -> None:
        """Start the bot in polling mode."""
        if not self.token:
            logger.error("No Telegram bot token configured")
            return
        
        self.application = Application.builder().token(self.token).build()
        
        # Add handlers
        self.application.add_handler(CommandHandler("start", self._handle_start_command))
        self.application.add_handler(CommandHandler("help", self._handle_help_command))
        self.application.add_handler(CommandHandler("stats", self._handle_stats_command))
        self.application.add_handler(CommandHandler("pending", self._handle_pending_command))
        self.application.add_handler(CommandHandler("review", self._handle_review_command))
        self.application.add_handler(CallbackQueryHandler(self._handle_approval_callback))
        
        logger.info("Starting Telegram bot...")
        self.application.run_polling(allowed_updates=Update.ALL_TYPES)


async def notify_new_leads(leads: List[Dict[str, Any]]) -> int:
    """
    Send notifications for new leads (standalone function).
    
    Args:
        leads: List of lead dictionaries
        
    Returns:
        Number of notifications sent
    """
    bot = LeadApprovalBot()
    return await bot.send_batch_notifications(leads)


async def send_daily_digest() -> None:
    """Send daily digest (standalone function)."""
    bot = LeadApprovalBot()
    await bot.send_daily_digest()


def run_bot() -> None:
    """Run the Telegram bot in polling mode."""
    bot = LeadApprovalBot()
    bot.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    if not TELEGRAM_BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not configured")
        print("Create a bot with @BotFather and add token to .env")
    else:
        print("Starting Telegram bot...")
        run_bot()
