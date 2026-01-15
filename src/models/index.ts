// Export all Mongoose models
export * from './User';
export * from './Article';
export * from './ArticleCategory';
export * from './Exercise';
export * from './WorkoutLog';
export * from './WorkoutPlan';
export * from './Conversation';
export * from './Message';
export * from './BodyMeasurement';
export * from './RunningSession';
export * from './Goal';
export * from './MuscleGroup';
export * from './Gym';
export * from './Meal';
export * from './NutritionGoal';
export * from './PlannedWorkout';
export * from './TrainerRequest';
export * from './Achievement';
export * from './Workout';
export * from './PersonalRecord';
export * from './SocialProfile';
export * from './SocialPost';
export * from './CustomProduct';
export * from './DietPlan';
export * from './SavedMeal';
export * from './TrainingSession';
// Gamification models
export * from './GamificationProfile';
export * from './Reward';
export * from './AchievementBadge';
export * from './Notification';

// Export enums from types (no conflicts)
export { MuscleGroupName, TrainingLevel, SetType } from './types/enums';

// Export frontend types with explicit names to avoid conflicts with Mongoose models
// These are the types used in the frontend, while I* interfaces are for Mongoose
export type {
  // Exercise types
  MuscleGroup as MuscleGroupType,
  Exercise as ExerciseType,
  WorkoutSet,
  ExerciseSeries,
  // Workout types
  Workout as WorkoutType,
  DayPlan,
  TrainingWeek,
  TrainingStage,
  TrainingPlan,
  WorkoutExerciseLog,
  PersonalRecord as PersonalRecordType,
  WorkoutLog as WorkoutLogType,
  WorkoutDayExercise,
  WorkoutDay,
  WorkoutPlan as WorkoutPlanType,
  PlannedWorkout as PlannedWorkoutType,
  AiWorkoutPlan,
  // User types
  UserProfile,
  AthleteProfile,
  // Nutrition types
  FoodItem,
  MealType,
  Meal as MealFrontendType,
  LoggedMeal,
  DietPlan as DietPlanType,
  // Social types
  SocialProfile as SocialProfileType,
  SocialPost as SocialPostType,
  PublicProfileData,
  // Common types
  Article as ArticleType,
  ArticleCategory as ArticleCategoryType,
  Goal as GoalType,
  Achievement as AchievementType,
  RunningSession as RunningSessionType,
  TrainerRequest as TrainerRequestType,
  BodyMeasurement as BodyMeasurementType,
  Gym as GymType,
  Conversation as ConversationType,
  Message as MessageType,
} from './types';
