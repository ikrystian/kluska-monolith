'use client';

import { useDoc } from '@/lib/db-hooks';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Article {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ArticlePage() {
  const { articleId } = useParams();
  const router = useRouter();

  const { data: article, isLoading } = useDoc<Article>('articles', articleId as string);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-96 w-full mb-6" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!article) {
    return <div className="text-center">Nie znaleziono artykułu.</div>;
  }

  return (
    <article className="max-w-4xl mx-auto">
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
      </Button>
      <div className="relative h-96 w-full overflow-hidden rounded-lg mb-6">
        <Image
          src={article.coverImageUrl || `https://picsum.photos/seed/${article.id}/800/600`}
          alt={article.title}
          fill
          className="object-cover"
        />
      </div>
      <header className="mb-8 text-center">
        <h1 className="font-headline text-4xl font-bold mb-2">{article.title}</h1>
        <p className="text-muted-foreground">
          Autor: {article.authorName} &bull; Opublikowano: {format(new Date(article.createdAt), 'd MMMM yyyy', { locale: pl })}
        </p>
      </header>
      <div className="prose prose-invert max-w-none prose-lg" dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
