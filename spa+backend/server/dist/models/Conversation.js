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
exports.Conversation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ConversationSchema = new mongoose_1.Schema({
    conversationId: { type: String, required: true, unique: true },
    participants: [{ type: String, required: true }],
    trainerId: { type: String, required: true },
    athleteId: { type: String, required: true },
    trainerName: { type: String, required: true },
    athleteName: { type: String, required: true },
    lastMessage: {
        text: { type: String },
        senderId: { type: String },
        createdAt: { type: Date },
    },
    unreadCount: { type: Map, of: Number },
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
// ConversationSchema.index({ conversationId: 1 }); - Removed as it's already unique defined in schema
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ trainerId: 1 });
ConversationSchema.index({ athleteId: 1 });
ConversationSchema.index({ updatedAt: -1 });
exports.Conversation = mongoose_1.default.models.Conversation || mongoose_1.default.model('Conversation', ConversationSchema);
mongoose_1.default.models.Conversation || mongoose_1.default.model('Conversation', ConversationSchema);
