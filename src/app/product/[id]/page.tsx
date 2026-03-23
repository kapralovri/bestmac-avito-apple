import { Metadata } from "next";
import ProductDetail from "@/views/ProductDetail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `MacBook б/у — купить в Москве | BestMac`,
    description: `Купить MacBook б/у в Москве с гарантией. Проверка при получении, самовывоз у м. Киевская.`,
    alternates: { canonical: `/product/${id}` },
  };
}

export default function ProductDetailPage() {
  return <ProductDetail />;
}
