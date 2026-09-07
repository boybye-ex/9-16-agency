/**
 * AI Lead Qualification Chatbot Widget
 * Embed on any website with a single script tag
 */
(function() {
  'use strict';

  // Configuration (can be overridden via window.ChatbotConfig)
  const config = {
    apiUrl: window.ChatbotConfig?.apiUrl || 'http://localhost:3000',
    primaryColor: window.ChatbotConfig?.primaryColor || '#25F4EE',
    companyName: window.ChatbotConfig?.companyName || 'The 9:16 Agency',
    greeting: window.ChatbotConfig?.greeting || "Hey! 👋 I'm here to help you grow with vertical video ads. What brings you here today?",
    position: window.ChatbotConfig?.position || 'right', // 'left' or 'right'
    ...window.ChatbotConfig
  };

  // Generate unique session ID
  const sessionId = 'chat_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

  // CSS Styles
  const styles = `
    #ai-chatbot-widget {
      --primary: ${config.primaryColor};
      --primary-dark: ${adjustColor(config.primaryColor, -20)};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      bottom: 20px;
      ${config.position}: 20px;
      z-index: 99999;
    }

    #chatbot-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    #chatbot-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 25px rgba(0,0,0,0.3);
    }

    #chatbot-toggle svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #chatbot-toggle .close-icon {
      display: none;
    }

    #chatbot-toggle.open .chat-icon {
      display: none;
    }

    #chatbot-toggle.open .close-icon {
      display: block;
    }

    #chatbot-container {
      position: absolute;
      bottom: 70px;
      ${config.position}: 0;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 100px);
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #chatbot-container.open {
      display: flex;
    }

    #chatbot-header {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #000;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #chatbot-header .avatar {
      width: 40px;
      height: 40px;
      background: rgba(0,0,0,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    #chatbot-header .info h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    #chatbot-header .info p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.8;
    }

    #chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8f9fa;
    }

    .chat-message {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-message.bot {
      background: white;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .chat-message.user {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #000;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #ccc;
      border-radius: 50%;
      animation: bounce 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }

    #chatbot-input-area {
      padding: 16px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }

    #chatbot-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease;
    }

    #chatbot-input:focus {
      border-color: var(--primary);
    }

    #chatbot-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }

    #chatbot-send:hover {
      transform: scale(1.05);
    }

    #chatbot-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #chatbot-send svg {
      width: 20px;
      height: 20px;
      fill: #000;
    }

    .lead-score-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0,0,0,0.1);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    @media (max-width: 480px) {
      #chatbot-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        bottom: 70px;
      }
    }
  `;

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Create widget HTML
  function createWidget() {
    // Add styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'ai-chatbot-widget';
    widget.innerHTML = `
      <div id="chatbot-container">
        <div id="chatbot-header">
          <div class="avatar">🤖</div>
          <div class="info">
            <h3>${config.companyName}</h3>
            <p>Usually replies instantly</p>
          </div>
        </div>
        <div id="chatbot-messages"></div>
        <div id="chatbot-input-area">
          <input type="text" id="chatbot-input" placeholder="Type your message..." autocomplete="off">
          <button id="chatbot-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <button id="chatbot-toggle">
        <svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    `;

    document.body.appendChild(widget);

    // Get elements
    const toggle = document.getElementById('chatbot-toggle');
    const container = document.getElementById('chatbot-container');
    const messages = document.getElementById('chatbot-messages');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    let isOpen = false;
    let isFirstOpen = true;

    // Toggle chat
    toggle.addEventListener('click', () => {
      isOpen = !isOpen;
      toggle.classList.toggle('open', isOpen);
      container.classList.toggle('open', isOpen);
      
      if (isOpen && isFirstOpen) {
        isFirstOpen = false;
        addMessage(config.greeting, 'bot');
      }
      
      if (isOpen) {
        input.focus();
      }
    });

    // Send message
    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      addMessage(text, 'user');
      sendBtn.disabled = true;

      // Show typing indicator
      const typingEl = showTyping();

      try {
        const response = await fetch(`${config.apiUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId })
        });

        const data = await response.json();
        
        // Remove typing indicator
        typingEl.remove();
        
        if (data.error) {
          addMessage("Sorry, I'm having trouble connecting. Please try again in a moment.", 'bot');
        } else {
          addMessage(data.reply, 'bot');
        }

      } catch (error) {
        typingEl.remove();
        addMessage("Sorry, I'm having trouble connecting. Please try again in a moment.", 'bot');
      }

      sendBtn.disabled = false;
      input.focus();
    }

    // Add message to chat
    function addMessage(text, type) {
      const msg = document.createElement('div');
      msg.className = `chat-message ${type}`;
      msg.textContent = text;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    // Show typing indicator
    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
      return typing;
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
