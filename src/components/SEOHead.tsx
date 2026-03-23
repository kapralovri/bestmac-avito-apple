// Server component — no 'use client'. Renders JSON-LD structured data in SSR HTML.
// title/description/canonical are handled by generateMetadata in each page.tsx

interface SEOHeadProps {
  title?: string
  description?: string
  canonical?: string
  schema?: object
  ogImage?: string
  keywords?: string
  noindex?: boolean
}

export default function SEOHead({ schema }: SEOHeadProps) {
  if (!schema) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
