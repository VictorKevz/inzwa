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

export function calculateEstimatedRevenue(
  priceExpectation: number | null,
  intentType: "buy" | "compare" | "inquire",
  confidence: number
): number | null {
  if (priceExpectation === null) {
    return null;
  }

  const intentWeight =
    intentType === "buy" ? 0.8 : intentType === "compare" ? 0.5 : 0.2;

  return priceExpectation * intentWeight * confidence;
}

