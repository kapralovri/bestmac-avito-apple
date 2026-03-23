import { Metadata } from "next";
import MacbookDliaStudenta from "@/views/blog/MacbookDliaStudenta";

export const metadata: Metadata = {
  title: "Какой MacBook выбрать студенту: бюджетные варианты | BestMac",
  description: "Лучшие модели MacBook для студентов в 2024 году. Сравнение характеристик, цен и рекомендации по выбору недорогого MacBook для учебы.",
  alternates: { canonical: "/blog/macbook-dlia-studenta" },
};

export default function MacbookDliaStudentaPage() {
  return <MacbookDliaStudenta />;
}
