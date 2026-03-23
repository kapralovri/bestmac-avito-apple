import { Metadata } from "next";
import Business from "@/views/Business";

export const metadata: Metadata = {
  title: "MacBook и Apple для бизнеса в Москве — поставки и trade-in | BestMac",
  description: "Корпоративные поставки техники Apple в Москве. Документы ИП, безнал без НДС, лизинг 36 мес, trade-in. Персональный менеджер. Оставьте заявку →",
  alternates: { canonical: "/business" },
  keywords: "macbook для бизнеса москва, корпоративные поставки apple, trade-in macbook юрлица",
};

export default function BusinessPage() {
  return <Business />;
}
