# 🤖 dukAnI – AI-Powered WhatsApp Concierge

dukAnI is a proof-of-concept AI agent that acts as your **personal shopping assistant on WhatsApp**. Whether you're ordering food, booking a hotel, or browsing products — dukAnI handles it for you via intelligent conversations, personalized using your unique preferences.

---

## 🚀 Features

### ✅ Core Capabilities

- 🔌 **WhatsApp Integration**
  - Connect via `whatsapp-web.js`
  - Respond to incoming messages using an AI agent

- 🧠 **Agent-Powered Intelligence**
  - Built with LangChain (RAG architecture)
  - Personalized replies based on stored user preferences
  - Connects to external tools for live data

- 🌐 **Live Search with Tavily**
  - Discover restaurants, hotels, flights, and products
  - Integrates with the Tavily API for real-time web search

- 🧾 **Smart Profile Memory**
  - Preferences stored in `profileStore.json`
  - Includes food type, travel style, budget range
  - Used to personalize suggestions and refine prompts

- 💬 **LLM-Powered Responses via Groq**
  - Uses Groq to infer responses from LLaMA 3
  - Quick, high-quality outputs with low latency

---

## 🎯 Use Cases

- 🍔 **Food Ordering**
  - Discover restaurants
  - Browse menus (future scope)
  - Get meal suggestions

- ✈️ **Travel Booking**
  - Search for flights and hotels
  - Suggest full itineraries (future scope)

- 🛍️ **Marketplace Browsing**
  - Search for new or second-hand items
  - Filter by budget or preference

---

## ⚙️ Tech Stack

| Layer              | Tool/Service           |
|--------------------|------------------------|
| Backend Framework  | NestJS                 |
| Messaging          | whatsapp-web.js        |
| Search API         | Tavily                 |
| Language Model     | Groq + LLaMA 3         |
| Agent Logic        | LangChain (RAG)        |
| Storage            | JSON file (PoC profile)|
| Hosting (PoC)      | Replit                 |
| Dev Environment    | Cursor Editor          |

---
## 📌 Next Steps

1. Finalize project scaffold (`nest new dukani`)
2. Implement WhatsApp bot module
3. Build agent service with mock RAG pipeline
4. Integrate Tavily search
5. Connect to Groq API
6. Load and query profile from JSON
7. Link all pieces in `app.module.ts`
8. Deploy to Replit and test