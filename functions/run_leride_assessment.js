const { getMockResult } = require('./index.js');
const { validateReportIntegrityGate } = require('./scoring_logic.js');
const fs = require('fs');
const path = require('path');

const leRideInput = {
  idea: "LeRide is a Samoa-focused ride-sharing and transport-booking marketplace connecting local passengers, tourists, and airport travellers with vetted drivers and transport operators.",
  problem: "Passenger transport in Samoa is fragmented, pricing is opaque and unmetered, airport transfers and taxi bookings rely heavily on informal phone calls or roadside hailing, and visitors struggle to find safe, reliable, transparent transport.",
  category: "Transportation / Mobility / Digital Marketplace",
  targetMarket: "Local commuters in Apia and surrounding Upolu, international tourists, visiting friends and relatives (VFR), and business travellers needing reliable transport.",
  locationCountry: "Samoa",
  locationRegion: "Apia & Upolu",
  locationCity: "Apia",
  locationSummary: "Apia, Samoa",
  marketScope: "Samoa passenger transport and tourism mobility",
  timeCommitment: "15-30 hours/week",
  investmentCommitment: "$50,000 - $100,000 NZD",
  initialRiskCapital: "$500 NZD",
  experience: "Managing Director of New Discovery Group in Samoa, operating Discovery Rentals & Tours with established fleet operations, airport transfers, hotel partnerships, driver networks, and deep local transport pricing and tourism knowledge. Non-technical founder seeking technical development partners.",
  founderCvExtractedText: "Managing Director, New Discovery Group (Samoa). Founder and operator of Discovery Rentals & Tours. Extensive passenger transport, fleet management, airport transfer logistics, and hospitality partner relationships across Upolu, Samoa. Senior commercial leadership.",
  founderBackgroundNarrative: "I currently operate Discovery Rentals & Tours under the New Discovery Group in Samoa. We manage vehicle rentals, hotel transfers, airport transfers, and island tours. We have established driver relationships, strong hotel partner connections, and deep daily operational experience with local passenger transport economics and customer expectations in Apia. I do not code and plan to outsource the mobile app build."
};

console.log("==========================================================================");
console.log("🚀 RUNNING LERIDE SAMOA TRANSPORT MARKETPLACE INTEGRITY SUITE");
console.log("==========================================================================");

const res = getMockResult(leRideInput).output;
fs.writeFileSync(path.join(__dirname, 'latest_leride_eval.json'), JSON.stringify(res, null, 2));

console.log("\n--- ASSESSMENT METADATA ---");
console.log(`Assessment ID:                   ${res.assessmentId}`);
console.log(`App Version:                     ${res.appVersion}`);
console.log(`Build ID:                        ${res.buildId}`);
console.log(`Generated At:                    ${res.assessmentGeneratedAtFormatted}`);
console.log(`Overall Score:                   ${res.overallScore}/100`);
console.log(`Stage (Score Band):              ${res.scoreBand.name}`);
console.log(`Master Recommendation:           ${res.masterRecommendation}`);

console.log("\n--- THEME & POSITIONING ---");
console.log(`Primary Theme:                   ${res.businessTheme.primaryTheme}`);
console.log(`Secondary Theme:                 ${res.businessTheme.secondaryTheme}`);
console.log(`Strategic Positioning:           ${res.businessTheme.strategicPositioning}`);
console.log(`Market Category Dynamics:        ${res.businessTheme.marketCategoryDynamics}`);
console.log(`Strategic Moat:                  ${res.businessTheme.strategicMoat}`);

console.log("\n--- BUSINESS MODEL SNAPSHOT ---");
console.log(`Target Customer:     "${res.businessModelSnapshot.targetCustomer}"`);
console.log(`Core Offering:       "${res.businessModelSnapshot.coreOffering}"`);
console.log(`Customer Problem:    "${res.businessModelSnapshot.customerProblem}"`);
console.log(`Value Proposition:   "${res.businessModelSnapshot.valueProposition}"`);
console.log(`Revenue Model:       "${res.businessModelSnapshot.revenueModel}"`);
console.log(`Customer Acq:        "${res.businessModelSnapshot.customerAcquisition}"`);
console.log(`Key Costs:           "${res.businessModelSnapshot.keyCosts}"`);
console.log(`Commercial Assess:   "${res.businessModelSnapshot.commercialAssessment}"`);

console.log("\n--- CAPITAL VARIABLES ---");
console.log(`Available Capital:               ${res.founderMetrics.availableCapital}`);
console.log(`Initial Risk Capital:           ${res.founderMetrics.initialRiskCapital}`);

console.log("\n--- FOUNDER CAPABILITY ---");
const fcScore = res.categoryScores.founderCapabilityFit.scoreAchieved;
console.log(`Founder Capability Score:        ${fcScore}/15 (${res.categoryScores.founderCapabilityFit.evidenceLevel})`);
console.log(`Position Summary:                ${res.founderMetrics.founderPositionSummary}`);
console.log(`Explanation:                     ${res.founderCapabilityExplanation?.whyThisScoreWasAwarded}`);

console.log("\n--- CUSTOMER VALIDATION ---");
const cvScore = res.categoryScores.customerValidation.scoreAchieved;
console.log(`Customer Validation Score:       ${cvScore}/20 (${res.categoryScores.customerValidation.evidenceLevel})`);

console.log("\n--- PRIORITY ACTIONS (3) ---");
res.summaryBlock.threePriorityActions.forEach((act, idx) => {
  console.log(`Action ${idx + 1}: ${act.heading}`);
  console.log(`  Explanation: ${act.explanation}`);
  console.log(`  Outcome:     ${act.outcome}`);
});

console.log("\n--- TOP 5 PRIORITIES ---");
res.actionPlan.topFivePriorities.forEach((p, idx) => {
  console.log(`Priority ${idx + 1}: ${p.priority} | Metric: ${p.metric}`);
});

console.log("\n==========================================================================");
console.log("🔍 EXECUTING STRICT AUTOMATED ASSERTIONS");
console.log("==========================================================================");

const allReportText = JSON.stringify(res).toLowerCase();
let passed = 0;
let total = 0;

function assert(condition, testName, detail = "") {
  total++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail}`);
  }
}

// 1. Classification & Theme
assert(
  res.businessTheme.primaryTheme.includes("Transportation") || res.businessTheme.primaryTheme.includes("Mobility"),
  "Primary Theme is Transportation / Mobility",
  `Found: ${res.businessTheme.primaryTheme}`
);
assert(
  !res.businessTheme.primaryTheme.includes("B2B Software") && !res.businessTheme.secondaryTheme.includes("Workflow Efficiency"),
  "Theme does not default to B2B Software / Workflow Efficiency",
  `Theme: ${res.businessTheme.primaryTheme} / ${res.businessTheme.secondaryTheme}`
);

// 2. Banned SaaS Term Check in Mobility assessment
const bannedSaaSTerms = [
  'manual spreadsheets',
  'commercial software market',
  'cloud-based productivity tools',
  'administrative overhead reduction',
  'enterprise platforms',
  'horizontal productivity tools',
  'compliance automation',
  'workflow retention',
  'api-driven add-ons',
  'enterprise reporting integrations',
  'subscription economics'
];
let foundBannedSaaS = [];
for (const term of bannedSaaSTerms) {
  if (allReportText.includes(term)) {
    foundBannedSaaS.push(term);
  }
}
assert(
  foundBannedSaaS.length === 0,
  "No prohibited B2B SaaS terms contaminated mobility report",
  `Found: ${foundBannedSaaS.join(', ')}`
);

// 3. Founder Domain Recognition & Calibration
assert(
  fcScore >= 9 && fcScore <= 12,
  "Founder Capability calibrated to 9-12/15 (Strong Fit / Workable With Constraints)",
  `Score achieved: ${fcScore}/15`
);
assert(
  !allReportText.includes("lacks sector-specific domain experience") && !allReportText.includes("lacks direct domain experience"),
  "No contradiction claiming founder lacks domain experience when transport operations are evidenced",
  `Contradiction found in text`
);

// 4. Distinction between Domain Authority and Technical Build Gap
const fcWhy = (res.founderCapabilityExplanation?.whyThisScoreWasAwarded || "").toLowerCase();
assert(
  fcWhy.includes("transport") || fcWhy.includes("fleet") || fcWhy.includes("domain") || fcWhy.includes("operational"),
  "Founder capability narrative explicitly credits transport operations / domain background",
  `Narrative: ${fcWhy}`
);
assert(
  fcWhy.includes("technical") || fcWhy.includes("software") || fcWhy.includes("engineering") || fcWhy.includes("platform"),
  "Founder capability narrative clearly identifies software platform development as the bridgeable gap",
  `Narrative: ${fcWhy}`
);

// 5. Customer Validation Discipline (Must remain early-stage <= 4/20)
assert(
  cvScore <= 4,
  "Customer Validation score remains disciplined at early stage (<= 4/20)",
  `Customer Validation: ${cvScore}/20`
);

// 6. Capital Variable Separation
assert(
  res.founderMetrics.availableCapital.includes("50,000") || res.founderMetrics.availableCapital.includes("100,000"),
  "Available Capital preserves $50k-$100k NZD",
  `Available Capital: ${res.founderMetrics.availableCapital}`
);
assert(
  res.founderMetrics.initialRiskCapital.includes("500"),
  "Initial Risk Capital preserves $500 NZD input",
  `Risk Capital: ${res.founderMetrics.initialRiskCapital}`
);
assert(
  !JSON.stringify(res.whatNotToBuild || []).includes("50,000") && !JSON.stringify(res.summaryBlock || {}).includes("risk budget ($50,000"),
  "Initial risk budget does not output $50k-$100k available capital range",
  `Check capital output`
);

// 7. Business Model Snapshot Grounding
assert(
  !res.businessModelSnapshot.targetCustomer.includes("Commercial businesses seeking workflow efficiency"),
  "Target Customer is grounded in passenger transport & tourists",
  `Customer: ${res.businessModelSnapshot.targetCustomer}`
);
assert(
  res.businessModelSnapshot.targetCustomer.length <= 150,
  "Target Customer is concisely synthesized (< 150 chars, no raw essay dump)",
  `Length: ${res.businessModelSnapshot.targetCustomer.length}`
);
assert(
  res.businessModelSnapshot.revenueModel.toLowerCase().includes("commission") || res.businessModelSnapshot.revenueModel.toLowerCase().includes("booking fee"),
  "Revenue Model reflects transport commission / transaction fees, not software subscription",
  `Revenue Model: ${res.businessModelSnapshot.revenueModel}`
);
assert(
  res.businessModelSnapshot.keyCosts.toLowerCase().includes("software development") || res.businessModelSnapshot.keyCosts.toLowerCase().includes("driver"),
  "Key Costs reflects marketplace development and driver onboarding",
  `Key Costs: ${res.businessModelSnapshot.keyCosts}`
);
assert(
  res.businessModelSnapshot.customerAcquisition.toLowerCase().includes("discovery") || res.businessModelSnapshot.customerAcquisition.toLowerCase().includes("tourism") || res.businessModelSnapshot.customerAcquisition.toLowerCase().includes("hotel"),
  "Customer Acquisition leverages existing transport and tourism relationships",
  `Customer Acq: ${res.businessModelSnapshot.customerAcquisition}`
);

// 8. Action Plan Length & Synthesis
let longExplanations = [];
for (const act of res.summaryBlock.threePriorityActions) {
  if (act.explanation.length > 250) {
    longExplanations.push(act.heading);
  }
}
assert(
  longExplanations.length === 0,
  "All 3 Priority Actions are concise synthesis (<= 250 chars)",
  `Over limit: ${longExplanations.join(', ')}`
);

// 9. Market Insights Relevance
assert(
  res.marketInsights && (JSON.stringify(res.marketInsights).toLowerCase().includes("samoa") || JSON.stringify(res.marketInsights).toLowerCase().includes("apia") || JSON.stringify(res.marketInsights).toLowerCase().includes("driver")),
  "Market Insights addresses local passenger transport, Apia/Samoa, and driver liquidity",
  `Market Insights: ${JSON.stringify(res.marketInsights).substring(0, 100)}...`
);

// 10. Future Trends Relevance
assert(
  res.futureTrends && (res.futureTrends.dimensions?.demandTrend?.toLowerCase().includes("passenger") || res.futureTrends.dimensions?.demandTrend?.toLowerCase().includes("tourism") || res.futureTrends.dimensions?.demandTrend?.toLowerCase().includes("transport")),
  "Future Trends reflects mobility & passenger demand rather than SaaS trends",
  `Demand Trend: ${res.futureTrends.dimensions?.demandTrend}`
);

// 11. Full Integrity Gate Validation
let integrityPassed = false;
try {
  validateReportIntegrityGate(res, leRideInput);
  integrityPassed = true;
} catch (e) {
  console.error("Integrity gate error:", e.message);
}
assert(
  integrityPassed,
  "Report passes all 22 validateReportIntegrityGate assertions",
  `Passed: ${integrityPassed}`
);

console.log("\n==========================================================================");
console.log(`🏁 LERIDE SUITE COMPLETE: ${passed}/${total} ASSERTIONS PASSED`);
console.log("==========================================================================");

if (passed !== total) {
  process.exit(1);
} else {
  console.log("🎉 ALL LERIDE SYSTEM INTEGRITY REQUIREMENTS FULLY VERIFIED!");
}
