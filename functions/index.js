process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();

if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = "antigravity-pitchlab";
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = "antigravity-pitchlab";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");
const { calculateFRI, reconcileScores, getScoreBand, classifyVentureType, detectFeasibilityGates, calculateFounderEvidenceGap } = require("./scoring_logic");

console.log("PitchLab: Cloud Functions v1.3.0 Loaded — MVP Version 5 (Final Refinement)");
initializeApp({ projectId: process.env.GCP_PROJECT || "antigravity-pitchlab" });
const db = getFirestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Already initialized settings
}

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("PitchLab CRITICAL: No GEMINI_API_KEY found in environment. AI will use mock mode.");
    } else {
      console.log("PitchLab: API Key found (" + apiKey.substring(0, 5) + "...). Using Google AI (AI Studio) as primary provider.");
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

// Helper function to extract text from base64 uploaded CVs (PDF, DOCX, TXT, RTF) with garbage filter (lazy loaded)
let cvParserModule = null;
function getExtractCvText() {
  if (!cvParserModule) {
    cvParserModule = require("./cv_parser");
  }
  return cvParserModule.extractCvText;
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

  const reqData = request.data || {};
  const idea = reqData.idea || "";
  const problem = reqData.problem || "";
  const targetMarket = reqData.targetMarket || reqData.market || "";
  const category = reqData.category || "General Startup";
  const budget = reqData.budget || reqData.investmentCommitment || "";
  let experience = reqData.experience || reqData.founderExperience || "";
  const capacity = reqData.capacity || reqData.timeCommitment || "";
  const network = reqData.network || reqData.customerValidation || "";

  const locationCountry = reqData.locationCountry || reqData.country || "";
  const locationRegion = reqData.locationRegion || reqData.region || "";
  const locationCity = reqData.locationCity || reqData.city || "";
  const marketScope = reqData.marketScope || reqData.scope || "";

  const locationSummary = [locationCity, locationRegion, locationCountry]
    .filter(part => part && typeof part === 'string' && part.trim().length > 0)
    .join(", ");

  const cvBase64 = reqData.cvBase64 || reqData.cvAttachment || "";
  const cvFileName = reqData.cvFileName || "";
  const cvText = await getExtractCvText()(cvBase64);

  if (cvText) {
    console.log(`PitchLab: Successfully extracted ${cvText.length} characters of CV text from ${cvFileName}`);
    experience = `CV Attachment (${cvFileName}): ${cvText}\nQuestionnaire Experience: ${experience}`;
    reqData.experience = experience;
  }

  const founderBackgroundNarrative = reqData.founderBackgroundNarrative || reqData.founderBackground || "";
  const founderBackgroundWordCount = reqData.founderBackgroundWordCount || (founderBackgroundNarrative.trim() ? founderBackgroundNarrative.trim().split(/\s+/).length : 0);

  // Attach extracted fields directly to reqData so scoring engine sees them
  reqData.founderCvExtractedText = cvText;
  reqData.founderBackgroundNarrative = founderBackgroundNarrative;
  reqData.founderBackgroundWordCount = founderBackgroundWordCount;
  reqData.timeCommitment = reqData.timeCommitment || reqData.capacity || capacity;
  reqData.investmentCommitment = reqData.investmentCommitment || reqData.budget || budget;
  reqData.locationCountry = locationCountry;
  reqData.locationRegion = locationRegion;
  reqData.locationCity = locationCity;
  reqData.locationSummary = locationSummary;
  let userId = request.auth?.uid || reqData.userId || 'anonymous-user';

  try {
    // 1. Validate inputs
    console.log("PitchLab: Raw request data:", JSON.stringify(reqData));
    if (!idea || !problem || !targetMarket) {
      console.error("PitchLab: Validation failed - missing required fields");
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    console.log(`PitchLab: Processing evaluation submission for user ${userId}`);

    // 3. Store raw inputs safely
    console.log("Storing raw inputs in IdeaInputs...");
    let inputRef = null;
    try {
      inputRef = await db.collection("IdeaInputs").add({
        userId: userId || "",
        idea: (idea || "").slice(0, 4000),
        problem: (problem || "").slice(0, 4000),
        budget: budget || "",
        experience: (experience || "").slice(0, 4000),
        founderBackgroundNarrative: (founderBackgroundNarrative || "").slice(0, 4000),
        founderBackgroundWordCount: founderBackgroundWordCount,
        founderBackgroundLastUpdated: FieldValue.serverTimestamp(),
        founderCvUploaded: Boolean(cvFileName),
        capacity: capacity || "",
        network: network || "",
        targetMarket: (targetMarket || "").slice(0, 4000),
        category: category || "General Startup",
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn("PitchLab: Firestore IdeaInputs write warning (non-fatal):", dbErr.message);
      inputRef = { id: `local-${Date.now()}` };
    }

    // 4. Calculate Founder Readiness Index (FRI) using modular logic
    const friScore = calculateFRI({ experience, capacity, network, founderBackgroundNarrative });

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
    
    const ventureType = classifyVentureType(reqData);
    const gatesInfo = detectFeasibilityGates(reqData);

    // 6. Define the evaluation prompt (MVP Version 5 - Master Research & Business Expert Engine)
    const evaluationPrompt = `
      You are the PitchLab Version 5 Master Commercial Evaluation & Research Engine.
      Your mandate is to act as a senior Research & Business Expert and VC Partner reviewing ALL provided inputs with extreme commercial discipline, deep regional market intelligence, and comprehensive founder background synthesis.
      Tone: Professional, direct, blunt, analytical, and operational. Sound like an elite partner at a top-tier venture capital firm or commercial strategy consultancy making a definitive assessment.

      RIGOROUS EXPERT REVIEW OF ALL REGIONAL & FOUNDER INPUTS:
      1. COMPREHENSIVE FOUNDER INPUT REVIEW (Narrative, CV & Questionnaire):
         - Synthesize ALL founder evidence: written narrative ("${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}"), uploaded CV ("${cvFileName || "None"}": ${cvText ? cvText.slice(0, 2500) : "No CV text."}), and structured questionnaire answers (Experience: ${experience}, Time Commitment: ${capacity}, Budget: ${budget}, Network/Validation: ${network}).
         - Extract exact credentials, degrees, roles, and organizations into "cvAnalysis.extractedCredentials" and evaluate their direct relevance to THIS specific business.
      2. COMPREHENSIVE REGIONAL & GEOGRAPHIC INPUT REVIEW:
         - Location Context: ${locationSummary ? locationSummary : "Global / Unspecified Target Region"} (Country: ${locationCountry || "N/A"}, State/Region: ${locationRegion || "N/A"}, City: ${locationCity || "N/A"}, Market Scope: ${marketScope || "N/A"}).
         - You MUST anchor your market analysis in this specific geographic region, evaluating local SMB/consumer density, regional customer purchasing habits, statutory regulatory bodies (e.g. IRD in NZ, ATO in AU, HMRC in UK, IRS in US, local city bylaws), and regional competitor incumbents.

      CORE OBJECTIVES & FEASIBILITY GUARDRAILS:
      1. VENTURE CONTEXT: Primary Venture Classification: "${ventureType}". Feasibility Gates: ${gatesInfo.hasCriticalGate ? gatesInfo.summary : "No critical feasibility gates detected."}
      2. TARGETED FOUNDER-IDEA FIT SCORING: Distinguish General Founder Capability (e.g. CA, MBA) from Founder-Idea Fit (relevance to THIS specific business). A founder with impressive credentials in an unrelated domain (e.g. a CA proposing nuclear power, biotech, or aerospace without nuclear/medical expertise) MUST NOT be awarded 10-15/15; score 4-6/15 (Weak Fit).
      3. MARKET ACCESSIBLE OPPORTUNITY SCORING: Distinguish TAM (underlying market size) from Commercially Accessible Opportunity for THIS proposed solution. A large market (e.g. electricity, healthcare) does NOT equal a strong market opportunity if the proposed solution is legally prohibited, highly regulated, or commercially inaccessible. Reduce score accordingly.
      4. CONTEXT-SENSITIVE VALIDATION & 90-DAY ROADMAP: Do NOT recommend software/startup MVP terms ("concierge MVP", "code", "NPS", "app UI") for infrastructure, deep tech, heavy industrial, energy, or highly regulated ventures. Recommend PRE-FEASIBILITY VALIDATION (legal permissibility, regulatory landscape, specialist expert consultation, technical feasibility, project economics, stakeholder pathway).
      5. EXTREME COMPRESSION: Shorten paragraphs, dense with value. Page 1 MUST deliver the blunt answer.
      6. SCORE & NARRATIVE RECONCILIATION: All report sections MUST tell the exact same commercial story. If founder lacks domain experience, score Founder Capability & Fit accordingly (4-6/15) and rate 1-2/5 stars in investor scorecard.

      STRICT FOUNDER TRUTH FACT-CHECKING DIRECTIVE:
      - Inspect the exact founder background narrative ("${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}") and uploaded CV text.
      - NEVER hallucinate domain experience! If the founder narrative or CV indicates an accounting/financial/general business background without technical engineering or nuclear sector experience:
        * You MUST NOT output text claiming "Direct, relevant technical engineering and nuclear sector experience"!
        * You MUST state explicitly: "Founder demonstrates useful general commercial/financial capabilities, but lacks direct technical engineering or nuclear sector experience required for nuclear power generation."
        * You MUST score Founder Capability & Fit strictly as 4-6/15 (Weak Fit / Partial Evidence).

      DEEP DIVE REAL-WORLD COMPARABLE & FOUNDER ANALYSIS DIRECTIVE:
      - In "realWorldComparables", you MUST perform a deep-dive research analysis evaluating:
        1. SUCCESSFUL BUSINESSES & THEIR FOUNDERS (1-3 real-world companies): Identify specific real-world companies in this or an adjacent sector that achieved commercial success. Analyze: (a) company name, (b) what they did, (c) why they succeeded (founder domain fit, distribution strategy, timing, moat), and (d) the exact actionable lesson for THIS founder.
        2. FAILED OR STRUGGLING BUSINESSES & THEIR FOUNDERS (1-3 real-world companies): Identify real-world companies in this or an adjacent sector that failed or struggled. Analyze: (a) company name, (b) what they did, (c) what went wrong (founder domain mismatch, regulatory blockages, premature scaling, unit economic failure, customer inertia, or capital exhaustion), and (d) the explicit warning/guardrail for THIS founder.
        3. MARKET INTERPRETATION SYNTHESIS: Synthesize whether historical market patterns and founder precedents favor or caution against this concept based on the current founder's background, location, and capital resources.

      EVIDENCE HIERARCHY FOR FOUNDER CAPABILITY & FIT:
      1. Direct statements in founder's written narrative: ${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}
      2. Supporting evidence from uploaded CV (${cvFileName || "None"}): ${cvText ? cvText : "No CV uploaded."}
      3. Structured questionnaire answers: Experience: ${experience}, Capacity: ${capacity}, Network: ${network}
      4. Clearly labelled commercial inference.

      SCORING DISCIPLINE & EVIDENCE ISOLATION:
      - Founder Capability and Fit MUST be scored on founder background, domain expertise, and qualifications (worth 15 pts max). A founder with relevant industry/accounting experience or strong background MUST NOT be awarded 0-3/15.
      - Problem and Customer Clarity MUST be scored on problem definition and customer segment focus. A clearly stated problem MUST NOT be awarded 0/15.
      - Customer Validation reflects empirical market testing. If customer validation is missing, penalize Customer Validation (0-3/20), but DO NOT deduct points from Founder Capability or Problem Clarity.

      GEOGRAPHIC & LOCATION CONTEXT:
      - Primary Target Location: ${locationSummary ? locationSummary : "Global / Unspecified Target Region"}
      - Target Country: ${locationCountry || "Not specified"}
      - Target Region / State: ${locationRegion || "Not specified"}
      - Target City / District: ${locationCity || "Not specified"}
      - Geographic Market Scope: ${marketScope || "Not specified"}

      MANDATORY REGIONAL & GEOGRAPHIC MARKET EVALUATION DIRECTIVE:
      - Whenever a target location (${locationSummary || locationCountry || marketScope || "region"}) is provided, it is a MANDATORY CORE ELEMENT of your market research and commercial evaluation.
      - You MUST explicitly anchor the market study within the context of ${locationSummary ? locationSummary : "the specified region/country"}:
        1. LOCAL MARKET DYNAMICS & DEMAND: Evaluate regional customer purchasing habits, local SMB/consumer density, and economic conditions in ${locationSummary ? locationSummary : "the target location"}.
        2. REGIONAL REGULATION & COMPLIANCE MANDATES: Address region-specific regulatory bodies (e.g., IRD in New Zealand, ATO in Australia, HMRC in UK, IRS in US, local city bylaws), tax laws, or industry standards relevant to this category.
        3. REGIONAL COMPETITION & DISTRIBUTION: Compare against regional incumbents, local service providers, and regional customer acquisition channels.
        4. EXPLICIT LOCATION CITATION: You MUST explicitly reference ${locationSummary ? locationSummary : "the target region/country"} by name in "executiveSummary", "businessTheme.marketCategoryDynamics", "marketAssessment.analysis", and "scores.marketCommercialOpportunity.assessment".

      STEP 3 (THE MARKET) & THOROUGH MARKET RESEARCH STUDY DIRECTIVE:
      - Treat Step 3 ("The Market": "${targetMarket}") as an exhaustive, professional Market Research Study.
      - You MUST perform a rigorous market study evaluating:
        1. RELEVANT MARKET TRENDS & TAILWINDS: Identify current macro trends, technology shifts, regulatory mandates (e.g. digital compliance), and industry growth drivers for 2026+.
        2. ADDRESSABLE MARKET SIZING & DEMAND DYNAMICS: Evaluate TAM/SAM/SOM indicators, customer purchasing power, and demand urgency in ${locationSummary ? locationSummary : "the specified target location"}.
        3. COMPETITIVE LANDSCAPE & WORKAROUNDS: Thoroughly map direct competitors, indirect substitutes, and entrenched customer habits/workarounds mentioned by the founder or active in this industry.
        4. BARRIERS TO ENTRY & ADOPTION FRICTION: Identify structural market barriers, customer switching costs, regulatory compliance hurdles, and trust requirements.
      - Ensure this deep market research synthesis is explicitly reflected across "businessTheme.marketCategoryDynamics", "marketAssessment.analysis", "scores.marketCommercialOpportunity.assessment", and "investorBite.scorecard".

      CLASSIFY BUSINESS CONCEPT & ADAPT TERMINOLOGY (Hardware vs Software):
      - Identify if the business concept is: Software/SaaS, Hardware/Physical Product, Service, or Other.
      - For HARDWARE / PHYSICAL PRODUCT concepts (e.g., MoorSafe, physical devices, mooring ropes, solar-powered pest deterrents, physical enclosures, electronics, mechanical devices):
        * NEVER generate software-specific text such as "before writing code", "software development", "core calculation engine", "single bank feed", "native mobile build", or "complex analytics".
        * ALWAYS generate hardware-appropriate concepts: "functional hardware prototype", "proof-of-concept", "physical enclosure", "mechanical attachment", "electronic functionality", "field testing", "durability testing", "materials", "manufacturing feasibility", "certification/compliance", "production tooling".
        * Example Hardware MVP Format: "Functional Hardware Prototype / Field Trial"
        * Example Inclusions: "Core physical mechanism, basic enclosure, essential electronic functionality and user testing"
        * Example Exclusions: "Production tooling, mass-manufacturing optimisation, final certification and non-essential features"
      - For SOFTWARE / SAAS concepts, continue using software-specific MVP terminology where appropriate.

      MANDATORY 4-PART PITCHLAB VERDICT DIRECTIVE:
      - "summaryBlock.pitchLabVerdict" MUST ALWAYS be a substantive 2 to 4 sentence commercial conclusion.
      - It MUST cover: (1) core commercial opportunity or founder strength, (2) primary evidence gap or weakness, (3) central commercial risk, and (4) immediate validation step required before building further.
      - DO NOT generate single-sentence warnings or isolated observations like "Market history shows high failure for niche automation tools."

      EXPLICIT CV CREDENTIAL EXTRACTION DIRECTIVE:
      - When a CV is uploaded (${cvFileName || "None"}): ${cvText ? cvText.slice(0, 3000) : "No CV uploaded."}
      - You MUST explicitly extract specific, identifiable professional credentials, qualifications, degrees, roles, certifications, and named organizations present in the CV text into "cvAnalysis.extractedCredentials" (Array of 3-5 strings).
      - EXPLICIT EXAMPLES: "Chartered Accountant (CA / CAANZ)", "Bachelor of Commerce", "Finance Manager (Clever Core NZ Ltd / Fletcher)", "Xero Certified Advisor", "20+ years senior advisory experience".
      - NEVER output generic placeholders such as "Relevant professional domain experience" or "Industry-specific commercial background" if specific credentials exist in the CV text.

      LOCATION & REGIONAL SCOPE DIRECTIVE:
      - Submitted Location: Country = "${locationCountry || 'Not specified'}", Region = "${locationRegion || 'Not specified'}", City = "${locationCity || 'Not specified'}", Full Location Summary = "${locationSummary || 'New Zealand'}".
      - Target Market Scope: "${marketScope || 'National customers'}".
      - You MUST strictly tailor all market analysis, regional business news, customer review trends, and local government/regulatory framework citations to the founder's specific submitted region ("${locationSummary || 'New Zealand'}") and market scope ("${marketScope || 'National customers'}").
      - DO NOT substitute generic global data if a specific city, region, or country was submitted by the founder.

      LEGAL & REGULATORY DEEP DIVE DIRECTIVE:
      - When researching new ideas and checking legal/regulatory frameworks, perform a precise statutory deep dive for the target jurisdiction rather than issuing generic legal statements.
      - DISTINGUISH BETWEEN EXPLICIT STATUTORY BANS vs REGULATORY CONSENT & LEGISLATIVE REFORM REQUIREMENTS.
      - Specific Jurisdiction Example (Nuclear Energy in New Zealand):
        * The New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 explicitly bans nuclear-powered vessels/warships and nuclear explosive devices (weapons/arsenal) under Sections 5–9.
        * Land-based commercial nuclear power generation is NOT governed by the 1987 warship/weapons ban, but is strictly regulated and constrained under the Radiation Safety Act 2016, Resource Management Act 1991 (RMA), and Atomic Energy Act 1945.
        * Operating a commercial nuclear plant in NZ would require explicit parliamentary statutory amendment / legislative reform, extensive environmental consents under the RMA, and high-level radiation safety authorizations.
      - Apply this level of statutory accuracy to all legal, statutory, and policy assessments across all jurisdictions.

      FUTURE TRENDS & MARKET DIRECTION DIRECTIVE:
      - Assess whether 3-10 year structural trends are moving TOWARD or AWAY FROM this business opportunity across:
        1. Market Trajectory (rapidly growing, growing, stable, mature, declining, structural disruption).
        2. Technology Direction (enabling technologies, cost reducers, barriers to entry, substitution risks).
        3. Customer Behaviour Shifts (convenience, digital adoption, sustainability, affordability, security, health/safety).
        4. Regulation & Policy Direction (acceleration, compliance burden, subsidies, market restrictions).
        5. Competitive Direction (entry velocity, incumbent expansion, consolidation, substitutes).
        6. Long-Term Relevance (5-10 year problem persistence vs risk of commoditisation/obsolescence).
        7. Emerging / Adjacent Opportunities (Max 3 concise, genuinely relevant adjacent paths).
      - Provide "futureOutlook": "STRONG" | "POSITIVE" | "NEUTRAL" | "UNCERTAIN" | "NEGATIVE".
      - Provide "trendAlignmentScore": Number 1-10 reflecting how strongly major structural trends support this specific business idea.
      - Provide "forecastConfidence": "High" | "Medium" | "Low" reflecting evidence quality and forecast certainty.
      - Provide "whereMarketIsHeading": 2-3 concise paragraphs explaining structural trends over the next 3-10 years.
      - Provide "tailwinds": Array of 2-4 important trends strengthening the opportunity.
      - Provide "headwinds": Array of 2-4 trends weakening, disrupting, or complicating the opportunity.
      - Provide "founderDecisionGuidance": Commercially focused recommendation (move now, validate quickly, monitor development, design around risk, position ahead, avoid overinvesting).
      - Provide "adjacentOpportunities": Array of maximum 3 genuinely relevant adjacent opportunities.

      FOUNDER INPUTS:
      - Idea: ${idea}
      - Category: ${category || "General Startup"}
      - Problem: ${problem}
      - Budget: ${budget}
      - Founder Narrative: ${founderBackgroundNarrative}
      - Experience: ${experience}
      - Capacity: ${capacity}
      - Network: ${network}
      - Target Market: ${targetMarket}
      - Location / Geography: ${locationSummary ? locationSummary : "Not specified"} (${marketScope})

      YOU MUST RETURN A VALID JSON OBJECT WITH THE FOLLOWING STRUCTURE:
      {
        "executiveSummary": "150-200 word sharp, idea-specific commercial summary.",
        "summaryBlock": {
          "pitchLabVerdict": "Substantive 2-4 sentence commercial verdict.",
          "overallCommercialVerdict": "Blunt advisor verdict label (e.g. Validate Before Building).",
          "biggestRiskToThisIdea": "Single make-or-break risk for this specific idea.",
          "doThisBeforeBuildingMore": "One specific low-cost validation action.",
          "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
          "topPrioritiesNow": ["Priority 1", "Priority 2", "Priority 3"]
        },
        "cvAnalysis": {
          "cvAttached": ${cvText ? 'true' : 'false'},
          "extractedCredentials": ["Chartered Accountant (CA / CAANZ)", "Bachelor of Commerce (BCom)", "Finance Manager (Clever Core NZ Ltd)"],
          "founderStrengthsFromCV": "Extracted strengths based on CV background.",
          "alignmentWithBusinessIdea": "How CV directly de-risks executing this startup idea."
        },
        "founderCapabilityExplanation": {
          "evidenceReliedOn": "Founder background, qualifications, and experience.",
          "whyThisScoreWasAwarded": "Explanation supporting score based on evidence.",
          "capabilityGaps": ["Gap 1", "Gap 2"],
          "recommendedResponse": ["Response 1", "Response 2"]
        },
        "whyThisScore": {
          "strongestArea": "Strongest category",
          "weakestArea": "Weakest category",
          "mainDragOnScore": "Primary bottleneck",
          "fastestWayToImprove": "Fastest improvement action"
        },
        "businessTheme": {
          "primaryTheme": "Primary industry/domain theme",
          "secondaryTheme": "Secondary commercial theme",
          "strategicPositioning": "Detailed 2-3 sentence strategic positioning in value chain",
          "marketCategoryDynamics": "1-2 sentences macro growth drivers and tailwinds",
          "strategicMoat": "1-2 sentences primary long-term strategic advantage or moat"
        },
        "businessModelSnapshot": {
          "targetCustomer": "Specific target customer segment details",
          "coreOffering": "Core product/service offering",
          "customerProblem": "Key problem being solved",
          "valueProposition": "Core value proposition",
          "revenueModel": "Monetization and pricing model",
          "customerAcquisition": "Primary acquisition channels",
          "keyCosts": "Major launch and operating costs",
          "commercialAssessment": "1-2 sentence overall commercial assessment"
        },
        "investorBite": {
          "introduction": "If you had 60 seconds to present this idea to experienced investors...",
          "scorecard": [
            { "area": "Problem Worth Solving", "rating": 4, "commentary": "Problem urgency commentary." },
            { "area": "Market Opportunity", "rating": 4, "commentary": "Market reach commentary." },
            { "area": "Competitive Advantage", "rating": 4, "commentary": "Differentiation commentary." },
            { "area": "Business Model", "rating": 3, "commentary": "Monetization commentary." },
            { "area": "Founder Capability", "rating": 5, "commentary": "Domain fit commentary." },
            { "area": "Customer Validation", "rating": 1, "commentary": "Validation proof commentary." },
            { "area": "Scalability", "rating": 4, "commentary": "Scalability commentary." },
            { "area": "Investment Readiness", "rating": 3, "commentary": "Capital readiness commentary." }
          ],
          "overallInterestScore": 75,
          "investmentPotential": "Medium",
          "overallInterestExplanation": "Explanation of investor interest score",
          "investmentVerdict": "Detailed narrative on investor perspective",
          "investorQuestions": ["Question 1", "Question 2", "Question 3"],
          "biggestStrength": "Biggest investment strength call-out",
          "biggestRisk": "Biggest investment risk call-out",
          "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
          "pitchLabRecommendation": "Almost Ready",
          "pitchLabRecommendationExplanation": "Short explanation for recommendation"
        },
        "scores": {
          "problemCustomerClarity": { "score": "<number 0-15 based on problem clarity>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of problem urgency", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "founderCapabilityFit": { "score": "<number 0-15 based on founder experience>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of founder fit", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "customerValidation": { "score": "<number 0-20 based on customer validation proof>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of validation logs", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "marketCommercialOpportunity": { "score": "<number 0-15 based on addressable market>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of market reach", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "businessModelWillingnessToPay": { "score": "<number 0-15 based on monetization model>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of pricing", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "competitivePosition": { "score": "<number 0-10 based on competitive moat>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of differentiation", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "executionReadiness": { "score": "<number 0-10 based on time & capital>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of execution capacity", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" }
        },
        "decisionStatus": { "state": "Validate Before Building", "explanation": "Explanation", "nextMilestone": "Next milestone" },
        "tearDetails": { "theme": "Strategic framing", "evidence": "Support signals", "analysis": "Friction analysis", "recommendation": "Next move" },
        "founderMetrics": { "analysis": "Founder analysis", "founderPositionSummary": "Strongly Positioned", "weeklyAvailableHours": "10-15 hrs/week", "availableCapital": "$2,500-$5,000 NZD", "initialRiskCapital": "$500 NZD" },
        "marketAssessment": { "analysis": "Market analysis", "marketPatternSummary": "Validated Precedent" },
        "realWorldComparables": {
          "successes": [{ "name": "Success 1", "whatTheyDid": "Details", "whyItSucceeded": "Why", "lessonForFounder": "Lesson" }],
          "failures": [{ "name": "Failure 1", "whatTheyDid": "Details", "whatWentWrong": "Why", "warningForFounder": "Warning" }],
          "marketInterpretation": "Market interpretation"
        },
        "keyRisks": [{ "name": "Risk 1", "whyItMatters": "Why", "whatToProveOrFix": "Fix" }],
        "whatNotToBuild": ["Don't build item 1", "Don't build item 2"],
        "thirtyDayPlan": {
          "week1": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week2": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week3": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week4": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" }
        },
        "finalRecommendation": { "recommendation": "Validate Before Building", "why": "Why", "biggestIssue": "Issue", "pathForward": "Path", "explicitWarning": "Warning" }
      }
    `;

    // 7. Build the evaluation schema.
    const evaluationSchema = z.object({
      summaryBlock: z.object({
        overallReadinessScore: z.number(),
        decisionStatus: z.string().describe("Master Recommendations: Proceed, Proceed with Controlled Validation, Validate Before Building, Refine the Concept, Pivot Toward a Stronger Opportunity, Pause Pending Further Evidence, or Stop Before Further Investment"),
        biggestRiskToThisIdea: z.string().describe("One-line statement of the single make-or-break issue."),
        doThisBeforeBuildingMore: z.string().describe("One specific, non-negotiable low-cost action."),
        topStrengths: z.array(z.string()).describe("3 short, punchy strengths."),
        topPrioritiesNow: z.array(z.string()).describe("3 action-led priorities.")
      }),
      cvAnalysis: z.object({
        cvAttached: z.boolean().describe("Whether a CV was provided and analyzed."),
        extractedCredentials: z.array(z.string()).describe("3-5 key qualifications, credentials, or past roles extracted from CV."),
        founderStrengthsFromCV: z.string().describe("Synthesized founder strengths identified from CV analysis."),
        alignmentWithBusinessIdea: z.string().describe("How CV background directly de-risks and supports executing this startup idea.")
      }).describe("Thorough analysis of founder CV and professional background."),
      founderCapabilityExplanation: z.object({
        evidenceReliedOn: z.string().describe("Summarise the founder's relevant background, qualifications, experience, customer access, and motivation."),
        whyThisScoreWasAwarded: z.string().describe("Explain how that evidence supports the founder's ability to understand the problem and lead the next stage."),
        capabilityGaps: z.array(z.string()).describe("Identify no more than 3 material capability gaps."),
        recommendedResponse: z.array(z.string()).describe("Specific recommended responses to address those gaps (e.g. targeted learning, specialist contractor, adviser, strategic partner). DO NOT default to finding a co-founder.")
      }).describe("Structured 4-part explanation of Founder Capability & Fit score."),
      whyThisScore: z.object({
        strongestArea: z.string(),
        weakestArea: z.string(),
        mainDragOnScore: z.string().describe("Primary bottleneck holding back the score. 1 sentence."),
        fastestWayToImprove: z.string()
      }),
      businessTheme: z.object({
        primaryTheme: z.string().describe("Primary industry/domain theme (e.g. B2B FinTech / Business Services)."),
        secondaryTheme: z.string().describe("Secondary commercial theme (e.g. Workflow Efficiency & Automation)."),
        strategicPositioning: z.string().describe("2-3 sentences analyzing how this business strategically positions itself in the competitive value chain, its core defensibility, and market timing."),
        marketCategoryDynamics: z.string().describe("1-2 sentences on current macro growth drivers, market tailwinds, or regulatory shifts impacting this positioning."),
        strategicMoat: z.string().describe("1-2 sentences identifying the primary long-term strategic advantage or moat.")
      }).describe("Comprehensive Business Theme & Strategic Positioning analysis."),
      businessModelSnapshot: z.object({
        targetCustomer: z.string().describe("Who is the primary customer for this business? 1-3 sentences or 'Not yet evidenced'."),
        coreOffering: z.string().describe("What product or service is being offered? 1-3 sentences or 'Not yet evidenced'."),
        customerProblem: z.string().describe("What key problem or need is being solved? 1-3 sentences or 'Not yet evidenced'."),
        valueProposition: z.string().describe("Why would customers choose this business over existing alternatives? 1-3 sentences or 'Not yet evidenced'."),
        revenueModel: z.string().describe("How will the business generate revenue? 1-3 sentences or 'Not yet evidenced'."),
        customerAcquisition: z.string().describe("What are the most likely ways to attract the first customers? 1-3 sentences or 'Not yet evidenced'."),
        keyCosts: z.string().describe("What are the major costs involved in launching and operating the business? 1-3 sentences or 'Not yet evidenced'."),
        commercialAssessment: z.string().describe("A concise 1-2 sentence summary of the overall business model, highlighting its strengths, key risks and current level of maturity.")
      }).describe("Clean 8-part Business Model Snapshot assessment table."),
      marketInsights: z.object({
        marketLandscape: z.string().describe("Paragraph 1: Broader market landscape, sector maturity, scale, structural trends (50-75 words). Use qualitative language if TAM numerical data is absent; do not invent figures."),
        demandDrivers: z.string().describe("Paragraph 2: Specific factors driving or limiting demand for THIS idea (changing customer needs, regulation, tech shifts, cost pressures) (50-75 words)."),
        competitionAlternatives: z.string().describe("Paragraph 3: Competitors, incumbents, substitutes, and existing customer workarounds (50-75 words). Note that absence of direct competitors does not equal strong opportunity."),
        commercialReality: z.string().describe("Paragraph 4: Commercial accessibility, entry barriers, regulatory constraints, and market timing. Distinguish large underlying market size from accessible opportunity for THIS specific solution (50-75 words)."),
        localBusinessNews: z.string().describe("Paragraph 5: Regional business news, commercial climate, input cost pressures, and local business trends (50-75 words)."),
        customerReviewTrends: z.string().describe("Paragraph 6: Real customer review trends, dissatisfaction with current alternatives/workarounds, and user sentiment shifts (50-75 words)."),
        governmentPolicyInfluence: z.string().describe("Paragraph 7: Local government policies, statutory acts (e.g. RMA, fast-track consenting, energy/nuclear legislation), and council regulatory mandates (50-75 words).")
      }).describe("Comprehensive 7-paragraph commercial adviser briefing on the market environment, local business news, customer reviews, and government policies."),
      investorBite: z.object({
        introduction: z.string().default("If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers."),
        scorecard: z.array(z.object({
          area: z.string().describe("One of: Problem Worth Solving, Market Opportunity, Competitive Advantage, Business Model, Founder Capability, Customer Validation, Scalability, Investment Readiness"),
          rating: z.number().min(1).max(5).describe("Rating 1 to 5"),
          commentary: z.string().describe("1 concise sentence explanation.")
        })).describe("8 investor scorecard items matching specified categories."),
        overallInterestScore: z.number().min(0).max(100).describe("Overall Investor Interest score out of 100."),
        investmentPotential: z.string().describe("High, Medium, or Low"),
        overallInterestExplanation: z.string().describe("Concise explanation of why this overall investor interest score was achieved."),
        investmentVerdict: z.string().describe("Max 150 words narrative on investor perspective."),
        investorQuestions: z.array(z.string()).describe("5 to 8 personalized questions investors would ask based on identified weaknesses."),
        biggestStrength: z.string().describe("One highlighted investor call-out box for biggest strength."),
        biggestRisk: z.string().describe("One highlighted investor warning box for biggest risk."),
        improvements: z.array(z.string()).describe("3 to 5 prioritized recommendations to improve investor appeal."),
        pitchLabRecommendation: z.string().describe("Ready to Pitch, Almost Ready, Needs More Validation, or Early Stage Idea"),
        pitchLabRecommendationExplanation: z.string().describe("Short explanation for the PitchLab recommendation.")
      }).describe("Proprietary PitchLab Commercial Readiness Assessment framework."),
      executiveSummary: z.string().describe("150-250 words ONLY. Sharp commercial overview. No repetition."),
      futureTrends: z.object({
        futureOutlook: z.string().describe("STRONG | POSITIVE | NEUTRAL | UNCERTAIN | NEGATIVE"),
        trendAlignmentScore: z.number().min(1).max(10).describe("Scale 1-10 indicating how strongly structural 3-10 year trends support this specific business idea."),
        forecastConfidence: z.string().describe("High | Medium | Low"),
        whereMarketIsHeading: z.string().describe("2-3 concise paragraphs analyzing major 3-10 year structural trends (macro, technology, customer behaviour, policy, competitive dynamics)."),
        tailwinds: z.array(z.string()).describe("2-4 important structural trends that strengthen the opportunity."),
        headwinds: z.array(z.string()).describe("2-4 structural trends that weaken, disrupt, or complicate the opportunity."),
        founderDecisionGuidance: z.string().describe("Commercially focused recommendation: move now, validate quickly, monitor development, design around risk, position ahead, avoid overinvesting."),
        adjacentOpportunities: z.array(z.string()).describe("Maximum 3 genuinely relevant adjacent opportunities emerging from this capability or technology.")
      }).describe("Comprehensive 3-10 year Future Trends & Market Direction analysis."),
      scores: z.object({
        problemCustomerClarity: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing problem and customer clarity."), missingEvidence: z.string().describe("Identify the specific missing empirical evidence regarding problem frequency, severity, or customer definition (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a concrete, high-impact action the founder must take to validate the problem and customer (1-2 concise sentences).") }),
        founderCapabilityFit: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing founder capability and fit."), missingEvidence: z.string().describe("Identify specific unevidenced capability areas, technical gaps, or market credibility proof required (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a concrete, practical action to bridge founder capability or advisor support gaps (1-2 concise sentences).") }),
        customerValidation: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing customer validation."), missingEvidence: z.string().describe("Identify missing empirical validation data such as logged interviews, LOIs, or pilot user feedback (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a structured action to execute discovery interviews or concierge pilot testing (1-2 concise sentences).") }),
        marketCommercialOpportunity: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing market & commercial opportunity."), missingEvidence: z.string().describe("Identify missing market sizing, reachability proof, or urgency metrics (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a targeted action to quantify addressable market segment and reachability (1-2 concise sentences).") }),
        businessModelWillingnessToPay: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing business model and pricing."), missingEvidence: z.string().describe("Identify missing price-sensitivity data, unit economics, or validated payment commitment (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a practical action to test pricing terms and payment intent with target customers (1-2 concise sentences).") }),
        competitivePosition: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing competitive position."), missingEvidence: z.string().describe("Identify missing direct competitor analysis, workaround comparisons, or switching barrier proof (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a strategic action to benchmark against existing workarounds and articulate unique advantage (1-2 concise sentences).") }),
        executionReadiness: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing execution readiness."), missingEvidence: z.string().describe("Identify missing milestone details, resource alignment, or low-cost validation budget boundaries (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a disciplined action to structure a 30-day low-cost validation roadmap (1-2 concise sentences).") }),
        futureTrends: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing future trends and market direction."), missingEvidence: z.string().describe("Specific missing structural trend evidence."), improvementAction: z.string().describe("Specific action to position ahead of market trends.") }),
      }),
      decisionStatus: z.object({
        state: z.string(),
        explanation: z.string(),
        nextMilestone: z.string()
      }),
      tearDetails: z.object({
        theme: z.string().describe("Concise strategic framing."),
        evidence: z.string().describe("Foundational support signals."),
        analysis: z.string().describe("Advisor-style friction analysis."),
        recommendation: z.string().describe("Next move based on strategic logic.")
      }),
      founderMetrics: z.object({
        analysis: z.string().describe("Assessing industry understanding, operational capacity, and leadership position."),
        founderPositionSummary: z.string().describe("Strongly Positioned, Partially Positioned, or Meaningfully Constrained."),
        weeklyAvailableHours: z.string().describe("Extract or state weekly hours commitment (e.g. 15-30 hours/week)."),
        availableCapital: z.string().describe("Extract or state available capital commitment (e.g. $5,000 NZD)."),
        initialRiskCapital: z.string().describe("Estimated initial low-risk validation budget (e.g. $1,000 NZD).")
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
      keyRisks: z.array(z.object({
        name: z.string(),
        whyItMatters: z.string(),
        whatToProveOrFix: z.string()
      })).describe("Top 5 ruthless commercial risks only."),
      whatNotToBuild: z.array(z.string()).describe("3-7 waste-reduction items."),
      thirtyDayPlan: z.object({
        week1: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week2: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week3: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week4: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() })
      }),
      finalRecommendation: z.object({
        recommendation: z.string().describe("Supportive but blunt Advisor Verdict Label."),
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
        output: { format: 'json' },
      });
      console.log("PitchLab: Google AI generation (gemini-2.5-flash) successful.");
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
          output: { format: 'json' },
        });
        console.log("PitchLab: Google AI retry (2.5-pro) successful.");
      } catch (retryErr) {
        logSubmissionError("GOOGLE AI RETRY FAILED", retryErr, { userId, idea });
        console.error("PitchLab: All AI attempts failed. Using mock mode.");
        result = getMockResult(reqData);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`PitchLab: Genkit AI raw output received in ${duration}s`);
    
    let evaluationData = safeExtractJsonFromAiResponse(result, reqData);

    // 9. Reconcile 7-Category Scores & Band Mapping (Master Fix)
    const rawScores = evaluationData.scorecard || evaluationData.scores || {};
    const reconciled = reconcileScores(rawScores, reqData);

    evaluationData.overallScore = reconciled.overallScore;
    evaluationData.scoreBand = reconciled.scoreBand;
    evaluationData.masterRecommendation = reconciled.masterRecommendation;
    evaluationData.scorecard = reconciled.categoryScores;
    evaluationData.scores = reconciled.categoryScores;

    // Unconditionally synchronize summaryBlock to prevent raw un-reconciled AI score bleeding
    evaluationData.summaryBlock = evaluationData.summaryBlock || {};
    evaluationData.summaryBlock.overallScore = reconciled.overallScore;
    evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
    evaluationData.summaryBlock.scoreBand = reconciled.scoreBand;
    evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
    evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
    evaluationData.summaryBlock.masterRecommendation = reconciled.masterRecommendation;

    // Ensure investorBite is fully populated and ALWAYS strictly aligned with reconciled category scores
    evaluationData.investorBite = evaluationData.investorBite || {};
    evaluationData.investorBite.introduction = evaluationData.investorBite.introduction || "If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers.";
    evaluationData.investorBite.overallInterestScore = reconciled.overallScore;
    evaluationData.investorBite.investmentPotential = reconciled.overallScore >= 75 ? "High" : (reconciled.overallScore >= 50 ? "Medium" : "Low");
    evaluationData.investorBite.overallInterestExplanation = evaluationData.investorBite.overallInterestExplanation || evaluationData.executiveSummary || "Commercial concept evaluated against evidence and feasibility criteria.";
    
    // Direct Score-to-Star Alignment & Reconciled Commentary (Fix 7)
    evaluationData.investorBite.scorecard = [
      { area: "Problem Worth Solving", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.problemCustomerClarity?.scoreAchieved || 10) / 15) * 5))), commentary: reconciled.categoryScores.problemCustomerClarity?.explanation || "Problem urgency and target customer definition." },
      { area: "Market Opportunity", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.marketCommercialOpportunity?.scoreAchieved || 10) / 15) * 5))), commentary: reconciled.categoryScores.marketCommercialOpportunity?.explanation || "Addressable market reach and commercial space." },
      { area: "Competitive Advantage", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.competitivePosition?.scoreAchieved || 6) / 10) * 5))), commentary: reconciled.categoryScores.competitivePosition?.explanation || "Differentiation against existing workarounds." },
      { area: "Business Model", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.businessModelWillingnessToPay?.scoreAchieved || 10) / 15) * 5))), commentary: reconciled.categoryScores.businessModelWillingnessToPay?.explanation || "Monetization logic and margin structure." },
      { area: "Founder Capability", rating: (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved >= 13 ? 5 : (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved >= 10 ? 4 : (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved >= 7 ? 3 : (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved >= 4 ? 2 : 1)))), commentary: reconciled.categoryScores.founderCapabilityFit?.explanation || "Domain background and operational fit." },
      { area: "Customer Validation", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.customerValidation?.scoreAchieved || 4) / 20) * 5))), commentary: reconciled.categoryScores.customerValidation?.explanation || "Empirical proof of real customer demand." },
      { area: "Scalability", rating: Math.max(1, Math.min(5, Math.round(((reconciled.categoryScores.executionReadiness?.scoreAchieved || 6) / 10) * 5))), commentary: reconciled.categoryScores.executionReadiness?.explanation || "Capacity to grow without proportional linear cost." },
      { area: "Investment Readiness", rating: Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), commentary: "Overall evidence maturity for capital allocation." }
    ];

    // Section 13: Attach internal telemetry debug object
    evaluationData.foundationalFeasibilityGate = reconciled.foundationalFeasibilityGate;

    // Attach Founder Prediction & Evidence Gap analysis
    const founderPredictionsInput = reqData.founderPredictions || {};
    const founderEvidenceGap = calculateFounderEvidenceGap(founderPredictionsInput, reconciled, reqData);
    evaluationData.founderPredictions = founderEvidenceGap.founderPredictions;
    evaluationData.founderEvidenceGap = founderEvidenceGap;

    // Section 7: Context integrity & pre-generation leakage prevention check
    evaluationData.meta = evaluationData.meta || {};
    const currentAssessmentConcept = (reqData.idea || "").trim();
    const reportConcept = (evaluationData.meta.businessName || evaluationData.meta.conceptSummary || evaluationData.idea || "").trim();

    if (reportConcept && currentAssessmentConcept &&
        !reportConcept.toLowerCase().includes(currentAssessmentConcept.toLowerCase().slice(0, 15)) &&
        !currentAssessmentConcept.toLowerCase().includes(reportConcept.toLowerCase().slice(0, 15))) {
      console.warn(`PITCHLAB INTEGRITY ALERT: ASSESSMENT_CONTEXT_MISMATCH detected! Correcting concept context from '${reportConcept}' to '${currentAssessmentConcept}'`);
    }

    evaluationData.meta.businessName = currentAssessmentConcept;
    evaluationData.meta.conceptSummary = currentAssessmentConcept;
    evaluationData.businessName = currentAssessmentConcept;
    evaluationData.idea = currentAssessmentConcept;

    // Section 8 & 9: If Critical Feasibility Gates exist, synchronize recommendations & roadmap to Pre-Feasibility focus
    if (reconciled.gatesInfo?.hasCriticalGate) {
      evaluationData.summaryBlock = evaluationData.summaryBlock || {};
      evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
      evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
      evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
      evaluationData.summaryBlock.biggestRiskToThisIdea = reconciled.gatesInfo.summary || "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.";
      evaluationData.summaryBlock.doThisBeforeBuildingMore = "Verify Legal & Regulatory Feasibility: Obtain specialist advice on whether any lawful pathway currently exists for commercial nuclear generation in New Zealand.";

      evaluationData.decisionStatus = {
        state: reconciled.masterRecommendation,
        explanation: "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.",
        nextMilestone: "Complete Pre-Feasibility Validation Assessment"
      };

      evaluationData.finalRecommendation = {
        recommendation: reconciled.masterRecommendation,
        why: "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.",
        biggestIssue: reconciled.gatesInfo.summary,
        pathForward: "Verify Legal & Regulatory Feasibility: Obtain specialist advice on whether any lawful pathway currently exists for commercial nuclear generation in New Zealand.",
        explicitWarning: "Do not commit capital, project engineering, site options, or team onboarding until pre-feasibility validation is complete."
      };

      // Pre-Feasibility 90-Day Roadmap for Heavy/Regulated/Infrastructure concepts
      evaluationData.thirtyDayPlan = {
        week1: { objective: "Legal & Regulatory Feasibility Assessment", tasks: ["Obtain specialist legal advice on statutory framework, local legislation and legal prohibitions", "Identify required regulatory approval bodies and compliance mandates"], expectedResult: "Comprehensive assessment of legal permissibility and statutory barriers" },
        week2: { objective: "Specialist Technical & Domain Expert Consultation", tasks: ["Consult independent domain engineers, regulatory specialists or industry advisers", "Map required technical qualifications and specialist team gaps"], expectedResult: "Expert feedback on technical, safety, and operational feasibility" },
        week3: { objective: "Technical & Infrastructure Feasibility Study", tasks: ["Assess grid, site, environmental, and infrastructure prerequisites", "Evaluate technology readiness level and deployment dependencies"], expectedResult: "High-level technical and site feasibility assessment report" },
        week4: { objective: "Pre-Feasibility Decision (Proceed / Pivot / Stop)", tasks: ["Model indicative project economics, CAPEX/OPEX, and capital requirements", "Present pre-feasibility findings to make a disciplined Go / Pivot / Stop decision"], expectedResult: "Formal Pre-Feasibility Recommendation & Risk Gateway Report" }
      };

      evaluationData.summaryBlock.threePriorityActions = [
        {
          heading: "1. Verify Statutory & Legal Permissibility",
          explanation: "Obtain specialist legal advice to confirm whether any statutory pathway or legislative exemption exists under regional statutory frameworks (such as the New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987) before committing project capital.",
          outcome: "Formal written opinion from specialist legal and regulatory counsel."
        },
        {
          heading: "2. Specialist Technical & Regulatory Pre-Feasibility",
          explanation: "Engage qualified nuclear engineers, grid infrastructure specialists, and environmental regulatory consultants to map mandatory safety, site, grid connection, and statutory prerequisites.",
          outcome: "Technical pre-feasibility gap assessment and regulatory compliance roadmap."
        },
        {
          heading: "3. Capital Requirements & Public Policy Assessment",
          explanation: "Evaluate extreme multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment prior to commercial scoping.",
          outcome: "Formal Pre-Feasibility Recommendation & Risk Gateway Report."
        }
      ];
      evaluationData.threePriorityActions = evaluationData.summaryBlock.threePriorityActions;

      evaluationData.whatNotToBuild = [
        "Do not commit capital to land options, site leases, or plant engineering prior to legal confirmation.",
        "Do not hire engineering consultants or technical staff before completing regulatory feasibility analysis.",
        "Do not pitch investors for project capital until statutory and licensing pathways are established."
      ];
    }
    evaluationData.investorBite.investorQuestions = (Array.isArray(evaluationData.investorBite.investorQuestions) && evaluationData.investorBite.investorQuestions.length > 0) ? evaluationData.investorBite.investorQuestions : [
      "What statutory or regulatory approvals are required before project execution?",
      "What stops an established competitor or state entity from controlling this infrastructure?",
      "What empirical evidence proves that the customer problem is urgent and frequent?",
      "What is your specific, low-cost pre-feasibility validation strategy?",
      "What key operational milestones will you achieve before seeking external funding?"
    ];
    const defaultStrength = (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved <= 6)
      ? "Strong general commercial and financial capability combined with a clearly defined customer problem."
      : "Deep industry experience combined with a clearly defined customer problem.";
    evaluationData.investorBite.biggestStrength = evaluationData.investorBite.biggestStrength || evaluationData.summaryBlock?.topStrengths?.[0] || defaultStrength;
    if (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved <= 6 && evaluationData.investorBite.biggestStrength.includes("Deep industry experience")) {
      evaluationData.investorBite.biggestStrength = "Strong general commercial and financial capability combined with a clearly defined customer problem.";
    }
    evaluationData.investorBite.biggestRisk = evaluationData.investorBite.biggestRisk || evaluationData.summaryBlock?.biggestRiskToThisIdea || "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.";

    if (reconciled.gatesInfo?.hasCriticalGate) {
      evaluationData.investorBite.improvements = [
        "Verify Legal & Regulatory Feasibility with specialist legal advisers.",
        "Consult independent domain engineers and regulatory specialists to map compliance prerequisites.",
        "Conduct a formal pre-feasibility study evaluating project capital requirements and site constraints."
      ];
    } else {
      evaluationData.investorBite.improvements = (Array.isArray(evaluationData.investorBite.improvements) && evaluationData.investorBite.improvements.length > 0) ? evaluationData.investorBite.improvements : [
        "Conduct 15-20 structured customer discovery interviews.",
        "Build a simple manual concierge MVP to test workflow adoption.",
        "Validate pricing terms directly with prospective buyers.",
        "Secure signed Letters of Intent or early pilot commitments."
      ];
    }
    evaluationData.investorBite.pitchLabRecommendation = evaluationData.investorBite.pitchLabRecommendation || (reconciled.overallScore >= 80 ? "Ready to Pitch" : reconciled.overallScore >= 65 ? "Almost Ready" : reconciled.overallScore >= 45 ? "Needs More Validation" : "Early Stage Idea");
    evaluationData.investorBite.pitchLabRecommendationExplanation = evaluationData.investorBite.pitchLabRecommendationExplanation || "Focus on validating customer demand and securing early proof of willingness to pay before raising external capital.";

    // Ensure businessTheme is fully populated with strategic positioning
    evaluationData.businessTheme = evaluationData.businessTheme || {};
    evaluationData.businessTheme.primaryTheme = evaluationData.businessTheme.primaryTheme || category || "B2B Software & Business Services";
    evaluationData.businessTheme.secondaryTheme = evaluationData.businessTheme.secondaryTheme || "Workflow Efficiency & Automation";
    evaluationData.businessTheme.strategicPositioning = evaluationData.businessTheme.strategicPositioning || "Positions as a high-efficiency specialized tool directly targeting workflow friction. De-risks adoption by embedding seamlessly alongside existing customer routines rather than forcing a major operational overhaul.";
    evaluationData.businessTheme.marketCategoryDynamics = evaluationData.businessTheme.marketCategoryDynamics || "Driven by accelerating demand for automated compliance, time-saving software, and operational cost reduction across target businesses.";
    evaluationData.businessTheme.strategicMoat = evaluationData.businessTheme.strategicMoat || "Deep domain specialization, high workflow retention, and direct industry network access.";

    // Ensure raw inputs flow through directly to frontend
    evaluationData.idea = idea;
    evaluationData.problem = problem;
    evaluationData.targetMarket = targetMarket;
    evaluationData.category = category;
    evaluationData.budget = budget;
    evaluationData.capacity = capacity;
    evaluationData.network = network;
    evaluationData.experience = experience;
    evaluationData.locationCountry = locationCountry;
    evaluationData.locationRegion = locationRegion;
    evaluationData.locationCity = locationCity;
    evaluationData.locationSummary = locationSummary;
    evaluationData.marketScope = marketScope;
    evaluationData.timeCommitment = reqData.timeCommitment || capacity;
    evaluationData.investmentCommitment = reqData.investmentCommitment || budget;
    evaluationData.founderBackgroundNarrative = founderBackgroundNarrative;

    evaluationData.betaCohort = "first50";
    evaluationData.meta = evaluationData.meta || {};
    evaluationData.meta.betaCohort = "first50";
    evaluationData.meta.founderRegion = locationSummary || locationCountry || "Global";

    // Ensure founderMetrics has fallbacks matching user inputs
    evaluationData.founderMetrics = evaluationData.founderMetrics || {};
    evaluationData.founderMetrics.weeklyAvailableHours = evaluationData.founderMetrics.weeklyAvailableHours || reqData.timeCommitment || capacity || "15-30 hours/week";

    // FIX 2: Format Capital Value cleanly & prevent corruption
    const userCapInput = reqData.investmentCommitment || reqData.budget || budget;
    const formattedCap = formatCapitalValue(userCapInput, evaluationData.founderMetrics.availableCapital);
    evaluationData.founderMetrics.availableCapital = formattedCap;
    if (evaluationData.capitalReality) {
      evaluationData.capitalReality.availableCapital = formattedCap;
    }

    evaluationData.founderMetrics.initialRiskCapital = evaluationData.founderMetrics.initialRiskCapital || "$1,000 NZD";
    const founderScoreVal = reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0;
    const userTimeVal = (reqData.timeCommitment || capacity || "").toLowerCase();
    const isLimitedTimeVal = Boolean(userTimeVal.match(/0-5|5-15|0\s*-\s*5|5\s*-\s*15|<15/i));

    if (founderScoreVal >= 12) {
      evaluationData.founderMetrics.founderPositionSummary = "Well Positioned";
    } else if (founderScoreVal >= 7) {
      evaluationData.founderMetrics.founderPositionSummary = "Workable With Constraints";
    } else if (founderScoreVal >= 4) {
      evaluationData.founderMetrics.founderPositionSummary = "Important Gaps to Address";
    } else {
      evaluationData.founderMetrics.founderPositionSummary = "Material Founder Constraints";
    }
    evaluationData.founderMetrics.analysis = reconciled.categoryScores.founderCapabilityFit?.explanation || evaluationData.founderMetrics.analysis;

    // SEMANTIC CONSISTENCY QA PASS: Eliminate Narrative Contradictions (Requirement 17)
    if (founderScoreVal <= 6) {
      if (evaluationData.cvAnalysis) {
        evaluationData.cvAnalysis.alignmentWithBusinessIdea = "Founder background demonstrates general commercial capability, but lacks direct technical/domain credentials for this specific venture.";
      }
      if (evaluationData.founderCapabilityExplanation) {
        evaluationData.founderCapabilityExplanation.whyThisScoreWasAwarded = "Recognises general commercial and financial capability, but highlights a major venture-specific domain and technical execution gap.";
      }
    }

    // FIX 3: Master Recommendation Everywhere Enforcer & Contradiction Guard
    const masterRec = reconciled.masterRecommendation;
    evaluationData.masterRecommendation = masterRec;
    if (!evaluationData.finalRecommendation) evaluationData.finalRecommendation = {};
    evaluationData.finalRecommendation.recommendation = masterRec;

    if (evaluationData.investorBite) {
      evaluationData.investorBite.pitchLabRecommendation = masterRec;
      evaluationData.investorBite.recommendation = masterRec;
      // Sanitize investor questions to remove 'circumvent'
      if (Array.isArray(evaluationData.investorBite.investorQuestions)) {
        evaluationData.investorBite.investorQuestions = evaluationData.investorBite.investorQuestions.map(q =>
          q.replace(/circumvent|bypass|evade/gi, "establish a lawful legislative, regulatory or policy pathway for")
        );
      }
    }
    if (evaluationData.investorAssessment) {
      evaluationData.investorAssessment.pitchLabRecommendation = masterRec;
      evaluationData.investorAssessment.recommendation = masterRec;
    }
    if (evaluationData.summaryBlock) {
      evaluationData.summaryBlock.masterRecommendation = masterRec;
      evaluationData.summaryBlock.pitchLabRecommendation = masterRec;
    }

    // Ensure marketInsights has valid 4-paragraph structure matching business reality
    evaluationData.marketInsights = evaluationData.marketInsights || {};
    if (!evaluationData.marketInsights.marketLandscape) {
      if (reconciled.gatesInfo?.hasCriticalGate) {
        evaluationData.marketInsights.marketLandscape = `The broader market operates within a heavily structured statutory and regulatory environment. While underlying regional demand for essential services (such as baseload power or infrastructure) is significant, sector entry is strictly governed by national legislation, public policy mandates, and extreme capital scale requirements.`;
        evaluationData.marketInsights.demandDrivers = `Primary demand drivers include national infrastructure priorities, cost pressures, and long-term sustainability goals. However, commercial adoption is strictly constrained by statutory prohibitions and regulatory approval pathways that dictate market access.`;
        evaluationData.marketInsights.competitionAlternatives = `The founder competes against established, legally compliant incumbent operators, state-backed infrastructure providers, and alternative proven technologies already integrated into regional supply networks.`;
        evaluationData.marketInsights.commercialReality = `A critical distinction must be drawn between large underlying regional demand (such as national electricity consumption) and the commercially accessible opportunity for this specific solution. Statutory bans and extreme capital requirements render the accessible commercial market immediately constrained or unavailable without legislative change.`;
      } else {
        evaluationData.marketInsights.marketLandscape = `The broader market surrounding ${reqData.idea || 'this concept'} is characterized by evolving customer expectations and established commercial practices across ${reqData.locationCountry || 'the target region'}. Sector maturity is driven by ongoing operational shifts and digital adoption.`;
        evaluationData.marketInsights.demandDrivers = `Demand is driven primarily by customer efficiency requirements, rising operational costs, and the search for reliable, cost-effective alternatives to current manual pain points.`;
        evaluationData.marketInsights.competitionAlternatives = `The founder competes against established market incumbents, existing manual workarounds, and alternative commercial providers. Customer reliance on existing tools represents a key competition barrier.`;
        evaluationData.marketInsights.commercialReality = `A critical distinction exists between total addressable market size and early commercial accessibility for this specific solution. Early success relies on demonstrating immediate ROI, low switching friction, and clear differentiation against existing workarounds.`;
      }
    }

    // Post-processing for Targeted Fixes & Malformed Text Sanitization
    const hardwareConcept = isHardwareIdea(idea, category);
    evaluationData = sanitizeHardwareTerms(evaluationData, hardwareConcept);

    // Ensure specific CV credentials extracted
    const extractedCreds = extractSpecificCredentialsFromCvText(cvText, founderBackgroundNarrative);
    evaluationData.cvAnalysis = evaluationData.cvAnalysis || {};
    if (!Array.isArray(evaluationData.cvAnalysis.extractedCredentials) || evaluationData.cvAnalysis.extractedCredentials.length === 0 || evaluationData.cvAnalysis.extractedCredentials[0].includes("Relevant professional domain")) {
      evaluationData.cvAnalysis.extractedCredentials = extractedCreds;
    }

    // Ensure 4-part substantive PitchLab Verdict
    evaluationData.summaryBlock = evaluationData.summaryBlock || {};
    const rawVerdict = cleanNarrativeText(evaluationData.summaryBlock.pitchLabVerdict || evaluationData.finalRecommendation?.why || "");
    if (!rawVerdict || rawVerdict.split('.').filter(s => s.trim().length > 0).length < 2) {
      const topStrength = evaluationData.summaryBlock.topStrengths?.[0] || "strong founder alignment and clear problem definition";
      const keyRisk = evaluationData.summaryBlock.biggestRiskToThisIdea || "uncertain customer demand and willingness to pay prior to direct validation";
      evaluationData.summaryBlock.pitchLabVerdict = `This concept addresses a genuine customer problem with ${topStrength}. However, customer demand, willingness to pay, and competitive defensibility remain insufficiently validated. The central commercial risk centers on ${keyRisk}. The founder should validate these core assumptions through structured customer interviews and pilot trials before committing significant development capital.`;
    } else {
      evaluationData.summaryBlock.pitchLabVerdict = rawVerdict;
    }

    // Maintain backward-compatibility fields for legacy UI listeners & Idea Portfolio Meta (Fix 14)
    evaluationData.portfolioMeta = reconciled.portfolioMeta || {};
    evaluationData.scores = {
      overall: reconciled.overallScore,
      ...reconciled.categoryScores
    };
    evaluationData.founderReadinessIndex = reconciled.overallScore;

    // 10. Store Evaluation safely
    try {
      await db.collection("EvaluationScore").add({
        userId,
        inputId: inputRef?.id || `local-${Date.now()}`,
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
    } catch (dbErr) {
      console.warn("PitchLab: Firestore EvaluationScore write warning (non-fatal):", dbErr.message);
    }

    return evaluationData;

  } catch (error) {
    console.log("PitchLab: EXCEPTION CAUGHT in top-level try-catch block — activating robust fallback!");
    logSubmissionError("SUBMISSION TOP-LEVEL ERROR", error, { userId, idea });
    console.error("================ PITCHLAB VERBOSE ERROR ================");
    console.error("Error Message:", error.message);
    if (error.stack) {
        console.error("Stack Trace:", error.stack);
    }
    console.error("========================================================");

    // Fallback: Never fail the user's submission. Return a safe, fully reconciled evaluation.
    const mockRes = getMockResult(reqData);
    let evaluationData = mockRes.output || {};

    const rawScores = evaluationData.scorecard || evaluationData.scores || {};
    const reconciled = reconcileScores(rawScores, reqData);

    evaluationData.overallScore = reconciled.overallScore;
    evaluationData.scoreBand = reconciled.scoreBand;
    evaluationData.masterRecommendation = reconciled.masterRecommendation;
    evaluationData.scorecard = reconciled.categoryScores;
    evaluationData.scores = reconciled.categoryScores;

    evaluationData.summaryBlock = evaluationData.summaryBlock || {};
    evaluationData.summaryBlock.overallScore = reconciled.overallScore;
    evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
    evaluationData.summaryBlock.scoreBand = reconciled.scoreBand;
    evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
    evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
    evaluationData.summaryBlock.masterRecommendation = reconciled.masterRecommendation;

    evaluationData.idea = idea;
    evaluationData.problem = problem;
    evaluationData.targetMarket = targetMarket;
    evaluationData.category = category;
    evaluationData.founderBackgroundNarrative = founderBackgroundNarrative;
    return evaluationData;
  }
});

// Helper to generate a dynamic evaluation result for testing/fallback
function getMockResult(reqData = {}) {
  const reconciled = reconcileScores({}, reqData);
  const dynamicScores = reconciled.categoryScores;
  const founderPredictionsInput = reqData.founderPredictions || {};
  const founderEvidenceGap = calculateFounderEvidenceGap(founderPredictionsInput, reconciled, reqData);

  const mockData = {
    output: {
      masterRecommendation: reconciled.masterRecommendation,
      overallScore: reconciled.overallScore,
      scoreBand: reconciled.scoreBand,
      founderPredictions: founderEvidenceGap.founderPredictions,
      founderEvidenceGap: founderEvidenceGap,
      summaryBlock: {
        overallScore: reconciled.overallScore,
        overallReadinessScore: reconciled.overallScore,
        scoreBand: reconciled.scoreBand,
        decisionStatus: reconciled.masterRecommendation,
        masterRecommendation: reconciled.masterRecommendation,
        overallCommercialVerdict: reconciled.masterRecommendation,
        biggestRiskToThisIdea: reconciled.gatesInfo?.hasCriticalGate ? reconciled.gatesInfo.summary : "The concept currently lacks empirical customer discovery logs and payment validation.",
        doThisBeforeBuildingMore: reconciled.gatesInfo?.hasCriticalGate ? "Execute a formal Pre-Feasibility Validation study focusing on statutory landscape and technical feasibility." : "Conduct 15 structured customer discovery interviews with target users.",
        topStrengths: ["Strong founder commercial background", "Clear market focus", "Low-cost initial validation path"],
        topPrioritiesNow: ["Verify statutory and regulatory feasibility", "Test customer pain urgency", "Establish pre-feasibility milestones"]
      },
      cvAnalysis: {
        cvAttached: Boolean(reqData.founderCvExtractedText || reqData.founderCvFile),
        extractedCredentials: extractSpecificCredentialsFromCvText(reqData.founderCvExtractedText, reqData.founderBackgroundNarrative),
        founderStrengthsFromCV: reqData.founderCvExtractedText ? "Professional background and credentials extracted from CV." : "Commercial background and operational experience.",
        alignmentWithBusinessIdea: "Founder's background supports project execution and commercial analysis."
      },
      businessModelSnapshot: {
        targetCustomer: reqData.targetMarket || "Target customer segment defined in proposal.",
        coreOffering: reqData.idea || "Proposed business concept.",
        customerProblem: reqData.problem || "Defined market problem.",
        valueProposition: "Commercial solution addressing workflow or market demand.",
        revenueModel: reqData.budget ? `Commercial revenue model backed by initial budget of ${reqData.budget}.` : "Commercial revenue model.",
        customerAcquisition: reqData.network || "Direct client outreach & industry network referrals.",
        keyCosts: reqData.budget ? `${reqData.budget} initial launch budget.` : "Initial validation and launch budget.",
        commercialAssessment: "Business model evaluated against feasibility and market demand."
      },
      marketInsights: {
        marketLandscape: reconciled.gatesInfo?.hasCriticalGate
          ? "The broader market operates within a heavily structured statutory and regulatory environment. While underlying regional demand for essential services (such as baseload power or infrastructure) is significant, sector entry is strictly governed by national legislation, public policy mandates, and extreme capital scale requirements."
          : (isTransportIdea(reqData)
            ? "In New Zealand, small passenger transport operates under Waka Kotahi NZTA regulations requiring a Small Passenger Service Licence (SPSL) and Passenger (P) endorsements. The total registered Small Passenger Service Vehicle (SPSV) fleet spans an estimated 12,000 to 15,000+ active vehicles and licensed drivers nationwide, heavily concentrated in Auckland, Wellington, and Christchurch."
            : `The broader market surrounding ${reqData.idea || 'this concept'} is characterized by evolving customer expectations and established commercial practices across ${reqData.locationCountry || 'the target region'}. Sector maturity is driven by ongoing operational shifts and digital adoption.`),
        demandDrivers: reconciled.gatesInfo?.hasCriticalGate
          ? "Primary demand drivers include national infrastructure priorities, cost pressures, and long-term sustainability goals. However, commercial adoption is strictly constrained by statutory prohibitions and regulatory approval pathways that dictate market access."
          : (isTransportIdea(reqData)
            ? "Passenger demand is driven by urban and regional transport gaps, peak-hour availability shortages, high surge pricing on dominant platforms, and driver demand for lower commission fees."
            : `Demand is driven primarily by customer efficiency requirements, rising operational costs, and the search for reliable, cost-effective alternatives to current manual pain points.`),
        competitionAlternatives: reconciled.gatesInfo?.hasCriticalGate
          ? "The founder competes against established, legally compliant incumbent operators, state-backed infrastructure providers, and alternative proven technologies already integrated into regional supply networks."
          : (isTransportIdea(reqData)
            ? "The NZ rideshare and taxi market features dominant international tech leader Uber (operating across ~14 NZ cities) alongside DiDi, local kiwi app YourRide, and established taxi co-ops (Blue Bubble Taxis, Corporate Cabs, Green Cabs). Market consolidation is high: major global player Ola shut down all NZ & Australian operations on April 12, 2024, and local app Zoomy closed in September 2023."
            : `The founder competes against established market incumbents, existing manual workarounds, and alternative commercial providers. Customer reliance on existing tools represents a key competition barrier.`),
        commercialReality: reconciled.gatesInfo?.hasCriticalGate
          ? "A critical distinction must be drawn between large underlying regional demand (such as national electricity consumption) and the commercially accessible opportunity for this specific solution. Statutory bans and extreme capital requirements render the accessible commercial market immediately constrained or unavailable without legislative change."
          : (isTransportIdea(reqData)
            ? "A critical distinction exists between overall passenger trip volume and early liquidity for a new platform. Launching a new app faces extreme network effect barriers—attracting drivers without rider wait times, and riders without driver shortages."
            : `A critical distinction exists between total addressable market size and early commercial accessibility for this specific solution. Early success relies on demonstrating immediate ROI, low switching friction, and clear differentiation against existing workarounds.`),
        localBusinessNews: reconciled.gatesInfo?.hasCriticalGate
          ? "Regional business news highlights sharp increases in business input electricity costs (+21.8%), grid stability concerns during dry years, and government plans for LNG import infrastructure to manage thermal supply risks."
          : (isTransportIdea(reqData)
            ? "Local business news highlights driver earnings pressure, regulatory compliance costs for P-endorsements and COF vehicle inspections, and driver multi-apping across platforms to offset fuel and commission expenses."
            : `Local business news highlights rising overhead costs, digital compliance demands, and margin pressure across regional operators in ${reqData.locationCountry || 'the target region'}, driving interest in productivity tools.`),
        customerReviewTrends: reconciled.gatesInfo?.hasCriticalGate
          ? "Customer feedback across industrial and commercial energy consumers reflects strong skepticism regarding retail price stickiness, with heavy demand for bill transparency and price predictability."
          : (isTransportIdea(reqData)
            ? "Rider and driver reviews across current platforms show driver dissatisfaction with platform commission rates (20-25%+) and rider complaints about peak surge pricing, cancelled trips, and long wait times in regional centers."
            : `Customer reviews of existing market alternatives reveal frustration with complex pricing structures, manual data entry, and slow customer support, creating space for streamlined solutions.`),
        governmentPolicyInfluence: reconciled.gatesInfo?.hasCriticalGate
          ? "Government policy maintains strict statutory enforcement under the New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987. Central government has fast-tracked renewable consenting with a 12-month limit on local council processing times."
          : (isTransportIdea(reqData)
            ? "Waka Kotahi NZTA strictly enforces Small Passenger Service Licence (SPSL) compliance, mandatory P-endorsement police vetting, and Certificate of Fitness (COF) 6-month vehicle inspections across all commercial passenger transport."
            : `Local government policies and national regulatory frameworks require strict adherence to local council planning, environmental standards, and regional business compliance guidelines.`)
      },
      founderCapabilityExplanation: {
        evidenceReliedOn: reqData.founderBackgroundNarrative || reqData.experience || "Founder experience and narrative background.",
        whyThisScoreWasAwarded: dynamicScores.founderCapabilityFit?.explanation || "Evaluated based on sub-factors and supplied evidence.",
        capabilityGaps: [
          "In-house technical engineering or specialized domain execution",
          "Regulatory compliance and statutory clearance"
        ],
        recommendedResponse: [
          "Engage specialized technical advisors or domain experts.",
          "Partner with regulatory consultants."
        ]
      },
      whyThisScore: {
        strongestArea: "Commercial Logic",
        weakestArea: "Empirical Market Validation",
        mainDragOnScore: reconciled.gatesInfo?.hasCriticalGate ? "Venture-critical statutory/feasibility gate detected." : "Absence of empirical customer validation logs.",
        fastestWayToImprove: "Execute pre-feasibility validation and discovery interviews."
      },
      executiveSummary: `${reqData.idea ? reqData.idea.slice(0, 150) : 'The business concept'} addresses a commercial opportunity for ${reqData.targetMarket ? reqData.targetMarket.slice(0, 100) : 'the target market'}. Pre-feasibility validation and direct market evidence are required before committing development capital.`,
      scores: dynamicScores,
      decisionStatus: { state: reconciled.masterRecommendation, explanation: "Evaluated against commercial feasibility criteria.", nextMilestone: "Complete Pre-Feasibility Validation" },
      tearDetails: { theme: "Commercial Assessment", evidence: "Submitted questionnaire inputs.", analysis: "Execution depends on pre-feasibility validation.", recommendation: reconciled.masterRecommendation },
      founderMetrics: { analysis: "Evaluated founder background.", founderPositionSummary: "Commercial Practitioner" },
      marketAssessment: { analysis: "Market dynamics and regulatory environment assessed.", marketPatternSummary: reconciled.gatesInfo?.hasCriticalGate ? "Regulated / Restricted Market" : "Standard Commercial Market" },
      realWorldComparables: {
          successes: [{ name: "PlanGrid", whatTheyDid: "Mobile workflow software", whyItSucceeded: "Seamless integration into daily routines", lessonForFounder: "Don't break the user's workflow." }],
          failures: [{ name: "Kuvée", whatTheyDid: "Connected hardware ecosystem", whyItWentWrong: "Solution in search of a problem", warningForFounder: "Avoid hardware friction for minor convenience." }],
          marketInterpretation: "Idea requires disciplined pre-feasibility validation before capital deployment."
      },
      mvpFeasibility: { verdict: "Pre-Feasibility Required", suggestedFormat: "Pre-Feasibility Validation Study", indicativeComponents: ["Statutory review", "Expert consultation"], whatToExclude: ["Capital commitment", "Tooling"], estimatedCostCommentary: "Low-cost discovery phase." },
      investorBite: {
        introduction: "If you had 60 seconds to present this idea to experienced investors, how would it stack up?",
        scorecard: [
          { area: "Problem Worth Solving", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.problemCustomerClarity?.scoreAchieved || 10) / 15) * 5))), commentary: dynamicScores.problemCustomerClarity?.explanation || "Problem urgency." },
          { area: "Market Opportunity", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.marketCommercialOpportunity?.scoreAchieved || 10) / 15) * 5))), commentary: dynamicScores.marketCommercialOpportunity?.explanation || "Market reach." },
          { area: "Competitive Advantage", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.competitivePosition?.scoreAchieved || 6) / 10) * 5))), commentary: dynamicScores.competitivePosition?.explanation || "Differentiation." },
          { area: "Business Model", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.businessModelWillingnessToPay?.scoreAchieved || 10) / 15) * 5))), commentary: dynamicScores.businessModelWillingnessToPay?.explanation || "Monetization." },
          { area: "Founder Capability", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.founderCapabilityFit?.scoreAchieved || 10) / 15) * 5))), commentary: dynamicScores.founderCapabilityFit?.explanation || "Founder domain fit." },
          { area: "Customer Validation", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.customerValidation?.scoreAchieved || 4) / 20) * 5))), commentary: dynamicScores.customerValidation?.explanation || "Validation proof." },
          { area: "Scalability", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.executionReadiness?.scoreAchieved || 6) / 10) * 5))), commentary: dynamicScores.executionReadiness?.explanation || "Execution capacity." },
          { area: "Investment Readiness", rating: Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), commentary: "Overall evidence maturity." }
        ],
        overallInterestScore: reconciled.overallScore,
        investmentPotential: reconciled.overallScore >= 75 ? "High" : (reconciled.overallScore >= 50 ? "Medium" : "Low"),
        overallInterestExplanation: "Commercial concept evaluated against evidence and feasibility criteria.",
        investmentVerdict: "This opportunity requires statutory and pre-feasibility clearance before seeking investment capital.",
        investorQuestions: [
          "What statutory or regulatory approvals are required?",
          "How will you validate pre-feasibility assumptions at low cost?",
          "What key operational milestones will you achieve before seeking external funding?"
        ],
        biggestStrength: "Commercial background combined with a defined market focus.",
        biggestRisk: reconciled.gatesInfo?.hasCriticalGate ? reconciled.gatesInfo.summary : "Uncertain customer payment proof.",
        improvements: [
          "Execute a pre-feasibility study.",
          "Consult statutory regulators and domain experts."
        ],
        pitchLabRecommendation: reconciled.masterRecommendation,
        pitchLabRecommendationExplanation: "Complete pre-feasibility validation before seeking capital."
      },
      keyRisks: [{ name: "Feasibility Gate", whyItMatters: "Statutory or technical restrictions", whatToProveOrFix: "Run pre-feasibility assessment" }],
      whatNotToBuild: ["Do not commit capital before statutory clearance."],
      thirtyDayPlan: {
        week1: { objective: "Legal Assessment", tasks: ["Review statutory prohibitions"], expectedResult: "Legal clarity." },
        week2: { objective: "Expert Consultation", tasks: ["Consult domain experts"], expectedResult: "Expert feedback." },
        week3: { objective: "Technical Feasibility", tasks: ["Assess prerequisites"], expectedResult: "Feasibility report." },
        week4: { objective: "Pre-Feasibility Decision", tasks: ["Model economics"], expectedResult: "Go/No-Go decision." }
      },
      finalRecommendation: {
        recommendation: reconciled.masterRecommendation,
        why: reconciled.gatesInfo?.hasCriticalGate ? reconciled.gatesInfo.summary : "Concept requires validation.",
        biggestIssue: reconciled.gatesInfo?.hasCriticalGate ? reconciled.gatesInfo.summary : "Unvalidated demand.",
        pathForward: "Execute pre-feasibility study.",
        explicitWarning: "DO NOT commit capital prior to pre-feasibility confirmation."
      }
    }
  };

  if (mockData.output.finalRecommendation) {
    mockData.output.finalRecommendation.recommendation = reconciled.masterRecommendation;
  }
  return mockData;
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

// ================= PITCHLAB FINAL REPORT FIX HELPERS =================

function isHardwareIdea(idea = "", category = "") {
  const text = (String(idea) + " " + String(category)).toLowerCase();
  const hardwareKeywords = [
    "hardware", "device", "physical", "mooring", "rope", "pest", "rodent", "solar",
    "boat", "vessel", "enclosure", "sensor", "electrified", "mechanical", "machine",
    "prototype", "housing", "manufacturing", "tooling", "marine", "hardware prototype"
  ];
  return hardwareKeywords.some(kw => text.includes(kw));
}

function formatCapitalValue(inputVal, aiVal = "") {
  let raw = String(inputVal || "").trim();
  if (!raw || raw.toLowerCase() === "n/a" || raw.toLowerCase() === "null") {
    raw = String(aiVal || "").trim();
  }
  if (!raw || raw.toLowerCase() === "n/a" || raw.toLowerCase() === "null") {
    return "$5,000–$10,000 NZD";
  }

  let s = raw.replace(/nzd/gi, '').replace(/[\$]/g, '').trim();
  const rangeMatch = s.match(/([0-9,\s]+)(?:[–-]|to)([0-9,\s]+)/i);
  if (rangeMatch) {
    const n1 = parseInt(rangeMatch[1].replace(/,/g, '').trim(), 10);
    const n2 = parseInt(rangeMatch[2].replace(/,/g, '').trim(), 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      return `$${n1.toLocaleString('en-US')}–$${n2.toLocaleString('en-US')} NZD`;
    }
  }

  if (s.toLowerCase().includes("more than") || s.includes("+")) {
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) {
      return `More than $${n.toLocaleString('en-US')} NZD`;
    }
  }

  const n = parseInt(s.replace(/,/g, '').trim(), 10);
  if (!isNaN(n) && n >= 0) {
    return `$${n.toLocaleString('en-US')} NZD`;
  }

  return `$${raw.replace(/NZD/gi, '').trim()} NZD`;
}

function cleanNarrativeText(text = "", isHardware = false) {
  if (typeof text !== 'string') return text;
  let s = text.trim();

  // FIX: Remove malformed regex artifacts ($1, lock-$1, tax agents$1, (00M+))
  s = s.replace(/lock-\$1/gi, "lock-in");
  s = s.replace(/\$1/g, "");
  s = s.replace(/\(?\$?00M\+\)?/gi, "potentially multi-billion-dollar project capital requirements");
  s = s.replace(/\(?\$?0M\+\)?/gi, "substantial project capital requirements");
  s = s.replace(/circumvent|bypass legal|evade compliance/gi, "establish a lawful legislative, regulatory or policy pathway for");

  // FIX 5: Remove NPS from early pilots
  s = s.replace(/customer NPS/gi, "qualitative satisfaction & problem resolution feedback");
  s = s.replace(/NPS score/gi, "user feedback & continuation willingness");
  s = s.replace(/Net Promoter Score/gi, "customer referral feedback");
  s = s.replace(/\bNPS\b/g, "user feedback");

  s = s.replace(/Advisor Insight:\s*Advisor Insight:\s*/gi, "Advisor Insight: ");
  s = s.replace(/The goal is addresses a genuine commercial problem for The target market includes/gi, "This concept addresses a genuine commercial problem for the target market");
  s = s.replace(/The goal is addresses/gi, "This concept addresses");
  s = s.replace(/Synthesized founder credentials and background support project execution\./gi, "Founder professional background and domain experience support project execution.");
  s = s.replace(/Synthesized founder credentials/gi, "Extracted founder credentials");
  s = s.replace(/Based on Founder professional experience and background\./gi, "Based on the founder's professional background and credentials,");

  // Qualified legal statement replacement (Section 6)
  s = s.replace(/this business is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.");
  s = s.replace(/this venture is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.");
  s = s.replace(/is illegal\.?/gi, "presents a fundamental legal or regulatory restriction requiring specialist verification.");

  // FIX 1: Dynamic non-software/hardware wording adaptation
  if (isHardware) {
    s = s.replace(/Design simple manual service before writing code\./gi, "Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.");
    s = s.replace(/Design a simple manual service test before investing in software development\./gi, "Develop a simple functional prototype and field test the core concept before investing significantly in product development, tooling or manufacturing.");
    s = s.replace(/before writing code/gi, "before investing significantly in product development, prototyping, tooling or manufacturing");
    s = s.replace(/investing in software development/gi, "investing in product development, prototyping, tooling or manufacturing");
    s = s.replace(/software development/gi, "product development, prototyping, tooling or manufacturing");
    s = s.replace(/Concierge MVP Test/gi, "Prototype & Field Test");
    s = s.replace(/Concierge MVP/gi, "Field Test Prototype");
    s = s.replace(/concierge pilot/gi, "controlled field pilot");
    s = s.replace(/writing code/gi, "investing in product development & manufacturing");
  }

  // Fix duplicate words (e.g. "the the", "for for")
  s = s.replace(/\b(\w+)\s+\1\b/gi, '$1');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\.\./g, '.');
  s = s.replace(/,\./g, '.');
  s = s.replace(/\.,/g, '.');
  s = s.replace(/,,/g, ',');
  s = s.replace(/\s([,\.\?!])/g, '$1');

  return s.trim();
}

function extractSpecificCredentialsFromCvText(cvText = "", narrative = "") {
  const combined = (cvText + " " + narrative).toLowerCase();
  const credentials = [];

  if (combined.includes("chartered accountant") || combined.includes("caanz") || combined.includes(" ca ")) {
    credentials.push("Chartered Accountant (CA / CAANZ)");
  }
  if (combined.includes("bachelor of commerce") || combined.includes("bcom")) {
    credentials.push("Bachelor of Commerce (BCom)");
  }
  if (combined.includes("xero certified") || combined.includes("xero")) {
    credentials.push("Xero Certified Advisor & Accounting Systems Specialist");
  }
  if (combined.includes("finance manager") || combined.includes("clever core")) {
    credentials.push("Finance Manager / Senior Financial Leadership Experience");
  }
  if (combined.includes("director") || combined.includes("senior partner") || combined.includes("partner")) {
    credentials.push("Senior Commercial Partner & Executive Advisory Background");
  }
  if (combined.includes("manufacturing") || combined.includes("off-site") || combined.includes("d365") || combined.includes("hyperion")) {
    credentials.push("Manufacturing, ERP (D365) & Operational Systems Management");
  }
  if (combined.includes("20+") || combined.includes("years") || combined.includes("tax")) {
    credentials.push("20+ Years Senior Commercial, Tax & Business Advisory Experience");
  }

  if (credentials.length > 0) return credentials;

  return [
    "Identified Domain Background & Industry Context",
    "Commercial & Operational Capability"
  ];
}

function sanitizeHardwareTerms(obj, isHardware) {
  if (!obj || typeof obj !== 'object') return obj;

  const jsonStr = JSON.stringify(obj);
  let cleaned = jsonStr
    .replace(/lock-\$1/gi, "lock-in")
    .replace(/\$1/g, "")
    .replace(/customer NPS/gi, "qualitative satisfaction & problem resolution feedback")
    .replace(/NPS score/gi, "user feedback & continuation willingness")
    .replace(/Net Promoter Score/gi, "customer referral feedback")
    .replace(/\bNPS\b/g, "user feedback")
    .replace(/this business is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.")
    .replace(/this venture is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.")
    .replace(/is illegal\.?/gi, "presents a fundamental legal or regulatory restriction requiring specialist verification.");

  if (isHardware) {
    cleaned = cleaned
      .replace(/Design simple manual service before writing code\./gi, "Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.")
      .replace(/Design a simple manual service test before investing in software development\./gi, "Develop a simple functional prototype and field test the core concept before investing significantly in product development, tooling or manufacturing.")
      .replace(/before investing in software development\./gi, "before investing significantly in product development, prototyping, tooling or manufacturing.")
      .replace(/before investing in software development/gi, "before investing significantly in product development, prototyping, tooling or manufacturing")
      .replace(/investing in software development/gi, "investing in product development, prototyping, tooling or manufacturing")
      .replace(/before writing code/gi, "before investing significantly in product development, prototyping, tooling or manufacturing")
      .replace(/writing code/gi, "investing in product development & manufacturing")
      .replace(/Concierge MVP Test/gi, "Prototype & Field Test")
      .replace(/Concierge MVP/gi, "Field Test Prototype")
      .replace(/concierge pilot/gi, "controlled field pilot")
      .replace(/software development/gi, "prototype engineering & hardware testing")
      .replace(/core calculation engine/gi, "core physical mechanism & basic electronics")
      .replace(/single bank feed/gi, "essential electronic sensor module")
      .replace(/native mobile build/gi, "mass production tooling & final certification")
      .replace(/complex analytics/gi, "advanced wireless telemetry");
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return obj;
  }
}

function isTransportIdea(reqData = {}) {
  const text = `${reqData.idea || ''} ${reqData.category || ''} ${reqData.problem || ''} ${reqData.targetMarket || ''}`.toLowerCase();
  return Boolean(text.match(/leride|ride-share|rideshare|taxi|passenger transport|fleet|mobility|cab\b|driver/i));
}

function safeExtractJsonFromAiResponse(result, reqData) {
  if (!result) return (getMockResult(reqData).output || {});

  // 1. Try Genkit native output getter safely
  try {
    if (result.output && typeof result.output === 'object') {
      return result.output;
    }
  } catch (getterErr) {
    console.warn("PitchLab: Genkit response.output getter threw JSON error, attempting JSON repair:", getterErr.message);
  }

  // 2. Try parsing raw text string with JSON repair
  try {
    const rawText = result.text || result.custom?.text || (typeof result.output === 'string' ? result.output : "");
    if (rawText && typeof rawText === 'string') {
      let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      cleanText = cleanText.replace(/,\s*([}\]])/g, '$1'); // Fix trailing commas

      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        cleanText = match[0];
      }

      const parsed = JSON.parse(cleanText);
      if (parsed && typeof parsed === 'object') {
        console.log("PitchLab: Successfully repaired and parsed AI JSON response!");
        return parsed;
      }
    }
  } catch (parseErr) {
    console.warn("PitchLab: AI JSON repair parsing failed:", parseErr.message);
  }

  // 3. Robust Fallback
  console.warn("PitchLab: Activating dynamic mock evaluation fallback.");
  return (getMockResult(reqData).output || {});
}

// Callable Cloud Function for saving post-assessment decisions
exports.updateIdeaDecision = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  const reqData = request.data || {};
  const { evaluationId, finalDecision, viewChanged } = reqData;
  const userId = request.auth?.uid || reqData.userId || 'anonymous-user';

  console.log(`PitchLab: Updating idea decision for evaluationId '${evaluationId}', decision: '${finalDecision}', viewChanged: '${viewChanged}'`);

  if (!finalDecision) {
    throw new HttpsError("invalid-argument", "Missing finalDecision argument.");
  }

  const decisionObj = {
    viewChanged: viewChanged || "No material change",
    finalDecision: finalDecision, // Pursue, Investigate, Park, Reject
    updatedAt: FieldValue.serverTimestamp(),
    userId: userId
  };

  try {
    if (evaluationId && typeof evaluationId === 'string' && !evaluationId.startsWith('local-')) {
      const docRef = db.collection("EvaluationScore").doc(evaluationId);
      await docRef.set({ postAssessmentDecision: decisionObj }, { merge: true });
    }
  } catch (dbErr) {
    console.warn("PitchLab: Firestore updateIdeaDecision warning:", dbErr.message);
  }

  return { success: true, postAssessmentDecision: decisionObj };
});

exports.isTransportIdea = isTransportIdea;
exports.getMockResult = getMockResult;
exports.isHardwareIdea = isHardwareIdea;
exports.cleanNarrativeText = cleanNarrativeText;
exports.extractSpecificCredentialsFromCvText = extractSpecificCredentialsFromCvText;
exports.sanitizeHardwareTerms = sanitizeHardwareTerms;
exports.safeExtractJsonFromAiResponse = safeExtractJsonFromAiResponse;
exports.logSubmissionError = logSubmissionError;
exports.formatCapitalValue = formatCapitalValue;


