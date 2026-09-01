import Link from "next/link";
import { MONITORS } from "@/lib/monitors-data";
import { formatPriceRub } from "@/lib/monitors-data";
import { ArrowRight } from "lucide-react";

interface RelatedMonitorsProps {
  currentSlug: string;
}

const RelatedMonitors = ({ currentSlug }: RelatedMonitorsProps) => {
  const others = MONITORS.filter((m) => m.slug !== currentSlug);

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6">Другие мониторы в наличии</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {others.map((m) => (
          <Link
            key={m.slug}
            href={`/monitory/${m.slug}`}
            className="block border border-border rounded-lg p-4 hover:bg-muted transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-1">{m.brand}</p>
            <h3 className="font-semibold mb-1">{m.name}</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {m.diagonal}, {m.resolution}
            </p>
            <p className="font-semibold text-primary">{formatPriceRub(m.price)}</p>
          </Link>
        ))}
      </div>
      <Link href="/monitory" className="inline-flex items-center text-primary font-medium hover:underline">
        Смотреть все мониторы
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Link>
    </section>
  );
};

export default RelatedMonitors;
