import { Metadata } from "next";
import Hamovniki from "@/views/geo/Hamovniki";

export const metadata: Metadata = {
  title: "Скупка MacBook в Хамовниках, Москва | BestMac",
  description: "Продать MacBook в Хамовниках — 15 минут до нашего офиса на м. Киевская. Скупка Apple техники б/у с оценкой по рынку, оплата сразу.",
  alternates: { canonical: "/moskva/hamovniki" },
  keywords: "скупка macbook хамовники, выкуп apple парк культуры, продать macbook хамовники",
};

export default function HamovnikiPage() {
  return <Hamovniki />;
}
