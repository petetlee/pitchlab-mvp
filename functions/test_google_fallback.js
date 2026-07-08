const { genkit } = require("genkit");
const { googleAI, gemini15Flash } = require("@genkit-ai/googleai");
require("dotenv").config();

async function run() {
    console.log("Testing Google AI Fallback...");
    try {
        const ai = genkit({
            plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
            model: gemini15Flash,
        });
        
        const result = await ai.generate({
            prompt: "Say hello",
        });
        console.log("SUCCESS:", result.text);
    } catch(err) {
        console.error("FAILED:");
        console.error(err.message);
        if(err.stack) console.error(err.stack);
    }
}

run();
