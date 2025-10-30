'use client';

import { BookOpen } from 'lucide-react';

export default function KnowledgeZoneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Strefa Wiedzy</h1>
      </div>
      {children}
    </div>
  );
}
