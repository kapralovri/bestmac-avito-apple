import { Metadata } from "next";
import KakVybratMacbook2024 from "@/views/blog/KakVybratMacbook2024";

export const metadata: Metadata = {
  title: "Как выбрать MacBook в 2026 году — полный гайд | BestMac",
  description: "Полный гайд по выбору MacBook б/у в 2026: M1, M2, M3, M4 — что взять под задачи и бюджет. Air vs Pro, диагонали, память. Актуальные цены.",
  alternates: { canonical: "/blog/kak-vybrat-macbook-2024" },
};

export default function KakVybratMacbook2024Page() {
  return <KakVybratMacbook2024 />;
}
