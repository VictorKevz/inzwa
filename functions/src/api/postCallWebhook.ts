import { analyzeTranscript } from "../nlu/analyzeTranscript";

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

exports.postCallWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    const { store_id, transcript } = req.body;
    if (!store_id || !transcript || !Array.isArray(transcript)) {
      return res.status(400).send("Missing fields");
    }

    try {
      const results = [];
      for (const entry of transcript) {
        const nluResult = await analyzeTranscript(entry);
        results.push({ entry, nlu: nluResult });

        // This write targets the Firestore database for the current Firebase project.
        // If it fails, we *do not* swallow the error, so you can see real failures
        // in the logs and the HTTP response.
        await db.collection("intents").add({
          store_id,
          raw_intent: entry,
          nlu: nluResult,
          source: "voice",
          timestamp: FieldValue.serverTimestamp(),
        });
      }

      res.status(200).json({
        message: "Transcript processed successfully",
        results: results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("NLU processing failed");
    }
  }
);
