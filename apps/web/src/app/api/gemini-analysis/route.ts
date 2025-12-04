import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// API 키 검증
const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error('GOOGLE_AI_API_KEY가 설정되지 않았습니다.');
}

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Google AI API 키가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    const { text, options = {} } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: '분석할 텍스트가 필요합니다.'
      }, { status: 400 });
    }

    console.log('🤖 서버: Gemini AI 텍스트 분석 시작...', {
      textLength: text.length,
      options
    });

    // Gemini AI 클라이언트 초기화
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // 텍스트 분석 프롬프트
    const prompt = `
다음 텍스트를 종합적으로 분석해주세요:

텍스트: "${text}"

분석 항목:
1. 카테고리 분류 (업무, 개인, 학습, 건강, 일상, 기타 중 선택)
2. 감정 분석 (긍정적/부정적/중립적)
3. 핵심 키워드 3-5개 추출
4. 50자 이내 요약

응답 형식 (JSON):
{
  "category": "선택된 카테고리",
  "confidence": 0.85,
  "sentiment": {
    "polarity": "긍정적",
    "score": 0.7,
    "magnitude": 0.8
  },
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "summary": "내용 요약 (50자 이내)",
  "entities": []
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('🤖 Gemini AI 원본 응답:', aiResponse);

    // JSON 응답 파싱
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // 결과 검증 및 정규화
    const normalizedResult = {
      category: analysisResult.category || '기타',
      confidence: Math.min(Math.max(analysisResult.confidence || 0.5, 0), 1),
      sentiment: {
        polarity: analysisResult.sentiment?.polarity || '중립적',
        score: analysisResult.sentiment?.score || 0.5,
        magnitude: analysisResult.sentiment?.magnitude || 0.5
      },
      keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : [],
      summary: analysisResult.summary || '요약을 생성할 수 없습니다.',
      entities: analysisResult.entities || []
    };

    console.log('✅ 서버: Gemini AI 분석 완료:', {
      category: normalizedResult.category,
      confidence: normalizedResult.confidence,
      keywordCount: normalizedResult.keywords.length
    });

    return NextResponse.json({
      success: true,
      result: normalizedResult
    });

  } catch (error) {
    console.error('❌ 서버: Gemini AI 분석 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: `텍스트 분석 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}