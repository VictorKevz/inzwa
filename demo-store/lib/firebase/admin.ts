import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

let app: App;
let db: Firestore;

if (!getApps().length) {
  // Get project ID from environment variable, fallback to default for backward compatibility
  const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "inzwa-hackathon";
  
  let config: { projectId: string; credential?: any } = {
    projectId: projectId,
  };

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    config.credential = cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      config.credential = cert(serviceAccount);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT from .env");
    }
  }

  app = initializeApp(config);
} else {
  app = getApps()[0];
}

db = getFirestore(app);

export { db };

