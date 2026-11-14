import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, requireAdmin } from '@/lib/admin/guard';
import { getServerResource } from '@/lib/admin/registry';
import { ADMIN_RESOURCES } from '@/lib/admin/resources';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/admin/resources
 *
 * Every collection the panel manages with its number of records — the index
 * of the "Wszystkie dane" screen.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await connectToDatabase();

    const counts = await Promise.all(
      ADMIN_RESOURCES.map(async (resource) => {
        const server = getServerResource(resource.key);
        if (!server) return [resource.key, 0] as const;
        // Collection metadata, not a scan: this runs for ~50 collections at once.
        return [resource.key, await server.model.estimatedDocumentCount()] as const;
      })
    );

    return NextResponse.json({ counts: Object.fromEntries(counts) });
  } catch (error) {
    return adminErrorResponse(error, 'GET /api/admin/resources');
  }
}
