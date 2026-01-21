'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
}

interface ArticleCategory {
  id: string;
  name: string;
}

interface ArticleFormProps {
  article?: Article;
  categories: ArticleCategory[];
  onSubmit: (data: ArticleFormValues) => Promise<void>;
  isLoading?: boolean;
}

const articleSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  content: z.string().min(10, 'Treść musi zawierać przynajmniej 10 znaków.'),
  category: z.string().min(1, 'Kategoria jest wymagana.'),
  status: z.enum(['draft', 'published']),
  coverImageUrl: z.string().url('Nieprawidłowy URL obrazu').optional().or(z.literal('')),
  imageHint: z.string().optional(),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;

export function ArticleForm({ article, categories, onSubmit, isLoading }: ArticleFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || '',
      content: article?.content || '',
      category: article?.category || '',
      status: article?.status || 'draft',
      coverImageUrl: article?.coverImageUrl || '',
      imageHint: article?.imageHint || '',
    },
  });

  const handleSubmit = async (data: ArticleFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas zapisywania artykułu.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/trainer/knowledge-zone/manage');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/trainer/knowledge-zone/manage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do listy artykułów
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            {article ? 'Edytuj Artykuł' : 'Napisz Nowy Artykuł'}
          </CardTitle>
          <CardDescription>
            {article
              ? 'Zaktualizuj informacje o swoim artykule.'
              : 'Podziel się swoją wiedzą ze społecznością.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tytuł artykułu</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Wprowadź tytuł artykułu..."
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz kategorię" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status publikacji</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Szkic</SelectItem>
                          <SelectItem value="published">Opublikowany</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Szkice są widoczne tylko dla Ciebie
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL obrazu okładki (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com/image.jpg"
                        type="url"
                      />
                    </FormControl>
                    <FormDescription>
                      Pozostaw puste, aby wygenerować obraz automatycznie
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Podpowiedź dla obrazu AI (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="np. trening siłowy, odżywianie sportowe..."
                      />
                    </FormControl>
                    <FormDescription>
                      Słowa kluczowe pomagające AI wygenerować odpowiedni obraz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treść artykułu</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Zacznij pisać swój artykuł..."
                      />
                    </FormControl>
                    <FormDescription>
                      Użyj paska narzędzi, aby formatować tekst. Przełącz się na podgląd, aby zobaczyć jak będzie wyglądał artykuł.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || isLoading}
                >
                  {(form.formState.isSubmitting || isLoading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {article ? 'Zapisz zmiany' : 'Opublikuj artykuł'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
