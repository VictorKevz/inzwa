"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "../types/products";
import { formatPrice, slugify } from "../lib/utils/format";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images[0] || "/placeholder-shoe.png";
  const slug = slugify(product.name);

  return (
    <Link href={`/products/${product.productId}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {product.category}
          </p>
          <h3 className="font-semibold text-black mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-lg font-bold text-black">
            {formatPrice(product.price, product.currency)}
          </p>
          {!product.inStock && (
            <p className="text-xs text-red-500 mt-1">Out of Stock</p>
          )}
        </div>
      </div>
    </Link>
  );
}

