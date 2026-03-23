import { Metadata } from "next";
import ProverkaMacbookPeredPokupkoi from "@/views/blog/ProverkaMacbookPeredPokupkoi";

export const metadata: Metadata = {
  title: "Проверка MacBook перед покупкой — что проверить | BestMac",
  description: "Полное руководство по проверке MacBook перед покупкой б/у: аккумулятор, клавиатура, экран, корпус, гарантия и как избежать мошенничества.",
  alternates: { canonical: "/blog/proverka-macbook-pered-pokupkoi" },
};

export default function ProverkaPage() {
  return <ProverkaMacbookPeredPokupkoi />;
}
