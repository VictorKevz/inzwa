"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product, ProductCategory } from "../types/products";
import { getAllProducts } from "../lib/api/products";

interface ProductsContextType {
  products: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
  getProductsByCategory: (category: ProductCategory) => Product[];
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const allProducts = await getAllProducts();
      setProducts(allProducts);
      
      const categorySet = new Set<string>();
      allProducts.forEach((product) => {
        if (product.category) {
          categorySet.add(product.category);
        }
      });
      setCategories(Array.from(categorySet).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const getProductsByCategoryFilter = (category: ProductCategory): Product[] => {
    return products.filter((p) => p.category === category);
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        categories,
        loading,
        error,
        getProductsByCategory: getProductsByCategoryFilter,
        refreshProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}

