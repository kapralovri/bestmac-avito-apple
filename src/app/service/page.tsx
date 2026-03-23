import { Metadata } from "next";
import Service from "@/views/Service";

export const metadata: Metadata = {
  title: "Ремонт MacBook, iPhone, iPad в Москве | Сервисный центр Apple на Киевской",
  description: "Профессиональный ремонт техники Apple в Москве. Замена экрана, аккумулятора, клавиатуры MacBook. Диагностика бесплатно. м. Киевская, Дорогомилово.",
  alternates: { canonical: "/service" },
  keywords: "ремонт macbook москва, сервис apple киевская, замена экрана macbook",
};

export default function ServicePage() {
  return <Service />;
}
