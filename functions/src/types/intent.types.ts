// NLU Types
export interface MerchantMetadata {
  merchantId: string;
  name: string;
  industry: string;
  currency: string;
  locale: string;
}

export interface Intent {
  intentId?: string;
  sessionId: string;
  merchantId?: string; // Added for easier querying across intents collection
  productId: string | null;
  productName: string | null;
  category: string | null;
  intentType: "buy" | "compare" | "inquire";
  outcome: "accepted" | "rejected" | "abandoned" | null;
  intentStage: "expressed" | "confirmed" | null;
  rejectionReason: "variant_missing" | "out_of_stock" | "price_too_high" | "product_not_found" | "feature_missing" | "other" | null;
  confidence: number;
  estimatedRevenue: number | null;
  variantAttributes: { [key: string]: string } | null;
  normalizedIntent: string;
  timestamp: any;
}

export interface Session {
  sessionId: string;
  merchantId: string;
  agentId: string;
  conversationId: string;
  source: "voice";
  timestamp: any;
  transcript: Array<{ agent?: string; user?: string }>;
  rawText: string;
  transcriptRef?: string;
  // Removed: sentiment, productMentions, recommendationShown
  // These are redundant/misleading at session level:
  // - sentiment: ambiguous when user accepts some products and rejects others
  // - productMentions: can be aggregated from intents
  // - recommendationShown: can be aggregated from intents
}

export interface CallAnalysis {
  intents: Intent[];
  sentiment: "positive" | "neutral" | "negative";
  productMentions: string[];
  recommendationShown: string[];
}

export interface ExtractedProductIntent {
  category: string | null;
  price_min: number | null;
  price_max: number | null;
  size: string | null;
  color: string | null;
  confidence: number;
  raw_intent: string;
}

export interface TranscriptAnalysis {
  intentType: "browse" | "compare" | "buy";
  normalizedIntent: string;
  category: string | null;
  productMentions: string[];
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
}

// API Types
export interface ElevenLabsWebhookPayload {
  type:
    | "post_call_transcription"
    | "post_call_audio"
    | "call_initiation_failure";
  data: {
    conversation_id: string;
    agent_id: string;
    transcript: Array<{
      role: "user" | "agent";
      message: string;
      timestamp?: number;
    }>;
    analysis?: {
      transcript_summary?: string;
      call_successful?: boolean;
    };
    has_audio?: boolean;
    has_user_audio?: boolean;
    has_response_audio?: boolean;
    metadata?: {
      [key: string]: any;
      merchantId?: string;
      merchant_id?: string;
      userId?: string;
      user_id?: string;
      startTimeUnixSecs?: number;
      start_time_unix_secs?: number;
    };
  };
}

export interface RecommendationRequest {
  merchantId: string;
  rawIntent: string;
  limit?: number;
}

export interface RecommendationResponse {
  products: RankedProduct[];
  extracted_intent: ExtractedProductIntent;
  unmet_demand: boolean;
  confidence: number;
  message?: string;
}

// Product Types
export interface ProductVariant {
  variantId: string;
  attributes: {
    size?: string;
    color?: string;
  };
  stock: number;
  sku: string;
}

export interface FirestoreProduct {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  tags: string[];
  images: string[];
  variants: ProductVariant[];
  inStock: boolean;
}

export interface RankedProduct {
  productId: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  tags: string[];
  images: string[];
  variants: ProductVariant[];
  inStock: boolean;
  match_score: number;
  match_reasons: string[];
  matched_variant?: ProductVariant;
  agentSummary?: string;
}

// Import Script Types
export interface ProductVariantImport {
  variantId: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export interface ProductData {
  productId: string;
  productName: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  tags: string[];
  images: string[];
  inStock: boolean;
  variants: ProductVariantImport[];
  updatedAt: string;
}
