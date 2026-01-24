import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
    imageUploader: f({ image: { maxFileSize: "4MB" } })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Upload complete", file);
            return { uploadedBy: "user" };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
