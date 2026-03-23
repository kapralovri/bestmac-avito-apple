import { Metadata } from "next";
import SellImac from "@/views/sell/SellImac";

export const metadata: Metadata = {
  title: "Продать iMac в Москве дорого | Скупка аймак б/у — BestMac",
  description: "Оцените ваш Apple iMac онлайн за 5 минут. Покупаем моноблоки 21.5, 24 и 27 дюймов на процессорах Intel и M1/M3. Выезд оценщика, деньги сразу!",
  alternates: { canonical: "/sell/imac" },
};

export default function SellImacPage() {
  return <SellImac />;
}
