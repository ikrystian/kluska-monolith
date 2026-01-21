import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Kalendarz</h1>
        <p className="text-muted-foreground">Zarządzaj swoim harmonogramem treningów</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Twój kalendarz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Kalendarz zostanie zaimplementowany w przyszłej wersji.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
