# AI Lead Qualification Chatbot 🤖

A deployable AI-powered lead qualification chatbot that you can embed on any website. Built to help you start an AI business selling chatbot services to clients.

## 💰 Revenue Potential

| Service | Price Range (ZAR) | Price Range (USD) |
|---------|-------------------|-------------------|
| Setup & Deployment | R15,000 - R30,000 | $800 - $1,600 |
| Monthly Maintenance | R3,000 - R5,000 | $160 - $270 |
| Custom Integrations | R5,000 - R15,000 | $270 - $800 |
| White-Label License | R50,000+ | $2,700+ |

**Example:** 3 clients @ R25,000 setup + R4,000/month = **R87,000 first month** + R12,000 recurring

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-chatbot-widget
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Run the Server

```bash
npm start
```

### 4. Test It Out

Open http://localhost:3000/demo.html in your browser and click the chat button!

## 📦 Deploying for Clients

### Option 1: Deploy to Railway (Recommended)

1. Push to GitHub
2. Connect to [Railway](https://railway.app)
3. Add `OPENAI_API_KEY` environment variable
4. Deploy!

### Option 2: Deploy to Render

1. Push to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Add environment variables
4. Deploy!

### Option 3: Deploy to VPS

```bash
# On your server
git clone your-repo
cd ai-chatbot-widget
npm install
cp .env.example .env
# Edit .env with your API key
npm start
```

Use PM2 to keep it running:
```bash
npm install -g pm2
pm2 start server.js --name "chatbot"
pm2 save
pm2 startup
```

## 🎨 Customization

### For Each Client

Edit the `SYSTEM_PROMPT` in `server.js` to customize:
- Business type and industry
- Qualification questions
- Lead scoring criteria
- Conversation style

### Widget Styling

Clients can customize the widget by setting `window.ChatbotConfig`:

```html
<script>
  window.ChatbotConfig = {
    apiUrl: 'https://their-api-url.com',
    primaryColor: '#FF6B6B',        // Their brand color
    companyName: 'Client Company',   // Their company name
    greeting: 'Welcome! How can we help?',
    position: 'right'               // 'left' or 'right'
  };
</script>
<script src="https://their-api-url.com/widget.js"></script>
```

## 🔧 Adding Integrations (Upsell Opportunities)

### Email Notifications
Add nodemailer to send lead notifications:

```javascript
// In server.js
const nodemailer = require('nodemailer');

// After a conversation ends, send email
transporter.sendMail({
  to: 'client@company.com',
  subject: `New Lead (Score: ${leadScore}/10)`,
  html: leadSummary
});
```

### Slack Notifications
```javascript
await fetch(SLACK_WEBHOOK_URL, {
  method: 'POST',
  body: JSON.stringify({ text: `New lead! Score: ${leadScore}` })
});
```

### CRM Integration
Connect to HubSpot, Pipedrive, etc. using their APIs.

## 📊 Lead Scoring Logic

The chatbot automatically scores leads 1-10 based on:

| Factor | Score Impact |
|--------|--------------|
| High budget mentioned | +2 |
| Medium budget | +1 |
| Low/no budget | -2 |
| Urgent timeline | +2 |
| Soon timeline | +1 |
| Just browsing | -2 |
| Wants to book call | +2 |
| Shows interest | +1 |

## 🎯 Sales Script for Clients

### Opening
> "I noticed your website gets traffic but you're probably losing leads after hours. What if I told you I could set up an AI assistant that qualifies leads 24/7 and sends you the hot ones instantly?"

### Pain Points to Address
- "How many leads slip through because no one's there to respond?"
- "How much time do you spend on unqualified leads?"
- "What would it mean to wake up to qualified leads in your inbox?"

### Close
> "I can have this live on your site within 48 hours. Setup is R25,000 and includes full customization. Then R4,000/month covers the AI costs and my support. Want to see a demo first?"

## 📁 Project Structure

```
ai-chatbot-widget/
├── server.js           # Express server with OpenAI integration
├── public/
│   ├── widget.js       # Embeddable chat widget
│   └── demo.html       # Demo/showcase page
├── .env.example        # Environment variables template
├── package.json
└── README.md
```

## 🔒 Security Notes

- Never expose your OpenAI API key in client-side code
- Rate limit the API endpoints in production
- Add authentication for the admin dashboard
- Validate and sanitize all user inputs

## 📈 Scaling Tips

1. **Use Redis** for conversation storage instead of in-memory
2. **Add rate limiting** to prevent abuse
3. **Cache common responses** to reduce API costs
4. **Use GPT-4o-mini** for cost-effective conversations (~$0.15/1M tokens)

## 💡 Future Enhancements (More Upsells)

- [ ] Admin dashboard for lead management
- [ ] Analytics and conversation insights
- [ ] Multi-language support
- [ ] Voice chat integration
- [ ] Calendar booking integration
- [ ] A/B testing for greetings

---

Built with ❤️ for AI entrepreneurs. Now go sell some chatbots! 🚀
