import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { WorkoutLog } from '@/models/WorkoutLog';
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
    // Formula: each level needs more XP
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: athleteId } = await params;

        await dbConnect();

        // Fetch user (only athletes have public profiles)
        const user = await User.findById(athleteId).lean();

        if (!user || user.role !== 'athlete') {
            return NextResponse.json(
                { error: 'Athlete not found' },
                { status: 404 }
            );
        }

        // Fetch social profile for bio
        const socialProfile = await SocialProfile.findOne({ userId: athleteId }).lean();

        // Fetch workout logs (completed only)
        const workoutLogs = await WorkoutLog.find({
            athleteId,
            status: 'completed',
        }).sort({ endTime: -1 }).lean();

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

        // Fetch gamification profile
        const gamificationProfile = await GamificationProfile.findOne({ userId: athleteId }).lean();

        // Calculate longest streak from history (simplified - using current)
        const longestStreak = Math.max(
            gamificationProfile?.streaks?.workout || 0,
            gamificationProfile?.streaks?.goals || 0,
            gamificationProfile?.streaks?.checkins || 0
        );

        // Fetch personal records (top 6)
        const personalRecords = await PersonalRecord.find({ athleteId })
            .sort({ achievedAt: -1 })
            .limit(6)
            .lean();

        // Fetch favorite gyms
        const favoriteGymIds = user.favoriteGymIds || [];
        const favoriteGyms = favoriteGymIds.length > 0
            ? await Gym.find({ _id: { $in: favoriteGymIds } }).lean()
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

        // Fetch social photos (last 12)
        const socialPosts = await SocialPost.find({ authorId: athleteId })
            .sort({ createdAt: -1 })
            .limit(12)
            .lean();

        const currentLevel = gamificationProfile?.level || 1;
        const currentXP = gamificationProfile?.experiencePoints || 0;
        const xpForNextLevel = calculateXPForNextLevel(currentLevel);

        // Fetch running statistics
        const runningSessions = await RunningSession.find({ ownerId: athleteId }).lean();
        const stravaActivities = await StravaActivity.find({ ownerId: athleteId }).lean();

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

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching public profile:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

