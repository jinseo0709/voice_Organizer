import { NextRequest, NextResponse } from 'next/server';
import { LanguageAnalysisService } from '@voice-organizer/gcp';

// 실제 GCP Natural Language API 서버 엔드포인트
export async function POST(request: NextRequest) {
  try {
    console.log('🧠 SERVER: Starting real GCP Natural Language processing...');
    
    const { text, options = {} } = await request.json();
    
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: '분석할 텍스트가 없습니다.' }, { status: 400 });
    }
    
    console.log('📡 SERVER: Calling real GCP Natural Language API...', {
      textLength: text.length,
      options
    });
    
    // 실제 GCP Natural Language 서비스 호출
    const languageService = new LanguageAnalysisService();
    const result = await languageService.generateCategorizedSummary(text);
    
    console.log('✅ SERVER: GCP Natural Language completed successfully');
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('❌ SERVER: GCP Natural Language failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Natural Language 처리 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}