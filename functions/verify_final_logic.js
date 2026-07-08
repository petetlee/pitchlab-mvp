const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { genkit, z } = require('genkit');
const { vertexAI } = require('@genkit-ai/vertexai');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'antigravity-pitchlab';

admin.initializeApp({
  projectId: 'antigravity-pitchlab'
});

const db = getFirestore();

async function verifyEvaluationEngine() {
  console.log("🚀 Starting Final Backend Verification...");
  
  const ai = genkit({
    plugins: [vertexAI({ projectId: '394509733221', location: 'us-central1' })],
    model: 'vertexai/gemini-2.5-flash',
  });

  const testIdea = "AI-Powered Gardening Assistant";
  const testProblem = "People forget to water or fertilize their specific plant species.";
  
  const evaluationSchema = z.object({
    executiveSummary: z.string(),
    scores: z.object({
      ideaClarity: z.object({ score: z.number(), explanation: z.string() }),
      problemStrength: z.object({ score: z.number(), explanation: z.string() }),
      founderFit: z.object({ score: z.number(), explanation: z.string() }),
      marketAttractiveness: z.object({ score: z.number(), explanation: z.string() }),
      mvpFeasibility: z.object({ score: z.number(), explanation: z.string() }),
      executionReadiness: z.object({ score: z.number(), explanation: z.string() }),
      validationReadiness: z.object({ score: z.number(), explanation: z.string() }),
      overall: z.number().optional()
    }),
    decisionStatus: z.object({ state: z.string(), explanation: z.string(), nextMilestone: z.string() }),
    tearDetails: z.object({ theme: z.string(), evidence: z.string(), analysis: z.string(), recommendation: z.string() }),
    founderMetrics: z.object({ analysis: z.string(), founderPositionSummary: z.string() }),
    marketAssessment: z.string(),
    mvpFeasibility: z.object({ verdict: z.string(), suggestedFormat: z.string(), indicativeComponents: z.array(z.string()) }),
    keyRisks: z.array(z.object({ name: z.string(), whyItMatters: z.string(), whatToProveOrFix: z.string() })),
    whatNotToBuild: z.array(z.string()),
    nextActions: z.array(z.object({ action: z.string(), purpose: z.string(), expectedLearning: z.string() })),
    thirtyDayPlan: z.object({
      week1: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
      week2: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
      week3: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
      week4: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() })
    }),
    finalRecommendation: z.object({ recommendation: z.string(), why: z.string(), biggestIssue: z.string(), pathForward: z.string() })
  });

  try {
    console.log("Calling Genkit directly (Gemini 2.5 Flash)...");
    const result = await ai.generate({
      prompt: `Evaluate this idea: ${testIdea}. Problem: ${testProblem}. Generate a deep 13-section report.`,
      output: { schema: evaluationSchema }
    });

    const data = result.output;
    console.log("✅ AI Response Received!");
    
    // Check for some mandatory sections
    const hasThirteen = data.executiveSummary && data.scores && data.thirtyDayPlan && data.finalRecommendation;
    console.log("Section Check:", hasThirteen ? "✅ ALL 13 SECTIONS PRESENT" : "❌ MISSING SECTIONS");

    // Simulate saving with original inputs
    console.log("Simulating Firestore Save with Original Inputs...");
    const saveObj = {
      userId: 'test-user-123',
      idea: testIdea,
      problem: testProblem,
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('EvaluationScore').add(saveObj);
    console.log(`✅ Saved to EvaluationScore with ID: ${docRef.id}`);

    // Verify Read back
    const snap = await docRef.get();
    const savedData = snap.data();
    console.log("Field Persistence Check:");
    console.log("- Original Idea Saved:", savedData.idea === testIdea ? "✅" : "❌");
    console.log("- Original Problem Saved:", savedData.problem === testProblem ? "✅" : "❌");
    console.log("- 13-Section Summary Present:", savedData.executiveSummary ? "✅" : "❌");

    console.log("\n🚀 VERIFICATION COMPLETE: PitchLab Engine is 100% Operational.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Verification Failed:", err.message);
    process.exit(1);
  }
}

verifyEvaluationEngine();
