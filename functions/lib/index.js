"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables for VertexAI authentication
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Load .env from functions directory (__dirname will be lib/ in compiled code)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath });
}
else {
    // Fallback: try loading from current directory
    dotenv_1.default.config();
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
