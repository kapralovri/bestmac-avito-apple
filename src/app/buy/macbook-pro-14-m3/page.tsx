import { Metadata } from "next";
import MacbookPro14M3 from "@/views/longtail/MacbookPro14M3";

export const metadata: Metadata = {
  title: "Купить MacBook Pro 14 M3 б/у в Москве | BestMac",
  description: "Купить MacBook Pro 14 M3 2023 года б/у в Москве. Мощный ноутбук для профессионалов. Гарантия, проверка при покупке.",
  alternates: { canonical: "/buy/macbook-pro-14-m3" },
  keywords: "купить macbook pro 14 m3, macbook pro 14 бу москва, macbook pro m3 купить",
};

export default function MacbookPro14M3Page() {
  return <MacbookPro14M3 />;
}
