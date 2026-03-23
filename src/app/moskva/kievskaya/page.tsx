import { Metadata } from "next";
import Kievskaya from "@/views/geo/Kievskaya";

export const metadata: Metadata = {
  title: "Скупка MacBook у м. Киевская — Дорогомилово | BestMac",
  description: "Скупка MacBook, iMac и iPhone у м. Киевская (район Дорогомилово). Офис в 3 минутах от метро, оценка за 5 минут, оплата наличными или переводом. Работаем ежедневно.",
  alternates: { canonical: "/moskva/kievskaya" },
  keywords: "скупка macbook киевская, выкуп apple дорогомилово, продать macbook киевская",
};

export default function KievskayaPage() {
  return <Kievskaya />;
}
