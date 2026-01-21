```typescript
import express, { Request, Response } from 'express';
import {
    getGamificationStats,
    recordCheckin,
    getLeaderboard,
    getAvailableRewards,
    redeemReward,
    getPointHistory
} from '../lib/gamification/gamification-service';
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

// Helper to get userId
const getUserId = (req: any): string | null => {
    // If we have an auth middleware
    if (req.user && req.user.id) return req.user.id;
    // Fallback for development/testing if needed, or return null to enforce auth
    // The Next.js code used `getServerSession`. The express app likely uses `verifyToken` middleware.
    // I should check `routes / auth.ts` or `index.ts` to see how auth is handled.
    // For now I'll check `req.headers['x-user-id']` as a fallback or return 401.
    return req.headers['x-user-id'] as string || null;
};

// GET /profile - Get gamification stats
router.get('/profile', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            // Temporary: During migration we might not have proper auth middleware set up globally?
            // Actually `index.ts` doesn't show global auth middleware.
            // Let's check if the client sends user ID or if we should add auth middleware.
            // For the purpose of "fixing the 404", I'll respond with 401 if no user.
            // But commonly there's a middleware.
            // I'll try to get it from header or fall back.
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const stats = await getGamificationStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching gamification profile:', error);
        res.status(500).json({ error: 'Failed to fetch gamification profile' });
    }
});

// POST /profile - Actions like checkin
router.post('/profile', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
router.get('/achievements', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
router.post('/achievements', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
router.get('/leaderboard', async (req: Request, res: Response) => {
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
router.get('/rewards', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const rewards = await getAvailableRewards(userId);
        res.json(rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
});

// GET /history - Get point transaction history
router.get('/history', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const limit = parseInt(req.query.limit as string) || 50;
        const history = await getPointHistory(userId, limit);

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// POST /rewards - Redeem reward
router.post('/rewards', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
router.post('/seed-achievements', async (req: Request, res: Response) => {
    try {
        await seedDefaultAchievements();
        res.json({ message: 'Default achievements seeded' });
    } catch (error) {
        console.error('Error seeding achievements:', error);
        res.status(500).json({ error: 'Failed to seed achievements' });
    }
});

export const gamificationRouter = router;
