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
exports.PersonalRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PersonalRecordSchema = new mongoose_1.Schema({
    athleteId: { type: String, required: true },
    exerciseId: { type: String, required: true },
    exerciseName: { type: String, required: true },
    type: { type: String, enum: ['max_weight', 'max_reps', 'max_duration'], required: true },
    value: { type: Number, required: true },
    reps: { type: Number },
    achievedAt: { type: Date, default: Date.now },
    workoutLogId: { type: String, required: true },
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
// Indexes for efficient queries
PersonalRecordSchema.index({ athleteId: 1 });
PersonalRecordSchema.index({ athleteId: 1, exerciseId: 1 });
PersonalRecordSchema.index({ athleteId: 1, achievedAt: -1 });
exports.PersonalRecord = mongoose_1.default.models.PersonalRecord || mongoose_1.default.model('PersonalRecord', PersonalRecordSchema);
