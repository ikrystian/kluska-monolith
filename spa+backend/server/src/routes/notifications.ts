import express from 'express';
import { Notification } from '../models/Notification';

export const notificationsRouter = express.Router();

// Helper to get userId (duplicated from gamification.ts, should be in middleware)
const getUserId = (req: any): string | null => {
    if (req.user && req.user.id) return req.user.id;
    return req.headers['x-user-id'] as string || null;
};

// GET /api/notifications
notificationsRouter.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const limit = parseInt(req.query.limit as string) || 20;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        // Fetch notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        // Get unread count
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({
            data: notifications,
            meta: {
                unreadCount,
                page,
                limit
            }
        });

    } catch (error) {
        console.error('GET /api/notifications error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /api/notifications/:id
notificationsRouter.patch('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        const updates = req.body;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId }, // Ensure user owns notification
            { $set: updates },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ data: notification });

    } catch (error) {
        console.error('PATCH /api/notifications/:id error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/notifications (Internal/Admin use or likely called by system logic, but useful to have for testing)
notificationsRouter.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Allow creating notification for self or other (if admin?)
        // For simple migration, we'll allow self-creation or just assume logic is elsewhere.
        // But handy for testing.

        const notification = new Notification({
            ...req.body,
            userId: req.body.userId || userId
        });

        await notification.save();
        res.status(201).json({ data: notification });
    } catch (error) {
        console.error('POST /api/notifications error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
