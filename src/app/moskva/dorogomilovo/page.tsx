import { Metadata } from "next";
import Dorogomilovo from "@/views/geo/Dorogomilovo";

export const metadata: Metadata = {
  title: "Скупка MacBook в Дорогомилово, Москва | BestMac",
  description: "Выкуп техники Apple в Дорогомилово, Москва. Офис на ул. Дениса Давыдова 3 в самом районе. Скупка MacBook Pro, Air, iMac — оценка за 5 минут, моментальная оплата.",
  alternates: { canonical: "/moskva/dorogomilovo" },
  keywords: "скупка macbook дорогомилово, выкуп apple дорогомилово москва, продать macbook дорогомилово",
};

export default function DorogomilovoPage() {
  return <Dorogomilovo />;
}
