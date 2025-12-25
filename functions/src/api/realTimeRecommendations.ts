import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  extractProductIntent,
  ExtractedProductIntent,
} from "../nlu/extractProductIntent";
import {
  RecommendationRequest,
  ProductVariant,
  FirestoreProduct,
  RankedProduct,
  RecommendationResponse,
} from "../types/intent.types";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Determines if a product variant matches the extracted intent criteria.
 */
function variantMatchesIntent(
  variant: ProductVariant,
  intent: ExtractedProductIntent
): boolean {
  if (intent.size) {
    const variantSize = variant.attributes.size?.toLowerCase().trim();
    const intentSize = intent.size.toLowerCase().trim();
    if (variantSize !== intentSize) {
      return false;
    }
  }

  if (intent.color) {
    const variantColor = variant.attributes.color?.toLowerCase().trim();
    const intentColor = intent.color.toLowerCase().trim();
    if (!variantColor || !variantColor.includes(intentColor)) {
      return false;
    }
  }

  if (variant.stock <= 0) {
    return false;
  }

  return true;
}

/**
 * Determines if a category is specific (multi-word) or generic (single-word).
 * This is used to apply hierarchical matching rules.
 */
function isSpecificCategory(category: string): boolean {
  return category.trim().split(/\s+/).length > 1;
}

/**
 * Checks if two categories match hierarchically.
 * Returns: 'exact' | 'product_more_specific' | 'intent_more_specific' | 'no_match'
 *
 * Rules:
 * - Exact match: highest priority
 * - Generic intent → specific product: allowed (hierarchical)
 * - Specific intent → generic product: NOT allowed (too broad)
 * - Both specific but different: NOT allowed (different categories)
 */
function getCategoryMatchType(
  intentCategory: string,
  productCategory: string
): "exact" | "product_more_specific" | "intent_more_specific" | "no_match" {
  const intentLower = intentCategory.toLowerCase().trim();
  const productLower = productCategory.toLowerCase().trim();

  // Exact match (case-insensitive)
  if (intentLower === productLower) {
    return "exact";
  }

  const intentIsSpecific = isSpecificCategory(intentCategory);
  const productIsSpecific = isSpecificCategory(productCategory);

  // Both generic (single word): must be exact match
  if (!intentIsSpecific && !productIsSpecific) {
    return "no_match"; // Already checked exact match above
  }

  // Intent is specific, product is generic: product is too broad
  if (intentIsSpecific && !productIsSpecific) {
    return "intent_more_specific";
  }

  // Intent is generic, product is specific: check if product is a subcategory
  if (!intentIsSpecific && productIsSpecific) {
    // Check if product category starts with or contains the generic category as a word
    const intentWords = intentLower.split(/\s+/);
    const productWords = productLower.split(/\s+/);

    // If generic category word appears in product category, it's a hierarchical match
    if (productWords.some((word) => word === intentWords[0])) {
      return "product_more_specific";
    }
    return "no_match";
  }

  // Both are specific: check if product category contains all words from intent
  // This handles cases like "Basketball Shoes" matching "Basketball Shoes" (exact already handled)
  // or "Basketball Shoes" not matching "Running Shoes"
  const intentWords = intentLower.split(/\s+/);
  const productWords = productLower.split(/\s+/);

  // If all intent words are in product words, product is more specific or equal
  const allIntentWordsInProduct = intentWords.every((word) =>
    productWords.some((pWord) => pWord === word)
  );

  if (allIntentWordsInProduct) {
    // If product has more words, it's more specific
    if (productWords.length > intentWords.length) {
      return "product_more_specific";
    }
    // Same words but different order or slight variation - treat as no match for safety
    return "no_match";
  }

  return "no_match";
}

function calculateMatchScore(
  product: FirestoreProduct,
  intent: ExtractedProductIntent
): { score: number; reasons: string[]; matchedVariant?: ProductVariant } {
  let score = 0;
  const reasons: string[] = [];

  if (product.inStock) {
    score += 10;
    reasons.push("product_in_stock");
  }

  if (intent.category) {
    const matchType = getCategoryMatchType(intent.category, product.category);

    switch (matchType) {
      case "exact":
        score += 200;
        reasons.push(`category_exact_match:${product.category}`);
        break;
      case "product_more_specific":
        // Intent: "Shoes", Product: "Basketball Shoes" - acceptable hierarchical match
        score += 50;
        reasons.push(`category_hierarchical_match:${product.category}`);
        break;
      case "intent_more_specific":
        // Intent: "Basketball Shoes", Product: "Shoes" - NOT acceptable
        score += 0;
        reasons.push(`category_mismatch:${product.category} (too generic)`);
        break;
      case "no_match":
        score += 0;
        reasons.push(`category_no_match:${product.category}`);
        break;
    }
  }

  if (intent.price_min !== null && intent.price_max !== null) {
    if (
      product.price >= intent.price_min &&
      product.price <= intent.price_max
    ) {
      score += 40;
      reasons.push(`price_in_range:${product.price}`);
    } else if (product.price < intent.price_min) {
      score += 20;
      reasons.push(`price_below_range:${product.price}`);
    } else {
      score += 5;
      reasons.push(`price_above_range:${product.price}`);
    }
  } else if (intent.price_max !== null) {
    if (product.price <= intent.price_max) {
      score += 40;
      reasons.push(`price_within_max:${product.price}`);
    }
  } else if (intent.price_min !== null) {
    if (product.price >= intent.price_min) {
      score += 40;
      reasons.push(`price_above_min:${product.price}`);
    }
  }

  let matchedVariant: ProductVariant | undefined;
  if (intent.size || intent.color) {
    const matchingVariants = product.variants.filter((v) =>
      variantMatchesIntent(v, intent)
    );

    if (matchingVariants.length > 0) {
      matchedVariant = matchingVariants[0];
      score += 30;
      if (intent.size) reasons.push(`size_match:${intent.size}`);
      if (intent.color) reasons.push(`color_match:${intent.color}`);
    } else {
      score -= 20;
      if (intent.size) reasons.push(`size_mismatch:${intent.size}`);
      if (intent.color) reasons.push(`color_mismatch:${intent.color}`);
    }
  } else {
    const inStockVariants = product.variants.filter((v) => v.stock > 0);
    if (inStockVariants.length > 0) {
      matchedVariant = inStockVariants[0];
      score += 10;
      reasons.push("variant_available");
    }
  }

  return { score, reasons, matchedVariant };
}

function filterProducts(
  products: FirestoreProduct[],
  intent: ExtractedProductIntent
): FirestoreProduct[] {
  return products.filter((product) => {
    if (!product.inStock) return false;

    if (intent.category) {
      const matchType = getCategoryMatchType(intent.category, product.category);

      // Filter out products that don't match or are too generic
      if (matchType === "no_match" || matchType === "intent_more_specific") {
        return false;
      }
      // Allow: exact match, or product is more specific than intent
    }

    if (intent.price_min !== null && product.price < intent.price_min) {
      return false;
    }
    if (intent.price_max !== null && product.price > intent.price_max) {
      return false;
    }

    if (intent.size || intent.color) {
      const hasMatchingVariant = product.variants.some((v) =>
        variantMatchesIntent(v, intent)
      );
      if (!hasMatchingVariant) {
        return false;
      }
    } else {
      const hasInStockVariant = product.variants.some((v) => v.stock > 0);
      if (!hasInStockVariant) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Returns product recommendations based on customer intent.
 * Extracts intent, queries Firestore, filters and ranks products, then returns top matches.
 */
export const realTimeRecommendation = functions.https.onRequest(
  async (req: any, res: any) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS?.split(",").map((o) => o.trim()) || [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      }
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
      return res.status(204).send("");
    }

    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    // API Key authentication (optional for local dev, required in production)
    const apiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];
    const requiredApiKey = process.env.RECOMMENDATION_API_KEY;
    
    if (requiredApiKey) {
      if (!apiKey || apiKey !== requiredApiKey) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid API key required",
        });
      }
    } else {
      // Allow local development without API key
      console.warn("[realTimeRecommendation] Running without API key validation (local dev mode)");
    }

    const { merchantId, rawIntent, limit } = req.body as RecommendationRequest;
    
    // Enhanced input validation
    if (!merchantId || !rawIntent) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields: merchantId and rawIntent",
      });
    }

    // Validate merchantId format (optional but recommended)
    if (typeof merchantId !== "string" || merchantId.length > 100) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid merchantId format",
      });
    }

    // Validate rawIntent length
    if (typeof rawIntent !== "string" || rawIntent.length > 10000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid rawIntent: must be a string under 10000 characters",
      });
    }


    try {
      const extractedIntent = await extractProductIntent(rawIntent);

      const productsRef = db
        .collection("merchants")
        .doc(merchantId)
        .collection("products");

      let query: admin.firestore.Query = productsRef.where(
        "inStock",
        "==",
        true
      );

      if (extractedIntent.price_max !== null) {
        query = query.where("price", "<=", extractedIntent.price_max);
      }
      if (extractedIntent.price_min !== null) {
        query = query.where("price", ">=", extractedIntent.price_min);
      }

      const maxQueryLimit = 100;
      const snapshot = await query.limit(maxQueryLimit).get();

      if (snapshot.empty) {
        return res.status(200).json({
          products: [],
          extracted_intent: extractedIntent,
          unmet_demand: true,
          confidence: extractedIntent.confidence,
          message: `No products found matching: ${
            extractedIntent.category || "any category"
          }, price ${extractedIntent.price_min || "any"}-${
            extractedIntent.price_max || "any"
          }`,
        } as RecommendationResponse);
      }

      const allProducts: FirestoreProduct[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          productId: data.productId,
          name: data.name,
          category: data.category,
          price: data.price,
          currency: data.currency,
          description: data.description,
          tags: data.tags || [],
          images: data.images || [],
          variants: (data.variants || []).map((v: any) => ({
            variantId: v.variantId,
            attributes: v.attributes || {},
            stock: v.stock,
            sku: v.sku,
          })),
          inStock: data.inStock,
        };
      });

      const filteredProducts = filterProducts(allProducts, extractedIntent);

      if (filteredProducts.length === 0) {
        return res.status(200).json({
          products: [],
          extracted_intent: extractedIntent,
          unmet_demand: true,
          confidence: extractedIntent.confidence,
          message: `No products match all criteria: ${
            extractedIntent.category || "any category"
          }, price ${extractedIntent.price_min || "any"}-${
            extractedIntent.price_max || "any"
          }, size ${extractedIntent.size || "any"}, color ${
            extractedIntent.color || "any"
          }`,
        } as RecommendationResponse);
      }

      const rankedProducts: RankedProduct[] = filteredProducts
        .map((product) => {
          const { score, reasons, matchedVariant } = calculateMatchScore(
            product,
            extractedIntent
          );
          return {
            ...product,
            match_score: score,
            match_reasons: reasons,
            matched_variant: matchedVariant,
          };
        })
        .sort((a, b) => b.match_score - a.match_score);

      const resultLimit = Math.min(limit || 5, 5);
      const topProducts = rankedProducts
        .slice(0, resultLimit)
        .map((product) => {
          const availableSizes = [
            ...new Set(
              product.variants.map((v) => v.attributes.size).filter(Boolean)
            ),
          ];
          const availableColors = [
            ...new Set(
              product.variants.map((v) => v.attributes.color).filter(Boolean)
            ),
          ];

          const summaryParts = [
            product.name,
            product.description,
            availableSizes.length > 0
              ? `Available sizes: ${availableSizes.join(", ")}`
              : "",
            availableColors.length > 0
              ? `Available colors: ${availableColors.join(", ")}`
              : "",
            product.tags.length > 0
              ? `Features: ${product.tags.join(", ")}`
              : "",
            `Price: ${product.price} ${product.currency}`,
          ].filter(Boolean);

          return {
            ...product,
            agentSummary: summaryParts.join(". "),
          };
        });

      const response: RecommendationResponse = {
        products: topProducts,
        extracted_intent: extractedIntent,
        unmet_demand: false,
        confidence: extractedIntent.confidence,
      };

      // Set CORS header for successful response
      const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS?.split(",").map((o) => o.trim()) || [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      }

      res.status(200).json(response);
    } catch (error) {
      console.error(
        "[Recommendation] Error in recommendation pipeline:",
        error
      );

      // Set CORS header for error response
      const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS?.split(",").map((o) => o.trim()) || [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
      }

      // Prevent information leakage in production
      const isDevelopment = process.env.NODE_ENV === "development" || !process.env.K_SERVICE;
      res.status(500).json({
        error: "Failed to generate recommendations",
        message: isDevelopment
          ? (error instanceof Error ? error.message : "Unknown error")
          : "Internal server error",
      });
    }
  }
);
