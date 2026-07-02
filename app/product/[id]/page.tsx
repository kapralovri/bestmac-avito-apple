import type { Metadata } from 'next';
import ProductDetail from '@/views/ProductDetail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Товар #${id} — техника Apple б/у с гарантией`,
    description: `Подробная информация о товаре #${id}. Техника Apple б/у с проверкой и гарантией от BestMac.`,
    alternates: { canonical: `/product/${id}` },
    // Тонкие динамические страницы-сироты (контент клиентский, шаблонный title):
    // прячем от индекса, пока не появится серверный рендер карточки товара.
    robots: { index: false, follow: true },
  };
}

export default function ProductDetailPage() {
  return <ProductDetail />;
}
