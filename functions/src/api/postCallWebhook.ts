import { analyzeCall, fetchMerchantMetadata } from "../nlu/analyzeCall";
import {
  calculateEstimatedRevenue,
} from "../utils/revenueCalculation";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { ElevenLabsWebhookPayload, Session, Intent } from "../types/intent.types";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

function generateIntentId(
  sessionId: string,
  productName: string | null,
  intentType: string
): string {
  const key = `${sessionId}|${productName || "null"}|${intentType}`;
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 16);
}

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
// Get allowed CORS origins from environment or use default
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((origin) => origin.trim());
  }
  // Default: allow ElevenLabs and common localhost ports for development
  return [
    "https://api.elevenlabs.io",
    "https://elevenlabs.io",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ];
}

exports.postCallWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    const allowedOrigins = getAllowedOrigins();
    const origin = req.headers.origin;

    if (req.method === "OPTIONS") {
      // Only allow CORS from whitelisted origins
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      } else if (allowedOrigins.includes("*")) {
        // Fallback to wildcard only if explicitly configured
        res.set("Access-Control-Allow-Origin", "*");
      }
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

      // Enforce signature validation if secret is configured (production)
      if (webhookSecret) {
        if (!signature || !timestamp) {
          console.warn("[postCallWebhook] Missing webhook signature or timestamp");
          return res.status(401).json({
            error: "Unauthorized",
            message: "Webhook signature required",
          });
        }

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
          return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid webhook signature",
          });
        }
      } else {
        // Allow local development without signature validation
        console.warn("[postCallWebhook] Running without webhook signature validation (local dev mode)");
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

      const sessionRef = db
        .collection("merchants")
        .doc(merchantId)
        .collection("sessions")
        .doc(conversation_id);

      const existingSession = await sessionRef.get();
      let isNewSession = !existingSession.exists;

      if (isNewSession) {
        const session: Session = {
          sessionId: conversation_id,
          merchantId: merchantId,
          agentId: agent_id,
          conversationId: conversation_id,
          source: "voice",
          timestamp: FieldValue.serverTimestamp(),
          transcript: structuredTranscript,
          rawText: fullConversationText,
          sentiment: analysis.sentiment,
          productMentions: analysis.productMentions,
          recommendationShown: analysis.recommendationShown,
        };

        await sessionRef.set(session, { merge: false });
      }

      const intentsWithRevenue: Intent[] = await Promise.all(
        analysis.intents.map(async (intent) => {
          let priceExpectation = intent.estimatedRevenue;
          
          if (!priceExpectation && intent.productId) {
            try {
              const productDoc = await db
                .collection("merchants")
                .doc(merchantId)
                .collection("products")
                .doc(intent.productId)
                .get();
              
              if (productDoc.exists) {
                const productData = productDoc.data();
                priceExpectation = productData?.price || null;
              }
            } catch {
              priceExpectation = null;
            }
          }

          const estimatedRevenue = calculateEstimatedRevenue(
            priceExpectation,
            intent.intentType,
            intent.confidence
          );

          return {
            ...intent,
            sessionId: conversation_id,
            estimatedRevenue,
            timestamp: FieldValue.serverTimestamp(),
          };
        })
      );

      const intentIds: string[] = [];
      for (const intent of intentsWithRevenue) {
        const intentId = generateIntentId(
          conversation_id,
          intent.productName || "",
          intent.intentType
        );

        const intentData = {
          ...intent,
          intentId,
        };

        await sessionRef
          .collection("intents")
          .doc(intentId)
          .set(intentData, { merge: false });

        await db
          .collection("merchants")
          .doc(merchantId)
          .collection("intents")
          .doc(intentId)
          .set(intentData, { merge: false });

        intentIds.push(intentId);
      }

      // Set CORS header for successful response
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      }

      res.status(200).json({
        message: "Transcript processed successfully",
        conversationId: conversation_id,
        sessionId: sessionRef.id,
        intentsProcessed: intentsWithRevenue.length,
        intentIds: intentIds,
      });
    } catch (err) {
      console.error("[postCallWebhook] Error:", err);
      
      // Set CORS header for error response
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      }

      // Prevent information leakage in production
      const isDevelopment = process.env.NODE_ENV === "development" || !process.env.K_SERVICE;
      res.status(500).json({
        error: "Processing failed",
        message: isDevelopment
          ? (err instanceof Error ? err.message : "Unknown error")
          : "Internal server error",
      });
    }
  }
);
