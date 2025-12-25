export interface ProductVariant {
  variantId: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

export interface Product {
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

export type ProductCategory = "Casual" | "Basketball" | "Running" | string;
