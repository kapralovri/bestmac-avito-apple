import { Metadata } from "next";
import SellSeries from "@/views/sell/SellSeries";

export const metadata: Metadata = {
  title: "Продать MacBook Air в Москве дорого | Скупка MacBook Air б/у — BestMac",
  description: "Выкуп MacBook Air всех моделей в Москве. M1, M2, M3. Оценка за 5 минут, оплата сразу. Платим до 95% рыночной стоимости.",
  alternates: { canonical: "/sell/macbook-air" },
};

export default function SellMacbookAirPage() {
  return <SellSeries series="air" />;
}
