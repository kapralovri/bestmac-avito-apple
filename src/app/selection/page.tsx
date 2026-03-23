import { Metadata } from "next";
import Selection from "@/views/Selection";

export const metadata: Metadata = {
  title: "Подбор MacBook под ваши задачи — консультация в Москве | BestMac",
  description: "Не знаете, какой MacBook выбрать? Эксперты BestMac подберут под задачи и бюджет. 2–3 варианта, консультация бесплатно. Отвечаем в Telegram.",
  alternates: { canonical: "/selection" },
  keywords: "подбор macbook москва, консультация выбор macbook, какой macbook купить",
};

export default function SelectionPage() {
  return <Selection />;
}
