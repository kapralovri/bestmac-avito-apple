import { Metadata } from "next";
import KakProdatMacbookVygodno from "@/views/blog/KakProdatMacbookVygodno";

export const metadata: Metadata = {
  title: "Как продать MacBook выгодно в Москве — советы | BestMac",
  description: "Руководство по продаже MacBook: как правильно подготовить технику, где продать выгоднее, какие документы нужны. Советы по максимальной цене выкупа.",
  alternates: { canonical: "/blog/kak-prodat-macbook-vygodno" },
};

export default function KakProdatPage() {
  return <KakProdatMacbookVygodno />;
}
