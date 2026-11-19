import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface FormPageLayoutProps {
    /** Dokąd prowadzi „Powrót do listy”. */
    backHref: string;
    title: string;
    description?: string;
    /** Dopóki dane się wczytują, zamiast treści pokazujemy szkielet. */
    isLoading?: boolean;
    /** Zamiast treści pokazujemy komunikat (nie znaleziono, brak dostępu, błąd). */
    error?: { title: string; message: string } | null;
    children?: ReactNode;
}

/**
 * Wspólna rama stron tworzenia i edycji w obu panelach: nagłówek z powrotem, szkielet ładowania i komunikat błędu.
 */
export function FormPageLayout({ backHref, title, description, isLoading, error, children }: FormPageLayoutProps) {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href={backHref}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>
                <h1 className="font-headline text-3xl font-bold">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>

            {isLoading ? (
                <Skeleton className="h-[600px] w-full" />
            ) : error ? (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive">{error.title}</h2>
                    <p className="text-muted-foreground">{error.message}</p>
                    <Button asChild className="mt-4">
                        <Link href={backHref}>Powrót do listy</Link>
                    </Button>
                </div>
            ) : (
                children
            )}
        </div>
    );
}
