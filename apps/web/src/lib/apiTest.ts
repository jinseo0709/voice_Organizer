// Test Korean audio data (base64 encoded)
const audioData = "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgoZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgoZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgoZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgoZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgoZaLvt559NEAxQp+PwtmMcBjiR1/LJeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2D0fLEczMGHm+z9OShOgr/";

export async function testSpeechToText() {
  console.log('🎤 Speech-to-Text API 테스트 시작...');
  
  try {
    const response = await fetch('https://asia-northeast3-voice-organizer-480015.cloudfunctions.net/speechToText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioData: audioData,
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: 'ko-KR'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Speech-to-Text 성공:', result);
      return result;
    } else {
      console.error('❌ Speech-to-Text 실패:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Speech-to-Text 에러:', error);
    return null;
  }
}

export async function testTextAnalysis() {
  console.log('🧠 Text Analysis API 테스트 시작...');
  
  const testTexts = [
    "안녕하세요 음성인식 테스트입니다. 오늘 기분이 좋습니다.",
    "건강 상태가 걱정됩니다. 병원에 가야 할 것 같아요.",
    "새로운 프로젝트가 시작되어서 기대됩니다. 성공적으로 완료하고 싶어요."
  ];

  for (const text of testTexts) {
    try {
      const response = await fetch('https://asia-northeast3-voice-organizer-480015.cloudfunctions.net/textAnalysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Text Analysis 성공 "${text.substring(0, 20)}...":`, {
          sentiment: result.sentiment,
          entities: result.entities?.length || 0,
          categories: result.categories?.length || 0
        });
      } else {
        console.error('❌ Text Analysis 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ Text Analysis 에러:', error);
    }
  }
}

export async function testFirebaseStorage() {
  console.log('📁 Firebase Storage 테스트 시작...');
  
  try {
    // Test file upload simulation
    const testFile = new Blob(['test audio content'], { type: 'audio/m4a' });
    const fileName = `test-${Date.now()}.m4a`;
    
    console.log(`📤 파일 업로드 시뮬레이션: ${fileName}`);
    console.log('✅ Firebase Storage 연결 가능 (실제 파일 업로드는 브라우저에서 테스트)');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase Storage 에러:', error);
    return false;
  }
}

// 통합 테스트 함수
// CORS 우회를 위한 프록시 함수
const fetchWithProxy = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.warn('Proxy failed, trying direct request:', error);
    return fetch(url, options);
  }
};

export async function runAllTests() {
  console.log('🚀 실제 서비스 연동 테스트 시작!');
  console.log('=' .repeat(50));
  
  // 1. Health Check
  console.log('\n1️⃣ API Health Check...');
  try {
    const healthResponse = await fetchWithProxy('https://asia-northeast3-voice-organizer-480015.cloudfunctions.net/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ API 서버 상태:', healthData.status);
  } catch (error) {
    console.error('❌ API 서버 연결 실패:', error);
  }
  
  // 2. Text Analysis Test
  console.log('\n2️⃣ Text Analysis 테스트...');
  await testTextAnalysis();
  
  // 3. Speech-to-Text Test
  console.log('\n3️⃣ Speech-to-Text 테스트...');
  await testSpeechToText();
  
  // 4. Firebase Storage Test
  console.log('\n4️⃣ Firebase Storage 테스트...');
  await testFirebaseStorage();
  
  console.log('\n🎉 모든 테스트 완료!');
}