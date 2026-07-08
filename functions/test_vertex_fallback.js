const { VertexAI } = require('@google-cloud/vertexai');

async function testModels() {
  const project = 'antigravity-pitchlab';
  const region = 'us-central1';
  const vertex_ai = new VertexAI({ project: project, location: region });

  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-preview-0514',
    'gemini-1.5-pro',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-1.0-pro'
  ];

  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const generativeModel = vertex_ai.getGenerativeModel({ model: modelName });
      await generativeModel.generateContent('Hi');
      console.log(`✅ Success for ${modelName}`);
    } catch (e) {
      console.log(`❌ Fail for ${modelName}: ${e.status || e.message}`);
    }
  }
}

testModels();
