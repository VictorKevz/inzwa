import { VertexAI } from "@google-cloud/vertexai";
import * as admin from "firebase-admin";
import { MerchantMetadata, CallAnalysis, Intent } from "../types/intent.types";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const vertexAI = new VertexAI({
  project: "inzwa-hackathon",
  location: "us-central1",
});

function getModel() {
  return vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function fetchMerchantMetadata(
  merchantId: string
): Promise<MerchantMetadata | null> {
  try {
    const merchantDoc = await db.collection("merchants").doc(merchantId).get();
    if (!merchantDoc.exists) return null;

    const data = merchantDoc.data();
    return {
      merchantId,
      name: data?.name || "",
      industry: data?.industry || "",
      currency: data?.currency || "USD",
      locale: data?.locale || "en",
    };
  } catch {
    return null;
  }
}

export async function buildProductCatalogContext(
  merchantId: string
): Promise<{ productNames: string; productMap: Map<string, string> }> {
  const productsSnapshot = await db
    .collection("merchants")
    .doc(merchantId)
    .collection("products")
    .get();

  const productMap = new Map<string, string>();
  productsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.name && data.productId) {
      productMap.set(data.name.toLowerCase(), data.productId);
    }
  });

  return { productNames: Array.from(productMap.keys()).join(", "), productMap };
}

export function formatConversationText(
  structuredTranscript: Array<{ agent?: string; user?: string }>
): string {
  return structuredTranscript
    .map((entry) =>
      entry.agent
        ? `agent: ${entry.agent}`
        : entry.user
        ? `user: ${entry.user}`
        : ""
    )
    .filter((line) => line.length > 0)
    .join("\n");
}

function mapProductNamesToIds(
  productNames: string[],
  productMap: Map<string, string>
): string[] {
  return productNames
    .map((name: string) => productMap.get(name.toLowerCase()) || null)
    .filter((id: string | null): id is string => id !== null);
}

function buildPrompt(
  industryContext: string,
  productNames: string,
  conversationText: string
): string {
  return `You are an expert e-commerce conversation analyst. ${industryContext}

CRITICAL FORMATTING REQUIREMENT: You MUST return ONLY raw JSON. DO NOT use markdown code blocks. DO NOT add any text before or after the JSON. DO NOT explain anything. Start directly with { and end with }. This is a programmatic API call - your response will be parsed as JSON directly.

Extract intents anchored to specific products or categories. Intent boundaries are determined by product mentions with purchase-related semantics, not session timeline.

Return STRICT JSON with this structure:
{
  "intents": [
    {
      "productName": "product name from conversation or null",
      "category": "Category name or null",
      "intentType": "buy" | "compare" | "inquire",
      "outcome": "accepted" | "rejected" | "abandoned" | null,
      "intentStage": "expressed" | "confirmed" | null,
      "rejectionReason": "variant_missing" | "out_of_stock" | "price_too_high" | "product_not_found" | "feature_missing" | "other" | null,
      "confidence": 0-1,
      "variantAttributes": { "attribute_key": "attribute_value" } or null,
      "normalizedIntent": "Complete sentence describing this specific intent"
    }
  ],
  "sentiment": "positive" | "neutral" | "negative",
  "productMentions": ["all product names mentioned"],
  "recommendationShown": ["all products agent recommended"]
}

INTENT EXTRACTION RULES:
1. Create an intent when a product or category is mentioned with purchase-related semantics (request, compare, select, inquire).
2. Each intent is anchored to ONE product or category. Multiple products in one utterance = separate intents.
3. One intent can span multiple conversation turns. Do NOT close intents prematurely.
4. Default outcome to null unless there is certainty. Only set outcome when:
   - "accepted": User explicitly confirms interest (e.g., "I'll take it", "yes, add it", "I want this")
   - "rejected": User explicitly declines OR clear system constraint (product unavailable, variant missing)
   - "abandoned": Conversation ends with no resolution (ONLY set at conversation end, NOT on topic switch)

INTENT TYPES:
- "buy": Purchase intent expressed (e.g., "I'll take it", "ready to add to cart", "I'll do it myself")
- "compare": Evaluating options or asking about attributes/availability
- "inquire": Asking about a product without purchase intent

OUTCOMES (semantics):
- "accepted": Interest confirmed (NOT purchase completed). User explicitly expressed intent to proceed.
- "rejected": Explicit rejection OR clear system constraint (product unavailable, variant missing)
- "abandoned": Conversation ended with no resolution (ONLY set at conversation end)
- null: Intent still active/unresolved. Default when outcome is uncertain.

INTENT STAGE:
- "expressed": Product mentioned with interest (inquire/compare intentType)
- "confirmed": Interest explicitly confirmed (accepted outcome)
- null: Rejected or abandoned (no stage progression)

CRITICAL GUARDRAILS:
1. Do NOT infer abandonment on topic switch. Only set "abandoned" if conversation ends with no resolution.
2. Do NOT infer rejection unless: explicit refusal OR clear system constraint (e.g., "product not found", "size unavailable").
3. Default outcome to null unless there is certainty. Avoid premature closure.
4. Multiple accepted intents per session are valid. No exclusivity or replacement logic.
5. Curiosity after acceptance ≠ rejection. An accepted intent remains accepted.
6. Extract what customer WANTS, not what's available. Focus on desires even if unavailable.
7. variantAttributes: Extract ANY product attributes mentioned (use lowercase keys). Works for any product type, industry, or category.

Available products: ${productNames || "None"}

Conversation transcript:
${conversationText}

FINAL REMINDER: Return ONLY raw JSON starting with { and ending with }. NO markdown, NO code blocks, NO explanations, NO text before or after. Your response must be parseable as JSON.parse() directly.`;
}

export async function analyzeCall(
  structuredTranscript: Array<{ agent?: string; user?: string }>,
  merchantId: string,
  merchantMetadata: MerchantMetadata | null
): Promise<CallAnalysis> {
  const conversationText = formatConversationText(structuredTranscript);

  if (!conversationText) {
    return {
      intents: [],
      sentiment: "neutral",
      productMentions: [],
      recommendationShown: [],
    };
  }

  const { productNames, productMap } = await buildProductCatalogContext(
    merchantId
  );

  const industryContext = merchantMetadata
    ? `Merchant: ${merchantMetadata.name}, Industry: ${merchantMetadata.industry}, Currency: ${merchantMetadata.currency}, Locale: ${merchantMetadata.locale}`
    : `Merchant ID: ${merchantId}`;

  const model = getModel();
  const prompt = buildPrompt(industryContext, productNames, conversationText);

  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000, // Increased to prevent JSON truncation
        responseMimeType: "application/json", // Force JSON output format
      },
    });

    const candidate = response?.response?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Vertex AI");
    }

    let parsed;
    try {
      // First, try to extract JSON by finding the first { and last }
      // This handles markdown code blocks and any text before/after
      let jsonText = text.trim();

      // Remove markdown code blocks if present
      jsonText = jsonText
        .replace(/^```json\s*\n?/i, "")
        .replace(/^```\s*\n?/i, "")
        .replace(/\n?\s*```$/i, "")
        .trim();

      // Find JSON object boundaries
      const jsonStart = jsonText.indexOf("{");
      const jsonEnd = jsonText.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("Could not find JSON object boundaries in response");
      }

      // Extract just the JSON portion
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1);

      // Try parsing
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // If parsing fails, check if it's due to truncation
      const isTruncated =
        text.includes("MAX_TOKENS") ||
        (text.match(/\{/g)?.length || 0) > (text.match(/\}/g)?.length || 0);

      const errorMsg = `Failed to parse JSON: ${
        parseError instanceof Error ? parseError.message : String(parseError)
      }. ${
        isTruncated
          ? "Response appears to be truncated (MAX_TOKENS limit reached)."
          : ""
      } Response text (first 2000 chars): ${text.substring(0, 2000)}`;

      console.error("[analyzeCall] JSON parsing error:", errorMsg);
      throw new Error(errorMsg);
    }

    const sentiment = ["positive", "neutral", "negative"].includes(
      parsed.sentiment
    )
      ? parsed.sentiment
      : "neutral";

    const productMentions = Array.isArray(parsed.productMentions)
      ? parsed.productMentions
      : [];

    const recommendationShown = Array.isArray(parsed.recommendationShown)
      ? mapProductNamesToIds(parsed.recommendationShown, productMap)
      : [];

    const intents: Intent[] = [];
    if (Array.isArray(parsed.intents)) {
      for (const intentData of parsed.intents) {
        const intentType = ["buy", "compare", "inquire"].includes(
          intentData.intentType
        )
          ? intentData.intentType
          : "inquire";

        const outcome = ["accepted", "rejected", "abandoned", null].includes(
          intentData.outcome
        )
          ? intentData.outcome
          : null;

        const intentStage = ["expressed", "confirmed", null].includes(
          intentData.intentStage
        )
          ? intentData.intentStage
          : intentType === "inquire" || intentType === "compare"
          ? "expressed"
          : outcome === "accepted"
          ? "confirmed"
          : null;

        const rejectionReason =
          outcome === "rejected" &&
          [
            "variant_missing",
            "out_of_stock",
            "price_too_high",
            "product_not_found",
            "feature_missing",
            "other",
          ].includes(intentData.rejectionReason)
            ? intentData.rejectionReason
            : null;

        let productId: string | null = null;
        if (intentData.productName) {
          productId =
            productMap.get(intentData.productName.toLowerCase()) || null;
        }

        let variantAttributes: { [key: string]: string } | null = null;
        if (
          intentData.variantAttributes &&
          typeof intentData.variantAttributes === "object"
        ) {
          const attrs: { [key: string]: string } = {};
          for (const [key, value] of Object.entries(
            intentData.variantAttributes
          )) {
            if (typeof value === "string" && value.trim()) {
              attrs[key] = value.trim();
            }
          }
          variantAttributes = Object.keys(attrs).length > 0 ? attrs : null;
        }

        intents.push({
          sessionId: "",
          productId,
          productName: intentData.productName || null,
          category: intentData.category || null,
          intentType,
          outcome,
          intentStage,
          rejectionReason,
          confidence: Math.max(0, Math.min(1, intentData.confidence || 0)),
          estimatedRevenue: null,
          variantAttributes,
          normalizedIntent: intentData.normalizedIntent || "",
          timestamp: null,
        });
      }
    }

    return {
      intents,
      sentiment,
      productMentions,
      recommendationShown,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[analyzeCall] Error: ${errorMessage}`);

    return {
      intents: [],
      sentiment: "neutral",
      productMentions: [],
      recommendationShown: [],
    };
  }
}
