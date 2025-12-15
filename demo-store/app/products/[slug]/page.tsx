interface ProductPageProps {
  params: { slug: string };
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  return <div>Product detail for {params.slug}</div>;
}
