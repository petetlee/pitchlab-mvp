const { reconcileScores, classifyVentureType, detectFeasibilityGates } = require('./scoring_logic');

console.log("==========================================================================");
console.log("    PITCHLAB FUTURE TRENDS & MARKET DIRECTION 5-ARCHETYPE VERIFICATION    ");
console.log("==========================================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// 1. CONVENTIONAL SMALL BUSINESS (Local Plumbing Service)
// -------------------------------------------------------------------------
console.log("\n[Scenario 1] Conventional Small Business (Local Plumbing)");
const input1 = {
  idea: "Auckland Local Emergency Plumbing Service",
  category: "Local Service / Trades",
  problem: "Homeowners face long wait times for emergency plumbing repairs in North Shore Auckland",
  experience: "Licensed Master Plumber with 10 years experience",
  founderBackgroundNarrative: "Licensed Master Plumber with 10 years direct trade experience in Auckland.",
  capacity: "40 hours/week",
  budget: "$5,000",
  network: "Local trade supplier network",
  targetMarket: "Homeowners in North Shore Auckland"
};
const rawAi1 = {
  problemCustomerClarity: { score: 12 },
  founderCapabilityFit: { score: 14 },
  customerValidation: { score: 10 },
  marketCommercialOpportunity: { score: 10 },
  businessModelWillingnessToPay: { score: 11 },
  competitivePosition: { score: 6 },
  executionReadiness: { score: 7 },
  futureTrends: {
    futureOutlook: "NEUTRAL",
    trendAlignmentScore: 6,
    forecastConfidence: "High",
    whereMarketIsHeading: "Steady local demand driven by population growth, offset by rising trade vehicle fuel costs and labor shortages.",
    tailwinds: ["Population growth in North Shore", "Aging residential housing infrastructure"],
    headwinds: ["Rising vehicle fuel and insurance costs", "Trade apprentice shortage"],
    founderDecisionGuidance: "Focus on local SEO and fast emergency dispatch before adding non-essential services.",
    adjacentOpportunities: ["Heat pump and solar hot water installation"]
  }
};
const res1 = reconcileScores(rawAi1, input1);
console.log(`  - Overall Score: ${res1.overallScore}/100`);
console.log(`  - Future Trends Score: ${res1.categoryScores.futureTrends.scoreAchieved}/5`);
assert(res1.overallScore <= 100, "Overall score is /100 ceiling");
assert(res1.categoryScores.futureTrends.scoreAchieved === 3, "Future trends score 3/5 calculated for neutral/positive trade trend");

// -------------------------------------------------------------------------
// 2. TECH / SOFTWARE SAAS (PropTech Compliance SaaS)
// -------------------------------------------------------------------------
console.log("\n[Scenario 2] Technology / Software SaaS (PropTech)");
const input2 = {
  idea: "Automated Commercial Building Compliance Platform",
  category: "B2B SaaS",
  problem: "Property managers waste 15 hours per week tracking building warrant of fitness (BWOF) documents manually",
  experience: "15 years commercial property manager and software product lead",
  founderBackgroundNarrative: "15 years managing commercial property portfolios with deep understanding of BWOF regulations.",
  capacity: "30 hours/week",
  budget: "$15,000",
  network: "Direct access to 50 property management firms",
  targetMarket: "Commercial property managers in NZ & AU"
};
const rawAi2 = {
  problemCustomerClarity: { score: 13 },
  founderCapabilityFit: { score: 14 },
  customerValidation: { score: 16 },
  marketCommercialOpportunity: { score: 12 },
  businessModelWillingnessToPay: { score: 12 },
  competitivePosition: { score: 7 },
  executionReadiness: { score: 8 },
  futureTrends: {
    futureOutlook: "STRONG",
    trendAlignmentScore: 9,
    forecastConfidence: "High",
    whereMarketIsHeading: "Accelerating regulatory compliance mandates and digital auditing requirements across Australasia.",
    tailwinds: ["Mandatory digital compliance reporting", "Rising council audit penalties"],
    headwinds: ["Legacy IT integration friction in larger firms"],
    founderDecisionGuidance: "Move now and lock in early property management pilot partners.",
    adjacentOpportunities: ["ESG carbon footprint tracking module", "Council API direct integration"]
  }
};
const res2 = reconcileScores(rawAi2, input2);
console.log(`  - Overall Score: ${res2.overallScore}/100`);
console.log(`  - Future Trends Score: ${res2.categoryScores.futureTrends.scoreAchieved}/5`);
assert(res2.overallScore >= 70, "Strong tech idea achieves High Potential / Investment Ready band");
assert(res2.categoryScores.futureTrends.scoreAchieved === 5, "Future trends score 5/5 for STRONG trend alignment");

// -------------------------------------------------------------------------
// 3. PHYSICAL PRODUCT (Marine Boat Mooring Device)
// -------------------------------------------------------------------------
console.log("\n[Scenario 3] Physical Product (Marine Mooring Device)");
const input3 = {
  idea: "Shock-Absorbing Marine Boat Mooring Device",
  category: "Hardware / Physical Product",
  problem: "Harbor storms cause mooring line snaps causing expensive vessel damage",
  experience: "Marine engineer with 12 years boat maintenance experience",
  founderBackgroundNarrative: "12 years marine engineer and boatyard owner.",
  capacity: "20 hours/week",
  budget: "$8,000",
  network: "Contacts across 5 major marina operators",
  targetMarket: "Recreational and commercial boat owners"
};
const rawAi3 = {
  problemCustomerClarity: { score: 12 },
  founderCapabilityFit: { score: 13 },
  customerValidation: { score: 11 },
  marketCommercialOpportunity: { score: 10 },
  businessModelWillingnessToPay: { score: 10 },
  competitivePosition: { score: 7 },
  executionReadiness: { score: 7 },
  futureTrends: {
    futureOutlook: "POSITIVE",
    trendAlignmentScore: 7,
    forecastConfidence: "Medium",
    whereMarketIsHeading: "Increasing storm frequency and rising marine vessel insurance premiums drive demand for shock mitigation.",
    tailwinds: ["Higher frequency of extreme storm events", "Strict marina insurance compliance clauses"],
    headwinds: ["Raw material inflation on marine-grade alloys", "Tooling capital expense"],
    founderDecisionGuidance: "Validate prototype durability in field sea trials before committing to mass production tooling.",
    adjacentOpportunities: ["Commercial aquacultural mooring lines", "Floating dock shock dampeners"]
  }
};
const res3 = reconcileScores(rawAi3, input3);
console.log(`  - Overall Score: ${res3.overallScore}/100`);
console.log(`  - Future Trends Score: ${res3.categoryScores.futureTrends.scoreAchieved}/5`);
assert(res3.overallScore <= 100, "Overall score is capped at /100");
assert(res3.categoryScores.futureTrends.scoreAchieved === 4, "Future trends score 4/5 for POSITIVE trend alignment");

// -------------------------------------------------------------------------
// 4. REGULATED / INFRASTRUCTURE CONCEPT (Nuclear Power Plant NZ)
// -------------------------------------------------------------------------
console.log("\n[Scenario 4] Regulated / Infrastructure (Nuclear Power Plant NZ)");
const input4 = {
  idea: "Commercial Small Modular Nuclear Power Plant in New Zealand",
  category: "Clean Energy / Infrastructure",
  problem: "New Zealand faces electricity supply shortages during winter peak demand",
  experience: "Chartered Accountant with financial advisory background",
  founderBackgroundNarrative: "Senior Chartered Accountant with 15 years financial consulting experience.",
  capacity: "10 hours/week",
  budget: "$2,000",
  network: "No direct contacts in energy regulation or nuclear engineering",
  targetMarket: "New Zealand national electricity grid"
};
const rawAi4 = {
  problemCustomerClarity: { score: 8 },
  founderCapabilityFit: { score: 4 },
  customerValidation: { score: 1 },
  marketCommercialOpportunity: { score: 2 },
  businessModelWillingnessToPay: { score: 2 },
  competitivePosition: { score: 2 },
  executionReadiness: { score: 1 },
  futureTrends: {
    futureOutlook: "UNCERTAIN",
    trendAlignmentScore: 8, // High global trend, BUT severe NZ statutory gate!
    forecastConfidence: "Low",
    whereMarketIsHeading: "Global demand for SMR nuclear power grows, but NZ statutory frameworks (Atomic Energy Act 1945, Radiation Safety Act 2016, RMA) present massive regulatory hurdles.",
    tailwinds: ["Global SMR technical maturity", "Zero-carbon baseload energy demand"],
    headwinds: ["Severe statutory consenting hurdles in NZ", "Massive capital expenditure requirements"],
    founderDecisionGuidance: "Do not invest personal capital; focus strictly on statutory pre-feasibility legal consultation.",
    adjacentOpportunities: ["Offshore wind feasibility study"]
  }
};
const res4 = reconcileScores(rawAi4, input4);
console.log(`  - Overall Score: ${res4.overallScore}/100`);
console.log(`  - Future Trends Score: ${res4.categoryScores.futureTrends.scoreAchieved}/5 (Feasibility Gate Capped!)`);
assert(res4.overallScore <= 30, "Regulated nuclear concept with founder mismatch remains capped strictly under 30/100");
assert(res4.categoryScores.futureTrends.scoreAchieved <= 1, "Future trends score capped at <=1 due to critical feasibility gate");

// -------------------------------------------------------------------------
// 5. FUTURISTIC SPECULATIVE CONCEPT (Quantum Computing AI - Zero Validation)
// -------------------------------------------------------------------------
console.log("\n[Scenario 5] Futuristic Speculative Concept (Quantum Computing - Zero Validation)");
const input5 = {
  idea: "Quantum Computing AI Consumer Personal Shopping Assistant",
  category: "Deep Tech / Consumer AI",
  problem: "Consumers spend 5 minutes searching for apparel deals online",
  experience: "General marketing graduate",
  founderBackgroundNarrative: "Recent marketing graduate interested in quantum AI.",
  capacity: "5 hours/week",
  budget: "$100",
  network: "None",
  targetMarket: "Global online shoppers"
};
const rawAi5 = {
  problemCustomerClarity: { score: 5 },
  founderCapabilityFit: { score: 3 },
  customerValidation: { score: 0 },
  marketCommercialOpportunity: { score: 4 },
  businessModelWillingnessToPay: { score: 3 },
  competitivePosition: { score: 3 },
  executionReadiness: { score: 2 },
  futureTrends: {
    futureOutlook: "UNCERTAIN",
    trendAlignmentScore: 9, // Hype futuristic trend, BUT zero current validation or feasibility!
    forecastConfidence: "Low",
    whereMarketIsHeading: "Quantum computing hardware remains in early research stage with no consumer browser access for 10+ years.",
    tailwinds: ["Long-term quantum hardware research investment"],
    headwinds: ["Zero consumer quantum hardware availability", "Extreme technical barrier"],
    founderDecisionGuidance: "Avoid overinvesting; reframe toward accessible web/mobile tools using existing APIs.",
    adjacentOpportunities: ["Standard LLM shopping chrome extension"]
  }
};
const res5 = reconcileScores(rawAi5, input5);
console.log(`  - Overall Score: ${res5.overallScore}/100`);
console.log(`  - Future Trends Score: ${res5.categoryScores.futureTrends.scoreAchieved}/5`);
assert(res5.overallScore <= 39, "Futuristic speculative concept with zero validation is NOT inflated (remains Exploration Stage <=39)");

console.log("\n==========================================================================");
console.log(`  VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log("==========================================================================");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
