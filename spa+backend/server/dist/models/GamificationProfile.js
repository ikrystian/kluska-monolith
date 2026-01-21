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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationProfile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StreakSchema = new mongoose_1.Schema({
    workout: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    checkins: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date },
    lastGoalDate: { type: Date },
    lastCheckinDate: { type: Date },
}, { _id: false });
const PointTransactionSchema = new mongoose_1.Schema({
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['earned', 'spent', 'bonus', 'expired'],
        required: true,
    },
    source: {
        type: String,
        enum: ['goal_completion', 'workout_completion', 'streak_bonus', 'achievement', 'reward_redemption', 'admin_adjustment'],
        required: true,
    },
    sourceId: { type: String },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const GamificationProfileSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    totalPointsEarned: { type: Number, default: 0 },
    currentFitCoins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    experiencePoints: { type: Number, default: 0 },
    streaks: { type: StreakSchema, default: () => ({}) },
    achievements: [{ type: String }],
    redeemedRewards: [
        {
            rewardId: { type: String, required: true },
            redeemedAt: { type: Date, default: Date.now },
            fitCoinsCost: { type: Number, required: true },
        },
    ],
    pointTransactions: [PointTransactionSchema],
    rank: { type: Number },
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            ret.id = ret._id.toString();
            delete ret.__v;
            return ret;
        },
    },
});
// GamificationProfileSchema.index({ userId: 1 }); - Removed as already unique in schema
GamificationProfileSchema.index({ totalPointsEarned: -1 });
GamificationProfileSchema.index({ currentFitCoins: -1 });
GamificationProfileSchema.index({ level: -1 });
exports.GamificationProfile = mongoose_1.default.models.GamificationProfile ||
    mongoose_1.default.model('GamificationProfile', GamificationProfileSchema);
