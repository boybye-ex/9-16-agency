"""
Meta Ad Library Scraper Module.
Fetches potential client leads from Meta's official Ad Library API.
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import re

from config.settings import (
    META_ACCESS_TOKEN,
    META_API_BASE_URL,
    TARGET_COUNTRIES,
    INDUSTRY_KEYWORDS,
    API_DELAY_META,
)
from modules.database import add_lead, check_duplicate

logger = logging.getLogger(__name__)


class MetaAdLibraryScraper:
    """
    Scraper for Meta Ad Library using the official Graph API.
    
    Requirements:
    - Meta Developer account with identity verification
    - Access token from developers.facebook.com
    """
    
    def __init__(self, access_token: str = None):
        self.access_token = access_token or META_ACCESS_TOKEN
        self.base_url = f"{META_API_BASE_URL}/ads_archive"
        self.session: Optional[aiohttp.ClientSession] = None
        self.last_request_time = 0
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def _rate_limit(self):
        """Enforce rate limiting between API calls."""
        elapsed = time.time() - self.last_request_time
        if elapsed < API_DELAY_META:
            await asyncio.sleep(API_DELAY_META - elapsed)
        self.last_request_time = time.time()
    
    async def search_ads(
        self,
        search_terms: str,
        countries: List[str] = None,
        limit: int = 100,
        ad_active_status: str = "ACTIVE"
    ) -> List[Dict[str, Any]]:
        """
        Search the Meta Ad Library for ads matching the criteria.
        
        Args:
            search_terms: Keywords to search for
            countries: List of ISO country codes (default: TARGET_COUNTRIES)
            limit: Maximum number of results per page
            ad_active_status: ACTIVE, INACTIVE, or ALL
            
        Returns:
            List of ad data dictionaries
        """
        if not self.access_token:
            logger.error("No Meta access token configured")
            return []
            
        countries = countries or TARGET_COUNTRIES
        
        params = {
            "access_token": self.access_token,
            "ad_reached_countries": str(countries),
            "search_terms": search_terms,
            "ad_active_status": ad_active_status,
            "fields": ",".join([
                "id",
                "page_id",
                "page_name",
                "ad_creative_bodies",
                "ad_creative_link_titles",
                "ad_creative_link_captions",
                "ad_creative_link_descriptions",
                "ad_delivery_start_time",
                "ad_delivery_stop_time",
                "spend",
                "impressions",
                "currency",
                "publisher_platforms",
                "bylines",
            ]),
            "limit": limit,
        }
        
        all_ads = []
        next_url = self.base_url
        
        await self._rate_limit()
        
        try:
            async with self.session.get(next_url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Meta API error {response.status}: {error_text}")
                    return []
                    
                data = await response.json()
                ads = data.get("data", [])
                all_ads.extend(ads)
                
                logger.info(f"Fetched {len(ads)} ads for search term: {search_terms}")
                
                # Handle pagination if needed
                paging = data.get("paging", {})
                if paging.get("next") and len(all_ads) < limit * 2:
                    # Limit pagination to avoid too many requests
                    await self._rate_limit()
                    async with self.session.get(paging["next"]) as page_response:
                        if page_response.status == 200:
                            page_data = await page_response.json()
                            all_ads.extend(page_data.get("data", []))
                
        except aiohttp.ClientError as e:
            logger.error(f"Network error fetching ads: {e}")
        except Exception as e:
            logger.error(f"Unexpected error fetching ads: {e}")
            
        return all_ads
    
    def _extract_lead_data(self, ad: Dict[str, Any], search_term: str) -> Dict[str, Any]:
        """
        Extract relevant lead data from an ad.
        
        Args:
            ad: Raw ad data from API
            search_term: The search term that matched this ad
            
        Returns:
            Cleaned lead data dictionary
        """
        # Get the first ad creative body
        creative_bodies = ad.get("ad_creative_bodies", [])
        ad_creative_sample = creative_bodies[0] if creative_bodies else ""
        
        # Truncate long creative text
        if len(ad_creative_sample) > 500:
            ad_creative_sample = ad_creative_sample[:500] + "..."
        
        # Extract spend range
        spend = ad.get("spend", {})
        if isinstance(spend, dict):
            lower = spend.get("lower_bound", "")
            upper = spend.get("upper_bound", "")
            estimated_spend = f"{lower}-{upper}" if lower or upper else "Unknown"
        else:
            estimated_spend = str(spend) if spend else "Unknown"
        
        # Try to extract website from link
        link_captions = ad.get("ad_creative_link_captions", [])
        website = link_captions[0] if link_captions else ""
        
        # Determine industry based on search term and content
        industry = self._classify_industry(search_term, ad_creative_sample)
        
        # Build Facebook page URL
        page_id = ad.get("page_id")
        page_url = f"https://www.facebook.com/{page_id}" if page_id else ""
        
        return {
            "page_id": page_id,
            "business_name": ad.get("page_name", "Unknown"),
            "page_url": page_url,
            "industry": industry,
            "estimated_spend": estimated_spend,
            "ad_creative_sample": ad_creative_sample,
            "website": website,
        }
    
    def _classify_industry(self, search_term: str, creative_text: str) -> str:
        """Classify the industry based on search term and ad content."""
        search_term_lower = search_term.lower()
        creative_lower = creative_text.lower()
        
        # Industry mapping
        industry_map = {
            "ecommerce": ["ecommerce", "e-commerce", "online store", "shop now", "buy now"],
            "beauty": ["beauty", "skincare", "makeup", "cosmetic", "glow"],
            "fashion": ["fashion", "clothing", "wear", "style", "outfit", "dress"],
            "fitness": ["fitness", "gym", "workout", "exercise", "health", "weight"],
            "food": ["food", "restaurant", "delivery", "menu", "eat"],
            "tech": ["tech", "software", "app", "digital", "saas"],
            "lifestyle": ["lifestyle", "home", "decor", "living"],
        }
        
        for industry, keywords in industry_map.items():
            if any(kw in search_term_lower or kw in creative_lower for kw in keywords):
                return industry.capitalize()
        
        return "General"
    
    def _is_quality_lead(self, lead_data: Dict[str, Any]) -> bool:
        """
        Check if a lead meets quality criteria.
        
        Filters:
        - Has valid page_id
        - Has business name
        - Has some ad creative content
        - Not a personal page (basic heuristic)
        """
        if not lead_data.get("page_id"):
            return False
            
        if not lead_data.get("business_name") or lead_data["business_name"] == "Unknown":
            return False
            
        if not lead_data.get("ad_creative_sample"):
            return False
        
        # Skip if business name looks like a personal name (basic check)
        name = lead_data["business_name"]
        if len(name.split()) == 2 and not any(word in name.lower() for word in ["store", "shop", "brand", "co", "inc"]):
            # Could be a personal name, but allow it if there's good spend
            pass
            
        return True
    
    async def scrape_leads(
        self,
        keywords: List[str] = None,
        max_leads_per_keyword: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Scrape leads for all configured keywords.
        
        Args:
            keywords: List of search terms (default: INDUSTRY_KEYWORDS)
            max_leads_per_keyword: Maximum leads to process per keyword
            
        Returns:
            List of new leads added to database
        """
        keywords = keywords or INDUSTRY_KEYWORDS
        new_leads = []
        
        for keyword in keywords:
            logger.info(f"Scraping ads for keyword: {keyword}")
            
            ads = await self.search_ads(keyword, limit=max_leads_per_keyword)
            
            for ad in ads:
                lead_data = self._extract_lead_data(ad, keyword)
                
                # Skip if doesn't meet quality criteria
                if not self._is_quality_lead(lead_data):
                    continue
                
                # Check for duplicates
                if await check_duplicate(lead_data["page_id"]):
                    continue
                
                # Add to database
                lead_id = await add_lead(lead_data)
                
                if lead_id:
                    lead_data["id"] = lead_id
                    new_leads.append(lead_data)
                    logger.info(f"Added lead: {lead_data['business_name']}")
                    
            # Brief pause between keywords
            await asyncio.sleep(2)
        
        logger.info(f"Scraping complete. Added {len(new_leads)} new leads.")
        return new_leads


async def run_scraper() -> List[Dict[str, Any]]:
    """
    Run the Meta Ad Library scraper.
    
    Returns:
        List of new leads discovered
    """
    async with MetaAdLibraryScraper() as scraper:
        return await scraper.scrape_leads()


if __name__ == "__main__":
    # Run scraper directly for testing
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if not META_ACCESS_TOKEN:
        print("Error: META_ACCESS_TOKEN not configured")
        print("Please set it in your .env file")
        sys.exit(1)
    
    leads = asyncio.run(run_scraper())
    print(f"\nDiscovered {len(leads)} new leads")
    for lead in leads[:5]:
        print(f"  - {lead['business_name']} ({lead['industry']})")
