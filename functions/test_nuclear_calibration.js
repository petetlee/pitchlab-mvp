process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();

const { reconcileScores, detectFeasibilityGates, classifyVentureType } = require("./scoring_logic");

console.log("===============================================================");
console.log("   PITCHLAB CALIBRATION TEST: NUCLEAR POWER PLANT IN NZ        ");
console.log("===============================================================");

const nuclearInput = {
  idea: "Nuclear Power Plant in New Zealand for clean baseload electricity generation",
  problem: "New Zealand energy grid needs reliable, low-carbon baseload electricity to replace coal/gas thermal generation during dry years.",
  targetMarket: "New Zealand Electricity Market & Industrial Power Consumers",
  category: "Energy & Infrastructure",
  investmentCommitment: "$5,000",
  timeCommitment: "15-30 hours/week",
  customerValidation: "0 potential customers",
  founderExperience: "Yes – still operating",
  industryExperience: "20+ years",
  founderBackgroundNarrative: "I am a Chartered Accountant (CA) with 25+ years senior commercial experience advising SMBs, managing budgets, leading projects, and analyzing corporate financial statements.",
  locationCountry: "New Zealand",
  locationSummary: "New Zealand",
  marketScope: "National customers"
};

// 1. Direct Unit Test of Scoring Logic
console.log("\n[1] Testing Deterministic Scoring Engine Calibration...");
const ventureType = classifyVentureType(nuclearInput);
const gates = detectFeasibilityGates(nuclearInput);

console.log(`- Internal Venture Type: ${ventureType}`);
console.log(`- Has Critical Feasibility Gates: ${gates.hasCriticalGate}`);
console.log(`- Detected Gates: ${gates.summary}`);

// Simulated raw AI scores where AI might have mistakenly given high TAM or general CV credit
const rawAiScores = {
  problemCustomerClarity: 12,
  founderCapabilityFit: 11, // High raw score based on impressive CA background
  customerValidation: 2,
  marketCommercialOpportunity: 14, // High raw score based on $10B NZ electricity TAM
  businessModelWillingnessToPay: 8,
  competitivePosition: 6,
  executionReadiness: 5
};

const reconciled = reconcileScores(rawAiScores, nuclearInput);

console.log("\n[2] Reconciled Category Scores:");
for (const [key, obj] of Object.entries(reconciled.categoryScores)) {
  console.log(`  * ${obj.label}: ${obj.scoreAchieved}/${obj.maxScore} (Evidence: ${obj.evidenceLevel})`);
  console.log(`    Explanation: ${obj.explanation}`);
}

console.log("\n[3] Overall Score & Master Recommendation:");
console.log(`  * Overall Commercial Readiness Score: ${reconciled.overallScore}/100`);
console.log(`  * Score Band: ${reconciled.scoreBand.name}`);
console.log(`  * Master Recommendation: ${reconciled.masterRecommendation}`);

// Assertion Checks
console.log("\n[4] Asserting Calibration Integrity Criteria:");

let pass = true;

if (reconciled.overallScore < 40) {
  console.log("  ✅ PASS: Overall score is materially lower than 54/100 (Score: " + reconciled.overallScore + "/100, Exploration Stage)");
} else {
  console.log("  ❌ FAIL: Overall score remains too high (" + reconciled.overallScore + "/100)");
  pass = false;
}

if (reconciled.categoryScores.founderCapabilityFit.scoreAchieved <= 6) {
  console.log("  ✅ PASS: Founder Capability & Fit correctly penalised for domain gap (Score: " + reconciled.categoryScores.founderCapabilityFit.scoreAchieved + "/15)");
} else {
  console.log("  ❌ FAIL: Founder Capability & Fit remains too high (" + reconciled.categoryScores.founderCapabilityFit.scoreAchieved + "/15)");
  pass = false;
}

if (reconciled.categoryScores.marketCommercialOpportunity.scoreAchieved <= 6) {
  console.log("  ✅ PASS: Market Opportunity correctly penalised for legal ban/accessibility barriers (Score: " + reconciled.categoryScores.marketCommercialOpportunity.scoreAchieved + "/15)");
} else {
  console.log("  ❌ FAIL: Market Opportunity remains too high (" + reconciled.categoryScores.marketCommercialOpportunity.scoreAchieved + "/15)");
  pass = false;
}

if (reconciled.masterRecommendation.startsWith("STOP") || reconciled.masterRecommendation === "Pause Pending Further Evidence" || reconciled.masterRecommendation === "Refine the Concept" || reconciled.masterRecommendation === "Stop Before Further Investment" || reconciled.masterRecommendation === "Pivot Toward a Stronger Opportunity") {
  console.log("  ✅ PASS: Master Recommendation correctly identifies feasibility gate (" + reconciled.masterRecommendation + ")");
} else {
  console.log("  ❌ FAIL: Master Recommendation is too optimistic (" + reconciled.masterRecommendation + ")");
  pass = false;
}

// 2. Regression Test: Smart Tax (CA Founder with Tax Software)
console.log("\n===============================================================");
console.log("   REGRESSION TEST: SMART TAX (CA FOUNDER + TAX SOFTWARE)      ");
console.log("===============================================================");

const taxInput = {
  idea: "Smart Tax - Automated tax compliance and GST set-aside app for Kiwi sole traders",
  problem: "Small business owners accidentally spend GST collected from customers as available cash, then struggle to pay IRD when due.",
  targetMarket: "NZ Sole Traders, SMBs & Tax Agents",
  category: "FinTech / SaaS",
  investmentCommitment: "$5,000",
  timeCommitment: "15-30 hours/week",
  customerValidation: "1-5 potential customers",
  founderExperience: "Yes – operating",
  industryExperience: "20+ years",
  founderBackgroundNarrative: "I am a Chartered Accountant (CA) with 25+ years experience advising SMBs on tax compliance and cash flow management.",
  locationCountry: "New Zealand",
  locationSummary: "New Zealand",
  marketScope: "National customers"
};

const taxRawAiScores = {
  problemCustomerClarity: 13,
  founderCapabilityFit: 14,
  customerValidation: 3,
  marketCommercialOpportunity: 13,
  businessModelWillingnessToPay: 10,
  competitivePosition: 8,
  executionReadiness: 7
};

const taxReconciled = reconcileScores(taxRawAiScores, taxInput);

console.log(`\n- Smart Tax Overall Score: ${taxReconciled.overallScore}/100`);
console.log(`- Smart Tax Founder Capability Score: ${taxReconciled.categoryScores.founderCapabilityFit.scoreAchieved}/15`);
console.log(`- Smart Tax Recommendation: ${taxReconciled.masterRecommendation}`);

if (taxReconciled.categoryScores.founderCapabilityFit.scoreAchieved >= 13) {
  console.log("  ✅ REGRESSION PASS: CA founder receiving high Founder Fit (14-15/15) for Tax software!");
} else {
  console.log("  ❌ REGRESSION FAIL: CA founder capability score downgraded for tax software!");
  pass = false;
}

if (taxReconciled.overallScore >= 65) {
  console.log("  ✅ REGRESSION PASS: Smart Tax overall score remains high potential (" + taxReconciled.overallScore + "/100)");
} else {
  console.log("  ❌ REGRESSION FAIL: Smart Tax overall score crushed unexpectedly!");
  pass = false;
}

if (pass) {
  console.log("\n🎉 ALL CALIBRATION & REGRESSION TESTS PASSED SUCCESSFULLY!");
} else {
  console.log("\n❌ SOME TESTS FAILED.");
}
