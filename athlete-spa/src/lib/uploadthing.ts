import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from '@uploadthing/react';
import type { FileRouter } from 'uploadthing/types';
import { getApiBaseUrl } from '@/lib/api-client';

// Mirrors the shape of `OurFileRouter` from the backend's
// src/app/api/uploadthing/core.ts (only the `imageUploader` endpoint is used
// by the athlete module). Duplicated locally since this SPA is a separate
// Vite project and can't import across the Next.js app's module graph.
type OurFileRouter = FileRouter;

const url = `${getApiBaseUrl()}/api/uploadthing`;

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({ url });

export const UploadButton = generateUploadButton<OurFileRouter>({ url });
export const UploadDropzone = generateUploadDropzone<OurFileRouter>({ url });
