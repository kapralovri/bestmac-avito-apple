import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { faqSchema } from "@/lib/schema";
import SEOHead from "./SEOHead";

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
      <SEOHead 
        title=""
        description=""
        schema={schema}
      />
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => toggleItem(index)}
                  aria-expanded={openItems.includes(index)}
                >
                  <span className="font-medium">{item.question}</span>
                  {openItems.includes(index) ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0" />
                  )}
                </button>
                {openItems.includes(index) && (
                  <div className="px-6 pb-4">
                    <p className="text-muted-foreground">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;
