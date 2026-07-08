const { z } = require("genkit");

const evaluationSchema = z.object({
    scores: z.object({
        theme: z.coerce.number(),
        execution: z.coerce.number(),
        analysis: z.coerce.number(),
        readiness: z.coerce.number(),
    }),
    keyPoints: z.array(z.string()),
    tips: z.array(z.string()),
});

const testData = [
    {
        name: "Valid data",
        input: {
            scores: { theme: 80, execution: 70, analysis: 60, readiness: 90 },
            keyPoints: ["Good idea", "Low risk"],
            tips: ["Keep going", "Talk to users"]
        },
        expected: { theme: 80, execution: 70, analysis: 60, readiness: 90 }
    },
    {
        name: "Strings representing numbers",
        input: {
            scores: { theme: "85", execution: "75", analysis: "65", readiness: "95" },
            keyPoints: ["Point A", "Point B"],
            tips: ["Tip 1", "Tip 2"]
        },
        expected: { theme: 85, execution: 75, analysis: 65, readiness: 95 }
    },
    {
        name: "Mixed types",
        input: {
            scores: { theme: 80, execution: "70", analysis: 60, readiness: "90" },
            keyPoints: ["Mixed A"],
            tips: ["Mixed B"]
        },
        expected: { theme: 80, execution: 70, analysis: 60, readiness: 90 }
    }
];

testData.forEach(test => {
    try {
        const parsed = evaluationSchema.parse(test.input);
        console.log(`✅ [PASS] ${test.name}`);
        console.log("   Parsed Scores:", JSON.stringify(parsed.scores));
        console.log("   Parsed Key Points:", JSON.stringify(parsed.keyPoints));
        console.log("   Parsed Tips:", JSON.stringify(parsed.tips));
    } catch (error) {
        console.error(`❌ [FAIL] ${test.name}`);
        console.error("   Error:", error.message);
    }
});
