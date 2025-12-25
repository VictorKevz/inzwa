import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase/admin";

const MERCHANT_ID = "merchant_001";

export async function GET() {
  try {
    const productsRef = db.collection("merchants").doc(MERCHANT_ID).collection("products");
    const snapshot = await productsRef.get();

    const categories = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    return NextResponse.json({ categories: Array.from(categories).sort() });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

