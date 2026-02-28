import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqSchema } from "@/lib/schema";
import { Helmet } from "react-helmet-async";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
}

const FAQ = ({ items, title = "Часто задаваемые вопросы" }: FAQProps) => {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const schema = faqSchema(items);

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <>
      {schema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        </Helmet>
      )}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
          <div className="space-y-4">
            {items.map((item, index) => {
              const isOpen = openItems.includes(index);
              return (
                <div
                  key={index}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => toggleItem(index)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {/* Ответ ВСЕГДА в DOM для SEO/prerender, скрываем визуально через CSS */}
                  <div
                    className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
                    style={{
                      maxHeight: isOpen ? "500px" : "0px",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="px-6 pb-4">
                      <p className="text-muted-foreground">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;
