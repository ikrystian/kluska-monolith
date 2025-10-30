'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCollection, useUpdateDoc, useDeleteDoc, useCreateDoc } from '@/lib/db-hooks';
import type { Article, ArticleCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit, Trash2, Eye, PlusCircle, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

const categorySchema = z.object({
  name: z.string().min(1, 'Nazwa kategorii jest wymagana.').max(50, 'Nazwa nie może być dłuższa niż 50 znaków.'),
});

type ArticleFormValues = z.infer<typeof articleSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManageArticlesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ArticleCategory | null>(null);

  const { data: articles, isLoading, refetch: refetchArticles } = useCollection<Article>('articles');
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = useCollection<ArticleCategory>('articleCategories');
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();
  const { createDoc, isLoading: isCreating } = useCreateDoc();

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

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
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
      await updateDoc('articles', editingArticle.id, { ...data, updatedAt: new Date() });
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
        });
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
  };

  const openCategoryDialog = (category: ArticleCategory | null) => {
    setEditingCategory(category);
    if (category) {
      categoryForm.reset({
        name: category.name,
      });
    } else {
      categoryForm.reset({ name: '' });
    }
    setCategoryDialogOpen(true);
  };

  const onCategorySubmit = async (data: CategoryFormValues) => {
    if (isCreating || isUpdating) return;

    try {
      if (editingCategory) {
        // Update existing category
        await updateDoc('articleCategories', editingCategory.id, data);
        toast({
          title: 'Kategoria zaktualizowana!',
          description: `Kategoria "${data.name}" została pomyślnie zaktualizowana.`
        });
      } else {
        // Create new category
        await createDoc('articleCategories', data);
        toast({
          title: 'Kategoria utworzona!',
          description: `Kategoria "${data.name}" została pomyślnie dodana.`
        });
      }

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      refetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Błąd',
        description: editingCategory
          ? 'Nie udało się zaktualizować kategorii.'
          : 'Nie udało się utworzyć kategorii.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteDoc('articleCategories', categoryToDelete.id);
      toast({
        title: 'Kategoria usunięta!',
        description: `Kategoria "${categoryToDelete.name}" została pomyślnie usunięta.`,
        variant: 'destructive'
      });
      setCategoryToDelete(null);
      refetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kategorii.',
        variant: 'destructive'
      });
    }
  };

  const getArticleCount = (categoryName: string) => {
    return articles?.filter((article: any) => article.category === categoryName).length || 0;
  };

  const canDeleteCategory = (categoryName: string) => {
    return getArticleCount(categoryName) === 0;
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
       {/* Categories Section */}
       <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline">Kategorie Artykułów</CardTitle>
              <CardDescription>Zarządzaj kategoriami dla artykułów w strefie wiedzy.</CardDescription>
            </div>
            <Button onClick={() => openCategoryDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj Kategorię
            </Button>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category: ArticleCategory) => {
                  const articleCount = getArticleCount(category.name);
                  const canDelete = canDeleteCategory(category.name);

                  return (
                    <Card key={category.id} className="flex flex-col">
                      <CardContent className="pt-6 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">{category.name}</h3>
                        </div>
                        <Badge variant={articleCount > 0 ? "default" : "secondary"}>
                          {articleCount} {articleCount === 1 ? 'artykuł' : 'artykułów'}
                        </Badge>
                      </CardContent>
                      <CardContent className="pt-0 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCategoryDialog(category)}
                          disabled={isCreating || isUpdating}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edytuj
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!canDelete || isDeleting}
                              onClick={() => setCategoryToDelete(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Czy na pewno chcesz usunąć tę kategorię?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie kategorii
                                <span className="font-bold"> "{category.name}"</span>.
                                {!canDelete && (
                                  <span className="block mt-2 text-destructive font-medium">
                                    Uwaga: Nie możesz usunąć tej kategorii, ponieważ jest przypisana do {articleCount} artykułów.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
                                Anuluj
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteCategory}
                                disabled={!canDelete}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
                <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak kategorii</h3>
                <p className="text-muted-foreground mb-4">
                  Nie masz jeszcze żadnych kategorii artykułów. Dodaj pierwszą kategorię, aby zacząć.
                </p>
                <Button onClick={() => openCategoryDialog(null)} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Dodaj pierwszą kategorię
                </Button>
              </div>
            )}
          </CardContent>
       </Card>

       {/* Articles Section */}
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
                        articles.map((article: Article) => (
                            <TableRow key={article.id}>
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
                                            <Link href={`/knowledge-zone/${article.id}`} target="_blank"><Eye className="h-4 w-4"/></Link>
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
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                <p>Brak artykułów w systemie.</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
       </Card>

      {/* Edit Article Dialog */}
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

      {/* Create/Edit Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingCategory ? 'Edytuj Kategorię' : 'Dodaj Nową Kategorię'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Zaktualizuj nazwę kategorii artykułów.'
                : 'Wprowadź nazwę dla nowej kategorii artykułów.'
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa Kategorii</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="np. Trening siłowy, Odżywianie, Suplementy..."
                        {...field}
                        disabled={isCreating || isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isCreating || isUpdating}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? 'Zapisz zmiany' : 'Dodaj kategorię'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
