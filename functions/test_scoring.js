const { reconcileScores, getScoreBand } = require('./scoring_logic');

console.log("=== PITCHLAB SCORING ENGINE UNIT TEST ===");

const mockCategories = {
  problemCustomerClarity: { scoreAchieved: 14, maxScore: 15 },
  founderCapabilityFit: { scoreAchieved: 12, maxScore: 15 },
  customerValidation: { scoreAchieved: 5, maxScore: 20 },
  marketCommercialOpportunity: { scoreAchieved: 12, maxScore: 15 },
  businessModelWillingnessToPay: { scoreAchieved: 8, maxScore: 15 },
  competitivePosition: { scoreAchieved: 7, maxScore: 10 },
  executionReadiness: { scoreAchieved: 7, maxScore: 10 }
};

const result = reconcileScores(mockCategories);
console.log("Calculated Overall Score:", result.overallScore);
console.log("Score Band:", JSON.stringify(result.scoreBand, null, 2));

const expectedTotal = 14 + 12 + 5 + 12 + 8 + 7 + 7; // = 65
console.log("Expected Total:", expectedTotal);

if (result.overallScore === expectedTotal) {
  console.log("✅ PASS: Overall score matches exact category sum!");
} else {
  console.error("❌ FAIL: Overall score mismatch!");
  process.exit(1);
}

if (result.scoreBand.name === "Emerging Opportunity") {
  console.log("✅ PASS: Correct Master Prompt score band assigned!");
} else {
  console.error("❌ FAIL: Score band assignment incorrect!");
  process.exit(1);
}

console.log("=== ALL SCORING ENGINE TESTS PASSED SUCCESSFULLY ===");
