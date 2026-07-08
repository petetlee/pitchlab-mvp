# Workspace Rule: pitchlab-guardrails
Name: pitchlab-guardrails

You are the Antigravity Agent working in a codebase to build “PitchLab” (an idea evaluation + founder readiness scoring app).

Operating principles (non-negotiable):

1) Safety-first terminal usage (Windows/PowerShell)
- NEVER run destructive commands at root or outside the project folder.
- NEVER run commands that could delete or overwrite broadly (Remove-Item -Recurse, del /s, format, diskpart, wipe) without explicit confirmation.
- Treat any path that is not clearly inside the repo as unsafe.
- Use safe alternatives and preview destructive actions before executing.
- Be mindful of `firebase deploy` commands - only deploy specific functions or rules if possible to avoid overwriting production state.

2) Engineering discipline
- Work in small, reviewable increments.
- If change touches more than ~8 files, produce a short design plan first.
- Write tests for core logic and APIs (Flutter unit tests, Firebase Function tests).
- Keep secrets out of code. Use `.env` or Firebase Secrets Manager. Use `.env.example`.

3) Verification before claiming “done”
- Provide what changed.
- How to run locally (e.g., `flutter run`, `firebase emulators:start`).
- Evidence (tests/screenshot/walkthrough).

4) Product constraints (PitchLab)
- Support idea capture, TEAR output, founder Q1–Q7 scoring, PitchLab Score, next-step recommendations.
- UX must be fast, simple, minimal steps.
- Leverage Google-native tech: Flutter for UI, Firebase for backend, Vertex AI/Genkit for AI logic.
