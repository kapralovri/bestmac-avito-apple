import { Metadata } from "next";
import Index from "@/views/Index";

export const metadata: Metadata = {
  title: "Купить MacBook б/у в Москве с гарантией — BestMac",
  description: "Купить или продать MacBook б/у в Москве. Большой выбор MacBook Air и Pro с гарантией. Выкуп за 30 минут. Офис у м. Киевская, ЦАО.",
  alternates: { canonical: "/" },
  keywords: "купить macbook москва, macbook бу, продать macbook, bestmac",
};

export default function HomePage() {
  return <Index />;
}
