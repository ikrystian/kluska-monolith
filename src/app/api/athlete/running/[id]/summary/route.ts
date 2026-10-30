import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { RunningSession } from '@/models/RunningSession';
import { generateRunSummary, type RunSummarySplit } from '@/lib/openrouter-run-summary';

const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * POST /api/athlete/running/[id]/summary
 * Sends the athlete's own run to OpenRouter and returns a short, playful summary.
 * Body: { elevationGainM, splits } — the per-km breakdown the SPA already computed
 * from the GPS trail; the core run data is read from the database.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const splits: RunSummarySplit[] = Array.isArray(body.splits)
            ? body.splits.slice(0, 200).map((split: any) => ({
                km: toNumber(split.km),
                distanceM: toNumber(split.distanceM),
                elapsedS: toNumber(split.elapsedS),
                avgPaceMinPerKm: toNumber(split.avgPaceMinPerKm),
                elevationGainM: toNumber(split.elevationGainM),
            }))
            : [];

        await connectToDatabase();

        const { id } = await params;
        const session = await RunningSession.findOne({ _id: id, ownerId: user.id }).lean();
        if (!session) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        const summary = await generateRunSummary({
            date: session.date.toISOString(),
            programName: session.programName,
            notes: session.notes,
            distanceKm: session.distance,
            durationMin: session.duration,
            avgPaceMinPerKm: session.avgPace,
            elevationGainM: toNumber(body.elevationGainM),
            splits,
        });

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Error generating run summary:', error);
        return NextResponse.json({ error: 'Failed to generate run summary' }, { status: 500 });
    }
}
