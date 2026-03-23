import { Metadata } from "next";
import Terms from "@/views/Terms";

export const metadata: Metadata = {
  title: "Условия использования | BestMac",
  description: "Условия использования сервисов BestMac. Правила покупки и продажи техники Apple.",
  alternates: { canonical: "/terms" },
  robots: { index: false },
};

export default function TermsPage() {
  return <Terms />;
}
