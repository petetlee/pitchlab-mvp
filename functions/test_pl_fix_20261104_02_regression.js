process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const assert = require('assert');
const path = require('path');
const scoringLogic = require('./scoring_logic');
const functionsIndex = require('./index');

console.log("========================================================================");
console.log("🚀 RUNNING 4-ARCHETYPE REGRESSION TEST SUITE: TASK PL-FIX-20261104-02");
console.log("========================================================================\n");

// -----------------------------------------------------------------------------
// Test 1: Strip Markdown & Clean Text Utility Verification
// -----------------------------------------------------------------------------
console.log("🧪 Test 1: Markdown Header & Artifact Stripping");
const dirtyMarket = "## The Market LeRide is targeting\n\nTourists, locals, and business travellers across Samoa.";
const cleanSegment = scoringLogic.extractCleanCustomerSegmentLabel(dirtyMarket);
console.log(`   Clean segment extracted: "${cleanSegment}"`);
assert(!cleanSegment.includes("##"), "FAIL: Markdown '##' leaked into customer segment");
assert(!cleanSegment.includes("The Market LeRide is targeting"), "FAIL: Prefix not stripped");
assert(cleanSegment.includes("Tourists, locals, and business travellers across Samoa"), "FAIL: Target text missing");

// Problem misclassification with dirty market header
const misclass = scoringLogic.detectProblemStatementMisclassification({
  idea: "LeRide",
  problem: "Need to build an initial user base and hire a driver manager.",
  targetMarket: dirtyMarket
});
console.log(`   Inferred problem: "${misclass.inferredCustomerProblem}"`);
assert(!misclass.inferredCustomerProblem.includes("##"), "FAIL: Markdown '##' leaked into inferred customer problem");
assert(!misclass.inferredCustomerProblem.includes("(\"##"), "FAIL: Quotation artifact leaked");
console.log("   ✅ Test 1 Passed\n");

// -----------------------------------------------------------------------------
// Test 2: Archetype 4 — LeRide Samoa (Two-Sided Transport Marketplace)
// -----------------------------------------------------------------------------
console.log("🧪 Test 2: Archetype 4 — LeRide Samoa Transport Marketplace");
const leRideInputs = {
  evaluationId: "eval-leride-samoa-regression",
  submissionId: "sub-leride-001",
  userId: "user-leride-123",
  founderName: "Test Founder",
  idea: "LeRide",
  solution: "A two-sided mobile ride booking application connecting passengers with licensed, vetted taxi and transport operators in Samoa.",
  problem: "Transport booking in Samoa is fragmented, unreliable, and largely unmetered, creating price uncertainty for tourists and local commuters while leaving drivers with high idle time.",
  targetMarket: "## The Market LeRide is targeting\n\nTourists, locals, hotel guests, and business travellers in Apia and airport transit corridors across Upolu.",
  category: "General", // purposely set to General to verify robust classification!
  locationCountry: "Samoa",
  locationCity: "Apia",
  locationSummary: "Apia, Samoa",
  founderBackgroundNarrative: "I currently own and operate Discovery Rentals & Tours and New Discovery Group in Samoa. We have strong working relationships with local taxi associations, fleet owners, and hotel concierges across Upolu. In my spare time I enjoy fishing and outrigger canoeing.",
  founderExperience: "Managing director of Discovery Rentals & Tours and New Discovery Group",
  industryExperience: "8+ years in tourism, vehicle rental, and fleet transport operations in Samoa",
  weeklyAvailableHours: "0–5 hours/week",
  timeAvailable: "0-5",
  availableCapital: "$1,000–$5,000 NZD",
  initialRiskCapital: "$1,000 NZD",
  businessStage: "Idea only"
};

// 2A. Venture Type Classification
const classifiedType = scoringLogic.classifyVentureType(leRideInputs);
console.log(`   Classified venture type: "${classifiedType}"`);
assert.strictEqual(classifiedType, 'Transportation / Mobility / Marketplace', "FAIL: LeRide misclassified");

// 2B. Mock Evaluation Output Generation
const leRideRaw = functionsIndex.getMockResult(leRideInputs);
const leRideEval = leRideRaw.output || leRideRaw;

// 2C. Primary & Secondary Theme Verification
console.log(`   Primary Theme: "${leRideEval.businessTheme.primaryTheme}"`);
console.log(`   Secondary Theme: "${leRideEval.businessTheme.secondaryTheme}"`);
assert.strictEqual(leRideEval.businessTheme.primaryTheme, 'Transportation / Mobility', "FAIL: Primary theme not Transportation / Mobility");
assert.strictEqual(leRideEval.businessTheme.secondaryTheme, 'Local Passenger Mobility & Booking Marketplace', "FAIL: Secondary theme not Local Passenger Mobility & Booking Marketplace");

// 2D. Executive Summary Synthesis Verification
console.log("   Checking Executive Summary (3 paragraphs)...");
const execSummary = leRideEval.executiveSummary;
assert(!execSummary.includes("##"), "FAIL: Markdown '##' leaked into Executive Summary");
assert(!execSummary.includes("(\"##"), "FAIL: Quote artifact leaked into Executive Summary");
assert(execSummary.includes("LeRide is a proposed two-sided digital ride-booking"), "FAIL: Custom LeRide p1 missing");
assert(execSummary.includes("Discovery Rentals & Tours and New Discovery Group"), "FAIL: Founder existing operating business omitted");
assert(execSummary.includes("INVESTIGATE"), "FAIL: Decision missing from Executive Summary");
assert(execSummary.includes("10 passenger and 5 driver discovery interviews"), "FAIL: Phase 1 targets missing from Executive Summary");
assert(execSummary.includes("15 completed airport/hotel transfers"), "FAIL: Phase 2 targets missing from Executive Summary");

// 2E. Validation Plan Target Consistency Verification
console.log("   Checking Validation Plan Reconciliation...");
const phases = leRideEval.ninetyDayPhases || leRideEval.actionPlan?.ninetyDayPhases || [];
const roadmap = leRideEval.ninetyDayRoadmap || leRideEval.actionPlan?.ninetyDayRoadmap || {};

// Phase 1 check: 10 passenger + 5 driver = 15 logs
assert(phases[0].activities[0].includes("10 structured discovery interviews"), "FAIL: Phase 1 passenger count not 10");
assert(phases[0].activities[1].includes("5 licensed taxi and transport operators"), "FAIL: Phase 1 driver count not 5");
assert(roadmap.steps[0].tasks.includes("Interview 10 passengers and 5 local drivers"), "FAIL: Step 1 not reconciled to 10+5");
assert(roadmap.steps[0].evidence.includes("15 completed interview logs"), "FAIL: Step 1 evidence metric not 15");

// Phase 2 check: 15 completed concierge transfers with 3-5 drivers
assert(phases[1].activities[1].includes("3–5 licensed, vetted local drivers"), "FAIL: Phase 2 driver count not 3-5");
assert(phases[1].activities[2].includes("15 real passenger transfer bookings"), "FAIL: Phase 2 transfer count not 15");
assert(roadmap.steps[2].tasks.includes("15 airport/hotel transfers with 3–5 vetted drivers"), "FAIL: Step 3 not reconciled to 15 transfers");
assert(phases[1].successCriteria.includes("driver punctuality >= 90%"), "FAIL: Success criteria not calibrated");
assert(!phases[1].successCriteria.includes("zero driver no-shows"), "FAIL: Uncalibrated zero driver no-shows detected");

// Phase 3 check: 20 cumulative completed rides + 2 hotel agreements
assert(phases[2].activities[0].includes("20 cumulative completed rides"), "FAIL: Phase 3 cumulative rides not 20");
assert(phases[2].activities[1].includes("2 preferred transport partnership agreements"), "FAIL: Phase 3 hotel agreements not 2");
assert(roadmap.steps[4].evidence.includes("2 hotel referral LOIs"), "FAIL: Step 5 hotel LOIs not 2");
assert(roadmap.steps[5].tasks.includes("20 cumulative completed rides"), "FAIL: Step 6 cumulative rides not 20");

// 2F. Cross-Sector Terminology Verification
console.log("   Verifying absence of Hardware BOM / Durability terms...");
const fullLeRideText = JSON.stringify(leRideEval);
assert(!fullLeRideText.includes("unit BOM economics"), "FAIL: 'unit BOM economics' leaked into LeRide report");
assert(!fullLeRideText.includes("prototype durability"), "FAIL: 'prototype durability' leaked into LeRide report");
assert(!fullLeRideText.includes("BOM cost"), "FAIL: 'BOM cost' leaked into LeRide report");

// 2G. Section 5 Founder Capability & Evidence Relied On
console.log("   Verifying Section 5 non-duplication...");
const evidenceReliedOn = leRideEval.founderCapabilityExplanation?.evidenceReliedOn || "";
console.log(`   Synthesized Evidence Relied On: "${evidenceReliedOn}"`);
assert(evidenceReliedOn.length <= 180, `FAIL: evidenceReliedOn too long (${evidenceReliedOn.length} chars)`);
assert(!evidenceReliedOn.includes("In my spare time"), "FAIL: Spare time hobby text leaked into evidenceReliedOn");
assert(evidenceReliedOn.includes("Discovery Rentals & Tours and New Discovery Group"), "FAIL: Operational business omitted from evidenceReliedOn");

// 2H. Samoa Regulatory Citations Verification
console.log("   Verifying Samoa Land Transport Authority (LTA) citations...");
const legalReg = leRideEval.legalRegulatoryAssessment;
assert(legalReg.primaryGatingRisk.includes("Driver Licensing & Transport Authority Regulatory Compliance"), "FAIL: Gating risk mismatch");
assert(legalReg.directlyApplicableLaw.some(l => l.includes("Land Transport Authority Act 2007 (Samoa)")), "FAIL: LTA Act 2007 missing");
assert(legalReg.verifiedFacts.some(f => f.includes("Land Transport Authority (LTA)")), "FAIL: LTA missing from verified facts");
assert(legalReg.verifiedFacts.some(f => f.includes("Samoan Tala (WST)")), "FAIL: WST currency distinction missing");

// 2I. Report Integrity Gate Verification
console.log("   Running validateReportIntegrityGate for LeRide...");
const gatePassed = scoringLogic.validateReportIntegrityGate(leRideEval, leRideInputs, leRideEval);
assert.strictEqual(gatePassed, true, "FAIL: validateReportIntegrityGate threw an error for LeRide");
console.log("   ✅ Test 2 Passed\n");

// -----------------------------------------------------------------------------
// Test 3: Archetype 1 — MoorSafe Premium (Hardware Pest Deterrent)
// -----------------------------------------------------------------------------
console.log("🧪 Test 3: Archetype 1 — MoorSafe Premium (Hardware / Physical Product)");
const moorSafeInputs = {
  idea: "MoorSafe Premium",
  problem: "Rats, mice, and crawling insects board berthed vessels via mooring lines.",
  category: "Physical Product / Hardware",
  targetMarket: "Recreational boat owners, marina berth holders, and commercial vessel operators.",
  founderBackgroundNarrative: "Chartered Accountant (CAANZ / BCom) with commercial and corporate finance experience.",
  businessStage: "Idea only"
};
const moorSafeRaw = functionsIndex.getMockResult(moorSafeInputs);
const moorSafeEval = moorSafeRaw.output || moorSafeRaw;
assert.strictEqual(moorSafeEval.masterRecommendation, "INVESTIGATE");
assert.strictEqual(moorSafeEval.businessTheme.primaryTheme, "Hardware & Physical Product Innovation");
const moorSafeGate = scoringLogic.validateReportIntegrityGate(moorSafeEval, moorSafeInputs, moorSafeEval);
assert.strictEqual(moorSafeGate, true, "FAIL: validateReportIntegrityGate threw an error for MoorSafe");
console.log("   ✅ Test 3 Passed\n");

// -----------------------------------------------------------------------------
// Test 4: Archetype 2 — Nuclear Power Plant NZ (Infrastructure / Statutory Gate)
// -----------------------------------------------------------------------------
console.log("🧪 Test 4: Archetype 2 — Nuclear Power Plant NZ (Infrastructure / Gate)");
const nuclearInputs = {
  idea: "Commercial Small Modular Reactor (SMR) Concept for New Zealand",
  problem: "Providing 24/7 low-carbon baseload electricity to address dry-year hydro risk and industrial decarbonisation.",
  category: "Energy / Infrastructure",
  locationCountry: "New Zealand",
  targetMarket: "Electricity retailers and industrial off-takers.",
  founderBackgroundNarrative: "Chartered Accountant (CAANZ / BCom) with finance and governance background.",
  businessStage: "Idea only"
};
const nuclearRaw = functionsIndex.getMockResult(nuclearInputs);
const nuclearEval = nuclearRaw.output || nuclearRaw;
assert.strictEqual(nuclearEval.masterRecommendation, "PARK");
assert.strictEqual(nuclearEval.businessTheme.primaryTheme, "Energy Infrastructure & Power Generation");
assert(nuclearEval.legalRegulatoryAssessment.directlyApplicableLaw.some(l => l.includes("Atomic Energy Act 1945")), "FAIL: Atomic Energy Act missing");
assert(nuclearEval.legalRegulatoryAssessment.adjacentLawOrPolicy.some(l => l.includes("1987")), "FAIL: 1987 Act missing");
const nuclearGate = scoringLogic.validateReportIntegrityGate(nuclearEval, nuclearInputs, nuclearEval);
assert.strictEqual(nuclearGate, true, "FAIL: validateReportIntegrityGate threw an error for Nuclear");
console.log("   ✅ Test 4 Passed\n");

// -----------------------------------------------------------------------------
// Test 5: Archetype 3 — SmartTax NZ (FinTech / SaaS)
// -----------------------------------------------------------------------------
console.log("🧪 Test 5: Archetype 3 — SmartTax NZ (FinTech / SaaS)");
const smartTaxInputs = {
  idea: "SmartTax Automated GST Reserve App",
  problem: "Small business owners spend their GST reserves and face unexpected tax debts with Inland Revenue.",
  category: "FinTech / Software",
  locationCountry: "New Zealand",
  targetMarket: "Small businesses, contractors, and sole traders across New Zealand.",
  founderBackgroundNarrative: "Chartered Accountant (CAANZ / BCom) with 15 years commercial accounting background.",
  businessStage: "Idea only"
};
const smartTaxRaw = functionsIndex.getMockResult(smartTaxInputs);
const smartTaxEval = smartTaxRaw.output || smartTaxRaw;
const fullSmartTaxText = JSON.stringify(smartTaxEval);
assert(!fullSmartTaxText.includes("unit BOM economics"), "FAIL: BOM economics leaked into SmartTax");
assert(!fullSmartTaxText.includes("prototype durability"), "FAIL: Prototype durability leaked into SmartTax");
const smartTaxGate = scoringLogic.validateReportIntegrityGate(smartTaxEval, smartTaxInputs, smartTaxEval);
assert.strictEqual(smartTaxGate, true, "FAIL: validateReportIntegrityGate threw an error for SmartTax");
console.log("   ✅ Test 5 Passed\n");

console.log("========================================================================");
console.log("🎉 ALL 4-ARCHETYPE REGRESSION TESTS PASSED SUCCESSFULLY (100% GREEN)");
console.log("========================================================================");
