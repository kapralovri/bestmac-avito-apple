import { Metadata } from "next";
import MacbookAirM3Students from "@/views/longtail/MacbookAirM3Students";

export const metadata: Metadata = {
  title: "MacBook Air M3 для студентов б/у в Москве | BestMac",
  description: "MacBook Air M3 б/у для студентов. Идеален для учебы, конспектов, программирования. 16GB RAM, 512GB SSD. Легкий, тихий, автономность 18 часов. Скидка для студентов.",
  alternates: { canonical: "/buy/macbook-air-m3-students" },
  keywords: "macbook air m3 студентам, купить macbook студент москва, macbook для учебы",
};

export default function MacbookAirM3StudentsPage() {
  return <MacbookAirM3Students />;
}
