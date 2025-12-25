import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase/admin";
import { Product } from "../../../../types/products";

const MERCHANT_ID = "merchant_001";

export async function GET(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const params = await context.params;
    const productRef = db
      .collection("merchants")
      .doc(MERCHANT_ID)
      .collection("products")
      .doc(params.productId);

    const snapshot = await productRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product: Product = {
      productId: snapshot.id,
      ...snapshot.data(),
    } as Product;

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

