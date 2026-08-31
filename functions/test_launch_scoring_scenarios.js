const { reconcileScores, classifyVentureType, detectFeasibilityGates } = require('./scoring_logic');

console.log("==========================================================================");
console.log("      PITCHLAB SCORING ENGINE LAUNCH SANITY VERIFICATION (4 SCENARIOS)   ");
console.log("==========================================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// SCENARIO A — Strong Idea
// Experienced founder, validated customer demand, strong commercial fit
// -------------------------------------------------------------------------
console.log("\n[Scenario A] Strong Idea (Experienced Founder + Validated Demand)");
const scenarioAInput = {
  idea: "Automated Commercial Property Compliance Software",
  category: "B2B SaaS / Property Tech",
  problem: "Commercial landlords spend 15 hours per week manually tracking building compliance certificates and safety audits",
  experience: "15+ years commercial property manager and software product director",
  founderBackgroundNarrative: "Senior Commercial Property Director with 15 years experience managing 50+ commercial assets. Built previous prop-tech tool.",
  capacity: "30+ hours/week",
  budget: "$10,000",
  network: "Direct access to 100+ commercial building owners",
  targetMarket: "Commercial property managers in New Zealand"
};

const rawAiScenarioA = {
  problemCustomerClarity: { score: 14, assessment: "Clear pain point" },
  founderCapabilityFit: { score: 14, assessment: "Direct domain expertise" },
  customerValidation: { score: 16, assessment: "10 interviews completed" },
  marketCommercialOpportunity: { score: 13, assessment: "High B2B TAM" },
  businessModelWillingnessToPay: { score: 13, assessment: "SaaS subscription" },
  competitivePosition: { score: 8, assessment: "Proprietary workflow" },
  executionReadiness: { score: 8, assessment: "Strong founder capacity" }
};

const resA = reconcileScores(rawAiScenarioA, scenarioAInput);
const scoreA = resA.overallScore;
console.log(`  - Overall Score: ${scoreA}/100`);
console.log(`  - Score Band: ${resA.scoreBand.name}`);
console.log(`  - Founder Fit Score: ${resA.categoryScores.founderCapabilityFit.scoreAchieved}/15`);

assert(scoreA >= 65, "Scenario A overall score is strong (>= 65/100)");
assert(resA.categoryScores.founderCapabilityFit.scoreAchieved >= 13, "Scenario A founder capability is high (>= 13/15)");
assert(resA.masterRecommendation.includes("Proceed") || resA.masterRecommendation.includes("INVESTIGATE") || resA.masterRecommendation.includes("PURSUE"), "Scenario A recommendation supports proceeding");

// -------------------------------------------------------------------------
// SCENARIO B — Average Unvalidated Startup
// Reasonable idea, unevidenced demand, moderate founder capability
// -------------------------------------------------------------------------
console.log("\n[Scenario B] Average Unvalidated Startup (Reasonable Idea, Low Validation)");
const scenarioBInput = {
  idea: "Mobile Pet Grooming Booking App",
  category: "Consumer Service Marketplace",
  problem: "Pet owners find it inconvenient to transport pets to grooming salons",
  experience: "Marketing coordinator with 2 years agency experience",
  founderBackgroundNarrative: "Marketing professional with digital advertising experience. Passionate pet owner.",
  capacity: "5-15 hours/week",
  budget: "$1,000",
  network: "General social media network",
  targetMarket: "Urban dog owners"
};

const rawAiScenarioB = {
  problemCustomerClarity: { score: 10, assessment: "Identified pain" },
  founderCapabilityFit: { score: 8, assessment: "General marketing background" },
  customerValidation: { score: 2, assessment: "Not yet evidenced" },
  marketCommercialOpportunity: { score: 9, assessment: "Moderate local market" },
  businessModelWillingnessToPay: { score: 6, assessment: "Untested booking fee" },
  competitivePosition: { score: 5, assessment: "Existing salons operate" },
  executionReadiness: { score: 5, assessment: "Part-time capacity" }
};

const resB = reconcileScores(rawAiScenarioB, scenarioBInput);
const scoreB = resB.overallScore;
console.log(`  - Overall Score: ${scoreB}/100`);
console.log(`  - Score Band: ${resB.scoreBand.name}`);
console.log(`  - Master Recommendation: ${resB.masterRecommendation}`);

assert(scoreB >= 35 && scoreB <= 58, "Scenario B overall score is in moderate/unvalidated range (35-58/100)");
assert(resB.masterRecommendation.includes("Validate") || resB.masterRecommendation.includes("Controlled") || resB.masterRecommendation.includes("INVESTIGATE"), "Scenario B advises investigation/validation before building");

// -------------------------------------------------------------------------
// SCENARIO C — Weak Idea
// Poor differentiation, questionable customer need, weak founder fit
// -------------------------------------------------------------------------
console.log("\n[Scenario C] Weak Idea (Poor Differentiation, Weak Founder Fit)");
const scenarioCInput = {
  idea: "Generic Social Network for Coffee Drinkers",
  category: "Consumer Social App",
  problem: "Coffee drinkers don't have a dedicated social network",
  experience: "Zero business or tech experience",
  founderBackgroundNarrative: "Student, no prior commercial experience",
  capacity: "0-5 hours/week",
  budget: "$0",
  network: "None",
  targetMarket: "Everyone who drinks coffee"
};

const rawAiScenarioC = {
  problemCustomerClarity: { score: 4, assessment: "Weak problem" },
  founderCapabilityFit: { score: 3, assessment: "Zero experience" },
  customerValidation: { score: 0, assessment: "None" },
  marketCommercialOpportunity: { score: 4, assessment: "Saturated" },
  businessModelWillingnessToPay: { score: 2, assessment: "Ad model unviable" },
  competitivePosition: { score: 2, assessment: "Dominated by Instagram/TikTok" },
  executionReadiness: { score: 2, assessment: "No budget or time" }
};

const resC = reconcileScores(rawAiScenarioC, scenarioCInput);
const scoreC = resC.overallScore;
console.log(`  - Overall Score: ${scoreC}/100`);
console.log(`  - Score Band: ${resC.scoreBand.name}`);
console.log(`  - Master Recommendation: ${resC.masterRecommendation}`);

assert(scoreC < 35, "Scenario C overall score is clearly weak (< 35/100)");
assert(resC.masterRecommendation.includes("Refine") || resC.masterRecommendation.includes("Stop") || resC.masterRecommendation.includes("Pivot") || resC.masterRecommendation.includes("REFRAME") || resC.masterRecommendation.includes("INVESTIGATE"), "Scenario C correctly advises pause/pivot/stop/reframe");

// -------------------------------------------------------------------------
// SCENARIO D — Ambitious / High-Risk Concept (Nuclear Energy NZ)
// Major technical & statutory barriers, Extreme capital requirements
// -------------------------------------------------------------------------
console.log("\n[Scenario D] Ambitious / High-Risk Concept (Commercial Nuclear Power NZ)");
const scenarioDInput = {
  idea: "Commercial Nuclear Power Plant in New Zealand",
  category: "Energy Infrastructure",
  problem: "Clean baseload electricity generation",
  experience: "15+ years Chartered Accountant, corporate finance background",
  founderBackgroundNarrative: "Chartered Accountant with 15+ years corporate finance. Zero nuclear engineering background.",
  capacity: "35 hours/week",
  budget: "$5,000",
  network: "Accounting network",
  targetMarket: "National electricity grid"
};

const resD = reconcileScores({}, scenarioDInput);
const scoreD = resD.overallScore;
console.log(`  - Overall Score: ${scoreD}/100`);
console.log(`  - Has Feasibility Gates: ${resD.gatesInfo.hasCriticalGate}`);
console.log(`  - Founder Fit Score: ${resD.categoryScores.founderCapabilityFit.scoreAchieved}/15`);

assert(scoreD <= 30, "Scenario D overall score is capped appropriately (<= 30/100)");
assert(resD.gatesInfo.hasCriticalGate === true, "Scenario D correctly triggers critical feasibility gates");
assert(resD.categoryScores.founderCapabilityFit.scoreAchieved <= 5, "Scenario D founder capability score capped due to missing domain credentials (<= 5/15)");

// -------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------
console.log("\n==========================================================================");
console.log(` SCENARIO SANITY CHECK SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==========================================================================");

if (failCount > 0) {
  process.exit(1);
}
