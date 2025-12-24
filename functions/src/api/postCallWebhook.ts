import { analyzeCall, fetchMerchantMetadata } from "../nlu/analyzeCall";
import {
  calculatePriceExpectation,
  calculateEstimatedRevenue,
} from "../utils/revenueCalculation";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { ElevenLabsWebhookPayload } from "../types/intent.types";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function validateWebhookSignature(
  signature: string | undefined,
  timestamp: string | undefined,
  body: string,
  secret: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const headers = signature.split(",");
  const sigTimestamp = headers.find((e) => e.startsWith("t="))?.substring(2);
  const sigHash = headers.find((e) => e.startsWith("v0="));

  if (!sigTimestamp || !sigHash || sigTimestamp !== timestamp) {
    return false;
  }

  const reqTimestamp = parseInt(sigTimestamp, 10) * 1000;
  const tolerance = Date.now() - 30 * 60 * 1000;
  if (reqTimestamp < tolerance) {
    return false;
  }
  const message = `${sigTimestamp}.${body}`;
  const digest =
    "v0=" + crypto.createHmac("sha256", secret).update(message).digest("hex");

  return sigHash === digest;
}

/**
 * Receives post-call transcription webhooks from ElevenLabs,
 * analyzes user utterances with Vertex AI, and stores structured intents in Firestore.
 */
exports.postCallWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, ElevenLabs-Signature, x-elevenlabs-timestamp"
      );
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
      const signature =
        req.headers["elevenlabs-signature"] ||
        req.headers["ElevenLabs-Signature"];
      const timestamp = req.headers["x-elevenlabs-timestamp"];

      if (webhookSecret && signature && timestamp) {
        const rawBody =
          (req as any).rawBody?.toString() || JSON.stringify(req.body);
        const isValid = validateWebhookSignature(
          signature,
          timestamp,
          rawBody,
          webhookSecret
        );
        if (!isValid) {
          console.warn("[postCallWebhook] Invalid webhook signature");
        }
      }

      const payload: ElevenLabsWebhookPayload = req.body;

      if (!payload || !payload.type) {
        return res.status(400).json({
          error: "Invalid payload",
          message: "Payload must include a 'type' field",
        });
      }

      if (payload.type !== "post_call_transcription") {
        return res.status(200).json({
          message: "Webhook received, not processed",
          type: payload.type,
        });
      }

      const { data } = payload;
      const { conversation_id, agent_id, transcript, metadata } = data;

      // Get merchantId from metadata or use default for demo
      const merchantId =
        metadata?.merchantId || metadata?.merchant_id || "merchant_001";

      if (
        !transcript ||
        !Array.isArray(transcript) ||
        transcript.length === 0
      ) {
        return res.status(400).json({
          error: "Empty or invalid transcript",
        });
      }

      const structuredTranscript: Array<{ agent?: string; user?: string }> = [];
      const userUtterances: string[] = [];

      for (const entry of transcript) {
        if (entry.role === "user" && entry.message?.trim()) {
          const userText = entry.message.trim();
          userUtterances.push(userText);
          structuredTranscript.push({ user: userText });
        } else if (entry.role === "agent" && entry.message?.trim()) {
          structuredTranscript.push({ agent: entry.message.trim() });
        }
      }

      if (userUtterances.length === 0) {
        return res.status(200).json({
          message: "No user utterances to process",
          conversationId: conversation_id,
          intentsProcessed: 0,
        });
      }

      const fullConversationText = userUtterances.join(". ");

      const merchantMetadata = await fetchMerchantMetadata(merchantId);
      const analysis = await analyzeCall(
        structuredTranscript,
        merchantId,
        merchantMetadata
      );

      const existingIntentQuery = await db
        .collection("merchants")
        .doc(merchantId)
        .collection("intents")
        .where("conversationId", "==", conversation_id)
        .limit(1)
        .get();

      if (!existingIntentQuery.empty) {
        return res.status(200).json({
          message: "Intent already processed for this conversation",
          conversationId: conversation_id,
          intentsProcessed: 1,
        });
      }

      // Calculate derived fields using helper functions
      const priceExpectation = calculatePriceExpectation(
        analysis.price_min,
        analysis.price_max
      );

      const estimatedRevenue = calculateEstimatedRevenue(
        priceExpectation,
        analysis.intentType,
        analysis.confidence
      );

      // Build intent event from unified analysis
      const intentEvent = {
        sessionId: conversation_id,
        merchantId: merchantId,
        rawText: fullConversationText,
        transcript: structuredTranscript,
        intentType: analysis.intentType,
        normalizedIntent: analysis.normalizedIntent,
        category: analysis.category,
        productMentions: analysis.productMentions,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        recommendationShown: analysis.recommendationShown,
        accepted: analysis.accepted,
        rejectionReason: analysis.rejectionReason,
        priceExpectation: priceExpectation,
        estimatedRevenue: estimatedRevenue,
        variantAttributes: analysis.variantAttributes,
        reasoning: analysis.reasoning,
        rawResponse: analysis.rawResponse,
        agentId: agent_id,
        conversationId: conversation_id,
        source: "voice",
        timestamp: FieldValue.serverTimestamp(),
      };

      const docRef = await db
        .collection("merchants")
        .doc(merchantId)
        .collection("intents")
        .add(intentEvent);

      res.status(200).json({
        message: "Transcript processed successfully",
        conversationId: conversation_id,
        intentsProcessed: 1,
        intentId: docRef.id,
      });
    } catch (err) {
      console.error("[postCallWebhook] Error:", err);
      res.status(200).json({
        error: "Processing failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
);
