const { getMockResult } = require('./index.js');

const smartTaxInput = {
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
};

const { detectFeasibilityGates } = require('./scoring_logic.js');
console.log("GATES INFO FOR SMART TAX:", JSON.stringify(detectFeasibilityGates(smartTaxInput), null, 2));

const res = getMockResult(smartTaxInput).output;
console.log("Overall Score:", res.overallScore);
console.log("Master Rec:", res.masterRecommendation);
console.log("Core Offering:", res.businessModelSnapshot?.coreOffering);
console.log("Exec Summary:", res.executiveSummary);
console.log("Three Priority Actions:", JSON.stringify(res.threePriorityActions, null, 2));
console.log("Market Insights:", JSON.stringify(res.marketInsights, null, 2));
console.log("Future Trends Dimensions:", JSON.stringify(res.futureTrends?.dimensions, null, 2));
