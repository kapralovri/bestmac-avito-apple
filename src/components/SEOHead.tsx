import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  schema?: object;
  ogImage?: string;
  keywords?: string;
}

const SEOHead = ({ 
  title, 
  description, 
  canonical, 
  schema, 
  ogImage = "/og-image.jpg",
  keywords 
}: SEOHeadProps) => {
  const baseUrl = "https://bestmac.ru";
  const location = useLocation();
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : `${baseUrl}${location.pathname}`;
  const ogUrl = fullCanonical;
  
  // Detect 404 pages and add noindex
  const is404 = title?.includes('404') || title?.includes('не найдена');

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {is404 && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:image" content={ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`} />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:site_name" content="BestMac" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`} />

      {/* Schema.org */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
