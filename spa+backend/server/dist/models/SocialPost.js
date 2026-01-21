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
exports.SocialPost = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SocialPostSchema = new mongoose_1.Schema({
    authorId: { type: String, required: true },
    authorNickname: { type: String, required: true },
    authorAvatarUrl: { type: String },
    imageUrl: { type: String, required: true },
    description: { type: String, maxlength: 500, default: '' },
    likes: [{ type: String }],
    likesCount: { type: Number, default: 0 },
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
SocialPostSchema.index({ createdAt: -1 }); // For feed pagination
SocialPostSchema.index({ authorId: 1 }); // For user's posts
SocialPostSchema.index({ authorId: 1, createdAt: -1 }); // For user's recent posts
// Pre-save middleware to update likesCount
SocialPostSchema.pre('save', function () {
    this.likesCount = this.likes.length;
});
exports.SocialPost = mongoose_1.default.models.SocialPost || mongoose_1.default.model('SocialPost', SocialPostSchema);
