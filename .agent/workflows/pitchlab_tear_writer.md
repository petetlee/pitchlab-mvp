---
description: Implement TEAR generation using Vertex AI/Genkit.
---
# Workflow: /pitchlab_tear_writer

Implement TEAR generation using Google Genkit + Vertex AI.

Output:
- Theme
- Evidence
- Analysis
- Recommendation (7-day + 30-day plan)

Implementation:
- Create Genkit flow in `functions` directory.
- Use Vertex AI (Gemini 1.5 Flash/Pro) for prompt engineering.
- Store TEAR output with the evaluation in Firestore.

Deliver:
- Functioning Genkit flow.
- 3 example seeded outputs.
