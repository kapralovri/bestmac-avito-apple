import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { breadcrumbSchema } from "@/lib/schema";
import SEOHead from "./SEOHead";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  const schema = breadcrumbSchema(items);

  return (
    <>
      <SEOHead 
        title=""
        description=""
        schema={schema}
      />
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6" aria-label="Хлебные крошки">
        {items.map((item, index) => (
          <div key={item.url} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
            {index === items.length - 1 ? (
              <span className="text-foreground font-medium" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link 
                to={item.url} 
                className="hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </>
  );
};

export default Breadcrumbs;
