import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { byteSize, sendSerialized, serializeJson, type SerializedJson } from '@/lib/http-cache';
import { cached, cacheKeys } from '@/lib/server-cache';
import { User } from '@/models/User';
import { WorkoutLog } from '@/models/WorkoutLog';
import { calculateLevelFromXP, calculateXPForLevel } from '@/lib/gamification/point-calculator';
import { GamificationProfile } from '@/models/GamificationProfile';
import { Gym } from '@/models/Gym';
import { PersonalRecord } from '@/models/PersonalRecord';
import { SocialProfile } from '@/models/SocialProfile';
import { SocialPost } from '@/models/SocialPost';
import { RunningSession } from '@/models/RunningSession';
import { StravaActivity } from '@/models/StravaActivity';

interface VolumeTrend {
    date: string;
    volume: number;
}

interface TopExercise {
    name: string;
    volume: number;
}

interface PersonalRecordData {
    exerciseName: string;
    type: string;
    value: number;
    reps?: number;
    achievedAt: string;
}

interface PublicProfileResponse {
    user: {
        id: string;
        name: string;
        avatarUrl?: string;
        location?: string;
        bio?: string;
        nickname?: string;
        socialLinks?: {
            instagram?: string;
            facebook?: string;
            twitter?: string;
        };
        trainingLevel?: string;
        memberSince: string;
        daysInApp: number;
    };
    stats: {
        totalWorkouts: number;
        totalTonnage: number;
        currentStreak: number;
        personalRecordsCount: number;
        avgWorkoutsPerWeek: number;
        bestWorkoutTonnage: number;
        longestStreak: number;
        totalRunningKm: number;
        earthEquatorPercentage: number;
    };
    gamification: {
        level: number;
        experiencePoints: number;
        experienceToNextLevel: number;
        achievements: string[];
        totalPointsEarned: number;
        currentFitCoins: number;
    };
    personalRecords: PersonalRecordData[];
    favoriteGyms: Array<{
        id: string;
        name: string;
        address: string;
        rating?: number;
        photoUrl?: string;
    }>;
    volumeTrends: VolumeTrend[];
    topExercises: TopExercise[];
    activityCalendar: string[]; // Array of dates with workouts for heatmap
    recentWorkouts: Array<{
        name: string;
        date: string;
        duration?: number;
        exerciseCount: number;
    }>;
    socialPhotos: Array<{
        id: string;
        imageUrl: string;
        description: string;
        likesCount: number;
        createdAt: string;
    }>;
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function calculateDaysInApp(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate XP needed for next level (exponential scaling)
function calculateXPForNextLevel(currentLevel: number): number {
    return calculateXPForLevel(currentLevel);
}

/**
 * The page is public and the same for every visitor, and building it walks the
 * athlete's whole training history — so one build is shared for a minute.
 */
const PROFILE_TTL_MS = 60_000;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: athleteId } = await params;

        const profile = await cached(
            cacheKeys.publicProfile(athleteId),
            { ttlMs: PROFILE_TTL_MS, sizeOf: (value) => (value ? byteSize(value) : 64) },
            () => buildProfile(athleteId)
        );

        if (!profile) {
            return NextResponse.json(
                { error: 'Athlete not found' },
                { status: 404 }
            );
        }

        return sendSerialized(request, profile, 'public, max-age=60');
    } catch (error) {
        console.error('Error fetching public profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

/** `null` when there is no such athlete. Only the fields the page shows are loaded. */
async function buildProfile(athleteId: string): Promise<SerializedJson | null> {
    await dbConnect();

    // Everything below keys off athleteId alone, so fetch it in one parallel
    // round trip instead of paying Atlas latency once per query.
    const [
        user,
        socialProfile,
        workoutLogs,
        gamificationProfile,
        personalRecords,
        socialPosts,
        runningSessions,
        stravaActivities,
    ] = await Promise.all([
        User.findById(athleteId)
            .select('name role avatarUrl location socialLinks trainingLevel createdAt favoriteGymIds')
            .lean(),
        // Social profile for bio
        SocialProfile.findOne({ userId: athleteId }).select('avatarUrl bio nickname').lean(),
        // Workout logs (completed only)
        WorkoutLog.find({
            athleteId,
            status: 'completed',
        })
            // Without the embedded exercise snapshots (instructions, media) — only what is summed below.
            .select(
                'endTime workoutName duration exercises.exercise.name exercises.sets.completed exercises.sets.weight exercises.sets.reps'
            )
            .sort({ endTime: -1 })
            .lean(),
        // Without the point history (up to 200 entries).
        GamificationProfile.findOne({ userId: athleteId })
            .select('experiencePoints totalPointsEarned currentFitCoins achievements streaks lifetimeStats.longestStreakDays')
            .lean(),
        // Personal records (top 6)
        PersonalRecord.find({ athleteId })
            .sort({ achievedAt: -1 })
            .limit(6)
            .lean(),
        // Social photos (last 12)
        SocialPost.find({ authorId: athleteId })
            .select('imageUrl description likesCount createdAt')
            .sort({ createdAt: -1 })
            .limit(12)
            .lean(),
        // Running statistics
        // Distances only: a session also stores its whole GPS track.
        RunningSession.find({ ownerId: athleteId }).select('distance').lean(),
        StravaActivity.find({ ownerId: athleteId }).select('distance').lean(),
    ]);

    // Only athletes have public profiles
    if (!user || user.role !== 'athlete') {
        return null;
    }

    // Calculate total tonnage and volume trends
    let totalTonnage = 0;
    let bestWorkoutTonnage = 0;
    const volumeByDate: Record<string, number> = {};
    const exerciseVolumes: Record<string, number> = {};
    const activityDates: Set<string> = new Set();

    for (const log of workoutLogs) {
        if (!log.endTime) continue;
        const dateKey = formatDate(new Date(log.endTime));
        activityDates.add(dateKey);

        if (!volumeByDate[dateKey]) {
            volumeByDate[dateKey] = 0;
        }

        let workoutTonnage = 0;
        for (const exerciseSeries of log.exercises) {
            const exercise = exerciseSeries.exercise;
            if (!exercise) continue;

            for (const set of exerciseSeries.sets) {
                if (set.completed && set.weight && set.reps) {
                    const volume = set.weight * set.reps;
                    totalTonnage += volume;
                    workoutTonnage += volume;
                    volumeByDate[dateKey] += volume;

                    const exerciseName = exercise.name || 'Unknown';
                    exerciseVolumes[exerciseName] = (exerciseVolumes[exerciseName] || 0) + volume;
                }
            }
        }

        if (workoutTonnage > bestWorkoutTonnage) {
            bestWorkoutTonnage = workoutTonnage;
        }
    }

    // Calculate avg workouts per week
    const daysInApp = calculateDaysInApp(new Date(user.createdAt));
    const weeksInApp = Math.max(1, daysInApp / 7);
    const avgWorkoutsPerWeek = Math.round((workoutLogs.length / weeksInApp) * 10) / 10;

    // Get last 90 days of volume trends (extended from 30)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const volumeTrends: VolumeTrend[] = Object.entries(volumeByDate)
        .filter(([date]) => new Date(date) >= ninetyDaysAgo)
        .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Top exercises
    const topExercises: TopExercise[] = Object.entries(exerciseVolumes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8) // Increased from 5 to 8
        .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

    // Calculate longest streak from history (simplified - using current)
    const longestStreak = Math.max(
        gamificationProfile?.lifetimeStats?.longestStreakDays || 0,
        gamificationProfile?.streaks?.workout || 0,
        gamificationProfile?.streaks?.goals || 0,
        gamificationProfile?.streaks?.checkins || 0
    );

    // Fetch favorite gyms
    const favoriteGymIds = user.favoriteGymIds || [];
    const favoriteGyms = favoriteGymIds.length > 0
        ? await Gym.find({ _id: { $in: favoriteGymIds } }).select('name address rating photoUrls').lean()
        : [];

    // Recent workouts (last 5)
    const recentWorkouts = workoutLogs.slice(0, 5).map(log => ({
        name: log.workoutName,
        date: log.endTime ? formatDate(new Date(log.endTime)) : '',
        duration: log.duration,
        exerciseCount: log.exercises.length,
    }));

    // Activity calendar (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const activityCalendar = Array.from(activityDates)
        .filter(date => new Date(date) >= oneYearAgo)
        .sort();

    // Poziom liczony z XP — pole `level` w starszych profilach nigdy nie było zapisywane.
    const currentLevel = calculateLevelFromXP(gamificationProfile?.experiencePoints || 0).level;
    const currentXP = gamificationProfile?.experiencePoints || 0;
    const xpForNextLevel = calculateXPForNextLevel(currentLevel);

    let totalRunningKm = 0;
    // Add manual running sessions
    if (runningSessions) {
        totalRunningKm += runningSessions.reduce((sum, session) => sum + session.distance, 0);
    }
    // Add Strava activities (convert meters to km)
    if (stravaActivities) {
        totalRunningKm += stravaActivities.reduce((sum, activity) => sum + (activity.distance / 1000), 0);
    }

    const EARTH_EQUATOR_KM = 40075;
    const earthEquatorPercentage = (totalRunningKm / EARTH_EQUATOR_KM) * 100;

    const response: PublicProfileResponse = {
        user: {
            id: athleteId,
            name: user.name,
            avatarUrl: user.avatarUrl || socialProfile?.avatarUrl,
            location: user.location,
            bio: socialProfile?.bio,
            nickname: socialProfile?.nickname,
            socialLinks: user.socialLinks,
            trainingLevel: user.trainingLevel,
            memberSince: user.createdAt.toISOString(),
            daysInApp,
        },
        stats: {
            totalWorkouts: workoutLogs.length,
            totalTonnage: Math.round(totalTonnage),
            currentStreak: gamificationProfile?.streaks?.workout || 0,
            personalRecordsCount: personalRecords.length,
            avgWorkoutsPerWeek,
            bestWorkoutTonnage: Math.round(bestWorkoutTonnage),
            longestStreak,
            totalRunningKm: Math.round(totalRunningKm * 100) / 100,
            earthEquatorPercentage: Math.round(earthEquatorPercentage * 100) / 100,
        },
        gamification: {
            level: currentLevel,
            experiencePoints: currentXP,
            experienceToNextLevel: xpForNextLevel,
            achievements: gamificationProfile?.achievements || [],
            totalPointsEarned: gamificationProfile?.totalPointsEarned || 0,
            currentFitCoins: gamificationProfile?.currentFitCoins || 0,
        },
        personalRecords: personalRecords.map(pr => ({
            exerciseName: pr.exerciseName,
            type: pr.type,
            value: pr.value,
            reps: pr.reps,
            achievedAt: pr.achievedAt.toISOString(),
        })),
        favoriteGyms: favoriteGyms.map(gym => ({
            id: gym._id.toString(),
            name: gym.name,
            address: gym.address,
            rating: gym.rating,
            photoUrl: gym.photoUrls?.[0],
        })),
        volumeTrends,
        topExercises,
        activityCalendar,
        recentWorkouts,
        socialPhotos: socialPosts.map(post => ({
            id: post._id.toString(),
            imageUrl: post.imageUrl,
            description: post.description,
            likesCount: post.likesCount,
            createdAt: post.createdAt.toISOString(),
        })),
    };

    return serializeJson(response);
}

