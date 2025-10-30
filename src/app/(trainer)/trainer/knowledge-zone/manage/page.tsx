'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCollection, useDoc, useUser, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Loader2, Edit, Trash2, Library, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const articleSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  content: z.string().min(1, 'Treść jest wymagana.'),
  category: z.string().min(1, 'Kategoria jest wymagana.'),
  status: z.enum(['draft', 'published']),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export default function ManageArticlesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || '');

  // Fetch user's articles
  const { data: articles, isLoading, refetch } = useCollection<Article>(
    'articles',
    user?.uid ? { authorId: user.uid } : undefined,
    { sort: { createdAt: -1 } }
  );

  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>('articleCategories');

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      status: 'draft',
    },
  });

  const openDialog = (article: Article | null) => {
    setEditingArticle(article);
    if (article) {
      form.reset({
        title: article.title,
        content: article.content,
        category: article.category,
        status: article.status,
      });
    } else {
      form.reset({ title: '', content: '', category: '', status: 'draft' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (data: ArticleFormValues) => {
    if (!user || !userProfile) return;

    try {
      if (editingArticle) {
        // Update existing article
        await updateDoc('articles', editingArticle.id, {
          ...data,
          updatedAt: new Date(),
        });
        toast({ title: 'Sukces!', description: 'Artykuł został zaktualizowany.' });
      } else {
        // Create new article
        await createDoc('articles', {
          ...data,
          authorId: user.uid,
          authorName: userProfile.name || 'Anonimowy autor',
          createdAt: new Date(),
          updatedAt: new Date(),
          coverImageUrl: `https://picsum.photos/seed/${encodeURIComponent(data.title)}/800/600`,
          imageHint: data.title.split(' ').slice(0, 2).join(' ').toLowerCase(),
        });
        toast({ title: 'Sukces!', description: 'Artykuł został utworzony.' });
      }

      setDialogOpen(false);
      setEditingArticle(null);
      refetch();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Błąd',
        description: editingArticle
          ? 'Nie udało się zaktualizować artykułu.'
          : 'Nie udało się utworzyć artykułu.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (articleId: string) => {
    try {
      await deleteDoc('articles', articleId);
      toast({
        title: 'Usunięto!',
        description: 'Artykuł został usunięty.',
        variant: 'destructive'
      });
      refetch();
    } catch (e) {
      console.error(e);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć artykułu.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Zarządzaj Artykułami</CardTitle>
            <CardDescription>Twórz, edytuj i publikuj swoje artykuły dla społeczności.</CardDescription>
          </div>
          <Button onClick={() => openDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4"/>
            Napisz Artykuł
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Utworzenia</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Ładowanie...</TableCell></TableRow>
              ) : articles && articles.length > 0 ? (
                articles.map(article => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>{article.category}</TableCell>
                    <TableCell>
                      <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                        {article.status === 'published' ? 'Opublikowany' : 'Szkic'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(article.createdAt), 'd MMM yyyy', { locale: pl })}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {article.status === 'published' && (
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/trainer/knowledge-zone/${article.id}`} target="_blank">
                            <Eye className="h-4 w-4"/>
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="icon" onClick={() => openDialog(article)}>
                        <Edit className="h-4 w-4"/>
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(article.id)}>
                        <Trash2 className="h-4 w-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Library className="h-12 w-12 mx-auto mb-4"/>
                    <p>Nie masz jeszcze żadnych artykułów.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingArticle ? 'Edytuj Artykuł' : 'Napisz Nowy Artykuł'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tytuł</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz kategorię"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>Ładowanie...</SelectItem>
                        ) : (
                          categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treść (obsługuje HTML)</FormLabel>
                    <FormControl><Textarea {...field} rows={15} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz status"/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Szkic</SelectItem>
                        <SelectItem value="published">Opublikowany</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
