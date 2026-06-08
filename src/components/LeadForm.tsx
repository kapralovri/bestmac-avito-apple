"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, Phone, Mail } from "lucide-react";

// Бэкенд (Express на Vercel). Можно переопределить через NEXT_PUBLIC_API_BASE.
const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) ||
  "https://bestmac-avito-back.vercel.app";

interface LeadFormProps {
  title?: string;
  subtitle?: string;
  formType?: 'sell' | 'buy' | 'selection' | 'general';
}

const LeadForm = ({
  title = "Оставьте заявку",
  subtitle = "Мы свяжемся с вами в течение 15 минут",
  formType = 'general'
}: LeadFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    model: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);

    // Бэкенд /api/submit-request принимает { name, phone, message, type }.
    // Модель и email складываем в текст сообщения, чтобы ничего не потерять.
    const messageParts: string[] = [];
    if (formData.model) messageParts.push(`Модель: ${formData.model}`);
    if (formData.email) messageParts.push(`Email: ${formData.email}`);
    if (formData.message) messageParts.push(`Комментарий: ${formData.message}`);
    if (typeof window !== 'undefined') {
      messageParts.push(`Источник: ${window.location.pathname}`);
    }

    try {
      const response = await fetch(`${API_BASE}/api/submit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          message: messageParts.join('\n'),
          type: formType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded ${response.status}`);
      }

      toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');

      // Очистка формы
      setFormData({
        name: '',
        phone: '',
        email: '',
        model: '',
        message: ''
      });

      // Аналитику отправляем ТОЛЬКО после реально успешной заявки
      if (typeof window !== 'undefined') {
        // Google Analytics
        if ((window as any).gtag) {
          (window as any).gtag('event', 'lead_form_submit', {
            'event_category': 'Lead',
            'event_label': formType,
            'value': 1
          });
        }

        // Yandex Metrika
        if ((window as any).ym) {
          (window as any).ym(50006968, 'reachGoal', 'lead_form_submit');
        }
      }
    } catch (error) {
      console.error('Ошибка отправки формы:', error);
      toast.error('Не удалось отправить. Напишите в Telegram @romanmanro или позвоните +7 903 299-00-29.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border"
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl md:text-3xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Ваше имя *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full"
          />
        </div>

        <div>
          <Input
            type="tel"
            placeholder="Телефон *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="w-full"
          />
        </div>

        <div>
          <Input
            type="email"
            placeholder="Email (необязательно)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full"
          />
        </div>

        <div>
          <Select onValueChange={(value) => setFormData({ ...formData, model: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите модель (необязательно)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MacBook Air M1">MacBook Air M1</SelectItem>
              <SelectItem value="MacBook Air M2">MacBook Air M2</SelectItem>
              <SelectItem value="MacBook Air M3">MacBook Air M3</SelectItem>
              <SelectItem value="MacBook Pro 13">MacBook Pro 13"</SelectItem>
              <SelectItem value="MacBook Pro 14">MacBook Pro 14"</SelectItem>
              <SelectItem value="MacBook Pro 16">MacBook Pro 16"</SelectItem>
              <SelectItem value="iMac">iMac</SelectItem>
              <SelectItem value="Mac Mini">Mac Mini</SelectItem>
              <SelectItem value="iPhone">iPhone</SelectItem>
              <SelectItem value="Другое">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full min-h-[100px]"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Отправка..."
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Отправить заявку
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-4">
          <a href="tel:+79032990029" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
            +7 903 299-00-29
          </a>
          <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Mail className="h-4 w-4" />
            Telegram
          </a>
        </div>
      </form>
    </motion.div>
  );
};

export default LeadForm;
