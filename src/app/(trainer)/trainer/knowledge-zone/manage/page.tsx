'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser, collection, query, where, doc, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch } from '@/firebase';
import type { Article, ArticleCategory } from '@/lib/types';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const articleSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  content: z.string().min(1, 'Treść jest wymagana.'),
  category: z.string().min(1, 'Kategoria jest wymagana.'),
  status: z.enum(['draft', 'published']),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const sampleArticle = {
      title: "Wprowadzenie do Diety Ketogenicznej",
      content: "<h1>Czym jest dieta ketogeniczna?</h1><p>Dieta ketogeniczna, zwana inaczej dietą keto, to plan żywieniowy o bardzo niskiej zawartości węglowodanów i wysokiej zawartości tłuszczów, który zmusza organizm do spalania tłuszczu jako głównego źródła energii.</p><h2>Jak to działa?</h2><p>Poprzez drastyczne ograniczenie spożycia węglowodanów (zwykle poniżej 50 gramów dziennie), doprowadzasz organizm do stanu metabolicznego zwanego ketozą. W ketozie organizm staje się niezwykle wydajny w spalaniu tłuszczu na energię. W wątrobie tłuszcze są przekształcane w ketony, które mogą dostarczać energię dla mózgu.</p>",
      authorId: "admin-user-id", // Generic ID for seeding
      authorName: "Admin",
      category: "Odżywianie",
      createdAt: Timestamp.now(),
      status: "published",
      coverImageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxhdm9jYWRvfGVufDB8fHx8MTc2MDk2MjY3NHww&ixlib=rb-4.1.0&q=80&w=1080",
      imageHint: "avocado keto"
};

const sampleCategories = [
    { id: 'odzywianie', name: 'Odżywianie' },
    { id: 'trening-silowy', name: 'Trening Siłowy' },
    { id: 'regeneracja', name: 'Regeneracja' },
    { id: 'suplementacja', name: 'Suplementacja' },
];

export default function ManageArticlesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const allArticlesQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'articles') : null,
    [firestore]
  );
  
  const { data: allArticles, isLoading: allArticlesLoading } = useCollection<Article>(allArticlesQuery);

  const myArticlesQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'articles'), where('authorId', '==', user.uid)) : null,
    [firestore, user]
  );
  const { data: articles, isLoading } = useCollection<Article>(myArticlesQuery);
  
  const articleCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'articleCategories') : null, [firestore]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>(articleCategoriesRef);
  
  // Seed initial data if no articles and categories exist
  useEffect(() => {
    if (!allArticlesLoading && allArticles && allArticles.length === 0 && firestore) {
      const batch = writeBatch(firestore);
      
      const articlesRef = collection(firestore, 'articles');
      const sampleArticleWithId = doc(articlesRef);
      batch.set(sampleArticleWithId, {...sampleArticle, id: sampleArticleWithId.id});

      const categoriesRef = collection(firestore, 'articleCategories');
      sampleCategories.forEach(category => {
          const categoryRef = doc(categoriesRef, category.id);
          batch.set(categoryRef, category);
      });

      batch.commit();
    }
  }, [allArticles, allArticlesLoading, firestore]);

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
    if (!user) return;
    const { isSubmitting } = form.formState;
    if(isSubmitting) return;

    try {
      if (editingArticle) {
        // Update
        const articleRef = doc(firestore, 'articles', editingArticle.id);
        await updateDoc(articleRef, { ...data, updatedAt: Timestamp.now() });
        toast({ title: 'Sukces!', description: 'Artykuł został zaktualizowany.' });
      } else {
        // Create
        const articlesRef = collection(firestore, 'articles');
        const newArticleRef = doc(articlesRef);
        await setDoc(newArticleRef, {
          id: newArticleRef.id,
          ...data,
          authorId: user.uid,
          authorName: user.displayName || 'Anonimowy autor',
          createdAt: Timestamp.now(),
          coverImageUrl: `https://picsum.photos/seed/${new Date().getTime()}/800/600`,
          imageHint: data.title.split(' ').slice(0,2).join(' '),
        });
        toast({ title: 'Sukces!', description: 'Artykuł został utworzony.' });
      }
      setDialogOpen(false);
      setEditingArticle(null);
    } catch(e) {
        console.error(e);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'articles',
            operation: editingArticle ? 'update' : 'create',
            requestResourceData: data,
        }));
    }
  };
  
  const handleDelete = async (articleId: string) => {
      const articleRef = doc(firestore, 'articles', articleId);
      try {
          await deleteDoc(articleRef);
          toast({ title: 'Usunięto!', description: 'Artykuł został usunięty.', variant: 'destructive'});
      } catch(e) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: articleRef.path,
            operation: 'delete',
        }));
      }
  }

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
                                <TableCell>{format(article.createdAt.toDate(), 'd MMM yyyy', {locale: pl})}</TableCell>
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
            <DialogTitle className="font-headline">{editingArticle ? 'Edytuj Artykuł' : 'Napisz Nowy Artykuł'}</DialogTitle>
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
                  <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
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

    