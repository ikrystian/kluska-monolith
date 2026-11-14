'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronsUpDown, ExternalLink, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLookupSearch, useLookupValues, type LookupItem } from '@/lib/admin/client';
import { getAdminResource, type RelationConfig } from '@/lib/admin/resources';
import { cn } from '@/lib/utils';

function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface RelationPickerProps {
  relation: RelationConfig;
  /** One stored value, or a list of them when the relation is multiple. */
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * Picks records of another collection by name. The field keeps storing what
 * it always stored (an id, or e.g. a category name) — this only replaces
 * typing it by hand with a search.
 */
export function RelationPicker({ relation, value, onChange, multiple = false, disabled, invalid }: RelationPickerProps) {
  const target = getAdminResource(relation.resource);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const query = useDebounced(text.trim());

  const selected = (Array.isArray(value) ? value : value ? [value] : []).map(String);
  const { items: selectedItems } = useLookupValues(relation.resource, selected, relation.valueField);
  const { items: options, isLoading } = useLookupSearch(relation.resource, query, relation.valueField, open);
  const nameOf = new Map(selectedItems.map((item) => [item.value, item]));

  const toggle = (item: Pick<LookupItem, 'value'>) => {
    if (!multiple) {
      onChange(selected[0] === item.value ? null : item.value);
      setOpen(false);
      return;
    }
    onChange(selected.includes(item.value) ? selected.filter((entry) => entry !== item.value) : [...selected, item.value]);
  };

  const linkTo = (item: LookupItem | undefined) =>
    item ? `/admin/data/${relation.resource}?record=${item.id}` : undefined;

  const placeholder = `Wybierz: ${target?.singular.toLowerCase() ?? 'rekord'}…`;
  const single = !multiple ? selected[0] : undefined;
  const singleItem = single ? nameOf.get(single) : undefined;
  // A value that names no record (deleted target, or a keyword such as "public") is shown as it is stored.
  const typedIsNew = query.length > 0 && !options.some((option) => option.value === query || option.label === query);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                'h-auto min-h-10 w-full justify-between gap-2 whitespace-normal text-left font-normal',
                invalid && 'border-destructive'
              )}
            >
              <span className={cn('min-w-0 flex-1 truncate', !single && !multiple && 'text-muted-foreground')}>
                {multiple
                  ? selected.length > 0
                    ? `Wybrano: ${selected.length}`
                    : placeholder
                  : single
                    ? (singleItem?.label ?? single)
                    : placeholder}
                {singleItem?.sublabel && (
                  <span className="ml-2 text-xs text-muted-foreground">{singleItem.sublabel}</span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={text}
                onValueChange={setText}
                placeholder={`Szukaj: ${target?.label.toLowerCase() ?? ''}…`}
              />
              <CommandList>
                {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Szukam…
                  </div>
                )}
                {!isLoading && options.length === 0 && <CommandEmpty>Brak wyników.</CommandEmpty>}
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem key={option.id} value={option.id} onSelect={() => toggle(option)}>
                      <Check
                        className={cn('mr-2 h-4 w-4', selected.includes(option.value) ? 'opacity-100' : 'opacity-0')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.sublabel && (
                          <span className="block truncate text-xs text-muted-foreground">{option.sublabel}</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                  {typedIsNew && !isLoading && (
                    <CommandItem value={`__custom:${query}`} onSelect={() => toggle({ value: query })}>
                      <span className="text-muted-foreground">Użyj wpisanej wartości:</span>
                      <span className="ml-1 font-mono text-xs">{query}</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {!multiple && single && (
          <>
            {linkTo(singleItem) && (
              <Button type="button" variant="ghost" size="icon" asChild title="Otwórz powiązany rekord">
                <Link href={linkTo(singleItem)!} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {!disabled && (
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} title="Usuń powiązanie">
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((entry) => {
            const item = nameOf.get(entry);
            return (
              <Badge key={entry} variant="secondary" className="gap-1 pr-1 font-normal">
                {linkTo(item) ? (
                  <Link href={linkTo(item)!} target="_blank" className="hover:underline">
                    {item!.label}
                  </Link>
                ) : (
                  <span className="font-mono text-xs">{entry}</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => onChange(selected.filter((other) => other !== entry))}
                    aria-label={`Usuń ${item?.label ?? entry}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
