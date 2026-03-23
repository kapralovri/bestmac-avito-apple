import { Metadata } from "next";
import MacbookApgreid from "@/views/blog/MacbookApgreid";

export const metadata: Metadata = {
  title: "Можно ли апгрейдить MacBook: что реально заменить | BestMac",
  description: "Полный гид по апгрейду MacBook. Узнайте, какие компоненты можно заменить в разных моделях, стоимость апгрейда и альтернативные решения.",
  alternates: { canonical: "/blog/macbook-apgreid" },
};

export default function MacbookApgreidPage() {
  return <MacbookApgreid />;
}
