export type ChatRole = 'athlete' | 'trainer' | 'admin';

/** The other person in a conversation — resolved by the server, never the signed-in user. */
export interface ChatContact {
    id: string;
    name: string;
    avatarUrl?: string;
    role: ChatRole;
}

export interface Conversation {
    id: string;
    conversationId: string;
    participants: string[];
    contact: ChatContact;
    lastMessage: {
        text: string;
        senderId: string;
        createdAt: string;
    } | null;
    updatedAt: string;
    /** Messages the signed-in user has not read yet. */
    unread: number;
    /** How many of the signed-in user's latest messages the contact has not read yet. */
    unreadByContact: number;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
    /** Optimistic message still on its way to the server. */
    pending?: boolean;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: ChatRole;
    trainerId?: string;
    avatarUrl?: string;
    location?: string;
    trainerCard?: { headline?: string };
}
