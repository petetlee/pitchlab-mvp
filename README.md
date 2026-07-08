# PitchLab MVP

PitchLab is a startup validation platform built with Flutter, Firebase, and Google Genkit.

## Tech Stack
- **Frontend**: Flutter (Android, iOS, Web)
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **AI Orchestration**: Google Genkit + Google AI / Vertex AI (Gemini 2.5 Flash)
- **Database**: Firestore
- **State**: **MVP Version 2 (Restored & Verified)**

## Getting Started

### 1. Prerequisites
- Flutter SDK (^3.11.0)
- Node.js (v20)
- Firebase CLI (`npm install -g firebase-tools`)

### 2. Backend Setup
```bash
cd functions
npm install
# Start Firebase Emulators
firebase emulators:start
```

### 3. Frontend Setup
```bash
cd frontend
flutter pub get
# Run the app (requires emulators to be running for local dev)
flutter run
```

### 4. Project Structure (MVP)
- `frontend/lib/`: Core Flutter screens (Evaluation Wizard, Results Dashboard, History).
- `functions/index.js`: The Genkit-powered evaluation flow.
- `.agent/`: Workspace rules, workflows, and detailed specifications.

## MVP Version 2 (Current State Log)
Successfully restored and verified as of April 2026.

- **Primary Model**: `googleai/gemini-2.5-flash` (confirmed via rigorous API check).
- **Secondary Fallback**: `googleai/gemini-2.5-pro`.
- **Schema**: Fully inlined (No `$ref`) for 100% Vertex/Google AI compatibility.
- **Backend Version**: `v1.0.8`.

### Essential V2 Startup Procedure
To avoid "Mock Mode" and ensure the AI connects:
1. **Kill Zombies**: `taskkill /F /IM node.exe /T; taskkill /F /IM java.exe /T`
2. **Start Backend**: `firebase emulators:start --import=firebase_export --export-on-exit`
3. **Start Frontend**: `cd frontend; flutter run -d chrome`

## Release Notes (v1.0 MVP)
- **T.E.A.R. Engine**: Fully integrated with Vertex AI for 4-point startup evaluation.
- **Scoring System**: Modularized logic for FRI and overall quality scores.
- **Reporting**: Advanced PDF export with full data capture.
- **History**: Cloud-synced history with read-only public sharing links.
- **Security**: Granular Firestore rules for privacy and shared evaluations.

## Deployment Guide

### 1. Firebase Project Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Firestore**, **Functions**, **Hosting**, and **Auth** (Anonymous & Google).
3. Set your project ID in `.firebaserc`.

### 2. Vertex AI & Genkit
1. Enable the **Vertex AI API** in your Google Cloud Project.
2. Ensure your service account has the `Vertex AI User` role.

### 3. Deploy
```bash
# Deploy entire stack
firebase deploy

# Deploy parts only
firebase deploy --only functions
firebase deploy --only firestore:rules
```
