import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Firebase Admin 안전 초기화
let firebaseInitialized = false;

const initializeFirebaseAdmin = () => {
  if (firebaseInitialized || getApps().length > 0) {
    return;
  }
  
  try {
    // 환경 변수에서 서비스 계정 정보 로드
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      const serviceAccount = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'voice-organizer-480015',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'voice-organizer-480015.firebasestorage.app'
      });
      console.log('✅ Firebase Admin initialized from environment variables');
    } else {
      // 환경변수가 없는 경우 파일에서 로드
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'voice-organizer-480015',
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'voice-organizer-480015.firebasestorage.app'
        });
        console.log('✅ Firebase Admin initialized from service account file');
      } else {
        console.error('❌ No Firebase credentials found (neither env vars nor file)');
        throw new Error('Firebase Admin credentials not found');
      }
    }
    
    firebaseInitialized = true;
  } catch (error) {
    console.error('❌ Firebase Admin 초기화 실패:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Firebase Admin 초기화 확인
    initializeFirebaseAdmin();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = `temp/${Date.now()}_${file.name}`;
    const fileRef = bucket.file(fileName);
    
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // 공개 URL 생성
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15분
    });

    return NextResponse.json({
      success: true,
      url,
      fileName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}