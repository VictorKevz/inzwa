import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: "inzwa-hackathon",
  location: "us-central1",
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

import { ExtractedProductIntent } from "../types/intent.types";

export type { ExtractedProductIntent };

/**
 * Extracts structured product intent from raw customer utterance using Vertex AI.
 * This is the first step in the recommendation pipeline - we must understand intent
 * before querying products.
 */
export async function extractProductIntent(
  rawIntent: string
): Promise<ExtractedProductIntent> {
  const prompt = `
You are a product intent extraction engine for e-commerce recommendations.

Analyze the FULL conversation transcript and extract structured product requirements.
Return STRICT JSON with the following fields:
- category: EXACT product category as mentioned by the customer (preserve full category name, e.g., "Basketball Shoes", "Running Shoes", "Shoes", "Clothing") or null if not mentioned
- price_min: minimum price mentioned in the same currency context, or null if not mentioned
- price_max: maximum price mentioned in the same currency context, or null if not mentioned
- size: size mentioned ANYWHERE in the conversation (e.g., "42", "44", "M", "L", "10") or null if not mentioned. Extract the size the customer is INTERESTED IN, even if they ask about it. If customer says "size 42", "on size 42", "any size 42", extract "42". Extract the numeric or alphanumeric size value exactly as mentioned.
- color: color mentioned ANYWHERE in the conversation (e.g., "red", "electric red", "blue", "black") or null if not mentioned. Extract colors the customer asks about or shows interest in.
- confidence: number 0-1 indicating how confident you are in the extraction

CRITICAL RULES:
- Read the ENTIRE conversation - information may be spread across multiple messages
- Preserve the FULL category name exactly as the customer mentions it (e.g., "basketball shoes" → "Basketball Shoes", NOT "Shoes")
- Do NOT normalize specific categories to generic ones (e.g., "running shoes" → "Running Shoes", NOT "Shoes")
- Only use generic single-word categories like "Shoes" or "Clothing" if the customer uses generic terms
- For price fields: ONLY extract if the customer EXPLICITLY mentions a price or price range (e.g., "under 50", "around 100", "between 30 and 100")
- DO NOT infer or guess prices - if no price is mentioned, use null
- If price is mentioned without min/max, set both price_min and price_max to the same value
- Extract size exactly as mentioned (preserve format like "42", "44", "M", "10") - if customer says "size 42", "on size 42", "any size 42", "do you have size 42?", extract "42". Look for patterns like "size X", "size X?", "on size X", "any size X" where X is the size value.
- Extract color as mentioned (e.g., "red", "electric red", "blue") - if customer asks "what color do you have?", extract the color they're interested in from context
- If customer asks about a specific size/color, that IS their requirement - extract it
- Be thorough: scan the ENTIRE conversation for size mentions, even if they appear in questions or frustrated statements
- If nothing is mentioned for a field, use null (not empty string)

Full conversation transcript:
"${rawIntent}"

Return ONLY valid JSON, no additional text.
`;

  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 500 },
    });

    const text = response?.response?.candidates?.[0]?.content?.parts[0]?.text;
    if (!text) throw new Error("Empty response from Vertex AI");

    // Extract JSON from response
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const cleanText = text.slice(jsonStart, jsonEnd);

    const extracted = JSON.parse(cleanText);

    // Validate and normalize the response
    return {
      category: extracted.category || null,
      price_min:
        extracted.price_min !== null && extracted.price_min !== undefined
          ? Number(extracted.price_min)
          : null,
      price_max:
        extracted.price_max !== null && extracted.price_max !== undefined
          ? Number(extracted.price_max)
          : null,
      size: extracted.size || null,
      color: extracted.color || null,
      confidence: Math.max(0, Math.min(1, extracted.confidence || 0)),
      raw_intent: rawIntent,
    };
  } catch (err) {
    console.error("Vertex AI intent extraction error:", err);
    // Return empty intent on error - this will result in broader search
    return {
      category: null,
      price_min: null,
      price_max: null,
      size: null,
      color: null,
      confidence: 0,
      raw_intent: rawIntent,
    };
  }
}
