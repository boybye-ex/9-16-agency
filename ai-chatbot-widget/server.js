require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Provider Configuration - ALL FREE OPTIONS
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq'; // 'groq', 'gemini', or 'huggingface'

const AI_CONFIG = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant', // Fast & free
    apiKey: process.env.GROQ_API_KEY
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    apiKey: process.env.GEMINI_API_KEY
  },
  huggingface: {
    url: 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
    apiKey: process.env.HF_API_KEY
  }
};

// Lead qualification system prompt - customize per client
const SYSTEM_PROMPT = `You are a friendly, professional lead qualification assistant for a digital marketing agency that specializes in vertical video ads (TikTok, Reels, Shorts).

Your job is to:
1. Greet visitors warmly
2. Understand their business and marketing goals
3. Qualify them as leads by asking about:
   - Their business type and industry
   - Current monthly ad spend (budget indicator)
   - Timeline for starting (urgency)
   - Main marketing challenges
4. Score them and provide appropriate next steps

QUALIFICATION CRITERIA:
- HOT LEAD (Score 8-10): Budget >R50k/month, ready to start within 2 weeks, clear goals
- WARM LEAD (Score 5-7): Budget R20k-50k/month, interested but not urgent
- COLD LEAD (Score 1-4): Just browsing, low budget, or not a fit

CONVERSATION STYLE:
- Keep responses short and conversational (2-3 sentences max)
- Use emojis sparingly but naturally
- Ask ONE question at a time
- Be helpful, not pushy
- If they're a good fit, encourage booking a call
- If not a fit, still be helpful and suggest alternatives

After gathering enough info (usually 4-5 exchanges), provide a summary and suggest next steps:
- Hot leads: "I'd love to connect you with our team! Would you like to book a quick 15-min strategy call?"
- Warm leads: "I'll have someone reach out with some case studies. What's the best email to send those to?"
- Cold leads: "Thanks for chatting! Here are some free resources that might help..."

Remember: You're helping both the business AND the visitor. A good qualification saves everyone time.`;

// Store conversations in memory (use Redis/DB in production)
const conversations = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Get or create conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [
        { role: 'system', content: SYSTEM_PROMPT }
      ]);
    }
    
    const history = conversations.get(sessionId);
    history.push({ role: 'user', content: message });
    
    let reply;
    
    if (AI_PROVIDER === 'groq') {
      reply = await callGroq(history);
    } else if (AI_PROVIDER === 'gemini') {
      reply = await callGemini(history);
    } else if (AI_PROVIDER === 'huggingface') {
      reply = await callHuggingFace(history);
    }
    
    history.push({ role: 'assistant', content: reply });
    
    // Analyze for lead score (simple keyword detection)
    const leadScore = analyzeLeadScore(history);
    
    res.json({ 
      reply,
      leadScore,
      sessionId
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Something went wrong. Please try again.',
      details: error.message 
    });
  }
});

// GROQ - FREE (Llama 3.1, very fast)
// Get key at: https://console.groq.com/keys
async function callGroq(messages) {
  const response = await fetch(AI_CONFIG.groq.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.groq.apiKey}`
    },
    body: JSON.stringify({
      model: AI_CONFIG.groq.model,
      messages: messages,
      max_tokens: 300,
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// GOOGLE GEMINI - FREE (1500 requests/day)
// Get key at: https://aistudio.google.com/app/apikey
async function callGemini(messages) {
  // Convert to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  
  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  
  const response = await fetch(`${AI_CONFIG.gemini.url}?key=${AI_CONFIG.gemini.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7
      }
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// HUGGING FACE - FREE (rate limited)
// Get key at: https://huggingface.co/settings/tokens
async function callHuggingFace(messages) {
  const prompt = messages.map(m => {
    if (m.role === 'system') return `<|system|>\n${m.content}</s>`;
    if (m.role === 'user') return `<|user|>\n${m.content}</s>`;
    return `<|assistant|>\n${m.content}</s>`;
  }).join('\n') + '\n<|assistant|>\n';
  
  const response = await fetch(AI_CONFIG.huggingface.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.huggingface.apiKey}`
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.7,
        return_full_text: false
      }
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data[0].generated_text.split('</s>')[0].trim();
}

// Simple lead scoring based on conversation
function analyzeLeadScore(history) {
  const fullConversation = history.map(m => m.content).join(' ').toLowerCase();
  
  let score = 5; // Start neutral
  
  // Budget indicators
  if (fullConversation.includes('50k') || fullConversation.includes('100k') || fullConversation.includes('r50') || fullConversation.includes('r100')) score += 2;
  if (fullConversation.includes('20k') || fullConversation.includes('30k') || fullConversation.includes('r20') || fullConversation.includes('r30')) score += 1;
  if (fullConversation.includes('small budget') || fullConversation.includes('just starting') || fullConversation.includes('no budget')) score -= 2;
  
  // Urgency indicators
  if (fullConversation.includes('asap') || fullConversation.includes('immediately') || fullConversation.includes('this week') || fullConversation.includes('urgent')) score += 2;
  if (fullConversation.includes('next month') || fullConversation.includes('soon')) score += 1;
  if (fullConversation.includes('just looking') || fullConversation.includes('browsing') || fullConversation.includes('maybe later')) score -= 2;
  
  // Intent indicators
  if (fullConversation.includes('book') || fullConversation.includes('call') || fullConversation.includes('meeting') || fullConversation.includes('schedule')) score += 2;
  if (fullConversation.includes('interested') || fullConversation.includes('tell me more')) score += 1;
  
  return Math.max(1, Math.min(10, score)); // Clamp between 1-10
}

// Webhook endpoint for lead notifications
app.post('/api/lead-notify', async (req, res) => {
  const { sessionId, email, leadScore, conversationSummary } = req.body;
  
  // In production: Send to email, Slack, CRM, etc.
  console.log('=== NEW LEAD ===');
  console.log(`Score: ${leadScore}/10`);
  console.log(`Email: ${email}`);
  console.log(`Summary: ${conversationSummary}`);
  console.log('================');
  
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 AI Lead Chatbot running on port ${PORT}`);
  console.log(`📍 Widget: http://localhost:${PORT}/widget.html`);
  console.log(`📍 Demo: http://localhost:${PORT}/demo.html`);
});
