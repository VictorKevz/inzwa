import { VertexAI } from "@google-cloud/vertexai";
import * as admin from "firebase-admin";
import {
  MerchantMetadata,
  CallAnalysis,
} from "../types/intent.types";

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

Analyze this conversation and return STRICT JSON with these exact fields:

- intentType: Use e-commerce data science classification:
  * "browse": Discovery phase; no specific requirements mentioned (e.g., "show me shoes", "what do you have")
  * "compare": Consideration phase; user specifies attributes (size, price, color) or asks about availability (e.g., "do you have size 42?", "what colors are available?", "cheapest option?")
  * "buy": Decision phase; user expresses intent to purchase or "takes" a recommendation (e.g., "I'll take it", "yes", "I want to buy", "that sounds good")
- normalizedIntent: Complete sentence describing what customer wanted. Include product type, requirements, and outcome. NEVER empty.
- category: Exact product category mentioned. Capitalize properly. null if not mentioned.
- productMentions: Array of product names customer mentioned. Empty array if none.
- sentiment: "positive", "neutral", or "negative"
- price_min: Minimum price mentioned (number) or null
- price_max: Maximum price mentioned (number) or null
- variantAttributes: Object with ANY product attributes customer mentioned. Use lowercase keys. null if none mentioned.
- recommendationShown: Array of product names agent recommended. Empty array if none.
- accepted: true (accepted), false (rejected), or null (unclear)
- rejectionReason: "variant_missing", "out_of_stock", "price_too_high", "product_not_found", "feature_missing", "other", or null
- confidence: 0-1 score
- reasoning: Brief explanation of your analysis (1-2 sentences)

CRITICAL RULES:
1. Extract what customer WANTS, not what's available. If customer asks about attributes/variants and agent says unavailable, extract the customer's desired attributes.
2. Extract any price mentioned when customer discusses pricing, budget, or cost (e.g., cheapest, most expensive, price range, budget constraints).
3. If customer rejects after being told a specific requirement/attribute is unavailable, accepted=false, rejectionReason="variant_missing".
4. If customer explicitly declines or rejects in any form (e.g., "no", "not interested", "bye", "no thanks"), accepted=false.
5. normalizedIntent MUST be complete sentence, never empty.
6. Extract attributes generically for any product type.

Available products: ${productNames || "None"}

Conversation transcript:
${conversationText}

Return ONLY valid JSON.`;
}

export async function analyzeCall(
  structuredTranscript: Array<{ agent?: string; user?: string }>,
  merchantId: string,
  merchantMetadata: MerchantMetadata | null
): Promise<CallAnalysis> {
  const conversationText = formatConversationText(structuredTranscript);

  if (!conversationText) {
    return {
      intentType: "browse",
      normalizedIntent: "",
      category: null,
      productMentions: [],
      sentiment: "neutral",
      price_min: null,
      price_max: null,
      variantAttributes: null,
      recommendationShown: [],
      accepted: null,
      rejectionReason: null,
      confidence: 0,
      reasoning: null,
      rawResponse: null,
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
        temperature: 1.0,
        maxOutputTokens: 2000,
      },
    });

    const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Vertex AI");
    }

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd));

    const intentType = ["browse", "compare", "buy"].includes(parsed.intentType)
      ? parsed.intentType
      : "browse";

    const sentiment = ["positive", "neutral", "negative"].includes(
      parsed.sentiment
    )
      ? parsed.sentiment
      : "neutral";

    let variantAttributes: { [key: string]: string } | null = null;
    if (
      parsed.variantAttributes &&
      typeof parsed.variantAttributes === "object"
    ) {
      const attrs: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(parsed.variantAttributes)) {
        if (typeof value === "string" && value.trim()) {
          attrs[key] = value.trim();
        }
      }
      variantAttributes = Object.keys(attrs).length > 0 ? attrs : null;
    }

    return {
      intentType,
      normalizedIntent: parsed.normalizedIntent || "",
      category: parsed.category || null,
      productMentions: Array.isArray(parsed.productMentions)
        ? parsed.productMentions
        : [],
      sentiment,
      price_min:
        parsed.price_min !== null && parsed.price_min !== undefined
          ? Number(parsed.price_min)
          : null,
      price_max:
        parsed.price_max !== null && parsed.price_max !== undefined
          ? Number(parsed.price_max)
          : null,
      variantAttributes,
      recommendationShown: Array.isArray(parsed.recommendationShown)
        ? mapProductNamesToIds(parsed.recommendationShown, productMap)
        : [],
      accepted:
        parsed.accepted === true
          ? true
          : parsed.accepted === false
          ? false
          : null,
      rejectionReason:
        parsed.accepted === false && parsed.rejectionReason
          ? parsed.rejectionReason
          : null,
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
      reasoning: parsed.reasoning || null,
      rawResponse: text.substring(0, 2000),
    };
  } catch (err) {
    console.error("[analyzeCall] Error:", err);
    return {
      intentType: "browse",
      normalizedIntent: "",
      category: null,
      productMentions: [],
      sentiment: "neutral",
      price_min: null,
      price_max: null,
      variantAttributes: null,
      recommendationShown: [],
      accepted: null,
      rejectionReason: null,
      confidence: 0,
      reasoning: null,
      rawResponse: null,
    };
  }
}
