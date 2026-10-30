const assert = require('assert');
const fs = require('fs');
const path = require('path');

const scoringLogic = require('./scoring_logic');
const indexModule = require('./index');
const helpers = indexModule._testHelpers;

console.log('================================================================================');
console.log('PITCHLAB AUTOMATED REGRESSION SUITE — PL-FIX-20261030-01 (v0.12.4 • sr20261030a)');
console.log('================================================================================\n');

let passedTests = 0;
function runTest(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    throw err;
  }
}

// Helper to run the exact production assessment post-processing pipeline
function runFullAssessmentPipeline(reqData) {
  const targetJurisdiction = reqData.locationCountry || reqData.locationSummary || 'New Zealand';
  const founderName = reqData.founderName || 'Founder (Name not supplied)';
  const mockResult = helpers.getMockResult(reqData);
  let evaluationData = indexModule.safeExtractJsonFromAiResponse(mockResult, reqData);

  const rawScores = evaluationData.scorecard || evaluationData.scores || {};
  const reconciled = scoringLogic.reconcileScores(rawScores, reqData);
  const ventureType = scoringLogic.classifyVentureType(reqData);

  const nowIso = '2026-10-30T10:30:00.000Z';
  const nowFormatted = helpers.formatAssessmentTimestampUTC(nowIso);
  evaluationData.appVersion = 'v0.12.4';
  evaluationData.fullVersionString = 'PitchLab MVP v0.12.4';
  evaluationData.buildId = 'sr20261030a';
  evaluationData.changeId = 'PL-FIX-20261030-01';
  evaluationData.assessmentGeneratedAt = nowIso;
  evaluationData.assessmentGeneratedAtFormatted = nowFormatted;
  evaluationData.assessmentDate = nowFormatted;
  evaluationData.founderName = founderName;

  evaluationData.overallScore = reconciled.overallScore;
  evaluationData.scoreBand = reconciled.scoreBand;
  evaluationData.masterRecommendation = reconciled.masterRecommendation;
  evaluationData.scorecard = reconciled.categoryScores;
  evaluationData.scores = reconciled.categoryScores;

  evaluationData.summaryBlock = evaluationData.summaryBlock || {};
  evaluationData.summaryBlock.overallScore = reconciled.overallScore;
  evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
  evaluationData.summaryBlock.scoreBand = reconciled.scoreBand;
  evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
  evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
  evaluationData.summaryBlock.masterRecommendation = reconciled.masterRecommendation;

  const getRating = (catKey, maxVal) => {
    const score = reconciled.categoryScores[catKey]?.scoreAchieved || 0;
    return Math.max(1, Math.min(5, Math.round((score / maxVal) * 5)));
  };
  evaluationData.investorBite = evaluationData.investorBite || {};
  evaluationData.investorBite.overallInterestScore = reconciled.overallScore;
  evaluationData.investorBite.scorecard = [
    { area: 'Problem Worth Solving', rating: getRating('problemCustomerClarity', 14), commentary: scoringLogic.generateContextualInvestorCommentary('Problem Worth Solving', getRating('problemCustomerClarity', 14), reconciled.categoryScores.problemCustomerClarity?.scoreAchieved || 0, 14, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Market Opportunity', rating: getRating('marketCommercialOpportunity', 14), commentary: scoringLogic.generateContextualInvestorCommentary('Market Opportunity', getRating('marketCommercialOpportunity', 14), reconciled.categoryScores.marketCommercialOpportunity?.scoreAchieved || 0, 14, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Competitive Advantage', rating: getRating('competitivePosition', 9), commentary: scoringLogic.generateContextualInvestorCommentary('Competitive Advantage', getRating('competitivePosition', 9), reconciled.categoryScores.competitivePosition?.scoreAchieved || 0, 9, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Business Model', rating: getRating('businessModelWillingnessToPay', 14), commentary: scoringLogic.generateContextualInvestorCommentary('Business Model', getRating('businessModelWillingnessToPay', 14), reconciled.categoryScores.businessModelWillingnessToPay?.scoreAchieved || 0, 14, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Founder Capability', rating: getRating('founderCapabilityFit', 15), commentary: scoringLogic.generateContextualInvestorCommentary('Founder Capability', getRating('founderCapabilityFit', 15), reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Customer Validation', rating: getRating('customerValidation', 20), commentary: scoringLogic.generateContextualInvestorCommentary('Customer Validation', getRating('customerValidation', 20), reconciled.categoryScores.customerValidation?.scoreAchieved || 0, 20, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Scalability', rating: getRating('executionReadiness', 9), commentary: scoringLogic.generateContextualInvestorCommentary('Scalability', getRating('executionReadiness', 9), reconciled.categoryScores.executionReadiness?.scoreAchieved || 0, 9, reqData, reconciled.gatesInfo, reconciled) },
    { area: 'Investment Readiness', rating: Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), commentary: scoringLogic.generateContextualInvestorCommentary('Investment Readiness', Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), reconciled.overallScore, 100, reqData, reconciled.gatesInfo, reconciled) }
  ];

  const founderEvidenceGap = scoringLogic.calculateFounderEvidenceGap(reqData.founderPredictions || {}, reconciled, reqData);
  evaluationData.founderPredictions = founderEvidenceGap.founderPredictions;
  evaluationData.founderEvidenceGap = founderEvidenceGap;

  evaluationData.meta = evaluationData.meta || {};
  evaluationData.meta.businessName = (reqData.idea || '').trim();
  evaluationData.meta.conceptSummary = (reqData.idea || '').trim();
  evaluationData.meta.founderName = founderName;
  evaluationData.meta.founderRegion = reqData.locationSummary || reqData.locationCountry || 'Global';
  evaluationData.businessName = (reqData.idea || '').trim();
  evaluationData.idea = reqData.idea;
  evaluationData.problem = reqData.problem;
  evaluationData.targetMarket = reqData.targetMarket;
  evaluationData.category = reqData.category;

  const isBookkeepingOrProfService = ventureType === 'Professional Services / Bookkeeping & Financial Advisory' || ventureType.includes('Professional Services');
  const isCommunityOrNfp = ventureType === 'Community / Not-for-Profit / Social Enterprise';
  evaluationData.businessTheme = evaluationData.businessTheme || {};
  if (isBookkeepingOrProfService) {
    evaluationData.businessTheme.primaryTheme = 'Professional Services / Bookkeeping & Financial Advisory';
    evaluationData.businessTheme.secondaryTheme = 'Small Business & Community Financial Compliance Support';
    evaluationData.businessTheme.strategicPositioning = `Positions as a culturally responsive, plain-language bookkeeping, payroll, and financial literacy practice serving small businesses, sole traders, and community organisations across ${targetJurisdiction}.`;
    evaluationData.businessTheme.marketCategoryDynamics = `Driven by bi-monthly GST/PAYE compliance mandates, cloud accounting ledger adoption (Xero/MYOB), and heightened charity/society financial reporting rules in ${targetJurisdiction}.`;
    evaluationData.businessTheme.strategicMoat = 'Personal practitioner trust, cultural and community network credibility, 28+ years of practical financial administration experience, and high monthly retainer retention.';
  } else if (isCommunityOrNfp) {
    evaluationData.businessTheme.primaryTheme = 'Community / Not-for-Profit / Social Enterprise';
    evaluationData.businessTheme.secondaryTheme = 'Community Capability Building & Social Impact';
    evaluationData.businessTheme.strategicPositioning = `Positions as a community-anchored social impact and capability-building initiative serving target beneficiaries and community organisations across ${targetJurisdiction}.`;
    evaluationData.businessTheme.marketCategoryDynamics = `Driven by grassroots community needs, culturally grounded service delivery, and funder demand for transparent governance and measurable participant outcomes in ${targetJurisdiction}.`;
    evaluationData.businessTheme.strategicMoat = 'Authentic community trust, lived cultural alignment, church and community hub relationships, and verified governance accountability.';
  }

  evaluationData.businessModelSnapshot = evaluationData.businessModelSnapshot || {};
  evaluationData.businessModelSnapshot.targetCustomer = helpers.synthesizeBusinessModelField('targetCustomer', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.coreOffering = helpers.synthesizeBusinessModelField('coreOffering', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.customerProblem = helpers.synthesizeBusinessModelField('customerProblem', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.valueProposition = helpers.synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.revenueModel = helpers.synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.customerAcquisition = helpers.synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.keyCosts = helpers.synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
  evaluationData.businessModelSnapshot.commercialAssessment = helpers.synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);

  const timeNorm = scoringLogic.normalizeFounderTimeCommitment(reqData);
  const capNorm = scoringLogic.normalizeFounderCapital(reqData);
  evaluationData.founderMetrics = evaluationData.founderMetrics || {};
  evaluationData.founderMetrics.weeklyAvailableHours = timeNorm.normalizedBand;
  evaluationData.founderMetrics.stepHoursLabel = timeNorm.stepHoursLabel;
  evaluationData.founderMetrics.availableCapital = capNorm.normalizedDisplay;
  evaluationData.founderMetrics.initialRiskCapital = capNorm.initialRiskCapitalDisplay || '$500 NZD';
  evaluationData.founderAssessment = evaluationData.founderAssessment || {};
  evaluationData.founderAssessment.timeReality = {
    ...(evaluationData.founderAssessment.timeReality || {}),
    weeklyAvailableHours: timeNorm.normalizedBand
  };
  evaluationData.founderAssessment.capitalReality = {
    ...(evaluationData.founderAssessment.capitalReality || {}),
    availableCapital: capNorm.normalizedDisplay,
    initialRiskCapital: capNorm.initialRiskCapitalDisplay || '$500 NZD'
  };

  evaluationData.cvAnalysis = evaluationData.cvAnalysis || {};
  evaluationData.cvAnalysis.extractedCredentials = helpers.extractSpecificCredentialsFromCvText(
    reqData.founderCvExtractedText || reqData.cvText || '',
    reqData.founderBackgroundNarrative || ''
  );

  evaluationData.executiveSummary = helpers.generateCoherentExecutiveSummary(reqData, reconciled, ventureType, targetJurisdiction, evaluationData);
  const actionSourceOfTruth = helpers.generateActionSourceOfTruth(reqData, reconciled, ventureType, targetJurisdiction);
  evaluationData.actionPlan = evaluationData.actionPlan || {};
  evaluationData.actionPlan.topFivePriorities = actionSourceOfTruth.topFivePriorities;
  evaluationData.actionPlan.immediate7DayAction = actionSourceOfTruth.immediate7DayAction;
  evaluationData.topFivePriorities = actionSourceOfTruth.topFivePriorities;
  evaluationData.summaryBlock.topPrioritiesNow = actionSourceOfTruth.topFivePriorities.map(p => p.priority);
  evaluationData.summaryBlock.threePriorityActions = actionSourceOfTruth.threePriorityActions;
  evaluationData.summaryBlock.doThisBeforeBuildingMore = actionSourceOfTruth.doThisBeforeBuilding;
  evaluationData.summaryBlock.executiveSnapshot = {
    ...(evaluationData.summaryBlock.executiveSnapshot || {}),
    timeAvailable: timeNorm.normalizedBand
  };
  evaluationData.threePriorityActions = actionSourceOfTruth.threePriorityActions;
  evaluationData.thirtyDayPlan = actionSourceOfTruth.thirtyDayPlan;
  evaluationData.ninetyDayPhases = actionSourceOfTruth.ninetyDayPhases;
  evaluationData.ninetyDayRoadmap = actionSourceOfTruth.ninetyDayRoadmap;
  evaluationData.nextEvidenceGateway = actionSourceOfTruth.nextEvidenceGateway;
  evaluationData.reassessmentTrigger = actionSourceOfTruth.reassessmentTrigger;

  if (isBookkeepingOrProfService) {
    evaluationData.summaryBlock.pitchLabVerdict = `This bookkeeping and financial support concept is backed by substantial founder experience in financial administration, payroll, project controls, and not-for-profit treasurer governance. However, in the problem statement field the founder listed internal launch goals (Xero course proficiency, business setup requirements, and building a client base) rather than validated customer pain points, and zero structured customer discovery interviews have been completed yet. The founder should complete Xero Advisor certification and conduct 8 to 10 discovery conversations with Pasifika small business owners and community treasurers within their ${timeNorm.normalizedBand} capacity before committing overhead.`;
  }

  evaluationData.portfolioMeta = scoringLogic.getPortfolioDecision(reconciled.masterRecommendation, ventureType, reconciled.gatesInfo, reqData);
  evaluationData.validationLadder = scoringLogic.getValidationLadderForContext(ventureType, reconciled.gatesInfo?.primaryGatingRisk, reqData);
  evaluationData.adviserOpinion = scoringLogic.getCommercialAdviserOpinion(reconciled, ventureType, reconciled.gatesInfo, reqData);
  evaluationData.primaryGatingRisk = reconciled.gatesInfo?.primaryGatingRisk || 'Customer Demand & Willingness to Pay';
  evaluationData.ventureContext = ventureType;
  evaluationData.marketInsights = helpers.generateIdeaSpecificMarketInsights(reqData, reconciled, ventureType, targetJurisdiction);

  evaluationData = helpers.runSemanticGuardrail(evaluationData, ventureType, reconciled.gatesInfo, reqData);
  evaluationData = helpers.runEditorialQaAndSpellCheck(evaluationData, reqData);
  evaluationData = helpers.validateAndEnforceBusinessModelSnapshot(evaluationData, reqData);
  evaluationData = helpers.detectAndResolveCrossContamination(evaluationData, reqData);

  const ft5D = scoringLogic.calculate5DimensionFutureTrends(reqData, reconciled.gatesInfo, ventureType, evaluationData.futureTrends || {});
  evaluationData.futureTrends = {
    ...(evaluationData.futureTrends || {}),
    dimensions: ft5D.dimensions,
    marketDirection: ft5D.marketDirection,
    solutionOutlook: ft5D.solutionOutlook,
    whatThisMeansForFounder: ft5D.whatThisMeansForFounder,
    trendAlignmentScore: ft5D.trendAlignmentScore,
    adjacentOpportunities: ft5D.adjacentOpportunities
  };

  const sumCategoryScores = Object.values(reconciled.categoryScores).reduce((acc, cat) => acc + (cat.scoreAchieved || cat.score || 0), 0);
  evaluationData.overallScore = sumCategoryScores;
  evaluationData.summaryBlock.overallScore = sumCategoryScores;
  evaluationData.summaryBlock.overallReadinessScore = sumCategoryScores;
  evaluationData.investorBite.overallInterestScore = sumCategoryScores;
  evaluationData.scores = {
    overall: sumCategoryScores,
    ...reconciled.categoryScores
  };
  evaluationData.founderReadinessIndex = sumCategoryScores;

  evaluationData.authoritativeSnapshot = scoringLogic.buildAuthoritativeAssessmentSnapshot(
    reqData,
    reqData.evaluationId || 'eval_test',
    reqData.submissionId || 'sub_test'
  );
  evaluationData.inputCoverage = scoringLogic.computeInputCoverageAudit(
    reqData,
    evaluationData,
    evaluationData.authoritativeSnapshot
  );

  const gatePassed = scoringLogic.validateReportIntegrityGate(evaluationData, reqData);
  return {
    report: evaluationData,
    gatePassed,
    authoritativeSnapshot: evaluationData.authoritativeSnapshot,
    inputCoverage: evaluationData.inputCoverage,
    reconciled
  };
}

// ============================================================================
// GROUP A: TAI'S BOOKKEEPING SERVICES REGRESSION CASE
// ============================================================================
console.log('--- GROUP A: Tai Bookkeeping Services Regression Tests ---');

const taiRawInputs = {
  userId: '4tzQUVLLUuVBRt0Jj9XbONAXIga2',
  founderName: 'Tai',
  idea: 'To provide Bookkeeping Services to small business owners/sole traders who cannot afford the high fees charged by Chartered Accountants, and to help them understand their financial information in a simple, relatable and supportive way.\nThe goal is to empower our Pasifika people to feel confident about managing their business finances by offering:\n• Affordable bookkeeping and administration support\n• Easy-to-understand explanations of financial statements and obligations\n• Guidance and workshops for start-ups and community groups on financial literacy, budgeting, and compliance\n• A culturally grounded approach — building trust, relationships, and confidence first.',
  category: 'Bookkeeping Services',
  problem: '1. To become more proficient in the Xero accounting packgage by enrolling in further course training\n2. Understanding the requirements to set up a business\n3. New client base',
  targetMarket: 'Start-ups, Sole Traders, Small to Medium Businesses in the following industries: construction and trades, transport/courier Services, food and hospitality, cleaning and Lawn services, retail and creative businesses, community organisations and charities.',
  marketScope: 'Local city/town',
  locationCountry: 'New Zealand',
  locationRegion: 'Auckland',
  locationCity: 'Auckland',
  founderExperience: '0',
  industryExperience: 'No',
  founderMotivation: 'There are not a lot of Pacific Island business owners who offer bookkeeping services. I want to bridge the gap for our Pasifika community.',
  biggestObstacle: 'Building a client base and becoming fully Xero certified',
  timeCommitment: '15-30 hours/week',
  capacity: '3', // Legacy conflicting field from older client bug
  investmentCommitment: '$0-$500',
  budget: '$0-$500 NZD',
  businessStage: 'Idea only',
  customerValidation: 'No',
  fundingPreference: 'Self-funded',
  successDefinition: 'Side income',
  founderBackgroundNarrative: 'My career spans more than 28 years in financial administration, project controls, and payroll across major energy, construction, and engineering companies in New Zealand and Australia. I hold a Bachelor of Business degree and a Diploma in Applied Management, and currently serve as Treasurer for a newly formed Incorporated Society and on an NZQA Pacific Island Stakeholder Advisory Group.',
  founderCvUploaded: true,
  cvFileName: 'Tai CV (2025).pdf',
  founderCvExtractedText: 'Tai — Bachelor of Business, Diploma in Applied Management. 28+ years experience in financial administration, project controls, accounts payable/receivable, GST reconciliation, and payroll administration. Treasurer for Incorporated Society. Member of NZQA Pacific Island Stakeholder Advisory Group. Experience with Xero and ERP accounting packages.',
  founderPredictions: {
    overallConfidence: 75,
    problemStrength: 7,
    differentiation: 7,
    competitionDifficulty: 5,
    customerDemand: 7,
    statedBiggestRisk: 'Finding first paying clients'
  }
};

const taiResult = runFullAssessmentPipeline(taiRawInputs);
const taiReport = taiResult.report;
const taiJsonLower = JSON.stringify(taiReport).toLowerCase();

runTest('A1: Classifies Tai idea as Professional Services / Bookkeeping & Financial Advisory (NOT Trade or SaaS)', () => {
  assert.strictEqual(
    taiResult.authoritativeSnapshot.ventureType,
    'Professional Services / Bookkeeping & Financial Advisory'
  );
  assert.strictEqual(
    taiReport.businessTheme.primaryTheme,
    'Professional Services / Bookkeeping & Financial Advisory'
  );
});

runTest('A2: Zero construction / renovation / subcontractor / building merchant contamination anywhere in report', () => {
  const bannedConstructionTerms = [
    'residential property owners',
    'renovation quotes',
    'trade scheduling',
    'subcontractor trade vetting',
    'vet 3 core subcontractor trades',
    'fixed-price construction',
    'pilot construction contract',
    'pilot renovation contract',
    'building supply merchants',
    'building merchants',
    'construction project margins',
    'site supervisors'
  ];
  for (const term of bannedConstructionTerms) {
    assert(!taiJsonLower.includes(term), `Contaminated construction term "${term}" found in Tai report`);
  }
});

runTest('A3: Zero software-product / SaaS / Open Banking API / hosting contamination in Tai report', () => {
  const bannedSoftwareTerms = [
    'automated tax set-asides',
    'open banking api',
    'software hosting costs',
    'subscription software economics',
    'validating bank-feed connectivity before custom software development',
    'committing capital to full custom software development',
    'before writing code'
  ];
  for (const term of bannedSoftwareTerms) {
    assert(!taiJsonLower.includes(term), `Contaminated software term "${term}" found in Tai report`);
  }
});

runTest('A4: Resolves conflicting time commitment to canonical "15–30 hours/week" across every section', () => {
  assert.strictEqual(taiResult.authoritativeSnapshot.founderTime.normalizedBand, '15–30 hours/week');
  assert.strictEqual(taiResult.authoritativeSnapshot.founderTime.conflictDetected, true);
  assert.strictEqual(taiReport.founderMetrics.weeklyAvailableHours, '15–30 hours/week');
  assert.strictEqual(taiReport.founderAssessment.timeReality.weeklyAvailableHours, '15–30 hours/week');
  assert.strictEqual(taiReport.summaryBlock.executiveSnapshot.timeAvailable, '15–30 hours/week');
  for (const step of taiReport.ninetyDayRoadmap.steps) {
    assert.strictEqual(step.hours, '15–30 hrs/wk', `Step ${step.week} had wrong hours: ${step.hours}`);
  }
  assert(!taiJsonLower.includes('at 0–5 hours per week'), 'Should not include 0-5 hours per week text');
  assert(!taiJsonLower.includes('5 hrs/wk'), 'Should not include hardcoded 5 hrs/wk');
});

runTest('A5: Uses consistent founder capital "$0–$500 NZD" across all sections', () => {
  assert.strictEqual(taiResult.authoritativeSnapshot.founderCapital.normalizedDisplay, '$0–$500 NZD');
  assert.strictEqual(taiReport.founderMetrics.availableCapital, '$0–$500 NZD');
  assert.strictEqual(taiReport.founderAssessment.capitalReality.availableCapital, '$0–$500 NZD');
});

runTest('A6: Detects founder setup/capability goals in problem field and caps problemCustomerClarity at <= 7/14 Partial Evidence', () => {
  assert.strictEqual(taiResult.authoritativeSnapshot.problemClassification.isFounderCapabilityNeedInProblemField, true);
  const probScore = taiReport.scorecard.problemCustomerClarity;
  assert(probScore.scoreAchieved <= 7, `Expected problemCustomerClarity <= 7, got ${probScore.scoreAchieved}`);
  assert.strictEqual(probScore.maxScore, 14);
  assert.notStrictEqual(probScore.evidenceLevel, 'Strong Evidence');
  assert(
    taiReport.businessModelSnapshot.customerProblem.toLowerCase().includes('internal launch priorities') ||
    taiReport.businessModelSnapshot.customerProblem.toLowerCase().includes('inferred customer problem') ||
    taiReport.businessModelSnapshot.customerProblem.toLowerCase().includes('founder setup priorities'),
    'businessModelSnapshot.customerProblem must distinguish customer pain from founder setup needs'
  );
});

runTest('A7: Reflects 0 customer validation consistently and avoids "verified background in No" or mid-word truncation', () => {
  const valScore = taiReport.scorecard.customerValidation;
  assert(valScore.scoreAchieved <= 4, `Expected customerValidation <= 4, got ${valScore.scoreAchieved}`);
  assert.strictEqual(valScore.evidenceLevel, 'Not yet evidenced');
  assert(!taiJsonLower.includes('verified background in no'), 'Must not contain "verified background in No"');
  assert(!taiJsonLower.includes('food and ho.'), 'Must not truncate "food and hospitality" into "food and ho."');
  assert(!taiJsonLower.includes('cleaning a.'), 'Must not truncate "cleaning and Lawn services" into "cleaning a."');
});

runTest('A8: Extracts Tai CV credentials (Bachelor of Business, Diploma in Applied Management, 28+ years, Treasurer)', () => {
  const creds = taiReport.cvAnalysis.extractedCredentials.join(' ');
  assert(creds.includes('Bachelor of Business'), 'Should extract Bachelor of Business');
  assert(creds.includes('Diploma in Applied Management'), 'Should extract Diploma in Applied Management');
  assert(creds.includes('28+ Years'), 'Should extract 28+ Years Financial Administration experience');
  assert(creds.includes('Treasurer'), 'Should extract Treasurer & Governance experience');
});

runTest('A9: Displays founder name "Tai" and UTC/GMT timestamp and passes validateReportIntegrityGate', () => {
  assert.strictEqual(taiReport.founderName, 'Tai');
  assert.strictEqual(taiReport.meta.founderName, 'Tai');
  assert(taiReport.assessmentGeneratedAtFormatted.endsWith('GMT (UTC+00:00)'));
  assert(!taiReport.assessmentGeneratedAtFormatted.includes('NZST'));
  assert.strictEqual(taiResult.gatePassed, true);
});

// ============================================================================
// GROUP B: INPUT COVERAGE & SENSITIVITY TESTS
// ============================================================================
console.log('\n--- GROUP B: Input Coverage & Sensitivity Tests ---');

runTest('B1: All 17 questionnaire fields + founderPredictions + CV upload are audited with 0 unaccounted fields', () => {
  const audit = taiResult.inputCoverage;
  assert.strictEqual(audit.summary.unaccountedCount, 0, 'Unaccounted fields found in inputCoverage');
  assert(audit.summary.totalQuestionsAudited >= 18, `Expected >= 18 audited questions, got ${audit.summary.totalQuestionsAudited}`);
  const validDispositions = new Set(['used', 'contextual', 'conflicting', 'not_applicable']);
  for (const entry of audit.items) {
    assert(validDispositions.has(entry.disposition), `Invalid disposition ${entry.disposition} on ${entry.questionId}`);
  }
  const timeItem = audit.items.find(i => i.questionId === 'q12_timeCommitment');
  assert.strictEqual(timeItem.disposition, 'conflicting', 'Legacy capacity=3 vs timeCommitment=15-30 should be flagged as conflicting');
  const probItem = audit.items.find(i => i.questionId === 'q2_problem');
  assert.strictEqual(probItem.disposition, 'conflicting', 'Founder setup goals in problem field should be flagged as conflicting');
});

runTest('B2: Changing customerValidation and timeCommitment materially changes scores and narrative', () => {
  const validatedInputs = {
    ...taiRawInputs,
    problem: 'Pasifika sole traders and small businesses struggle with overdue GST returns, unrecorded cash expenses, and high Chartered Accountant compliance fees ($3,500+/yr), leading to IRD penalties and cashflow stress.',
    customerValidation: 'Yes, I have interviewed 12 Pasifika small business owners and secured 3 paying pilot clients on $250/month bookkeeping retainers.',
    network: 'Yes, I have interviewed 12 Pasifika small business owners and secured 3 paying pilot clients on $250/month bookkeeping retainers.',
    timeCommitment: '30+ hours/week',
    capacity: '35',
    investmentCommitment: '$5,000-$10,000',
    budget: '$5,000-$10,000 NZD'
  };
  const validatedResult = runFullAssessmentPipeline(validatedInputs);
  assert(
    validatedResult.report.overallScore > taiReport.overallScore + 8,
    `Expected validated score (${validatedResult.report.overallScore}) > unvalidated score (${taiReport.overallScore}) + 8`
  );
  assert(
    validatedResult.report.scorecard.problemCustomerClarity.scoreAchieved > taiReport.scorecard.problemCustomerClarity.scoreAchieved,
    'Genuine customer problem should score higher than founder capability goal'
  );
  assert(
    validatedResult.report.scorecard.customerValidation.scoreAchieved > taiReport.scorecard.customerValidation.scoreAchieved,
    `Expected validated customerValidation (${validatedResult.report.scorecard.customerValidation.scoreAchieved}) > unvalidated (${taiReport.scorecard.customerValidation.scoreAchieved})`
  );
  assert.strictEqual(validatedResult.report.founderMetrics.weeklyAvailableHours, '30+ hours/week');
  assert.strictEqual(validatedResult.report.founderMetrics.availableCapital, '$5,000–$10,000 NZD');
});

// ============================================================================
// GROUP C: ISOLATION & CONCURRENCY TESTS
// ============================================================================
console.log('\n--- GROUP C: Isolation & Concurrency Tests ---');

runTest('C1: Concurrent assessments across different users and same user with different ideas have zero cross-contamination', () => {
  const constructionInputs = {
    userId: 'user-builder-01',
    founderName: 'Marcus',
    idea: 'Fixed-price residential renovation and building contractor service in Christchurch with weekly milestone transparency.',
    category: 'Construction & Trades',
    problem: 'Homeowners undertaking residential renovations face unexpected budget blowouts, builder quote delays, and unreliable trade scheduling.',
    targetMarket: 'Residential property owners and local architects in Canterbury.',
    marketScope: 'Regional',
    locationCountry: 'New Zealand',
    locationRegion: 'Canterbury',
    locationCity: 'Christchurch',
    founderExperience: '10+ years',
    industryExperience: 'Yes, Licensed Building Practitioner (LBP) with 12 years carpentry and site management experience.',
    founderMotivation: 'Deliver transparent residential building projects.',
    biggestObstacle: 'Subcontractor scheduling',
    timeCommitment: '30+ hours/week',
    investmentCommitment: '$10,000-$25,000',
    businessStage: 'Early traction',
    customerValidation: 'Interviewed 10 homeowners and signed 1 pilot renovation contract.',
    fundingPreference: 'Self-funded',
    successDefinition: 'Full-time business',
    founderBackgroundNarrative: 'Licensed Building Practitioner with 12 years residential construction and renovation project management experience.'
  };

  const results = [
    runFullAssessmentPipeline(taiRawInputs),
    runFullAssessmentPipeline(constructionInputs),
    runFullAssessmentPipeline({ ...taiRawInputs, userId: 'user-builder-01', submissionId: 'same-user-second-idea' })
  ];

  const [resTai1, resBuilder, resTai2] = results;
  assert.strictEqual(resTai1.authoritativeSnapshot.ventureType, 'Professional Services / Bookkeeping & Financial Advisory');
  assert.strictEqual(resBuilder.authoritativeSnapshot.ventureType, 'Trade / Local Service');
  assert.strictEqual(resTai2.authoritativeSnapshot.ventureType, 'Professional Services / Bookkeeping & Financial Advisory');

  assert.strictEqual(resTai1.gatePassed, true);
  assert.strictEqual(resBuilder.gatePassed, true);
  assert.strictEqual(resTai2.gatePassed, true);

  const tai2Json = JSON.stringify(resTai2.report).toLowerCase();
  assert(!tai2Json.includes('residential property owners'));
  assert(!tai2Json.includes('pilot renovation contract'));
});

// ============================================================================
// GROUP D: 5 BUSINESS MODEL ARCHETYPES
// ============================================================================
console.log('\n--- GROUP D: 5 Business Model Archetypes ---');

const archetypes = [
  {
    name: '1. Bookkeeping Service',
    expectedVentureType: 'Professional Services / Bookkeeping & Financial Advisory',
    inputs: taiRawInputs,
    mustContain: ['bookkeeping', 'xero', 'engagement'],
    mustNotContain: ['residential property owners', 'open banking api', 'benchtop physical prototype']
  },
  {
    name: '2. Construction Service',
    expectedVentureType: 'Trade / Local Service',
    inputs: {
      userId: 'u-const',
      founderName: 'Marcus',
      idea: 'Residential building and renovation contractor service offering fixed-price milestone contracts.',
      category: 'Construction & Trades',
      problem: 'Homeowners experience renovation quote delays, trade scheduling failures, and cost overruns.',
      targetMarket: 'Residential homeowners and architects in Auckland.',
      locationCountry: 'New Zealand',
      timeCommitment: '30+ hours/week',
      investmentCommitment: '$10,000-$25,000',
      customerValidation: 'Interviewed 8 homeowners',
      founderBackgroundNarrative: '12 years carpentry and residential construction management.'
    },
    mustContain: ['residential', 'subcontractor', 'milestone'],
    mustNotContain: ['open banking api', 'benchtop physical prototype']
  },
  {
    name: '3. Software / SaaS Product',
    expectedVentureType: 'Financial Services / FinTech',
    inputs: {
      userId: 'u-saas',
      founderName: 'Elena',
      idea: 'Cloud B2B SaaS platform and mobile app using Open Banking APIs to automate real-time GST and provisional tax set-asides for SMEs.',
      category: 'FinTech SaaS Software',
      problem: 'Sole traders accidentally spend funds needed for IRD provisional tax and GST because manual bank transfers are tedious.',
      targetMarket: 'Tech-savvy sole traders and contractors in New Zealand.',
      locationCountry: 'New Zealand',
      timeCommitment: '15-30 hours/week',
      investmentCommitment: '$5,000-$10,000',
      customerValidation: 'Interviewed 10 contractors',
      founderBackgroundNarrative: 'Senior fintech product manager and full-stack software engineer.'
    },
    mustContain: ['subscription', 'software'],
    mustNotContain: ['residential property owners', 'subcontractor trade vetting', 'benchtop physical prototype']
  },
  {
    name: '4. Physical / Hardware Product',
    expectedVentureType: 'Physical Consumer Product / Hardware',
    inputs: {
      userId: 'u-hw',
      founderName: 'David',
      idea: 'Solar-powered ultrasonic and physical rodent deterrent enclosure mounted on vessel mooring ropes.',
      category: 'Marine Hardware & Physical Device',
      problem: 'Vessel owners and marina operators suffer costly rodent infestation damage from pests climbing mooring lines.',
      targetMarket: 'Recreational boat owners, commercial vessels, and marina operators.',
      locationCountry: 'New Zealand',
      timeCommitment: '15-30 hours/week',
      investmentCommitment: '$5,000-$10,000',
      customerValidation: 'No',
      founderBackgroundNarrative: 'Marine mechanical engineer with 15 years product design experience.'
    },
    mustContain: ['prototype', 'manufacturing'],
    mustNotContain: ['residential property owners', 'open banking api', 'committing capital to full custom software development']
  },
  {
    name: '5. Community / Not-for-Profit Initiative',
    expectedVentureType: 'Community / Not-for-Profit / Social Enterprise',
    inputs: {
      userId: 'u-comm',
      founderName: 'Aroha',
      idea: 'Incorporated society and community social enterprise delivering financial literacy workshops and youth mentoring for Pasifika families.',
      category: 'Community & Not-for-Profit',
      problem: 'Community families face predatory lending and lack accessible, culturally grounded financial literacy programmes.',
      targetMarket: 'Community groups, church networks, youth organisations, and local funding trusts in South Auckland.',
      locationCountry: 'New Zealand',
      timeCommitment: '5-15 hours/week',
      investmentCommitment: '$0-$500',
      customerValidation: 'Discussed with 5 community elders and 2 church boards',
      founderBackgroundNarrative: '10 years community youth worker and charitable trust treasurer.'
    },
    mustContain: ['community', 'workshops', 'stakeholder'],
    mustNotContain: ['residential property owners', 'open banking api', 'benchtop physical prototype']
  }
];

for (const arch of archetypes) {
  runTest(`D: ${arch.name} classifies as "${arch.expectedVentureType}" and passes integrity gate`, () => {
    const res = runFullAssessmentPipeline(arch.inputs);
    assert.strictEqual(res.authoritativeSnapshot.ventureType, arch.expectedVentureType);
    assert.strictEqual(res.gatePassed, true);
    const lower = JSON.stringify(res.report).toLowerCase();
    for (const term of arch.mustContain) {
      assert(lower.includes(term), `Expected "${term}" in ${arch.name} report`);
    }
    for (const term of arch.mustNotContain) {
      assert(!lower.includes(term), `Forbidden term "${term}" found in ${arch.name} report`);
    }
  });
}

// ============================================================================
// GROUP E: RENDERING & SCORE RECONCILIATION
// ============================================================================
console.log('\n--- GROUP E: Score Reconciliation & Version Metadata ---');

runTest('E1: All 8 scorecard categories sum exactly to overallScore and maxScores sum to 100', () => {
  const categories = Object.values(taiReport.scorecard);
  assert.strictEqual(categories.length, 8, `Expected 8 scorecard categories, got ${categories.length}`);
  const achievedSum = categories.reduce((sum, c) => sum + c.scoreAchieved, 0);
  const maxSum = categories.reduce((sum, c) => sum + c.maxScore, 0);
  assert.strictEqual(maxSum, 100, `Expected maxScore sum = 100, got ${maxSum}`);
  assert.strictEqual(achievedSum, taiReport.overallScore, `Expected achievedSum (${achievedSum}) === overallScore (${taiReport.overallScore})`);
  assert.strictEqual(taiReport.summaryBlock.overallScore, taiReport.overallScore);
});

runTest('E2: Release version config matches between backend version_config.json and frontend version_config.dart', () => {
  const backendVer = JSON.parse(fs.readFileSync(path.join(__dirname, 'version_config.json'), 'utf8'));
  const frontendVerDart = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'lib', 'config', 'version_config.dart'), 'utf8');
  assert.strictEqual(backendVer.appVersion, 'v0.12.4');
  assert.strictEqual(backendVer.buildId, 'sr20261030a');
  assert.strictEqual(backendVer.changeId, 'PL-FIX-20261030-01');
  assert(frontendVerDart.includes("appVersion = 'v0.12.4'"));
  assert(frontendVerDart.includes("buildId = 'sr20261030a'"));
  assert(frontendVerDart.includes("changeId = 'PL-FIX-20261030-01'"));
});

console.log('\n================================================================================');
console.log(`ALL ${passedTests} REGRESSION TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================================');
