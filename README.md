# Inzwa Business

A voice-driven intent intelligence system that turns customer conversations into structured business insights. This monorepo contains three integrated layers: a Firebase Functions backend, an analytics dashboard, and a demo storefront.

## Monorepo Structure

```
inzwa/
├── functions/        # Firebase Cloud Functions (backend/brains)
├── dashboard/        # Next.js app for analytics & merchant insights
├── demo-store/       # Next.js sneaker demo with ElevenLabs voice widget
└── README.md         # This file
```

## Architecture Overview

### 1. `functions/` - Backend (Firebase Cloud Functions)

The **brains** of the system. Connects ElevenLabs voice agents to Google Cloud services (Firestore and Vertex AI NLU), exposing HTTP endpoints for:

- **Post-call webhook processing**: Receives transcripts from ElevenLabs, analyzes them with Vertex AI (Gemini), and stores structured intents in Firestore
- **Real-time recommendations**: Provides product recommendations based on customer intents

**Key endpoints:**
- `POST /postCallWebhook` - Processes voice transcripts, runs NLU analysis, writes to Firestore `intents` collection
- `POST /realTimeRecommendation` - Returns product recommendations based on customer intent

**Tech stack:**
- TypeScript
- Firebase Functions (Gen 2)
- Vertex AI (Gemini 2.5 Flash) for NLU
- Firestore for data persistence

**Deployment:**
```bash
cd functions
npm install
npm run build
npm run deploy
```

**Local development:**
```bash
cd functions
npm run serve  # Starts Firebase emulators
```

### 2. `dashboard/` - Analytics Dashboard (Next.js)

Internal analytics dashboard for merchants to visualize:
- Customer intent patterns and demand signals
- Unmet needs and sentiment analysis
- Product recommendation performance
- Call insights and agent performance

**Tech stack:**
- Next.js (App Router)
- TypeScript
- Reads from Firestore `intents` collection

**Status:** Folder structure scaffolded, ready for implementation

### 3. `demo-store/` - Sneaker Demo Store (Next.js)

Public-facing demo storefront showcasing:
- Product catalog (sneakers)
- ElevenLabs voice assistant widget integration
- Real-time product recommendations powered by the backend

**Tech stack:**
- Next.js (App Router)
- TypeScript
- ElevenLabs voice widget
- Integrates with `functions/` endpoints

**Status:** Folder structure scaffolded, ready for implementation

## Data Flow

```
ElevenLabs Voice Agent
    ↓ (POST transcript)
functions/postCallWebhook
    ↓ (analyze with Vertex AI)
Firestore (intents collection)
    ↓ (read data)
dashboard/ (visualize insights)
```

## How They Connect

1. **ElevenLabs → Functions**: Voice conversations are sent as POST requests to `postCallWebhook` endpoint
2. **Functions → Firestore**: NLU-processed intents are stored in the `intents` collection with schema:
   - `store_id`
   - `raw_intent` (original transcript)
   - `nlu` (structured analysis: intent_type, normalized_intent, product_mentions, sentiment, confidence)
   - `source: "voice"`
   - `timestamp`
3. **Dashboard → Firestore**: Reads from `intents` collection to display analytics
4. **Demo Store → Functions**: Calls `realTimeRecommendation` endpoint for product suggestions

## Getting Started

### Prerequisites
- Node.js 24+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project (`inzwa-hackathon`)
- Google Cloud project with Vertex AI API enabled

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone git@github.com:VictorKevz/inzwa.git
   cd inzwa
   ```

2. **Set up backend:**
   ```bash
   cd functions
   npm install
   # Configure .env if needed for local Vertex AI auth
   npm run build
   npm run deploy
   ```

3. **Set up dashboard (when ready):**
   ```bash
   cd dashboard
   npm install
   npm run dev
   ```

4. **Set up demo store (when ready):**
   ```bash
   cd demo-store
   npm install
   npm run dev
   ```

## Environment Variables

### `functions/.env`
- `GOOGLE_APPLICATION_CREDENTIALS` (optional, for local dev only)
- Other Vertex AI / Firebase config as needed

## Deployment URLs

After deploying functions, you'll get:
- `https://postcallwebhook-ctmigyxh3q-uc.a.run.app` - Post-call webhook endpoint
- `https://realtimerecommendation-ctmigyxh3q-uc.a.run.app` - Real-time recommendations endpoint

Use these URLs in ElevenLabs webhook configuration.

## License

Private project
