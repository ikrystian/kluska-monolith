import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Exercise } from '@/models';

/**
 * Struktura requestu dla dodawania ćwiczenia:
 * 
 * {
 *   "name": "Pompki na poręczach (Dips Mid Grip)",
 *   "mainMuscleGroups": [
 *     { "name": "Triceps", "imageUrl": "optional-url" },
 *     { "name": "Klatka piersiowa" }
 *   ],
 *   "secondaryMuscleGroups": [
 *     { "name": "Barki" }
 *   ],
 *   "instructions": "Chwyć równoległe poręcze...",
 *   "description": "Uchwyt: Neutralny, Sprzęt: Maszyna do pompek na poręczach",
 *   "mediaUrl": "optional-video-or-image-url",
 *   "type": "weight" | "duration" | "reps"
 * }
 */

interface MuscleGroupPayload {
    name: string;
    imageUrl?: string;
}

interface ExercisePayload {
    name: string;
    mainMuscleGroups: MuscleGroupPayload[];
    secondaryMuscleGroups?: MuscleGroupPayload[];
    instructions?: string;
    description?: string;
    mediaUrl?: string;
    type?: 'weight' | 'duration' | 'reps';
}

// POST - Create exercise (public endpoint - owner is admin)
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body: ExercisePayload = await request.json();

        // Validate required fields
        if (!body.name || body.name.trim() === '') {
            return NextResponse.json(
                { error: 'Pole "name" jest wymagane' },
                { status: 400 }
            );
        }

        if (!body.mainMuscleGroups || body.mainMuscleGroups.length === 0) {
            return NextResponse.json(
                { error: 'Pole "mainMuscleGroups" jest wymagane i musi zawierać co najmniej jedną grupę mięśniową' },
                { status: 400 }
            );
        }

        // Validate mainMuscleGroups structure
        for (const mg of body.mainMuscleGroups) {
            if (!mg.name || mg.name.trim() === '') {
                return NextResponse.json(
                    { error: 'Każda grupa mięśniowa w "mainMuscleGroups" musi mieć pole "name"' },
                    { status: 400 }
                );
            }
        }

        // Validate secondaryMuscleGroups structure if provided
        if (body.secondaryMuscleGroups) {
            for (const mg of body.secondaryMuscleGroups) {
                if (!mg.name || mg.name.trim() === '') {
                    return NextResponse.json(
                        { error: 'Każda grupa mięśniowa w "secondaryMuscleGroups" musi mieć pole "name"' },
                        { status: 400 }
                    );
                }
            }
        }

        // Validate type if provided
        if (body.type && !['weight', 'duration', 'reps'].includes(body.type)) {
            return NextResponse.json(
                { error: 'Pole "type" musi mieć wartość: "weight", "duration" lub "reps"' },
                { status: 400 }
            );
        }

        const exerciseData = {
            name: body.name.trim(),
            mainMuscleGroups: body.mainMuscleGroups.map(mg => ({
                name: mg.name.trim(),
                imageUrl: mg.imageUrl
            })),
            secondaryMuscleGroups: body.secondaryMuscleGroups?.map(mg => ({
                name: mg.name.trim(),
                imageUrl: mg.imageUrl
            })) || [],
            instructions: body.instructions,
            description: body.description,
            mediaUrl: body.mediaUrl,
            type: body.type || 'weight',
            ownerId: 'admin',
        };

        const exercise = new Exercise(exerciseData);
        await exercise.save();

        return NextResponse.json(
            {
                success: true,
                data: exercise.toJSON(),
                message: 'Ćwiczenie zostało dodane pomyślnie'
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('POST /api/public/exercises error:', error);
        return NextResponse.json(
            {
                error: 'Błąd serwera',
                details: error instanceof Error ? error.message : 'Nieznany błąd'
            },
            { status: 500 }
        );
    }
}
