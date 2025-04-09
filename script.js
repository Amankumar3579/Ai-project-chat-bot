// class RestaurantFinder {
//   constructor() {
//     this.chatBox = document.getElementById('chat-box');
//     this.userInput = document.getElementById('user-input');
//     this.sendBtn = document.getElementById('send-btn');
//     // Replace with your actual Gemini API key
//     this.GEMINI_API_KEY = 'AIzaSyCloucsAGaa2_2ksiQEP9idn3o0xZ6IQLM';
//     this.API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    class RestaurantFinder {
      constructor() {
        this.chatBox = document.getElementById('chat-box');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.GEMINI_API_KEY = 'AIzaSyCloucsAGaa2_2ksiQEP9idn3o0xZ6IQLM';
        this.API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
        this.state = {
          location: null,
          cuisine: null,
          budget: null,
          currentStep: 'location'
        };
    
        this.initializeEventListeners();
        this.displayWelcomeMessage();
      }
    
      formatText(text) {
        return text
          .replace(/\[|\]|\{|\}/g, '')
          .replace(/"(.*?)":/g, '<strong>$1</strong>:')
          .replace(/(?:\\n|\\r\\n|\r\n|\n)/g, '<br>')
          .replace(/"(.*?)"/g, '$1')
          .replace(/\\u([\dA-Fa-f]{4})/g, (m, g) => String.fromCharCode(parseInt(g, 16)));
      }
    
      async callGeminiAPI(prompt) {
        try {
          const response = await fetch(`${this.API_URL}?key=${this.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
            })
          });
    
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (err) {
          console.error('Gemini API error:', err);
          return null;
        }
      }
    
      async generateResponse(userInput) {
        const prompt = `
          You are a restaurant finder bot. Current info:
          Location: ${this.state.location || 'Unknown'}
          Cuisine: ${this.state.cuisine || 'Unknown'}
          Budget: ${this.state.budget || 'Unknown'}
          Step: ${this.state.currentStep}
    
          User said: "${userInput}"
    
          If location: validate and ask cuisine. If cuisine: ask budget. If budget: suggest restaurants as:
          {
            "message": "Your message here",
            "restaurants": [
              {
                "name": "...",
                "rating": 4.5,
                "priceRange": "$$",
                "cuisine": "...",
                "waitTime": "...",
                "specialty": "...",
                "description": "..."
              }
            ]
          }
          Be friendly and use emojis.
        `;
        return await this.callGeminiAPI(prompt);
      }
    
      initializeEventListeners() {
        this.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.handleUserInput();
        });
      }
    
      displayWelcomeMessage() {
        this.chatBox.innerHTML = `
          <div class="welcome-message">
            <div class="bot-avatar"><i class="fas fa-robot"></i></div>
            <div class="message bot">
              <p>👋 Hi! I'm your Restaurant Finder Assistant.</p>
              <p>Start by telling me your location 🗺️</p>
            </div>
          </div>`;
      }
    
      appendMessage(sender, content, isHTML = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
    
        if (sender === 'bot') {
          const avatar = document.createElement('div');
          avatar.className = 'bot-avatar';
          avatar.innerHTML = '<i class="fas fa-robot"></i>';
          wrapper.appendChild(avatar);
        }
    
        const msg = document.createElement('div');
        msg.className = `message ${sender} bot-response`;
        msg.innerHTML = isHTML ? content : this.formatText(content);
        wrapper.appendChild(msg);
    
        this.chatBox.appendChild(wrapper);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
      }
    
      showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = `
          <div class="bot-avatar"><i class="fas fa-robot"></i></div>
          <div class="typing-dots"><span></span><span></span><span></span></div>`;
        this.chatBox.appendChild(typing);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
      }
    
      hideTypingIndicator() {
        const typing = this.chatBox.querySelector('.typing-indicator');
        if (typing) typing.remove();
      }
    
      async handleUserInput() {
        const input = this.userInput.value.trim();
        if (!input) return;
        this.userInput.value = '';
        this.appendMessage('user', input);
        this.showTypingIndicator();
    
        try {
          const response = await this.generateResponse(input);
          this.hideTypingIndicator();
          if (!response) throw new Error('Empty response');
    
          switch (this.state.currentStep) {
            case 'location': this.state.location = input; this.state.currentStep = 'cuisine'; break;
            case 'cuisine': this.state.cuisine = input; this.state.currentStep = 'budget'; break;
            case 'budget': this.state.budget = input; this.state.currentStep = 'suggestions'; break;
            case 'suggestions': this.resetState(); this.state.currentStep = 'location'; break;
          }
    
          try {
            const json = JSON.parse(response);
            if (json.restaurants) {
              this.appendMessage('bot', json.message);
              json.restaurants.forEach(r => {
                this.appendMessage('bot', this.createRestaurantCard(r), true);
              });
            } else {
              this.appendMessage('bot', response);
            }
          } catch {
            this.appendMessage('bot', response);
          }
        } catch (err) {
          console.error(err);
          this.hideTypingIndicator();
          this.appendMessage('bot', '⚠️ Something went wrong. Try again.');
        }
      }
    
      createRestaurantCard(r) {
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(r.name + ' ' + this.state.location)}`;
        return `
          <div class="restaurant-card">
            <h3>${r.name}</h3>
            <div class="restaurant-info">
              <span><i class="fas fa-star" style="color:#ffc107;"></i> ${r.rating}</span>
              <span><i class="fas fa-wallet"></i> ${r.priceRange}</span>
              <span><i class="fas fa-clock"></i> ${r.waitTime}</span>
            </div>
            <p><i class="fas fa-utensils"></i> Specialty: ${r.specialty}</p>
            <p class="description">${r.description || ''}</p>
            <div class="action-buttons">
              <button class="action-btn directions-btn" onclick="window.open('${mapUrl}', '_blank')">
                <i class="fas fa-directions"></i> Directions
              </button>
              <button class="action-btn order-btn" onclick="alert('Ordering feature coming soon!')">
                <i class="fas fa-shopping-cart"></i> Order Now
              </button>
            </div>
          </div>`;
      }
    
      handleSuggestion(text) {
        this.userInput.value = text;
        this.handleUserInput();
      }
    
      resetState() {
        this.state = { location: null, cuisine: null, budget: null };
      }
    }
    
    window.addEventListener('DOMContentLoaded', () => {
      window.bot = new RestaurantFinder();
    });