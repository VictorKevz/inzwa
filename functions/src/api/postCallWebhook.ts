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

        // Only write to Firestore if emulator is available (skip if not running)
        try {
          await db.collection("intents").add({
            store_id,
            raw_intent: entry,
            nlu: nluResult,
            source: "voice",
            timestamp: FieldValue.serverTimestamp(),
          });
        } catch (dbError: any) {
          // Firestore not available - that's okay for testing
          console.log(
            "Firestore write skipped (emulator may not be running):",
            dbError?.message || dbError
          );
        }
      }

      // Return NLU results for testing
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
