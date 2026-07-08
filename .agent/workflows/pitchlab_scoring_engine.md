---
description: Implement scoring engine as pure functions with tests.
---
# Workflow: /pitchlab_scoring_engine

Implement scoring engine as pure functions with tests in the context of Flutter and Firebase.

Inputs:
- Q1–Q7 structured responses (Zod-like validation using `dart:convert` models or Firebase Function validation)

Outputs:
- Q1–Q7 scores (0–10)
- PitchLab Score (0–100)
- Execution Risk Score (0–100)
- Justifications

Requirements:
- All weights in single config module (e.g., `lib/logic/scoring_config.dart` or `functions/src/config/scoring.ts`)
- Deterministic + unit tested (using `flutter test` or `npm test`)
- At least 10 test scenarios
- Integration: Ensure scores are stored correctly in Firestore.
