import { Metadata } from "next";
import Arbat from "@/views/geo/Arbat";

export const metadata: Metadata = {
  title: "Скупка MacBook в районе Арбат, Москва | BestMac",
  description: "Скупка MacBook и техники Apple в районе Арбат. Наш офис — 10 минут от Арбатской. Выкуп любых моделей MacBook, iMac, iPhone. Бесплатный выезд курьера.",
  alternates: { canonical: "/moskva/arbat" },
  keywords: "скупка macbook арбат, выкуп apple арбатская, продать macbook арбат москва",
};

export default function ArbatPage() {
  return <Arbat />;
}
