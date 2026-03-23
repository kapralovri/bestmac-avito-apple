import { Metadata } from "next";
import MacbookVsWindows from "@/views/blog/MacbookVsWindows";

export const metadata: Metadata = {
  title: "MacBook или Windows ноутбук: что выбрать в 2024 году | BestMac",
  description: "Сравнение MacBook и Windows ноутбуков по производительности, цене, экосистеме и долговечности. Помогаем сделать правильный выбор.",
  alternates: { canonical: "/blog/macbook-vs-windows" },
};

export default function MacbookVsWindowsPage() {
  return <MacbookVsWindows />;
}
