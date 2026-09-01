import { CheckCircle2 } from "lucide-react";

const DEFAULT_CHECKS = [
  "Включим монитор при вас и покажем изображение без битых пикселей, засветов и разводов",
  "Проверим равномерность подсветки на светлом и тёмном фоне",
  "Подключим по всем доступным портам (DisplayPort/HDMI/VGA — по наличию у модели)",
  "Проверим работу регулировки подставки (наклон, высота, поворот — согласно характеристикам модели)",
  "Покажем состояние корпуса и рамки — сколы, царапины, следы эксплуатации указываем честно",
  "Проверим порты USB-хаба на моделях, где он есть",
];

interface MonitorConditionBlockProps {
  checks?: string[];
  note?: string;
}

const MonitorConditionBlock = ({ checks = DEFAULT_CHECKS, note }: MonitorConditionBlockProps) => {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-4">Состояние и что проверим при вас</h2>
      <p className="text-muted-foreground mb-4">
        Это бывшие в эксплуатации офисные мониторы. Внешне — рабочие следы использования (лёгкие потёртости
        на корпусе возможны), матрица и электроника проверены. Никакой предоплаты: вы приезжаете на
        самовывоз, проверяете монитор вживую и только после этого платите.
      </p>
      <div className="bg-card rounded-lg border p-6">
        <ul className="space-y-3">
          {checks.map((check) => (
            <li key={check} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </div>
      {note && <p className="text-sm text-muted-foreground mt-4">{note}</p>}
    </section>
  );
};

export default MonitorConditionBlock;
