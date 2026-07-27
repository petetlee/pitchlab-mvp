const z = require('zod');

const evaluationSchema = z.object({
  summaryBlock: z.object({
    overallReadinessScore: z.number(),
    decisionStatus: z.string(),
    biggestRiskToThisIdea: z.string(),
    doThisBeforeBuildingMore: z.string(),
    topStrengths: z.array(z.string()),
    topPrioritiesNow: z.array(z.string())
  }),
  whyThisScore: z.object({
    strongestArea: z.string(),
    weakestArea: z.string(),
    mainDragOnScore: z.string(),
    fastestWayToImprove: z.string()
  }),
  executiveSummary: z.string(),
  
  // 1. Founder Benchmark (Percentiles)
  founderBenchmark: z.object({
    founderExperiencePercentile: z.number(),
    industryExperiencePercentile: z.number(),
    investmentCommitmentPercentile: z.number(),
    customerValidationPercentile: z.number(),
    executionCapacityPercentile: z.number(),
    executionReadinessPercentile: z.number(),
    overallFounderReadinessPercentile: z.number(),
    isLive: z.boolean()
  }),

  // 2. Founder Archetype
  founderArchetype: z.object({
    archetype: z.string(),
    whyThisFits: z.string(),
    strengths: z.array(z.string()),
    blindSpots: z.array(z.string()),
    typicalRisks: z.array(z.string()),
    successPatterns: z.array(z.string()),
    recommendedNextActions: z.array(z.string())
  }),

  // 3. Founder Capability Radar (0-100 scale)
  founderCapabilityRadar: z.object({
    industryKnowledge: z.number(),
    commercialExperience: z.number(),
    leadership: z.number(),
    execution: z.number(),
    sales: z.number(),
    marketing: z.number(),
    product: z.number(),
    finance: z.number(),
    technical: z.number(),
    customerUnderstanding: z.number(),
    riskManagement: z.number(),
    timeAvailability: z.number(),
    investmentCommitment: z.number()
  }),

  // 4. Geographic Intelligence
  geographicIntelligence: z.object({
    startupActivity: z.string(),
    commonIndustries: z.array(z.string()),
    investmentBehaviour: z.string(),
    typicalFundingPathways: z.array(z.string()),
    regionalOpportunities: z.array(z.string()),
    regionalRisks: z.array(z.string())
  }),

  // 5. Industry Benchmark
  industryBenchmark: z.object({
    industryName: z.string(),
    typicalStartupSuccessRate: z.string(),
    typicalFundingRequired: z.string(),
    averageValidationScore: z.number(),
    averageFounderExperienceYears: z.number(),
    commonFailureReasons: z.array(z.string()),
    commercialOpportunity: z.string(),
    competitiveIntensity: z.string()
  }),

  // 6. Explain Every Score (Transparent Scoring)
  scoreExplanation: z.object({
    founderScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() }),
    marketScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() }),
    validationScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() }),
    commercialOpportunityScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() }),
    executionScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() }),
    competitionScore: z.object({ score: z.number(), max: z.number(), explanation: z.string() })
  }),

  // 7. AI Insight Engine
  aiInsightEngine: z.object({
    observations: z.array(z.object({
      title: z.string(),
      insight: z.string(),
      action: z.string()
    }))
  }),

  // 8. Opportunity Index
  opportunityIndex: z.object({
    commercialOpportunity: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    founderReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    executionProbability: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    marketReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    investmentReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    customerReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    validationReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    fundingReadiness: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    scalePotential: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() }),
    internationalPotential: z.object({ score: z.number(), reasoning: z.string(), improvement: z.string() })
  }),

  // 9. Risk Heat Map
  riskHeatMap: z.object({
    founder: z.object({ rating: z.string(), explanation: z.string() }),
    market: z.object({ rating: z.string(), explanation: z.string() }),
    competition: z.object({ rating: z.string(), explanation: z.string() }),
    funding: z.object({ rating: z.string(), explanation: z.string() }),
    execution: z.object({ rating: z.string(), explanation: z.string() }),
    technology: z.object({ rating: z.string(), explanation: z.string() }),
    legal: z.object({ rating: z.string(), explanation: z.string() }),
    regulation: z.object({ rating: z.string(), explanation: z.string() }),
    sales: z.object({ rating: z.string(), explanation: z.string() }),
    customerAdoption: z.object({ rating: z.string(), explanation: z.string() }),
    security: z.object({ rating: z.string(), explanation: z.string() })
  }),

  // 10. Success Probability (Estimations)
  successProbability: z.object({
    validating: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    buildingMvp: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    firstCustomers: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    profitability: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    raisingInvestment: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    nationalExpansion: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() }),
    internationalExpansion: z.object({ probability: z.number(), assumptions: z.string(), biggestVariable: z.string(), improvement: z.string() })
  }),

  // 11. Business DNA Profile
  businessDNAPerspective: z.object({
    dominantTrait: z.string(),
    secondaryTrait: z.string(),
    operationalStyle: z.string(),
    fundingApproach: z.string(),
    marketApproach: z.string(),
    recommendedCoFounder: z.string()
  }),

  // 12. Longitudinal Tracking
  longitudinalTracking: z.object({
    hasPrevious: z.boolean(),
    previousScore: z.number(),
    scoreImprovement: z.number(),
    history: z.array(z.string()),
    validationProgress: z.string(),
    executionProgress: z.string(),
    investmentChanges: z.string(),
    businessStageProgress: z.string(),
    founderGrowthSummary: z.string(),
    milestonesAchieved: z.array(z.string())
  }),

  // 13. AI Advisor Commentary
  aiAdvisorCommentary: z.object({
    overallTone: z.string(),
    primaryEncouragement: z.string(),
    bluntTruth: z.string(),
    singleBiggestNextAction: z.string()
  }),

  // 14. 90-Day Validation Roadmap
  ninetyDayRoadmap: z.object({
    month1: z.object({ focus: z.string(), outcomes: z.array(z.string()), budget: z.string() }),
    month2: z.object({ focus: z.string(), outcomes: z.array(z.string()), budget: z.string() }),
    month3: z.object({ focus: z.string(), outcomes: z.array(z.string()), budget: z.string() })
  }),

  scores: z.object({
    overall: z.number(),
    ideaClarity: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    problemStrength: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    founderFit: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    marketAttractiveness: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    mvpFeasibility: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    executionCapacity: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    executionReadiness: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() }),
    validationReadiness: z.object({ score: z.number(), assessment: z.string(), improvementAction: z.string() })
  }),
  decisionStatus: z.object({ state: z.string(), explanation: z.string(), nextMilestone: z.string() }),
  tearDetails: z.object({ theme: z.string(), evidence: z.string(), analysis: z.string(), recommendation: z.string() }),
  founderMetrics: z.object({ analysis: z.string(), founderPositionSummary: z.string() }),
  marketAssessment: z.object({ analysis: z.string(), marketPatternSummary: z.string() }),
  realWorldComparables: z.object({
    successes: z.array(z.object({ name: z.string(), whatTheyDid: z.string(), whyItSucceeded: z.string(), lessonForFounder: z.string() })),
    failures: z.array(z.object({ name: z.string(), whatTheyDid: z.string(), whatWentWrong: z.string(), warningForFounder: z.string() })),
    marketInterpretation: z.string()
  }),
  mvpFeasibility: z.object({ verdict: z.string(), suggestedFormat: z.string(), indicativeComponents: z.array(z.string()), whatToExclude: z.array(z.string()), estimatedCostCommentary: z.string() }),
  keyRisks: z.array(z.object({ name: z.string(), whyItMatters: z.string(), whatToProveOrFix: z.string() })),
  whatNotToBuild: z.array(z.string()),
  thirtyDayPlan: z.object({
    week1: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
    week2: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
    week3: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
    week4: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() })
  }),
  finalRecommendation: z.object({ recommendation: z.string(), why: z.string(), biggestIssue: z.string(), pathForward: z.string(), explicitWarning: z.string() })
});

function getDefaultValue(zodType) {
  if (zodType instanceof z.ZodString) return "";
  if (zodType instanceof z.ZodNumber) return 0;
  if (zodType instanceof z.ZodBoolean) return false;
  if (zodType instanceof z.ZodArray) return [getDefaultValue(zodType._def.type)];
  if (zodType instanceof z.ZodObject) {
    const shape = zodType.shape;
    const obj = {};
    for (const key in shape) {
      obj[key] = getDefaultValue(shape[key]);
    }
    return obj;
  }
  return null;
}

const template = getDefaultValue(evaluationSchema);
console.log(JSON.stringify(template, null, 2));
