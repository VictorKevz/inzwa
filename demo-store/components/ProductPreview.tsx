"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "../types/products";
import { formatPrice } from "../lib/utils/format";

interface ProductPreviewProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export default function ProductPreview({ product, onSelect }: ProductPreviewProps) {
  const primaryImage = product.images[0] || "/placeholder-shoe.png";

  const handleClick = () => {
    onSelect?.(product);
  };

  return (
    <Link
      href={`/products/${product.productId}`}
      className="block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-black"
      onClick={handleClick}
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-cover"
          sizes="200px"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {product.category}
        </p>
        <h4 className="font-semibold text-sm text-black mb-1 line-clamp-2">
          {product.name}
        </h4>
        <p className="text-base font-bold text-black">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </Link>
  );
}

