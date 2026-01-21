
import { useCollection } from '@/hooks/useCollection';
import { WorkoutTemplate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Calendar, Users, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function TemplatesPage() {
  // Fetch templates. In a real app we might want to filter public ones + own templates
  const { data: templates, isLoading } = useCollection<WorkoutTemplate>(
    'workoutTemplates',
    {
      sort: { usageCount: -1 } // Popular templates first
    }
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            Szablony Treningowe
          </h1>
          <p className="text-muted-foreground mt-1">
            Gotowe plany i zestawy ćwiczeń do szybkiego startu.
          </p>
        </div>
        <Button asChild>
          <Link to="/athlete/workouts/create">
            <Plus className="mr-2 h-4 w-4" />
            Stwórz Własny
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-headline text-xl">{template.name}</CardTitle>
                  {template.isPublic && <Badge variant="secondary">Publiczny</Badge>}
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {template.description || "Brak opisu"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Users className="h-4 w-4" />
                    <span>Użyty {template.usageCount} razy</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Dodano {format(new Date(template.createdAt), 'd MMM yyyy', { locale: pl })}</span>
                  </div>

                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-semibold text-foreground">Ćwiczenia ({template.exercises.length}):</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {template.exercises.slice(0, 3).map((ex, idx) => (
                        <li key={idx} className="truncate">{ex.exercise.name}</li>
                      ))}
                      {template.exercises.length > 3 && (
                        <li className="list-none text-xs italic opacity-70">
                          + {template.exercises.length - 3} więcej...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link to={`/athlete/log?templateId=${template.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Rozpocznij Trening
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/10 rounded-lg border-2 border-dashed">
          <Dumbbell className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Brak szablonów</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Nie znaleziono żadnych szablonów treningowych. Stwórz swój pierwszy szablon!
          </p>
          <Button asChild>
            <Link to="/athlete/workouts/create">Create Template</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
