import type { Metadata } from 'next';
import BlogIndex from '@/views/blog/BlogIndex';

export const metadata: Metadata = {
  title: 'Блог о технике Apple — советы и обзоры | BestMac',
  description: 'Полезные статьи о MacBook, iMac, iPhone. Советы по выбору, обзоры моделей, лайфхаки.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndexPage() {
  return <BlogIndex />;
}
