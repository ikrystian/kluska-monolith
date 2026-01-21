import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc, useUpdateDoc } from '@/hooks/useMutation';
import { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Pencil, Trash2, Plus, Search, FileText, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function KnowledgeManagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);

  // Fetch all articles without filtering by status to see drafts
  const { data: articles, isLoading } = useCollection<Article>(
    'articles',
    { sort: { createdAt: -1 } }
  );

  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteDoc('articles');
  const { mutate: updateArticle } = useUpdateDoc('articles');

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDeleteClick = (id: string) => {
    setArticleToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (articleToDelete) {
      deleteArticle(articleToDelete, {
        onSuccess: () => {
          toast.success('Artykuł został usunięty');
          setIsDeleteDialogOpen(false);
          setArticleToDelete(null);
        },
        onError: () => toast.error('Błąd usuwania artykułu')
      });
    }
  };

  const togglePublishStatus = (article: Article) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    updateArticle({
      id: article.id,
      data: { status: newStatus } as any
    }, {
      onSuccess: () => toast.success(`Status zmieniony na: ${newStatus === 'published' ? 'Opublikowany' : 'Szkic'}`),
      onError: () => toast.error('Błąd aktualizacji statusu')
    });
  };

  if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Brak dostępu</h1>
        <p className="text-muted-foreground mt-2">Tylko trenerzy i administratorzy mają dostęp do tej strony.</p>
        <Button className="mt-4" onClick={() => navigate('/athlete/dashboard')}>Wróć do Panelu</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/athlete/knowledge-zone')} className="mb-4 pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do Strefy Wiedzy
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold">Zarządzanie Treścią</h1>
            <p className="text-muted-foreground">Dodawaj, edytuj i usuwaj artykuły w bazie wiedzy.</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nowy Artykuł
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Artykuły ({filteredArticles.length})</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Szukaj artykułów..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArticles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {article.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={article.status === 'published' ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => togglePublishStatus(article)}
                      >
                        {article.status === 'published' ? 'Opublikowany' : 'Szkic'}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.authorName}</TableCell>
                    <TableCell>{format(new Date(article.createdAt), 'd MMM yyyy', { locale: pl })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/athlete/knowledge-zone/${article.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteClick(article.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nie znaleziono pasujących artykułów.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć ten artykuł?</DialogTitle>
            <DialogDescription>
              Tej operacji nie można cofnąć. Artykuł zostanie trwale usunięty z bazy danych.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Anuluj</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
