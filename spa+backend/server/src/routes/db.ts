import express from 'express';
import mongoose from 'mongoose';
import * as Models from '../models';

export const dbRouter = express.Router();

const modelMap: Record<string, any> = {
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
    personalRecords: Models.PersonalRecord,
    notifications: Models.Notification,
    gamificationProfiles: Models.GamificationProfile,
    rewards: Models.Reward,
    nutritionGoals: Models.NutritionGoal,
    savedMeals: Models.SavedMeal,
    dietPlans: Models.DietPlan,
    customProducts: Models.CustomProduct,
    achievementBadges: Models.AchievementBadge,
};

// GET /api/db/:collection
dbRouter.get('/:collection', async (req, res) => {
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
            } catch (e) {
                console.error("Invalid query param", e);
            }
        }

        if (typeof sort === 'string') {
            try {
                const sortObj = JSON.parse(sort);
                dbQuery = dbQuery.sort(sortObj);
            } catch (e) {
                console.error("Invalid sort param", e);
            }
        }

        if (typeof limit === 'string') {
            const limitNum = parseInt(limit);
            if (!isNaN(limitNum)) {
                dbQuery = dbQuery.limit(limitNum);
            }
        }

        const data = await dbQuery.exec();
        res.json({ data });

    } catch (error) {
        console.error('GET /api/db/:collection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/db/:collection
dbRouter.post('/:collection', async (req, res) => {
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
        await doc.save();

        res.status(201).json({ data: doc.toJSON() });
    } catch (error) {
        console.error('POST /api/db/:collection error:', error);
        res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// GET /api/db/:collection/:id
dbRouter.get('/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];

        if (!Model && collection === 'workoutPlans') Model = Models.WorkoutPlan;

        if (!Model) return res.status(404).json({ error: 'Collection not found' });

        const doc = await Model.findById(id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        res.json({ data: doc });
    } catch (error) {
        console.error('GET /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/db/:collection/:id
dbRouter.put('/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];

        if (!Model && collection === 'workoutPlans') Model = Models.WorkoutPlan;
        if (!Model) return res.status(404).json({ error: 'Collection not found' });

        const doc = await Model.findByIdAndUpdate(id, req.body, { new: true });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        res.json({ data: doc });

    } catch (error) {
        console.error('PUT /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /api/db/:collection/:id
dbRouter.patch('/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];

        if (!Model && collection === 'workoutPlans') Model = Models.WorkoutPlan;
        if (!Model) return res.status(404).json({ error: 'Collection not found' });

        const doc = await Model.findByIdAndUpdate(id, req.body, { new: true });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        res.json({ data: doc });

    } catch (error) {
        console.error('PATCH /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/db/:collection/:id
dbRouter.delete('/:collection/:id', async (req, res) => {
    try {
        const { collection, id } = req.params;
        let Model = modelMap[collection];

        if (!Model && collection === 'workoutPlans') Model = Models.WorkoutPlan;
        if (!Model) return res.status(404).json({ error: 'Collection not found' });

        const doc = await Model.findByIdAndDelete(id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        res.json({ data: true });

    } catch (error) {
        console.error('DELETE /api/db/:collection/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
