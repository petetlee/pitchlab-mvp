const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

async function testModels() {
  const project = 'antigravity-pitchlab';
  const regions = ['us-central1', 'us-east1', 'australia-southeast1', 'asia-northeast1'];
  
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  let results = '';

  for (const region of regions) {
    const vertex_ai = new VertexAI({ project: project, location: region });
    results += `--- Testing Region: ${region} ---\n`;
    console.log(`Testing Region: ${region}...`);

    for (const modelName of models) {
      try {
        console.log(`  Testing model: ${modelName}...`);
        const generativeModel = vertex_ai.getGenerativeModel({
          model: modelName,
        });
        const resp = await generativeModel.generateContent('Hi');
        results += `  ✅ Success for ${modelName} in ${region}\n`;
        console.log(`  ✅ Success for ${modelName} in ${region}`);
      } catch (e) {
        results += `  ❌ Fail for ${modelName} in ${region}: ${e.message}\n`;
        console.log(`  ❌ Fail for ${modelName} in ${region}: ${e.message}`);
      }
    }
  }
  fs.writeFileSync('functions/region_results.txt', results);
}

testModels();
