# PitchLab MVP Specification

## 1. 1-Page PRD (Product Requirements Document)
**Vision**: PitchLab is a Google-native "Founder Readiness" platform that helps aspiring entrepreneurs validate ideas in 14 days with a strict $5k build constraint.

**Problem**: Founders often waste months and thousands of dollars on unvalidated ideas. They lack objective scoring and a clear "day-by-day" execution blueprint.

**Target User**: Early-stage solo founders or small teams looking for a "reality check" before building.

**Core Features (MVP)**:
- **Idea Wizard**: Structured input for idea, problem, and founder profile.
- **T.E.A.R. Engine**: AI-driven evaluation (Theme, Evidence, Analysis, Readiness).
- **PitchLab Score**: A 0-100 score combining idea quality and founder readiness.
- **$5k Constraint**: A binary "Build or Kill" recommendation based on Auckland/NZ market costs.
- **14-Day Action Plan**: A day-by-day roadmap tailored to the founder's specific industry.

---

## 2. Data Model Draft (Firestore)

### Collection: `Users`
- `uid` (string): Firebase Auth UID
- `name` (string)
- `email` (string)
- `createdAt` (timestamp)

### Collection: `IdeaInputs`
- `userId` (string): Reference to Users
- `idea` (string): 1-sentence summary
- `problem` (string): The "Hair on Fire" problem
- `targetMarket` (string)
- `budget` (string)
- `experience` (string): Founder's background
- `capacity` (string): Hours per week
- `network` (string): Available resources
- `category` (string): e.g., SaaS, Hardware, Marketplace
- `createdAt` (timestamp)

### Collection: `EvaluationScore`
- `userId` (string)
- `inputId` (string): Reference to IdeaInputs
- `scores` (map):
    - `theme` (number, 0-100)
    - `execution` (number, 0-100)
    - `analysis` (number, 0-100)
    - `readiness` (number, 0-100)
    - `overall` (number, 0-100)
- `founderReadinessIndex` (number, 0-100)
- `mvpFeasibility` (map):
    - `under5k` (boolean)
    - `rationale` (string)
- `pitchLabCanvas` (map):
    - `valueProp`, `keyActivities`, `costStructure`, `revenueStreams`
- `actionPlan` (array of strings): 14 items, one for each day.
- `createdAt` (timestamp)

---

## 3. API Routes (Firebase Cloud Functions / Genkit)

| Route Name | Trigger | Description |
|------------|---------|-------------|
| `pitchLabEvaluation` | `onCall` | The core Genkit flow. Takes `IdeaInputs`, runs Vertex AI, and returns `EvaluationData`. |
| `getHistory` | `onCall` | Fetches previous evaluations for the current user. |
| `exportToPDF` | `onCall` | Triggers the PDF generation logic (Function-side or Client-side). |

---

## 4. UI Sitemap (Flutter Navigation)

- `landing_page.dart`: Hero section, value prop, and "Start Free Evaluation" button.
- `evaluation_wizard.dart`: Multi-step form (Step 1: Idea, Step 2: Founder Profile).
- `results_dashboard.dart`: The score breakdown, TEAR model results, and the 14-day action plan.
- `history_view.dart`: List of past `EvaluationScore` entries.
- `founder_profile.dart`: User settings and readiness history.

---

## 5. Scoring Model Breakdown

### Founder Readiness Index (FRI) - 0-100
- **Base (50)**: Standard starting point.
- **Experience (+20)**: Previous founder or 5+ years domain expertise.
- **Capacity (+15)**: >30 hours per week dedicated to the project.
- **Network (+15)**: Access to mentors, investors, or niche distribution.

### PitchLab Overall Score (0-100)
`Score = (Theme * 0.2) + (Execution * 0.3) + (Analysis * 0.3) + (Readiness * 0.2)`
- *Note*: Execution and Analysis carry the highest weight as they correlate most with startup failure.

---

## 6. Acceptance Criteria
- [ ] User can log in via Firebase Auth.
- [ ] Evaluation wizard saves data to `IdeaInputs` and results to `EvaluationScore`.
- [ ] AI output is deterministic and grounded in "Project Atlas" principles (mentor wisdom).
- [ ] Result dashboard displays the $5k binary recommendation clearly.
- [ ] Action plan must have exactly 14 actionable daily items.

---

## 7. Implementation Plan (Mestones)

1. **Milestone 1**: Spec & Blueprint (Done).
2. **Milestone 2**: Scaffold (Verified existing Flutter + Cloud Functions connectivity).
3. **Milestone 3**: Scoring Engine Refinement (Optimize the `pitchLabEvaluation` flow logic).
4. **Milestone 4**: TEAR Model Implementation (Grounding prompts with Project Atlas data).
5. **Milestone 5**: Navigation & History (Link all Flutter screens and Firestore queries).
6. **Milestone 6**: PDF Export (Server-side function vs Local package).
7. **Milestone 7**: Release Polish (App Check, Final Styling, Deployment).

---

## 8. Risks & Assumptions
- **Risk**: Genkit flow may time out if API response is slow (>30s).
- **Assumption**: Users will provide honest inputs for the FRI score.
- **Assumption**: The $5k constraint is based on NZD and lean startup principles.
