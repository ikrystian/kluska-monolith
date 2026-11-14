'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import type { FieldMeta } from '@/lib/admin/resources';

/** A failed admin API call: the server's Polish message and, for forms, the offending fields. */
export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>
  ) {
    super(message);
  }
}

export async function adminFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AdminRequestError(
      payload?.error || `Żądanie nie powiodło się (HTTP ${response.status}).`,
      response.status,
      payload?.fields
    );
  }
  return payload as T;
}

export type AdminRecord = Record<string, any> & { id: string; _label: string };

export interface AdminListResult {
  data: AdminRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ListQuery {
  q?: string;
  filter?: Record<string, unknown>;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

const base = (resource: string) => `/api/admin/resources/${resource}`;

export function listUrl(resource: string, query: ListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.filter && Object.keys(query.filter).length > 0) params.set('filter', JSON.stringify(query.filter));
  if (query.sort) {
    params.set('sort', query.sort);
    params.set('dir', query.dir ?? 'desc');
  }
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const text = params.toString();
  return text ? `${base(resource)}?${text}` : base(resource);
}

/** A page of records. Pass `null` to skip fetching. */
export function useAdminList(resource: string | null, query: ListQuery = {}) {
  return useSWR<AdminListResult, AdminRequestError>(resource ? listUrl(resource, query) : null, adminFetch, {
    keepPreviousData: true,
  });
}

/** The fields of a resource. They only change with a deploy, so they are fetched once. */
export function useAdminSchema(resource: string | null) {
  const { data, error, isLoading } = useSWR<{ fields: FieldMeta[] }, AdminRequestError>(
    resource ? `${base(resource)}?mode=schema` : null,
    adminFetch,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );
  return { fields: data?.fields ?? null, error, isLoading };
}

export function useAdminRecord(resource: string | null, id: string | null, withRelations = false) {
  return useSWR<{ data: AdminRecord; relations?: RelationCount[] }, AdminRequestError>(
    resource && id ? `${base(resource)}/${id}${withRelations ? '?relations=1' : ''}` : null,
    adminFetch
  );
}

export interface RelationCount {
  resource: string;
  field: string;
  multiple: boolean;
  valueField: string;
  count: number;
  value: string;
}

export interface LookupItem {
  value: string;
  id: string;
  label: string;
  sublabel?: string;
}

function lookupUrl(resource: string, options: { values?: string[]; q?: string; valueField?: string }): string {
  const params = new URLSearchParams({ mode: 'lookup' });
  if (options.values) params.set('values', options.values.join(','));
  if (options.q) params.set('q', options.q);
  if (options.valueField && options.valueField !== 'id') params.set('valueField', options.valueField);
  return `${base(resource)}?${params.toString()}`;
}

/** Names of the records behind stored reference values (for columns and pickers). */
export function useLookupValues(resource: string | null, values: string[], valueField?: string) {
  // Sorted and de-duplicated so the same set of ids always hits the same cache entry.
  const unique = Array.from(new Set(values.filter(Boolean))).sort();
  const { data, isLoading } = useSWR<{ items: LookupItem[] }>(
    resource && unique.length > 0 ? lookupUrl(resource, { values: unique, valueField }) : null,
    adminFetch,
    { revalidateOnFocus: false, keepPreviousData: true }
  );
  return { items: data?.items ?? [], isLoading };
}

/** Records matching a search text (the options of a relation picker). */
export function useLookupSearch(resource: string | null, q: string, valueField?: string, enabled = true) {
  const { data, isLoading } = useSWR<{ items: LookupItem[] }>(
    resource && enabled ? lookupUrl(resource, { q, valueField }) : null,
    adminFetch,
    { revalidateOnFocus: false, keepPreviousData: true }
  );
  return { items: data?.items ?? [], isLoading };
}

/** Re-reads every cached list, record and lookup of a resource after a change. */
export function refreshResource(resource: string) {
  const prefix = base(resource);
  return globalMutate(
    (key) =>
      typeof key === 'string' &&
      (key === prefix ||
        key.startsWith(`${prefix}?`) ||
        key.startsWith(`${prefix}/`) ||
        key === '/api/admin/resources' ||
        key === '/api/admin/stats' ||
        // The older screens read the same collections through /api/db.
        key.startsWith(`/api/db/${resource}`)),
    undefined,
    { revalidate: true }
  );
}

export const createAdminRecord = (resource: string, body: Record<string, unknown>) =>
  adminFetch<{ data: AdminRecord }>(base(resource), { method: 'POST', body: JSON.stringify(body) }).then((result) => {
    void refreshResource(resource);
    return result.data;
  });

export const updateAdminRecord = (resource: string, id: string, body: Record<string, unknown>) =>
  adminFetch<{ data: AdminRecord }>(`${base(resource)}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(
    (result) => {
      void refreshResource(resource);
      return result.data;
    }
  );

export const deleteAdminRecord = (resource: string, id: string) =>
  adminFetch(`${base(resource)}/${id}`, { method: 'DELETE' }).then(() => {
    void refreshResource(resource);
  });

export const deleteAdminRecords = (resource: string, ids: string[]) =>
  adminFetch<{ deleted: number; failed: { id: string; error: string }[] }>(base(resource), {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  }).then((result) => {
    void refreshResource(resource);
    return result;
  });

/** Reads `a.b.c` from a record. */
export const getPath = (source: Record<string, any> | null | undefined, path: string): unknown =>
  path.split('.').reduce<any>((value, part) => (value == null ? undefined : value[part]), source);
