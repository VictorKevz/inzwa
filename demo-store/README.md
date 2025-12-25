# Inzwa Demo Store

A modern e-commerce demo storefront showcasing voice-driven shopping with ElevenLabs integration.

## Features

- **Product Catalog**: Browse products by category (Casual, Basketball, Running shoes)
- **Product Details**: Full product pages with variant selection
- **Voice Recommendations**: Real-time product recommendations during voice conversations
- **Firestore Integration**: All product data fetched from Firestore
- **Modular Architecture**: Contexts, hooks, and reusable components

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase Authentication:

Create a `.env.local` file with your Google Cloud service account credentials:

```bash
# Create .env.local with your credentials path
echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json" > .env.local
```

**Note:** The demo-store uses the same service account key as functions. Make sure the path points to a valid service account JSON file with Firestore access.

Next.js automatically loads `.env.local` on startup, so authentication will be ready after you create this file.

3. Run development server:
```bash

npm run dev
```

## Structure

- `app/` - Next.js App Router pages
- `components/` - Reusable React components
- `contexts/` - React contexts for state management
- `lib/` - Utilities, API clients, Firebase config
- `types/` - TypeScript type definitions

## Integration Points

- **Firestore**: Products fetched from `merchants/merchant_001/products`
- **ElevenLabs**: Voice widget will be embedded (script to be provided)
- **Backend Functions**: Recommendations via `realTimeRecommendation` endpoint


