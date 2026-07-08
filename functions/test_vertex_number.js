const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

async function testProjectNumber() {
  const projectNumber = '394509733221';
  const location = 'us-central1';
  const vertex_ai = new VertexAI({ project: projectNumber, location: location });

  const models = [
    'gemini-1.5-flash',
  ];

  let results = '--- Testing Project Number: ' + projectNumber + ' ---\n';
  console.log(`Testing Project Number: ${projectNumber}...`);

  for (const modelName of models) {
    try {
      console.log(`  Testing model: ${modelName}...`);
      const generativeModel = vertex_ai.getGenerativeModel({
        model: modelName,
      });
      const resp = await generativeModel.generateContent('Hi');
      results += `  ✅ Success for ${modelName} in ${location} using project number\n`;
      console.log(`  ✅ Success for ${modelName} in ${location} using project number`);
    } catch (e) {
      results += `  ❌ Fail for ${modelName} in ${location} using project number: ${e.message}\n`;
      console.log(`  ❌ Fail for ${modelName} in ${location} using project number: ${e.message}`);
    }
  }
  fs.writeFileSync('functions/number_results.txt', results);
}

testProjectNumber();
