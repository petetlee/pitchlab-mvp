const { getMockResult } = require('./index.js');
const { validateReportIntegrityGate } = require('./scoring_logic.js');

const smartTaxInput = {
  idea: "Smart Tax is a tax compliance tool that helps businesses automatically set aside GST and other tax obligations before the money is spent.",
  problem: "Small business owners accidentally spend tax money due to cash flow confusion.",
  targetMarket: "NZ Sole Traders & SMBs",
  category: "FinTech",
  investmentCommitment: "5000",
  timeCommitment: "0-5 hours/week",
  customerValidation: "None yet",
  founderExperience: "20+ years CA",
  industryExperience: "Accounting",
  founderMotivation: "Solve cash flow errors",
  biggestObstacle: "Customer switching inertia",
  businessStage: "Idea",
  fundingPreference: "Bootstrapped",
  successDefinition: "Sustainable SaaS"
};

console.log("==========================================================================");
console.log("🚀 RUNNING SMART TAX INTEGRITY & GROUNDING AUDIT SUITE");
console.log("==========================================================================");

const res = getMockResult(smartTaxInput).output;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Prevent invented product functionality
const coreOffering = res.businessModelSnapshot?.coreOffering || "";
assert(
  !coreOffering.toLowerCase().includes("tax compliance filing") &&
  !coreOffering.toLowerCase().includes("financial reporting software") &&
  !coreOffering.toLowerCase().includes("automated filing"),
  "1. Core Offering contains NO invented tax filing or financial reporting"
);
assert(
  coreOffering.toLowerCase().includes("set aside") || coreOffering.toLowerCase().includes("gst"),
  "1b. Core Offering is accurately grounded in founder tax set-aside concept"
);

// 2. Remove cross-industry / template contamination
const fullJson = JSON.stringify(res);
assert(
  !/\b(resource consents?|environmental standards?|fast-track approvals?|regional compliance mandates?|RMA|nuclear|smr|power plant)\b/i.test(fullJson),
  "2. ZERO cross-industry contamination (no RMA, environmental consenting, nuclear, or fast-track)"
);

// 3. Market insights idea-specific
const mi = res.marketInsights || {};
const miLandscape = mi.marketLandscape || "";
const miDrivers = mi.demandDrivers || "";
assert(
  !miLandscape.includes("operational cost pressures, efficiency needs, and changing customer expectations") &&
  !miDrivers.includes("operational cost pressures, efficiency needs, and changing customer expectations"),
  "3. Market Insights contains NO generic boilerplate"
);
assert(
  (miLandscape.toLowerCase().includes("tax") || miLandscape.toLowerCase().includes("gst") || miLandscape.toLowerCase().includes("ird") || miLandscape.toLowerCase().includes("accounting")),
  "3b. Market Insights is specific to NZ FinTech / GST / accounting"
);

// 4. Prevent unsupported founder attribute or customer demographic inference
assert(
  !/\b(m[aā]ori|pacifica|pasifika)\b/i.test(fullJson),
  "4. ZERO unsupported demographic inference (no Māori/Pacifica attribution)"
);

// 5. Eliminate unresolved template variables
assert(
  !/\$riskCapital/i.test(fullJson),
  "5. Zero $riskCapital template variable leakage"
);
assert(
  !/\$(\d+)\s*[-–]\s*,\s*(\d+)/i.test(fullJson),
  "5b. Zero broken number ranges like '$300 - ,500'"
);
assert(
  !/(\{\{[^}]+\}\}|\[object\s+Object\]|\bundefined\b|\bnull\b(?!\s*[:,\]\}]))/i.test(fullJson),
  "5c. Zero unresolved curly bracket variables or [object Object]"
);

// 6. Rebuild executive summary as coherent prose
const execSummary = res.executiveSummary || "";
assert(
  !execSummary.includes("targeting The target market includes") &&
  !execSummary.includes("focusing on Many small businesses") &&
  !execSummary.includes("The goal is addresses"),
  "6. Executive Summary has NO concatenated source fragments"
);
const paragraphs = execSummary.split("\n\n").filter(p => p.trim().length > 0);
assert(
  paragraphs.length >= 2,
  "6b. Executive Summary is structured in distinct coherent prose paragraphs"
);

// 7. Cross-report consistency engine
const actions = res.threePriorityActions || [];
const action1Outcome = actions[0]?.outcome || actions[0]?.explanation || "";
assert(
  !action1Outcome.includes("20-30") && !action1Outcome.includes("20–30"),
  "7. Immediate Phase 1 action does NOT demand 20-30 interviews in 7 days"
);
assert(
  action1Outcome.includes("5–10") || action1Outcome.includes("5 to 10") || action1Outcome.includes("10"),
  "7b. Immediate Phase 1 action focuses on realistic 5-10 initial discovery interviews"
);

// 8. Scoring & narrative consistency
assert(
  res.overallScore === 70,
  `8. Overall score is exactly 70 (got ${res.overallScore})`
);
assert(
  res.masterRecommendation === "INVESTIGATE",
  `8b. Master recommendation is INVESTIGATE (got ${res.masterRecommendation})`
);
const fc = res.scorecard?.founderCapabilityFit?.scoreAchieved || res.scores?.founderCapabilityFit?.scoreAchieved;
assert(
  fc === 15,
  `8c. Founder Capability Fit is 15/15 grounded in 20+ years CA (got ${fc}/15)`
);

// 9. Preserve 8-row Business Model Snapshot
const bm = res.businessModelSnapshot || {};
const bmRows = [
  "targetCustomer", "coreOffering", "customerProblem", "valueProposition",
  "revenueModel", "customerAcquisition", "keyCosts", "commercialAssessment"
];
const allBmPresent = bmRows.every(r => typeof bm[r] === "string" && bm[r].trim().length > 0);
assert(
  allBmPresent,
  "9. All 8 rows in Business Model Snapshot are present and non-empty"
);

// 10. Preserve 5-dimension Future Trends
const dims = res.futureTrends?.dimensions || {};
const dimKeys = ["demandTrend", "technologyTrend", "regulatoryTrend", "competitionTrend", "capitalTrend"];
const allDimsPresent = dimKeys.every(k => typeof dims[k] === "string" && dims[k].trim().length > 0);
assert(
  allDimsPresent,
  "10. All 5 dimensions in Future Trends are present and non-empty"
);

// 11. Final Report Integrity Gate
try {
  validateReportIntegrityGate(res, smartTaxInput);
  console.log("✅ PASS: 11. Full report passes validateReportIntegrityGate without throwing");
  passed++;
} catch (e) {
  console.error(`❌ FAIL: 11. Integrity gate failed: ${e.message}`);
  failed++;
}

console.log("==========================================================================");
console.log(`TOTAL PASSES: ${passed}`);
console.log(`TOTAL FAILURES: ${failed}`);
console.log("==========================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL SMART TAX INTEGRITY AUDIT CHECKS PASSED PERFECTLY!");
}
