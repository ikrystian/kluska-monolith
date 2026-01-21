import mongoose, { Schema, Model, Document } from 'mongoose';

export interface INotification extends Omit<Document, '_id'> {
    _id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: { type: String, required: true },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'error'],
            default: 'info',
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        isRead: { type: Boolean, default: false },
        metadata: { type: Map, of: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_, ret) => {
                (ret as any).id = ret._id.toString();
                delete (ret as any).__v;
                return ret;
            },
        },
    }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
