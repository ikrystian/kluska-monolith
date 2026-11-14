'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Copy, Edit, Eye, MousePointerClick, Megaphone, Percent, PlusCircle, Radio, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdDialog } from '@/components/admin/ads/AdDialog';
import { useToast } from '@/hooks/use-toast';
import { adminFetch, deleteAdminRecord, updateAdminRecord, useAdminList } from '@/lib/admin/client';
import {
  AD_AUDIENCE_LABEL,
  AD_FORMAT_LABEL,
  AD_PLACEMENT_LABEL,
  AD_STATUS_LABEL,
  adCtr,
  adStatus,
  type AdData,
  type AdPlacement,
  type AdStatus,
} from '@/lib/ads';
import { resolveStoredImageUrl } from '@/lib/upload';

interface AdStats {
  days: { day: string; impressions: number; clicks: number }[];
  byPlacement: { placement: string; impressions: number; clicks: number }[];
  byAd: { adId: string; impressions: number; clicks: number }[];
  totals: { impressions: number; clicks: number };
}

const STATUS_VARIANT: Record<AdStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  live: 'default',
  scheduled: 'secondary',
  ended: 'outline',
  off: 'outline',
  exhausted: 'destructive',
};

const ALL_ADS = '__all__';
const number = (value: number) => value.toLocaleString('pl-PL');
const ctrText = (impressions: number, clicks: number) => {
  const ctr = adCtr(impressions, clicks);
  return ctr === null ? '—' : `${ctr.toLocaleString('pl-PL')}%`;
};
/** Polish plural: 2–4 „ekrany”, otherwise „ekranów” (12–14 included). */
const screensText = (count: number) => {
  const few = count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14);
  return `${count} ${few ? 'ekrany' : 'ekranów'}`;
};
const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: pl });

function schedule(ad: AdData): string {
  if (!ad.startsAt && !ad.endsAt) return 'Bez terminu';
  if (ad.startsAt && ad.endsAt) return `${formatDate(ad.startsAt)} – ${formatDate(ad.endsAt)}`;
  return ad.startsAt ? `od ${formatDate(ad.startsAt)}` : `do ${formatDate(ad.endsAt!)}`;
}

export default function AdminAdsPage() {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [statsAd, setStatsAd] = useState(ALL_ADS);
  const [dialog, setDialog] = useState<{ ad: AdData | null; isCopy: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<AdData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useAdminList('ads', { limit: 200 });
  const ads = (data?.data ?? []) as unknown as AdData[];

  const statsUrl = `/api/admin/ads/stats?days=${days}${statsAd !== ALL_ADS ? `&adId=${statsAd}` : ''}`;
  const { data: stats, mutate: mutateStats } = useSWR<AdStats>(statsUrl, adminFetch, { keepPreviousData: true });

  const liveCount = useMemo(() => ads.filter((ad) => adStatus(ad) === 'live').length, [ads]);
  const chartData = useMemo(
    () =>
      (stats?.days ?? []).map((day) => ({
        ...day,
        label: format(new Date(`${day.day}T12:00:00Z`), 'd MMM', { locale: pl }),
      })),
    [stats]
  );

  const refresh = () => {
    void mutate();
    void mutateStats();
  };

  const toggleActive = async (ad: AdData, active: boolean) => {
    setBusyId(ad.id);
    try {
      await updateAdminRecord('ads', ad.id, { active });
      await mutate();
    } catch (failure) {
      toast({
        title: 'Nie udało się zmienić stanu reklamy',
        description: failure instanceof Error ? failure.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await deleteAdminRecord('ads', toDelete.id);
      toast({ title: 'Reklama usunięta', description: toDelete.name });
      if (statsAd === toDelete.id) setStatsAd(ALL_ADS);
      setToDelete(null);
      refresh();
    } catch (failure) {
      toast({
        title: 'Nie udało się usunąć reklamy',
        description: failure instanceof Error ? failure.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const tiles = [
    { label: 'Wyświetlane teraz', value: `${liveCount} z ${ads.length}`, icon: Radio },
    { label: `Wyświetlenia (${days} dni)`, value: number(stats?.totals.impressions ?? 0), icon: Eye },
    { label: `Kliknięcia (${days} dni)`, value: number(stats?.totals.clicks ?? 0), icon: MousePointerClick },
    { label: 'CTR', value: ctrText(stats?.totals.impressions ?? 0, stats?.totals.clicks ?? 0), icon: Percent },
  ];

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Reklamy</h1>
          <p className="text-muted-foreground">
            Kreacje wyświetlane na ekranach aplikacji sportowca — z terminem, grupą odbiorców i statystykami.
          </p>
        </div>
        <Button onClick={() => setDialog({ ad: null, isCopy: false })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nowa reklama
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md bg-muted p-2">
                <tile.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-muted-foreground">{tile.label}</div>
                <div className="text-2xl font-bold tabular-nums">{tile.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Wyświetlenia i kliknięcia</CardTitle>
              <CardDescription>Dzień po dniu (czas UTC).</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statsAd} onValueChange={setStatsAd}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ADS}>Wszystkie reklamy</SelectItem>
                  {ads.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dni</SelectItem>
                  <SelectItem value="30">30 dni</SelectItem>
                  <SelectItem value="90">90 dni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.totals.impressions === 0 && stats.totals.clicks === 0 ? (
              <div className="grid h-64 place-items-center text-center text-sm text-muted-foreground">
                Brak danych w tym okresie. Statystyki pojawią się, gdy aplikacja wyświetli pierwszą reklamę.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} minTickGap={24} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        color: 'hsl(var(--popover-foreground))',
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="impressions" name="Wyświetlenia" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" name="Kliknięcia" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Według ekranu</CardTitle>
            <CardDescription>Gdzie reklamy są oglądane i klikane.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats ? (
              <Skeleton className="h-40 w-full" />
            ) : stats.byPlacement.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak danych w tym okresie.</p>
            ) : (
              stats.byPlacement.map((row) => {
                const share = stats.totals.impressions ? (row.impressions / stats.totals.impressions) * 100 : 0;
                return (
                  <div key={row.placement} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{AD_PLACEMENT_LABEL[row.placement as AdPlacement] ?? row.placement}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {number(row.impressions)} · CTR {ctrText(row.impressions, row.clicks)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, 2)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kampanie</CardTitle>
          <CardDescription>Liczniki przy reklamie są łączne, od jej utworzenia.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Nie udało się wczytać reklam.</p>
              <p className="text-muted-foreground">{error.message}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void mutate()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Nie ma jeszcze żadnej reklamy</p>
                <p className="text-sm text-muted-foreground">Dodaj pierwszą kreację i wybierz ekrany aplikacji, na których ma się pojawić.</p>
              </div>
              <Button onClick={() => setDialog({ ad: null, isCopy: false })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nowa reklama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reklama</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ekrany</TableHead>
                    <TableHead>Termin</TableHead>
                    <TableHead className="text-right">Wyświetlenia</TableHead>
                    <TableHead className="text-right">Kliknięcia</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>Włączona</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => {
                    const status = adStatus(ad);
                    return (
                      <TableRow key={ad.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {ad.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={resolveStoredImageUrl(ad.imageUrl)} alt="" className="h-10 w-10 shrink-0 rounded-md border object-cover" />
                            ) : (
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border bg-muted">
                                <Megaphone className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="max-w-[16rem] truncate font-medium">{ad.name}</div>
                              <div className="max-w-[16rem] truncate text-xs text-muted-foreground">
                                {[ad.advertiser, AD_FORMAT_LABEL[ad.format]?.split(' (')[0], AD_AUDIENCE_LABEL[ad.audience]]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[status]}>{AD_STATUS_LABEL[status]}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" title={ad.placements.map((placement) => AD_PLACEMENT_LABEL[placement]).join('\n')}>
                            {ad.placements.length === 0
                              ? '—'
                              : ad.placements.length <= 2
                                ? ad.placements.map((placement) => AD_PLACEMENT_LABEL[placement]?.split(' — ')[0]).join(', ')
                                : screensText(ad.placements.length)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{schedule(ad)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {number(ad.impressions)}
                          {ad.maxImpressions > 0 && <span className="text-muted-foreground"> / {number(ad.maxImpressions)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {number(ad.clicks)}
                          {ad.maxClicks > 0 && <span className="text-muted-foreground"> / {number(ad.maxClicks)}</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{ctrText(ad.impressions, ad.clicks)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={ad.active}
                            disabled={busyId === ad.id}
                            onCheckedChange={(checked) => void toggleActive(ad, checked)}
                            aria-label={`Włącz lub wyłącz: ${ad.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => setDialog({ ad, isCopy: false })} aria-label={`Edytuj: ${ad.name}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDialog({ ad, isCopy: true })} aria-label={`Powiel: ${ad.name}`}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(ad)} aria-label={`Usuń: ${ad.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        ad={dialog?.ad ?? null}
        isCopy={dialog?.isCopy}
        onSaved={refresh}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć reklamę?</AlertDialogTitle>
            <AlertDialogDescription>
              „{toDelete?.name}” zniknie z aplikacji razem ze swoimi statystykami. Jeśli chcesz zachować wyniki, zamiast
              usuwać — wyłącz ją. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
