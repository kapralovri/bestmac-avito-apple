import { Metadata } from "next";
import SellMacPro from "@/views/sell/SellMacPro";

export const metadata: Metadata = {
  title: "Продать Mac Pro в Москве дорого | Выкуп рабочих станций Apple",
  description: "Продайте ваш Mac Pro быстро и дорого. Выкупаем профессиональные станции Apple (Trashcan, Tower) на процессорах Intel и Apple Silicon. Оценка за 5 минут!",
  alternates: { canonical: "/sell/mac-pro" },
};

export default function SellMacProPage() {
  return <SellMacPro />;
}
