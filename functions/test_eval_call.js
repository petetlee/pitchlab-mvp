process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testNuclearCloudFunction() {
  console.log("Calling pitchLabEvaluation emulator at 127.0.0.1:5001 with Nuclear Power Plant payload...");
  const response = await fetch("http://127.0.0.1:5001/demo-pitchlab/us-central1/pitchLabEvaluation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: {
        idea: "Nuclear Power Plant in New Zealand",
        problem: "New Zealand needs reliable low-carbon baseload electricity generation",
        targetMarket: "New Zealand Energy Market & Industrial Power Consumers",
        category: "Energy & Infrastructure",
        investmentCommitment: "$5,000",
        timeCommitment: "15-30 hours/week",
        customerValidation: "0 potential customers",
        founderExperience: "Yes – still operating",
        industryExperience: "20+ years",
        founderBackgroundNarrative: "I am a Chartered Accountant (CA) with 25+ years senior commercial experience advising SMBs.",
        locationCountry: "New Zealand",
        locationRegion: "Auckland",
        locationSummary: "New Zealand",
        marketScope: "National customers"
      }
    })
  });

  console.log("STATUS:", response.status);
  const json = await response.json();
  const resData = json.result || {};
  console.log("\n=== CLOUD FUNCTION RETURNED RESULT ===");
  console.log("overallScore:", resData.overallScore);
  console.log("scoreBand:", resData.scoreBand);
  console.log("masterRecommendation:", resData.masterRecommendation);
  console.log("summaryBlock:", resData.summaryBlock);
  console.log("scorecard:", resData.scorecard);
  console.log("marketInsights:", resData.marketInsights);
}

testNuclearCloudFunction().catch(console.error);
