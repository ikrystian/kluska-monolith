import { NextRequest, NextResponse } from 'next/server';
import { AdminApiError, adminErrorResponse, requireAdmin } from '@/lib/admin/guard';
import {
  createRecord,
  deleteRecord,
  listRecords,
  lookupRecords,
  recordLabel,
  resolveResource,
  serializeRecord,
} from '@/lib/admin/records';

type Context = { params: Promise<{ resource: string }> };

function parseJsonParam(value: string | null, name: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  throw new AdminApiError(400, `Nieprawidłowy parametr ${name}.`);
}

/**
 * GET /api/admin/resources/:resource
 *
 *  - `?mode=schema`  — the fields of the resource, derived from its model
 *  - `?mode=lookup`  — names for relation pickers (`values=a,b` or `q=text`)
 *  - otherwise       — a page of records (`q`, `filter`, `sort`, `dir`, `page`, `limit`)
 */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requireAdmin(request);
    const resolved = resolveResource((await params).resource);
    const search = new URL(request.url).searchParams;
    const mode = search.get('mode');

    if (mode === 'schema') {
      return NextResponse.json({ fields: resolved.fields });
    }

    if (mode === 'lookup') {
      const values = search.get('values');
      const items = await lookupRecords(resolved, {
        values: values !== null ? values.split(',').filter(Boolean) : undefined,
        q: search.get('q') ?? undefined,
        valueField: search.get('valueField') ?? undefined,
      });
      return NextResponse.json({ items });
    }

    const result = await listRecords(resolved, {
      q: search.get('q') ?? undefined,
      filter: parseJsonParam(search.get('filter'), 'filter'),
      sort: search.get('sort') ?? undefined,
      dir: search.get('dir') === 'asc' ? 'asc' : 'desc',
      page: Number(search.get('page') ?? 1),
      limit: Number(search.get('limit') ?? 25),
    });
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error, 'GET /api/admin/resources/[resource]');
  }
}

/** POST /api/admin/resources/:resource — create a record from `{ path: value }`. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    const resolved = resolveResource((await params).resource);
    const saved = await createRecord(resolved, await request.json().catch(() => null), admin);
    return NextResponse.json(
      { data: { ...serializeRecord(resolved, saved), _label: recordLabel(resolved, saved) } },
      { status: 201 }
    );
  } catch (error) {
    return adminErrorResponse(error, 'POST /api/admin/resources/[resource]');
  }
}

const MAX_BULK = 200;

/** DELETE /api/admin/resources/:resource — delete several records: `{ ids: [...] }`. */
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    const resolved = resolveResource((await params).resource);
    const body = await request.json().catch(() => null);
    const ids: unknown = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string')) {
      throw new AdminApiError(400, 'Podaj listę identyfikatorów do usunięcia.');
    }
    if (ids.length > MAX_BULK) {
      throw new AdminApiError(400, `Jednorazowo można usunąć najwyżej ${MAX_BULK} rekordów.`);
    }

    let deleted = 0;
    const failed: { id: string; error: string }[] = [];
    // One at a time: each delete runs the resource's own clean-up (e.g. a user's data).
    for (const id of ids as string[]) {
      try {
        await deleteRecord(resolved, id, admin);
        deleted++;
      } catch (error) {
        if (!(error instanceof AdminApiError)) console.error('Bulk delete failed for', id, error);
        failed.push({ id, error: error instanceof AdminApiError ? error.message : 'Błąd serwera.' });
      }
    }
    return NextResponse.json({ deleted, failed });
  } catch (error) {
    return adminErrorResponse(error, 'DELETE /api/admin/resources/[resource]');
  }
}
