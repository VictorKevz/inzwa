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

const { realTimeRecommendation } = require("./api/realTimeRecommendations");
const { postCallWebhook } = require("./api/postCallWebhook");
exports.realTimeRecommendation = realTimeRecommendation;
exports.postCallWebhook = postCallWebhook;
