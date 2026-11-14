import type { Model } from 'mongoose';
import type { RequestUser } from '@/lib/api-auth';
import { AdminApiError } from '@/lib/admin/guard';
import { adInputSchema } from '@/lib/ads';
import { promoInputSchema } from '@/lib/dashboard-promos';
import { cascadeDeleteUserData } from '@/lib/user-cascade-delete';
import {
  Achievement,
  AchievementBadge,
  AppSettings,
  Article,
  ArticleCategory,
  BodyMeasurement,
  Challenge,
  Conversation,
  DashboardPromo,
  DietPlan,
  Exercise,
  FoodDiaryEntry,
  Friendship,
  GamificationProfile,
  Goal,
  Gym,
  Habit,
  HabitLog,
  Meal,
  Message,
  MuscleGroup,
  Notification,
  NutritionGoal,
  PersonalRecord,
  Pet,
  PetProfile,
  PlannedWorkout,
  PushSubscription,
  Reward,
  RunningProgram,
  RunningSession,
  SavedMeal,
  SocialPost,
  SocialProfile,
  SocialStatus,
  SpotifyAccount,
  StravaActivity,
  Survey,
  SurveyResponse,
  TrainerRequest,
  TrainingSession,
  User,
  WeeklyCheckIn,
  Workout,
  WorkoutLog,
  WorkoutPlan,
} from '@/models';
import CustomProduct from '@/models/CustomProduct';
import { Ad, AdStat } from '@/models/Ad';
import { AuditLog } from '@/models/AuditLog';
import { friendshipPairKey } from '@/models/Friendship';

type Flat = Record<string, unknown>;

interface PrepareInput {
  /** Changed fields as dotted path → value. */
  body: Flat;
  /** The stored record as a plain object; `null` on create. */
  existing: Record<string, any> | null;
  admin: RequestUser;
}

export interface ServerResource {
  model: Model<any>;
  /** Changes can only be made by the system, not from the panel. */
  locked?: boolean;
  /** Validates and normalises the fields about to be written; returns the fields to write. */
  prepare?(input: PrepareInput): Promise<Flat> | Flat;
  /** Side effects of a saved record (`before` is `null` on create). */
  afterSave?(saved: Record<string, any>, before: Record<string, any> | null, admin: RequestUser): Promise<void>;
  /** Runs before the record is deleted; throw `AdminApiError` to refuse. */
  beforeDelete?(record: Record<string, any>, admin: RequestUser): Promise<void>;
}

/** Runs a zod schema over the record as it will be after the change, and returns its normalised fields. */
function validateWhole(
  schema: { safeParse(data: unknown): { success: boolean; data?: any; error?: { issues: { path: PropertyKey[]; message: string }[] } } },
  { body, existing }: PrepareInput
): Flat {
  // Through JSON so stored dates reach the schema as the ISO strings a form would send.
  const current: Flat = existing ? JSON.parse(JSON.stringify(existing)) : {};
  const result = schema.safeParse({ ...current, ...body });
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error?.issues ?? []) {
      const path = issue.path.map(String).join('.') || '_';
      fields[path] ??= issue.message;
    }
    throw new AdminApiError(400, Object.values(fields)[0] ?? 'Nieprawidłowe dane.', fields);
  }
  // Optional fields the schema cleared must be unset, not left at their old value.
  const normalised: Flat = {};
  for (const [key, value] of Object.entries(result.data as Flat)) {
    normalised[key] = value === undefined ? null : value;
  }
  return normalised;
}

export const SERVER_RESOURCES: Record<string, ServerResource> = {
  users: {
    model: User,
    prepare({ body, existing, admin }) {
      const next = { ...body };
      if (typeof next.email === 'string') next.email = next.email.trim().toLowerCase();

      const password = typeof next.password === 'string' ? next.password : '';
      if (!existing && password.length === 0) {
        throw new AdminApiError(400, 'Podaj hasło dla nowego konta.', { password: 'Hasło jest wymagane.' });
      }
      if (password.length === 0) delete next.password;
      else if (password.length < 8) {
        throw new AdminApiError(400, 'Hasło musi mieć co najmniej 8 znaków.', { password: 'Minimum 8 znaków.' });
      }

      if (existing && String(existing._id) === admin.id && 'role' in next && next.role !== 'admin') {
        throw new AdminApiError(400, 'Nie możesz odebrać uprawnień administratora własnemu kontu.', {
          role: 'To Twoje konto.',
        });
      }
      // An account made in the panel is trusted: no confirmation e-mail round trip.
      if (!existing && next.emailVerified === undefined) next.emailVerified = true;
      return next;
    },
    async beforeDelete(record, admin) {
      if (String(record._id) === admin.id) {
        throw new AdminApiError(400, 'Nie możesz usunąć własnego konta.');
      }
      await cascadeDeleteUserData(String(record._id));
    },
  },
  trainerRequests: {
    model: TrainerRequest,
    async afterSave(saved, before) {
      const wasAccepted = before?.status === 'accepted';
      const isAccepted = saved.status === 'accepted';
      if (isAccepted && (!wasAccepted || before?.trainerId !== saved.trainerId)) {
        await User.updateOne({ _id: saved.athleteId }, { $set: { trainerId: saved.trainerId } });
      } else if (wasAccepted && !isAccepted) {
        // Only release the athlete if they are still with the trainer of this request.
        await User.updateOne({ _id: saved.athleteId, trainerId: before!.trainerId }, { $unset: { trainerId: 1 } });
      }
    },
  },
  friendships: {
    model: Friendship,
    prepare({ body, existing }) {
      const requesterId = String(body.requesterId ?? existing?.requesterId ?? '');
      const recipientId = String(body.recipientId ?? existing?.recipientId ?? '');
      if (requesterId && recipientId) {
        if (requesterId === recipientId) {
          throw new AdminApiError(400, 'Znajomość wymaga dwóch różnych użytkowników.', {
            recipientId: 'Wybierz inną osobę.',
          });
        }
        return { ...body, pairKey: friendshipPairKey(requesterId, recipientId) };
      }
      return body;
    },
  },
  conversations: {
    model: Conversation,
    async beforeDelete(record) {
      await Message.deleteMany({ conversationId: record.conversationId });
    },
  },
  messages: { model: Message },
  trainingSessions: { model: TrainingSession },
  weeklyCheckIns: { model: WeeklyCheckIn },
  notifications: { model: Notification },
  pushSubscriptions: { model: PushSubscription },

  exercises: { model: Exercise },
  muscleGroups: { model: MuscleGroup },
  workouts: { model: Workout },
  workoutPlans: { model: WorkoutPlan },
  plannedWorkouts: { model: PlannedWorkout },
  workoutLogs: { model: WorkoutLog },
  personalRecords: { model: PersonalRecord },
  gyms: { model: Gym },

  runningPrograms: { model: RunningProgram },
  runningSessions: { model: RunningSession },
  stravaActivities: { model: StravaActivity },
  challenges: { model: Challenge },

  dietPlans: {
    model: DietPlan,
    async beforeDelete(record) {
      await User.updateMany({ assignedDietPlanId: String(record._id) }, { $unset: { assignedDietPlanId: 1 } });
    },
  },
  savedMeals: { model: SavedMeal },
  meals: { model: Meal },
  foodDiaryEntries: { model: FoodDiaryEntry },
  customProducts: { model: CustomProduct },
  nutritionGoals: { model: NutritionGoal },

  goals: { model: Goal },
  habits: {
    model: Habit,
    async beforeDelete(record) {
      await HabitLog.deleteMany({ habitId: String(record._id) });
    },
  },
  habitLogs: { model: HabitLog },
  bodyMeasurements: { model: BodyMeasurement },
  achievements: { model: Achievement },

  articles: { model: Article },
  articleCategories: {
    model: ArticleCategory,
    async afterSave(saved, before) {
      // Articles point at their category by name, so a rename has to follow them.
      if (before && before.name !== saved.name) {
        await Article.updateMany({ category: before.name }, { $set: { category: saved.name } });
      }
    },
    async beforeDelete(record) {
      const used = await Article.countDocuments({ category: record.name });
      if (used > 0) {
        throw new AdminApiError(
          409,
          `Kategoria „${record.name}” jest używana przez ${used} artykuł(y/ów). Przenieś je najpierw do innej kategorii.`
        );
      }
    },
  },
  surveys: {
    model: Survey,
    async beforeDelete(record) {
      await SurveyResponse.deleteMany({ surveyId: String(record._id) });
    },
  },
  surveyResponses: { model: SurveyResponse },
  socialPosts: { model: SocialPost },
  socialProfiles: { model: SocialProfile },
  socialStatuses: { model: SocialStatus },

  gamificationProfiles: { model: GamificationProfile },
  achievementBadges: { model: AchievementBadge },
  rewards: {
    model: Reward,
    prepare({ body, existing, admin }) {
      return existing || body.createdBy ? body : { ...body, createdBy: admin.id };
    },
  },
  pets: { model: Pet },
  petProfiles: { model: PetProfile },

  ads: {
    model: Ad,
    prepare: (input) => validateWhole(adInputSchema, input),
    async beforeDelete(record) {
      await AdStat.deleteMany({ adId: String(record._id) });
    },
  },
  dashboardPromos: {
    model: DashboardPromo,
    prepare: (input) => validateWhole(promoInputSchema, input),
  },

  appSettings: { model: AppSettings },
  spotifyAccounts: { model: SpotifyAccount },
  auditLogs: { model: AuditLog, locked: true },
};

export function getServerResource(key: string): ServerResource | undefined {
  return Object.prototype.hasOwnProperty.call(SERVER_RESOURCES, key) ? SERVER_RESOURCES[key] : undefined;
}
