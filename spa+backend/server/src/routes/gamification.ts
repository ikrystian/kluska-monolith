import express, { Response } from 'express';
import { AuthRequest } from './auth';
import {
    getGamificationStats,
    recordCheckin,
    getLeaderboard,
    getAvailableRewards,
    redeemReward,
    getPointHistory,
    awardGoalCompletionPoints,
} from '../lib/gamification/gamification-service';
import { Reward } from '../models/Reward';
import {
    getAchievementsWithProgress,
    getUnlockedAchievements,
    checkAndAwardAchievements,
    seedDefaultAchievements
} from '../lib/gamification/achievement-checker';

const router = express.Router();

// Middleware to get user from request attached by auth middleware
// Assuming auth middleware is used and user is in req.body.user via auth middleware or similar
// Typically we'd have a middleware that sets req.user.
// But looking at other routes (e.g. auth.ts), it seems we might need to handle auth.
// However, the client sends cookies or token.
// The `db - hooks.tsx` sends fetch requests.
// We'll assume for now we can get the user ID from the request user object.
// If not, we might need a middleware.
// Given this is a simple migration, I'll extract userId from query/body or assume a middleware exists.
// BUT, the existing routes like `db.ts` use `req.user` if they have auth middleware.
// Let's assume standard express request with user.


// GET /profile - Get gamification stats
router.get('/profile', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const stats = await getGamificationStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching gamification profile:', error);
        res.status(500).json({ error: 'Failed to fetch gamification profile' });
    }
});

// POST /profile - Actions like checkin
router.post('/profile', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const { action } = req.body;

        if (action === 'checkin') {
            const result = await recordCheckin(userId);
            return res.json(result);
        }

        res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('Error processing gamification action:', error);
        res.status(500).json({ error: 'Failed to process action' });
    }
});

// GET /achievements - Get achievements
router.get('/achievements', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const unlockedOnly = req.query.unlocked === 'true';

        if (unlockedOnly) {
            const achievements = await getUnlockedAchievements(userId);
            return res.json(achievements);
        }

        const achievementsWithProgress = await getAchievementsWithProgress(userId);
        res.json(achievementsWithProgress);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// POST /achievements - Check and award achievements
router.post('/achievements', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const newAchievements = await checkAndAwardAchievements(userId);

        res.json({
            newAchievements,
            count: newAchievements.length,
        });
    } catch (error) {
        console.error('Error checking achievements:', error);
        res.status(500).json({ error: 'Failed to check achievements' });
    }
});

// GET /leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const trainerId = req.query.trainerId as string;

        const leaderboard = await getLeaderboard(limit, trainerId);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /rewards
router.get('/rewards', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const rewards = await getAvailableRewards(userId);
        res.json(rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
});

// GET /history - Get point transaction history
router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const limit = parseInt(req.query.limit as string) || 50;
        const history = await getPointHistory(userId, limit);

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// POST /rewards - Redeem reward
router.post('/rewards', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const { rewardId } = req.body;
        if (!rewardId) return res.status(400).json({ error: 'Reward ID is required' });

        const result = await redeemReward(userId, rewardId);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({ error: 'Failed to redeem reward' });
    }
});

// Seed default achievements (Internal/Admin use)
router.post('/seed-achievements', async (req: AuthRequest, res: Response) => {
    try {
        await seedDefaultAchievements();
        res.json({ message: 'Default achievements seeded' });
    } catch (error) {
        console.error('Error seeding achievements:', error);
        res.status(500).json({ error: 'Failed to seed achievements' });
    }
});

// POST /goals/:goalId/complete
router.post('/goals/:goalId/complete', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const { goalId } = req.params;
        const { trainerApproval } = req.body;

        const result = await awardGoalCompletionPoints(goalId, userId, trainerApproval);
        res.json(result);

    } catch (error) {
        console.error('Error completing goal:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to complete goal' });
    }
});

// Admin Reward Routes

// GET /admin/rewards
router.get('/admin/rewards', async (req: AuthRequest, res: Response) => {
    try {
        // In a real app, verify admin role here
        const rewards = await Reward.find().sort({ createdAt: -1 });
        res.json(rewards);
    } catch (error) {
        console.error('Error fetching admin rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
});

// POST /admin/rewards
router.post('/admin/rewards', async (req: AuthRequest, res: Response) => {
    try {
        const reward = new Reward(req.body);
        await reward.save();
        res.status(201).json(reward);
    } catch (error) {
        console.error('Error creating reward:', error);
        res.status(500).json({ error: 'Failed to create reward' });
    }
});

// PUT /admin/rewards/:id
router.put('/admin/rewards/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const reward = await Reward.findByIdAndUpdate(id, req.body, { new: true });

        if (!reward) return res.status(404).json({ error: 'Reward not found' });

        res.json(reward);
    } catch (error) {
        console.error('Error updating reward:', error);
        res.status(500).json({ error: 'Failed to update reward' });
    }
});

// DELETE /admin/rewards/:id
router.delete('/admin/rewards/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await Reward.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reward:', error);
        res.status(500).json({ error: 'Failed to delete reward' });
    }
});

export const gamificationRouter = router;
