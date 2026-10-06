# 9:16 Agency - Client Acquisition Automation

Automated workflow for discovering, qualifying, and reaching out to potential clients using Meta Ad Library data, AI-generated content, and personalized outreach.

## Architecture

```
┌─────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│  Meta Ad Library │ →  │  Telegram Approval  │ →  │  Content Generation │
│  (Lead Discovery)│    │  (Manual Review)    │    │  (ChatGPT + Video) │
└─────────────────┘    └────────────────────┘    └──────────────────┘
                                                          ↓
┌─────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│  Email Delivery  │ ←  │  Strategy Pack PDF  │ ←  │  Video Prompts    │
│  (SendGrid)      │    │  (14-Day Plan)      │    │  (Google Flow)    │
└─────────────────┘    └────────────────────┘    └──────────────────┘
```

## Features

- **Lead Discovery**: Scrapes Meta Ad Library for advertisers in target industries
- **Telegram Integration**: Receive notifications and approve/reject leads with inline buttons
- **AI Content Generation**: Personalized outreach copy and video concepts via OpenAI
- **Video Prompts**: Google Flow-ready prompts for AI video generation
- **Strategy Pack**: Auto-generated 14-day content strategy PDF
- **Email Outreach**: Automated sending via SendGrid with PDF attachments

## Quick Start

### 1. Install Dependencies

```bash
cd /workspace/automation
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Initialize Database

```bash
python main.py init
```

### 4. Run Your First Pipeline

```bash
# Run the full pipeline (scrape → notify → generate → send)
python main.py process --sandbox  # Use sandbox to test without sending real emails
```

## CLI Commands

### Core Commands

```bash
# Initialize the database
python main.py init

# View pipeline statistics
python main.py stats

# Test all API configurations
python main.py test-config
```

### Pipeline Steps

```bash
# Step 1: Scrape leads from Meta Ad Library
python main.py scrape [--limit 50] [--keywords "fitness" "beauty"]

# Step 2: Send Telegram notifications for pending leads
python main.py notify [--limit 10]

# Step 3: Generate content for approved leads (email + video concepts)
python main.py generate [--limit 10]

# Step 4: Generate strategy pack for a specific lead
python main.py strategy <lead_id>

# Step 5: Generate video prompts for a specific lead
python main.py video <lead_id>

# Step 6: Send outreach emails
python main.py send [--limit 10] [--sandbox]
```

### Automation Commands

```bash
# Run full pipeline
python main.py process [--limit 20] [--skip-scrape] [--skip-notify] [--sandbox]

# Start Telegram bot (interactive mode)
python main.py bot

# Send daily digest
python main.py digest
```

## Telegram Bot Commands

When running in bot mode, users can interact with these commands:

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and help |
| `/help` | Show available commands |
| `/stats` | View pipeline statistics |
| `/pending` | List pending leads |
| `/review` | Send pending leads for review (with approve/reject buttons) |

### Approval Buttons

Each lead notification includes:
- ✅ **Approve** - Queue for content generation
- ❌ **Reject** - Archive the lead
- ⏸️ **Skip** - Review later

## Cron Job Setup

### Automated Installation

```bash
./scripts/setup_cron.sh
```

### Manual Setup

Add to crontab (`crontab -e`):

```bash
# 9:16 Agency Client Acquisition Automation
# ===========================================

# 9:00 AM - Scrape Meta Ad Library for new leads
0 9 * * * cd /workspace/automation && python main.py scrape --limit 50 >> logs/scrape.log 2>&1

# 9:30 AM - Send Telegram notifications for pending leads
30 9 * * * cd /workspace/automation && python main.py notify --limit 20 >> logs/notify.log 2>&1

# 10:00 AM - Generate content for approved leads
0 10 * * * cd /workspace/automation && python main.py generate --limit 10 >> logs/generate.log 2>&1

# 11:00 AM - Send outreach emails to content-ready leads
0 11 * * * cd /workspace/automation && python main.py send --limit 10 >> logs/send.log 2>&1

# 6:00 PM - Send daily digest to Telegram
0 18 * * * cd /workspace/automation && python main.py digest >> logs/digest.log 2>&1

# Weekly log rotation (Sunday midnight)
0 0 * * 0 find /workspace/automation/logs -name '*.log' -mtime +7 -delete
```

## API Keys Required

| Service | Purpose | How to Get | Env Variable |
|---------|---------|------------|--------------|
| Meta Graph API | Ad Library access | [developers.facebook.com](https://developers.facebook.com) | `META_ACCESS_TOKEN` |
| Telegram Bot | Notifications | [@BotFather](https://t.me/BotFather) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| OpenAI | Content generation | [platform.openai.com](https://platform.openai.com) | `OPENAI_API_KEY` |
| SendGrid | Email sending | [sendgrid.com](https://sendgrid.com) | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |

### Meta Ad Library API Notes

The Meta Ad Library API requires:
1. A Facebook Developer account
2. Identity verification (government ID)
3. An approved app with `ads_read` permission

Access is rate-limited to 200 calls/hour.

### Google Flow Notes

Google Flow (labs.google/flow) is a web-based tool without a public API. The `video_generator` module creates detailed prompts that can be:
- Manually used in Google Flow
- Used with other AI video tools (Runway, Pika, etc.)
- Adapted for when Google releases a Veo API

## Project Structure

```
automation/
├── config/
│   ├── __init__.py
│   └── settings.py           # Configuration & environment variables
├── modules/
│   ├── __init__.py
│   ├── database.py           # SQLite database operations
│   ├── meta_scraper.py       # Meta Ad Library API integration
│   ├── telegram_bot.py       # Telegram notifications & approval
│   ├── content_generator.py  # OpenAI content generation
│   ├── strategy_pack.py      # PDF strategy pack generator
│   ├── video_generator.py    # Video prompt generator
│   └── email_sender.py       # SendGrid email delivery
├── scripts/
│   └── setup_cron.sh         # Cron job installation script
├── data/
│   ├── leads.db              # SQLite database
│   ├── strategy_packs/       # Generated PDF files
│   └── video_prompts/        # Generated video prompt files
├── logs/                     # Log files from cron jobs
├── main.py                   # CLI entry point
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
└── README.md                 # This file
```

## Lead Pipeline

```
┌─────────┐    ┌──────────┐    ┌───────────────┐    ┌──────┐    ┌───────────┐    ┌───────────┐
│ pending │ →  │ approved │ →  │ content_ready │ →  │ sent │ →  │ responded │ →  │ converted │
└─────────┘    └──────────┘    └───────────────┘    └──────┘    └───────────┘    └───────────┘
     ↓
┌──────────┐
│ rejected │
└──────────┘
```

## Generated Content

### Email Content

For each approved lead, the system generates:
- Personalized email subject line
- Email body with industry-specific value propositions
- Pain point identification
- Clear call-to-action

### Video Concepts

For each lead, 3 video concepts are generated:
1. Product/Service Showcase
2. Educational/How-To Content
3. Trend-Based Entertainment

Each concept includes:
- Hook (first 3 seconds)
- Shot-by-shot script
- Google Flow-ready prompts
- Platform recommendations

### Strategy Pack PDF

A comprehensive 14-day content strategy including:
- Executive Summary
- Target Audience Personas
- Platform Strategy
- Content Pillars
- Daily Content Calendar
- Hook Library (10 attention-grabbing hooks)
- Hashtag Strategy
- Engagement Tactics
- Metrics & KPIs
- Next Steps

## Compliance Notes

- Outreach emails include unsubscribe links
- Physical address included per POPIA/CAN-SPAM requirements
- Rate limiting respects all API Terms of Service
- Meta Ad Library API is official (not scraping)
- Leads can be rejected/removed at any point

## Troubleshooting

### Common Issues

**"SendGrid not configured"**
- Add `SENDGRID_API_KEY` to your `.env` file
- Make sure the API key has Mail Send permissions

**"Meta API rate limit exceeded"**
- The scraper automatically respects rate limits (200 calls/hour)
- Wait 18 seconds between calls

**"Telegram notifications not sending"**
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are correct
- Make sure the bot is added to the chat/channel
- For channels, the chat ID should start with `-100`

**"Database not found"**
- Run `python main.py init` to initialize the database

### Logs

Check the logs directory for detailed output:
```bash
tail -f logs/scrape.log
tail -f logs/send.log
```

## License

Proprietary - 9:16 Agency
