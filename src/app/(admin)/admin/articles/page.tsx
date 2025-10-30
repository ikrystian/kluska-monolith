'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCollection, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import type { Article, ArticleCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit, Trash2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const articleSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  content: z.string().min(1, 'Treść jest wymagana.'),
  category: z.string().min(1, 'Kategoria jest wymagana.'),
  status: z.enum(['draft', 'published']),
  authorName: z.string().min(1, "Nazwa autora jest wymagana."),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export default function ManageArticlesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const { data: articles, isLoading, refetch: refetchArticles } = useCollection<Article>('articles');
  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>('articleCategories');
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      status: 'draft',
      authorName: '',
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
        authorName: article.authorName,
      });
    } else {
      form.reset({ title: '', content: '', category: '', status: 'draft', authorName: '' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (data: ArticleFormValues) => {
    const { isSubmitting } = form.formState;
    if(isSubmitting) return;

    if (!editingArticle) return; // Should not happen in edit mode

    try {
      await updateDoc('articles', editingArticle.id || editingArticle._id, { ...data, updatedAt: new Date() });
      toast({ title: 'Sukces!', description: 'Artykuł został zaktualizowany.' });
      setDialogOpen(false);
      setEditingArticle(null);
      refetchArticles();
    } catch(e) {
        console.error(e);
        toast({
          title: "Błąd",
          description: "Nie udało się zaktualizować artykułu.",
          variant: "destructive"
        }));
    }
  };

  const handleDelete = async (articleId: string) => {
      try {
          await deleteDoc('articles', articleId);
          toast({ title: 'Usunięto!', description: 'Artykuł został usunięty.', variant: 'destructive'});
          refetchArticles();
      } catch(e) {
          toast({
            title: "Błąd",
            description: "Nie udało się usunąć artykułu.",
            variant: "destructive"
          });
      }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
       <Card>
          <CardHeader>
            <CardTitle className="font-headline">Zarządzaj Wszystkimi Artykułami</CardTitle>
            <CardDescription>Przeglądaj, edytuj i usuwaj wszystkie artykuły w systemie.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Autor</TableHead>
                        <TableHead>Kategoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Utworzenia</TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center">Ładowanie artykułów...</TableCell></TableRow>
                    ) : articles && articles.length > 0 ? (
                        articles.map((article: any) => (
                            <TableRow key={article._id || article.id}>
                                <TableCell className="font-medium">{article.title}</TableCell>
                                <TableCell>{article.authorName}</TableCell>
                                <TableCell>{article.category}</TableCell>
                                <TableCell>
                                    <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                                        {article.status === 'published' ? 'Opublikowany' : 'Szkic'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(article.createdAt), 'd MMM yyyy', {locale: pl})}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {article.status === 'published' && (
                                        <Button asChild variant="ghost" size="icon">
                                            <Link href={`/knowledge-zone/${article._id || article.id}`} target="_blank"><Eye className="h-4 w-4"/></Link>
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" onClick={() => openDialog(article)}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDelete(article._id || article.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                <p>Brak artykułów w systemie.</p>
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
            <DialogTitle className="font-headline">Edytuj Artykuł</DialogTitle>
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
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autor</FormLabel>
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
                          {categoriesLoading ? <SelectItem value="loading" disabled>Ładowanie...</SelectItem> : categories?.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                          ))}
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
                    <FormControl><Textarea {...field} rows={10} /></FormControl>
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
                  <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
