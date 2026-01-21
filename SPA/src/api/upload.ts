import { apiClient } from './client';

export interface UploadResponse {
  success: boolean;
  fileId: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a file to the server
 *
 * @param file - File to upload
 * @param onProgress - Optional progress callback
 * @returns Upload response with file details
 *
 * @example
 * const file = event.target.files[0];
 * const result = await uploadFile(file, (progress) => {
 *   console.log(`Upload progress: ${progress.percentage}%`);
 * });
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        });
      }
    },
  });

  return response.data;
}

/**
 * Upload multiple files
 *
 * @param files - Array of files to upload
 * @param onProgress - Optional progress callback for each file
 * @returns Array of upload responses
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResponse[]> {
  const results: UploadResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(files[i], (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }

  return results;
}

/**
 * Get image URL by file ID
 *
 * @param fileId - File ID from upload response
 * @returns Full URL to the image
 */
export function getImageUrl(fileId: string): string {
  return `/api/images/${fileId}`;
}

/**
 * Delete an uploaded file
 *
 * @param fileId - File ID to delete
 */
export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/api/upload/${fileId}`);
}

/**
 * Upload avatar image with automatic resizing
 *
 * @param file - Image file to upload as avatar
 * @returns Upload response
 */
export async function uploadAvatar(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'avatar');

  const response = await apiClient.post<UploadResponse>('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
