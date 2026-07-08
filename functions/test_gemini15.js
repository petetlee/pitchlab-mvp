const { genkit, z } = require("genkit");
const { googleAI, gemini15Flash } = require("@genkit-ai/googleai");
require("dotenv").config();

async function run() {
    console.log("Testing Genkit Google AI fallback with gemini15Flash...");
    try {
        const ai = genkit({
            plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
            model: gemini15Flash,
        });

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

        const result = await ai.generate({
            prompt: "Evaluate the idea: Smart Tax compliance software.",
            output: { schema: evaluationSchema }
        });

        console.log("SUCCESS");
        console.log("Result:", result.output);
        process.exit(0);
    } catch (e) {
        console.error("FALLBACK FAILED:", e.message);
        process.exit(1);
    }
}
run();
