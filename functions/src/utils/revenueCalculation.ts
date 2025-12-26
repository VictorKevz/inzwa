import * as admin from "firebase-admin";

/**
 * Calculates price expectation from price_min and price_max
 * Returns null if no price information available
 */
export function calculatePriceExpectation(
  price_min: number | null,
  price_max: number | null
): number | null {
  if (price_min !== null && price_max !== null) {
    return price_min === price_max
      ? price_min
      : (price_min + price_max) / 2;
  }
  return price_min !== null ? price_min : price_max !== null ? price_max : null;
}

/**
 * Calculates estimated revenue for accepted or active intents.
 * This represents potential revenue from customers who have expressed interest.
 */
export function calculateEstimatedRevenue(
  productPrice: number | null,
  intentType: "buy" | "compare" | "inquire",
  confidence: number
): number | null {
  if (productPrice === null) {
    return null;
  }

  const intentWeight =
    intentType === "buy" ? 0.8 : intentType === "compare" ? 0.5 : 0.2;

  return productPrice * intentWeight * confidence;
}

/**
 * Calculates opportunity cost for rejected intents.
 * This represents the revenue lost due to rejection.
 * 
 * Conditions:
 * 1. variant_missing/out_of_stock: opportunityCost = productPrice (customer wanted to buy but couldn't)
 * 2. price_too_high: opportunityCost = customerPriceExpectation (if stated) or 80% of productPrice (fallback)
 * 3. product_not_found: opportunityCost = estimated price from similar products (if available) or null
 * 
 * @returns Object with opportunityCost and isEstimated flag
 */
export function calculateOpportunityCost(
  rejectionReason: "variant_missing" | "out_of_stock" | "price_too_high" | "product_not_found" | "feature_missing" | "other" | null,
  productPrice: number | null,
  customerPriceExpectation: number | null,
  estimatedSimilarProductPrice: number | null = null
): { opportunityCost: number | null; isEstimated: boolean } {
  if (!rejectionReason || productPrice === null) {
    return { opportunityCost: null, isEstimated: false };
  }

  switch (rejectionReason) {
    case "variant_missing":
    case "out_of_stock":
      return { opportunityCost: productPrice, isEstimated: false };

    case "price_too_high":
      if (customerPriceExpectation !== null) {
        return { opportunityCost: customerPriceExpectation, isEstimated: false };
      }
      return { opportunityCost: productPrice * 0.8, isEstimated: true };

    case "product_not_found":
      if (estimatedSimilarProductPrice !== null) {
        return { opportunityCost: estimatedSimilarProductPrice, isEstimated: true };
      }
      return { opportunityCost: null, isEstimated: false };

    case "feature_missing":
    case "other":
    default:
      return { opportunityCost: null, isEstimated: false };
  }
}

/**
 * Estimates price for a product_not_found scenario by finding similar products
 * in the same category and returning the average price.
 * 
 * @param merchantId - Merchant ID
 * @param category - Product category
 * @param db - Firestore database instance
 * @returns Average price of similar products, or null if none found
 */
export async function estimatePriceFromSimilarProducts(
  merchantId: string,
  category: string | null,
  db: admin.firestore.Firestore
): Promise<number | null> {
  if (!category) {
    return null;
  }

  try {
    const productsSnapshot = await db
      .collection("merchants")
      .doc(merchantId)
      .collection("products")
      .where("category", "==", category)
      .limit(10)
      .get();

    if (productsSnapshot.empty) {
      return null;
    }

    let totalPrice = 0;
    let count = 0;

    productsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.price && typeof data.price === "number") {
        totalPrice += data.price;
        count++;
      }
    });

    return count > 0 ? totalPrice / count : null;
  } catch (error) {
    console.error("[estimatePriceFromSimilarProducts] Error:", error);
    return null;
  }
}

