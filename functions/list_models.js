
const { googleAI } = require('@genkit-ai/googleai');
const { vertexAI } = require('@genkit-ai/vertexai');
const { genkit } = require('genkit');
require('dotenv').config();

async function listModels() {
  const ai = genkit({
    plugins: [
      googleAI({ apiKey: process.env.GEMINI_API_KEY }),
      vertexAI({ location: 'us-central1' })
    ],
  });

  console.log("Available Models:");
  const models = await ai.listModels();
  models.forEach(m => console.log(`- ${m.name}`));
}

listModels();
