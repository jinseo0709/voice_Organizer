'use client';

import React, { useState, useRef } from 'react';

export default function FileUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addResult = (message: string) => {
    setUploadResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      addResult(`📤 파일 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        addResult(`✅ 업로드 성공: ${result.fileName}`);
        addResult(`🔗 URL: ${result.url.substring(0, 50)}...`);
        return result;
      } else {
        const error = await response.json();
        addResult(`❌ 업로드 실패: ${error.error}`);
        return null;
      }
    } catch (error) {
      addResult(`❌ 업로드 에러: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    
    setUploading(false);
  };

  const testFileUpload = async () => {
    setUploading(true);
    addResult('🧪 테스트 파일 생성 중...');
    
    // 테스트용 오디오 파일 생성 (가짜 데이터)
    const testAudioData = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      // ... 기본 WAV 헤더
    ]);
    
    const testFile = new File([testAudioData], 'test-audio.wav', {
      type: 'audio/wav'
    });
    
    await uploadFile(testFile);
    setUploading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
        📁 Firebase Storage 파일 업로드 테스트
      </h2>

      {/* Upload Controls */}
      <div className="space-y-4 mb-6">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="audio/*,video/*,.m4a,.wav,.mp3"
            multiple
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {uploading ? '업로드 중...' : '📁 파일 선택 및 업로드'}
          </button>
        </div>

        <button
          onClick={testFileUpload}
          disabled={uploading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          🧪 테스트 파일 업로드
        </button>

        <button
          onClick={() => setUploadResults([])}
          disabled={uploading}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
        >
          🗑️ 결과 지우기
        </button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">파일 업로드 중...</span>
        </div>
      )}

      {/* Upload Results */}
      <div className="bg-black rounded-lg p-4 text-green-400 font-mono text-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-semibold">📊 업로드 결과:</h3>
          <span className="text-gray-400">{uploadResults.length} 개 결과</span>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {uploadResults.length === 0 ? (
            <p className="text-gray-400 italic">파일을 업로드하면 결과가 여기에 표시됩니다...</p>
          ) : (
            uploadResults.map((result, index) => (
              <div key={index} className="py-1 border-b border-gray-700 last:border-b-0">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>지원 파일:</strong> 오디오/비디오 파일 (.m4a, .wav, .mp3, etc.)</p>
        <p><strong>CORS 해결:</strong> 서버사이드 업로드 API 사용</p>
        <p><strong>Storage 위치:</strong> Firebase Storage temp/ 폴더</p>
      </div>
    </div>
  );
}