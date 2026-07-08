const { calculateFRI, calculateOverallScore } = require('./scoring_logic');

const testScenarios = [
    {
        name: "Scenario 1: Novice Founder, Low Capacity",
        input: { experience: "None", capacity: "10", network: "None" },
        expectedFRI: 50
    },
    {
        name: "Scenario 2: Expert Founder, High Capacity",
        input: { experience: "Previous Founder", capacity: "40", network: "Mentor Network" },
        expectedFRI: 100
    },
    {
        name: "Scenario 3: 5 Year Domain Expert",
        input: { experience: "5 years in industry", capacity: "20", network: "" },
        expectedFRI: 70
    },
    {
        name: "Scenario 4: High Capacity Only",
        input: { experience: "", capacity: "35", network: "" },
        expectedFRI: 65
    },
    {
        name: "Scenario 5: Network Only",
        input: { experience: "", capacity: "5", network: "I have an investor cousin" },
        expectedFRI: 65
    },
    {
        name: "Scenario 6: Perfect TEAR Score",
        input: { theme: 100, execution: 100, analysis: 100, readiness: 100 },
        type: 'overall',
        expectedScore: 100
    },
    {
        name: "Scenario 7: Average TEAR Score",
        input: { theme: 50, execution: 50, analysis: 50, readiness: 50 },
        type: 'overall',
        expectedScore: 50
    },
    {
        name: "Scenario 8: High Execution/Analysis, Low Theme",
        input: { theme: 20, execution: 80, analysis: 80, readiness: 50 },
        type: 'overall',
        expectedScore: 62 // (20*0.2) + (80*0.3) + (80*0.3) + (50*0.2) = 4 + 24 + 24 + 10 = 62
    },
    {
        name: "Scenario 9: High Readiness, Low Execution",
        input: { theme: 50, execution: 20, analysis: 50, readiness: 90 },
        type: 'overall',
        expectedScore: 49 // (50*0.2) + (20*0.3) + (50*0.3) + (90*0.2) = 10 + 6 + 15 + 18 = 49
    },
    {
        name: "Scenario 10: Zero Scores",
        input: { theme: 0, execution: 0, analysis: 0, readiness: 0 },
        type: 'overall',
        expectedScore: 0
    }
];

let passed = 0;
console.log("🚀 Running Scoring Engine Tests...\n");

testScenarios.forEach((scenario, index) => {
    let result;
    if (scenario.type === 'overall') {
        result = calculateOverallScore(scenario.input);
        if (result === scenario.expectedScore) {
            console.log(`✅ [PASS] ${scenario.name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${scenario.name} | Expected: ${scenario.expectedScore}, Got: ${result}`);
        }
    } else {
        result = calculateFRI(scenario.input);
        if (result === scenario.expectedFRI) {
            console.log(`✅ [PASS] ${scenario.name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${scenario.name} | Expected: ${scenario.expectedFRI}, Got: ${result}`);
        }
    }
});

console.log(`\n📊 Tests Completed: ${passed}/${testScenarios.length} passed.`);
if (passed === testScenarios.length) {
    process.exit(0);
} else {
    process.exit(1);
}
