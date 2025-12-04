@echo off
setlocal

REM GCP 프로젝트 설정
set PROJECT_ID=voice-organizer-480015
set SERVICE_NAME=voice-organizer-server
set REGION=asia-northeast3
set IMAGE_NAME=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

echo 🚀 Voice Organizer 서버를 GCP Cloud Run에 배포합니다...
echo 📍 프로젝트: %PROJECT_ID%
echo 📍 지역: %REGION%
echo 📍 서비스명: %SERVICE_NAME%

REM 1. Docker 이미지 빌드
echo 🔨 Docker 이미지 빌드 중...
docker build -t %SERVICE_NAME% .
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker 빌드 실패
    exit /b 1
)

REM 2. 이미지 태그
echo 🏷️ 이미지 태그 설정 중...
docker tag %SERVICE_NAME% %IMAGE_NAME%

REM 3. GCR에 푸시
echo 📤 Google Container Registry에 이미지 푸시 중...
docker push %IMAGE_NAME%
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 이미지 푸시 실패
    exit /b 1
)

REM 4. Cloud Run에 배포
echo ☁️ Cloud Run에 배포 중...
gcloud run deploy %SERVICE_NAME% --image %IMAGE_NAME% --platform managed --region %REGION% --allow-unauthenticated --port 8080 --memory 2Gi --cpu 2 --timeout 300 --max-instances 10 --set-env-vars GOOGLE_CLOUD_PROJECT=%PROJECT_ID% --project %PROJECT_ID%

if %ERRORLEVEL% EQU 0 (
    echo ✅ 배포 완료!
    echo 📍 서비스 URL을 확인하려면 다음 명령을 실행하세요:
    echo    gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"
) else (
    echo ❌ 배포 실패
    exit /b 1
)

pause