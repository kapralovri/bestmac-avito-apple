import { Metadata } from "next";
import SellModel from "@/views/SellModel";

// Slug → правильное русское название для метаданных
const MODEL_TITLES: Record<string, string> = {
  "macbook-air-13-2020-m1": "MacBook Air 13 2020 M1",
  "macbook-air-13-2022-m2": "MacBook Air 13 2022 M2",
  "macbook-air-13-2024-m3": "MacBook Air 13 2024 M3",
  "macbook-air-13-2025-m4": "MacBook Air 13 2025 M4",
  "macbook-air-15-2023-m2": "MacBook Air 15 2023 M2",
  "macbook-air-15-2024-m3": "MacBook Air 15 2024 M3",
  "macbook-air-15-2025-m4": "MacBook Air 15 2025 M4",
  "macbook-pro-13-2020-m1": "MacBook Pro 13 2020 M1",
  "macbook-pro-13-2022-m2": "MacBook Pro 13 2022 M2",
  "macbook-pro-14-2021": "MacBook Pro 14 2021",
  "macbook-pro-14-2023": "MacBook Pro 14 2023",
  "macbook-pro-14-2024": "MacBook Pro 14 2024",
  "macbook-pro-16-2021": "MacBook Pro 16 2021",
  "macbook-pro-16-2023": "MacBook Pro 16 2023",
  "macbook-pro-16-2024": "MacBook Pro 16 2024",
  "macbook-broken-screen": "MacBook со сломанным экраном",
};

export function generateStaticParams() {
  return Object.keys(MODEL_TITLES).map((model_slug) => ({ model_slug }));
}

type Props = { params: Promise<{ model_slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model_slug } = await params;
  const modelName = MODEL_TITLES[model_slug] ?? model_slug
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
