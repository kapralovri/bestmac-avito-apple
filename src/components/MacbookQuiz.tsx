import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Home,
  Briefcase,
  Code,
  Palette,
  Gamepad2,
  GraduationCap,
  Globe,
  Bot,
  Monitor,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { loadAvitoPrices, formatPrice, formatSsd } from "@/lib/avito-prices";
import type { AvitoPriceStat } from "@/types/avito-prices";

/* ─── Types ─── */
type Mobility = "portable" | "home" | "any";

interface TaskOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  minRam: number;
  prefPro: boolean; // prefer Pro line
  weight: number;   // performance weight 1-3
}

type ScreenPref = "13" | "14-15" | "16" | "any";

interface QuizAnswers {
  mobility: Mobility | null;
  tasks: string[];
  screen: ScreenPref | null;
  budget: number[];
}

interface Recommendation {
  stat: AvitoPriceStat;
  score: number;
  reasons: string[];
  inBudget: boolean;
}

/* ─── Constants ─── */
const TASK_OPTIONS: TaskOption[] = [
  { id: "dev", label: "Разработка", icon: <Code className="w-5 h-5" />, minRam: 16, prefPro: true, weight: 3 },
  { id: "design", label: "Дизайн", icon: <Palette className="w-5 h-5" />, minRam: 16, prefPro: true, weight: 3 },
  { id: "ai", label: "AI / Vibe-кодинг", icon: <Bot className="w-5 h-5" />, minRam: 16, prefPro: true, weight: 3 },
  { id: "study", label: "Учёба", icon: <GraduationCap className="w-5 h-5" />, minRam: 8, prefPro: false, weight: 1 },
  { id: "web", label: "Веб-сёрфинг", icon: <Globe className="w-5 h-5" />, minRam: 8, prefPro: false, weight: 1 },
  { id: "entertainment", label: "Развлечения", icon: <Gamepad2 className="w-5 h-5" />, minRam: 8, prefPro: false, weight: 2 },
  { id: "office", label: "Офис / Работа", icon: <Briefcase className="w-5 h-5" />, minRam: 8, prefPro: false, weight: 1 },
];

const MOBILITY_OPTIONS: { value: Mobility; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "portable", label: "Ношу с собой", desc: "Лёгкий и компактный", icon: <Laptop className="w-6 h-6" /> },
  { value: "home", label: "Дома / в офисе", desc: "Максимум мощности", icon: <Home className="w-6 h-6" /> },
  { value: "any", label: "Без разницы", desc: "Любой вариант", icon: <Monitor className="w-6 h-6" /> },
];

const SCREEN_OPTIONS: { value: ScreenPref; label: string; desc: string }[] = [
  { value: "13", label: "13\"", desc: "Компактный" },
  { value: "14-15", label: "14–15\"", desc: "Универсальный" },
  { value: "16", label: "16\"", desc: "Максимум экрана" },
  { value: "any", label: "Без разницы", desc: "Любой размер" },
];

/* ─── Helpers ─── */
function getScreenSize(modelName: string): number {
  const m = modelName.match(/(\d{2})/);
  return m ? parseInt(m[1]) : 13;
}

function isPro(modelName: string): boolean {
  return modelName.toLowerCase().includes("pro");
}

function getChipGen(processor: string): number {
  const m = processor.match(/M(\d)/);
  return m ? parseInt(m[1]) : 1;
}

function scoreModel(stat: AvitoPriceStat, answers: QuizAnswers): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const screen = getScreenSize(stat.model_name);
  const pro = isPro(stat.model_name);
  const gen = getChipGen(stat.processor);

  const selectedTasks = TASK_OPTIONS.filter(t => answers.tasks.includes(t.id));
  const needsPro = selectedTasks.some(t => t.prefPro);
  const maxWeight = Math.max(...selectedTasks.map(t => t.weight), 1);
  const minRam = Math.max(...selectedTasks.map(t => t.minRam), 8);

  // RAM fit
  if (stat.ram >= minRam) {
    score += 20;
    reasons.push(`RAM ${stat.ram} ГБ — достаточно для ваших задач`);
  } else {
    score -= 10;
  }

  // Pro preference
  if (needsPro && pro) {
    score += 15;
    reasons.push("Pro-линейка — больше мощности для тяжёлых задач");
  } else if (!needsPro && !pro) {
    score += 10;
    reasons.push("Air — оптимальный баланс цены и производительности");
  }

  // Mobility
  if (answers.mobility === "portable") {
    if (screen <= 14 && !pro) { score += 10; }
    else if (screen <= 14) { score += 5; }
    if (screen <= 13) reasons.push("Компактный — удобно носить с собой");
  } else if (answers.mobility === "home") {
    if (screen >= 15) { score += 10; reasons.push("Большой экран для стационарного использования"); }
    if (pro) score += 5;
  }

  // Screen preference
  if (answers.screen !== "any") {
    if (answers.screen === "13" && screen === 13) score += 10;
    else if (answers.screen === "14-15" && screen >= 14 && screen <= 15) score += 10;
    else if (answers.screen === "16" && screen === 16) score += 10;
    else score -= 5;
  }

  // Performance weight — prefer newer chips for heavy tasks
  if (maxWeight >= 3) {
    score += gen * 5;
    if (gen >= 3) reasons.push(`Чип ${stat.processor} — высокая производительность`);
  }

  // SSD bonus
  if (stat.ssd >= 512) {
    score += 3;
  }
  if (stat.ssd >= 1024) {
    score += 2;
    reasons.push(`${formatSsd(stat.ssd)} накопитель — много места для файлов`);
  }

  // Freshness bonus
  score += gen * 2;

  return { score, reasons: reasons.slice(0, 3) };
}

function recommend(stats: AvitoPriceStat[], answers: QuizAnswers): Recommendation[] {
  const budget = answers.budget[0];

  // Deduplicate by model+processor+ram+ssd, keep freshest
  const uniqueKey = (s: AvitoPriceStat) => `${s.model_name}|${s.processor}|${s.ram}|${s.ssd}`;
  const map = new Map<string, AvitoPriceStat>();
  for (const s of stats) {
    const key = uniqueKey(s);
    if (!map.has(key) || s.samples_count > (map.get(key)!.samples_count)) {
      map.set(key, s);
    }
  }

  const unique = Array.from(map.values());
  const scored: Recommendation[] = unique.map(stat => {
    const { score, reasons } = scoreModel(stat, answers);
    const inBudget = stat.median_price <= budget;
    return { stat, score: inBudget ? score + 10 : score, reasons, inBudget };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top 3 in budget, + 1 out of budget if available
  const inBudget = scored.filter(r => r.inBudget).slice(0, 3);
  const outBudget = scored.filter(r => !r.inBudget).slice(0, 1);

  if (inBudget.length === 0) {
    // Nothing in budget — show top 3 overall
    return scored.slice(0, 3).map(r => ({ ...r, inBudget: false }));
  }

  return [...inBudget, ...outBudget].slice(0, 4);
}

/* ─── Component ─── */
const STEPS = ["mobility", "tasks", "screen", "budget"] as const;
type Step = typeof STEPS[number];

const MacbookQuiz = () => {
  const [step, setStep] = useState<number>(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    mobility: null,
    tasks: [],
    screen: null,
    budget: [80000],
  });
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [allStats, setAllStats] = useState<AvitoPriceStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvitoPrices().then(data => setAllStats(data.stats));
  }, []);

  const currentStep = STEPS[step];

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "mobility": return answers.mobility !== null;
      case "tasks": return answers.tasks.length > 0;
      case "screen": return answers.screen !== null;
      case "budget": return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Calculate results
      setLoading(true);
      setTimeout(() => {
        const recs = recommend(allStats, answers);
        setResults(recs);
        setLoading(false);
      }, 800);
    }
  };

  const handleBack = () => {
    if (results) {
      setResults(null);
      return;
    }
    if (step > 0) setStep(s => s - 1);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({ mobility: null, tasks: [], screen: null, budget: [80000] });
    setResults(null);
  };

  const toggleTask = (id: string) => {
    setAnswers(prev => ({
      ...prev,
      tasks: prev.tasks.includes(id)
        ? prev.tasks.filter(t => t !== id)
        : [...prev.tasks, id],
    }));
  };

  const stepTitles: Record<Step, string> = {
    mobility: "Нужна ли мобильность?",
    tasks: "Для каких задач?",
    screen: "Предпочтения по диагонали?",
    budget: "Желаемый бюджет",
  };

  return (
    <section className="mb-16">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-apple mb-3">
          <Sparkles className="inline w-7 h-7 mr-2 text-primary" />
          Какой MacBook подходит именно вам?
        </h2>
        <p className="text-muted-foreground text-lg">
          Ответьте на 4 вопроса — мы подберём оптимальную модель
        </p>
      </div>

      <Card className="max-w-2xl mx-auto overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Progress */}
          {!results && (
            <div className="flex gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Results ── */}
            {results ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h3 className="text-xl font-bold mb-4 text-center">
                  <CheckCircle className="inline w-5 h-5 mr-2 text-apple-green" />
                  Рекомендации для вас
                </h3>

                {results.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    К сожалению, не удалось подобрать подходящую модель. Свяжитесь с нами для индивидуальной консультации.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {results.map((rec, i) => (
                      <motion.div
                        key={`${rec.stat.model_name}-${rec.stat.ram}-${rec.stat.ssd}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className={`p-4 rounded-xl border transition-colors ${
                          i === 0
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base">{rec.stat.model_name}</span>
                              {i === 0 && (
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                  Лучший выбор
                                </Badge>
                              )}
                              {!rec.inBudget && (
                                <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                                  Выше бюджета
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {rec.stat.processor} · {rec.stat.ram} ГБ · {formatSsd(rec.stat.ssd)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-lg">{formatPrice(rec.stat.median_price)}</p>
                            <p className="text-xs text-muted-foreground">медиана рынка</p>
                          </div>
                        </div>

                        {rec.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {rec.reasons.map((r, j) => (
                              <span key={j} className="text-xs bg-secondary px-2 py-1 rounded-md text-muted-foreground">
                                {r}
                              </span>
                            ))}

                        </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button variant="outline" onClick={handleReset} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Пройти заново
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                    onClick={() => {
                      window.open("https://t.me/romanmanro", "_blank");
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Обсудить в Telegram
                  </Button>
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Подбираем идеальный MacBook…</p>
              </motion.div>
            ) : (
              /* ── Steps ── */
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <h3 className="text-xl font-semibold mb-5">{stepTitles[currentStep]}</h3>

                {/* Mobility */}
                {currentStep === "mobility" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {MOBILITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAnswers(prev => ({ ...prev, mobility: opt.value }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          answers.mobility === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="mb-2 text-primary">{opt.icon}</div>
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                {currentStep === "tasks" && (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">Выберите одну или несколько задач</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {TASK_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => toggleTask(opt.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            answers.tasks.includes(opt.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary">{opt.icon}</span>
                            <span className="font-medium text-sm">{opt.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Screen */}
                {currentStep === "screen" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SCREEN_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setAnswers(prev => ({ ...prev, screen: opt.value }))}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          answers.screen === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className="font-bold text-lg">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Budget */}
                {currentStep === "budget" && (
                  <div className="space-y-4">
                    <Slider
                      value={answers.budget}
                      onValueChange={(v) => setAnswers(prev => ({ ...prev, budget: v }))}
                      min={30000}
                      max={350000}
                      step={5000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>30 000 ₽</span>
                      <span className="font-bold text-foreground text-lg">
                        до {answers.budget[0].toLocaleString("ru-RU")} ₽
                      </span>
                      <span>350 000 ₽</span>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-8">
                  {step > 0 && (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Назад
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    {step === STEPS.length - 1 ? (
                      <>
                        Подобрать!
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Далее
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </section>
  );
};

export default MacbookQuiz;
