import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, requireAdmin } from '@/lib/admin/guard';
import {
  countRelations,
  deleteRecord,
  getRecord,
  recordLabel,
  resolveResource,
  serializeRecord,
  updateRecord,
} from '@/lib/admin/records';

type Context = { params: Promise<{ resource: string; id: string }> };

/**
 * GET /api/admin/resources/:resource/:id
 *
 * The full record. With `?relations=1` also how many records of other
 * collections point at it, per referencing field.
 */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requireAdmin(request);
    const { resource, id } = await params;
    const resolved = resolveResource(resource);
    const doc = await getRecord(resolved, id);
    const data = { ...serializeRecord(resolved, doc), _label: recordLabel(resolved, doc) };

    if (new URL(request.url).searchParams.get('relations') === '1') {
      return NextResponse.json({ data, relations: await countRelations(resolved, id) });
    }
    return NextResponse.json({ data });
  } catch (error) {
    return adminErrorResponse(error, 'GET /api/admin/resources/[resource]/[id]');
  }
}

/** PATCH /api/admin/resources/:resource/:id — change the given `{ path: value }` fields. */
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    const { resource, id } = await params;
    const resolved = resolveResource(resource);
    const saved = await updateRecord(resolved, id, await request.json().catch(() => null), admin);
    return NextResponse.json({ data: { ...serializeRecord(resolved, saved), _label: recordLabel(resolved, saved) } });
  } catch (error) {
    return adminErrorResponse(error, 'PATCH /api/admin/resources/[resource]/[id]');
  }
}

/** DELETE /api/admin/resources/:resource/:id */
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const admin = await requireAdmin(request);
    const { resource, id } = await params;
    await deleteRecord(resolveResource(resource), id, admin);
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error, 'DELETE /api/admin/resources/[resource]/[id]');
  }
}
