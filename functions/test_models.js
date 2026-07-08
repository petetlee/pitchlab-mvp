
const { googleAI } = require('@genkit-ai/googleai');
const { genkit } = require('genkit');
require('dotenv').config();

async function test() {
  const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  });

  try {
    console.log("Testing gemini-1.5-flash...");
    const result = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'Hello, are you there?',
    });
    console.log("Response:", result.text);
  } catch (e) {
    console.error("Error with gemini-1.5-flash:", e.message);
  }

  try {
    console.log("Testing gemini-2.0-flash-exp...");
    const result2 = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: 'Hello, are you there?',
    });
    console.log("Response 2:", result2.text);
  } catch (e) {
    console.error("Error with gemini-2.0-flash-exp:", e.message);
  }
}

test();
