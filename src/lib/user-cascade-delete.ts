import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Achievement } from '@/models/Achievement';
import { BodyMeasurement } from '@/models/BodyMeasurement';
import { Challenge } from '@/models/Challenge';
import { Conversation } from '@/models/Conversation';
import CustomProduct from '@/models/CustomProduct';
import { DietPlan } from '@/models/DietPlan';
import { Exercise } from '@/models/Exercise';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { GamificationProfile } from '@/models/GamificationProfile';
import { Goal } from '@/models/Goal';
import { Habit } from '@/models/Habit';
import { HabitLog } from '@/models/HabitLog';
import { Meal } from '@/models/Meal';
import { Message } from '@/models/Message';
import { Notification } from '@/models/Notification';
import { NutritionGoal } from '@/models/NutritionGoal';
import { PersonalRecord } from '@/models/PersonalRecord';
import { PlannedWorkout } from '@/models/PlannedWorkout';
import { RunningSession } from '@/models/RunningSession';
import { SavedMeal } from '@/models/SavedMeal';
import { SocialPost } from '@/models/SocialPost';
import { SocialProfile } from '@/models/SocialProfile';
import { SpotifyAccount } from '@/models/SpotifyAccount';
import { StravaActivity } from '@/models/StravaActivity';
import { Survey } from '@/models/Survey';
import { SurveyResponse } from '@/models/SurveyResponse';
import { TrainerRequest } from '@/models/TrainerRequest';
import { TrainingSession } from '@/models/TrainingSession';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { Workout } from '@/models/Workout';
import { WorkoutLog } from '@/models/WorkoutLog';
import { WorkoutPlan } from '@/models/WorkoutPlan';

/**
 * Deletes every piece of data this app associates with a user — their own
 * records (as an athlete), anything they authored as a trainer (plans, diet
 * plans, surveys, meals assigned to clients), and anything that pairs them
 * with another user (conversations, messages, challenges, trainer requests).
 *
 * Called from the admin "delete user" action, before the User document
 * itself is removed. Deliberately not exposed as its own API route — it's
 * only ever meant to run as part of that one destructive admin action.
 */
export async function cascadeDeleteUserData(userId: string): Promise<void> {
  await connectToDatabase();

  // Conversations are strictly 1:1 trainer<->athlete — remove the pair and
  // every message in it, not just the ones this user sent.
  const conversations = await Conversation.find({
    $or: [{ trainerId: userId }, { athleteId: userId }],
  }).select('conversationId').lean();
  const conversationIds = conversations.map((c) => c.conversationId);
  if (conversationIds.length > 0) {
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
  }
  await Conversation.deleteMany({ $or: [{ trainerId: userId }, { athleteId: userId }] });
  // Any other message this user sent (shouldn't exist outside the conversations
  // above, since conversations are 1:1, but cleaned up defensively).
  await Message.deleteMany({ senderId: userId });

  await Promise.all([
    Achievement.deleteMany({ ownerId: userId }),
    BodyMeasurement.deleteMany({ ownerId: userId }),
    Challenge.deleteMany({ $or: [{ challengerId: userId }, { challengedId: userId }] }),
    CustomProduct.deleteMany({ trainerId: userId }),
    DietPlan.deleteMany({ trainerId: userId }),
    Exercise.deleteMany({ ownerId: userId }),
    FoodDiaryEntry.deleteMany({ ownerId: userId }),
    GamificationProfile.deleteOne({ userId }),
    Goal.deleteMany({ ownerId: userId }),
    Habit.deleteMany({ ownerId: userId }),
    HabitLog.deleteMany({ ownerId: userId }),
    Meal.deleteMany({ $or: [{ ownerId: userId }, { trainerId: userId }] }),
    Notification.deleteMany({ userId }),
    NutritionGoal.deleteMany({ $or: [{ ownerId: userId }, { trainerId: userId }] }),
    PersonalRecord.deleteMany({ athleteId: userId }),
    PlannedWorkout.deleteMany({ ownerId: userId }),
    RunningSession.deleteMany({ ownerId: userId }),
    SavedMeal.deleteMany({ trainerId: userId }),
    SocialPost.deleteMany({ authorId: userId }),
    SocialPost.updateMany({ likes: userId }, { $pull: { likes: userId }, $inc: { likesCount: -1 } }),
    SocialProfile.deleteOne({ userId }),
    SpotifyAccount.deleteOne({ userId }),
    StravaActivity.deleteMany({ ownerId: userId }),
    Survey.deleteMany({ trainerId: userId }),
    Survey.updateMany({ assignedAthleteIds: userId }, { $pull: { assignedAthleteIds: userId } }),
    SurveyResponse.deleteMany({ athleteId: userId }),
    TrainerRequest.deleteMany({ $or: [{ athleteId: userId }, { trainerId: userId }] }),
    TrainingSession.deleteMany({ $or: [{ trainerId: userId }, { athleteId: userId }] }),
    WeeklyCheckIn.deleteMany({ $or: [{ athleteId: userId }, { trainerId: userId }] }),
    Workout.deleteMany({ ownerId: userId }),
    WorkoutLog.deleteMany({ athleteId: userId }),
    WorkoutPlan.deleteMany({ trainerId: userId }),
    WorkoutPlan.updateMany({ assignedAthleteIds: userId }, { $pull: { assignedAthleteIds: userId } }),
    // Athletes whose trainer is the deleted user lose that assignment rather
    // than being deleted themselves.
    User.updateMany({ trainerId: userId }, { $unset: { trainerId: '' } }),
  ]);
}
