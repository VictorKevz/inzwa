// Load environment variables for VertexAI authentication
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env from functions directory (__dirname will be lib/ in compiled code)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback: try loading from current directory
  dotenv.config();
}

// In the Cloud Functions/Cloud Run environment we want to use the
// default service account for Google Cloud authentication rather than
// a local JSON key path that may have been set for local CLI use.
// If GOOGLE_APPLICATION_CREDENTIALS points at a local file path, it
// will not exist in production and will cause Vertex AI auth failures.
if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const { realTimeRecommendation } = require("./api/realTimeRecommendations");
const { postCallWebhook } = require("./api/postCallWebhook");
exports.realTimeRecommendation = realTimeRecommendation;
exports.postCallWebhook = postCallWebhook;
