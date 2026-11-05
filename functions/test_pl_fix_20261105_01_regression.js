process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const assert = require('assert');
const path = require('path');
const scoringLogic = require('./scoring_logic');
const functionsIndex = require('./index');

console.log("========================================================================");
console.log("🚀 RUNNING 5-ARCHETYPE REGRESSION TEST SUITE: TASK PL-FIX-20261105-01");
console.log("========================================================================\n");

// -----------------------------------------------------------------------------
// Test 1: Customer Segment Sanitization & Mid-Word Slicing Fix (Defects A & D)
// -----------------------------------------------------------------------------
console.log("🧪 Test 1: Customer Segment Sanitization & Truncation Safety");
const rawTargetInput = "Our primary target customers are individuals with business ideas who lack commercial experience, early-stage startup founders seeking objective feedback before spending capital, and entrepreneurship support organisations (incubators, accelerators, university centres) that need an efficient initial screening mechanism to evaluate cohort applications.";

const cleanedSegment = scoringLogic.extractCleanCustomerSegmentLabel(rawTargetInput);
console.log(`   Cleaned Segment: "${cleanedSegment}"`);
assert(!cleanedSegment.toLowerCase().startsWith("our primary target"), "FAIL: Preamble 'Our primary target' not stripped");
assert(!cleanedSegment.toLowerCase().startsWith("our target"), "FAIL: Preamble 'Our target' not stripped");
assert(!/\bcomme\b/i.test(cleanedSegment), "FAIL: Mid-word truncation 'comme.' detected");
assert(!cleanedSegment.endsWith("comme"), "FAIL: Sliced mid-word at 'comme'");
assert(!cleanedSegment.endsWith("who lack") && !cleanedSegment.includes("who lack)"), "FAIL: Mid-clause dangling slice 'who lack' detected");

const synthesizeTargetCustomerLabel = functionsIndex._testHelpers?.synthesizeTargetCustomerLabel || functionsIndex.synthesizeTargetCustomerLabel;
const synthesizedLabel = synthesizeTargetCustomerLabel(rawTargetInput, "Decision Support / B2B SaaS", "PitchLab");
console.log(`   Synthesized Label: "${synthesizedLabel}"`);
assert(!synthesizedLabel.includes("who lack"), "FAIL: Broken fragment 'who lack' in synthesized target customer label");
assert(synthesizedLabel.length <= 100, `FAIL: synthesizedLabel too long (${synthesizedLabel.length})`);
console.log("   ✅ Test 1 Passed\n");

// -----------------------------------------------------------------------------
// Test 2: Archetype 5 — PitchLab Self-Assessment (AI Decision Support Software)
// -----------------------------------------------------------------------------
console.log("🧪 Test 2: Archetype 5 — PitchLab (AI Decision Support Software)");
const pitchLabInputs = {
  evaluationId: "eval-pitchlab-self-assessment",
  submissionId: "sub-pitchlab-001",
  userId: "user-pitchlab-admin",
  founderName: "Peter Thomson",
  idea: "PitchLab is an idea portfolio decision platform. It takes a founder's business idea through a structured 17-step questionnaire, analyzes the concept across commercial, financial, regulatory, and founder-fit dimensions, and produces an investor-grade 22-section validation report with a clear portfolio decision (PURSUE, INVESTIGATE, PARK, or STOP) and a 90-day validation roadmap.",
  solution: "PitchLab is a working MVP / AI-powered business assessment platform that provides comprehensive commercial feasibility analysis, financial models, risk scores, and 90-day execution roadmaps.",
  problem: "Most early-stage founders spend months and thousands of dollars pursuing flawed business ideas because they lack objective, structured commercial feedback before committing capital and quitting their jobs.",
  targetMarket: rawTargetInput,
  category: "Decision Support / AI Software",
  locationCountry: "New Zealand",
  locationCity: "Auckland",
  locationSummary: "Auckland, New Zealand",
  founderBackgroundNarrative: "12+ years startup mentoring, commercial business advisory, and software product leadership. Deep experience in financial modeling, startup evaluation, and venture incubation. Currently leading product architecture and commercial design of PitchLab.",
  founderExperience: "12+ years startup advisory and product architecture",
  industryExperience: "10+ years commercial advisory and venture incubation",
  weeklyAvailableHours: "20–30 hours/week",
  timeAvailable: "20-30",
  availableCapital: "$10,000–$25,000 NZD",
  initialRiskCapital: "$5,000 NZD",
  businessStage: "Working MVP / Prototype ready"
};

// 2A. Venture Type Classification
const classifiedType = scoringLogic.classifyVentureType(pitchLabInputs);
console.log(`   Classified venture type: "${classifiedType}"`);
assert(classifiedType.includes("Decision Support") || classifiedType.includes("Software") || classifiedType.includes("SaaS"), "FAIL: PitchLab misclassified");

// 2B. Mock Evaluation Output Generation
const pitchLabRaw = functionsIndex.getMockResult(pitchLabInputs);
const pitchLabEval = pitchLabRaw.output || pitchLabRaw;

// 2C. Executive Summary Formatting & Concatenation Check (Defect A)
console.log("   Checking Executive Summary (Defect A)...");
const execSummary = pitchLabEval.executiveSummary || "";
assert(!execSummary.includes("The offering is designed to serve Our primary target customers"), "FAIL: Malformed concatenation detected in Exec Summary");
assert(!execSummary.includes("designed to serve Our target customers"), "FAIL: Malformed prefix concatenation detected");
assert(!execSummary.includes("manual spreadsheets"), "FAIL: Banned SaaS term 'manual spreadsheets' in Exec Summary");
assert(execSummary.includes("aspiring entrepreneurs, startup founders, and innovation programmes") || execSummary.includes("individuals with business ideas"), "FAIL: Target customer missing from Exec Summary");
assert(execSummary.includes("live, functioning web MVP"), "FAIL: Submitted MVP status not recognized in Exec Summary");

// 2D. Immediate 7-Day Action & Final Action Plan Check (Defect B & E)
console.log("   Checking Action Plan & Immediate 7-Day Action (Defect B & E)...");
const imm7 = pitchLabEval.actionPlan?.immediate7DayAction || pitchLabEval.immediate7DayAction || "";
console.log(`   Immediate 7-Day Action: "${imm7}"`);
assert(!imm7.includes("who lack"), "FAIL: Broken parenthetical fragment '(individuals with business ideas who lack)' in Immediate Action");
assert(!/\([A-Za-z\s]+who lack[^)]*\)/.test(imm7), "FAIL: Unfinished clause in Immediate Action");
assert(imm7.includes("Outreach to 20 prospective founders") && imm7.includes("14 structured discovery interviews"), "FAIL: PitchLab-calibrated immediate outreach/discovery step missing");

// 2E. Validation Target Reconciliation
console.log("   Checking Validation Target Reconciliation...");
const phases = pitchLabEval.ninetyDayPhases || pitchLabEval.actionPlan?.ninetyDayPhases || [];
const roadmap = pitchLabEval.ninetyDayRoadmap || pitchLabEval.actionPlan?.ninetyDayRoadmap || {};

// Phase 1: 14 discovery interviews (10 founders + 4 accelerator managers)
assert(phases[0].activities[1].includes("14 structured discovery interviews"), "FAIL: Phase 1 interview count not 14");
assert(roadmap.steps[0].tasks.includes("schedule 14 discovery interviews") || roadmap.steps[0].tasks.includes("14 discovery interviews"), "FAIL: Step 1 not reconciled to 14 interviews");
assert(roadmap.steps[0].evidence.includes("14 interview bookings"), "FAIL: Step 1 evidence metric not 14");

// Phase 2: 8 multi-archetype evaluation audits with 6 test founders
assert(phases[1].activities[0].includes("8 sample business ideas"), "FAIL: Phase 2 sample count not 8");
assert(phases[1].activities[1].includes("6 target founders"), "FAIL: Phase 2 founder count not 6");
assert(roadmap.steps[2].tasks.includes("8 diverse archetype evaluations"), "FAIL: Step 3 not reconciled to 8 evaluations");
assert(roadmap.steps[3].tasks.includes("6 test founders"), "FAIL: Step 4 not reconciled to 6 test founders");

// Phase 3: 10 pricing presentations to secure 3 paid assessment purchases ($49–$99/report or $199/yr)
assert(phases[2].activities[0].includes("10 prospective founders"), "FAIL: Phase 3 pricing presentations not 10");
assert(phases[2].activities[1].includes("3 paid assessment purchases"), "FAIL: Phase 3 paid conversions not 3");
assert(roadmap.steps[4].evidence.includes("3 paid assessment commitments"), "FAIL: Step 5 paid commitments not 3");

// 2F. Market Insights & Future Trends (Defect C)
console.log("   Verifying Market Insights & Future Trends (Defect C)...");
const fullPitchLabText = JSON.stringify(pitchLabEval);
assert(!fullPitchLabText.includes("manual spreadsheets"), "FAIL: Banned SaaS term 'manual spreadsheets' found in PitchLab report");
assert(!fullPitchLabText.includes("administrative overhead reduction"), "FAIL: Banned SaaS term 'administrative overhead reduction' found");
assert(!fullPitchLabText.includes("horizontal productivity tools"), "FAIL: Banned SaaS term 'horizontal productivity tools' found");
assert(pitchLabEval.marketInsights?.marketLandscape?.includes("decision support") || pitchLabEval.marketInsights?.marketLandscape?.includes("idea validation"), "FAIL: Market landscape not calibrated for AI Decision Support");

// 2G. Founder Capability & Technical Gap Calibration
console.log("   Checking Founder Capability Calibration...");
const founderScore = pitchLabEval.scorecard?.founderCapabilityFit?.scoreAchieved || pitchLabEval.scores?.founderCapabilityFit?.scoreAchieved || pitchLabEval.categoryScores?.founderCapabilityFit?.scoreAchieved;
console.log(`   Founder Fit Score Achieved: ${founderScore}/15`);
assert(founderScore <= 12, `FAIL: Founder score (${founderScore}) not capped at 12 despite missing technical lead/DevOps role`);
const founderRole = pitchLabEval.founderCapabilityBreakdown?.founderProposedRole || pitchLabEval.authoritativeSnapshot?.founderCapabilityBreakdown?.founderProposedRole;
console.log("   Actual founderRole:", founderRole);
console.log("   pitchLabEval keys:", Object.keys(pitchLabEval).filter(k => k.includes("founder") || k.includes("auth")));
assert(founderRole.startsWith("Founder, Product Architect & Commercial Lead"), "FAIL: Custom founder proposed role missing");

// 2H. Report Integrity Gate Verification (Rules 34 to 38)
console.log("   Running validateReportIntegrityGate for PitchLab...");
const plGatePassed = scoringLogic.validateReportIntegrityGate(pitchLabEval, pitchLabInputs, pitchLabEval);
assert.strictEqual(plGatePassed, true, "FAIL: validateReportIntegrityGate threw an error for PitchLab");
console.log("   ✅ Test 2 Passed\n");

// -----------------------------------------------------------------------------
// Test 3: Archetype 1 — MoorSafe Premium (Hardware / Physical Product)
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
// Test 4: Archetype 2 — Nuclear Power Plant NZ (Energy Infrastructure)
// -----------------------------------------------------------------------------
console.log("🧪 Test 4: Archetype 2 — Nuclear Power Plant NZ (Energy Infrastructure)");
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

// -----------------------------------------------------------------------------
// Test 6: Archetype 4 — LeRide Samoa (Transport Marketplace)
// -----------------------------------------------------------------------------
console.log("🧪 Test 6: Archetype 4 — LeRide Samoa (Transport Marketplace)");
const leRideInputs = {
  idea: "LeRide",
  solution: "A two-sided mobile ride booking application connecting passengers with licensed, vetted taxi and transport operators in Samoa.",
  problem: "Transport booking in Samoa is fragmented, unreliable, and largely unmetered.",
  targetMarket: "Tourists, locals, hotel guests, and business travellers in Apia and airport transit corridors across Upolu.",
  category: "General",
  locationCountry: "Samoa",
  locationCity: "Apia",
  locationSummary: "Apia, Samoa",
  founderBackgroundNarrative: "I currently own and operate Discovery Rentals & Tours and New Discovery Group in Samoa.",
  founderExperience: "Managing director of Discovery Rentals & Tours and New Discovery Group",
  industryExperience: "8+ years in tourism, vehicle rental, and fleet transport operations in Samoa",
  businessStage: "Idea only"
};
const leRideRaw = functionsIndex.getMockResult(leRideInputs);
const leRideEval = leRideRaw.output || leRideRaw;
assert.strictEqual(leRideEval.masterRecommendation, "INVESTIGATE");
assert.strictEqual(leRideEval.businessTheme.primaryTheme, "Transportation / Mobility");
const leRideGate = scoringLogic.validateReportIntegrityGate(leRideEval, leRideInputs, leRideEval);
assert.strictEqual(leRideGate, true, "FAIL: validateReportIntegrityGate threw an error for LeRide");
console.log("   ✅ Test 6 Passed\n");

// -----------------------------------------------------------------------------
// Test 7: Negative Quality-Control Assertions (Rules 34 to 38 Gate Triggers)
// -----------------------------------------------------------------------------
console.log("🧪 Test 7: Integrity Gate Negative Testing (Rules 34–38)");

// 7A. Test Rule 34: Malformed Concatenation
assert.throws(() => {
  const badEval = JSON.parse(JSON.stringify(pitchLabEval));
  badEval.executiveSummary = "The offering is designed to serve Our primary target customers are individuals...";
  scoringLogic.validateReportIntegrityGate(badEval, pitchLabInputs, badEval);
}, /Rule 34|Malformed conversational sentence concatenation/i, "FAIL: Rule 34 did not trip on malformed concatenation");

// 7B. Test Rule 35: Truncated Word
assert.throws(() => {
  const badEval = JSON.parse(JSON.stringify(pitchLabEval));
  badEval.executiveSummary = "Assessments evaluate comme. viability.";
  badEval.problemAnalysis = "Assessments evaluate comme. viability.";
  scoringLogic.validateReportIntegrityGate(badEval, pitchLabInputs, badEval);
}, /Rule 35|Truncated word artifact/i, "FAIL: Rule 35 did not trip on truncated word 'comme.'");

// 7C. Test Rule 36: Unfinished Parenthetical Fragment
assert.throws(() => {
  const badEval = JSON.parse(JSON.stringify(pitchLabEval));
  badEval.actionPlan.immediate7DayAction = "Engage 10 (individuals with business ideas who lack) for discovery.";
  scoringLogic.validateReportIntegrityGate(badEval, pitchLabInputs, badEval);
}, /Rule 36|Unfinished parenthetical customer fragment/i, "FAIL: Rule 36 did not trip on '(who lack)' fragment");

// 7D. Test Rule 37: Banned Enterprise Workflow Phrases in AI Decision Software
assert.throws(() => {
  const badEval = JSON.parse(JSON.stringify(pitchLabEval));
  badEval.marketInsights.marketLandscape = "PitchLab replaces manual spreadsheets and legacy workflows.";
  scoringLogic.validateReportIntegrityGate(badEval, pitchLabInputs, badEval);
}, /Rule 37|Prohibited generic enterprise workflow phrase/i, "FAIL: Rule 37 did not trip on 'manual spreadsheets'");

// 7E. Test Rule 38: Target Customer Label Sanity Gate
assert.throws(() => {
  const badEval = JSON.parse(JSON.stringify(pitchLabEval));
  badEval.businessModelSnapshot.targetCustomer = "Our primary target customers are founders";
  scoringLogic.validateReportIntegrityGate(badEval, pitchLabInputs, badEval);
}, /Rule 38|Malformed targetCustomer label/i, "FAIL: Rule 38 did not trip on 'Our primary target'");

console.log("   ✅ Test 7 Passed (All Negative Gate Checks Tripped Correctly)\n");

console.log("========================================================================");
console.log("🎉 ALL 5-ARCHETYPE REGRESSION & INTEGRITY TESTS PASSED (100% GREEN)!");
console.log("========================================================================");
