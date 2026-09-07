# AI Lead Qualification Chatbot 🤖
## $0 Budget Edition

A fully functional AI chatbot you can deploy **completely free** and sell to clients for $800-$1,600 each.

**Total startup cost: $0**

---

## 🆓 Free Stack

| Component | Service | Free Tier |
|-----------|---------|-----------|
| **AI Model** | Groq (Llama 3.1) | 14,400 requests/day |
| **Hosting** | Railway / Render | 500 hours/month |
| **Domain** | Included | yourapp.railway.app |
| **SSL** | Included | Automatic HTTPS |

---

## 💰 Revenue Potential (Starting from $0)

| Service | What You Charge |
|---------|-----------------|
| Setup & Deployment | $800 - $1,600 |
| Monthly Maintenance | $160 - $270 |
| Custom Integrations | $270 - $800 |

**Your cost: $0 → Your profit: 100%**

---

## 🚀 Quick Start (15 minutes)

### Step 1: Get a FREE AI API Key

**Option A: Groq (Recommended - Fastest)**
1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Click "API Keys" → "Create API Key"
4. Copy your key

**Option B: Google Gemini**
1. Go to https://aistudio.google.com
2. Sign in with Google
3. Click "Get API Key" → "Create API Key"
4. Copy your key

### Step 2: Deploy FREE on Railway

1. Fork this repo to your GitHub
2. Go to https://railway.app and sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repo
5. Go to "Variables" tab, add:
   ```
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_your_key_here
   ```
6. Railway auto-deploys! You'll get a URL like `your-app.railway.app`

**Alternative: Deploy FREE on Render**
1. Go to https://render.com
2. New → Web Service → Connect your GitHub repo
3. Add environment variables
4. Deploy (free tier available)

### Step 3: Test Your Chatbot

Open `https://your-app.railway.app/demo.html` and click the chat button!

---

## 🎯 28-Day $0 to Income Plan

### Week 1: Build & Learn
| Day | Action | Time |
|-----|--------|------|
| 1 | Get Groq API key, deploy to Railway | 30 min |
| 2 | Test chatbot, customize for your agency | 1 hour |
| 3 | Record demo video with Loom (free) | 30 min |
| 4 | Create simple portfolio page | 1 hour |
| 5-7 | Practice explaining value to businesses | ongoing |

### Week 2: Outreach
| Day | Action | Time |
|-----|--------|------|
| 8 | Post on LinkedIn about your AI chatbot | 15 min |
| 9-14 | DM 20 business owners/day on LinkedIn | 1 hour/day |

**DM Template:**
> "Hey [Name], I noticed [Company] doesn't have a chatbot to capture leads after hours. I just built an AI assistant that qualifies visitors 24/7 and sends you hot leads instantly. Want a free demo for your site?"

### Week 3: Close Deals
| Day | Action |
|-----|--------|
| 15-21 | Demo calls, send proposals |

**Proposal Template:**
- Setup: R20,000 ($1,100) - one time
- Monthly: R3,500 ($190) - ongoing support + AI costs
- Includes: Custom branding, integration, training

### Week 4: Deliver & Scale
| Day | Action |
|-----|--------|
| 22-28 | Deploy for clients, ask for referrals |

---

## 🎨 Customizing for Clients

### Change the AI Personality

Edit `SYSTEM_PROMPT` in `server.js` for each client:

```javascript
const SYSTEM_PROMPT = `You are a friendly assistant for [CLIENT BUSINESS].

Your job is to:
1. Greet visitors warmly
2. Understand what they need
3. Qualify them by asking about:
   - [RELEVANT QUESTION 1]
   - [RELEVANT QUESTION 2]
   - [BUDGET/TIMELINE QUESTION]
4. Encourage hot leads to book a call

Keep responses short (2-3 sentences). Be helpful, not pushy.`;
```

### Change Widget Colors

Clients customize via `window.ChatbotConfig`:

```html
<script>
  window.ChatbotConfig = {
    apiUrl: 'https://client-chatbot.railway.app',
    primaryColor: '#FF6B6B',  // Client's brand color
    companyName: 'Client Company',
    greeting: 'Hi! How can we help you today?'
  };
</script>
<script src="https://client-chatbot.railway.app/widget.js"></script>
```

---

## 📊 Free Tier Limits (More Than Enough)

### Groq Free Tier
- 30 requests/minute
- 14,400 requests/day
- **Reality:** Most small business sites get 10-50 chats/day

### Railway Free Tier
- 500 hours/month execution time
- **Reality:** A chatbot uses ~5-10 hours/month

### When to Upgrade
Only when a client gets 500+ chats/day (a good problem). Then:
- Groq paid: $0.05 per 1M tokens (~10,000 chats = $0.50)
- Pass the cost to client in their monthly fee

---

## 🔧 Local Development

```bash
# Clone and install
git clone [your-repo]
cd ai-chatbot-widget
npm install

# Configure
cp .env.example .env
# Edit .env with your Groq API key

# Run
npm start

# Open http://localhost:3000/demo.html
```

---

## 📁 Project Structure

```
ai-chatbot-widget/
├── server.js           # Backend with FREE AI APIs
├── public/
│   ├── widget.js       # Embeddable chat widget
│   └── demo.html       # Demo page for clients
├── .env.example        # Config template
└── README.md           # This file
```

---

## 💡 Sales Tips

### Opening Message
> "I help businesses capture leads while they sleep. My AI chatbot qualifies visitors 24/7 and sends you the hot ones instantly. No monthly contracts, cancel anytime."

### Objection Handling

**"It's too expensive"**
> "How much is one new customer worth to you? Most businesses close 1-2 extra deals per month from after-hours leads. That's usually 10-20x the monthly fee."

**"I don't trust AI"**
> "That's smart to be cautious. Let me show you exactly how it works - you control all the questions it asks, and it just qualifies based on your criteria. Want a demo?"

**"I'll think about it"**
> "Totally understand. While you're thinking, your competitors with chatbots are capturing leads at 2am. I have 2 spots left this month - want me to hold one?"

---

## 🚀 Scale Beyond Chatbots

Once you've sold 3-5 chatbots, expand your AI agency:

| Service | You Charge |
|---------|------------|
| AI Email Automation | $500-$1,500 |
| AI Content Writing | $300-$800/month |
| AI Voice Agents | $2,000-$5,000 |
| Full AI Automation Package | $5,000-$15,000 |

---

## Need Help?

Common issues:
- **Chatbot not responding:** Check your API key in Railway variables
- **Slow responses:** Groq is usually instant; check your internet
- **Widget not showing:** Make sure the script URL matches your deployment

---

**Built for entrepreneurs who want to start an AI business with $0.**

Now go make money! 🚀
