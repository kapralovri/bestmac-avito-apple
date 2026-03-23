import { Metadata } from "next";
import Comparison from "@/views/Comparison";

export const metadata: Metadata = {
  title: "Сравнение MacBook Air vs Pro: M1, M2, M3 — какой выбрать | BestMac",
  description: "Интерактивное сравнение MacBook Air и Pro: M1, M2, M3. Технические характеристики, цены б/у, автономность и производительность. Выберите MacBook для своих задач.",
  alternates: { canonical: "/comparison" },
  keywords: "сравнение macbook air pro, macbook m1 m2 m3 сравнение, какой macbook выбрать",
};

export default function ComparisonPage() {
  return <Comparison />;
}
