/**
 * Comprehensive Automated Regression Test Suite for PL-FIX-20261103-01
 * PitchLab MVP v0.12.5 • Build sr20261103a • Task PL-FIX-20261103-01
 */

const assert = require('assert');
const path = require('path');
const {
  SCORING_CONFIG,
  reconcileScores,
  getScoreBand,
  computeMasterRecommendation,
  buildScoringRubricAndIndicators,
  buildEvidenceClassificationRegistry,
  detectFeasibilityGates,
  classifyVentureType,
  normalizeFounderTimeCommitment,
  normalizeFounderCapital,
  detectProblemStatementMisclassification,
  buildAuthoritativeAssessmentSnapshot,
  computeInputCoverageAudit,
  calculate5DimensionFutureTrends,
  getCommercialAdviserOpinion,
  getPortfolioDecision,
  generateContextualScoreExplanation,
  generateContextualInvestorCommentary,
  getLegalRegulatoryAssessment,
  generateContextualInvestorVerdict,
  validateReportIntegrityGate
} = require('./scoring_logic');

const VERSION_INFO = require('./version_config.json');

console.log('================================================================');
console.log('RUNNING REGRESSION TEST SUITE: PL-FIX-20261103-01');
console.log(`Version: ${VERSION_INFO.fullVersionString} | Build: ${VERSION_INFO.buildId} | Task: ${VERSION_INFO.changeId}`);
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE A: MoorSafe Premium Regression
// -----------------------------------------------------------------------------
console.log('--- Test Suite A: MoorSafe Premium Hardware Assessment ---');

const moorSafeInputs = {
  idea: 'MoorSafe Premium — Solar-Powered Marine Pest Deterrent mounted on mooring ropes to prevent rodents and insects from boarding vessels',
  problem: 'Rats, mice, cockroaches and ants climb along mooring ropes from docks, wharves and shoreline moorings to infest berthed boats, causing hygiene risks, chewed marine electrical wiring, upholstery damage, and island biosecurity threats.',
  targetMarket: 'Recreational boat owners, cruising yachts, launches, liveaboards, and commercial marina operators in New Zealand and international coastal regions. These users already spend heavily on maintenance and protection, indicating willingness to pay for a reliable solution. Existing solutions like plastic guards are unreliable, hard to fit, or ineffective against smaller pests.',
  category: 'Physical Consumer Product / Hardware',
  locationCountry: 'New Zealand',
  locationRegion: 'Auckland',
  locationCity: 'Auckland',
  locationSummary: 'Auckland, New Zealand',
  businessStage: 'Just an idea',
  timeCommitment: '10–15 hours/week',
  investmentCommitment: '$10,000–$25,000',
  budget: '$10,000–$25,000',
  customerValidation: '0 potential customers',
  network: 'Access to marina contacts and boat owners',
  founderExperience: 'Yes – successfully sold',
  industryExperience: '3-5 years',
  experience: 'Chartered Accountant (CAANZ), BCom. Founder Background Narrative: 20+ years in commercial finance, financial modelling, operations, and business scaling. Keen boat owner with direct experience of marine pest problems.',
  founderBackgroundNarrative: '20+ years in commercial finance, financial modelling, operations, and business scaling. Keen boat owner with direct experience of marine pest problems.',
  founderMotivation: 'Build a profitable international marine hardware brand solving an unaddressed biosecurity problem.',
  biggestObstacle: 'Engineering a durable, waterproof low-voltage electrical deterrent circuit and verifying customer willingness to pay.'
};

runTest('Suite A.1: Time Commitment Normalization does not fallback to 0–5 hrs/wk', () => {
  const tNorm = normalizeFounderTimeCommitment(moorSafeInputs);
  assert.strictEqual(tNorm.normalizedBand, '10–15 hours/week');
  assert.strictEqual(tNorm.hoursPerWeek, 12);
  assert.strictEqual(tNorm.stepHoursLabel, '10–15 hrs/wk');
});

runTest('Suite A.2: Authoritative Snapshot isolates submitted concept & prototype stage', () => {
  const snap = buildAuthoritativeAssessmentSnapshot(moorSafeInputs, 'eval_moorsafe_test', 'sub_moorsafe_test');
  assert.strictEqual(snap.prototypeStageStatus.hasPrototypeSubmitted, false);
  assert.strictEqual(snap.prototypeStageStatus.noPrototypeInvented, true);
  assert.ok(snap.excludedHistoricalOrAlternativeWork.includes('adhesive-disc') || snap.excludedHistoricalOrAlternativeWork.includes('strictly on the submitted'));
  assert.strictEqual(snap.coreProblemStatement.includes('mooring ropes'), true);
});

runTest('Suite A.3: MoorSafe Scorecard Reconciliation & Single Decision INVESTIGATE', () => {
  const reconciled = reconcileScores({}, moorSafeInputs);
  assert.strictEqual(reconciled.masterRecommendation, 'INVESTIGATE');
  assert.strictEqual(reconciled.portfolioDecision, 'INVESTIGATE');
  assert.ok(reconciled.overallScore >= 50 && reconciled.overallScore <= 65, `Expected score 50-65, got ${reconciled.overallScore}`);
  assert.strictEqual(reconciled.categoryScores.problemCustomerClarity.scoreAchieved, 12);
  assert.strictEqual(reconciled.categoryScores.customerValidation.scoreAchieved, 1);
});

runTest('Suite A.4: Score Explanations qualify founder claims as Untested Assumptions', () => {
  const reconciled = reconcileScores({}, moorSafeInputs);
  const probExp = reconciled.categoryScores.problemCustomerClarity.explanation;
  assert.ok(probExp.includes('[Founder Input]'), 'Should label problem definition as [Founder Input]');
  assert.ok(probExp.includes('[Untested Assumption]'), 'Should qualify unverified customer spending/guard claims as [Untested Assumption]');
  assert.ok(!probExp.includes('These users already spend heavily on maintenance and protection, indicating willingness to pay for a reliable solution'), 'Must not echo multi-sentence targetMarket verbatim as fact');
});

runTest('Suite A.5: Founder Capability Fit distinguishes founder CA role from engineering partners', () => {
  const reconciled = reconcileScores({}, moorSafeInputs);
  const fExp = reconciled.categoryScores.founderCapabilityFit.explanation;
  assert.ok(fExp.includes('Chartered Accountant') || fExp.includes('CA / BCom') || fExp.includes('commercial'), 'Should acknowledge founder CA credentials');
  assert.ok(fExp.includes('outsourced') || fExp.includes('partnered') || fExp.includes('specialist'), 'Should note engineering is outsourced/partnered');
});

// -----------------------------------------------------------------------------
// TEST SUITE B: Nuclear Power NZ Regression
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite B: Commercial Small Modular Reactor Concept ---');

const nuclearInputs = {
  idea: 'Commercial Small Modular Reactor (SMR) nuclear electricity generation for New Zealand baseload power',
  problem: 'New Zealand electricity grid faces winter dry-year supply shortages, high wholesale electricity price volatility, and increasing industrial demand driven by electrification and data centres requiring 24/7 firm low-carbon baseload energy.',
  targetMarket: 'New Zealand industrial electricity off-takers, national electricity retailers, and Transpower national grid connection.',
  category: 'Energy / Infrastructure / Heavy Industrial',
  locationCountry: 'New Zealand',
  locationSummary: 'New Zealand',
  businessStage: 'Just an idea',
  timeCommitment: '0-5 hours/week',
  investmentCommitment: '$0–$500',
  budget: '$0–$500',
  customerValidation: '0 potential customers',
  experience: 'Chartered Accountant (CAANZ), BCom. Senior commercial financial manager with 20+ years in corporate finance, financial structuring, and executive governance.',
  founderBackgroundNarrative: 'Chartered Accountant (CAANZ), BCom. Senior commercial financial manager with 20+ years in corporate finance, financial structuring, and executive governance.',
  founderMotivation: 'Explore long-term commercial solutions to national energy security and decarbonisation.',
  biggestObstacle: 'Uncertain regulatory and licensing pathway in New Zealand and extreme capital scale requirements.'
};

runTest('Suite B.1: Single Master Decision is PARK (not STOP — Current Formulation)', () => {
  const reconciled = reconcileScores({}, nuclearInputs);
  assert.strictEqual(reconciled.masterRecommendation, 'PARK');
  assert.strictEqual(reconciled.portfolioDecision, 'PARK');
  assert.strictEqual(reconciled.portfolioMeta.decisionState, 'PARK');
  assert.strictEqual(reconciled.portfolioMeta.portfolioDecision, 'PARK');
});

runTest('Suite B.2: Problem Clarity (14/14) vs Customer Validation (1/20) vs Future Trends (1/5)', () => {
  const reconciled = reconcileScores({}, nuclearInputs);
  assert.strictEqual(reconciled.categoryScores.problemCustomerClarity.scoreAchieved, 14);
  assert.strictEqual(reconciled.categoryScores.customerValidation.scoreAchieved, 1);
  assert.strictEqual(reconciled.categoryScores.futureTrends.scoreAchieved, 1);
  assert.strictEqual(reconciled.overallScore, 27);
  assert.strictEqual(reconciled.categoryScores.problemCustomerClarity.explanation.includes('Problem & Customer Clarity (14/14)'), true);
});

runTest('Suite B.3: Legal Regulatory Assessment accurately cites statutes and rejects blanket ban myth', () => {
  const reconciled = reconcileScores({}, nuclearInputs);
  const leg = reconciled.legalRegulatoryAssessment;
  assert.strictEqual(leg.primaryGatingRisk, 'Statutory & Regulatory Permissibility');
  assert.ok(leg.regulatoryStatusCategory.includes('4. Activities without an established or complete regulatory pathway'));
  assert.ok(leg.directlyApplicableLaw.some(l => l.includes('Atomic Energy Act 1945')));
  assert.ok(leg.directlyApplicableLaw.some(l => l.includes('Radiation Safety Act 2016')));
  assert.ok(leg.directlyApplicableLaw.some(l => l.includes('Resource Management Act 1991')));
  assert.ok(leg.adjacentLawOrPolicy.some(l => l.includes('Nuclear Free Zone') && l.includes('does not contain an express blanket statutory prohibition on land-based civilian nuclear electricity generation')));
});

runTest('Suite B.4: Future Trends separates 7/10 macro decarbonisation from 1/5 scorecard cap', () => {
  const ft5D = calculate5DimensionFutureTrends(nuclearInputs, { hasCriticalGate: true }, 'Energy & Infrastructure', {});
  assert.strictEqual(ft5D.trendAlignmentScore, 7);
  assert.strictEqual(ft5D.currentCommercialAccessibility, 1);
  assert.ok(ft5D.solutionOutlook.includes('PARKED'));
});

runTest('Suite B.5: Commercial Adviser Opinion aligns with PARK and Stage Gate 1 Scoping', () => {
  const opinion = getCommercialAdviserOpinion({ overallScore: 27, masterRecommendation: 'PARK' }, 'Energy & Infrastructure', { hasCriticalGate: true }, nuclearInputs);
  assert.strictEqual(opinion.masterRecommendation, 'PARK');
  assert.strictEqual(opinion.portfolioDecision, 'PARK');
  assert.ok(opinion.opinionNarrative.includes('Stage Gate 1') || opinion.opinionNarrative.includes('statutory and regulatory'));
});

// -----------------------------------------------------------------------------
// TEST SUITE C: Single Authoritative Master Decision Consistency
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite C: Single Authoritative Master Decision Consistency ---');

runTest('Suite C.1: Canonical decisions set strictly enforced across all states', () => {
  const canonical = ['PURSUE', 'INVESTIGATE', 'PARK', 'STOP'];
  const testScores = [
    { score: 85, val: 15, expected: 'PURSUE' },
    { score: 58, val: 3, expected: 'INVESTIGATE' },
    { score: 27, val: 1, expected: 'PARK' },
    { score: 15, val: 0, expected: 'STOP' }
  ];
  for (const ts of testScores) {
    const res = computeMasterRecommendation(ts.score, { customerValidation: { scoreAchieved: ts.val }, problemCustomerClarity: { scoreAchieved: 10 } }, {}, {});
    assert.ok(canonical.includes(res), `${res} must be canonical`);
  }
});

runTest('Suite C.2: computePortfolioMeta delegates cleanly to getPortfolioDecision', () => {
  const pMeta = getPortfolioDecision('PARK', 'Energy & Infrastructure', { hasCriticalGate: true }, nuclearInputs);
  assert.strictEqual(pMeta.portfolioDecision, 'PARK');
  assert.strictEqual(pMeta.decisionState, 'PARK');
});

// -----------------------------------------------------------------------------
// TEST SUITE D: Evidence Classification & Scoring Rubric
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite D: Evidence Classification & Scoring Rubric ---');

runTest('Suite D.1: Evidence Classification Registry classifies 4 distinct categories', () => {
  const reg = buildEvidenceClassificationRegistry(nuclearInputs, { overallScore: 27, masterRecommendation: 'PARK' }, 'Energy & Infrastructure', {});
  assert.ok(Array.isArray(reg.categories.founderProvided));
  assert.ok(Array.isArray(reg.categories.independentlyVerified));
  assert.ok(Array.isArray(reg.categories.aiInference));
  assert.ok(Array.isArray(reg.categories.untestedAssumptions));
  assert.ok(reg.categories.independentlyVerified.some(s => s.sourceName.includes('Nuclear Free Zone')));
  assert.ok(reg.categories.independentlyVerified.some(s => s.sourceName.includes('Atomic Energy Act 1945')));
});

runTest('Suite D.2: Scoring Rubric formula strictly sums to 100', () => {
  const rub = buildScoringRubricAndIndicators(58, {}, moorSafeInputs, {});
  assert.strictEqual(rub.scoringRubric.reconciliationFormula, '14 + 15 + 20 + 14 + 14 + 9 + 9 + 5 = 100');
  assert.strictEqual(rub.scoringRubric.totalMaxPoints, 100);
});

// -----------------------------------------------------------------------------
// TEST SUITE E: Cross-Section QA Integrity Gate
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite E: Cross-Section QA Integrity Gate ---');

const e1Reconciled = reconcileScores({}, moorSafeInputs);
const mockEval = {
  idea: moorSafeInputs.idea,
  problem: moorSafeInputs.problem,
  masterRecommendation: 'INVESTIGATE',
  overallScore: e1Reconciled.overallScore,
  scores: e1Reconciled.categoryScores,
  businessModelSnapshot: {
    targetCustomer: 'Recreational and commercial boat owners berthed in coastal marinas and docks.',
    coreOffering: 'MoorSafe solar-powered low-voltage electrical mooring-rope pest deterrent unit.',
    customerProblem: 'Rodents and insects boarding vessels via mooring lines causing damage and biosecurity risks.',
    valueProposition: 'Continuous, low-maintenance electrical pest deterrence mounted directly on mooring ropes.',
    revenueModel: 'Direct hardware sales with replacement electrodes and optional mounting brackets.',
    customerAcquisition: 'Marine chandlery distribution, yacht club partnerships, and direct marina berth marketing.',
    keyCosts: 'Electronics assembly, solar panels, battery components, waterproof tooling, and logistics.',
    commercialAssessment: 'Viability requires verifying vessel-owner willingness to pay before committing production tooling.'
  },
  portfolioMeta: {
    portfolioDecision: 'INVESTIGATE',
    decisionState: 'INVESTIGATE'
  },
  adviserOpinion: {
    masterRecommendation: 'INVESTIGATE',
    portfolioDecision: 'INVESTIGATE'
  },
  summaryBlock: {
    decisionStatus: 'INVESTIGATE',
    pitchLabVerdict: 'A valid commercial concept.',
    threePriorityActions: []
  },
  investorBite: {
    pitchLabRecommendation: 'INVESTIGATE'
  },
  finalRecommendation: {
    recommendation: 'INVESTIGATE'
  },
  actionPlan: {
    topFivePriorities: []
  },
  futureTrends: calculate5DimensionFutureTrends(moorSafeInputs, {}, 'Physical Consumer Product / Hardware', {})
};

runTest('Suite E.1: QA Gate passes valid MoorSafe evaluation', () => {
  assert.doesNotThrow(() => {
    validateReportIntegrityGate(mockEval, moorSafeInputs);
  });
});

runTest('Suite E.2: QA Gate catches contradictory portfolio decision', () => {
  const badEval = JSON.parse(JSON.stringify(mockEval));
  badEval.masterRecommendation = 'STOP';
  badEval.portfolioMeta.portfolioDecision = 'PARK'; // Mismatch!
  assert.throws(() => {
    validateReportIntegrityGate(badEval, moorSafeInputs);
  }, /PITCHLAB QA INTEGRITY FAILURE: Contradictory portfolio decision detected/);
});

runTest('Suite E.3: QA Gate blocks forbidden "line failure costs" in hardware report', () => {
  const badHw = JSON.parse(JSON.stringify(mockEval));
  badHw.summaryBlock.pitchLabVerdict = 'Focus on line failure costs and gear breakdown.';
  assert.throws(() => {
    validateReportIntegrityGate(badHw, moorSafeInputs);
  }, /PITCHLAB QA INTEGRITY FAILURE: Prohibited generic or excluded hardware phrase/);
});

runTest('Suite E.4: QA Gate blocks inaccurate nuclear statutory ban claims', () => {
  const badNuc = JSON.parse(JSON.stringify(mockEval));
  badNuc.idea = 'Commercial nuclear power reactor NZ';
  badNuc.summaryBlock.pitchLabVerdict = 'The Nuclear Free Zone Act prohibits commercial nuclear power generation in New Zealand.';
  assert.throws(() => {
    validateReportIntegrityGate(badNuc, { idea: 'Commercial nuclear power reactor' });
  }, /PITCHLAB QA INTEGRITY FAILURE: Inaccurate NZ nuclear statutory claim detected/);
});

console.log('\n================================================================');
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful.`);
console.log('================================================================');
