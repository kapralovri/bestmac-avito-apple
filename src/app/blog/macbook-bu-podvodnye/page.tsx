import { Metadata } from "next";
import MacbookBuPodvodnye from "@/views/blog/MacbookBuPodvodnye";

export const metadata: Metadata = {
  title: "Подводные камни покупки б/у MacBook: чего опасаться | BestMac",
  description: "Распространенные проблемы при покупке б/у MacBook, красные флаги, как избежать обмана и проверить устройство перед покупкой.",
  alternates: { canonical: "/blog/macbook-bu-podvodnye" },
};

export default function MacbookBuPodvodnyePage() {
  return <MacbookBuPodvodnye />;
}
