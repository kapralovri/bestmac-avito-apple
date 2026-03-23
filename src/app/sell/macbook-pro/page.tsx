import { Metadata } from "next";
import SellSeries from "@/views/sell/SellSeries";

export const metadata: Metadata = {
  title: "Продать MacBook Pro в Москве дорого | Скупка MacBook Pro б/у — BestMac",
  description: "Выкуп MacBook Pro всех моделей в Москве. M1, M2, M3, M4 Pro/Max. Оценка за 5 минут, оплата сразу. Платим до 95% рыночной стоимости.",
  alternates: { canonical: "/sell/macbook-pro" },
};

export default function SellMacbookProPage() {
  return <SellSeries series="pro" />;
}
