import { NextRequest, NextResponse } from 'next/server';

// Cloud Run 서버로 프록시하는 API 엔드포인트
const CLOUD_RUN_URL = 'https://voice-organizer-server-wg6wrsamfq-du.a.run.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 프록시: Cloud Run 서버로 요청 전달 시작...');
    
    // Cloud Run 서버 연결 테스트
    try {
      const healthCheck = await fetch(`${CLOUD_RUN_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      console.log('🏥 Cloud Run 헬스체크:', healthCheck.status, healthCheck.statusText);
    } catch (healthError) {
      console.error('❌ Cloud Run 헬스체크 실패:', healthError);
      return NextResponse.json({
        success: false,
        error: `Cloud Run 서버에 연결할 수 없습니다: ${healthError instanceof Error ? healthError.message : 'Unknown error'}`
      }, { status: 503 });
    }
    
    // 요청 본문을 그대로 Cloud Run 서버로 전달
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    console.log('📡 프록시: Cloud Run Speech-to-Text API 호출...', {
      fileName: audioFile?.name,
      fileSize: audioFile?.size,
      cloudRunUrl: CLOUD_RUN_URL
    });
    
    // Cloud Run 서버로 요청 프록시 (타임아웃 설정)
    const response = await fetch(`${CLOUD_RUN_URL}/api/speech-to-text`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000) // 60초 타임아웃
    });
    
    console.log('📨 Cloud Run 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloud Run 서버 응답 오류:', errorText);
      throw new Error(`Cloud Run 서버 응답 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ 프록시: Cloud Run에서 응답 수신 완료', {
      success: result.success,
      hasTranscript: !!result.transcript
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ 프록시: Cloud Run 서버 연결 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: `Cloud Run 서버 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}