import { Metadata } from "next";
import MacbookBrokenScreen from "@/views/longtail/MacbookBrokenScreen";

export const metadata: Metadata = {
  title: "Выкуп MacBook с разбитым экраном в Москве | BestMac",
  description: "Продайте MacBook с разбитым экраном дорого. Покупаем MacBook Air и Pro с трещинами, сколами, тёмными пятнами на дисплее. Оценка за 5 минут по фото.",
  alternates: { canonical: "/sell/macbook-broken-screen" },
};

export default function MacbookBrokenScreenPage() {
  return <MacbookBrokenScreen />;
}
