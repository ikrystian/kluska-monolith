/**
 * API Client for communicating with the Express backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const { token, ...fetchOptions } = options;
        const authToken = token || this.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        // If body is FormData, let the browser set the Content-Type with boundary
        if (fetchOptions.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    // Auth endpoints
    async login(email: string, password: string) {
        return this.request<{ token: string; user: any }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async register(data: { email: string; password: string; name: string; role?: string }) {
        return this.request<{ token: string; user: any }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMe() {
        return this.request<any>('/api/auth/me');
    }

    // Generic CRUD operations for collections
    async getCollection<T>(collection: string, query?: Record<string, any>): Promise<T[]> {
        const params = query ? `?${new URLSearchParams(query as any).toString()}` : '';
        return this.request<T[]>(`/api/db/${collection}${params}`);
    }

    async getDocument<T>(collection: string, id: string): Promise<T> {
        return this.request<T>(`/api/db/${collection}/${id}`);
    }

    async createDocument<T>(collection: string, data: Partial<T>): Promise<T> {
        return this.request<T>(`/api/db/${collection}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateDocument<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
        return this.request<T>(`/api/db/${collection}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteDocument(collection: string, id: string): Promise<void> {
        return this.request(`/api/db/${collection}/${id}`, {
            method: 'DELETE',
        });
    }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
