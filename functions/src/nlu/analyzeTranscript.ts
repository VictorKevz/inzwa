import { VertexAI } from "@google-cloud/vertexai";

// Get project ID from environment variable, fallback to default for backward compatibility
const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "inzwa-hackathon";

const vertexAI = new VertexAI({
  project: projectId,
  location: "us-central1",
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

import { TranscriptAnalysis } from "../types/intent.types";

export type { TranscriptAnalysis };

/**
 * Analyzes customer utterances and extracts structured intent using Vertex AI.
 */
export async function analyzeTranscript(
  rawText: string
): Promise<TranscriptAnalysis> {
  const prompt = `
You are an intent classification engine for e-commerce voice assistants.

Analyze the FULL conversation transcript and return STRICT JSON with these exact fields:
- intentType: one of ["browse", "compare", "buy"]
  * "browse" = exploratory, early stage, just looking (e.g., "show me shoes", "what do you have")
  * "compare" = evaluating options, considering purchase (e.g., "which is better", "what's the difference between X and Y")
  * "buy" = ready to purchase, high purchase intent, OR when customer specifies requirements like size, color, or asks about availability (e.g., "I want to buy", "I need size 42", "do you have X in stock", "what size do you have")
- normalizedIntent: a clear, concise description of what the customer is looking for. Include product type, key requirements (size, color), and outcome. Examples: "looking for basketball shoes in size 42", "browsing red sneakers", "comparing shoe options". NEVER leave this empty - always provide a meaningful description.
- category: product category mentioned by the customer. Extract the SPECIFIC category (e.g., "Basketball Shoes", "Running Shoes", "Sneakers", "Shoes", "Clothing"). If customer mentions "basketball shoes", return "Basketball Shoes" not just "Shoes". Return null ONLY if absolutely no category is mentioned.
- productMentions: array of specific product names or models mentioned by customer (empty array if none, but include product types like "basketball shoes" if mentioned)
- sentiment: one of ["positive", "neutral", "negative"] - consider the overall tone and final outcome
- confidence: number 0-1 indicating confidence in the classification

CRITICAL RULES:
- Read the ENTIRE conversation to understand context - don't just look at the first message
- If customer mentions specific requirements (size, color, product type), the intentType should be "buy" not "browse"
- normalizedIntent MUST be a meaningful description - never return an empty string
- category should be the SPECIFIC category mentioned (e.g., "Basketball Shoes" not "Shoes" if they said "basketball shoes")
- If customer expresses disappointment or rejection at the end, sentiment should be "negative"

Full conversation transcript:
"${rawText}"

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

    const parsed = JSON.parse(cleanText);

    // Validate and normalize
    const intentType = parsed.intentType;
    if (!["browse", "compare", "buy"].includes(intentType)) {
      console.warn(`Invalid intentType: ${intentType}, defaulting to "browse"`);
    }

    return {
      intentType: ["browse", "compare", "buy"].includes(intentType)
        ? intentType
        : "browse",
      normalizedIntent: parsed.normalizedIntent || "",
      category: parsed.category || null,
      productMentions: Array.isArray(parsed.productMentions)
        ? parsed.productMentions
        : [],
      sentiment: ["positive", "neutral", "negative"].includes(parsed.sentiment)
        ? parsed.sentiment
        : "neutral",
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
    };
  } catch (err) {
    console.error("Vertex AI NLU error:", err);
    // Return safe defaults on error
    return {
      intentType: "browse",
      normalizedIntent: "",
      category: null,
      productMentions: [],
      sentiment: "neutral",
      confidence: 0,
    };
  }
}
