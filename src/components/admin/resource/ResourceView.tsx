'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RecordSheet } from '@/components/admin/resource/RecordSheet';
import { resourceIcon } from '@/components/admin/resource/icons';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminRecords,
  getPath,
  useAdminList,
  useAdminSchema,
  useLookupValues,
  type AdminRecord,
} from '@/lib/admin/client';
import {
  fieldLabel,
  getAdminResource,
  optionLabel,
  relationOf,
  type AdminResource,
  type FieldMeta,
  type RelationConfig,
} from '@/lib/admin/resources';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const ALL = '__all__';

const dateTime = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: unknown): string {
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? String(value) : dateTime.format(date);
}

/** Names of related records; every cell of a column shares one request for the whole page. */
function RelationCell({ relation, values, pageValues }: { relation: RelationConfig; values: string[]; pageValues: string[] }) {
  const { items, isLoading } = useLookupValues(relation.resource, pageValues, relation.valueField);
  if (values.length === 0) return <span className="text-muted-foreground">—</span>;
  const byValue = new Map(items.map((item) => [item.value, item]));
  const shown = values.slice(0, 2);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((value) => {
        const item = byValue.get(value);
        if (!item) {
          return (
            <span key={value} className="font-mono text-xs text-muted-foreground" title={value}>
              {isLoading ? '…' : value.length > 12 ? `…${value.slice(-6)}` : value}
            </span>
          );
        }
        return (
          <Link
            key={value}
            href={`/admin/data/${relation.resource}?record=${item.id}`}
            className="max-w-[14rem] truncate underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
            title={item.sublabel ? `${item.label} — ${item.sublabel}` : item.label}
          >
            {item.label}
          </Link>
        );
      })}
      {values.length > shown.length && <Badge variant="secondary">+{values.length - shown.length}</Badge>}
    </span>
  );
}

function Cell({ resource, field, path, record, pageValues }: { resource: AdminResource; field: FieldMeta | undefined; path: string; record: AdminRecord; pageValues: string[] }) {
  const value = getPath(record, path);
  const relation = relationOf(resource, path);
  const widget = resource.fields?.[path]?.widget;

  if (relation) {
    const values = (Array.isArray(value) ? value : value ? [value] : []).map(String);
    return <RelationCell relation={relation} values={values} pageValues={pageValues} />;
  }
  if (value === undefined || value === null || value === '') return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Tak' : 'Nie'}</Badge>;
  }
  if (field?.kind === 'date') return <span className="whitespace-nowrap tabular-nums">{formatDate(value)}</span>;
  if (widget === 'image' && typeof value === 'string') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolveStoredImageUrl(value)} alt="" className="h-9 w-9 rounded-md border object-cover" loading="lazy" />
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    if (value.every((entry) => typeof entry === 'string')) {
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).slice(0, 3).map((entry) => (
            <Badge key={entry} variant="secondary" className="font-normal">
              {optionLabel(resource, path, entry)}
            </Badge>
          ))}
          {value.length > 3 && <Badge variant="outline">+{value.length - 3}</Badge>}
        </span>
      );
    }
    return <span className="text-muted-foreground">{value.length} poz.</span>;
  }
  if (typeof value === 'number') {
    return <span className="tabular-nums">{Number.isInteger(value) ? value : Math.round(value * 100) / 100}</span>;
  }
  if (typeof value === 'object') return <span className="text-muted-foreground">{'{…}'}</span>;
  if (field?.enum) return <Badge variant="outline">{optionLabel(resource, path, String(value))}</Badge>;
  const text = String(value);
  return (
    <span className="block max-w-[18rem] truncate" title={text}>
      {text}
    </span>
  );
}

function FilterChip({ resource, path, value, onRemove }: { resource: AdminResource; path: string; value: string; onRemove: () => void }) {
  const relation = relationOf(resource, path);
  const { items } = useLookupValues(relation?.resource ?? null, relation ? [value] : [], relation?.valueField);
  const shown = relation ? (items[0]?.label ?? value) : optionLabel(resource, path, value);
  return (
    <Badge variant="secondary" className="gap-1 py-1 pr-1 font-normal">
      <span className="text-muted-foreground">{fieldLabel(resource, path)}:</span> {shown}
      <button type="button" className="rounded-full p-0.5 hover:bg-muted-foreground/20" onClick={onRemove} aria-label="Usuń filtr">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/** List, search, filters and editing of one admin resource. */
export function ResourceView({ resourceKey }: { resourceKey: string }) {
  const resource = getAdminResource(resourceKey);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [searchText, setSearchText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Filters live in the URL (`f.<field>=<value>`), so relation links and bookmarks can carry them.
  const urlFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('f.') && /^[A-Za-z0-9_.]+$/.test(key.slice(2))) filters[key.slice(2)] = value;
    });
    return filters;
  }, [searchParams]);
  const openRecordId = searchParams.get('record');

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const text = params.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    if (key.startsWith('f.')) setPage(1);
  };

  const { fields } = useAdminSchema(resource ? resourceKey : null);
  const fieldByPath = useMemo(() => new Map((fields ?? []).map((field) => [field.path, field])), [fields]);

  const filter = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(urlFilters)) {
      const kind = fieldByPath.get(path)?.kind;
      result[path] = kind === 'boolean' ? value === 'true' : kind === 'number' && value !== '' ? Number(value) : value;
    }
    return result;
  }, [urlFilters, fieldByPath]);

  const { data, error, isLoading, isValidating, mutate } = useAdminList(resource ? resourceKey : null, {
    q,
    filter,
    sort: sort?.field,
    dir: sort?.dir,
    page,
    limit: PAGE_SIZE,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => setSelected(new Set()), [resourceKey, page, q, searchParams]);

  // Quick filters: every choice field shown as a column, plus yes/no columns.
  const quickFilters = useMemo(
    () =>
      (fields ?? []).filter(
        (field) =>
          !relationOf(resource!, field.path) &&
          ((field.kind === 'string' && field.enum && (resource!.columns.includes(field.path) || field.path === 'status')) ||
            (field.kind === 'boolean' && resource!.columns.includes(field.path)))
      ),
    [fields, resource]
  );

  if (!resource) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <p className="text-muted-foreground">Nie ma takiego zasobu.</p>
        <Button asChild variant="link" className="px-0">
          <Link href="/admin/data">Wróć do listy zasobów</Link>
        </Button>
      </div>
    );
  }

  const Icon = resourceIcon(resource.icon);
  const locked = resourceKey === 'auditLogs';
  const canCreate = resource.canCreate !== false && !locked;
  const columns = resource.columns.filter((path) => path !== resource.title[0]);
  const titleIsRelation = Boolean(relationOf(resource, resource.title[0]));

  const pageValuesOf = (path: string) =>
    rows.flatMap((row) => {
      const value = getPath(row, path);
      return (Array.isArray(value) ? value : value ? [value] : []).map(String);
    });

  const toggleSort = (field: string) =>
    setSort((current) =>
      current?.field !== field ? { field, dir: 'asc' } : current.dir === 'asc' ? { field, dir: 'desc' } : null
    );

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const bulkDelete = async () => {
    setBulkBusy(true);
    try {
      const result = await deleteAdminRecords(resourceKey, Array.from(selected));
      toast({
        title: `Usunięto: ${result.deleted}`,
        description: result.failed.length > 0 ? `Nie usunięto ${result.failed.length}: ${result.failed[0].error}` : undefined,
        variant: result.failed.length > 0 ? 'destructive' : undefined,
      });
      setSelected(new Set());
      setConfirmBulk(false);
      void mutate();
    } catch (failure) {
      toast({
        title: 'Nie udało się usunąć',
        description: failure instanceof Error ? failure.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const SortIcon = sort?.dir === 'asc' ? ArrowUp : ArrowDown;
  const header = (path: string, label: string) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
      onClick={() => toggleSort(path)}
    >
      {label}
      {sort?.field === path && <SortIcon className="h-3 w-3" />}
    </button>
  );

  return (
    <div className="container mx-auto space-y-4 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link href="/admin/data" className="text-xs text-muted-foreground hover:underline">
            Wszystkie dane
          </Link>
          <h1 className="flex items-center gap-2 font-headline text-3xl font-bold">
            <Icon className="h-7 w-7 shrink-0 text-muted-foreground" />
            {resource.label}
          </h1>
          <p className="text-muted-foreground">{resource.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {resource.page && (
            <Button asChild variant="outline">
              <Link href={resource.page.href}>
                {resource.page.label} <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Dodaj
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={`Szukaj${resource.search.length ? `: ${resource.search.slice(0, 3).map((path) => fieldLabel(resource, path).toLowerCase()).join(', ')}` : ''}, osoba lub ID…`}
                className="pl-9"
              />
            </div>
            {quickFilters.map((field) => (
              <Select
                key={field.path}
                value={urlFilters[field.path] ?? ALL}
                onValueChange={(value) => setParam(`f.${field.path}`, value === ALL ? null : value)}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{fieldLabel(resource, field.path)}: wszystkie</SelectItem>
                  {field.kind === 'boolean' ? (
                    <>
                      <SelectItem value="true">{fieldLabel(resource, field.path)}: tak</SelectItem>
                      <SelectItem value="false">{fieldLabel(resource, field.path)}: nie</SelectItem>
                    </>
                  ) : (
                    field.enum!.map((option) => (
                      <SelectItem key={option} value={option}>
                        {optionLabel(resource, field.path, option)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ))}
          </div>

          {Object.keys(urlFilters).length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtry:</span>
              {Object.entries(urlFilters).map(([path, value]) => (
                <FilterChip key={path} resource={resource} path={path} value={value} onRemove={() => setParam(`f.${path}`, null)} />
              ))}
            </div>
          )}

          <div className="flex min-h-9 items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              {isLoading ? 'Wczytywanie…' : `${total.toLocaleString('pl-PL')} rekordów`}
              {isValidating && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            {selected.size > 0 && !locked && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmBulk(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Usuń zaznaczone ({selected.size})
              </Button>
            )}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Nie udało się wczytać danych.</p>
              <p className="text-muted-foreground">{error.message}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void mutate()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!locked && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())}
                          aria-label="Zaznacz wszystkie na stronie"
                        />
                      </TableHead>
                    )}
                    <TableHead>{titleIsRelation ? resource.singular : header(resource.title[0], resource.singular)}</TableHead>
                    {columns.map((path) => (
                      <TableHead key={path}>{header(path, fieldLabel(resource, path))}</TableHead>
                    ))}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 8 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={columns.length + 3}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 3} className="py-10 text-center text-muted-foreground">
                        {q || Object.keys(urlFilters).length > 0
                          ? 'Brak rekordów pasujących do wyszukiwania i filtrów.'
                          : 'Brak rekordów.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn('cursor-pointer', selected.has(row.id) && 'bg-muted/50')}
                      onClick={() => setParam('record', row.id)}
                    >
                      {!locked && (
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={(checked) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (checked) next.add(row.id);
                                else next.delete(row.id);
                                return next;
                              })
                            }
                            aria-label={`Zaznacz: ${row._label}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="max-w-[22rem]">
                        {titleIsRelation ? (
                          <RelationCell
                            relation={relationOf(resource, resource.title[0])!}
                            values={[String(getPath(row, resource.title[0]) ?? '')].filter(Boolean)}
                            pageValues={pageValuesOf(resource.title[0])}
                          />
                        ) : (
                          <div className="truncate font-medium" title={row._label}>
                            {row._label}
                          </div>
                        )}
                        {resource.subtitle && typeof getPath(row, resource.subtitle) === 'string' && (
                          <div className="truncate text-xs text-muted-foreground">
                            {String(getPath(row, resource.subtitle))}
                          </div>
                        )}
                      </TableCell>
                      {columns.map((path) => (
                        <TableCell key={path}>
                          <Cell
                            resource={resource}
                            field={fieldByPath.get(path)}
                            path={path}
                            record={row}
                            pageValues={relationOf(resource, path) ? pageValuesOf(path) : []}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label={`Otwórz: ${row._label}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">
                Strona {page} z {pages}
              </span>
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Poprzednia strona">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Następna strona">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordSheet
        resourceKey={resourceKey}
        recordId={creating ? null : openRecordId}
        open={creating || Boolean(openRecordId)}
        onOpenChange={(open) => {
          if (open) return;
          setCreating(false);
          if (openRecordId) setParam('record', null);
        }}
        preset={creating ? filter : undefined}
        onSaved={() => void mutate()}
        onDeleted={() => void mutate()}
      />

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {selected.size} rekordów?</AlertDialogTitle>
            <AlertDialogDescription>
              Zaznaczone rekordy ({resource.label.toLowerCase()}) zostaną trwale usunięte
              {resourceKey === 'users' ? ' razem ze wszystkimi danymi tych osób' : ''}. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkBusy}
              onClick={(event) => {
                event.preventDefault();
                void bulkDelete();
              }}
            >
              {bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
