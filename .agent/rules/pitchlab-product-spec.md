# Workspace Rule: pitchlab-product-spec

Product: PitchLab – Idea Evaluation + Founder Readiness scoring.

Core user flow (MVP):

A) Start Evaluation
- Idea name
- 1-sentence summary
- Problem/opportunity
- Target customer
- Budget range
- Time commitment
- Resources/network
- Structured Q1–Q7 fields

B) Scoring + Output
- TEAR output (Theme, Evidence, Analysis, Recommendation)
- Q1–Q7 scores (0–10)
- PitchLab Score (0–100)
- Execution Risk Score (0–100)
- 7-day validation plan + 30-day build plan
- AI Logic: Uses Vertex AI via Google Genkit.

C) History + Sharing
- View prior evaluations (stored in Firestore)
- Shareable read-only link OR export to PDF

D) Admin (lightweight)
- View evaluations
- Manage weights/templates (config file in `backend/config` or Firestore)

Scoring requirements:
- All weights in single config file/module.
- Fully documented and adjustable.
