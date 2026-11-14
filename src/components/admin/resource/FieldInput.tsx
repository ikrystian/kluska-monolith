'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Plus, X } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RelationPicker } from '@/components/admin/resource/RelationPicker';
import { optionLabel, relationOf, type AdminResource, type FieldMeta } from '@/lib/admin/resources';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';

const NONE = '__none__';

/** ISO timestamp → the value of an `<input type="datetime-local">` in the browser's time zone. */
function toLocalInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ImagePreview({ url, className }: { url: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url) return null;
  return broken ? (
    <div className={cn('flex items-center justify-center rounded-md border bg-muted text-muted-foreground', className)}>
      <ImageOff className="h-5 w-5" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveStoredImageUrl(url)}
      alt=""
      className={cn('rounded-md border object-cover', className)}
      onError={() => setBroken(true)}
    />
  );
}

function ImageField({ value, onChange, disabled, onError }: { value: string; onChange: (value: string) => void; disabled?: boolean; onError: (message: string | null) => void }) {
  return (
    <div className="flex items-start gap-3">
      <ImagePreview url={value} className="h-20 w-20 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/upload-data/… albo https://…"
          disabled={disabled}
        />
        {!disabled && (
          <LocalUploadButton
            label="Prześlij plik"
            onComplete={(files) => {
              onError(null);
              if (files[0]) onChange(files[0].url);
            }}
            onError={(error) => onError(error.message)}
          />
        )}
      </div>
    </div>
  );
}

function ImagesField({ value, onChange, disabled, onError }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean; onError: (message: string | null) => void }) {
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="relative">
              <ImagePreview url={url} className="h-20 w-20" />
              {!disabled && (
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 shadow-sm"
                  onClick={() => onChange(value.filter((_, other) => other !== index))}
                  aria-label="Usuń zdjęcie"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <LocalUploadButton
          multiple
          label="Dodaj zdjęcia"
          onComplete={(files) => {
            onError(null);
            onChange([...value, ...files.map((file) => file.url)]);
          }}
          onError={(error) => onError(error.message)}
        />
      )}
    </div>
  );
}

function TagsField({ value, onChange, disabled, numeric }: { value: (string | number)[]; onChange: (value: (string | number)[]) => void; disabled?: boolean; numeric?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => (numeric ? Number(part.replace(',', '.')) : part))
      .filter((part) => !numeric || Number.isFinite(part as number));
    if (parts.length > 0) onChange([...value, ...parts]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((entry, index) => (
            <Badge key={`${entry}-${index}`} variant="secondary" className="gap-1 pr-1 font-normal">
              {String(entry)}
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  onClick={() => onChange(value.filter((_, other) => other !== index))}
                  aria-label={`Usuń ${entry}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={draft}
            inputMode={numeric ? 'decimal' : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="Wpisz i naciśnij Enter (kilka wartości oddziel przecinkiem)"
          />
          <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Dodaj">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function JsonField({ value, onChange, disabled, onError, hint }: { value: unknown; onChange: (value: unknown) => void; disabled?: boolean; onError: (message: string | null) => void; hint?: string }) {
  const [text, setText] = useState(() => (value === undefined || value === null ? '' : JSON.stringify(value, null, 2)));
  const [invalid, setInvalid] = useState(false);

  const update = (next: string) => {
    setText(next);
    if (next.trim() === '') {
      setInvalid(false);
      onError(null);
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(next);
      setInvalid(false);
      onError(null);
      onChange(parsed);
    } catch {
      setInvalid(true);
      onError('Nieprawidłowy JSON — popraw składnię, aby zapisać.');
    }
  };

  return (
    <div className="space-y-1.5">
      <Textarea
        value={text}
        onChange={(event) => update(event.target.value)}
        disabled={disabled}
        spellCheck={false}
        rows={Math.min(Math.max(text.split('\n').length, 4), 18)}
        className={cn('font-mono text-xs', invalid && 'border-destructive')}
        placeholder={hint}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export interface FieldInputProps {
  resource: AdminResource;
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Reports a problem only the input can see (broken JSON, failed upload); `null` clears it. */
  onLocalError: (message: string | null) => void;
  invalid?: boolean;
  isCreate: boolean;
}

/** The right control for one field of a record, chosen from its schema and the resource's overrides. */
export function FieldInput({ resource, field, value, onChange, onLocalError, invalid, isCreate }: FieldInputProps) {
  const override = resource.fields?.[field.path];
  const relation = relationOf(resource, field.path);
  const disabled = field.readOnly;
  const widget = override?.widget;
  // Decided once from the stored value: swapping the control while typing would drop focus.
  const [startedLong] = useState(() => typeof value === 'string' && (value.length > 120 || value.includes('\n')));

  if (relation && (field.kind === 'string' || field.kind === 'stringList')) {
    return (
      <RelationPicker
        relation={relation}
        multiple={field.kind === 'stringList'}
        value={value as string | string[] | null}
        onChange={onChange}
        disabled={disabled}
        invalid={invalid}
      />
    );
  }

  switch (field.kind) {
    case 'boolean':
      return <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />;

    case 'number':
      return (
        <Input
          type="number"
          step="any"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
          disabled={disabled}
          className={cn('max-w-xs', invalid && 'border-destructive')}
        />
      );

    case 'date':
      return (
        <Input
          type="datetime-local"
          value={toLocalInput(value)}
          onChange={(event) => onChange(fromLocalInput(event.target.value))}
          disabled={disabled}
          className={cn('max-w-xs', invalid && 'border-destructive')}
        />
      );

    case 'stringList': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      if (field.enum) {
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {field.enum.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={list.includes(option)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onChange(checked ? [...list, option] : list.filter((entry) => entry !== option))
                  }
                />
                {optionLabel(resource, field.path, option)}
              </label>
            ))}
          </div>
        );
      }
      if (widget === 'images') {
        return <ImagesField value={list} onChange={onChange} disabled={disabled} onError={onLocalError} />;
      }
      return <TagsField value={list} onChange={onChange} disabled={disabled} />;
    }

    case 'numberList':
      return (
        <TagsField value={Array.isArray(value) ? (value as number[]) : []} onChange={onChange} disabled={disabled} numeric />
      );

    case 'objectList':
    case 'json':
      return (
        <JsonField
          value={value}
          onChange={onChange}
          disabled={disabled}
          onError={onLocalError}
          hint={
            field.kind === 'objectList'
              ? `Lista obiektów (JSON). Pola elementu: ${field.itemFields?.join(', ') ?? '—'}.`
              : 'Dane w formacie JSON.'
          }
        />
      );

    default: {
      const text = value === null || value === undefined ? '' : String(value);

      if (field.enum) {
        return (
          <Select
            value={text || NONE}
            onValueChange={(next) => onChange(next === NONE ? null : next)}
            disabled={disabled}
          >
            <SelectTrigger className={cn('max-w-md', invalid && 'border-destructive')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!field.required && <SelectItem value={NONE}>— brak —</SelectItem>}
              {field.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {optionLabel(resource, field.path, option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (widget === 'image') {
        return <ImageField value={text} onChange={onChange} disabled={disabled} onError={onLocalError} />;
      }
      if (widget === 'richtext') {
        return disabled ? (
          <div className="prose prose-sm max-w-none rounded-md border p-3" dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
          <RichTextEditor value={text} onChange={onChange} />
        );
      }
      if (widget === 'password') {
        return (
          <Input
            type="password"
            autoComplete="new-password"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isCreate ? 'Minimum 8 znaków' : 'Bez zmian'}
            className={cn('max-w-md', invalid && 'border-destructive')}
          />
        );
      }
      if (widget === 'color') {
        return (
          <div className="flex max-w-xs items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(text) ? text : '#000000'}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              className="h-10 w-12 cursor-pointer rounded-md border bg-transparent p-1"
            />
            <Input value={text} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
          </div>
        );
      }
      if (widget === 'textarea' || startedLong) {
        return (
          <Textarea
            value={text}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            rows={Math.min(Math.max(Math.ceil(text.length / 90), 3), 12)}
            className={cn(invalid && 'border-destructive')}
          />
        );
      }
      return (
        <Input
          type={widget === 'url' ? 'url' : field.path === 'email' ? 'email' : 'text'}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={cn(invalid && 'border-destructive')}
        />
      );
    }
  }
}
