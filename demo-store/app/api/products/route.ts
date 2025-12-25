import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase/admin";
import { Product } from "../../../types/products";

const MERCHANT_ID = "merchant_001";

export async function GET() {
  try {
    const productsRef = db
      .collection("merchants")
      .doc(MERCHANT_ID)
      .collection("products");
    const snapshot = await productsRef.get();

    const products: Product[] = snapshot.docs.map((doc) => ({
      productId: doc.id,
      ...doc.data(),
    })) as Product[];

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
