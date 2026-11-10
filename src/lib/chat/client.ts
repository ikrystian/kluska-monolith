import type { Conversation, Message } from './types';

export const CONVERSATIONS_KEY = '/api/conversations';
export const messagesKey = (conversationId: string) => `/api/conversations/${conversationId}/messages`;

/** SWR fetcher for the chat routes (`{ data }` envelope). */
export async function chatFetcher<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return (await response.json()).data as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    } catch {
        throw new Error('Brak połączenia z internetem. Spróbuj ponownie.');
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || 'Coś poszło nie tak. Spróbuj ponownie.');
    return body?.data as T;
}

/** Opens (or creates) the conversation with `userId`; `text` is sent in it right away. */
export const startConversation = (userId: string, text?: string) =>
    request<Conversation>('/api/conversations', { method: 'POST', body: JSON.stringify({ userId, text }) });

export const postMessage = (conversationId: string, text: string) =>
    request<Message>(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });

export const markConversationRead = (conversationId: string) =>
    request<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' });

export const removeConversation = (conversationId: string) =>
    request<void>(`/api/conversations/${conversationId}`, { method: 'DELETE' });
