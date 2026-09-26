import type { Metadata } from 'next';
import ArticlePage from '@/components/blog/ArticlePage';
import { articleBySlug } from '@/data/articles';

const article = articleBySlug('kak-sbrosit-macbook-do-zavodskih-nastroek')!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `/blog/${article.slug}` },
};

export default function Page() {
  return <ArticlePage article={article} />;
}
