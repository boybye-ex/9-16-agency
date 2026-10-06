"""
Video Generator Module.
Generates video prompts and concepts for Google Flow / AI video creation tools.

Note: Google Flow (formerly VideoFX) is a web-based tool at labs.google/flow.
This module generates detailed prompts and storyboards that can be used with:
- Google Flow (manual upload)
- Google Veo API (when available)
- Other AI video generation tools
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from openai import AsyncOpenAI

from config.settings import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MODEL_MINI,
    AGENCY_NAME,
    DATA_DIR,
)
from modules.database import get_lead, update_lead

logger = logging.getLogger(__name__)

VIDEO_PROMPTS_DIR = DATA_DIR / "video_prompts"


VIDEO_SYSTEM_PROMPT = f"""You are an expert video director specializing in vertical video content for social media.

Your expertise includes:
1. Creating compelling hooks that stop the scroll
2. Understanding platform-specific best practices (TikTok, Reels, Shorts)
3. Writing detailed shot-by-shot scripts
4. Generating AI video tool prompts (for tools like Google Flow, Runway, Pika)

For {AGENCY_NAME}, you create video concepts that:
- Capture attention in the first second
- Deliver value quickly (15-60 second formats)
- Drive engagement and conversions
- Feel authentic and on-brand"""


VIDEO_CONCEPT_PROMPT = """Create a complete vertical video concept for this business:

Business Name: {business_name}
Industry: {industry}
Video Type: {video_type}
Target Platform: {platform}
Current Ad Sample: {ad_creative_sample}

Generate:
1. Hook (first 3 seconds - critical for retention)
2. Shot-by-shot script with timing
3. AI Video Generation Prompt (for Google Flow/Veo)
4. Text overlay suggestions
5. Music/sound recommendations
6. Call-to-action

Return as JSON:
{{
    "title": "...",
    "hook": {{
        "visual": "What viewers see in first 3 seconds",
        "audio": "What viewers hear (voiceover/music)",
        "text_overlay": "On-screen text if any"
    }},
    "script": [
        {{
            "timestamp": "0:00-0:03",
            "visual_description": "...",
            "audio": "...",
            "text_overlay": "..."
        }}
    ],
    "ai_video_prompt": "Detailed prompt for Google Flow / AI video generation...",
    "style_references": ["..."],
    "music_suggestions": [
        {{"type": "...", "mood": "...", "bpm_range": "..."}}
    ],
    "cta": {{
        "text": "...",
        "placement": "end/throughout",
        "style": "..."
    }},
    "expected_duration": "...",
    "aspect_ratio": "9:16",
    "platform_optimizations": {{
        "tiktok": "...",
        "reels": "...",
        "shorts": "..."
    }}
}}"""


BATCH_CONCEPTS_PROMPT = """Generate 3 different vertical video concepts for this business:

Business Name: {business_name}
Industry: {industry}
Current Ad Sample: {ad_creative_sample}
Website: {website}

Create concepts for these video types:
1. Product/Service Showcase
2. Educational/How-To Content
3. Trend-Based/Entertainment

For EACH concept provide:
- Title
- Hook (first 3 seconds)
- Brief shot list (5-7 shots)
- AI video generation prompt
- Best platform for this content

Return as JSON:
{{
    "concepts": [
        {{
            "type": "product_showcase",
            "title": "...",
            "hook": "...",
            "shots": [
                {{"timestamp": "0:00-0:03", "description": "...", "text": "..."}}
            ],
            "ai_prompt": "...",
            "best_platform": "...",
            "estimated_views_potential": "..."
        }}
    ]
}}"""


class VideoPromptGenerator:
    """
    Generates video prompts and concepts for AI video tools.
    
    Creates:
    - Detailed shot-by-shot scripts
    - AI video generation prompts (for Google Flow, Veo, Runway)
    - Storyboard descriptions
    - Platform-optimized concepts
    """
    
    VIDEO_TYPES = [
        "product_showcase",
        "testimonial",
        "behind_the_scenes",
        "educational",
        "trend_based",
        "unboxing",
        "transformation",
        "day_in_the_life",
    ]
    
    PLATFORMS = ["tiktok", "reels", "shorts"]
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or OPENAI_API_KEY
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        
        VIDEO_PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
        
    async def _call_openai(
        self,
        prompt: str,
        system_prompt: str = None,
        model: str = None,
        temperature: float = 0.8
    ) -> Optional[str]:
        """Make an OpenAI API call."""
        if not self.client:
            logger.error("OpenAI client not initialized")
            return None
            
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await self.client.chat.completions.create(
                model=model or OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=3000,
                response_format={"type": "json_object"}
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return None
    
    def _parse_json_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from response."""
        if not response:
            return None
            
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return None
    
    async def generate_video_concept(
        self,
        lead: Dict[str, Any],
        video_type: str = "product_showcase",
        platform: str = "tiktok"
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a single video concept with detailed prompts.
        
        Args:
            lead: Lead data dictionary
            video_type: Type of video to create
            platform: Target platform
            
        Returns:
            Video concept with AI prompts
        """
        prompt = VIDEO_CONCEPT_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            video_type=video_type,
            platform=platform,
            ad_creative_sample=lead.get("ad_creative_sample", "N/A")[:500]
        )
        
        response = await self._call_openai(
            prompt=prompt,
            system_prompt=VIDEO_SYSTEM_PROMPT,
            temperature=0.85
        )
        
        result = self._parse_json_response(response)
        
        if result:
            result["video_type"] = video_type
            result["platform"] = platform
            result["generated_at"] = datetime.now().isoformat()
            
        return result
    
    async def generate_batch_concepts(
        self,
        lead: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate multiple video concepts for a lead.
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Dict containing multiple video concepts
        """
        prompt = BATCH_CONCEPTS_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            ad_creative_sample=lead.get("ad_creative_sample", "N/A")[:500],
            website=lead.get("website", "N/A")
        )
        
        response = await self._call_openai(
            prompt=prompt,
            system_prompt=VIDEO_SYSTEM_PROMPT,
            model=OPENAI_MODEL,
            temperature=0.85
        )
        
        return self._parse_json_response(response)
    
    def format_google_flow_prompt(self, concept: Dict[str, Any]) -> str:
        """
        Format a video concept into a Google Flow-ready prompt.
        
        Args:
            concept: Video concept dictionary
            
        Returns:
            Formatted prompt string for Google Flow
        """
        base_prompt = concept.get("ai_prompt", concept.get("ai_video_prompt", ""))
        
        flow_prompt = f"""VIDEO GENERATION PROMPT
======================

{base_prompt}

STYLE SPECIFICATIONS:
- Aspect Ratio: 9:16 (vertical)
- Duration: {concept.get('expected_duration', '15-30 seconds')}
- Style: Modern, high-energy, professional
- Lighting: Bright, natural-looking
- Camera: Smooth movements, dynamic angles

SHOT SEQUENCE:
"""
        
        shots = concept.get("script", concept.get("shots", []))
        for i, shot in enumerate(shots, 1):
            timestamp = shot.get("timestamp", f"Shot {i}")
            description = shot.get("visual_description", shot.get("description", ""))
            flow_prompt += f"\n{timestamp}: {description}"
        
        return flow_prompt
    
    def save_video_prompts(
        self,
        lead: Dict[str, Any],
        concepts: Dict[str, Any]
    ) -> Optional[str]:
        """
        Save video prompts to a file for later use.
        
        Args:
            lead: Lead data
            concepts: Generated concepts
            
        Returns:
            Path to saved file
        """
        safe_name = "".join(
            c for c in lead.get('business_name', 'unknown') 
            if c.isalnum() or c in (' ', '-', '_')
        ).rstrip().replace(' ', '_').lower()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"video_prompts_{safe_name}_{timestamp}.json"
        
        output_path = VIDEO_PROMPTS_DIR / filename
        
        output_data = {
            "lead_id": lead.get("id"),
            "business_name": lead.get("business_name"),
            "industry": lead.get("industry"),
            "generated_at": datetime.now().isoformat(),
            "concepts": concepts.get("concepts", [concepts]),
            "google_flow_prompts": []
        }
        
        for concept in output_data["concepts"]:
            flow_prompt = self.format_google_flow_prompt(concept)
            output_data["google_flow_prompts"].append({
                "type": concept.get("type", concept.get("video_type", "unknown")),
                "prompt": flow_prompt
            })
        
        try:
            with open(output_path, 'w') as f:
                json.dump(output_data, f, indent=2)
            
            logger.info(f"Saved video prompts to {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to save video prompts: {e}")
            return None
    
    async def generate_and_save(
        self,
        lead: Dict[str, Any]
    ) -> Optional[str]:
        """
        Generate batch concepts and save to file.
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Path to saved prompts file
        """
        concepts = await self.generate_batch_concepts(lead)
        
        if not concepts:
            return None
        
        return self.save_video_prompts(lead, concepts)


async def generate_video_prompts_for_lead(lead_id: int) -> Optional[str]:
    """
    Generate video prompts for a specific lead.
    
    Args:
        lead_id: Lead ID
        
    Returns:
        Path to saved prompts file
    """
    lead = await get_lead(lead_id)
    
    if not lead:
        logger.error(f"Lead {lead_id} not found")
        return None
    
    generator = VideoPromptGenerator()
    prompts_path = await generator.generate_and_save(lead)
    
    if prompts_path:
        await update_lead(lead_id, {"generated_video_url": prompts_path})
    
    return prompts_path


async def process_content_ready_leads(limit: int = 10) -> int:
    """
    Generate video prompts for all content-ready leads.
    
    Args:
        limit: Maximum leads to process
        
    Returns:
        Number of leads processed
    """
    from modules.database import get_leads_by_status, LeadStatus
    
    generator = VideoPromptGenerator()
    
    if not generator.client:
        logger.error("OpenAI client not initialized")
        return 0
    
    leads = await get_leads_by_status(LeadStatus.CONTENT_READY, limit=limit)
    
    if not leads:
        logger.info("No content-ready leads to process")
        return 0
    
    processed = 0
    
    for lead in leads:
        if lead.get("generated_video_url"):
            continue
            
        prompts_path = await generator.generate_and_save(lead)
        
        if prompts_path:
            await update_lead(lead["id"], {"generated_video_url": prompts_path})
            processed += 1
            
        await asyncio.sleep(1)
    
    logger.info(f"Generated video prompts for {processed} leads")
    return processed


def get_sample_google_flow_prompt(industry: str = "ecommerce") -> str:
    """
    Get a sample Google Flow prompt for testing.
    
    Args:
        industry: Industry type
        
    Returns:
        Sample prompt string
    """
    return f"""Create a 15-second vertical video (9:16) showcasing a modern {industry} brand.

SCENE 1 (0-3s): Dynamic product reveal with bold text overlay "The Secret Is Out"
SCENE 2 (3-7s): Close-up shots of product details, natural lighting, premium feel
SCENE 3 (7-12s): Lifestyle shot showing product in use, authentic setting
SCENE 4 (12-15s): Brand logo reveal with call-to-action "Shop Now"

STYLE: Modern, clean, high-end aesthetic
MOOD: Aspirational but accessible
COLORS: Neutral palette with brand accent colors
MUSIC: Upbeat, trending audio style (100-120 BPM)
TRANSITIONS: Smooth cuts, subtle zoom effects"""


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) > 1:
        lead_id = int(sys.argv[1])
        print(f"Generating video prompts for lead {lead_id}...")
        result = asyncio.run(generate_video_prompts_for_lead(lead_id))
        if result:
            print(f"Saved to: {result}")
        else:
            print("Failed to generate video prompts")
    else:
        print("Sample Google Flow Prompt:")
        print("-" * 50)
        print(get_sample_google_flow_prompt())
        print("-" * 50)
        print("\nUsage: python video_generator.py <lead_id>")
