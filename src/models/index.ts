import mongoose, { Schema, Model } from 'mongoose';

// Article Category
export interface IArticleCategory {
  _id: string;
  name: string;
}

const ArticleCategorySchema = new Schema<IArticleCategory>(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ArticleCategory: Model<IArticleCategory> =
  mongoose.models.ArticleCategory || mongoose.model<IArticleCategory>('ArticleCategory', ArticleCategorySchema);



// Workout Log
export interface IWorkoutLog {
  _id: string;
  endTime: Date;
  workoutName: string;
  duration?: number;
  exercises: {
    exerciseId: string;
    sets: {
      reps: number;
      weight?: number;
    }[];
    duration?: number;
  }[];
  photoURL?: string;
  athleteId: string;
  status?: 'in-progress' | 'completed';
  startTime?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutLogSchema = new Schema<IWorkoutLog>(
  {
    endTime: { type: Date, required: true },
    workoutName: { type: String, required: true },
    duration: { type: Number },
    exercises: [{
      exerciseId: { type: String, required: true },
      sets: [{
        reps: { type: Number, required: true },
        weight: { type: Number },
      }],
      duration: { type: Number },
    }],
    photoURL: { type: String },
    athleteId: { type: String, required: true },
    status: { type: String, enum: ['in-progress', 'completed'] },
    startTime: { type: Date },
    feedback: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

WorkoutLogSchema.index({ athleteId: 1, endTime: -1 });

export const WorkoutLog: Model<IWorkoutLog> =
  mongoose.models.WorkoutLog || mongoose.model<IWorkoutLog>('WorkoutLog', WorkoutLogSchema);

// Goal
export interface IGoal {
  _id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  ownerId: string;
}

const GoalSchema = new Schema<IGoal>(
  {
    title: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, required: true },
    unit: { type: String, required: true },
    deadline: { type: Date, required: true },
    ownerId: { type: String, required: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

GoalSchema.index({ ownerId: 1 });

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);

// Workout Plan
export interface IWorkoutPlan {
  _id: string;
  name: string;
  description: string;
  trainerId: string;
  assignedAthleteIds: string[];
  workoutDays: {
    dayName: string;
    exercises: {
      exerciseId: string;
      sets: {
        reps: number;
        weight?: number;
      }[];
      duration?: number;
    }[];
  }[];
  isDraft: boolean;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    trainerId: { type: String, required: true },
    assignedAthleteIds: [{ type: String }],
    workoutDays: [{
      dayName: { type: String, required: true },
      exercises: [{
        exerciseId: { type: String, required: true },
        sets: [{
          reps: { type: Number, required: true },
          weight: { type: Number },
        }],
        duration: { type: Number },
      }],
    }],
    isDraft: { type: Boolean, default: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

WorkoutPlanSchema.index({ trainerId: 1 });
WorkoutPlanSchema.index({ assignedAthleteIds: 1 });

export const WorkoutPlan: Model<IWorkoutPlan> =
  mongoose.models.WorkoutPlan || mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);

// Planned Workout
export interface IPlannedWorkout {
  _id: string;
  date: Date;
  workoutName: string;
  exercises: {
    name: string;
    sets?: string;
    reps?: string;
    rest?: string;
    duration?: string;
  }[];
  ownerId: string;
}

const PlannedWorkoutSchema = new Schema<IPlannedWorkout>(
  {
    date: { type: Date, required: true },
    workoutName: { type: String, required: true },
    exercises: [{
      name: { type: String, required: true },
      sets: { type: String },
      reps: { type: String },
      rest: { type: String },
      duration: { type: String },
    }],
    ownerId: { type: String, required: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

PlannedWorkoutSchema.index({ ownerId: 1, date: 1 });

export const PlannedWorkout: Model<IPlannedWorkout> =
  mongoose.models.PlannedWorkout || mongoose.model<IPlannedWorkout>('PlannedWorkout', PlannedWorkoutSchema);

// Muscle Group
export interface IMuscleGroup {
  _id: string;
  name: string;
  imageUrl?: string;
  imageHint?: string;
}

const MuscleGroupSchema = new Schema<IMuscleGroup>(
  {
    name: { type: String, required: true },
    imageUrl: { type: String },
    imageHint: { type: String },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const MuscleGroup: Model<IMuscleGroup> =
  mongoose.models.MuscleGroup || mongoose.model<IMuscleGroup>('MuscleGroup', MuscleGroupSchema);

// Export all models
export * from './User';
export * from './Article';
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

