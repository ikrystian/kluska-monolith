import { useParams, useNavigate } from 'react-router-dom';
import { useDoc } from '@/hooks/useDoc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

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
  createdAt: string;
  updatedAt: string;
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: article, isLoading } = useDoc<Article>('articles', id ?? null);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Artykuł nie został znaleziony</h1>
        <p className="text-muted-foreground mb-8">
          Szukany artykuł nie istnieje lub został usunięty.
        </p>
        <Button onClick={() => navigate('/athlete/knowledge-zone')}>
          Powrót do Strefy Wiedzy
        </Button>
      </div>
    );
  }

  // Crude reading time estimate
  const wordCount = article.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/athlete/knowledge-zone')} className="pl-0 hover:pl-0 hover:bg-transparent -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy artykułów
        </Button>
      </div>

      {/* Header / Hero */}
      <div className="mb-8">
        {article.category && (
          <Badge className="mb-3 hover:bg-primary">
            {article.category}
          </Badge>
        )}

        <h1 className="font-headline text-3xl md:text-5xl font-bold leading-tight mb-6">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground border-b pb-8">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>{article.authorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{article.authorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(article.createdAt), 'd MMMM yyyy', { locale: pl })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{readingTime} min czytania</span>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {article.coverImageUrl && (
        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-xl overflow-hidden mb-10 shadow-md">
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <article className="prose prose-stone dark:prose-invert max-w-none lg:prose-lg pb-12">
        <div className="whitespace-pre-wrap leading-relaxed">
          {article.content}
        </div>
      </article>

      <Separator className="my-8" />

      {/* Footer / More */}
      <div className="flex justify-between items-center bg-muted/30 p-6 rounded-lg">
        <div>
          <h3 className="font-semibold mb-1">Podobał Ci się ten artykuł?</h3>
          <p className="text-sm text-muted-foreground">Sprawdź inne materiały w tej kategorii.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/athlete/knowledge-zone')}>
          Zobacz więcej
        </Button>
      </div>
    </div>
  );
}
