import { useEffect, useState } from 'react';
import type { BuyoutRow } from '@/types/buyout';

const DEFAULT_LIMIT = 50;

const BuyoutTable = () => {
  const [rows, setRows] = useState<BuyoutRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/data/buyout.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BuyoutRow[]) => setRows(data))
      .catch(() => setRows([]));
  }, []);

  const list = showAll ? rows : rows.slice(0, DEFAULT_LIMIT);

  return (
    <section aria-labelledby="prices" className="mb-12">
      <h2 id="prices" className="text-2xl font-bold mb-2">Примерные цены выкупа MacBook в Москве</h2>
      <p className="text-muted-foreground mb-4">Цены ориентировочные, зависят от состояния и комплекта. Базовые цены из каталога.</p>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Модель</th>
              <th className="text-left p-3">Оперативная память</th>
              <th className="text-left p-3">SSD</th>
              <th className="text-left p-3">Базовая цена, ₽</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.model} className="border-t border-border">
                <td className="p-3"><strong>{r.model}</strong></td>
                <td className="p-3">{r.ram || '-'}</td>
                <td className="p-3">{r.storage || '-'}</td>
                <td className="p-3">{r.basePrice.toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > DEFAULT_LIMIT && (
        <div className="text-center mt-4">
          <button className="text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Скрыть' : 'Показать все модели'}
          </button>
        </div>
      )}
    </section>
  );
};

export default BuyoutTable;
