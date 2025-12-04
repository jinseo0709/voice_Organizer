"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioProcessingResultSchema = exports.UserSchema = exports.UpdateVoiceMemoSchema = exports.CreateVoiceMemoSchema = exports.VoiceMemoSchema = void 0;
const zod_1 = require("zod");
exports.VoiceMemoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    title: zod_1.z.string().optional(),
    audioUrl: zod_1.z.string().url(),
    duration: zod_1.z.number().positive(),
    fileSize: zod_1.z.number().positive().optional(),
    transcription: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    category: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.CreateVoiceMemoSchema = exports.VoiceMemoSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdateVoiceMemoSchema = exports.VoiceMemoSchema.partial().omit({
    id: true,
    userId: true,
    createdAt: true
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string().optional(),
    photoURL: zod_1.z.string().url().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.AudioProcessingResultSchema = zod_1.z.object({
    transcription: zod_1.z.string(),
    summary: zod_1.z.string().optional(),
    keywords: zod_1.z.array(zod_1.z.string()),
    category: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
});
//# sourceMappingURL=schemas.js.map