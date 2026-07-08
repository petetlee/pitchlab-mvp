const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

async function testFinalFix() {
  const projectNumber = '394509733221';
  const location = 'us-central1';
  // Use the exact same construction as the library might
  const vertex_ai = new VertexAI({ project: projectNumber, location: location });

  try {
    console.log(`Testing Final Fix with Project Number: ${projectNumber}...`);
    const generativeModel = vertex_ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
    const resp = await generativeModel.generateContent('Verify connection');
    const text = resp.response.candidates[0].content.parts[0].text;
    console.log(`✅ Success! Response: ${text}`);
    fs.writeFileSync('functions/fix_verification.txt', `✅ Success: ${text}`);
  } catch (e) {
    console.log(`❌ Still failing: ${e.message}`);
    fs.writeFileSync('functions/fix_verification.txt', `❌ Fail: ${e.message}\n${JSON.stringify(e, null, 2)}`);
  }
}

testFinalFix();
