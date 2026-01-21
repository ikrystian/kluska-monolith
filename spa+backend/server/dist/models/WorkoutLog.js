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
exports.WorkoutLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WorkoutSetSchema = new mongoose_1.Schema({
    number: { type: Number, required: true },
    type: { type: String, required: true },
    reps: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    restTimeSeconds: { type: Number, default: 60 },
    duration: { type: Number },
    completed: { type: Boolean, default: false }
});
// We need to define a schema for the embedded exercise snapshot
// We can reuse the schema definition from Exercise.ts or define a subset.
// Since we want a snapshot, let's define a flexible schema or import it.
// For simplicity and to avoid circular deps, let's define a schema that matches IExercise structure loosely or use Mixed.
// But better to be explicit.
const ExerciseSnapshotSchema = new mongoose_1.Schema({
    _id: { type: String }, // Store as string or ObjectId
    name: { type: String, required: true },
    mainMuscleGroups: [{ name: String, imageUrl: String }],
    secondaryMuscleGroups: [{ name: String, imageUrl: String }],
    instructions: String,
    mediaUrl: String,
    muscleGroup: String, // Legacy
    type: String
}, { _id: false }); // Don't create a separate _id for the snapshot if we store the original ID in _id field
const ExerciseSeriesSchema = new mongoose_1.Schema({
    exerciseId: { type: String, required: true },
    exercise: { type: ExerciseSnapshotSchema, required: true },
    tempo: { type: String, default: "2-0-2-0" },
    tip: { type: String },
    sets: [WorkoutSetSchema]
});
const WorkoutLogSchema = new mongoose_1.Schema({
    athleteId: { type: String, required: true },
    workoutName: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    exercises: [ExerciseSeriesSchema],
    photoURL: { type: String },
    status: {
        type: String,
        enum: ['in-progress', 'completed', 'cancelled'],
        default: 'in-progress',
    },
    feedback: { type: String },
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
WorkoutLogSchema.index({ athleteId: 1, endTime: -1 });
WorkoutLogSchema.index({ status: 1 });
WorkoutLogSchema.index({ startTime: -1 });
exports.WorkoutLog = mongoose_1.default.models.WorkoutLog || mongoose_1.default.model('WorkoutLog', WorkoutLogSchema);
