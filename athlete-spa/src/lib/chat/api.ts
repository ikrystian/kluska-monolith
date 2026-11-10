import { apiFetch } from '@/lib/api-client';
import type { Conversation, Message } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await apiFetch(path, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        });
    } catch {
        throw new Error('Brak połączenia z internetem. Spróbuj ponownie.');
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(body?.error || 'Coś poszło nie tak. Spróbuj ponownie.');
    }
    return body?.data as T;
}

/** Opens (or creates) the conversation with `userId`; `text` is sent in it right away. */
export function startConversation(userId: string, text?: string) {
    return request<Conversation>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ userId, text }),
    });
}

export function postMessage(conversationId: string, text: string) {
    return request<Message>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
}

export function markConversationRead(conversationId: string) {
    return request<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' });
}

export function removeConversation(conversationId: string) {
    return request<void>(`/api/conversations/${conversationId}`, { method: 'DELETE' });
}
