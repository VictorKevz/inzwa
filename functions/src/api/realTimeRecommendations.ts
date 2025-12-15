import * as functions from "firebase-functions";

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

interface RecommendationRequest {
  store_id: string;
  raw_intent: string;
}

export const realTimeRecommendation = functions.https.onRequest(
  async (req: any, res: any) => {
    if (req.method !== "POST")
      return res.status(405).send("Method Not Allowed");

    const { store_id, raw_intent } = req.body as RecommendationRequest;
    if (!store_id || !raw_intent) return res.status(400).send("Missing fields");

    res.json({ products: mockProducts });
  }
);
