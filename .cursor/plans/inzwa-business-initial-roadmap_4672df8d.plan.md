---
name: inzwa-business-initial-roadmap
overview: High-level, sequential tasks to get inzwa-business deployed, align the backend data model with the dashboard needs, and then build out the first slice of the dashboard.
todos:
  - id: git-github-setup
    content: Initialize git (if needed), create/connect GitHub repo, push current inzwa-business code, and add a short root README linking to the roadmap docs.
    status: pending
  - id: intent-schema-types
    content: Define or update the IntentEvent type in functions/src/types/intent.types.ts and align analyzeTranscript to return those fields.
    status: pending
    dependencies:
      - git-github-setup
  - id: postcall-firestore-writes
    content: Update /postCallWebhook to write full IntentEvent-shaped documents to the intents collection and test locally.
    status: pending
    dependencies:
      - intent-schema-types
  - id: seed-firestore-data
    content: Seed Firestore with one demo store and a small products catalog matching the roadmap.
    status: pending
    dependencies:
      - postcall-firestore-writes
  - id: deploy-functions
    content: Deploy Firebase Functions (postCallWebhook and realTimeRecommendations) and record the URLs.
    status: pending
    dependencies:
      - seed-firestore-data
  - id: elevenlabs-webhook-contract
    content: Define the ElevenLabs post-call webhook JSON contract, configure it in ElevenLabs, and verify documents are created correctly in Firestore.
    status: pending
    dependencies:
      - deploy-functions
  - id: dashboard-tab1
    content: Build the dashboard v0 with only the Executive Overview tab backed by Firestore queries.
    status: pending
    dependencies:
      - elevenlabs-webhook-contract
  - id: future-tabs-nlu
    content: Iterate on remaining dashboard tabs and NLU quality once v0 is stable.
    status: pending
    dependencies:
      - dashboard-tab1
---

# Inzwa Business – Focused Initial Plan

## Overview

This plan gives you a **short, ordered task list** so you can work on one thing at a time while keeping the dashboard data needs in mind.

---

## 1. Repo & GitHub Hygiene (Do this first)

- **Goal:** Have a clean, versioned starting point for everything else.
- **Tasks:**
- Initialize git in the project root if not already done.
- Create a new GitHub repo (e.g. `inzwa-business`) and add it as `origin`.
- Commit the current codebase (Firebase functions, docs, etc.) with a clear message.
- Push `main` (or `master`) to GitHub.
- In a short root `README.md`, describe:
  - What Inzwa Business is (1–2 sentences).
  - High-level architecture (ElevenLabs → Firebase Functions → Firestore → Dashboard).
  - Links to [`ARCHITECTURE_AND_PRODUCT_ROADMAP.md`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/ARCHITECTURE_AND_PRODUCT_ROADMAP.md) and [`DASHBOARD_PLAN.md`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/DASHBOARD_PLAN.md).

---

## 2. Lock in the Intent Event Schema (Backend Types Only)

- **Goal:** Make sure all code thinks in terms of the **dashboard-driven schema**, even before you change Firestore writes.
- **Tasks:**
- Open [`functions/src/types/intent.types.ts`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/src/types/intent.types.ts).
- Define / update an `IntentEvent` interface that matches the plan in `DASHBOARD_PLAN.md`:
  - `session_id, store_id, raw_text, intent_type, normalized_intent, product_mentions[], recommendation_shown[], accepted, rejection_reason?, sentiment, confidence, timestamp`.
- Ensure `analyzeTranscript` in [`functions/src/nlu/analyzeTranscript.ts`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/src/nlu/analyzeTranscript.ts) returns an object compatible with the `IntentEvent` fields (some can be placeholders/null for now).

---

## 3. Align `/postCallWebhook` Writes with the Schema

- **Goal:** Every Firestore `intents` document looks like an `IntentEvent`, so the dashboard can query cleanly.
- **Tasks:**
- In [`functions/src/api/postCallWebhook.ts`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/src/api/postCallWebhook.ts), update the Firestore write from a loose `{ raw_intent, nlu }` object to a structured `IntentEvent`:
  - Add `session_id` (for now, accept from the request body; later you’ll wire ElevenLabs’ conversation ID).
  - Map `entry` → `raw_text`.
  - Spread fields from `nluResult` into `normalized_intent`, `intent_type`, `product_mentions`, `sentiment`, `confidence`, etc.
  - Include `recommendation_shown`, `accepted`, `rejection_reason` even if they are `null` or empty arrays initially.
- Keep the existing Firestore try/catch so local testing doesn’t break if the emulator isn’t running.
- Manually test the function locally (e.g., via `curl` or Postman) with a simple JSON body and verify the stored documents have the full schema.

---

## 4. Seed `stores` and `products` Collections (Mock Data)

- **Goal:** Have enough data to power basic recommendations and dashboard filters.
- **Tasks:**
- In Firestore, create a single **demo store** document in `stores`:
  - Fields like `store_id`, `name`, `industry`, `widget_config`.
- Create a small `products` collection for that store:
  - Include `store_id`, `product_id`, `name`, `attributes` (e.g. color, size, category), `price`, `url`.
- Make sure `realTimeRecommendations` (in [`functions/src/api/realTimeRecommendations.ts`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/src/api/realTimeRecommendations.ts)) reads from these collections or at least aligns with this data model.

---

## 5. Deploy Firebase Functions

- **Goal:** Have stable URLs for ElevenLabs and for manual testing.
- **Tasks:**
- Ensure `firebase.json` and [`functions/package.json`](/Users/victorkevz/Desktop/WEB/Full-stack/inzwa-business/functions/package.json) are correctly configured.
- From the project root, deploy functions to your Firebase project (`postCallWebhook` and `realTimeRecommendations`).
- Note down the deployed HTTPS URLs for both functions.
- Commit and push these deployment-related changes and configs to GitHub.

---

## 6. Define and Implement the ElevenLabs Webhook Contract

- **Goal:** ElevenLabs sends exactly the data your backend expects (and your dashboard will use).
- **Tasks:**
- Decide on a clear JSON shape for the post-call webhook body, e.g.:
  - `store_id` (string), `session_id` (string), `transcript` (array of strings or `{speaker, text, timestamp}` objects).
- Update `/postCallWebhook` to validate this shape explicitly.
- In the ElevenLabs agent configuration, set the **post-call webhook** URL to your deployed `postCallWebhook` and map its variables to your expected fields.
- Run 1–2 test conversations and confirm `intents` documents are created correctly, with all key fields populated.

---

## 7. Build Dashboard v0 – Executive Overview Only

- **Goal:** Ship a minimal but real dashboard that proves the data model works.
- **Tasks:**
- Create a dashboard frontend (e.g. Next.js app) inside this repo or a sibling app folder, using Firebase Web SDK to read Firestore.
- Implement just **Tab 1: Executive Overview** from `DASHBOARD_PLAN.md`:
  - Metrics: total voice sessions, % sessions with recommendations, % sessions satisfied, % unmet demand.
  - Visuals: Top 5 normalized intents (bar chart), sentiment split (pie/stacked bar).
- Back each widget with actual Firestore queries over your `intents` collection.
- Commit and push the dashboard code and document how to run it in the root `README.md`.

---

## 8. Iterate Tabs and NLU Quality (Future Work)

- **Goal:** Gradually get to the full vision without overwhelming yourself now.
- **Tasks (Do later, in order):**
- Tab 2 – Demand & Intent Analysis (time series and filters over `normalized_intent`, `sentiment`, `confidence`).
- Tab 3 – Unmet Demand (sessions where recommendations were shown but not accepted, grouped by `normalized_intent`).
- Tab 4 – Recommendation Performance (you may introduce a new collection or extend events to link `product_id` to `accepted`).
- Tab 5 – Conversation Quality (requires richer, turn-level data; may lead to a separate `sessions` or `turns` collection).

Start with **Section 1** and move down the list; each section is small enough to focus on without mixing too many concerns at once.