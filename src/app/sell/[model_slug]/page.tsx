import { Metadata } from "next";
import SellModel from "@/views/SellModel";

type Props = { params: Promise<{ model_slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model_slug } = await params;
  const modelName = model_slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `Продать ${modelName} в Москве дорого | Скупка — BestMac`,
    description: `Выкуп ${modelName} в Москве. Быстрая оценка, оплата сразу. Платим до 95% рыночной стоимости.`,
    alternates: { canonical: `/sell/${model_slug}` },
  };
}

export default function SellModelPage() {
  return <SellModel />;
}
