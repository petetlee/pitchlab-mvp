const http = require('http');

// 1. Get an ID Token from Auth Emulator at port 9099
const authPayload = JSON.stringify({
  returnSecureToken: true
});

const authReq = http.request({
  hostname: '127.0.0.1',
  port: 9099,
  path: '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(authPayload)
  }
}, (authRes) => {
  let authData = '';
  authRes.on('data', (c) => authData += c);
  authRes.on('end', () => {
    try {
      const parsed = JSON.parse(authData);
      const idToken = parsed.idToken;
      const uid = parsed.localId;
      console.log(`✅ Auth Emulator Signed In. UID: ${uid}`);
      console.log(`ID Token acquired (first 20 chars): ${idToken.substring(0, 20)}...`);

      // 2. Call pitchLabEvaluation on port 5001 with valid Token
      callEvaluation(idToken, uid);
    } catch (err) {
      console.error("Auth token parse error:", err.message, authData);
    }
  });
});

authReq.on('error', (e) => console.error("Auth Req error:", e.message));
authReq.write(authPayload);
authReq.end();

function callEvaluation(idToken, uid) {
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
      'Authorization': `Bearer ${idToken}`
    }
  };

  console.log("🚀 Submitting evaluation to pitchLabEvaluation with valid Auth Token...");
  const startTime = Date.now();
  const req = http.request(options, (res) => {
    let body = '';
    console.log(`HTTP STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`⏱ Completed in ${duration}s`);
      console.log("RESPONSE LENGTH:", body.length);
      
      try {
        const json = JSON.parse(body);
        if (res.statusCode === 200 && json.result) {
          console.log("\n========================================================");
          console.log("🎉 SUCCESS: EVALUATION COMPLETED 100% CLEANLY!");
          console.log("OVERALL SCORE:", json.result.overallScore);
          console.log("SCORE BAND:", JSON.stringify(json.result.scoreBand));
          console.log("VERDICT:", json.result.summaryBlock?.pitchLabVerdict);
          console.log("SCORECARD CATEGORIES COUNT:", Object.keys(json.result.scorecard || {}).length);
          console.log("========================================================\n");
        } else {
          console.error("❌ BACKEND RETURNED ERROR:", body);
        }
      } catch (parseErr) {
        console.error("RAW RESPONSE:", body);
      }
    });
  });

  req.on('error', (e) => console.error("Evaluation Req error:", e.message));
  req.write(data);
  req.end();
}
