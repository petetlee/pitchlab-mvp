const { genkit } = require("genkit");
const { vertexAI } = require("@genkit-ai/vertexai");
const fs = require('fs');

async function testPrompt() {
    const aiInstance = genkit({
      plugins: [ vertexAI({ projectId: "394509733221", location: "us-central1" }) ],
    });

    try {
        await aiInstance.generate({
            model: "vertexai/gemini-1.5-flash-001",
            prompt: "Say hello",
        });
        console.log("Success: gemini-1.5-flash-001");
    } catch (e) {
        console.log("Failed: gemini-1.5-flash-001", e.message);
    }
    
    try {
        await aiInstance.generate({
            model: "vertexai/gemini-1.5-flash-002",
            prompt: "Say hello",
        });
        console.log("Success: gemini-1.5-flash-002");
    } catch (e) {
        console.log("Failed: gemini-1.5-flash-002", e.message);
    }
    
    try {
        await aiInstance.generate({
            model: "vertexai/gemini-1.5-pro",
            prompt: "Say hello",
        });
        console.log("Success: gemini-1.5-pro");
    } catch (e) {
        console.log("Failed: gemini-1.5-pro", e.message);
    }
}
testPrompt();
