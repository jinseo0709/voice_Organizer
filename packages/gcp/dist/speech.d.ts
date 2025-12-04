import type { AudioProcessingResult } from '@voice-organizer/shared';
export interface SpeechConfig {
    projectId?: string;
    keyFilename?: string;
    credentials?: object;
    [key: string]: any;
}
export interface TranscriptionOptions {
    languageCode?: string;
    sampleRateHertz?: number;
    encoding?: string;
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    maxAlternatives?: number;
    profanityFilter?: boolean;
    model?: string;
}
export interface TranscriptionResult {
    transcript: string;
    confidence: number;
    alternatives?: Array<{
        transcript: string;
        confidence: number;
    }>;
    wordTimeOffsets?: Array<{
        word: string;
        startTimeOffset: string;
        endTimeOffset: string;
    }>;
}
export declare class SpeechToTextService {
    private client;
    constructor();
    transcribeAudio(audioBuffer: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    private transcribeShortAudio;
    private transcribeLongAudio;
    private parseRecognitionResult;
    private getFileExtension;
    private getMimeType;
    private mockTranscribeAudio;
    processAudioFile(file: File): Promise<AudioProcessingResult>;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=speech.d.ts.map