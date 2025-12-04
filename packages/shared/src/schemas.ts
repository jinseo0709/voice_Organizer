import { z } from 'zod';

export const VoiceMemoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  audioUrl: z.string().url(),
  duration: z.number().positive(),
  fileSize: z.number().positive().optional(),
  transcription: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateVoiceMemoSchema = VoiceMemoSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const UpdateVoiceMemoSchema = VoiceMemoSchema.partial().omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AudioProcessingResultSchema = z.object({
  transcription: z.string(),
  summary: z.string().optional(),
  keywords: z.array(z.string()),
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

export type VoiceMemo = z.infer<typeof VoiceMemoSchema>;
export type CreateVoiceMemo = z.infer<typeof CreateVoiceMemoSchema>;
export type UpdateVoiceMemo = z.infer<typeof UpdateVoiceMemoSchema>;
export type User = z.infer<typeof UserSchema>;
export type AudioProcessingResult = z.infer<typeof AudioProcessingResultSchema>;