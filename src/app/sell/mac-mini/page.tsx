import { Metadata } from "next";
import SellMacMini from "@/views/sell/SellMacMini";

export const metadata: Metadata = {
  title: "Продать Mac mini в Москве | Скупка Mac mini дорого — BestMac",
  description: "Онлайн оценка Mac mini за 5 минут. Покупаем компактные десктопы Apple на процессорах Intel, M1 и M2/M4. Платим реальную рыночную цену.",
  alternates: { canonical: "/sell/mac-mini" },
};

export default function SellMacMiniPage() {
  return <SellMacMini />;
}
