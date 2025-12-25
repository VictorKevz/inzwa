import { Product, ProductCategory } from "../../types/products";

const API_BASE = "/api";

export async function getAllProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/products`);
  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }
  const data = await response.json();
  return data.products;
}

export async function getProductById(
  productId: string
): Promise<Product | null> {
  const response = await fetch(`${API_BASE}/products/${productId}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Failed to fetch product");
  }
  const data = await response.json();
  return data.product;
}
