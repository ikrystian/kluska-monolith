'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookOpen, Edit, ImageIcon, Megaphone, PlusCircle, ShoppingBag, Trash2, type LucideIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardPromoDialog } from '@/components/admin/DashboardPromoDialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/lib/db-hooks';
import {
  PROMO_AUDIENCE_LABEL,
  PROMO_TYPE_LABEL,
  SHOP_PRODUCT_OPTIONS,
  promoStatus,
  type DashboardPromoData,
  type PromoStatus,
  type PromoType,
} from '@/lib/dashboard-promos';
import { resolveStoredImageUrl } from '@/lib/upload';
import type { Article } from '@/lib/types';

const TYPE_ICON: Record<PromoType, LucideIcon> = {
  banner: ImageIcon,
  product: ShoppingBag,
  article: BookOpen,
  announcement: Megaphone,
};

const STATUS_LABEL: Record<PromoStatus, string> = {
  live: 'Wyświetlana',
  scheduled: 'Zaplanowana',
  ended: 'Zakończona',
  off: 'Wyłączona',
};

const STATUS_VARIANT: Record<PromoStatus, 'default' | 'secondary' | 'outline'> = {
  live: 'default',
  scheduled: 'secondary',
  ended: 'outline',
  off: 'outline',
};

const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: pl });

function scheduleLabel(promo: DashboardPromoData): string | null {
  if (promo.startsAt && promo.endsAt) return `${formatDate(promo.startsAt)} – ${formatDate(promo.endsAt)}`;
  if (promo.startsAt) return `od ${formatDate(promo.startsAt)}`;
  if (promo.endsAt) return `do ${formatDate(promo.endsAt)}`;
  return null;
}

export default function AdminHomeContentPage() {
  const { toast } = useToast();
  const [promos, setPromos] = useState<DashboardPromoData[] | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardPromoData | null>(null);
  const [toDelete, setToDelete] = useState<DashboardPromoData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: articles } = useCollection<Article>('articles', { status: 'published' }, { sort: { createdAt: -1 } });
  const articleOptions = useMemo(() => (articles ?? []).map((article) => ({ id: article.id, title: article.title })), [articles]);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard-promos');
      if (!response.ok) throw new Error('Failed to load');
      const data = (await response.json()) as { promos: DashboardPromoData[] };
      setPromos(data.promos);
    } catch {
      setPromos((current) => current ?? []);
      toast({ title: 'Błąd', description: 'Nie udało się pobrać treści.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** What the athlete will actually read on the card: the title, or the thing it recommends. */
  const subjectOf = (promo: DashboardPromoData): string => {
    if (promo.type === 'product') {
      return SHOP_PRODUCT_OPTIONS.find((product) => product.id === promo.productId)?.name ?? 'Nieznany produkt';
    }
    if (promo.type === 'article') {
      return articleOptions.find((article) => article.id === promo.articleId)?.title ?? 'Artykuł niedostępny (usunięty lub szkic)';
    }
    return promo.title;
  };

  const openDialog = (promo: DashboardPromoData | null) => {
    setEditing(promo);
    setDialogOpen(true);
  };

  const handleToggle = async (promo: DashboardPromoData, active: boolean) => {
    setBusyId(promo.id);
    try {
      const response = await fetch(`/api/admin/dashboard-promos/${promo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Nie udało się zapisać zmiany.');
      setPromos((current) => current?.map((other) => (other.id === promo.id ? (data.promo as DashboardPromoData) : other)) ?? null);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać zmiany.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const promo = toDelete;
    setToDelete(null);
    setBusyId(promo.id);
    try {
      const response = await fetch(`/api/admin/dashboard-promos/${promo.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setPromos((current) => current?.filter((other) => other.id !== promo.id) ?? null);
      toast({ title: 'Usunięto', description: `„${subjectOf(promo)}” nie wyświetla się już w aplikacji.` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się usunąć treści.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const nextOrder = promos?.length ? Math.max(...promos.map((promo) => promo.order)) + 1 : 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">Ekran główny</h1>
            <p className="text-sm text-muted-foreground">Treści, które sportowiec widzi na górze ekranu głównego, nad paskiem tygodnia.</p>
          </div>
        </div>
        <Button onClick={() => openDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj treść
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treści</CardTitle>
          <CardDescription>
            Jedna treść wyświetla się jako karta, kilka — jako rząd przesuwany palcem, w kolejności z tej listy (najwyżej pięć naraz).
            Zmiany pojawiają się w aplikacji najpóźniej po ok. 10 minutach, a od razu po jej ponownym uruchomieniu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Treść</TableHead>
                <TableHead>Rodzaj</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Odbiorcy</TableHead>
                <TableHead className="text-right">Kolejność</TableHead>
                <TableHead>Włączona</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos === null &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-10 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-5 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                  </TableRow>
                ))}

              {promos?.map((promo) => {
                const Icon = TYPE_ICON[promo.type];
                const status = promoStatus(promo);
                const schedule = scheduleLabel(promo);
                const subject = subjectOf(promo);

                return (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                          {promo.type === 'banner' && promo.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveStoredImageUrl(promo.imageUrl)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-xs truncate">{subject}</p>
                          {promo.text && <p className="max-w-xs truncate text-xs font-normal text-muted-foreground">{promo.text}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PROMO_TYPE_LABEL[promo.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                      {schedule && <p className="mt-1 text-xs text-muted-foreground">{schedule}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{PROMO_AUDIENCE_LABEL[promo.audience]}</TableCell>
                    <TableCell className="text-right tabular-nums">{promo.order}</TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Włączona: ${subject}`}
                        checked={promo.active}
                        disabled={busyId === promo.id}
                        onCheckedChange={(checked) => handleToggle(promo, checked)}
                      />
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap text-right">
                      <Button variant="outline" size="sm" onClick={() => openDialog(promo)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Edytuj
                      </Button>
                      <Button variant="destructive" size="sm" disabled={busyId === promo.id} onClick={() => setToDelete(promo)}>
                        <Trash2 className="mr-2 h-3 w-3" />
                        Usuń
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {promos?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Megaphone className="mx-auto mb-4 h-12 w-12" />
                    <p>Ekran główny nie ma jeszcze żadnych treści.</p>
                    <p className="mt-1 text-sm">Dodaj baner, polecany produkt, artykuł albo ogłoszenie.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DashboardPromoDialog
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        promo={editing}
        articles={articleOptions}
        nextOrder={nextOrder}
        onSaved={load}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć tę treść?</AlertDialogTitle>
            <AlertDialogDescription>
              „{toDelete ? subjectOf(toDelete) : ''}” zniknie z ekranu głównego wszystkich sportowców. Tej operacji nie można cofnąć —
              jeśli treść ma wrócić, lepiej ją wyłączyć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Usuń treść</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
