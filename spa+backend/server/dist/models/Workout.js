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
exports.Workout = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("@/lib/types");
const WorkoutSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    imageUrl: { type: String },
    level: { type: String, enum: Object.values(types_1.TrainingLevel), required: true },
    durationMinutes: { type: Number, required: true },
    exerciseSeries: [
        {
            exercise: { type: mongoose_1.Schema.Types.Mixed, required: true }, // Storing full exercise object for now, or could be ref
            tempo: { type: String },
            tip: { type: String },
            sets: [
                {
                    number: { type: Number, required: true },
                    type: { type: String, required: true },
                    reps: { type: Number, required: true },
                    weight: { type: Number, required: true },
                    restTimeSeconds: { type: Number, required: true },
                    completed: { type: Boolean },
                    duration: { type: Number },
                },
            ],
        },
    ],
    ownerId: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
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
WorkoutSchema.index({ ownerId: 1 });
WorkoutSchema.index({ level: 1 });
exports.Workout = mongoose_1.default.models.Workout || mongoose_1.default.model('Workout', WorkoutSchema);
