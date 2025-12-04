import { type UploadMetadata } from 'firebase/storage';
export interface UploadProgress {
    bytesTransferred: number;
    totalBytes: number;
    progress: number;
}
export interface UploadResult {
    downloadURL: string;
    fullPath: string;
    size: number;
}
export declare class StorageService {
    private readonly PATHS;
    uploadAudioFile(userId: string, file: Blob, filename: string, metadata?: UploadMetadata): Promise<UploadResult>;
    uploadBuffer(buffer: Buffer, filename: string, options?: {
        contentType?: string;
        userId?: string;
    }): Promise<UploadResult>;
    uploadProfileImage(userId: string, file: Blob, filename: string): Promise<UploadResult>;
    deleteFile(filePath: string): Promise<void>;
    getDownloadURL(filePath: string): Promise<string>;
    getFileMetadata(filePath: string): Promise<import("@firebase/storage").FullMetadata>;
    deleteAllUserAudioFiles(userId: string): Promise<void>;
    private sanitizeFilename;
    validateFileSize(file: Blob, maxSizeMB?: number): boolean;
    validateAudioFile(file: File): {
        valid: boolean;
        error?: string;
    };
}
export declare const storageService: StorageService;
export default storageService;
//# sourceMappingURL=storage.d.ts.map