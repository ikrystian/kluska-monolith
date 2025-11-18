'use client';

import { useRouter } from 'next/navigation';
import { useCollection, useUser, useDoc, useCreateDoc } from '@/lib/db-hooks';
import { ArticleForm, ArticleFormValues } from '@/components/ArticleForm';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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

export default function NewArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { createDoc } = useCreateDoc();

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(
    'users',
    user?.uid || ''
  );

  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>(
    'articleCategories'
  );

  const handleSubmit = async (data: ArticleFormValues) => {
    if (!user || !userProfile) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany, aby utworzyć artykuł.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const articleData = {
        title: data.title,
        content: data.content,
        category: data.category,
        status: data.status,
        authorId: user.uid,
        authorName: userProfile.name || 'Anonimowy autor',
        coverImageUrl: data.coverImageUrl || `https://picsum.photos/seed/${encodeURIComponent(data.title)}/800/600`,
        imageHint: data.imageHint || data.title.split(' ').slice(0, 2).join(' ').toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createDoc('articles', articleData);

      toast({
        title: 'Sukces!',
        description: 'Artykuł został utworzony pomyślnie.',
      });

      router.push('/trainer/knowledge-zone/manage');
    } catch (error) {
      console.error('Error creating article:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć artykułu. Spróbuj ponownie.',
        variant: 'destructive',
      });
    }
  };

  if (profileLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <ArticleForm
      categories={categories}
      onSubmit={handleSubmit}
    />
  );
}
