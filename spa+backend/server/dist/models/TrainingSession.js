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
exports.TrainingSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TrainingSessionSchema = new mongoose_1.Schema({
    trainerId: { type: String, required: true },
    trainerName: { type: String, required: true },
    athleteId: { type: String, required: true },
    athleteName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    duration: { type: Number, required: true, default: 60 },
    location: { type: String },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: { type: String },
    workoutId: { type: String },
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            const obj = ret;
            obj.id = obj._id.toString();
            delete obj.__v;
            return obj;
        },
    },
});
// Indeksy dla szybkiego wyszukiwania
TrainingSessionSchema.index({ trainerId: 1, date: 1 });
TrainingSessionSchema.index({ athleteId: 1, date: 1 });
TrainingSessionSchema.index({ trainerId: 1, status: 1 });
exports.TrainingSession = mongoose_1.default.models.TrainingSession || mongoose_1.default.model('TrainingSession', TrainingSessionSchema);
