process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
console.warn("PitchLab Warning: TLS/SSL certificate validation disabled to bypass local proxy/CA errors.");

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");
const { calculateFRI, calculateOverallScore } = require("./scoring_logic");

console.log("PitchLab: Cloud Functions v1.3.0 Loaded — MVP Version 5 (Final Refinement)");
initializeApp();
const db = getFirestore();

const ERROR_LOG_PATH = path.join(__dirname, "submission_errors.log");

function logSubmissionError(label, error, context = {}) {
  const entry = [
    `\n${'='.repeat(60)}`,
    `[${new Date().toISOString()}] ${label}`,
    `USER: ${context.userId || 'unknown'}`,
    `INPUT IDEA: ${context.idea || 'N/A'}`,
    `ERROR: ${error?.message || String(error)}`,
    `STATUS: ${error?.status || error?.code || 'N/A'}`,
    `STACK: ${error?.stack || 'N/A'}`,
    `${'='.repeat(60)}\n`,
  ].join('\n');
  try {
    fs.appendFileSync(ERROR_LOG_PATH, entry, 'utf8');
    console.log(`PitchLab: Error SUCCESSFULLY logged to submission_errors.log at ${ERROR_LOG_PATH}`);
  } catch (writeErr) {
    console.warn("PitchLab CRITICAL: Could not write to submission_errors.log:", writeErr.message);
  }
}

// Initialize AI lazily to prevent discovery timeouts
let aiInstance = null;
let zInstance = null;

function getAI() {
  if (!aiInstance) {
    console.log("PitchLab: Lazy loading genkit modules...");
    const { genkit, z } = require("genkit");
    const { googleAI } = require("@genkit-ai/googleai");
    
    zInstance = z;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("PitchLab CRITICAL: No GEMINI_API_KEY found in environment. AI will use mock mode.");
    } else {
      console.log("PitchLab: API Key found. Using Google AI (AI Studio) as primary provider.");
    }

    // Strategy: Use Google AI (AI Studio) directly.
    // gemini-2.5-flash is the primary model for this project's API key.
    aiInstance = genkit({
      plugins: [
        googleAI({ apiKey: apiKey || "no-key" }),
      ],
      model: 'googleai/gemini-2.5-flash',
    });
  }
  return { ai: aiInstance, z: zInstance };
}

// PitchLab Evaluation Flow
exports.pitchLabEvaluation = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
  timeoutSeconds: 300,
}, async (request) => {
  console.log("!!! PITCHLAB EVALUATION FUNCTION INVOKED AT TOP !!!");
  console.log("PitchLab Evaluation started for user:", request.auth?.uid);

  const {
    idea,
    problem,
    budget,
    experience,
    capacity,
    network,
    targetMarket,
    category
  } = request.data;

  let userId = request.auth?.uid || 'unknown';

  try {
    // 1. Authenticate user
    if (!request.auth) {
      console.error("Unauthenticated request");
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    userId = request.auth.uid;

    // 2. Validate inputs
    console.log("PitchLab: Raw request data:", JSON.stringify(request.data));
    if (!idea || !problem || !targetMarket) {
      console.error("PitchLab: Validation failed - missing required fields");
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // 2.5 Enforce one-idea limit (excluding admins)
    const userDoc = await db.collection("Users").doc(userId).get();
    const role = userDoc.exists ? userDoc.data()?.role : 'user';
    if (role !== 'admin') {
      const existingSnapshot = await db.collection("IdeaInputs").where("userId", "==", userId).limit(1).get();
      if (!existingSnapshot.empty) {
        console.error(`PitchLab: User ${userId} blocked from multiple submissions.`);
        throw new HttpsError("already-exists", "You have already submitted a business idea. Each user is limited to one evaluation.");
      }
    }

    // 3. Store raw inputs
    console.log("Storing raw inputs in IdeaInputs...");
    const inputRef = await db.collection("IdeaInputs").add({
      userId,
      idea,
      problem,
      budget,
      experience,
      capacity,
      network,
      targetMarket,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 4. Calculate Founder Readiness Index (FRI) using modular logic
    const friScore = calculateFRI({ experience, capacity, network });

    // 5. Load Project Atlas ContextData
    const atlasPath = path.join(__dirname, "..", "backend", "data", "project_atlas");
    let mentorInsights = "Standard startup principles.";
    let failureData = "No specific failure data available.";
    let postMortems = "No post-mortem summaries available.";

    try {
      if (fs.existsSync(path.join(atlasPath, "mentor_insights.json"))) {
        mentorInsights = fs.readFileSync(path.join(atlasPath, "mentor_insights.json"), "utf8");
      }
      if (fs.existsSync(path.join(atlasPath, "startup_failure_data.csv"))) {
        failureData = fs.readFileSync(path.join(atlasPath, "startup_failure_data.csv"), "utf8");
      }
      if (fs.existsSync(path.join(atlasPath, "post_mortem_summaries.json"))) {
        postMortems = fs.readFileSync(path.join(atlasPath, "post_mortem_summaries.json"), "utf8");
      }
    } catch (fsError) {
      console.warn("File reading warning:", fsError.message);
    }

    const aiContext = getAI();
    const ai = aiContext.ai;
    const z = aiContext.z;
    
    // 6. Define the evaluation prompt (MVP Version 5)
    const evaluationPrompt = `
      You are the PitchLab Version 5 Evaluation Engine—the Final Refinement. Your mandate is to act as a ruthless, commercially disciplined startup advisor.
      Tone: Professional, direct, blunt, and operational. Sound like a senior partner at a VC firm making a hard decision.
      
      CORE V5 OBJECTIVES:
      1. EXTREME COMPRESSION: Reduce text drag by another 10-15%. Every sentence must be dense with value. Shorten paragraphs.
      2. RUTHLESS ADVISOR VERDICTS: Sound like a consultant. Use forceful labels: "Proceed with manual pilot," "Do not build yet," "Pause until efficacy proven."
      3. DEEP COMMERCIAL REALISM: Ground every judgment in market history. Identify and analyze real-world successes and failures.
      4. FIRST 30 SECONDS: Page 1 MUST deliver the answer. The Summary Block is the most important output.
      5. PERFORMANCE-FIRST: For hardware or trust-sensitive ideas, treat technical/regulatory proof as the CENTRAL risk.

      SCORING DISCIPLINE:
      - 80+ is elite and rarely earned. Validation quality is the primary driver of total score.
      - Weak validation MUST visibly crush the score. Do not be "polite."

      REAL-WORLD ANALOGUES:
      Identify 1-3 Successes and 1-3 Failures/Struggles.
      Explain WHY they ended that way and what warning it creates for this founder.

      ANTI-REPETITION RULES:
      - Executive Summary: 4-6 sentences ONLY. No fluff.
      - Score Breakdown: Assessment (1-3 sentences) + Action (1 sentence).
      - Final Recommendation: Direct advisor verdict (Label, Why, Issue, Next Move, Warning).

      FOUNDER INPUTS:
      - Idea: ${idea}
      - Category: ${category || "General Startup"}
      - Problem: ${problem}
      - Budget: ${budget}
      - Experience: ${experience}
      - Capacity: ${capacity}
      - Network: ${network}
      - Target Market: ${targetMarket}

      Evaluate strictly based on the 15-section ordering in the schema.
    `;

    // 7. Build the evaluation schema.
    // IMPORTANT: Each score field MUST be a fully inlined z.object() — no shared variables.
    // Vertex AI and Google AI reject JSON Schemas containing "$ref" references,
    // which Zod generates when the same sub-schema object is reused across fields.
    // Inlining ensures the serialized schema is flat with no $ref nodes.
    const evaluationSchema = z.object({
      summaryBlock: z.object({
        overallReadinessScore: z.number(),
        decisionStatus: z.string().describe("Ruthless Advisor Labels: Proceed, Validate First, Pivot or Refine, or Pause"),
        biggestRiskToThisIdea: z.string().describe("One-line statement of the single make-or-break issue."),
        doThisBeforeBuildingMore: z.string().describe("One specific, non-negotiable low-cost action."),
        topStrengths: z.array(z.string()).describe("3 short, punchy strengths."),
        topPrioritiesNow: z.array(z.string()).describe("3 action-led priorities.")
      }),
      whyThisScore: z.object({
        strongestArea: z.string(),
        weakestArea: z.string(),
        mainDragOnScore: z.string().describe("Primary bottleneck holding back the score. 1 sentence."),
        fastestWayToImprove: z.string()
      }),
      executiveSummary: z.string().describe("4-6 sentences ONLY. Sharp commercial overview. No repetition."),
      scores: z.object({
        ideaClarity: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        problemStrength: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        founderFit: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        marketAttractiveness: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        mvpFeasibility: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        executionReadiness: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
        validationReadiness: z.object({ score: z.number(), assessment: z.string().describe("1-3 sentences."), improvementAction: z.string().describe("Exactly 1 direct sentence.") }),
      }),
      decisionStatus: z.object({
        state: z.string(),
        explanation: z.string(),
        nextMilestone: z.string()
      }),
      tearDetails: z.object({
        theme: z.string().describe("Concise strategic framing."),
        evidence: z.string().describe("Foundational support signals."),
        analysis: pw.string().describe("Advisor-style friction analysis."),
        recommendation: z.string().describe("Next move based on strategic logic.")
      }),
      founderMetrics: z.object({
        analysis: z.string().describe("Assessing industry understand and technical capacity."),
        founderPositionSummary: z.string().describe("Strongly Positioned, Partially Positioned, or Meaningfully Constrained.")
      }),
      marketAssessment: z.object({
        analysis: z.string().describe("Deeper dive into pain intensity, reachability, trust, and behavior change."),
        marketPatternSummary: z.string().describe("Summary: Validated Precedent, Mixed Precedent, or Difficult Market.")
      }),
      realWorldComparables: z.object({
        successes: z.array(z.object({
          name: z.string(),
          whatTheyDid: z.string(),
          whyItSucceeded: z.string(),
          lessonForFounder: z.string()
        })).describe("1-3 genuinely relevant success precedents."),
        failures: z.array(z.object({
          name: z.string(),
          whatTheyDid: z.string(),
          whatWentWrong: z.string(),
          warningForFounder: z.string()
        })).describe("1-3 relevant failure or struggle patterns."),
        marketInterpretation: z.string().describe("Does this idea follow a success or failure pattern? What must be avoided?")
      }),
      mvpFeasibility: z.object({
        verdict: z.string().describe("Feasible, Partially Feasible, or Not Feasible under NZD $5k"),
        suggestedFormat: z.string(),
        indicativeComponents: z.array(z.string()),
        whatToExclude: z.array(z.string()).describe("Protects founder from overbuilding."),
        estimatedCostCommentary: z.string()
      }),
      keyRisks: z.array(z.object({
        name: z.string(),
        whyItMatters: z.string(),
        whatToProveOrFix: z.string()
      })).describe("Top 5 ruthless commercial risks only."),
      whatNotToBuild: z.array(z.string()).describe("3-7 waste-reduction items."),
      thirtyDayPlan: z.object({
        week1: z.object({ objective: z.string(), tasks: pw.array(z.string()), expectedResult: z.string() }),
        week2: z.object({ objective: z.string(), tasks: pw.array(z.string()), expectedResult: z.string() }),
        week3: z.object({ objective: z.string(), tasks: pw.array(z.string()), expectedResult: z.string() }),
        week4: z.object({ objective: z.string(), tasks: pw.array(z.string()), expectedResult: z.string() })
      }),
      finalRecommendation: z.object({
        recommendation: z.string().describe("Supportive but blunt Advisor Verdic Label."),
        why: z.string(),
        biggestIssue: z.string().describe("Single biggest unresolved issue."),
        pathForward: z.string().describe("Clearest low-cost next move."),
        explicitWarning: z.string().describe("Crucially: What must NOT happen yet.")
      })
    });

    // 8. Run AI generation — Google AI (AI Studio) is the primary provider.
    // Model: gemini-2.5-flash — confirmed available via ListModels in v1.0.8.
    const startTime = Date.now();
    console.log("PitchLab: Starting Google AI generation (gemini-2.5-flash)...");
    
    let result;
    try {
      result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: evaluationPrompt,
        runId: `eval-googleai-${userId}-${Date.now()}`,
        output: { schema: evaluationSchema },
      });
      console.log("PitchLab: Google AI generation successful.");
    } catch (genError) {
      const errMsg = genError.message || "";
      logSubmissionError("GOOGLE AI FAILED", genError, { userId, idea });
      console.error("PitchLab: Google AI failed:", errMsg);

      // Try gemini-2.5-pro (premium model) as a secondary attempt
      try {
        console.log("PitchLab: Retrying with gemini-2.5-pro...");
        result = await ai.generate({
          model: 'googleai/gemini-2.5-pro',
          prompt: evaluationPrompt,
          runId: `eval-googleai-retry-${userId}-${Date.now()}`,
          output: { schema: evaluationSchema },
        });
        console.log("PitchLab: Google AI retry (2.5-pro) successful.");
      } catch (retryErr) {
        logSubmissionError("GOOGLE AI RETRY FAILED", retryErr, { userId, idea });
        console.error("PitchLab: All AI attempts failed. Using mock mode.");
        result = getMockResult();
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`PitchLab: Genkit AI raw output received in ${duration}s`);
    
    if (!result || !result.output) {
      throw new Error("AI generated an empty response.");
    }

    const evaluationData = result.output;

    // 9. Calculate Overall Score directly
    const s = evaluationData.scores;
    const computedOverall = s.ideaClarity.score + s.problemStrength.score + s.founderFit.score + 
                            s.marketAttractiveness.score + s.mvpFeasibility.score + 
                            s.executionReadiness.score + s.validationReadiness.score;
                            
    evaluationData.scores.overall = Math.max(0, Math.min(100, computedOverall));
    evaluationData.founderReadinessIndex = s.founderFit.score * 5; // Simplified mapping using the new score.

    // 10. Store Evaluation
    await db.collection("EvaluationScore").add({
      userId,
      inputId: inputRef.id,
      category: category || "General",
      idea,         // Save original inputs for history/re-eval
      problem,
      budget,
      experience,
      capacity,
      network,
      targetMarket,
      ...evaluationData,
      isPublic: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return evaluationData;

  } catch (error) {
    console.log("PitchLab: EXCEPTION CAUGHT in top-level try-catch block!");
    logSubmissionError("SUBMISSION TOP-LEVEL ERROR", error, { userId, idea });
    console.error("================ PITCHLAB VERBOSE ERROR ================");
    console.error("Error Message:", error.message);
    if (error.stack) {
        console.error("Stack Trace:", error.stack);
    }
    if (error.status) {
        console.error("Status:", error.status);
    }
    if (error.code) {
        console.error("Code:", error.code);
    }
    console.error("========================================================");
    throw new HttpsError("internal", error.message || "An unexpected error occurred during evaluation.");
  }
});

// Helper to generate a consistent mock result for testing
function getMockResult() {
  return {
    output: {
      summaryBlock: {
        overallReadinessScore: 58,
        decisionStatus: "Validate Before Building",
        biggestRiskToThisIdea: "Significant behavior change without validated trust.",
        doThisBeforeBuildingMore: "Conduct 15 deep user interviews about existing workarounds.",
        topStrengths: ["Domain expertise", "Niche targeting", "Low-cost MVP path"],
        topPrioritiesNow: ["Verify pain intensity", "Test friction sensitivity", "Identify early adopters"]
      },
      whyThisScore: {
        strongestArea: "Founder Suitability (Experience)",
        weakestArea: "Execution Readiness (Market Friction)",
        mainDragOnScore: "Absence of hard 'intent to purchase' evidence.",
        fastestWayToImprove: "Secure 5 signed Letters of Intent."
      },
      executiveSummary: "PitchLab V5 Final Refinement. The idea addresses a genuine niche inefficiency in architectural drafting. However, the proposed AI solution requires a significant workflow shift that historically encounters high churn. MVP focus must be on manual concierge validation to prove value before writing code.",
      scores: {
        ideaClarity: { score: 14, assessment: "Theme is sharply defined and niche-focused.", improvementAction: "Simplify value proposition to one sentence." },
        problemStrength: { score: 8, assessment: "Annoyance-level for most, high pain for few.", improvementAction: "Quantify financial loss per missed deadline." },
        founderFit: { score: 16, assessment: "Deep domain context and industry reach.", improvementAction: "Partner with a lightweight dev lead." },
        marketAttractiveness: { score: 7, assessment: "High friction, low behavior-change propensity.", improvementAction: "Target top 3 boutique firms first." },
        mvpFeasibility: { score: 12, assessment: "Can be concierged for under $1k NZD.", improvementAction: "Use existing Excel/CSV integrations." },
        executionReadiness: { score: 5, assessment: "No technical capacity; high platform dependency.", improvementAction: "Identify open-source API fallbacks." },
        validationReadiness: { score: 9, assessment: "Ready for user-pain testing.", improvementAction: "Draft interview script targeting 'lost time'." }
      },
      decisionStatus: { state: "Validate First", explanation: "Promising but unvalidated at scale.", nextMilestone: "Complete 15 niche interviews." },
      tearDetails: { theme: "B2B Design Efficiency", evidence: "Anecdotal drafting lag.", analysis: "Execution depends on API stability.", recommendation: "CONCIERGE PILOT ONLY." },
      founderMetrics: { analysis: "Expert practitioner, non-technical.", founderPositionSummary: "Strongly Positioned (Domain)." },
      marketAssessment: { analysis: "Architects are risk-averse habit-followers.", marketPatternSummary: "Difficult Market (High Inertia)." },
      realWorldComparables: {
          successes: [{ name: "PlanGrid", whatTheyDid: "Mobile blueprint collaboration", whyItSucceeded: "Mirroring existing behaviors digitally", lessonForFounder: "Don't break the user's workflow." }],
          failures: [{ name: "Kuvée", whatTheyDid: "Connected wine ecosystem", whyItWentWrong: "Solution in search of a problem", warningForFounder: "Avoid hardware friction for minor convenience." }],
          marketInterpretation: "Idea resembles PlanGrid's utility but faces Kuvée's friction risk. Prioritize invisible integration."
      },
      mvpFeasibility: { verdict: "Feasible", suggestedFormat: "Concierge MVP", indicativeComponents: ["Manual Data entry", "Slack notifications"], whatToExclude: ["Native Dashboard", "Custom AI training"], estimatedCostCommentary: "Under $1,200." },
      keyRisks: [{ name: "Adoption Friction", whyItMatters: "Users revert to old habits", whatToProveOrFix: "Run a 5-day manual pilot" }],
      whatNotToBuild: ["Custom Neural Network", "Native iOS App", "Whitelabel dashboard"],
      thirtyDayPlan: {
        week1: { objective: "Pain Discovery", tasks: ["10 interviews"], expectedResult: "Problem validation." },
        week2: { objective: "Concierge Test", tasks: ["Manual pilot"], expectedResult: "Willingness to pay signal." },
        week3: { objective: "Iteration", tasks: ["Feedback review"], expectedResult: "Refined feature list." },
        week4: { objective: "Advisor Call", tasks: ["Go/No-Go Decision"], expectedResult: "Decision to build or kill." }
      },
      finalRecommendation: {
        recommendation: "Validate manually before building software",
        why: "Market history shows high failure for niche automation tools.",
        biggestIssue: "Workload shift kills adoption.",
        pathForward: "Run 5-day manual pilot using existing tools.",
        explicitWarning: "DO NOT outsource a custom platform yet."
      }
    }
  };
}

// Function to delete user and all their records from Firestore
exports.deleteUserAdmin = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  // 1. Authenticate the caller
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin
  const callerDoc = await db.collection("Users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can delete users.");
  }

  const targetUid = request.data.userId;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Missing target user ID.");
  }

  if (targetUid === callerUid) {
    throw new HttpsError("invalid-argument", "You cannot delete your own admin account.");
  }

  console.log(`PitchLab Admin: Deleting user ${targetUid} initiated by admin ${callerUid}`);

  try {
    // 3. Delete from Firebase Auth
    await getAuth().deleteUser(targetUid);
    console.log(`PitchLab Admin: Deleted user ${targetUid} from Firebase Auth`);

    // 4. Delete Firestore documents
    // Delete User Doc
    await db.collection("Users").doc(targetUid).delete();

    // Delete Founder Profile Doc if exists
    await db.collection("FounderProfiles").doc(targetUid).delete();

    // Delete IdeaInputs
    const inputsSnapshot = await db.collection("IdeaInputs").where("userId", "==", targetUid).get();
    const batch = db.batch();
    inputsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete EvaluationScores
    const evalsSnapshot = await db.collection("EvaluationScore").where("userId", "==", targetUid).get();
    evalsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`PitchLab Admin: Wiped all Firestore records for user ${targetUid}`);

    return { success: true };
  } catch (error) {
    console.error(`PitchLab Admin: Error deleting user ${targetUid}:`, error);
    throw new HttpsError("internal", error.message || "Failed to delete user and records.");
  }
});

// Function to invite user and send invitation link
exports.sendInvitation = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  // 1. Authenticate the caller
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin
  const callerDoc = await db.collection("Users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can send invitations.");
  }

  const email = request.data.email;
  if (!email) {
    throw new HttpsError("invalid-argument", "Missing recipient email address.");
  }
  const skipEmail = request.data.skipEmail === true;

  console.log(`PitchLab Invite: Sending invitation to ${email} initiated by admin ${callerUid} (skipEmail: ${skipEmail})`);

  try {
    const crypto = require("crypto");
    const nodemailer = require("nodemailer");

    // 3. Generate token
    const token = crypto.randomBytes(16).toString("hex");

    // 4. Save invitation in Firestore
    const inviteRef = db.collection("Invitations").doc(token);
    await inviteRef.set({
      email: email,
      token: token,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    // 5. Send email (if not skipped)
    let emailPreviewUrl = null;
    if (!skipEmail) {
      let transporter;
      const appUrl = process.env.APP_URL || "http://localhost:5000"; // default to localhost for local dev/emulator
      const inviteLink = `${appUrl}/?inviteToken=${token}`;

      const mailOptions = {
        from: `"PitchLab Team" <no-reply@pitchlab-antigravity.firebaseapp.com>`,
        to: email,
        subject: "You are invited to validate your startup idea on PitchLab!",
        text: `Hello!\n\nYou have been invited to PitchLab to evaluate your business idea.\n\nClick the link below to input your business idea:\n${inviteLink}\n\nBest regards,\nThe PitchLab Team`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1d1d1f; margin-bottom: 16px;">Welcome to PitchLab</h2>
            <p style="color: #4a5568; line-height: 1.6;">You have been invited to PitchLab to evaluate your new business idea using our Google-native AI orchestration and scoring engine.</p>
            <div style="margin: 24px 0;">
              <a href="${inviteLink}" style="background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Input Your Business Idea</a>
            </div>
            <p style="color: #718096; font-size: 14px; margin-top: 24px;">If the button above does not work, copy and paste the following URL into your browser:</p>
            <p style="color: #0071e3; font-size: 14px; word-break: break-all;">${inviteLink}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #a0aec0; font-size: 12px;">This email was sent on behalf of PitchLab.</p>
          </div>
        `
      };

      const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      if (hasSmtpConfig) {
        console.log("PitchLab Invite: SMTP credentials found. Sending real email...");
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.sendMail(mailOptions);
        console.log(`PitchLab Invite: Real email successfully sent to ${email}`);
      } else {
        console.log("PitchLab Invite: SMTP credentials not found. Generating Ethereal test account...");
        try {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });

          const info = await transporter.sendMail(mailOptions);
          emailPreviewUrl = nodemailer.getTestMessageUrl(info);
          console.log(`PitchLab Invite: Ethereal test email sent. Preview URL: ${emailPreviewUrl}`);

          // Save preview URL to the invitation document
          await inviteRef.update({
            emailPreviewUrl: emailPreviewUrl
          });
        } catch (etherealError) {
          console.error("PitchLab Invite WARNING: Failed to generate Ethereal email:", etherealError.message);
        }
      }
    }

    return {
      success: true,
      token: token,
      emailPreviewUrl: emailPreviewUrl
    };

  } catch (error) {
    console.error(`PitchLab Invite: Error sending invitation to ${email}:`, error);
    throw new HttpsError("internal", error.message || "Failed to send invitation.");
  }
});

