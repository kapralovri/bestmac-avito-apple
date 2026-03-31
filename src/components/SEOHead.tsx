"use client";

// DEPRECATED: SEO is now handled by Next.js Metadata API in each app/*/page.tsx
// This component is kept as a no-op for compatibility.

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  schema?: object;
  ogImage?: string;
  keywords?: string;
  noindex?: boolean;
}

const SEOHead = (_props: SEOHeadProps) => {
  return null;
};

export default SEOHead;
