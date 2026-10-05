const http = require('http');

const data = JSON.stringify({
  data: {
    idea: "Smart Tax is a tax compliance tool that helps businesses automatically set aside GST and other tax obligations before the money is spent.",
    problem: "Small business owners accidentally spend tax money due to cash flow confusion.",
    targetMarket: "NZ Sole Traders & SMBs",
    category: "FinTech",
    investmentCommitment: "5000",
    timeCommitment: "0-5 hours/week",
    customerValidation: "None yet",
    founderExperience: "20+ years CA",
    industryExperience: "Accounting",
    founderMotivation: "Solve cash flow errors",
    biggestObstacle: "Customer switching inertia",
    businessStage: "Idea",
    fundingPreference: "Bootstrapped",
    successDefinition: "Sustainable SaaS"
  }
});

// Use a fake valid UID in the auth header
const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/demo-pitchlab/us-central1/pitchLabEvaluation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Bearer {"uid":"nge6qZrtfAeoOIV2zJECyM0CdxL2"}'
  }
};

console.log("🚀 Testing full pitchLabEvaluation execution...");
const req = http.request(options, (res) => {
  let body = '';
  console.log(`HTTP STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("RESPONSE LENGTH:", body.length);
    console.log("RESPONSE BODY SAMPLE:", body.substring(0, 500));
    if (res.statusCode === 200) {
      console.log("SUCCESS: Cloud Function executed cleanly and returned 200 OK!");
    } else {
      console.error("FAILURE: Returned non-200 status code!");
    }
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.write(data);
req.end();
