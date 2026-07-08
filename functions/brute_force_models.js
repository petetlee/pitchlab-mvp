
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function list() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in the client, but we can try to get a model or check the API
    // Actually, let's just try several common naming variations
    const models = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp"
    ];

    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("test");
        console.log(`✅ Model ${m} is AVAILABLE`);
      } catch (e) {
        console.log(`❌ Model ${m} is NOT available: ${e.message.substring(0, 100)}`);
      }
    }
  } catch (e) {
    console.error("General error:", e.message);
  }
}

list();
