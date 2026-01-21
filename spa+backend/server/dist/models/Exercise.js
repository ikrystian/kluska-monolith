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
exports.Exercise = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MuscleGroupSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String }
});
const ExerciseSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    // New fields
    mainMuscleGroups: [MuscleGroupSchema],
    secondaryMuscleGroups: [MuscleGroupSchema],
    instructions: { type: String },
    mediaUrl: { type: String },
    // Legacy fields
    muscleGroup: { type: String },
    description: { type: String },
    image: { type: String },
    imageHint: { type: String },
    ownerId: { type: String },
    type: {
        type: String,
        enum: ['weight', 'duration', 'reps'],
        required: true,
        default: 'weight'
    },
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
// Indexes
ExerciseSchema.index({ muscleGroup: 1 });
ExerciseSchema.index({ ownerId: 1 });
ExerciseSchema.index({ type: 1 });
ExerciseSchema.index({ name: 'text' });
exports.Exercise = mongoose_1.default.models.Exercise || mongoose_1.default.model('Exercise', ExerciseSchema);
