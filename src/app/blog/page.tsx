import { Metadata } from "next";
import BlogIndex from "@/views/blog/BlogIndex";

export const metadata: Metadata = {
  title: "Блог о MacBook — советы, обзоры, сравнения | BestMac",
  description: "Полезные статьи о MacBook: как выбрать, проверить перед покупкой, сравнение моделей Air vs Pro, M1/M2/M3. Экспертные советы от BestMac.",
  alternates: { canonical: "/blog" },
  keywords: "блог macbook, статьи apple, обзор macbook, советы покупка macbook",
};

export default function BlogPage() {
  return <BlogIndex />;
}
