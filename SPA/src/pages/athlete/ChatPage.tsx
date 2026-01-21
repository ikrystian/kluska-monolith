import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Czat</h1>
        <p className="text-muted-foreground">Komunikuj się z trenerem</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Czat</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center h-64 text-muted-foreground"><p>Czat zostanie zaimplementowany w przyszłej wersji.</p></div></CardContent>
      </Card>
    </div>
  );
}
