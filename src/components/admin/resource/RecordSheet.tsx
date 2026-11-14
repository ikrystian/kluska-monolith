'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Copy, Info, Link2, Loader2, Save, Trash2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldInput } from '@/components/admin/resource/FieldInput';
import { resourceIcon } from '@/components/admin/resource/icons';
import { useToast } from '@/hooks/use-toast';
import {
  AdminRequestError,
  createAdminRecord,
  deleteAdminRecord,
  getPath,
  updateAdminRecord,
  useAdminRecord,
  useAdminSchema,
  type AdminRecord,
} from '@/lib/admin/client';
import { fieldLabel, getAdminResource, type AdminResource, type FieldMeta } from '@/lib/admin/resources';

type Values = Record<string, unknown>;

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

function initialValues(fields: FieldMeta[], record: AdminRecord | null, preset: Values): Values {
  const values: Values = {};
  for (const field of fields) {
    const stored = record ? getPath(record, field.path) : preset[field.path];
    if (stored !== undefined && stored !== null) values[field.path] = stored;
    else if (field.kind === 'boolean') values[field.path] = false;
    else if (field.kind === 'stringList' || field.kind === 'numberList') values[field.path] = [];
    else values[field.path] = null;
  }
  return values;
}

function splitFields(resource: AdminResource, fields: FieldMeta[], isCreate: boolean) {
  const visible = fields.filter((field) => !resource.fields?.[field.path]?.hidden);
  const lead = new Set([...resource.title, ...(resource.subtitle ? [resource.subtitle] : [])]);
  const main: FieldMeta[] = [];
  const rest: FieldMeta[] = [];
  const locked: FieldMeta[] = [];
  for (const field of visible) {
    if (field.readOnly) {
      // Nothing to show for a computed field of a record that does not exist yet.
      if (!isCreate) locked.push(field);
    } else if (field.required || lead.has(field.path) || resource.columns.includes(field.path)) main.push(field);
    else rest.push(field);
  }
  main.sort((a, b) => Number(lead.has(b.path)) - Number(lead.has(a.path)));
  return { main, rest, locked };
}

interface RecordSheetProps {
  resourceKey: string;
  /** `null` creates a new record. */
  recordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Values a new record starts with (e.g. the owner the list is filtered by). */
  preset?: Values;
  onSaved?: (record: AdminRecord) => void;
  onDeleted?: () => void;
}

/** Create / edit form of any admin resource, with its relations and raw data. */
export function RecordSheet({ resourceKey, recordId, open, onOpenChange, preset, onSaved, onDeleted }: RecordSheetProps) {
  const resource = getAdminResource(resourceKey);
  const { toast } = useToast();
  const { fields } = useAdminSchema(open ? resourceKey : null);
  const { data, isLoading, mutate } = useAdminRecord(open && recordId ? resourceKey : null, recordId, true);
  const record = recordId ? (data?.data ?? null) : null;
  const isCreate = !recordId;

  const [values, setValues] = useState<Values>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const ready = Boolean(fields) && (isCreate || Boolean(record));
  const loadedId = record?.id ?? null;
  const presetKey = JSON.stringify(preset ?? {});

  // (Re)fill the form when the sheet opens on another record — not on background refreshes, which would wipe edits.
  useEffect(() => {
    if (!open || !fields || (!isCreate && !record)) return;
    setValues(initialValues(fields, record, preset ?? {}));
    setDirty(new Set(isCreate ? Object.keys(preset ?? {}) : []));
    setErrors({});
    setLocalErrors({});
    setFormKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fields, loadedId, isCreate, presetKey]);

  const groups = useMemo(
    () => (resource && fields ? splitFields(resource, fields, isCreate) : null),
    [resource, fields, isCreate]
  );

  if (!resource) return null;
  const Icon = resourceIcon(resource.icon);
  const locked = resourceKey === 'auditLogs';

  const setValue = (path: string, value: unknown) => {
    setValues((current) => ({ ...current, [path]: value }));
    setDirty((current) => new Set(current).add(path));
    setErrors((current) => {
      if (!current[path]) return current;
      const { [path]: _removed, ...others } = current;
      return others;
    });
  };

  const setLocalError = (path: string, message: string | null) =>
    setLocalErrors((current) => {
      if ((current[path] ?? null) === message) return current;
      const { [path]: _removed, ...others } = current;
      return message ? { ...others, [path]: message } : others;
    });

  const save = async () => {
    if (!fields || saving) return;
    if (Object.keys(localErrors).length > 0) {
      toast({ title: 'Popraw zaznaczone pola', description: Object.values(localErrors)[0], variant: 'destructive' });
      return;
    }

    const body: Values = {};
    for (const field of fields) {
      if (field.readOnly) continue;
      const value = values[field.path];
      if (isCreate) {
        // Unset fields are left to the model's defaults.
        if (!isEmpty(value) || (field.kind === 'boolean' && dirty.has(field.path))) body[field.path] = value;
      } else if (dirty.has(field.path)) {
        body[field.path] = value;
      }
    }

    const missing = isCreate
      ? fields.filter((field) => field.required && !field.readOnly && isEmpty(body[field.path]) && field.kind !== 'boolean')
      : fields.filter((field) => field.required && dirty.has(field.path) && isEmpty(values[field.path]));
    // Some required fields are filled in by the server (e.g. a friendship's pair key).
    const blocking = missing.filter((field) => !(resource.readOnly ?? []).includes(field.path));
    if (blocking.length > 0) {
      setErrors(Object.fromEntries(blocking.map((field) => [field.path, 'To pole jest wymagane.'])));
      toast({
        title: 'Uzupełnij wymagane pola',
        description: blocking.map((field) => fieldLabel(resource, field.path)).join(', '),
        variant: 'destructive',
      });
      return;
    }

    if (!isCreate && Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const saved = isCreate
        ? await createAdminRecord(resourceKey, body)
        : await updateAdminRecord(resourceKey, recordId!, body);
      toast({ title: isCreate ? 'Utworzono' : 'Zapisano', description: `${resource.singular}: ${saved._label}` });
      void mutate();
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = error instanceof AdminRequestError ? error.fields : undefined;
      if (fieldErrors) setErrors(fieldErrors);
      toast({
        title: 'Nie udało się zapisać',
        description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!recordId) return;
    setDeleting(true);
    try {
      await deleteAdminRecord(resourceKey, recordId);
      toast({ title: 'Usunięto', description: `${resource.singular}: ${record?._label ?? ''}` });
      setConfirmDelete(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Nie udało się usunąć',
        description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderField = (field: FieldMeta) => {
    const message = errors[field.path] ?? localErrors[field.path];
    const help = resource.fields?.[field.path]?.help;
    const inline = field.kind === 'boolean';
    return (
      <div key={field.path} className={inline ? 'flex items-center justify-between gap-4' : 'space-y-1.5'}>
        <div className="min-w-0">
          <Label className={message ? 'text-destructive' : undefined}>
            {fieldLabel(resource, field.path)}
            {field.required && !field.readOnly && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          {inline && help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
        <FieldInput
          resource={resource}
          field={field}
          value={values[field.path]}
          onChange={(value) => setValue(field.path, value)}
          onLocalError={(text) => setLocalError(field.path, text)}
          invalid={Boolean(message)}
          isCreate={isCreate}
        />
        {!inline && help && <p className="text-xs text-muted-foreground">{help}</p>}
        {message && <p className="text-xs font-medium text-destructive">{message}</p>}
      </div>
    );
  };

  const relations = data?.relations ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 pr-12">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {isCreate ? `Nowy rekord: ${resource.singular.toLowerCase()}` : (record?._label ?? resource.singular)}
              </span>
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2 text-left">
              {resource.label}
              {recordId && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted/70"
                  onClick={() => {
                    void navigator.clipboard?.writeText(recordId);
                    toast({ title: 'Skopiowano ID' });
                  }}
                  title="Kopiuj ID"
                >
                  {recordId} <Copy className="h-3 w-3" />
                </button>
              )}
            </SheetDescription>
          </SheetHeader>

          {!ready || !groups ? (
            <div className="flex-1 space-y-4 p-6">
              {isLoading || !fields ? (
                Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)
              ) : (
                <p className="text-sm text-muted-foreground">Nie znaleziono rekordu — mógł zostać usunięty.</p>
              )}
            </div>
          ) : (
            <Tabs defaultValue="form" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-6 mt-4 w-fit">
                <TabsTrigger value="form">Dane</TabsTrigger>
                {!isCreate && (
                  <TabsTrigger value="relations">
                    Powiązania
                    {relations.length > 0 && (
                      <Badge variant="secondary" className="ml-2 px-1.5">
                        {relations.reduce((sum, relation) => sum + relation.count, 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                {!isCreate && <TabsTrigger value="json">JSON</TabsTrigger>}
              </TabsList>

              <TabsContent value="form" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div key={formKey} className="space-y-6">
                  {(resource.note || resource.page) && (
                    <div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        {resource.note && <p>{resource.note}</p>}
                        {resource.page && (
                          <p>
                            Ten zasób ma też wygodniejszy edytor:{' '}
                            <Link href={resource.page.href} className="font-medium text-foreground underline underline-offset-2">
                              {resource.page.label}
                            </Link>
                            .
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">{groups.main.map(renderField)}</div>

                  {groups.rest.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="border-b pb-1 text-sm font-semibold text-muted-foreground">Pozostałe pola</h3>
                      {groups.rest.map(renderField)}
                    </div>
                  )}

                  {groups.locked.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="border-b pb-1 text-sm font-semibold text-muted-foreground">
                        Tylko do odczytu (ustawia system)
                      </h3>
                      {groups.locked.map(renderField)}
                    </div>
                  )}
                </div>
              </TabsContent>

              {!isCreate && (
                <TabsContent value="relations" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  {relations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Żaden rekord w innych zasobach nie wskazuje na ten rekord.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Rekordy z innych zasobów, które wskazują na ten rekord. Kliknij, aby otworzyć przefiltrowaną listę.
                      </p>
                      {relations.map((relation) => {
                        const source = getAdminResource(relation.resource);
                        if (!source) return null;
                        const SourceIcon = resourceIcon(source.icon);
                        const href = `/admin/data/${relation.resource}?${new URLSearchParams({
                          [`f.${relation.field}`]: relation.value,
                        }).toString()}`;
                        return (
                          <Link
                            key={`${relation.resource}:${relation.field}`}
                            href={href}
                            className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                          >
                            <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{source.label}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Link2 className="h-3 w-3" /> pole: {fieldLabel(source, relation.field)}
                              </div>
                            </div>
                            <Badge variant="secondary">{relation.count}</Badge>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              )}

              {!isCreate && (
                <TabsContent value="json" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                </TabsContent>
              )}

              <div className="flex items-center justify-between gap-2 border-t px-6 py-3">
                {!isCreate && !locked ? (
                  <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Usuń
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {locked ? 'Zamknij' : 'Anuluj'}
                  </Button>
                  {!locked && (
                    <Button type="button" onClick={save} disabled={saving || (!isCreate && dirty.size === 0)}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isCreate ? 'Utwórz' : 'Zapisz zmiany'}
                    </Button>
                  )}
                </div>
              </div>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ten rekord?</AlertDialogTitle>
            <AlertDialogDescription>
              {resource.singular} „{record?._label}” zostanie trwale usunięty.
              {resourceKey === 'users' && ' Razem z kontem znikną wszystkie dane tej osoby: treningi, biegi, pomiary, rozmowy.'}
              {relations.length > 0 &&
                resourceKey !== 'users' &&
                ` Wskazuje na niego ${relations.reduce((sum, relation) => sum + relation.count, 0)} rekordów w innych zasobach — te powiązania przestaną działać.`}{' '}
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
