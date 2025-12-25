# Inzwa Business

A voice-driven intent intelligence system that turns customer conversations into structured business insights. This monorepo contains four integrated layers: a marketing landing page, Firebase Functions backend, an analytics dashboard, and a demo storefront.

## Monorepo Structure

```
inzwa/
├── marketing/        # Landing / marketing page (Next.js, Vercel entry point)
├── functions/        # Firebase Cloud Functions (backend/brains)
├── dashboard/        # Next.js app for analytics & merchant insights
├── demo-store/       # Next.js sneaker demo with ElevenLabs voice widget
└── README.md         # This file
```

## Architecture Overview

### 0. `marketing/` - Landing Page (Next.js)

**Entry point** for the hackathon demo. Marketing page that explains:
- Problem: Unstructured voice conversation data
- Solution: AI-powered NLU analysis
- Value: Actionable business insights

**Features:**
- Modern, professional design
- Clear CTAs to "View Demo Store" and "View Dashboard" (opens in new tabs)
- Environment variable support for deployment URLs

**Tech stack:**
- Next.js (App Router)
- TypeScript
- Tailwind CSS

**Deployment:**
Deploy to Vercel with root directory set to `marketing/`. Configure `NEXT_PUBLIC_DEMO_STORE_URL` and `NEXT_PUBLIC_DASHBOARD_URL` environment variables.

**Local development:**
```bash
cd marketing
npm install
npm run dev
```

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
   - `merchant_id` (multi-merchant support)
   - `raw_text` (original transcript from ElevenLabs)
   - `intent_type` ("browse" | "compare" | "buy")
   - `normalized_intent` (NLU-normalized for clustering)
   - `category` (product category)
   - `product_mentions[]` (product_ids mentioned)
   - `recommendation_shown[]` (product_ids shown)
   - `accepted` (true | false | null)
   - `rejection_reason` (if rejected: "out_of_stock" | "variant_missing" | "price_too_high" | "product_not_found" | "feature_missing")
   - `sentiment` ("positive" | "neutral" | "negative")
   - `confidence` (0-1 NLU score)
   - `price_expectation` (customer's stated price)
   - `estimated_revenue` (potential revenue if fulfilled)
   - `variant_attributes` (size, color, etc. if specified)
   - `source: "voice"`
   - `timestamp`
   
   **Aggregates** are computed via Cloud Functions (scheduled triggers) for fast dashboard queries:
   - `DailyAggregate` - Executive overview metrics
   - `WeeklyAggregate` - Trending intents with growth rates
   - `CategoryAggregate` - Category-level demand analysis
   - `ProductAggregate` - Product-level acceptance rates
   
   See `functions/DATABASE_SCHEMA_EXAMPLE.md` for complete schema.
3. **Dashboard → Firestore**: Reads from `intents` collection and pre-computed `aggregates` collection to display analytics (see `functions/DASHBOARD_PLAN.md` for dashboard views)
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

3. **Set up marketing site (entry point):**
   ```bash
   cd marketing
   npm install
   npm run dev
   ```

4. **Set up dashboard (when ready):**
   ```bash
   cd dashboard
   npm install
   npm run dev
   ```

5. **Set up demo store (when ready):**
   ```bash
   cd demo-store
   npm install
   npm run dev
   ```

## Environment Variables

### `functions/.env`
- `GOOGLE_APPLICATION_CREDENTIALS` (optional, for local dev only) - Path to service account JSON file
- `GCP_PROJECT_ID` or `FIREBASE_PROJECT_ID` (optional) - Google Cloud project ID (defaults to "inzwa-hackathon")
- `ELEVENLABS_WEBHOOK_SECRET` (recommended for production) - Secret key for validating ElevenLabs webhook signatures
- `RECOMMENDATION_API_KEY` (recommended for production) - API key for authenticating recommendation endpoint requests
- `ALLOWED_CORS_ORIGINS` (optional) - Comma-separated list of allowed CORS origins (defaults to ElevenLabs domains and localhost)
- Other Vertex AI / Firebase config as needed

### `marketing/.env.local`
- `NEXT_PUBLIC_DEMO_STORE_URL` - Vercel URL for demo-store deployment
- `NEXT_PUBLIC_DASHBOARD_URL` - Vercel URL for dashboard deployment

## Deployment URLs

After deploying functions, you'll get deployment URLs from the Firebase CLI output. Use these URLs in your ElevenLabs webhook configuration.

**Security Features:**
- **Webhook Signature Validation**: The `postCallWebhook` endpoint validates ElevenLabs webhook signatures when `ELEVENLABS_WEBHOOK_SECRET` is configured. Invalid signatures are rejected with 401 Unauthorized.
- **API Key Authentication**: The `realTimeRecommendation` endpoint requires an API key when `RECOMMENDATION_API_KEY` is set. Send the key in the `X-API-Key` header.
- **CORS Protection**: Both endpoints restrict CORS to whitelisted origins. Configure via `ALLOWED_CORS_ORIGINS` environment variable.
- **Error Handling**: Production error messages are sanitized to prevent information leakage. Detailed errors are only shown in development mode.

**Security Note:** For production deployments, always configure `ELEVENLABS_WEBHOOK_SECRET` and `RECOMMENDATION_API_KEY`. Consider implementing additional rate limiting for high-traffic scenarios.

## License

Private project
