"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, Upload, Sparkles, Loader2, X } from "lucide-react";

// Бэкенд (Express на Vercel). Переопределяется через NEXT_PUBLIC_API_BASE.
const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) ||
  "https://bestmac-avito-back.vercel.app";

const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024; // ~5 МБ на фото

type Pic = { media_type: string; data: string; preview: string };

type Extracted = {
  detected: boolean;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  condition: "A" | "B" | "C";
  batteryCycles: number;
  displayDefect: boolean;
  bodyDefect: boolean;
  hasBox: boolean;
  hasCharger: boolean;
  icloudBlocked: boolean;
  confidence: number;
  notes: string;
};

type Estimate = { base: number; priceMin: number; priceMax: number };

const CONDITION_LABEL: Record<string, string> = {
  A: "Идеальное",
  B: "Хорошее",
  C: "С дефектами",
};

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

const PhotoEstimate = () => {
  const [pics, setPics] = useState<Pic[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(Extracted & Partial<Estimate>) | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - pics.length;
    if (room <= 0) {
      toast.error(`Максимум ${MAX_IMAGES} фото`);
      return;
    }
    Array.from(files).slice(0, room).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Можно загружать только изображения");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`«${file.name}» больше 5 МБ`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        const m = url.match(/^data:(.*?);base64,(.*)$/);
        if (!m) return;
        setPics((prev) => [...prev, { media_type: m[1], data: m[2], preview: url }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePic = (i: number) => setPics((prev) => prev.filter((_, idx) => idx !== i));

  const estimate = async () => {
    if (pics.length === 0) {
      toast.error("Добавьте хотя бы одно фото");
      return;
    }
    setLoading(true);
    setResult(null);
    setSent(false);
    try {
      // 1) Vision-распознавание модели и состояния
      const visRes = await fetch(`${API_BASE}/api/estimate-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: pics.map(({ media_type, data }) => ({ media_type, data })) }),
      });

      if (visRes.status === 503) {
        toast.error("AI-оценка скоро заработает. Пока напишите в Telegram @romanmanro");
        return;
      }
      if (!visRes.ok) throw new Error(`vision ${visRes.status}`);
      const ex = (await visRes.json()) as Extracted;

      if (!ex.detected || !ex.model) {
        setResult(ex);
        toast.message("Не удалось точно определить модель — пришлите фото в Telegram, оценим вручную");
        return;
      }

      // 2) Цена через существующую логику на buyout.json
      let price: Estimate = { base: 0, priceMin: 0, priceMax: 0 };
      try {
        const pr = await fetch("/api/buyout/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ex),
        });
        if (pr.ok) price = (await pr.json()) as Estimate;
      } catch { /* цена опциональна */ }

      setResult({ ...ex, ...price });

      // аналитика
      if (typeof window !== "undefined" && (window as any).ym) {
        (window as any).ym(50006968, "reachGoal", "photo_estimate_done");
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка оценки. Попробуйте ещё раз или напишите в Telegram.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!name || !phone) {
      toast.error("Укажите имя и телефон");
      return;
    }
    setSending(true);
    try {
      const r = result;
      const priceStr =
        r && r.priceMin ? `${fmt(r.priceMin)} – ${fmt(r.priceMax || 0)}` : "по фото";
      const message = [
        `AI-оценка по фото`,
        r?.model && `Модель: ${r.model} ${r.cpu || ""} ${r.ram}/${r.storage}`.trim(),
        r && `Состояние: ${CONDITION_LABEL[r.condition] || r.condition}`,
        r?.batteryCycles ? `Циклы АКБ: ${r.batteryCycles}` : null,
        `Предв. цена: ${priceStr}`,
      ].filter(Boolean).join("\n");

      const res = await fetch(`${API_BASE}/api/submit-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message, type: "sell-photo" }),
      });
      if (!res.ok) throw new Error(`submit ${res.status}`);

      setSent(true);
      toast.success("Заявка отправлена! Свяжемся в течение 15 минут.");
      if (typeof window !== "undefined") {
        if ((window as any).gtag) (window as any).gtag("event", "lead_form_submit", { event_label: "sell-photo" });
        if ((window as any).ym) (window as any).ym(50006968, "reachGoal", "lead_form_submit");
      }
    } catch (e) {
      console.error(e);
      toast.error("Не удалось отправить. Напишите в Telegram @romanmanro.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-2xl font-bold">Оценка по фото за 30 секунд</h3>
      </div>
      <p className="text-muted-foreground mb-5">
        Загрузите 2–4 фото устройства и скриншот «Об этом Mac» — ИИ определит модель,
        состояние и назовёт цену выкупа.
      </p>

      {/* Загрузка */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Перетащите фото сюда или нажмите, чтобы выбрать ({pics.length}/{MAX_IMAGES})
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {pics.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {pics.map((p, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={p.preview} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
              <button
                onClick={(e) => { e.stopPropagation(); removePic(i); }}
                className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5"
                aria-label="Удалить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={estimate} disabled={loading || pics.length === 0} size="lg" className="w-full mt-5">
        {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Анализируем…</>)
                 : (<><Camera className="mr-2 h-4 w-4" />Оценить по фото</>)}
      </Button>

      {/* Результат */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-border p-5 bg-muted/40"
        >
          {result.detected && result.model ? (
            <>
              <p className="font-semibold text-lg">{result.model}</p>
              <p className="text-sm text-muted-foreground">
                {[result.cpu, result.ram && `${result.ram} ГБ`, result.storage && `${result.storage} ГБ`]
                  .filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm mt-1">
                Состояние: <b>{CONDITION_LABEL[result.condition] || result.condition}</b>
                {result.batteryCycles ? ` · ${result.batteryCycles} циклов` : ""}
                {result.icloudBlocked ? " · ⚠️ блокировка iCloud" : ""}
              </p>

              {result.priceMin ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Предварительная цена выкупа</p>
                  <p className="text-3xl md:text-4xl font-bold text-primary">
                    {fmt(result.priceMin)} – {fmt(result.priceMax || 0)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Точную цену назовём после короткого подтверждения.
                </p>
              )}

              {result.notes && (
                <p className="text-xs text-muted-foreground mt-3 italic">{result.notes}</p>
              )}

              {/* Захват контакта */}
              {sent ? (
                <p className="mt-5 text-primary font-medium">✓ Заявка принята — свяжемся в течение 15 минут.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="text-sm font-medium">Зафиксировать цену и получить точную оценку:</p>
                  <Input placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Телефон" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Button onClick={submit} disabled={sending} className="w-full">
                    {sending ? "Отправка…" : "Получить точную оценку"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="font-medium">Не удалось точно определить модель по этим фото.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Пришлите фото и скриншот «Об этом Mac» в{" "}
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Telegram</a>
                {" "}— оценим вручную за 5 минут.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default PhotoEstimate;
