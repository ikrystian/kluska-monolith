'use client';

import { useRouter } from 'next/navigation';
import { useCollection, useUser, useDoc, useUpdateDoc } from '@/lib/db-hooks';
import { ArticleForm, ArticleFormValues } from '@/components/ArticleForm';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { use } from 'react';

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

interface ArticleCategory {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { updateDoc } = useUpdateDoc();

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || '');
  const { data: article, isLoading: articleLoading } = useDoc<Article>('articles', id);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>(
    'articleCategories'
  );

  const handleSubmit = async (data: ArticleFormValues) => {
    if (!user || !article) {
      toast({
        title: 'Błąd',
        description: 'Nie można zaktualizować artykułu.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is the author
    if (article.authorId !== user.uid && userProfile?.role !== 'admin') {
      toast({
        title: 'Błąd',
        description: 'Nie masz uprawnień do edycji tego artykułu.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData = {
        title: data.title,
        content: data.content,
        category: data.category,
        status: data.status,
        coverImageUrl: data.coverImageUrl || article.coverImageUrl,
        imageHint: data.imageHint || article.imageHint,
        updatedAt: new Date(),
      };

      await updateDoc('articles', id, updateData);

      toast({
        title: 'Sukces!',
        description: 'Artykuł został zaktualizowany pomyślnie.',
      });

      router.push('/trainer/knowledge-zone/manage');
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować artykułu. Spróbuj ponownie.',
        variant: 'destructive',
      });
    }
  };

  if (articleLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Nie znaleziono artykułu.</p>
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Nie znaleziono kategorii artykułów.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Skontaktuj się z administratorem, aby dodać kategorie.
          </p>
        </div>
      </div>
    );
  }

  // Check permissions
  if (article.authorId !== user?.uid && userProfile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Nie masz uprawnień do edycji tego artykułu.</p>
        </div>
      </div>
    );
  }

  return (
    <ArticleForm
      article={article}
      categories={categories}
      onSubmit={handleSubmit}
    />
  );
}
