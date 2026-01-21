import { apiClient, setAccessToken } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
}

export interface AuthSession {
  user: User | null;
  expires: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
}

// Login user with credentials
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post('/api/auth/callback/credentials', {
    email: credentials.email,
    password: credentials.password,
    rememberMe: credentials.rememberMe ? 'true' : 'false',
  });

  if (response.data.token) {
    setAccessToken(response.data.token);
  }

  return response.data;
}

// Register new user
export async function register(data: RegisterData): Promise<{ success: boolean; message?: string }> {
  const response = await apiClient.post('/api/auth/register', data);
  return response.data;
}

// Get current session
export async function getSession(): Promise<AuthSession> {
  const response = await apiClient.get('/api/auth/session');
  return response.data;
}

// Logout user
export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/signout');
  setAccessToken(null);
}

// Get CSRF token (if needed)
export async function getCsrfToken(): Promise<string> {
  const response = await apiClient.get('/api/auth/csrf');
  return response.data.csrfToken;
}
