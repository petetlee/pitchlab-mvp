const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

async function testModels() {
  const project = 'antigravity-pitchlab';
  const location = 'us-central1';
  const vertex_ai = new VertexAI({ project: project, location: location });

  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ];

  let results = '';

  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const generativeModel = vertex_ai.getGenerativeModel({
        model: modelName,
      });
      const resp = await generativeModel.generateContent('Hi');
      results += `✅ Success for ${modelName}\n`;
      console.log(`✅ Success for ${modelName}`);
    } catch (e) {
      results += `❌ Fail for ${modelName}: ${e.message}\n`;
      console.log(`❌ Fail for ${modelName}: ${e.message}`);
    }
  }
  fs.writeFileSync('functions/model_results.txt', results);
}

testModels();
