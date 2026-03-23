import { Metadata } from "next";
import SellBroken from "@/views/sell/SellBroken";

export const metadata: Metadata = {
  title: "Продать сломанный MacBook на запчасти в Москве | Скупка залитых и разбитых макбуков",
  description: "Выкуп нерабочих, сломанных, залитых водой, заблокированных на iCloud и разбитых MacBook Pro/Air. Быстрая оценка по фото в Telegram/WhatsApp за 5 минут. Деньги сразу!",
  alternates: { canonical: "/sell/broken" },
  keywords: "продать сломанный macbook, скупка макбуков на запчасти, продать залитый macbook, скупка нерабочих macbook в москве",
};

export default function SellBrokenPage() {
  return <SellBroken />;
}
