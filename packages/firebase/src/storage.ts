import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  type UploadMetadata,
  type StorageReference,
} from 'firebase/storage';
import firebase from './config';

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

export class StorageService {
  private readonly PATHS = {
    AUDIO_FILES: 'audio-files',
    PROFILE_IMAGES: 'profile-images',
  } as const;

  // 오디오 파일 업로드
  async uploadAudioFile(
    userId: string,
    file: Blob,
    filename: string,
    metadata?: UploadMetadata
  ): Promise<UploadResult> {
    try {
      // Firebase Storage 초기화 확인
      let storage;
      try {
        storage = firebase.getStorage();
      } catch (error) {
        console.error('Firebase Storage not initialized:', error);
        throw new Error('Firebase Storage가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
      }

      const sanitizedFilename = this.sanitizeFilename(filename);
      const filePath = `${this.PATHS.AUDIO_FILES}/${userId}/${Date.now()}_${sanitizedFilename}`;
      const storageRef = ref(storage, filePath);

      // Content-Type 명시적 설정 (파일 확장자 기반)
      let contentType = file.type || 'application/octet-stream';
      const fileName = filename.toLowerCase();
      
      if (fileName.endsWith('.m4a')) {
        contentType = 'audio/mp4';
      } else if (fileName.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (fileName.endsWith('.wav')) {
        contentType = 'audio/wav';
      } else if (fileName.endsWith('.aac')) {
        contentType = 'audio/aac';
      } else if (fileName.endsWith('.webm')) {
        contentType = 'audio/webm';
      } else if (fileName.endsWith('.ogg')) {
        contentType = 'audio/ogg';
      }

      const uploadMetadata: UploadMetadata = {
        contentType,
        customMetadata: {
          userId,
          uploadedAt: new Date().toISOString(),
          originalType: file.type || 'unknown',
          ...metadata?.customMetadata,
        },
        ...metadata,
      };

      const snapshot = await uploadBytes(storageRef, file, uploadMetadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        downloadURL,
        fullPath: snapshot.ref.fullPath,
        size: snapshot.metadata.size,
      };
    } catch (error) {
      console.error('Failed to upload audio file:', error);
      throw error;
    }
  }

  // Buffer를 파일로 업로드 (GCP Speech-to-Text용)
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options?: {
      contentType?: string;
      userId?: string;
    }
  ): Promise<UploadResult> {
    try {
      const storage = firebase.getStorage();
      const sanitizedFilename = this.sanitizeFilename(filename);
      const filePath = `temp-audio/${Date.now()}_${sanitizedFilename}`;
      const storageRef = ref(storage, filePath);

      const metadata: UploadMetadata = {
        contentType: options?.contentType || 'audio/webm',
        customMetadata: {
          userId: options?.userId || 'system',
          uploadedAt: new Date().toISOString(),
          temporary: 'true',
        },
      };

      // Buffer를 Uint8Array로 변환하여 업로드
      const uint8Array = new Uint8Array(buffer);
      const snapshot = await uploadBytes(storageRef, uint8Array, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        downloadURL,
        fullPath: snapshot.ref.fullPath,
        size: snapshot.metadata.size,
      };
    } catch (error) {
      console.error('Failed to upload buffer:', error);
      throw error;
    }
  }

  // 프로필 이미지 업로드
  async uploadProfileImage(
    userId: string,
    file: Blob,
    filename: string
  ): Promise<UploadResult> {
    try {
      const sanitizedFilename = this.sanitizeFilename(filename);
      const filePath = `${this.PATHS.PROFILE_IMAGES}/${userId}/${sanitizedFilename}`;
      const storageRef = ref(firebase.getStorage(), filePath);

      const metadata: UploadMetadata = {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        downloadURL,
        fullPath: snapshot.ref.fullPath,
        size: snapshot.metadata.size,
      };
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      throw error;
    }
  }

  // 파일 삭제
  async deleteFile(filePath: string): Promise<void> {
    try {
      const storageRef = ref(firebase.getStorage(), filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  // 다운로드 URL 가져오기
  async getDownloadURL(filePath: string): Promise<string> {
    try {
      const storageRef = ref(firebase.getStorage(), filePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw error;
    }
  }

  // 파일 메타데이터 가져오기
  async getFileMetadata(filePath: string) {
    try {
      const storageRef = ref(firebase.getStorage(), filePath);
      return await getMetadata(storageRef);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  // 사용자의 모든 오디오 파일 삭제
  async deleteAllUserAudioFiles(userId: string): Promise<void> {
    // Note: Firebase Storage는 폴더 전체 삭제를 직접 지원하지 않으므로
    // 실제 구현에서는 Cloud Function이나 Admin SDK를 사용해야 함
    console.warn('Batch deletion requires Cloud Function or Admin SDK');
    throw new Error('Batch deletion not supported in client SDK');
  }

  // 파일명 정리 (특수문자 제거)
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  // 파일 크기 검증
  validateFileSize(file: Blob, maxSizeMB = 50): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  }

  // 오디오 파일 형식 검증
  validateAudioFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mp3', 'audio/m4a'];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`
      };
    }

    if (!this.validateFileSize(file)) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 50MB.'
      };
    }

    return { valid: true };
  }
}

export const storageService = new StorageService();
export default storageService;