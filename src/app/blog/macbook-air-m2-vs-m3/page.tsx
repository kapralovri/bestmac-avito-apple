import { Metadata } from "next";
import MacbookAirM2vsM3 from "@/views/blog/MacbookAirM2vsM3";

export const metadata: Metadata = {
  title: "MacBook Air M2 vs M3: стоит ли переплачивать? | BestMac",
  description: "Сравниваем MacBook Air M2 и M3 по скорости, автономности и цене б/у. Стоит ли доплачивать за M3 в 2026 году — честный ответ с цифрами.",
  alternates: { canonical: "/blog/macbook-air-m2-vs-m3" },
};

export default function MacbookAirM2vsM3Page() {
  return <MacbookAirM2vsM3 />;
}
