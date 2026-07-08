const { genkit, z } = require("genkit");
const { googleAI, gemini20Flash } = require("@genkit-ai/googleai");
require("dotenv").config();

async function run() {
    console.log("Testing Genkit Google AI fallback with gemini20Flash...");
    try {
        const ai = genkit({
            plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
            model: gemini20Flash,
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
    } catch (e) {
        console.error("FALLBACK FAILED:", e.message);
        if (e.stack) console.error(e.stack);
    }
}
run();
