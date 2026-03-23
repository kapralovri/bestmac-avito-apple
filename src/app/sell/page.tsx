import { Metadata } from "next";
import Sell from "@/views/Sell";

export const metadata: Metadata = {
  title: "Продать MacBook в Москве дорого | Скупка макбуков б/у — BestMac",
  description: "Выкуп Apple MacBook (Pro, Air) за 30 минут. Оценка онлайн бесплатно. Лучшие цены — платим до 95% рыночной стоимости. м. Киевская, ЦАО.",
  alternates: { canonical: "/sell" },
  keywords: "продать macbook москва, скупка macbook, выкуп apple, bestmac продать",
};

export default function SellPage() {
  return <Sell />;
}
