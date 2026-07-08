const { genkit } = require("genkit");
const { vertexAI } = require("@genkit-ai/vertexai");
require("dotenv").config();

async function run() {
    const ai = genkit({
        plugins: [vertexAI({ projectId: "394509733221", location: "us-central1" })]
    });

    const modelsToTest = [
        'vertexai/gemini-1.5-flash',
        'vertexai/gemini-2.5-flash'
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
