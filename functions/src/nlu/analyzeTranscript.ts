import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: "inzwa-hackathon", // Hardcoded project ID (GCLOUD_PROJECT is reserved by Firebase)
  location: "us-central1",
});

const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function analyzeTranscript(rawText: string) {
  const prompt = `
You are an intent classification engine for e-commerce voice assistants.

Analyze the user utterance and return STRICT JSON:
- intent_type: one of ["initial_intent","preference","decision","other"]
- normalized_intent: cleaned description of user intent
- product_mentions: array of product names
- sentiment: one of ["positive","neutral","negative"]
- confidence: number 0-1

User utterance:
"${rawText}"

Return ONLY valid JSON.
`;

  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    });

    const text = response?.response?.candidates?.[0]?.content?.parts[0]?.text;
    if (!text) throw new Error("Empty response from Vertex AI");

    // remove extra whitespace or stray characters
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const cleanText = text.slice(jsonStart, jsonEnd);

    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Vertex AI NLU error:", err);
    return {
      intent_type: "other",
      normalized_intent: "",
      product_mentions: [],
      sentiment: "neutral",
      confidence: 0,
    };
  }
}
