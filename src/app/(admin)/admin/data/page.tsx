'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { resourceIcon } from '@/components/admin/resource/icons';
import { adminFetch } from '@/lib/admin/client';
import { ADMIN_GROUPS, ADMIN_RESOURCES } from '@/lib/admin/resources';

/** Index of every collection the panel manages, grouped by area, with record counts. */
export default function AdminDataPage() {
  const [query, setQuery] = useState('');
  const { data } = useSWR<{ counts: Record<string, number> }>('/api/admin/resources', adminFetch);

  const groups = useMemo(() => {
    const text = query.trim().toLowerCase();
    return ADMIN_GROUPS.map((group) => ({
      ...group,
      resources: ADMIN_RESOURCES.filter(
        (resource) =>
          resource.group === group.key &&
          (!text ||
            resource.label.toLowerCase().includes(text) ||
            resource.description.toLowerCase().includes(text) ||
            resource.key.toLowerCase().includes(text))
      ),
    })).filter((group) => group.resources.length > 0);
  }, [query]);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Wszystkie dane</h1>
          <p className="text-muted-foreground">
            Każdy zasób systemu w jednym miejscu: przeglądaj, dodawaj, edytuj i usuwaj rekordy oraz ich powiązania.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj zasobu…"
            className="pl-9"
          />
        </div>
      </div>

      {groups.length === 0 && <p className="text-muted-foreground">Żaden zasób nie pasuje do „{query}”.</p>}

      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div>
            <h2 className="font-headline text-xl font-semibold">{group.label}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.resources.map((resource) => {
              const Icon = resourceIcon(resource.icon);
              const count = data?.counts[resource.key];
              return (
                <Link
                  key={resource.key}
                  href={`/admin/data/${resource.key}`}
                  className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{resource.label}</span>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {count === undefined ? '…' : count.toLocaleString('pl-PL')}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
