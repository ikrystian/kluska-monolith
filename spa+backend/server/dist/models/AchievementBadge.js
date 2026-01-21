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
exports.AchievementBadge = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AchievementRequirementSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['streak', 'goal_count', 'workout_count', 'points_earned', 'level_reached', 'custom'],
        required: true,
    },
    value: { type: Number, required: true },
    comparison: {
        type: String,
        enum: ['gte', 'lte', 'eq'],
        default: 'gte',
    },
    customField: { type: String },
}, { _id: false });
const AchievementBadgeSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    iconUrl: { type: String },
    category: {
        type: String,
        enum: ['consistency', 'performance', 'social', 'milestone'],
        required: true,
    },
    requirement: { type: AchievementRequirementSchema, required: true },
    pointsReward: { type: Number, required: true, default: 0 },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common',
    },
    isActive: { type: Boolean, default: true },
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
AchievementBadgeSchema.index({ category: 1 });
AchievementBadgeSchema.index({ rarity: 1 });
AchievementBadgeSchema.index({ isActive: 1 });
exports.AchievementBadge = mongoose_1.default.models.AchievementBadge ||
    mongoose_1.default.model('AchievementBadge', AchievementBadgeSchema);
