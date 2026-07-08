const { genkit } = require("genkit");
const { googleAI } = require("@genkit-ai/googleai");
require("dotenv").config();

async function run() {
    const ai = genkit({
        plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })]
    });

    const modelsToTest = [
        'googleai/gemini-2.5-flash',
        'googleai/gemini-flash-latest',
        'googleai/gemini-2.0-flash'
    ];

    for (const model of modelsToTest) {
        try {
            console.log(`TESTING: ${model}`);
            const result = await ai.generate({
                model: model,
                prompt: "Say hello",
            });
            console.log(`SUCCESS [${model}]:`, result.text);
            console.log("-----------------------");
        } catch (e) {
            console.error(`FAILED [${model}]:`, e.message);
            console.log("-----------------------");
        }
    }
}
run();
