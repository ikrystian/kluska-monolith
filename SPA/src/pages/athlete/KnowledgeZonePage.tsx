import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KnowledgeZonePage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">KnowledgeZone</h1>
        <p className="text-muted-foreground">Ta strona jest w trakcie implementacji</p>
      </div>
      <Card>
        <CardHeader><CardTitle>KnowledgeZone</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center h-64 text-muted-foreground"><p>Funkcjonalność zostanie zaimplementowana w przyszłej wersji.</p></div></CardContent>
      </Card>
    </div>
  );
}
