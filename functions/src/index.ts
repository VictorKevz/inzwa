import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

if (process.env.K_SERVICE || process.env.FUNCTION_TARGET) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const { realTimeRecommendation } = require("./api/realTimeRecommendations");
exports.realTimeRecommendation = realTimeRecommendation;

const { postCallWebhook } = require("./api/postCallWebhook");
exports.postCallWebhook = postCallWebhook;
