export interface VoiceMemo {
    id: string;
    userId: string;
    title?: string;
    audioUrl: string;
    duration: number;
    fileSize?: number;
    transcription?: string;
    summary?: string;
    tags?: string[];
    category?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface User {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    isAnonymous?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AudioProcessingResult {
    transcription: string;
    summary?: string;
    keywords: string[];
    category: string;
    confidence: number;
}
//# sourceMappingURL=types.d.ts.map