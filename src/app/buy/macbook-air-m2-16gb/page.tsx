import { Metadata } from "next";
import MacbookAirM2Buy from "@/views/longtail/MacbookAirM2Buy";

export const metadata: Metadata = {
  title: "Купить MacBook Air M2 16GB б/у в Москве | BestMac",
  description: "Купить MacBook Air M2 с 16GB RAM и 512GB SSD в отличном состоянии. Гарантия 1 месяц, проверка при покупке.",
  alternates: { canonical: "/buy/macbook-air-m2-16gb" },
  keywords: "купить macbook air m2 16gb, macbook air m2 бу москва, macbook air m2 512gb",
};

export default function MacbookAirM2BuyPage() {
  return <MacbookAirM2Buy />;
}
