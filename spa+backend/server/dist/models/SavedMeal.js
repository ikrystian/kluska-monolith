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
exports.SavedMeal = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SavedMealSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    trainerId: { type: String, required: true, index: true },
    ingredients: [{
            name: { type: String, required: true },
            calories: { type: Number, required: true },
            protein: { type: Number, required: true },
            carbs: { type: Number, required: true },
            fat: { type: Number, required: true },
            source: { type: String, enum: ['fatsecret', 'manual'], required: true },
            fatSecretId: { type: String },
            amount: { type: Number },
            unit: { type: String },
        }],
    totalCalories: { type: Number, required: true },
    totalProtein: { type: Number, required: true },
    totalCarbs: { type: Number, required: true },
    totalFat: { type: Number, required: true },
    category: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Breakfast' },
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
exports.SavedMeal = mongoose_1.default.models.SavedMeal || mongoose_1.default.model('SavedMeal', SavedMealSchema);
