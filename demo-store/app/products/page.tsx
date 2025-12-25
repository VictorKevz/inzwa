"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useProducts } from "../../contexts/ProductsContext";
import ProductCard from "../../components/ProductCard";
import { useRecommendations } from "../../contexts/RecommendationsContext";
import ProductPreview from "../../components/ProductPreview";

function ProductsContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const { products: allProducts, getProductsByCategory, loading, error } = useProducts();
  const { recommendations, isActive } = useRecommendations();

  const products = category
    ? getProductsByCategory(category)
    : allProducts;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {isActive && recommendations.length > 0 && (
        <div className="bg-black text-white py-4 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold mb-3">Voice Recommendations</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recommendations.map((product) => (
                <div key={product.productId} className="flex-shrink-0 w-48">
                  <ProductPreview product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            {category || "All Products"}
          </h1>
          <p className="text-gray-600">
            {products.length} {products.length === 1 ? "product" : "products"} found
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">Loading...</div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
