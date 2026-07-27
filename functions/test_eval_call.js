const http = require('http');

const data = JSON.stringify({
  data: {
    idea: "Smart Tax Automated GST Set-Aside App",
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

const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/antigravity-pitchlab/us-central1/pitchLabEvaluation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Bearer owner'
  }
};

console.log("Calling pitchLabEvaluation emulator at 127.0.0.1:5001...");
const req = http.request(options, (res) => {
  let body = '';
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("RESPONSE BODY HEAD:", body.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.write(data);
req.end();
