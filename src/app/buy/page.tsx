import { Metadata } from "next";
import Buy from "@/views/Buy";

export const metadata: Metadata = {
  title: "Купить MacBook б/у в Москве с гарантией | BestMac",
  description: "Большой выбор проверенной техники Apple с гарантией в Москве. MacBook Air и Pro на M1, M2, M3, M4. Самовывоз у м. Киевская или доставка по Москве.",
  alternates: { canonical: "/buy" },
  keywords: "купить macbook бу москва, macbook air pro гарантия, bestmac купить",
};

export default function BuyPage() {
  return <Buy />;
}
