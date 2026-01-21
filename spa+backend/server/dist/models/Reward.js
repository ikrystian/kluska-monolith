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
exports.Reward = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RewardSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['digital', 'physical', 'experience'],
        required: true,
    },
    fitCoinCost: { type: Number, required: true, min: 1 },
    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        required: true,
    },
    availability: {
        type: String,
        enum: ['always', 'limited', 'seasonal'],
        default: 'always',
    },
    maxRedemptions: { type: Number },
    currentRedemptions: { type: Number, default: 0 },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    createdBy: { type: String, required: true },
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
RewardSchema.index({ category: 1 });
RewardSchema.index({ tier: 1 });
RewardSchema.index({ fitCoinCost: 1 });
RewardSchema.index({ isActive: 1 });
exports.Reward = mongoose_1.default.models.Reward || mongoose_1.default.model('Reward', RewardSchema);
