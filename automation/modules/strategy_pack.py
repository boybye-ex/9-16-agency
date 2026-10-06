"""
Strategy Pack Generator Module.
Creates personalized 14-day content strategy PDFs for prospects.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
    ListFlowable,
    ListItem,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart

from openai import AsyncOpenAI

from config.settings import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MODEL_MINI,
    AGENCY_NAME,
    AGENCY_WEBSITE,
    AGENCY_PHONE,
    AGENCY_EMAIL,
    DATA_DIR,
)
from modules.database import get_lead, update_lead

logger = logging.getLogger(__name__)

STRATEGY_DIR = DATA_DIR / "strategy_packs"


STRATEGY_SYSTEM_PROMPT = f"""You are a senior social media strategist at {AGENCY_NAME}.

Create comprehensive, actionable content strategies for businesses looking to dominate vertical video platforms (TikTok, Instagram Reels, YouTube Shorts).

Your strategies should:
1. Be specific and actionable (not generic advice)
2. Include exact posting schedules and content types
3. Reference industry-specific trends and best practices
4. Provide measurable goals and KPIs
5. Be realistic for the business's size and resources

Always think about the customer journey: awareness → consideration → conversion → retention."""


STRATEGY_GENERATION_PROMPT = """Create a detailed 14-day content strategy for this business:

Business Name: {business_name}
Industry: {industry}
Current Ad Approach: {ad_creative_sample}
Estimated Monthly Ad Spend: {estimated_spend}
Website: {website}

Generate a comprehensive strategy with:

1. Executive Summary (2-3 sentences on the opportunity)
2. Current State Analysis (what they're likely missing)
3. Target Audience Personas (2-3 personas)
4. Platform Strategy (TikTok vs Reels vs Shorts recommendations)
5. Content Pillars (4-5 content themes)
6. 14-Day Content Calendar (specific post ideas for each day)
7. Hook Library (10 attention-grabbing hooks for their industry)
8. Hashtag Strategy (trending + niche hashtags)
9. Engagement Tactics (how to boost organic reach)
10. Metrics to Track (KPIs and benchmarks)

Return as JSON:
{{
    "executive_summary": "...",
    "current_state_analysis": "...",
    "target_personas": [
        {{"name": "...", "age_range": "...", "interests": [...], "pain_points": [...], "platforms": [...]}}
    ],
    "platform_strategy": {{
        "primary_platform": "...",
        "secondary_platforms": [...],
        "posting_frequency": {{"tiktok": "...", "reels": "...", "shorts": "..."}}
    }},
    "content_pillars": [
        {{"name": "...", "description": "...", "percentage": 25}}
    ],
    "content_calendar": [
        {{"day": 1, "platform": "...", "content_type": "...", "topic": "...", "hook": "...", "cta": "..."}}
    ],
    "hook_library": ["..."],
    "hashtag_strategy": {{
        "branded": [...],
        "trending": [...],
        "niche": [...]
    }},
    "engagement_tactics": ["..."],
    "metrics_to_track": [
        {{"metric": "...", "benchmark": "...", "target": "..."}}
    ]
}}"""


class StrategyPackGenerator:
    """
    Generates personalized 14-day content strategy PDFs.
    
    Uses AI to create customized strategies and ReportLab to render PDFs.
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or OPENAI_API_KEY
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        STRATEGY_DIR.mkdir(parents=True, exist_ok=True)
        
    def _setup_custom_styles(self):
        """Set up custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='Title916',
            parent=self.styles['Title'],
            fontSize=28,
            textColor=colors.HexColor('#1a1a2e'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='Heading916',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#16213e'),
            spaceBefore=20,
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubHeading916',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#0f3460'),
            spaceBefore=15,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='Body916',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#333333'),
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            leading=16
        ))
        
        self.styles.add(ParagraphStyle(
            name='Highlight916',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#e94560'),
            spaceAfter=8,
            fontName='Helvetica-Bold'
        ))
        
    async def _generate_strategy_content(
        self,
        lead: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Generate strategy content using AI."""
        if not self.client:
            logger.error("OpenAI client not initialized")
            return None
            
        prompt = STRATEGY_GENERATION_PROMPT.format(
            business_name=lead.get("business_name", "Unknown"),
            industry=lead.get("industry", "Unknown"),
            ad_creative_sample=lead.get("ad_creative_sample", "N/A")[:500],
            estimated_spend=lead.get("estimated_spend", "Unknown"),
            website=lead.get("website", "N/A")
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": STRATEGY_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            logger.error(f"Failed to generate strategy content: {e}")
            return None
    
    def _create_header(self, canvas, doc):
        """Create page header with branding."""
        canvas.saveState()
        canvas.setFillColor(colors.HexColor('#1a1a2e'))
        canvas.rect(0, A4[1] - 50, A4[0], 50, fill=True)
        canvas.setFillColor(colors.white)
        canvas.setFont('Helvetica-Bold', 14)
        canvas.drawString(30, A4[1] - 32, AGENCY_NAME)
        canvas.setFont('Helvetica', 10)
        canvas.drawRightString(A4[0] - 30, A4[1] - 32, AGENCY_WEBSITE)
        canvas.restoreState()
        
    def _create_footer(self, canvas, doc):
        """Create page footer."""
        canvas.saveState()
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.setFont('Helvetica', 9)
        canvas.drawString(30, 30, f"Confidential - Prepared for {doc.business_name}")
        canvas.drawRightString(A4[0] - 30, 30, f"Page {doc.page}")
        canvas.restoreState()
        
    def _header_footer(self, canvas, doc):
        """Combined header and footer."""
        self._create_header(canvas, doc)
        self._create_footer(canvas, doc)
    
    def _build_cover_page(self, lead: Dict[str, Any], strategy: Dict[str, Any]) -> List:
        """Build the cover page elements."""
        elements = []
        
        elements.append(Spacer(1, 2*inch))
        
        elements.append(Paragraph(
            f"14-Day Content Strategy",
            self.styles['Title916']
        ))
        
        elements.append(Paragraph(
            f"<b>{lead.get('business_name', 'Your Business')}</b>",
            ParagraphStyle(
                'BusinessName',
                parent=self.styles['Title'],
                fontSize=22,
                textColor=colors.HexColor('#e94560'),
                alignment=TA_CENTER
            )
        ))
        
        elements.append(Spacer(1, 0.5*inch))
        
        elements.append(Paragraph(
            f"Prepared by {AGENCY_NAME}",
            ParagraphStyle(
                'PreparedBy',
                parent=self.styles['Normal'],
                fontSize=14,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#666666')
            )
        ))
        
        elements.append(Paragraph(
            datetime.now().strftime("%B %d, %Y"),
            ParagraphStyle(
                'Date',
                parent=self.styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#999999')
            )
        ))
        
        elements.append(Spacer(1, 1*inch))
        
        elements.append(Paragraph(
            strategy.get('executive_summary', ''),
            ParagraphStyle(
                'Summary',
                parent=self.styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#333333'),
                leading=18
            )
        ))
        
        elements.append(PageBreak())
        
        return elements
    
    def _build_toc(self) -> List:
        """Build table of contents."""
        elements = []
        
        elements.append(Paragraph("Contents", self.styles['Heading916']))
        elements.append(Spacer(1, 0.3*inch))
        
        toc_items = [
            ("1. Current State Analysis", 3),
            ("2. Target Audience Personas", 3),
            ("3. Platform Strategy", 4),
            ("4. Content Pillars", 4),
            ("5. 14-Day Content Calendar", 5),
            ("6. Hook Library", 7),
            ("7. Hashtag Strategy", 8),
            ("8. Engagement Tactics", 8),
            ("9. Metrics & KPIs", 9),
            ("10. Next Steps", 9),
        ]
        
        toc_data = [[item[0], f"Page {item[1]}"] for item in toc_items]
        
        toc_table = Table(toc_data, colWidths=[4*inch, 1.5*inch])
        toc_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#16213e')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#999999')),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(toc_table)
        elements.append(PageBreak())
        
        return elements
    
    def _build_personas_section(self, personas: List[Dict[str, Any]]) -> List:
        """Build target personas section."""
        elements = []
        
        elements.append(Paragraph("2. Target Audience Personas", self.styles['Heading916']))
        elements.append(Spacer(1, 0.2*inch))
        
        for i, persona in enumerate(personas[:3], 1):
            elements.append(Paragraph(
                f"Persona {i}: {persona.get('name', 'Unknown')}",
                self.styles['SubHeading916']
            ))
            
            persona_data = [
                ["Age Range", persona.get('age_range', 'N/A')],
                ["Primary Platforms", ', '.join(persona.get('platforms', []))],
                ["Interests", ', '.join(persona.get('interests', [])[:4])],
            ]
            
            persona_table = Table(persona_data, colWidths=[1.5*inch, 4*inch])
            persona_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
            ]))
            
            elements.append(persona_table)
            elements.append(Spacer(1, 0.15*inch))
            
            if persona.get('pain_points'):
                elements.append(Paragraph("<b>Pain Points:</b>", self.styles['Body916']))
                for point in persona.get('pain_points', [])[:3]:
                    elements.append(Paragraph(f"• {point}", self.styles['Body916']))
            
            elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _build_calendar_section(self, calendar: List[Dict[str, Any]]) -> List:
        """Build 14-day content calendar section."""
        elements = []
        
        elements.append(Paragraph("5. 14-Day Content Calendar", self.styles['Heading916']))
        elements.append(Spacer(1, 0.2*inch))
        
        start_date = datetime.now()
        
        for week in range(2):
            elements.append(Paragraph(
                f"Week {week + 1}",
                self.styles['SubHeading916']
            ))
            
            week_start = week * 7
            week_end = min(week_start + 7, len(calendar))
            
            week_data = [["Day", "Platform", "Content Type", "Topic"]]
            
            for i, day in enumerate(calendar[week_start:week_end], week_start + 1):
                day_date = start_date + timedelta(days=i-1)
                week_data.append([
                    day_date.strftime("%a %m/%d"),
                    day.get('platform', 'TikTok'),
                    day.get('content_type', 'Video'),
                    day.get('topic', '')[:40] + ('...' if len(day.get('topic', '')) > 40 else '')
                ])
            
            cal_table = Table(week_data, colWidths=[0.9*inch, 1*inch, 1.2*inch, 2.5*inch])
            cal_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#333333')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ]))
            
            elements.append(cal_table)
            elements.append(Spacer(1, 0.3*inch))
        
        return elements
    
    def _build_hooks_section(self, hooks: List[str]) -> List:
        """Build hook library section."""
        elements = []
        
        elements.append(Paragraph("6. Hook Library", self.styles['Heading916']))
        elements.append(Paragraph(
            "Use these attention-grabbing hooks in the first 3 seconds of your videos:",
            self.styles['Body916']
        ))
        elements.append(Spacer(1, 0.15*inch))
        
        for i, hook in enumerate(hooks[:10], 1):
            elements.append(Paragraph(
                f"<b>{i}.</b> \"{hook}\"",
                self.styles['Body916']
            ))
        
        return elements
    
    def _build_hashtag_section(self, hashtags: Dict[str, List[str]]) -> List:
        """Build hashtag strategy section."""
        elements = []
        
        elements.append(Paragraph("7. Hashtag Strategy", self.styles['Heading916']))
        elements.append(Spacer(1, 0.15*inch))
        
        categories = [
            ("Branded Hashtags", hashtags.get('branded', [])),
            ("Trending Hashtags", hashtags.get('trending', [])),
            ("Niche Hashtags", hashtags.get('niche', [])),
        ]
        
        for category_name, tags in categories:
            if tags:
                elements.append(Paragraph(f"<b>{category_name}:</b>", self.styles['Body916']))
                elements.append(Paragraph(
                    ' '.join([f"#{tag}" if not tag.startswith('#') else tag for tag in tags[:8]]),
                    ParagraphStyle(
                        'Hashtags',
                        parent=self.styles['Normal'],
                        fontSize=10,
                        textColor=colors.HexColor('#0f3460'),
                        spaceAfter=12
                    )
                ))
        
        return elements
    
    def _build_metrics_section(self, metrics: List[Dict[str, Any]]) -> List:
        """Build metrics tracking section."""
        elements = []
        
        elements.append(Paragraph("9. Metrics & KPIs", self.styles['Heading916']))
        elements.append(Spacer(1, 0.15*inch))
        
        if metrics:
            metrics_data = [["Metric", "Current Benchmark", "30-Day Target"]]
            
            for metric in metrics[:6]:
                metrics_data.append([
                    metric.get('metric', ''),
                    metric.get('benchmark', 'N/A'),
                    metric.get('target', 'TBD')
                ])
            
            metrics_table = Table(metrics_data, colWidths=[2.2*inch, 1.8*inch, 1.8*inch])
            metrics_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16213e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#333333')),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('PADDING', (0, 0), (-1, -1), 8),
            ]))
            
            elements.append(metrics_table)
        
        return elements
    
    def _build_next_steps(self, lead: Dict[str, Any]) -> List:
        """Build next steps / CTA section."""
        elements = []
        
        elements.append(Paragraph("10. Next Steps", self.styles['Heading916']))
        elements.append(Spacer(1, 0.15*inch))
        
        elements.append(Paragraph(
            "Ready to transform your social media presence with vertical video content?",
            self.styles['Highlight916']
        ))
        
        elements.append(Spacer(1, 0.2*inch))
        
        steps = [
            "Book a free 15-minute strategy call with our team",
            "We'll review this strategy and customize it for your needs",
            "Get a proposal for done-for-you content creation",
            "Start seeing results within 30 days"
        ]
        
        for i, step in enumerate(steps, 1):
            elements.append(Paragraph(f"<b>Step {i}:</b> {step}", self.styles['Body916']))
        
        elements.append(Spacer(1, 0.3*inch))
        
        contact_data = [
            [f"📧 {AGENCY_EMAIL}", f"📞 {AGENCY_PHONE}"],
            [f"🌐 {AGENCY_WEBSITE}", ""],
        ]
        
        contact_table = Table(contact_data, colWidths=[2.8*inch, 2.8*inch])
        contact_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#16213e')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(contact_table)
        
        return elements
    
    def _generate_pdf(
        self,
        lead: Dict[str, Any],
        strategy: Dict[str, Any],
        output_path: Path
    ) -> bool:
        """Generate the PDF document."""
        try:
            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=A4,
                topMargin=70,
                bottomMargin=50,
                leftMargin=30,
                rightMargin=30
            )
            
            doc.business_name = lead.get('business_name', 'Unknown')
            
            elements = []
            
            elements.extend(self._build_cover_page(lead, strategy))
            elements.extend(self._build_toc())
            
            elements.append(Paragraph("1. Current State Analysis", self.styles['Heading916']))
            elements.append(Paragraph(
                strategy.get('current_state_analysis', 'Analysis not available.'),
                self.styles['Body916']
            ))
            elements.append(Spacer(1, 0.2*inch))
            
            elements.extend(self._build_personas_section(
                strategy.get('target_personas', [])
            ))
            
            elements.append(PageBreak())
            
            elements.append(Paragraph("3. Platform Strategy", self.styles['Heading916']))
            platform_strat = strategy.get('platform_strategy', {})
            elements.append(Paragraph(
                f"<b>Primary Platform:</b> {platform_strat.get('primary_platform', 'TikTok')}",
                self.styles['Body916']
            ))
            elements.append(Paragraph(
                f"<b>Secondary Platforms:</b> {', '.join(platform_strat.get('secondary_platforms', []))}",
                self.styles['Body916']
            ))
            elements.append(Spacer(1, 0.2*inch))
            
            elements.append(Paragraph("4. Content Pillars", self.styles['Heading916']))
            for pillar in strategy.get('content_pillars', []):
                elements.append(Paragraph(
                    f"<b>{pillar.get('name', '')} ({pillar.get('percentage', 0)}%)</b>: {pillar.get('description', '')}",
                    self.styles['Body916']
                ))
            
            elements.append(PageBreak())
            
            elements.extend(self._build_calendar_section(
                strategy.get('content_calendar', [])
            ))
            
            elements.append(PageBreak())
            
            elements.extend(self._build_hooks_section(
                strategy.get('hook_library', [])
            ))
            
            elements.append(Spacer(1, 0.3*inch))
            
            elements.extend(self._build_hashtag_section(
                strategy.get('hashtag_strategy', {})
            ))
            
            elements.append(PageBreak())
            
            elements.append(Paragraph("8. Engagement Tactics", self.styles['Heading916']))
            for tactic in strategy.get('engagement_tactics', []):
                elements.append(Paragraph(f"• {tactic}", self.styles['Body916']))
            
            elements.append(Spacer(1, 0.3*inch))
            
            elements.extend(self._build_metrics_section(
                strategy.get('metrics_to_track', [])
            ))
            
            elements.append(PageBreak())
            
            elements.extend(self._build_next_steps(lead))
            
            doc.build(elements, onFirstPage=self._header_footer, onLaterPages=self._header_footer)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate PDF: {e}")
            return False
    
    async def generate_strategy_pack(
        self,
        lead: Dict[str, Any]
    ) -> Optional[str]:
        """
        Generate a complete strategy pack PDF for a lead.
        
        Args:
            lead: Lead data dictionary
            
        Returns:
            Path to generated PDF, or None if failed
        """
        logger.info(f"Generating strategy pack for {lead.get('business_name')}")
        
        strategy = await self._generate_strategy_content(lead)
        
        if not strategy:
            logger.error("Failed to generate strategy content")
            return None
        
        safe_name = "".join(c for c in lead.get('business_name', 'unknown') if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_').lower()
        timestamp = datetime.now().strftime('%Y%m%d')
        
        filename = f"strategy_{safe_name}_{timestamp}.pdf"
        output_path = STRATEGY_DIR / filename
        
        success = self._generate_pdf(lead, strategy, output_path)
        
        if success:
            logger.info(f"Strategy pack saved to {output_path}")
            return str(output_path)
        
        return None


async def generate_strategy_for_lead(lead_id: int) -> Optional[str]:
    """
    Generate a strategy pack for a specific lead.
    
    Args:
        lead_id: Lead ID
        
    Returns:
        Path to generated PDF
    """
    lead = await get_lead(lead_id)
    
    if not lead:
        logger.error(f"Lead {lead_id} not found")
        return None
    
    generator = StrategyPackGenerator()
    pdf_path = await generator.generate_strategy_pack(lead)
    
    if pdf_path:
        await update_lead(lead_id, {"strategy_pack_path": pdf_path})
    
    return pdf_path


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) > 1:
        lead_id = int(sys.argv[1])
        print(f"Generating strategy pack for lead {lead_id}...")
        result = asyncio.run(generate_strategy_for_lead(lead_id))
        if result:
            print(f"Generated: {result}")
        else:
            print("Failed to generate strategy pack")
    else:
        print("Usage: python strategy_pack.py <lead_id>")
