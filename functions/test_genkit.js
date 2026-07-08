require('dotenv').config();
const { genkit, z } = require("genkit");
const { googleAI, gemini20Flash } = require("@genkit-ai/googleai");

let plugins = [
    googleAI()
];

const ai = genkit({
    plugins: plugins
});

const evaluationSchema = z.object({
  scores: z.object({
    theme: z.coerce.number(),
    execution: z.coerce.number(),
    analysis: z.coerce.number(),
    readiness: z.coerce.number(),
  }),
  tearDetails: z.object({
    theme: z.string(),
    evidence: z.string(),
    analysis: z.string(),
    recommendation: z.string(),
  }),
  mvpFeasibility: z.object({
    under5k: z.boolean(),
    rationale: z.string(),
  }),
  pitchLabCanvas: z.object({
    valueProp: z.string(),
    keyActivities: z.string(),
    costStructure: z.string(),
    revenueStreams: z.string(),
  }),
  actionPlan: z.array(z.string()),
  plans: z.object({
    sevenDayValidation: z.string(),
    thirtyDayBuild: z.string(),
  }),
  keyPoints: z.array(z.string()),
  tips: z.array(z.string()),
});

async function runTest() {
    console.log("Starting Genkit AI generation test using Vertex AI...");
    const fs = require("fs");
    try {
        const result = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: "Evaluate a SaaS platform for independent drivers to manage expenses. Assume positive outcomes.",
            output: { schema: evaluationSchema },
        });
        fs.writeFileSync("test_genkit_output.json", JSON.stringify({ status: 'success', data: result.output }, null, 2));
        console.log("SUCCESS: Output written to test_genkit_output.json");
    } catch (e) {
        fs.writeFileSync("test_genkit_output.json", JSON.stringify({ status: 'error', message: e.message, code: e.code, status_code: e.status }, null, 2));
        console.error("FAILED: Error written to test_genkit_output.json");
    }
}
runTest();
