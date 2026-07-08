const { genkit, z } = require("genkit");
const { googleAI, gemini15Flash } = require("@genkit-ai/googleai");
require("dotenv").config();

async function run() {
    try {
        console.log("Testing Genkit googleGemini15Flash fallback...", process.env.GEMINI_API_KEY.substring(0, 5));
        const ai = genkit({
            plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
        });

        const result = await ai.generate({
            model: gemini15Flash,
            prompt: "Say hello",
        });

        console.log("SUCCESS:", result.text);
    } catch (e) {
        console.error("GOOGLE AI FAILED EXACTLY WITH ERROR:");
        console.error("Message:", e.message);
        console.error("Status:", e.status);
    }
}
run();
