const { reconcileScores, SCORING_CONFIG, computeMasterRecommendation } = require('./scoring_logic');

console.log("=== PitchLab Master Corrective: Scoring Engine Verification Test ===");

// Test Case 1: Smart Tax Profile with Rich Text CA Background
const smartTaxInputs = {
  idea: "Automated GST and Tax set-aside solution for sole traders and small business owners.",
  problem: "Sole traders constantly get hit with unexpected GST and income tax bills at year-end because they spend tax funds on daily expenses.",
  budget: "$5,000 SaaS pilot",
  experience: "Qualifications & Background: Chartered Accountant with 20+ years experience in small business tax advisory. Experience: Yes – still operating. Industry expertise: 10+ years",
  capacity: "5-10 hours/week",
  network: "Access to sole trader client base",
  targetMarket: "Small business sole traders"
};

// Test Case 2: Dropdown-Only Profile (No free text, 10+ years industry experience selected)
const dropdownOnlyInputs = {
  idea: "Automated GST set-aside solution",
  problem: "Sole traders struggle with unexpected tax bills",
  budget: "$2,500-$5,000 NZD",
  experience: "Experience: Yes – still operating. Industry expertise: 10+ years",
  capacity: "10",
  network: "Access to mentors/early customers",
  targetMarket: "Sole traders and SMBs"
};

const aiRawScores = {
  problemCustomerClarity: { score: 80, evidenceLevel: "Partial Evidence", assessment: "Problem is clearly defined." },
  founderCapabilityFit: { score: 85, evidenceLevel: "Strong Evidence", assessment: "Founder has strong domain context." },
  customerValidation: { score: 2, evidenceLevel: "Not yet evidenced", assessment: "No customer interviews logged." },
  marketCommercialOpportunity: { score: 70, evidenceLevel: "Partial Evidence", assessment: "Identifiable target market." },
  businessModelWillingnessToPay: { score: 60, evidenceLevel: "Partial Evidence", assessment: "Monthly SaaS model proposed." },
  competitivePosition: { score: 70, evidenceLevel: "Partial Evidence", assessment: "Differentiation from generic software." },
  executionReadiness: { score: 60, evidenceLevel: "Partial Evidence", assessment: "Lean budget matches MVP strategy." }
};

console.log("\n--- TEST CASE 1: Rich Text CA Profile ---");
const reconciled1 = reconcileScores(aiRawScores, smartTaxInputs);
console.log("Total Score:", reconciled1.overallScore, "/ 100");
console.log("Founder Capability & Fit Score:", reconciled1.categoryScores.founderCapabilityFit.scoreAchieved, "/ 15");

console.log("\n--- TEST CASE 2: Dropdown-Only 10+ Years Profile ---");
const reconciled2 = reconcileScores(aiRawScores, dropdownOnlyInputs);
console.log("Total Score:", reconciled2.overallScore, "/ 100");
console.log("Founder Capability & Fit Score:", reconciled2.categoryScores.founderCapabilityFit.scoreAchieved, "/ 15");

if (reconciled1.categoryScores.founderCapabilityFit.scoreAchieved >= 13 &&
    reconciled2.categoryScores.founderCapabilityFit.scoreAchieved >= 13) {
  console.log("\n✅ ALL SCORING VERIFICATION TESTS PASSED!");
  console.log("Both rich text CA and 10+ years dropdown profiles score 13-15/15 for Founder Capability!");
} else {
  console.error("\n❌ SCORING VERIFICATION FAILED!");
  process.exit(1);
}
