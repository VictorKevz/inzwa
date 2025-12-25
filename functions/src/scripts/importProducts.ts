import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { ProductVariantImport, ProductData } from "../types/intent.types";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

if (!admin.apps.length) {
  // Get project ID from environment variable, fallback to default for backward compatibility
  const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "inzwa-hackathon";
  
  let config: admin.AppOptions = {
    projectId: projectId,
  };

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf-8")
    );
    config.credential = admin.credential.cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      config.credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT from .env");
    }
  }

  admin.initializeApp(config);
}
const db = admin.firestore();

const MERCHANT_ID = "merchant_001";
const BATCH_SIZE = 500;

async function importProducts() {
  try {
    const dataPath = path.resolve(__dirname, "../../../demo-store/data.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const products: ProductData[] = JSON.parse(rawData);

    console.log(`📦 Found ${products.length} products to import...`);

    const merchantRef = db.collection("merchants").doc(MERCHANT_ID);
    const productsRef = merchantRef.collection("products");

    let batch = db.batch();
    let count = 0;
    let totalImported = 0;

    for (const product of products) {
      const productRef = productsRef.doc(product.productId);

      const firestoreProduct = {
        productId: product.productId,
        name: product.productName,
        category: product.category,
        price: product.price,
        currency: product.currency,
        description: product.description,
        tags: product.tags,
        images: product.images,
        variants: product.variants.map((v) => ({
          variantId: v.variantId,
          attributes: {
            size: v.size,
            color: v.color,
          },
          stock: v.stock,
          sku: v.sku,
        })),
        inStock: product.inStock,
        updatedAt: admin.firestore.Timestamp.fromDate(
          new Date(product.updatedAt)
        ),
      };

      batch.set(productRef, firestoreProduct);
      count++;
      totalImported++;

      if (count >= BATCH_SIZE) {
        await batch.commit();
        console.log(
          `✅ Imported batch: ${totalImported}/${products.length} products...`
        );
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    console.log(
      `\n🎉 Successfully imported ${totalImported} products to /merchants/${MERCHANT_ID}/products`
    );
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error importing products:", error);

    if (
      error.message?.includes("credentials") ||
      error.message?.includes("authentication")
    ) {
      console.error("\n💡 Authentication required! Choose one option:");
      console.error("\n   Option 1: Install gcloud and run:");
      console.error("     gcloud auth application-default login");
      console.error("\n   Option 2: Use a service account key:");
      console.error(
        "     1. Download service account key from Firebase Console"
      );
      console.error(
        "     2. Set: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json"
      );
      console.error("     3. Run the script again");
    }

    process.exit(1);
  }
}

// Run the import
importProducts();
