'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Panel Administratora</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Witaj w panelu administratora. Wybierz opcję z menu, aby zarządzać systemem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Strona w budowie. Tutaj będą wyświetlane statystyki i szybkie akcje.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
