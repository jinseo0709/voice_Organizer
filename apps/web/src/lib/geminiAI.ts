// Google AI Gemini API Service
import { GoogleGenerativeAI } from '@google/generative-ai';

// API 키 검증
const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다.');
}

// Gemini AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiAIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  /**
   * 음성 인식된 텍스트를 분석하여 카테고리를 분류합니다.
   */
  async categorizeText(transcript: string): Promise<{
    category: string;
    confidence: number;
    summary: string;
    keywords: string[];
  }> {
    try {
      console.log('🤖 Gemini AI: 텍스트 분석 시작...', {
        textLength: transcript.length,
        preview: transcript.substring(0, 100) + '...'
      });

      const prompt = `
다음 음성 인식 텍스트를 분석하여 적절한 카테고리로 분류해주세요.

텍스트: "${transcript}"

다음 카테고리 중 하나를 선택해주세요:
- 업무: 회의, 업무 관련 내용, 프로젝트 논의 등
- 개인: 개인적인 생각, 일기, 메모 등
- 학습: 공부, 강의, 교육 관련 내용
- 건강: 운동, 의료, 건강 관리 관련
- 일상: 일상적인 대화, 생활 관련 내용
- 기타: 위 카테고리에 해당하지 않는 내용

응답 형식 (JSON):
{
  "category": "선택된 카테고리",
  "confidence": 0.85,
  "summary": "내용 요약 (50자 이내)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Gemini AI 원본 응답:', text);

      // JSON 응답 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);

      console.log('✅ Gemini AI 분석 완료:', analysisResult);

      // 결과 검증 및 기본값 설정
      return {
        category: analysisResult.category || '기타',
        confidence: Math.min(Math.max(analysisResult.confidence || 0.5, 0), 1),
        summary: analysisResult.summary || '내용 요약을 생성할 수 없습니다.',
        keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : []
      };

    } catch (error) {
      console.error('❌ Gemini AI 분석 실패:', error);
      
      // 기본값 반환
      return {
        category: '기타',
        confidence: 0.5,
        summary: '자동 분류에 실패했습니다. 수동으로 카테고리를 지정해주세요.',
        keywords: []
      };
    }
  }

  /**
   * 긴 텍스트를 요약합니다.
   */
  async summarizeText(text: string, maxLength: number = 100): Promise<string> {
    try {
      console.log('📝 Gemini AI: 텍스트 요약 시작...', {
        textLength: text.length,
        maxLength
      });

      const prompt = `
다음 텍스트를 ${maxLength}자 이내로 요약해주세요. 핵심 내용만 간결하게 정리해주세요.

텍스트: "${text}"

요약:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text().trim();

      console.log('✅ Gemini AI 요약 완료:', {
        originalLength: text.length,
        summaryLength: summary.length
      });

      return summary.length <= maxLength ? summary : summary.substring(0, maxLength) + '...';

    } catch (error) {
      console.error('❌ Gemini AI 요약 실패:', error);
      return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }
  }

  /**
   * 텍스트에서 키워드를 추출합니다.
   */
  async extractKeywords(text: string, maxKeywords: number = 5): Promise<string[]> {
    try {
      console.log('🏷️ Gemini AI: 키워드 추출 시작...', {
        textLength: text.length,
        maxKeywords
      });

      const prompt = `
다음 텍스트에서 중요한 키워드 ${maxKeywords}개를 추출해주세요. 
각 키워드는 2-10자 사이의 단어나 구문이어야 합니다.

텍스트: "${text}"

응답 형식: ["키워드1", "키워드2", "키워드3"]
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text_response = response.text();

      // JSON 배열 추출
      const arrayMatch = text_response.match(/\[[\s\S]*?\]/);
      if (!arrayMatch) {
        throw new Error('키워드 배열을 찾을 수 없습니다.');
      }

      const keywords = JSON.parse(arrayMatch[0]);

      console.log('✅ Gemini AI 키워드 추출 완료:', keywords);

      return Array.isArray(keywords) ? keywords.slice(0, maxKeywords) : [];

    } catch (error) {
      console.error('❌ Gemini AI 키워드 추출 실패:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스 생성
export const geminiAIService = new GeminiAIService();