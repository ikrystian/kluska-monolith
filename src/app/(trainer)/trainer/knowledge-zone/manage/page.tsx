'use client';

import Link from 'next/link';
import { useCollection, useDoc, useUser, useDeleteDoc } from '@/lib/db-hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Library, Eye } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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

export default function ManageArticlesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();

  // Fetch user's articles
  const { data: articles, isLoading, refetch } = useCollection<Article>(
    'articles',
    user?.uid ? { authorId: user.uid } : undefined,
    { sort: { createdAt: -1 } }
  );

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
          <Button asChild>
            <Link href="/trainer/knowledge-zone/manage/new">
              <PlusCircle className="mr-2 h-4 w-4"/>
              Napisz Artykuł
            </Link>
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
                        <Button asChild variant="ghost" size="icon" title="Podgląd">
                          <Link href={`/trainer/knowledge-zone/${article.id}`} target="_blank">
                            <Eye className="h-4 w-4"/>
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="icon" title="Edytuj">
                        <Link href={`/trainer/knowledge-zone/manage/${article.id}/edit`}>
                          <Edit className="h-4 w-4"/>
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" title="Usuń">
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Czy na pewno chcesz usunąć ten artykuł?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ta operacja jest nieodwracalna. Artykuł &quot;{article.title}&quot; zostanie trwale usunięty.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(article.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
    </div>
  );
}
