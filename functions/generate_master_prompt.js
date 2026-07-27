const fs = require('fs');
const path = require('path');

const masterTemplate = {
  "meta": {
    "businessName": "",
    "conceptSummary": "",
    "founderName": "",
    "founderRegion": "",
    "locationCountry": "",
    "assessmentDate": "",
    "isBaseline": true
  },
  "summaryBlock": {
    "overallScore": 0,
    "scoreBand": {
      "name": "Emerging Opportunity",
      "meaning": "Encouraging foundations exist, but important commercial assumptions remain untested. Proceed through structured validation."
    },
    "pitchLabVerdict": "Personalized one-sentence verdict.",
    "threePriorityActions": [
      { "heading": "", "explanation": "", "outcome": "" },
      { "heading": "", "explanation": "", "outcome": "" },
      { "heading": "", "explanation": "", "outcome": "" }
    ],
    "executiveSnapshot": {
      "recommendation": "Proceed with Controlled Validation",
      "biggestStrength": "",
      "biggestRisk": "",
      "biggestUnknown": "",
      "suggestedValidationPeriod": "90 Days",
      "timeAvailable": ""
    },
    "progressFraming": "Your score reflects your idea’s current level of commercial readiness. It is not a permanent grade on you or your business."
  },
  "executiveSummary": "Personalized summary of approximately 150–250 words covering business problem, proposed solution, target customer, founder-market fit, current evidence, major risks, and recommended next phase.",
  "scorecard": {
    "problemCustomerClarity": { "scoreAchieved": 0, "maxScore": 15, "evidenceLevel": "Partial Evidence", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "founderCapabilityFit": { "scoreAchieved": 0, "maxScore": 15, "evidenceLevel": "Partial Evidence", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "customerValidation": { "scoreAchieved": 0, "maxScore": 20, "evidenceLevel": "Not yet evidenced", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "marketCommercialOpportunity": { "scoreAchieved": 0, "maxScore": 15, "evidenceLevel": "Partial Evidence", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "businessModelWillingnessToPay": { "scoreAchieved": 0, "maxScore": 15, "evidenceLevel": "Not yet evidenced", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "competitivePosition": { "scoreAchieved": 0, "maxScore": 10, "evidenceLevel": "Partial Evidence", "explanation": "", "missingEvidence": "", "howToImprove": "" },
    "executionReadiness": { "scoreAchieved": 0, "maxScore": 10, "evidenceLevel": "Partial Evidence", "explanation": "", "missingEvidence": "", "howToImprove": "" }
  },
  "swot": {
    "strengths": ["", "", ""],
    "weaknesses": ["", "", ""],
    "opportunities": ["", "", ""],
    "threats": ["", "", ""],
    "interpretation": "Comprehensive SWOT commercial synthesis."
  },
  "leanCanvas": {
    "problem": ["", ""],
    "customerSegments": ["", ""],
    "earlyAdopters": ["", ""],
    "existingAlternatives": ["", ""],
    "uniqueValueProp": "",
    "proposedSolution": ["", ""],
    "channels": ["", ""],
    "revenueStreams": ["", ""],
    "costStructure": ["", ""],
    "keyMetrics": ["", ""],
    "unfairAdvantage": ""
  },
  "kissReview": {
    "complexityRatings": {
      "customerProblem": "Low Complexity",
      "proposedSolution": "Moderate Complexity",
      "technology": "Moderate Complexity",
      "operations": "Low Complexity",
      "pricing": "Low Complexity",
      "customerAcquisition": "Moderate Complexity",
      "compliance": "Low Complexity",
      "founderWorkload": "Moderate Complexity"
    },
    "keep": ["", ""],
    "simplify": ["", ""],
    "delay": ["", ""],
    "smallestTestableVersion": "The smallest version capable of generating meaningful commercial evidence."
  },
  "mvpFeasibility": {
    "recommendedTestFormat": "Manual Pilot / Concierge MVP",
    "complexityLevel": "Moderate Complexity",
    "suggestedValidationBudget": "$500 - $1,500",
    "whatToInclude": ["", ""],
    "whatToExclude": ["", ""],
    "evidenceRequiredBeforeBuildingMore": "Direct feedback and written commitments from target customers."
  },
  "businessTheme": {
    "primaryTheme": "B2B SaaS / Services",
    "secondaryTheme": "Workflow Automation",
    "whyFits": "",
    "typicalSuccessFactors": ["", ""],
    "typicalRisks": ["", ""],
    "founderImplications": ""
  },
  "founderAssessment": {
    "commercialCapabilities": {
      "industryKnowledge": { "rating": "Capable", "evidence": "" },
      "customerUnderstanding": { "rating": "Developing", "evidence": "" },
      "commercialFinancial": { "rating": "Strong", "evidence": "" },
      "salesAcquisition": { "rating": "Developing", "evidence": "" },
      "operationalExecution": { "rating": "Capable", "evidence": "" },
      "technologyCapability": { "rating": "Capable", "evidence": "" },
      "leadershipDecision": { "rating": "Strong", "evidence": "" },
      "networkPartnerships": { "rating": "Capable", "evidence": "" },
      "learningAdaptability": { "rating": "Strong", "evidence": "" }
    },
    "founderMarketFit": "",
    "capabilityGaps": [
      { "gap": "", "remedy": "", "solutionType": "Advisory support" }
    ],
    "timeReality": {
      "weeklyAvailableHours": "5-10 hours/week",
      "expectedPace": "Steady validation pace over 90 days",
      "scopeFit": "Scope fits available time if non-essential features are delayed",
      "messaging": "Consistent progress is more important than unrealistic full-time expectations during early validation."
    },
    "capitalReality": {
      "availableCapital": "$5,000 - $10,000",
      "amountWillingToInvest": "$5,000",
      "initialRiskCapital": "$1,000",
      "recommendedValidationBudget": "$500 - $1,500",
      "capitalPreservationAdvice": "Preserve initial capital until customer discovery interviews confirm willingness to pay."
    }
  },
  "validation": {
    "ladder": [
      { "stage": "Problem identified", "status": "Complete", "notes": "" },
      { "stage": "Target customer defined", "status": "Complete", "notes": "" },
      { "stage": "Customer interviews completed", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Problem severity confirmed", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Solution tested", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Willingness to pay tested", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Pilot users secured", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Paying customer secured", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Repeat demand demonstrated", "status": "Not yet evidenced", "notes": "" },
      { "stage": "Scalable acquisition tested", "status": "Not yet evidenced", "notes": "" }
    ],
    "biggestAssumption": "",
    "recommendedTest": {
      "hypothesis": "",
      "targetParticipants": "",
      "method": "Problem discovery interviews and manual solution walk-through",
      "sampleSize": "10 target customers",
      "successThreshold": "70% confirm high pain and request trial",
      "reconsiderationThreshold": "Fewer than 3 confirm high pain",
      "timeRequired": "4 weeks",
      "estimatedCost": "$200 - $500",
      "evidenceProduced": "Qualitative interview transcripts and pilot participant sign-ups"
    },
    "interviewGuidance": {
      "whoToContact": ["", ""],
      "whatToAsk": ["", ""],
      "whatNotToAsk": ["Do not ask 'Do you think this is a good idea?' or 'Would you buy this?' hypothetically."],
      "evidenceToRecord": ["Current workarounds, actual money spent, frequency of issue."]
    }
  },
  "marketCompetition": {
    "primaryTargetCustomer": "",
    "earlyAdopter": "",
    "customerProblem": "",
    "customerUrgency": "Moderate Urgency",
    "purchasingDecisionMaker": "",
    "marketEntryPoint": "",
    "competitorsAlternatives": ["", ""],
    "switchingBarriers": "High switching inertia due to existing manual habits",
    "competitiveAdvantageRating": { "rating": "Emerging", "explanation": "" },
    "whyCustomersSwitch": "",
    "commercialModel": {
      "whoPays": "",
      "paymentMethod": "Monthly Recurring / Per Usage",
      "revenueType": "Recurring Subscription",
      "priceAssumptions": "",
      "costToServe": "Low variable cost per user",
      "grossMarginPotential": "70-80%",
      "salesCycle": "1-4 weeks",
      "scalability": "High scalability once distribution is established",
      "acquisitionReqs": "Direct outreach and referral partners"
    }
  },
  "adviserOpinion": {
    "whatIsEncouraging": "",
    "whatRequiresCaution": "",
    "whatHasNotBeenProven": "",
    "whatIWouldDoNext": "",
    "currentRecommendation": "Proceed with Controlled Validation"
  },
  "ninetyDayRoadmap": {
    "month1": {
      "phase": "Days 1–30 — Understand the Problem",
      "goal": "Confirm whether the problem is frequent, painful and important enough for the target customer to seek a better solution.",
      "weeks": [
        { "week": "Week 1", "objective": "Define Customer Persona & Hypothesis Script", "tasks": ["Draft interview guide", "List 20 prospective contacts"], "estimatedHours": "5 hours", "output": "Approved interview script & target contact list" },
        { "week": "Week 2", "objective": "Conduct Initial Customer Interviews", "tasks": ["Reach out to contacts", "Conduct 3-5 discovery calls"], "estimatedHours": "5 hours", "output": "Notes from 3+ interviews" },
        { "week": "Week 3", "objective": "Synthesize Problem Findings", "tasks": ["Complete remaining interviews", "Group pain points by frequency"], "estimatedHours": "5 hours", "output": "Problem validation summary" },
        { "week": "Week 4", "objective": "Refine Value Proposition", "tasks": ["Adjust messaging based on interviews", "Define testable solution concept"], "estimatedHours": "5 hours", "output": "Refined value proposition" }
      ]
    },
    "month2": {
      "phase": "Days 31–60 — Test the Solution",
      "goal": "Determine whether customers understand the proposed solution and consider it valuable enough to trial or purchase.",
      "weeks": [
        { "week": "Week 5", "objective": "Create Prototype / Concept Deck", "tasks": ["Build 5-slide visual concept or wireframe"], "estimatedHours": "5 hours", "output": "Clickable prototype or concering deck" },
        { "week": "Week 6", "objective": "Solution Feedback Calls", "tasks": ["Show concept deck to 5 previous interviewees"], "estimatedHours": "5 hours", "output": "Feature priority ranking" },
        { "week": "Week 7", "objective": "Test Pricing & Value Expectation", "tasks": ["Present price options and gauge commitment"], "estimatedHours": "5 hours", "output": "Pricing response notes" },
        { "week": "Week 8", "objective": "Finalize Pilot Offer", "tasks": ["Package MVP pilot terms for early adopters"], "estimatedHours": "5 hours", "output": "Pilot offer agreement sheet" }
      ]
    },
    "month3": {
      "phase": "Days 61–90 — Validate Demand",
      "goal": "Gather enough evidence to decide whether further investment is commercially justified.",
      "weeks": [
        { "week": "Week 9", "objective": "Recruit Pilot Participants", "tasks": ["Invite top prospects to join pilot"], "estimatedHours": "5 hours", "output": "2+ confirmed pilot sign-ups" },
        { "week": "Week 10", "objective": "Execute Manual Pilot Service", "tasks": ["Deliver manual/concierge service for pilot users"], "estimatedHours": "5 hours", "output": "Pilot execution feedback" },
        { "week": "Week 11", "objective": "Measure Pilot Outcomes & Value Delivered", "tasks": ["Conduct end-of-pilot review calls"], "estimatedHours": "5 hours", "output": "Pilot testimonial & case study data" },
        { "week": "Week 12", "objective": "Reassessment & Investment Decision", "tasks": ["Update PitchLab answers with evidence", "Decide on next build phase"], "estimatedHours": "5 hours", "output": "Updated PitchLab Commercial Score" }
      ]
    }
  },
  "actionPlan": {
    "currentRecommendation": "Proceed with Controlled Validation",
    "topFivePriorities": [
      { "priority": "Conduct Discovery Interviews", "action": "Interview 10 target customers focusing on current workarounds.", "metric": "10 completed interviews" },
      { "priority": "Confirm Problem Severity", "action": "Verify if customers actively spend money or time trying to solve this today.", "metric": "70% confirmation rate" },
      { "priority": "Define Concierge MVP", "action": "Design the simplest manual service version before writing code.", "metric": "MVP spec document" },
      { "priority": "Test Willingness to Pay", "action": "Present target pricing to 5 prospects for direct feedback.", "metric": "2 written pilot commitments" },
      { "priority": "Establish Execution Cadence", "action": "Block out 5 dedicated hours per week for customer validation.", "metric": "Consistent weekly milestone completion" }
    ],
    "nextSevenDaysAction": "Draft your customer discovery interview script and list 10 target contacts in your network.",
    "biggestUnknown": "Whether target customers feel enough pain with their current solution to switch.",
    "biggestStrength": "Strong founder domain expertise and deep understanding of the problem.",
    "successLooksLike90Days": [
      "10 completed discovery interviews with target customers.",
      "Verified evidence that the problem is urgent and frequent.",
      "At least 2 pilot participants committed to testing the solution."
    ],
    "readinessChecklist": [
      { "milestone": "Problem clearly defined", "completed": true },
      { "milestone": "Target customer clearly defined", "completed": true },
      { "milestone": "Customer interviews completed", "completed": false },
      { "milestone": "Problem severity confirmed", "completed": false },
      { "milestone": "Value proposition tested", "completed": false },
      { "milestone": "Pricing tested", "completed": false },
      { "milestone": "MVP or pilot tested", "completed": false },
      { "milestone": "First customer commitment secured", "completed": false },
      { "milestone": "Business model tested", "completed": false },
      { "milestone": "Go-to-market approach tested", "completed": false },
      { "milestone": "Financial assumptions prepared", "completed": false },
      { "milestone": "Ready for further investment", "completed": false }
    ],
    "reassessmentCTA": "Return to PitchLab after completing your priority validation activities. Update your evidence, customer feedback, and pilot outcomes to generate a new assessment and measure progress."
  }
};

const jsonString = JSON.stringify(masterTemplate, null, 2);
fs.writeFileSync(path.join(__dirname, 'master_template.json'), jsonString, 'utf8');
console.log("Master template successfully generated!");
