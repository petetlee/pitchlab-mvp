const { genkit } = require("genkit");
const { vertexAI, gemini15Flash: vertexGemini15Flash } = require("@genkit-ai/vertexai");
const fs = require('fs');

async function testPrompt() {
    const aiInstance = genkit({
      plugins: [ vertexAI({ projectId: "394509733221", location: "us-central1" }) ],
      model: vertexGemini15Flash,
    });

    try {
        await aiInstance.generate("test");
        console.log("Success");
    } catch (e) {
        fs.writeFileSync('vertex_err.json', JSON.stringify({ message: e.message, code: e.code, status: e.status }));
    }
}
testPrompt();
