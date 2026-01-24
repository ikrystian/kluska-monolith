import { generateReactHelpers } from "@uploadthing/react";

// Mocking the router type as we can't import from server directly
// This should match the server definition in spa+backend/server/src/uploadthing.ts
import type { FileRouter } from "uploadthing/types";

// We can use 'any' for now to avoid extensive type duplication, 
// or define a minimal interface if we want better completion.
export const { useUploadThing, uploadFiles } = generateReactHelpers<any>({
    url: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/uploadthing`,
});
