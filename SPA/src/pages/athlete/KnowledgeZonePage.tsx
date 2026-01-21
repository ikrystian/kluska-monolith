import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Pencil, BookOpen, Layers } from 'lucide-react';

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
  createdAt: string; // serializable from hook
  updatedAt: string;
}

interface ArticleCategory {
  id: string;
  name: string;
}

interface ArticlesByCategory {
  [category: string]: Article[];
}

export default function KnowledgeZonePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'trainer' || user?.role === 'admin';

  const { data: categories, isLoading: categoriesLoading } = useCollection<ArticleCategory>('articleCategories');

  // Fetch only published articles for athlete view
  const { data: articles, isLoading: articlesLoading } = useCollection<Article>(
    'articles',
    {
      query: { status: 'published' },
      sort: { createdAt: -1 }
    }
  );

  const isLoading = articlesLoading || categoriesLoading;

  const articlesByCategory = useMemo(() => {
    if (!articles) return {};
    const groups: ArticlesByCategory = {};

    articles.forEach(article => {
      const categoryName = article.category || 'Bez kategorii';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(article);
    });

    return groups;
  }, [articles]);

  const orderedCategories = useMemo(() => {
    if (!categories) return Object.keys(articlesByCategory).sort();

    // Start with defined categories order
    const order = categories.map(c => c.name);

    // Add any categories found in articles that aren't in the defined list
    const presentCategories = Object.keys(articlesByCategory);
    presentCategories.forEach(cat => {
      if (!order.includes(cat)) {
        order.push(cat);
      }
    });

    return order.filter(cat => articlesByCategory[cat]?.length > 0);
  }, [categories, articlesByCategory]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Strefa Wiedzy
          </h1>
          <p className="text-muted-foreground mt-1">
            Baza artykułów, poradników i materiałów edukacyjnych.
          </p>
        </div>
        {canManage && (
          <Button asChild variant="outline">
            <Link to="/athlete/knowledge-zone/manage">
              <Pencil className="mr-2 h-4 w-4" />
              Zarządzaj Artykułami
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-12">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Card key={j} className="h-full">
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : orderedCategories.length > 0 ? (
        orderedCategories.map(categoryName => {
          const categoryArticles = articlesByCategory[categoryName];
          if (!categoryArticles?.length) return null;

          return (
            <section key={categoryName} className="mb-12">
              <div className="flex items-center gap-2 mb-6 pb-2 border-b">
                <Layers className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-headline text-2xl font-bold">{categoryName}</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categoryArticles.map(article => (
                  <Link to={`/athlete/knowledge-zone/${article.id}`} key={article.id} className="block group h-full">
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col border-muted group-hover:border-primary/50">
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        {article.coverImageUrl ? (
                          <img
                            src={article.coverImageUrl}
                            alt={article.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground/20">
                            <BookOpen className="h-16 w-16" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                            {article.category}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader className="pb-3">
                        <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-grow pb-3">
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {article.content.substring(0, 150)}...
                        </p>
                      </CardContent>

                      <CardFooter className="pt-0 text-xs text-muted-foreground flex justify-between items-center border-t bg-muted/20 py-3 mt-auto">
                        <span className="font-medium text-foreground">{article.authorName}</span>
                        <span>{format(new Date(article.createdAt), 'd MMM yyyy', { locale: pl })}</span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <div className="text-center py-16 bg-muted/10 rounded-lg border-2 border-dashed">
          <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Baza wiedzy jest pusta</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Nie ma jeszcze żadnych artykułów. Zajrzyj tu później!
          </p>
        </div>
      )}
    </div>
  );
}
