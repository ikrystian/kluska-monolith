'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Button } from '@/components/ui/button';
import { Edit, Loader2, PlusCircle, Trash2, Building2, DownloadCloud, ImageDown, Star, Globe, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { GymFormDialog } from '@/components/admin/GymFormDialog';
import { resolveStoredImageUrl } from '@/lib/upload';

/** Ile siłowni naraz sprawdza zbiorcze uzupełnianie logo — każda to osobne pobranie cudzej strony. */
const LOGO_BACKFILL_CONCURRENCY = 3;

/** API oddaje siłownie z `id`, a starsze odpowiedzi tylko z Mongo `_id`. */
const idOf = (gym: Gym) => gym.id || (gym as Gym & { _id?: string })._id!;

const importSchema = z.object({
  query: z.string().min(1, 'Fraza wyszukiwania jest wymagana.'),
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1, 'Strona musi być liczbą większą od 0.')).or(z.number().min(1)),
});

type ImportFormValues = z.infer<typeof importSchema>;

export default function GymsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [logoProgress, setLogoProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: gyms, isLoading, refetch: refetchGyms } = useCollection<Gym>('gyms');
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();

  // Siłownie ze stroną www, ale bez logo (np. zaimportowane, zanim logo zapisywano).
  const gymsWithoutLogo = (gyms ?? []).filter(gym => !gym.logoUrl && gym.website);

  const importForm = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      query: '',
      page: 1,
    }
  });

  const handleOpenDialog = (gym: Gym | null) => {
    setEditingGym(gym);
    setDialogOpen(true);
  };

  const handleDelete = async (gymId: string) => {
    try {
      await deleteDoc('gyms', gymId);
      toast({ title: 'Usunięto!', description: 'Siłownia została usunięta.', variant: 'destructive' });
      refetchGyms();
    } catch (e) {
      toast({ title: 'Błąd!', description: 'Nie udało się usunąć siłowni.', variant: 'destructive' });
    }
  };

  const handleImportSubmit = async (data: ImportFormValues) => {
    setIsImporting(true);
    try {
      const response = await fetch('/api/admin/gyms/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      toast({
        title: 'Import zakończony!',
        description: result.message || `Zaimportowano ${result.count} siłowni.`
      });
      setImportDialogOpen(false);
      importForm.reset();
      refetchGyms();
    } catch (error) {
      toast({ title: 'Błąd Importu', description: 'Nie udało się zaimportować danych.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBackfillLogos = async () => {
    const queue = [...gymsWithoutLogo];
    const total = queue.length;
    let done = 0;
    let found = 0;
    setLogoProgress({ done, total });

    const worker = async () => {
      for (let gym = queue.shift(); gym; gym = queue.shift()) {
        try {
          const response = await fetch('/api/admin/gyms/logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website: gym.website }),
          });
          const { logoUrl } = response.ok ? ((await response.json()) as { logoUrl: string | null }) : { logoUrl: null };
          if (logoUrl) {
            await updateDoc('gyms', idOf(gym), { logoUrl });
            found++;
          }
        } catch (e) {
          console.error(`Logo lookup failed for ${gym.name}`, e);
        }
        setLogoProgress({ done: ++done, total });
      }
    };

    await Promise.all(Array.from({ length: LOGO_BACKFILL_CONCURRENCY }, worker));
    setLogoProgress(null);
    refetchGyms();
    toast({
      title: 'Uzupełnianie logo zakończone',
      description: `Znaleziono logo dla ${found} z ${total} siłowni.`,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Zarządzanie Siłowniami</h1>
        <div className="flex flex-wrap gap-2">
          {gymsWithoutLogo.length > 0 && (
            <Button variant="outline" disabled={logoProgress !== null} onClick={handleBackfillLogos}>
              {logoProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageDown className="mr-2 h-4 w-4" />}
              {logoProgress ? `Szukam logo… ${logoProgress.done}/${logoProgress.total}` : `Uzupełnij logo (${gymsWithoutLogo.length})`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Dodaj z API
          </Button>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Dodaj Siłownię
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista Siłowni</CardTitle>
          <CardDescription>
            Zarządzaj listą dostępnych siłowni w systemie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa Siłowni</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Ocena</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : gyms?.map((gym: Gym) => (
                <TableRow key={idOf(gym)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                        {gym.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveStoredImageUrl(gym.logoUrl)} alt="" loading="lazy" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      {gym.name}
                    </div>
                  </TableCell>
                  <TableCell>{gym.address}</TableCell>
                  <TableCell>
                    {gym.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{gym.rating}</span>
                        {gym.ratingCount && <span className="text-xs text-muted-foreground">({gym.ratingCount})</span>}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {gym.phoneNumber && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3" /> {gym.phoneNumber}
                        </div>
                      )}
                      {gym.website && (
                        <a href={gym.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                          <Globe className="h-3 w-3" /> Strona www
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(gym)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(idOf(gym))}>
                      <Trash2 className="mr-2 h-3 w-3" />
                      Usuń
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && gyms?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Building2 className="h-12 w-12 mx-auto mb-4" />
                    <p>Brak siłowni w systemie. Dodaj pierwszą, aby zacząć.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <GymFormDialog open={isDialogOpen} onOpenChange={setDialogOpen} gym={editingGym} onSaved={refetchGyms} />

      <Dialog open={isImportDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importuj z API</DialogTitle>
            <DialogDescription>
              Wpisz zapytanie, aby pobrać listę siłowni z Google Maps (Serper API).
            </DialogDescription>
          </DialogHeader>
          <Form {...importForm}>
            <form onSubmit={importForm.handleSubmit(handleImportSubmit)} className="space-y-4">
              <FormField
                control={importForm.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fraza</FormLabel>
                    <FormControl><Input placeholder="np. siłownia lublin" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={importForm.control}
                name="page"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer strony</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isImporting}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isImporting}>
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importuj
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
