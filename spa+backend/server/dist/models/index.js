"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetType = exports.TrainingLevel = exports.MuscleGroupName = void 0;
// Export all Mongoose models
__exportStar(require("./User"), exports);
__exportStar(require("./Article"), exports);
__exportStar(require("./ArticleCategory"), exports);
__exportStar(require("./Exercise"), exports);
__exportStar(require("./WorkoutLog"), exports);
__exportStar(require("./WorkoutPlan"), exports);
__exportStar(require("./Conversation"), exports);
__exportStar(require("./Message"), exports);
__exportStar(require("./BodyMeasurement"), exports);
__exportStar(require("./RunningSession"), exports);
__exportStar(require("./Goal"), exports);
__exportStar(require("./MuscleGroup"), exports);
__exportStar(require("./Gym"), exports);
__exportStar(require("./Meal"), exports);
__exportStar(require("./NutritionGoal"), exports);
__exportStar(require("./PlannedWorkout"), exports);
__exportStar(require("./TrainerRequest"), exports);
__exportStar(require("./Achievement"), exports);
__exportStar(require("./Workout"), exports);
__exportStar(require("./PersonalRecord"), exports);
__exportStar(require("./SocialProfile"), exports);
__exportStar(require("./SocialPost"), exports);
__exportStar(require("./CustomProduct"), exports);
__exportStar(require("./DietPlan"), exports);
__exportStar(require("./SavedMeal"), exports);
__exportStar(require("./TrainingSession"), exports);
// Gamification models
__exportStar(require("./GamificationProfile"), exports);
__exportStar(require("./Reward"), exports);
__exportStar(require("./AchievementBadge"), exports);
__exportStar(require("./Notification"), exports);
// Habits models
__exportStar(require("./Habit"), exports);
__exportStar(require("./HabitLog"), exports);
// Export enums from types (no conflicts)
var enums_1 = require("./types/enums");
Object.defineProperty(exports, "MuscleGroupName", { enumerable: true, get: function () { return enums_1.MuscleGroupName; } });
Object.defineProperty(exports, "TrainingLevel", { enumerable: true, get: function () { return enums_1.TrainingLevel; } });
Object.defineProperty(exports, "SetType", { enumerable: true, get: function () { return enums_1.SetType; } });
