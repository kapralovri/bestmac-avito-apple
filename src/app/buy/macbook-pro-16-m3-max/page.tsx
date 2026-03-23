import { Metadata } from "next";
import MacbookPro16M3Max from "@/views/longtail/MacbookPro16M3Max";

export const metadata: Metadata = {
  title: "Купить MacBook Pro 16 M3 Max б/у в Москве | BestMac",
  description: "Купить MacBook Pro 16 M3 Max б/у в отличном состоянии. Мощная рабочая станция для профессионалов. 36GB RAM, 1TB SSD. Гарантия, доставка по Москве.",
  alternates: { canonical: "/buy/macbook-pro-16-m3-max" },
  keywords: "купить macbook pro 16 m3 max, macbook pro 16 бу москва, macbook pro max купить",
};

export default function MacbookPro16M3MaxPage() {
  return <MacbookPro16M3Max />;
}
