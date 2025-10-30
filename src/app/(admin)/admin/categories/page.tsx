'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import type { ArticleCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit, Trash2, PlusCircle, Tag } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const categorySchema = z.object({
  name: z.string().min(1, 'Nazwa kategorii jest wymagana.').max(50, 'Nazwa nie może być dłuższa niż 50 znaków.'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManageCategoriesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ArticleCategory | null>(null);

  const { data: categories, isLoading, refetch: refetchCategories } = useCollection<ArticleCategory>('articleCategories');
  const { data: articles } = useCollection('articles');
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    },
  });

  const isSubmitting = isCreating || isUpdating;

  const openDialog = (category: ArticleCategory | null) => {
    setEditingCategory(category);
    if (category) {
      form.reset({
        name: category.name,
      });
    } else {
      form.reset({ name: '' });
    }
    setDialogOpen(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    if (isSubmitting) return;

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

      setDialogOpen(false);
      setEditingCategory(null);
      form.reset();
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

  const handleDelete = async () => {
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
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Zarządzaj Kategoriami Artykułów</h1>
          <p className="text-muted-foreground">Dodawaj, edytuj i usuwaj kategorie dla artykułów w strefie wiedzy.</p>
        </div>
        <Button onClick={() => openDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj Kategorię
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Lista Kategorii</CardTitle>
          <CardDescription>
            Wszystkie dostępne kategorie artykułów wraz z liczbą przypisanych artykułów.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa Kategorii</TableHead>
                  <TableHead>Liczba Artykułów</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: ArticleCategory) => {
                  const articleCount = getArticleCount(category.name);
                  const canDelete = canDeleteCategory(category.name);

                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={articleCount > 0 ? "default" : "secondary"}>
                          {articleCount} {articleCount === 1 ? 'artykuł' : 'artykułów'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDialog(category)}
                            disabled={isSubmitting}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
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
                                  onClick={handleDelete}
                                  disabled={!canDelete}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-headline text-xl font-semibold mb-2">Brak kategorii</h3>
              <p className="text-muted-foreground mb-4">
                Nie masz jeszcze żadnych kategorii artykułów. Dodaj pierwszą kategorię, aby zacząć.
              </p>
              <Button onClick={() => openDialog(null)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Dodaj pierwszą kategorię
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa Kategorii</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="np. Trening siłowy, Odżywianie, Suplementy..."
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
