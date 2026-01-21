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
exports.Goal = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const GoalSchema = new mongoose_1.Schema({
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    deadline: { type: Date },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
    },
    // Gamification fields
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'expert'],
        default: 'medium',
    },
    category: {
        type: String,
        enum: ['strength', 'cardio', 'flexibility', 'weight', 'nutrition', 'habit', 'other'],
        default: 'other',
    },
    assignedByTrainerId: { type: String },
    basePoints: { type: Number, default: 100 },
    trainerApproved: { type: Boolean, default: false },
    completedAt: { type: Date },
    pointsAwarded: { type: Number },
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
GoalSchema.index({ ownerId: 1, status: 1 });
GoalSchema.index({ deadline: 1 });
GoalSchema.index({ assignedByTrainerId: 1 });
GoalSchema.index({ difficulty: 1 });
GoalSchema.index({ category: 1 });
exports.Goal = mongoose_1.default.models.Goal || mongoose_1.default.model('Goal', GoalSchema);
