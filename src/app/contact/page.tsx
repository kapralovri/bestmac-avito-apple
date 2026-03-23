import { Metadata } from "next";
import Contact from "@/views/Contact";

export const metadata: Metadata = {
  title: "Контакты BestMac — телефон и адрес в Москве",
  description: "BestMac: +7 (903) 299-00-29, ул. Дениса Давыдова 3, м. Киевская. Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00. Telegram @romanmanro. Форма заявки и карта проезда.",
  alternates: { canonical: "/contact" },
  keywords: "контакты bestmac, адрес bestmac, телефон bestmac москва, связаться с bestmac",
};

export default function ContactPage() {
  return <Contact />;
}
