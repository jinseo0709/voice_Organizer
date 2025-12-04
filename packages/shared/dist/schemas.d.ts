import { z } from 'zod';
export declare const VoiceMemoSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    audioUrl: z.ZodString;
    duration: z.ZodNumber;
    fileSize: z.ZodOptional<z.ZodNumber>;
    transcription: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    audioUrl: string;
    duration: number;
    title?: string | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    audioUrl: string;
    duration: number;
    title?: string | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}>;
export declare const CreateVoiceMemoSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    userId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    audioUrl: z.ZodString;
    duration: z.ZodNumber;
    fileSize: z.ZodOptional<z.ZodNumber>;
    transcription: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
    userId: string;
    audioUrl: string;
    duration: number;
    title?: string | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}, {
    userId: string;
    audioUrl: string;
    duration: number;
    title?: string | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}>;
export declare const UpdateVoiceMemoSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    audioUrl: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    fileSize: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    transcription: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    summary: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "id" | "createdAt" | "userId">, "strip", z.ZodTypeAny, {
    updatedAt?: Date | undefined;
    title?: string | undefined;
    audioUrl?: string | undefined;
    duration?: number | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}, {
    updatedAt?: Date | undefined;
    title?: string | undefined;
    audioUrl?: string | undefined;
    duration?: number | undefined;
    fileSize?: number | undefined;
    transcription?: string | undefined;
    summary?: string | undefined;
    tags?: string[] | undefined;
    category?: string | undefined;
}>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    photoURL: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    displayName?: string | undefined;
    photoURL?: string | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    displayName?: string | undefined;
    photoURL?: string | undefined;
}>;
export declare const AudioProcessingResultSchema: z.ZodObject<{
    transcription: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    keywords: z.ZodArray<z.ZodString, "many">;
    category: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    transcription: string;
    category: string;
    keywords: string[];
    confidence: number;
    summary?: string | undefined;
}, {
    transcription: string;
    category: string;
    keywords: string[];
    confidence: number;
    summary?: string | undefined;
}>;
export type VoiceMemo = z.infer<typeof VoiceMemoSchema>;
export type CreateVoiceMemo = z.infer<typeof CreateVoiceMemoSchema>;
export type UpdateVoiceMemo = z.infer<typeof UpdateVoiceMemoSchema>;
export type User = z.infer<typeof UserSchema>;
export type AudioProcessingResult = z.infer<typeof AudioProcessingResultSchema>;
//# sourceMappingURL=schemas.d.ts.map