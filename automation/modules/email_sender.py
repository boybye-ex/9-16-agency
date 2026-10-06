"""
Email Sender Module.
Handles outreach email delivery via SendGrid API.
"""

import asyncio
import base64
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

import sendgrid
from sendgrid.helpers.mail import (
    Mail,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
    To,
    Category,
    CustomArg,
)

from config.settings import (
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME,
    API_DELAY_SENDGRID,
    AGENCY_NAME,
    AGENCY_WEBSITE,
    AGENCY_EMAIL,
)
from modules.database import (
    get_lead,
    get_leads_by_status,
    update_lead,
    mark_email_sent,
    LeadStatus,
)

logger = logging.getLogger(__name__)


EMAIL_FOOTER_HTML = f"""
<br><br>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="font-size: 12px; color: #666;">
    <strong>{AGENCY_NAME}</strong><br>
    Vertical Video Content Creation Agency<br>
    <a href="{AGENCY_WEBSITE}">{AGENCY_WEBSITE}</a> | {AGENCY_EMAIL}<br>
    <br>
    <em>You're receiving this because your business was identified as a great fit for vertical video content.</em><br>
    <a href="{{{{unsubscribe}}}}" style="color: #999;">Unsubscribe</a>
</p>
"""


class EmailSender:
    """
    SendGrid email sender for outreach campaigns.
    
    Features:
    - Single and batch email sending
    - PDF attachment support (strategy packs)
    - Email tracking via categories and custom args
    - Sandbox mode for testing
    """
    
    def __init__(
        self,
        api_key: str = None,
        from_email: str = None,
        from_name: str = None
    ):
        self.api_key = api_key or SENDGRID_API_KEY
        self.from_email = from_email or SENDGRID_FROM_EMAIL
        self.from_name = from_name or SENDGRID_FROM_NAME
        self.client = sendgrid.SendGridAPIClient(api_key=self.api_key) if self.api_key else None
        
    def _create_html_email(
        self,
        body: str,
        include_footer: bool = True
    ) -> str:
        """Convert plain text body to styled HTML email."""
        paragraphs = body.split('\n\n')
        html_paragraphs = [f'<p style="margin: 0 0 16px 0; line-height: 1.6;">{p.replace(chr(10), "<br>")}</p>' 
                          for p in paragraphs if p.strip()]
        
        html_body = '\n'.join(html_paragraphs)
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
    {html_body}
    {EMAIL_FOOTER_HTML if include_footer else ''}
</body>
</html>
"""
        return html
    
    def _attach_pdf(self, message: Mail, pdf_path: str) -> None:
        """Attach a PDF file to the email."""
        path = Path(pdf_path)
        
        if not path.exists():
            logger.warning(f"PDF not found: {pdf_path}")
            return
        
        try:
            with open(path, 'rb') as f:
                encoded = base64.b64encode(f.read()).decode()
            
            attachment = Attachment(
                FileContent(encoded),
                FileName(path.name),
                FileType('application/pdf'),
                Disposition('attachment')
            )
            message.attachment = attachment
            
            logger.info(f"Attached PDF: {path.name}")
            
        except Exception as e:
            logger.error(f"Failed to attach PDF: {e}")
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        lead_id: int = None,
        pdf_attachment: str = None,
        sandbox_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Send a single email via SendGrid.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            body: Email body (plain text, converted to HTML)
            lead_id: Lead ID for tracking (optional)
            pdf_attachment: Path to PDF to attach (optional)
            sandbox_mode: If True, validate without sending
            
        Returns:
            Dict with success status and response info
        """
        if not self.client:
            logger.error("SendGrid client not initialized - missing API key")
            return {"success": False, "error": "SendGrid not configured"}
        
        if not to_email:
            return {"success": False, "error": "No recipient email"}
        
        html_content = self._create_html_email(body)
        
        message = Mail(
            from_email=(self.from_email, self.from_name),
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        
        message.category = [Category("outreach"), Category("cold-email")]
        
        if lead_id:
            message.custom_arg = [
                CustomArg("lead_id", str(lead_id)),
                CustomArg("campaign", "client-acquisition"),
            ]
        
        if pdf_attachment:
            self._attach_pdf(message, pdf_attachment)
        
        if sandbox_mode:
            message.mail_settings = {"sandbox_mode": {"enable": True}}
        
        try:
            response = self.client.send(message)
            
            status_code = response.status_code
            success = status_code in (200, 202)
            
            result = {
                "success": success,
                "status_code": status_code,
                "to_email": to_email,
                "subject": subject,
                "sandbox_mode": sandbox_mode,
                "sent_at": datetime.now().isoformat()
            }
            
            if success:
                logger.info(f"Email sent to {to_email} (status: {status_code})")
            else:
                logger.warning(f"Email send returned {status_code} for {to_email}")
                result["response_body"] = response.body.decode() if response.body else None
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e), "to_email": to_email}
    
    async def send_lead_outreach(
        self,
        lead: Dict[str, Any],
        sandbox_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Send outreach email to a lead with all generated content.
        
        Args:
            lead: Lead dictionary with email content
            sandbox_mode: Test mode without sending
            
        Returns:
            Send result
        """
        to_email = lead.get("email")
        subject = lead.get("email_subject")
        body = lead.get("email_body")
        pdf_path = lead.get("strategy_pack_path")
        
        if not to_email:
            return {"success": False, "error": "Lead has no email address"}
        
        if not subject or not body:
            return {"success": False, "error": "Lead has no generated email content"}
        
        result = self.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            lead_id=lead.get("id"),
            pdf_attachment=pdf_path,
            sandbox_mode=sandbox_mode
        )
        
        if result["success"] and not sandbox_mode:
            await mark_email_sent(lead["id"])
        
        return result


async def send_outreach_to_ready_leads(
    limit: int = 10,
    sandbox_mode: bool = False
) -> Dict[str, Any]:
    """
    Send outreach emails to all content-ready leads with email addresses.
    
    Args:
        limit: Maximum emails to send
        sandbox_mode: Test mode without sending
        
    Returns:
        Summary of send results
    """
    sender = EmailSender()
    
    if not sender.client:
        logger.error("SendGrid not configured")
        return {"success": False, "error": "SendGrid not configured", "sent": 0}
    
    leads = await get_leads_by_status(LeadStatus.CONTENT_READY, limit=limit)
    
    leads_with_email = [l for l in leads if l.get("email") and l.get("email_subject")]
    
    if not leads_with_email:
        logger.info("No content-ready leads with email addresses")
        return {"success": True, "sent": 0, "message": "No eligible leads"}
    
    results = {
        "sent": 0,
        "failed": 0,
        "details": []
    }
    
    for lead in leads_with_email:
        result = await sender.send_lead_outreach(lead, sandbox_mode=sandbox_mode)
        
        if result["success"]:
            results["sent"] += 1
        else:
            results["failed"] += 1
        
        results["details"].append({
            "lead_id": lead["id"],
            "business_name": lead["business_name"],
            "email": lead.get("email"),
            "success": result["success"],
            "error": result.get("error")
        })
        
        await asyncio.sleep(API_DELAY_SENDGRID)
    
    logger.info(f"Sent {results['sent']} emails, {results['failed']} failed")
    
    results["success"] = results["failed"] == 0
    return results


async def send_single_outreach(
    lead_id: int,
    sandbox_mode: bool = False
) -> Dict[str, Any]:
    """
    Send outreach email to a specific lead.
    
    Args:
        lead_id: Lead ID
        sandbox_mode: Test mode
        
    Returns:
        Send result
    """
    lead = await get_lead(lead_id)
    
    if not lead:
        return {"success": False, "error": f"Lead {lead_id} not found"}
    
    sender = EmailSender()
    return await sender.send_lead_outreach(lead, sandbox_mode=sandbox_mode)


async def test_email_config() -> Dict[str, Any]:
    """
    Test SendGrid configuration with a sandbox send.
    
    Returns:
        Test result
    """
    sender = EmailSender()
    
    if not sender.client:
        return {"success": False, "error": "SendGrid not configured"}
    
    result = sender.send_email(
        to_email="test@example.com",
        subject="Test Email from 9:16 Agency",
        body="This is a test email to verify SendGrid configuration.",
        sandbox_mode=True
    )
    
    return result


def preview_email(lead: Dict[str, Any]) -> str:
    """
    Generate HTML preview of what would be sent to a lead.
    
    Args:
        lead: Lead dictionary
        
    Returns:
        HTML string preview
    """
    sender = EmailSender()
    body = lead.get("email_body", "No email body generated")
    return sender._create_html_email(body)


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if not SENDGRID_API_KEY:
        print("Error: SENDGRID_API_KEY not configured")
        print("Add your SendGrid API key to .env")
        sys.exit(1)
    
    print("Testing SendGrid configuration...")
    result = asyncio.run(test_email_config())
    
    if result["success"]:
        print("SendGrid configuration is valid!")
        print(f"Status code: {result.get('status_code')}")
    else:
        print(f"SendGrid test failed: {result.get('error')}")
