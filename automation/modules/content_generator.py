"""
Content Generator Module.
Uses OpenAI GPT models to generate personalized outreach content.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List

from openai import AsyncOpenAI

from config.settings import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MODEL_MINI,
    API_DELAY_OPENAI,
    AGENCY_NAME,
    AGENCY_WEBSITE,
    AGENCY_PHONE,
    AGENCY_EMAIL,
)
from modules.database import (
    get_lead,
    get_leads_by_status,
    save_generated_content,
    update_lead_status,
    LeadStatus,
)

logger = logging.getLogger(__name__)


OUTREACH_SYSTEM_PROMPT = f"""You are an expert copywriter for {AGENCY_NAME}, a premium vertical video content creation agency specializing in 9:16 format content for TikTok, Instagram Reels, and YouTube Shorts.

Your task is to write highly personalized, compelling outreach emails that:
1. Show genuine understanding of the prospect's business and industry
2. Reference specific observations about their current content/advertising
3. Highlight how vertical video can transform their marketing
4. Include concrete value propositions tailored to their industry
5. Create urgency without being pushy
6. Maintain a professional yet approachable tone

Agency details:
- Name: {AGENCY_NAME}
- Website: {AGENCY_WEBSITE}
- Phone: {AGENCY_PHONE}
- Email: {AGENCY_EMAIL}

Write content that converts prospects into leads who want to book a call."""


EMAIL_GENERATION_PROMPT = """Generate a personalized cold outreach email for this prospect:

Business Name: {business_name}
Industry: {industry}
Ad Creative Sample: {ad_creative_sample}
Estimated Ad Spend: {estimated_spend}
Website: {website}

Requirements:
1. Subject line that gets opened (personalized, curiosity-driven)
2. Opening that shows you've done research (reference their ad/business)
3. Pain point identification specific to their industry
4. Value proposition showing how 9:16 video content solves their problem
5. Social proof or case study reference relevant to their industry
6. Clear, low-commitment CTA (15-min discovery call)
7. Keep the email under 200 words

Return a JSON object with:
{{
    "email_subject": "...",
    "email_body": "...",
    "personalization_notes": "...",
    "key_pain_points": ["..."],
    "value_hooks": ["..."]
}}"""


VIDEO_CONCEPTS_PROMPT = """Based on this prospect's business, generate 3 video content concepts we could create for them:

Business Name: {business_name}
Industry: {industry}
Current Ad Sample: {ad_creative_sample}
Website: {website}

For each concept, provide:
1. Video type (testimonial, product showcase, behind-the-scenes, educational, trend-based)
2. Hook (first 3 seconds script)
3. Brief outline (what happens in the video)
4. Platform recommendation (TikTok, Reels, Shorts)
5. Expected outcome/metric improvement

Return as JSON:
{{
    "concepts": [
        {{
            "type": "...",
            "hook": "...",
            "outline": "...",
            "platform": "...",
            "expected_outcome": "..."
        }}
    ]
}}"""


FOLLOWUP_PROMPT = """Generate a follow-up email sequence for a prospect who hasn't responded:

Business Name: {business_name}
Industry: {industry}
Original Email Subject: {original_subject}
Days Since Last Email: {days_since}

Generate:
1. A shorter, more casual follow-up
2. Different angle/value proposition than original
3. Reference the original email
4. Add new urgency (limited spots, seasonal relevance, etc.)

Return JSON:
{{
    "followup_subject": "...",
    "followup_body": "...",
    "new_angle": "..."
}}"""


class ContentGenerator:
    """
    AI-powered content generator for personalized outreach.
    
    Uses OpenAI GPT models to create:
    - Personalized cold emails
    - Video content concepts
    - Follow-up sequences
    - Strategy recommendations
    """
    
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or OPENAI_API_KEY
        self.model = model or OPENAI_MODEL
        self.model_mini = OPENAI_MODEL_MINI
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        
    async def _call_openai(
        self,
        prompt: str,
        system_prompt: str = None,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Optional[str]:
        """Make an OpenAI API call with error handling."""
        if not self.client:
            logger.error("OpenAI client not initialized - missing API key")
            return None
            
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return None
    
    def _parse_json_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from OpenAI response."""
        if not response:
            return None
            
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return None
    
    async def generate_outreach_email(self, lead: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generate a personalized outreach email for a lead.
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Dict with email_subject, email_body, and metadata
        """
        prompt = EMAIL_GENERATION_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            ad_creative_sample=lead.get("ad_creative_sample", "N/A")[:500],
            estimated_spend=lead.get("estimated_spend", "Unknown"),
            website=lead.get("website", "N/A")
        )
        
        response = await self._call_openai(
            prompt=prompt,
            system_prompt=OUTREACH_SYSTEM_PROMPT,
            temperature=0.8
        )
        
        result = self._parse_json_response(response)
        
        if result:
            logger.info(f"Generated email for {lead.get('business_name')}")
        
        return result
    
    async def generate_video_concepts(self, lead: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generate video content concepts for a lead.
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Dict with video concepts
        """
        prompt = VIDEO_CONCEPTS_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            ad_creative_sample=lead.get("ad_creative_sample", "N/A")[:500],
            website=lead.get("website", "N/A")
        )
        
        response = await self._call_openai(
            prompt=prompt,
            system_prompt=OUTREACH_SYSTEM_PROMPT,
            model=self.model_mini,
            temperature=0.9
        )
        
        return self._parse_json_response(response)
    
    async def generate_followup_email(
        self,
        lead: Dict[str, Any],
        days_since: int = 3
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a follow-up email for a non-responsive lead.
        
        Args:
            lead: Lead data dictionary
            days_since: Days since last email
            
        Returns:
            Dict with followup email content
        """
        prompt = FOLLOWUP_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            original_subject=lead.get("email_subject", "Our previous email"),
            days_since=days_since
        )
        
        response = await self._call_openai(
            prompt=prompt,
            system_prompt=OUTREACH_SYSTEM_PROMPT,
            model=self.model_mini,
            temperature=0.7
        )
        
        return self._parse_json_response(response)
    
    async def generate_full_content_package(
        self,
        lead: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate complete content package for a lead.
        
        Includes:
        - Outreach email
        - Video concepts
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Complete content package
        """
        email_content = await self.generate_outreach_email(lead)
        
        if not email_content:
            return None
            
        await asyncio.sleep(API_DELAY_OPENAI)
        
        video_concepts = await self.generate_video_concepts(lead)
        
        package = {
            **email_content,
            "video_concepts": video_concepts.get("concepts", []) if video_concepts else []
        }
        
        return package


async def process_approved_leads(limit: int = 10) -> int:
    """
    Process approved leads by generating content for them.
    
    Args:
        limit: Maximum number of leads to process
        
    Returns:
        Number of leads processed successfully
    """
    generator = ContentGenerator()
    
    if not generator.client:
        logger.error("Cannot process leads - OpenAI API key not configured")
        return 0
    
    approved_leads = await get_leads_by_status(LeadStatus.APPROVED, limit=limit)
    
    if not approved_leads:
        logger.info("No approved leads to process")
        return 0
    
    logger.info(f"Processing {len(approved_leads)} approved leads")
    
    processed_count = 0
    
    for lead in approved_leads:
        try:
            content = await generator.generate_full_content_package(lead)
            
            if content:
                await save_generated_content(lead["id"], content)
                processed_count += 1
                logger.info(f"Generated content for lead {lead['id']}: {lead['business_name']}")
            else:
                logger.warning(f"Failed to generate content for lead {lead['id']}")
                
            await asyncio.sleep(API_DELAY_OPENAI)
            
        except Exception as e:
            logger.error(f"Error processing lead {lead['id']}: {e}")
            continue
    
    logger.info(f"Processed {processed_count}/{len(approved_leads)} leads")
    return processed_count


async def regenerate_content(lead_id: int) -> Optional[Dict[str, Any]]:
    """
    Regenerate content for a specific lead.
    
    Args:
        lead_id: Lead ID to regenerate content for
        
    Returns:
        Generated content package
    """
    generator = ContentGenerator()
    lead = await get_lead(lead_id)
    
    if not lead:
        logger.error(f"Lead {lead_id} not found")
        return None
    
    content = await generator.generate_full_content_package(lead)
    
    if content:
        await save_generated_content(lead_id, content)
        
    return content


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not configured")
        print("Add your OpenAI API key to .env")
        sys.exit(1)
    
    print("Running content generation for approved leads...")
    processed = asyncio.run(process_approved_leads())
    print(f"Processed {processed} leads")
