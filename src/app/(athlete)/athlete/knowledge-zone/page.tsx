'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Article, ArticleCategory } from '@/lib/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';

interface ArticlesByCategory {
  [category: string]: Article[];
}

export default function KnowledgeZonePage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  const categoriesQuery = useMemoFirebase(
    () => query(collection(firestore, 'articleCategories')),
    [firestore]
  );
  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>(categoriesQuery);

  const articlesQuery = useMemoFirebase(
    () => query(collection(firestore, 'articles'), where('status', '==', 'published')),
    [firestore]
  );
  const { data: articles, isLoading: articlesLoading } = useCollection<Article>(articlesQuery);

  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'trainer';

  const articlesByCategory = useMemo(() => {
    if (!articles || !categories) return {};
    return articles.reduce((acc, article) => {
      const categoryName = article.category || 'Bez kategorii';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(article);
      return acc;
    }, {} as ArticlesByCategory);
  }, [articles, categories]);

  const isLoading = articlesLoading || categoriesLoading;
  const orderedCategories = categories?.map(c => c.name) || [];

  return (
    <div>
      <div className="mb-6 flex justify-end">
        {canManage && (
          <Button asChild>
            <Link href="/knowledge-zone/manage">
              <Pencil className="mr-2 h-4 w-4" />
              Zarządzaj Artykułami
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Card key={j}>
                    <Skeleton className="h-48 w-full" />
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : orderedCategories.map(categoryName => {
        const categoryArticles = articlesByCategory[categoryName];
        if (!categoryArticles || categoryArticles.length === 0) return null;

        return (
          <section key={categoryName} className="mb-12">
            <h2 className="font-headline text-2xl font-bold mb-4 border-b pb-2">{categoryName}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryArticles.map(article => (
                <Link href={`/knowledge-zone/${article.id}`} key={article.id}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg h-full flex flex-col">
                    <div className="relative h-48 w-full">
                      <Image
                        src={article.coverImageUrl || `https://picsum.photos/seed/${article.id}/400/300`}
                        alt={article.title}
                        fill
                        className="object-cover"
                        data-ai-hint={article.imageHint || 'fitness article'}
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="font-headline">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow"></CardContent>
                    <CardFooter className="flex justify-between text-sm text-muted-foreground">
                      <span>{article.authorName}</span>
                      <span>{format(article.createdAt.toDate(), 'd MMM yyyy', { locale: pl })}</span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {!isLoading && Object.keys(articlesByCategory).length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Brak artykułów w strefie wiedzy.</p>
        </div>
      )}
    </div>
  );
}
