const { reconcileScores } = require('./scoring_logic');

const rawGeminiOutput = {
  problemCustomerClarity: { scoreAchieved: 85, maxScore: 15 },
  founderCapabilityFit: { scoreAchieved: 80, maxScore: 15 },
  customerValidation: { scoreAchieved: 25, maxScore: 20 },
  marketCommercialOpportunity: { scoreAchieved: 75, maxScore: 15 },
  businessModelWillingnessToPay: { scoreAchieved: 60, maxScore: 15 },
  competitivePosition: { scoreAchieved: 70, maxScore: 10 },
  executionReadiness: { scoreAchieved: 60, maxScore: 10 }
};

// Test percentage scaling function
function testScaling(rawVal, max) {
  let num = Number(rawVal);
  if (isNaN(num)) return 0;
  if (num > max) {
    num = Math.round((num / 100) * max);
  }
  return Math.max(0, Math.min(max, num));
}

console.log("Problem Clarity (85 on 15):", testScaling(85, 15)); // Expected: 13
console.log("Founder Fit (80 on 15):", testScaling(80, 15)); // Expected: 12
console.log("Validation (25 on 20):", testScaling(25, 20)); // Expected: 5
console.log("Market Opp (75 on 15):", testScaling(75, 15)); // Expected: 11
console.log("Business Model (60 on 15):", testScaling(60, 15)); // Expected: 9
console.log("Competition (70 on 10):", testScaling(70, 10)); // Expected: 7
console.log("Execution (60 on 10):", testScaling(60, 10)); // Expected: 6

const sum = 13 + 12 + 5 + 11 + 9 + 7 + 6;
console.log("Expected Overall Score:", sum, "/ 100");
