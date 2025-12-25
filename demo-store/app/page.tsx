"use client";

import Link from "next/link";
import { useProducts } from "../contexts/ProductsContext";

export default function HomePage() {
  const { categories, loading } = useProducts();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-black mb-4">
            Voice-Driven Shopping
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Experience the future of e-commerce with AI-powered voice assistance
          </p>
          <p className="text-sm text-gray-500">
            Use the voice widget in the bottom-right corner to get personalized recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="bg-black text-white p-8 rounded-lg hover:bg-gray-900 transition-colors group"
            >
              <h2 className="text-2xl font-bold mb-2 group-hover:underline">
                {category}
              </h2>
              <p className="text-gray-300">Shop {category}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
