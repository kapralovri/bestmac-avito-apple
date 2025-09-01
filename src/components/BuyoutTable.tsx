import { useEffect, useMemo, useState } from 'react';
import type { BuyoutRow } from '@/types/buyout';

const DEFAULT_LIMIT = 50;

const BuyoutTable = () => {
  const [rows, setRows] = useState<BuyoutRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'model' | 'basePrice'>('model');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/data/buyout.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BuyoutRow[]) => setRows(data))
      .catch(() => setRows([]));
  }, []);

  // Удаляем дубли по модель+RAM+SSD
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: BuyoutRow[] = [];
    for (const r of rows) {
      const key = `${r.model}|${r.ram || ''}|${r.storage || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byQuery = q
      ? deduped.filter(r =>
          r.model.toLowerCase().includes(q) ||
          (r.ram || '').toLowerCase().includes(q) ||
          (r.storage || '').toLowerCase().includes(q)
        )
      : deduped;
    const sorted = [...byQuery].sort((a, b) => {
      if (sortKey === 'model') {
        const cmp = a.model.localeCompare(b.model, 'ru');
        return sortDir === 'asc' ? cmp : -cmp;
      } else {
        const cmp = (a.basePrice - b.basePrice);
        return sortDir === 'asc' ? cmp : -cmp;
      }
    });
    return sorted;
  }, [deduped, search, sortKey, sortDir]);

  const list = showAll ? filtered : filtered.slice(0, DEFAULT_LIMIT);

  return (
    <section aria-labelledby="prices" className="mb-12">
      <h2 id="prices" className="text-2xl font-bold mb-2">Примерные цены выкупа MacBook в Москве</h2>
      <p className="text-muted-foreground mb-4">Цены ориентировочные, зависят от состояния и комплекта. Базовые цены из каталога.</p>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
        <input
          className="w-full md:w-1/2 border border-border rounded-md px-3 py-2 bg-background"
          placeholder="Поиск по модели, RAM или SSD"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Сортировка:</label>
          <select
            className="border border-border rounded-md px-2 py-1 bg-background"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
          >
            <option value="model">По модели</option>
            <option value="basePrice">По цене</option>
          </select>
          <button
            className="border border-border rounded-md px-2 py-1"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            aria-label="Переключить порядок"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
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
              <tr key={`${r.model}-${r.ram}-${r.storage}`} className="border-t border-border">
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
