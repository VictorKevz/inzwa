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
Object.defineProperty(exports, "__esModule", { value: true });
exports.realTimeRecommendation = void 0;
const functions = __importStar(require("firebase-functions"));
const mockProducts = [
    {
        product_id: "nike_air_force_1",
        name: "Nike Air Force 1",
        url: "https://example.com/airforce1",
        sizes: { 7: 5, 8: 3, 9: 2, 10: 0, 11: 4 },
    },
    {
        product_id: "air_jordan_13",
        name: "Air Jordan 13 Retro",
        url: "https://example.com/airjordan13",
        sizes: { 7: 5, 8: 3, 9: 2, 10: 0, 11: 4 },
    },
];
exports.realTimeRecommendation = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST")
        return res.status(405).send("Method Not Allowed");
    const { store_id, raw_intent } = req.body;
    if (!store_id || !raw_intent)
        return res.status(400).send("Missing fields");
    res.json({ products: mockProducts });
});
