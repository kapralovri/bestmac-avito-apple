import { Metadata } from "next";
import Pickup from "@/views/Pickup";

export const metadata: Metadata = {
  title: "Точки самовывоза MacBook в Москве — ЦАО, Киевская, Дорогомилово | BestMac",
  description: "Самовывоз MacBook в Москве: ул. Дениса Давыдова 3, м. Киевская, ЦАО. Проверка при получении, консультация эксперта, оплата картой или наличными. Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00.",
  alternates: { canonical: "/pickup" },
  keywords: "самовывоз macbook москва, адрес bestmac, киевская дорогомилово, пункт выдачи apple",
};

export default function PickupPage() {
  return <Pickup />;
}
