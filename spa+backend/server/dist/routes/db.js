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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbRouter = void 0;
const express_1 = __importDefault(require("express"));
const Models = __importStar(require("../models"));
exports.dbRouter = express_1.default.Router();
const modelMap = {
    users: Models.User,
    articles: Models.Article,
    articleCategories: Models.ArticleCategory,
    exercises: Models.Exercise,
    workoutLogs: Models.WorkoutLog,
    goals: Models.Goal,
    workoutPlans: Models.WorkoutPlan,
    plannedWorkouts: Models.PlannedWorkout,
    muscleGroups: Models.MuscleGroup,
    conversations: Models.Conversation,
    messages: Models.Message,
    bodyMeasurements: Models.BodyMeasurement,
    trainerRequests: Models.TrainerRequest,
    meals: Models.Meal,
    runningSessions: Models.RunningSession,
    achievements: Models.Achievement,
    gyms: Models.Gym,
    workouts: Models.Workout,
    socialProfiles: Models.SocialProfile,
    socialPosts: Models.SocialPost,
    trainingSessions: Models.TrainingSession,
    habits: Models.Habit,
    habitlogs: Models.HabitLog,
};
// GET /api/db/:collection
exports.dbRouter.get('/:collection', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { collection } = req.params;
        const { query, sort, limit } = req.query;
        let Model = modelMap[collection];
        // Robust lookup fallback (mirrored from Next.js app)
        if (!Model && collection === 'workoutPlans') {
            Model = Models.WorkoutPlan;
        }
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        let dbQuery = Model.find();
        if (typeof query === 'string') {
            try {
                const queryObj = JSON.parse(query);
                dbQuery = dbQuery.find(queryObj);
            }
            catch (e) {
                console.error("Invalid query param", e);
            }
        }
        if (typeof sort === 'string') {
            try {
                const sortObj = JSON.parse(sort);
                dbQuery = dbQuery.sort(sortObj);
            }
            catch (e) {
                console.error("Invalid sort param", e);
            }
        }
        if (typeof limit === 'string') {
            const limitNum = parseInt(limit);
            if (!isNaN(limitNum)) {
                dbQuery = dbQuery.limit(limitNum);
            }
        }
        const data = yield dbQuery.exec();
        res.json({ data });
    }
    catch (error) {
        console.error('GET /api/db/:collection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// POST /api/db/:collection
exports.dbRouter.post('/:collection', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { collection } = req.params;
        let Model = modelMap[collection];
        // Robust lookup fallback
        if (!Model && collection === 'workoutPlans') {
            Model = Models.WorkoutPlan;
        }
        if (!Model) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        const doc = new Model(req.body);
        yield doc.save();
        res.status(201).json({ data: doc.toJSON() });
    }
    catch (error) {
        console.error('POST /api/db/:collection error:', error);
        res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
// GET /api/db/:collection/:id
exports.dbRouter.get('/:collection/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];
        if (!Model && collection === 'workoutPlans')
            Model = Models.WorkoutPlan;
        if (!Model)
            return res.status(404).json({ error: 'Collection not found' });
        const doc = yield Model.findById(id);
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        res.json({ data: doc });
    }
    catch (error) {
        console.error('GET /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// PUT /api/db/:collection/:id
exports.dbRouter.put('/:collection/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];
        if (!Model && collection === 'workoutPlans')
            Model = Models.WorkoutPlan;
        if (!Model)
            return res.status(404).json({ error: 'Collection not found' });
        const doc = yield Model.findByIdAndUpdate(id, req.body, { new: true });
        if (!doc)
            return res.status(404).json({ error: 'Document not found' });
        res.json({ data: doc });
    }
    catch (error) {
        console.error('PUT /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
