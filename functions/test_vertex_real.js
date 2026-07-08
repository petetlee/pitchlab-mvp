const { genkit } = require("genkit");
const { vertexAI, gemini15Flash: vertexGemini15Flash } = require("@genkit-ai/vertexai");
const { z } = require("genkit");

async function testPrompt() {
    console.log("Initializing Vertex AI plugin...");
    const aiInstance = genkit({
      plugins: [
        vertexAI({
          projectId: "antigravity-pitchlab",
          location: "us-central1",
        })
      ],
      model: vertexGemini15Flash,
    });

    const data = {
      "idea": "Uber competitor business model where drivers only pay a fixed monthly fee - drivers will keep 100% of the fares earned.\n",
      "category": "SaaS",
      "problem": "\"Drivers feel punished by commission-based platforms\nOn Uber-style models, the platform takes a cut of every trip, so drivers can feel like they are doing the work while the platform keeps too much of the upside. Your model gives drivers 100% of each fare, which is much easier to understand and feels fairer.\nDrivers want predictable costs\n..."
    };

    const evaluationPrompt = `You are an AI generating a test output for idea: ${data.idea}`;

    const evaluationSchema = z.object({
        test: z.string()
    });

    try {
        console.log("Generating...");
        const result = await aiInstance.generate({
            model: vertexGemini15Flash,
            prompt: evaluationPrompt,
            output: { schema: evaluationSchema },
        });
        console.log("Result:", result.output);
    } catch (e) {
        console.error("Vertex AI Error:", e);
    }
}

testPrompt();
