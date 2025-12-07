// 카테고리별 요약 항목
export interface CategorySummary {
  category: string;
  summary?: string;
  summary_list?: string[];
  ai_supplement?: string;
}

export interface VoiceMemo {
  id: string;
  userId: string;
  title?: string;
  audioUrl: string;
  duration: number; // seconds
  fileSize?: number; // bytes
  transcription?: string;
  summary?: string;
  tags?: string[];
  category?: string;
  allCategories?: CategorySummary[]; // 모든 카테고리별 요약
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