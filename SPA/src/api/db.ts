import { apiClient } from './client';

export interface CollectionQueryOptions {
  query?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
}

export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

// Fetch collection with query params
export async function fetchCollection<T>(
  collection: string,
  options?: CollectionQueryOptions
): Promise<T[]> {
  const params = new URLSearchParams();

  if (options?.query && Object.keys(options.query).length > 0) {
    params.append('query', JSON.stringify(options.query));
  }
  if (options?.sort) {
    params.append('sort', JSON.stringify(options.sort));
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }

  const response = await apiClient.get<ApiResponse<T[]>>(
    `/api/db/${collection}?${params.toString()}`
  );
  return response.data.data || [];
}

// Fetch single document
export async function fetchDocument<T>(
  collection: string,
  id: string
): Promise<T | null> {
  const response = await apiClient.get<ApiResponse<T>>(
    `/api/db/${collection}/${id}`
  );
  return response.data.data || null;
}

// Create document
export async function createDocument<T>(
  collection: string,
  data: Partial<T>
): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(
    `/api/db/${collection}`,
    data
  );
  return response.data.data;
}

// Update document
export async function updateDocument<T>(
  collection: string,
  id: string,
  data: Partial<T>
): Promise<T> {
  const response = await apiClient.patch<ApiResponse<T>>(
    `/api/db/${collection}/${id}`,
    data
  );
  return response.data.data;
}

// Delete document
export async function deleteDocument(
  collection: string,
  id: string
): Promise<boolean> {
  await apiClient.delete(`/api/db/${collection}/${id}`);
  return true;
}
