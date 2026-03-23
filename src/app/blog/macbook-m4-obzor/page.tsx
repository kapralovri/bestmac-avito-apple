import { Metadata } from "next";
import MacbookM4Obzor from "@/views/blog/MacbookM4Obzor";

export const metadata: Metadata = {
  title: "MacBook M4: что нового и стоит ли обновляться с M2/M3 | BestMac",
  description: "Полный обзор нового процессора Apple M4 в MacBook. Сравнение с M2 и M3, тесты производительности, стоит ли обновляться.",
  alternates: { canonical: "/blog/macbook-m4-obzor" },
};

export default function MacbookM4ObzorPage() {
  return <MacbookM4Obzor />;
}
