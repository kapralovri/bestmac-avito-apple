import { Metadata } from "next";
import MoskvaIndex from "@/views/geo/MoskvaIndex";

export const metadata: Metadata = {
  title: "Скупка MacBook в Москве по районам | BestMac",
  description: "Выкуп MacBook в Москве — Дорогомилово, Арбат, Хамовники, Киевская, ЦАО. Офис у м. Киевская, выезд по любому району. Оценка за 5 минут.",
  alternates: { canonical: "/moskva" },
  keywords: "скупка macbook москва районы, выкуп macbook цао, продать macbook дорогомилово",
};

export default function MoskvaPage() {
  return <MoskvaIndex />;
}
