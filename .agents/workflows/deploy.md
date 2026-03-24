---
description: How to deploy all components (mobile APK, frontend, backend) after making changes
---

# Deployment Workflow
// turbo-all

Run these steps in order after making code changes each session.

## 1. Install Mobile App Dependencies
```
cd C:\WORKSPACE\CODES\school_erp\mobile_app
flutter pub get
```

## 2. Build Mobile APK
```
cd C:\WORKSPACE\CODES\school_erp\mobile_app
flutter build apk --release
```
The APK will be at: `mobile_app/build/app/outputs/flutter-apk/app-release.apk`

## 3. Copy APK to Frontend Public Folder
```
copy "C:\WORKSPACE\CODES\school_erp\mobile_app\build\app\outputs\flutter-apk\app-release.apk" "C:\WORKSPACE\CODES\school_erp\frontend\public\school_erp.apk"
```
This makes the APK downloadable from the web app via the "Download Android App" button.

## 4. Build Frontend for Production
```
cd C:\WORKSPACE\CODES\school_erp\frontend
npm run build
```
This uses `.env.production` (VITE_API_URL pointing to Cloud Run backend).

## 5. Deploy Frontend to Firebase Hosting
```
cd C:\WORKSPACE\CODES\school_erp\frontend
npx firebase deploy --only hosting
```
- Firebase Project: `rosy-hope-489506-p3`
- Hosting serves from `dist/` folder
- SPA rewrites configured in `firebase.json`

## 6. Deploy Backend to GCP Cloud Run
```
cd C:\WORKSPACE\CODES\school_erp
gcloud builds submit --config cloudbuild.yaml .
```
- GCP Project: `rosy-hope-489506-p3` (sivaram-sandbox-dev)
- Artifact Registry: `us-central1-docker.pkg.dev/$PROJECT_ID/erp-repo/backend:latest`
- Cloud Run service: `school-erp-backend` (us-central1, port 8000)
- Backend URL: `https://school-erp-backend-u3blupf3zq-uc.a.run.app`

## Quick Reference
| Component | Platform | Config File |
|-----------|----------|------------|
| Frontend | Firebase Hosting | `frontend/firebase.json`, `frontend/.firebaserc` |
| Backend | GCP Cloud Run | `cloudbuild.yaml`, `backend/Dockerfile` |
| Mobile | Flutter APK | `mobile_app/pubspec.yaml` |
| API URL | Cloud Run | `frontend/.env.production` |
