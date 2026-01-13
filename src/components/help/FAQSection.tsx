import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
}

export function FAQSection({ faqs }: FAQSectionProps) {
  // Group FAQs by category
  const groupedFAQs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      account: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      sponsorship: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      technical: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      billing: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      admin: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      games: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      events: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
      marketplace: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      bestie: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
      guardian: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      supporter: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      vendor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedFAQs).map(([category, categoryFAQs]) => (
        <div key={category}>
          <div className="mb-4">
            <Badge className={getCategoryBadgeColor(category)}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {categoryFAQs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
