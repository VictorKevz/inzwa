"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getProductById } from "../../../lib/api/products";
import { Product } from "../../../types/products";
import { formatPrice } from "../../../lib/utils/format";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await getProductById(productId);
        setProduct(data);
        if (data?.variants.length) {
          setSelectedVariant(data.variants[0].variantId);
        }
      } catch (error) {
        console.error("Failed to load product:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-black text-lg">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Product not found</div>
      </div>
    );
  }

  const currentVariant = product.variants.find(
    (v) => v.variantId === selectedVariant
  );

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-4">
              <Image
                src={product.images[selectedImage] || product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-20 h-20 rounded overflow-hidden border-2 ${
                      selectedImage === index
                        ? "border-black"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
              {product.category}
            </p>
            <h1 className="text-4xl font-bold text-black mb-4">
              {product.name}
            </h1>
            <p className="text-3xl font-bold text-black mb-6">
              {formatPrice(product.price, product.currency)}
            </p>

            <div className="mb-6">
              <p className="text-sm font-semibold text-black mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.variantId}
                    onClick={() => setSelectedVariant(variant.variantId)}
                    disabled={variant.stock === 0}
                    className={`px-4 py-2 border-2 rounded ${
                      selectedVariant === variant.variantId
                        ? "border-black bg-black text-white"
                        : "border-gray-300 text-black hover:border-black"
                    } ${
                      variant.stock === 0
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </div>

            {currentVariant && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-black mb-2">Color</p>
                <p className="text-gray-700">{currentVariant.color}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Stock: {currentVariant.stock} available
                </p>
              </div>
            )}

            <button
              disabled={!currentVariant || currentVariant.stock === 0}
              className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              Add to Cart
            </button>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-black mb-3">
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            {product.tags.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
