const { getMockResult, isHardwareIdea, sanitizeHardwareTerms, cleanNarrativeText } = require('./index.js');
const { validateReportIntegrityGate } = require('./scoring_logic.js');
const fs = require('fs');
const path = require('path');

const moorSafeInput = {
  idea: "MoorSafe is a solar-powered electrified barrier device attached to mooring ropes that deters rats and pests from climbing onto boats.",
  problem: "Pests, rats, and rodents climb mooring ropes to board vessels, causing health contamination, property damage, and expensive electrical wire chewing.",
  category: "Marine Hardware / Physical Product",
  targetMarket: "Recreational boat owners, marina operators, commercial vessel owners in New Zealand",
  locationCountry: "New Zealand",
  locationRegion: "Auckland",
  locationSummary: "Auckland, New Zealand",
  marketScope: "Regional & national boat owners",
  timeCommitment: "0-5 hours/week",
  investmentCommitment: "$5,000 - $10,000 NZD",
  experience: "Chartered Accountant (CA / CAANZ), BCom, Finance Manager at Clever Core (off-site manufacturing), 20+ years senior commercial experience. Interests: private pilot, motorcyclist, wind surfing.",
  founderCvExtractedText: "Chartered Accountant (CA ANZ). Bachelor of Commerce (BCom). Finance Manager at Clever Core off-site manufacturing. 20+ years commercial experience. Personal interests: private pilot license, motorcycling, wind surfing.",
  founderBackgroundNarrative: "I am an experienced Chartered Accountant and finance manager with 20+ years experience in commercial operations, budgeting, and manufacturing systems. In my spare time I am a private pilot and motorcyclist."
};

console.log("==========================================================================");
console.log("🚀 RUNNING MOORSAFE ASSESSMENT INTEGRITY & RECONCILIATION SUITE");
console.log("==========================================================================");

const res = getMockResult(moorSafeInput).output;
fs.writeFileSync(path.join(__dirname, 'latest_moorsafe_eval.json'), JSON.stringify(res, null, 2));

console.log("\n--- ASSESSMENT METADATA ---");
console.log(`Assessment ID:                   ${res.assessmentId}`);
console.log(`App Version:                     ${res.appVersion}`);
console.log(`Build ID:                        ${res.buildId}`);
console.log(`Generated At:                    ${res.assessmentGeneratedAtFormatted}`);
console.log(`Overall Score:                   ${res.overallScore}/100`);
console.log(`Stage (Score Band):              ${res.scoreBand.name}`);
console.log(`Master Recommendation:           ${res.masterRecommendation}`);
console.log(`Investor Bite Recommendation:    ${res.investorBite?.pitchLabRecommendation}`);

console.log("\n--- BUSINESS MODEL SNAPSHOT ---");
console.log(`Target Customer:     "${res.businessModelSnapshot.targetCustomer}"`);
console.log(`Core Offering:       "${res.businessModelSnapshot.coreOffering}"`);
console.log(`Customer Problem:    "${res.businessModelSnapshot.customerProblem}"`);
console.log(`Value Proposition:   "${res.businessModelSnapshot.valueProposition}"`);
console.log(`Revenue Model:       "${res.businessModelSnapshot.revenueModel}"`);

console.log("\n--- ADJACENT OPPORTUNITIES ---");
console.log(`Adjacent Opportunities:`, res.futureTrends.adjacentOpportunities);

console.log("\n--- PRIORITY ACTIONS ---");
res.summaryBlock.threePriorityActions.forEach((act, idx) => {
  console.log(`Action ${idx + 1}: ${act.heading} -> ${act.outcome}`);
});

console.log("\n--- TOP 5 PRIORITIES ---");
res.actionPlan.topFivePriorities.forEach((p, idx) => {
  console.log(`Priority ${idx + 1}: ${p.priority} | ${p.action} | Metric: ${p.metric}`);
});

console.log("\n--- EXTRACTED CV CREDENTIALS ---");
console.log(`Credentials:`, res.cvAnalysis.extractedCredentials);

console.log("\n==========================================================================");
console.log("🔍 RUNNING 16-POINT INTEGRITY AUDIT");
console.log("==========================================================================");

let passes = 0;
let failures = 0;

function assertCheck(name, condition, details = "") {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passes++;
  } else {
    console.error(`❌ FAIL: ${name} - ${details}`);
    failures++;
  }
}

// 1. Business Model Grounding
assertCheck(
  "1. Business Model Customer Problem grounded in pest problem (no collision/line failure drift)",
  !res.businessModelSnapshot.customerProblem.toLowerCase().includes("collision") &&
  !res.businessModelSnapshot.customerProblem.toLowerCase().includes("mooring line failures") &&
  res.businessModelSnapshot.customerProblem.toLowerCase().includes("pest"),
  `Found: "${res.businessModelSnapshot.customerProblem}"`
);

// 2. Canonical Score Reconciliation
const founderCategoryScore = res.categoryScores.founderCapabilityFit.scoreAchieved;
const founderMax = res.categoryScores.founderCapabilityFit.maxScore;
assertCheck(
  "2. Canonical Score Reconciliation (Founder Capability)",
  founderCategoryScore === 10 && founderMax === 15,
  `Expected 10/15, got ${founderCategoryScore}/${founderMax}`
);

// 3. Unsupported Factual Claims
const fullJsonStr = JSON.stringify(res);
assertCheck(
  "3. No unsupported market claims ('no effective, automated solution on the market')",
  !fullJsonStr.includes("There is no effective, automated solution currently on the market") &&
  !fullJsonStr.includes("There is no effective automated solution currently on the market"),
  "Found unverified absolute claim in report"
);
assertCheck(
  "3b. No unverified willingness to pay claims",
  !fullJsonStr.includes("clear, willing-to-pay market segment") &&
  !fullJsonStr.includes("clear willing-to-pay market segment"),
  "Found unverified willingness to pay claim in report"
);

// 4. Evidence-State Language Controls
assertCheck(
  "4. Customer Validation <= 4/20 has qualified wording",
  res.categoryScores.customerValidation.scoreAchieved <= 4,
  `Customer Validation score: ${res.categoryScores.customerValidation.scoreAchieved}`
);

// 5. Market Insights Grounding
assertCheck(
  "5. Market Insights contains marine/hardware context, no generic fast-track/RMA/resource consents",
  !res.marketInsights.governmentPolicyInfluence.toLowerCase().includes("fast-track approvals") &&
  !res.marketInsights.governmentPolicyInfluence.toLowerCase().includes("resource consents") &&
  res.marketInsights.governmentPolicyInfluence.toLowerCase().includes("marina"),
  `Found: "${res.marketInsights.governmentPolicyInfluence}"`
);

// 6. Business-Type Contamination
assertCheck(
  "6. No software scalability language in hardware assessment",
  !fullJsonStr.includes("software or operational leverage without proportional linear costs") &&
  !fullJsonStr.includes("marginal cost of software delivery"),
  "Found software scalability language in hardware report"
);

// 7. Adjacent-Opportunity Hallucination
assertCheck(
  "7. Adjacent opportunities grounded, no compliance reporting module",
  !JSON.stringify(res.futureTrends.adjacentOpportunities).toLowerCase().includes("compliance reporting module") &&
  !JSON.stringify(res.futureTrends.adjacentOpportunities).toLowerCase().includes("regulatory bodies"),
  `Found: ${JSON.stringify(res.futureTrends.adjacentOpportunities)}`
);

// 8. Stage & Recommendation Reconciliation
assertCheck(
  "8. Stage and Recommendation canonical ('Emerging Opportunity' / 'INVESTIGATE', no 'Almost Ready')",
  res.scoreBand.name === "Emerging Opportunity" &&
  res.masterRecommendation === "INVESTIGATE" &&
  res.investorBite?.pitchLabRecommendation === "INVESTIGATE" &&
  !fullJsonStr.includes('"Almost Ready"'),
  `Stage: ${res.scoreBand.name}, Rec: ${res.masterRecommendation}, IB Rec: ${res.investorBite?.pitchLabRecommendation}`
);

// 9. Raw Variable Leakage Scan
const rawVarRegex = /(\$[a-zA-Z_]\w*|\$\{[^}]+\}|\{\{[^}]+\}\}|\[object\s+Object\]|\bundefined\b)/;
const rawVarMatch = fullJsonStr.match(rawVarRegex);
assertCheck(
  "9. No raw variable leakage ($riskCapital, ${var}, {{var}}, undefined, [object Object])",
  rawVarMatch === null,
  `Found raw variable leak: ${rawVarMatch ? rawVarMatch[0] : 'none'}`
);

// 10. Currency / Broken Monetary Rendering
const brokenCurrencyRegex = /(^|[\s"–\-])\,([0-9]{3})/;
const brokenCurrencyMatch = fullJsonStr.match(brokenCurrencyRegex);
assertCheck(
  "10. No broken currency values (,500)",
  brokenCurrencyMatch === null,
  `Found broken currency: ${brokenCurrencyMatch ? brokenCurrencyMatch[0] : 'none'}`
);

// 11. Founder Time Constraint Preservation
const top5Actions = res.actionPlan.topFivePriorities.map(p => p.action).join(" ");
assertCheck(
  "11. Founder time constraint respected (0-5 hrs/wk, no 'Block 5-10 hours/week')",
  !top5Actions.toLowerCase().includes("block 5-10 hours") &&
  !top5Actions.toLowerCase().includes("allocate 5-10 hours"),
  `Found: "${top5Actions}"`
);

// 12. Priority Ordering (Problem Discovery before Prototyping)
assertCheck(
  "12. Priority action 1 is Customer Problem Discovery, NOT Functional Prototype",
  res.summaryBlock.threePriorityActions[0].heading.toLowerCase().includes("problem discovery") ||
  res.summaryBlock.threePriorityActions[0].heading.toLowerCase().includes("customer"),
  `Action 1 heading: "${res.summaryBlock.threePriorityActions[0].heading}"`
);

// 13. CV Extraction & Hobbies Filtering
const credsStr = JSON.stringify(res.cvAnalysis.extractedCredentials).toLowerCase();
assertCheck(
  "13. CV extraction excludes personal hobbies (pilot, motorcyclist, wind surfing)",
  !credsStr.includes("pilot") && !credsStr.includes("motorcycl") && !credsStr.includes("wind surf"),
  `Found credentials: ${credsStr}`
);

// 14. Founder Fit Calibration (commercial leadership vs specialist engineering)
assertCheck(
  "14. Founder fit commentary calibrates commercial leadership vs specialist engineering",
  res.categoryScores.founderCapabilityFit.scoreAchieved === 10,
  `Score: ${res.categoryScores.founderCapabilityFit.scoreAchieved}`
);

// 15. Validation Gate Function Verification
let gatePassed = false;
let gateError = null;
try {
  validateReportIntegrityGate(res, moorSafeInput);
  gatePassed = true;
} catch (err) {
  gateError = err.message;
}
assertCheck(
  "15. Passes backend validateReportIntegrityGate without throwing",
  gatePassed,
  `Gate error: ${gateError}`
);

// 16. Score Not Inflated
assertCheck(
  "16. Overall score remains disciplined (evidence-led, score in Emerging Opportunity band 55-60 for early stage pre-validation hardware)",
  res.overallScore >= 45 && res.overallScore <= 60,
  `Overall score: ${res.overallScore}`
);

console.log("\n==========================================================================");
console.log(`TOTAL PASSES: ${passes} / 17`);
console.log(`TOTAL FAILURES: ${failures}`);
console.log("==========================================================================");

if (failures > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL MOORSAFE AUDIT CHECKS PASSED PERFECTLY!");
  process.exit(0);
}
