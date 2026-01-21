import React from 'react';

export const useUploadThing = (endpoint: string, opts?: any) => {
    return {
        startUpload: async (files: File[]) => {
            console.log('Mock upload', files);
            return files.map(f => ({ url: URL.createObjectURL(f), name: f.name, key: 'mock-key' }));
        },
        isUploading: false,
        permittedFileInfo: null,
    };
};

export const UploadButton = (props: any) => {
    return <div className="p-4 border border-dashed rounded text-center" > Upload Button Mock </div>;
};

export const UploadDropzone = (props: any) => {
    return <div className="p-8 border-2 border-dashed rounded text-center" > Upload Dropzone Mock </div>;
};

export const uploadFiles = async (endpoint: string, { files }: { files: File[] }) => {
    console.log('Mock uploadFiles', files);
    return files.map(f => ({ url: URL.createObjectURL(f), name: f.name, key: 'mock-key' }));
};
