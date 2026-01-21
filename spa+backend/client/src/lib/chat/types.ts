export interface Conversation {
    id: string;
    conversationId: string;
    participants: string[];
    trainerId: string;
    athleteId: string;
    trainerName: string;
    athleteName: string;
    lastMessage: {
        text: string;
        senderId: string;
        createdAt: Date;
    } | null;
    updatedAt: Date;
    unreadCount?: {
        [userId: string]: number;
    };
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: Date;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'athlete' | 'trainer' | 'admin';
    trainerId?: string;
    avatarUrl?: string;
}
