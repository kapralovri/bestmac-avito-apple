import { Metadata } from "next";
import Privacy from "@/views/Privacy";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | BestMac",
  description: "Политика конфиденциальности BestMac. Как мы обрабатываем и защищаем персональные данные пользователей.",
  alternates: { canonical: "/privacy" },
  robots: { index: false },
};

export default function PrivacyPage() {
  return <Privacy />;
}
