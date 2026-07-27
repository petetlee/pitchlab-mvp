const fs = require('fs');
const path = require('path');

const indexJsPath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(indexJsPath, 'utf8');

// Find start of EXPECTED JSON STRUCTURE
const startTag = 'EXPECTED JSON STRUCTURE:';
const startIdx = content.indexOf(startTag);

if (startIdx === -1) {
  console.error("Could not find EXPECTED JSON STRUCTURE");
  process.exit(1);
}

// Find where evaluationPrompt backtick ends
const endTag = '\n    `;\n\n    // 7. Build the evaluation schema.';
let endIdx = content.indexOf(endTag, startIdx);

if (endIdx === -1) {
  // Fallback search for end of prompt backtick
  endIdx = content.indexOf('`;', startIdx);
}

if (endIdx === -1) {
  console.error("Could not find end of evaluationPrompt backtick");
  process.exit(1);
}

const cleanMasterTemplate = `{
  "meta": {
    "businessName": "Smart Tax",
    "conceptSummary": "Automated GST and Tax Set-Aside Solution for SMBs",
    "founderName": "Peter Lee",
    "founderRegion": "New Zealand",
    "locationCountry": "New Zealand",
    "assessmentDate": "2026-07-26",
    "isBaseline": true
  },
  "summaryBlock": {
    "overallScore": 63,
    "scoreBand": {
      "name": "Emerging Opportunity",
      "meaning": "Encouraging foundations exist, but important commercial assumptions remain untested. Proceed through structured validation."
    },
    "pitchLabVerdict": "This idea addresses a credible customer problem and benefits from relevant founder expertise, but its commercial potential now depends on validating real customer demand and willingness to pay before further development.",
    "threePriorityActions": [
      {
        "heading": "1. Conduct Customer Discovery",
        "explanation": "Interview 10 target small business owners to confirm the severity of the GST tax set-aside pain point.",
        "outcome": "10 completed interview transcripts with verified problem frequency data."
      },
      {
        "heading": "2. Define Concierge MVP",
        "explanation": "Design a simple manual service or single accounting integration test before investing in software code.",
        "outcome": "Concierge MVP workflow spec and early adopter trial agreement."
      },
      {
        "heading": "3. Test Willingness to Pay",
        "explanation": "Present target subscription pricing to 5 prospects for direct feedback.",
        "outcome": "2 written pilot commitments or pre-order sign-ups."
      }
    ],
    "executiveSnapshot": {
      "recommendation": "Proceed with Controlled Validation",
      "biggestStrength": "Exceptional founder domain expertise as a Chartered Accountant with deep financial knowledge.",
      "biggestRisk": "Uncertain customer willingness to pay and switch from current manual habits prior to validation.",
      "biggestUnknown": "Whether small business owners will grant third-party access to automate tax transfers.",
      "suggestedValidationPeriod": "90 Days",
      "timeAvailable": "0-5 hours/week"
    },
    "progressFraming": "Your score reflects your idea’s current level of commercial readiness. It is not a permanent grade on you or your business."
  },
  "executiveSummary": "Smart Tax addresses a well-defined operational pain point: small businesses mismanaging GST and tax set-asides due to cash flow misconceptions. The founder possesses deep industry expertise as a Chartered Accountant, creating strong founder-market fit. However, no direct customer validation data currently exists to prove demand, willingness to pay, or switching behavior. By following a structured 90-day validation roadmap within the founder's 0-5 available weekly hours, PitchLab recommends conducting targeted discovery interviews and executing a concierge pilot to de-risk the venture before committing software capital.",
  "scorecard": {
    "problemCustomerClarity": {
      "scoreAchieved": 13,
      "maxScore": 15,
      "evidenceLevel": "Strong Evidence",
      "explanation": "The problem of tax set-aside mismanagement is clearly defined and universally recognized among NZ SMBs.",
      "missingEvidence": "Direct confirmation from target customers regarding specific pain frequency.",
      "howToImprove": "Document 10 customer interview quotes confirming problem severity."
    },
    "founderCapabilityFit": {
      "scoreAchieved": 14,
      "maxScore": 15,
      "evidenceLevel": "Strong Evidence",
      "explanation": "Founder has 20+ years of financial management, accounting, and systems consultancy experience.",
      "missingEvidence": "Direct technical software engineering background.",
      "howToImprove": "Partner with a tech lead or leverage no-code concierge integrations."
    },
    "customerValidation": {
      "scoreAchieved": 5,
      "maxScore": 20,
      "evidenceLevel": "Not yet evidenced",
      "explanation": "Baseline assessment: no direct customer interviews, pilots, or pre-orders conducted yet.",
      "missingEvidence": "Interview transcripts, pilot agreements, and pricing feedback.",
      "howToImprove": "Execute 10 problem discovery calls over the next 30 days."
    },
    "marketCommercialOpportunity": {
      "scoreAchieved": 11,
      "maxScore": 15,
      "evidenceLevel": "Partial Evidence",
      "explanation": "Large target market of SMBs and sole traders using cloud accounting like Xero.",
      "missingEvidence": "Quantified customer acquisition cost (CAC) and conversion metrics.",
      "howToImprove": "Test distribution channels through accounting partner networks."
    },
    "businessModelWillingnessToPay": {
      "scoreAchieved": 8,
      "maxScore": 15,
      "evidenceLevel": "Not yet evidenced",
      "explanation": "Proposed monthly recurring subscription model is sound but unvalidated.",
      "missingEvidence": "Tested price points and confirmed willingness to pay.",
      "howToImprove": "Present pricing terms to 5 target prospects during solution testing."
    },
    "competitivePosition": {
      "scoreAchieved": 6,
      "maxScore": 10,
      "evidenceLevel": "Partial Evidence",
      "explanation": "Primary competition includes manual spreadsheets, doing nothing, or standard bank sub-accounts.",
      "missingEvidence": "Validated switching trigger and defensible feature barrier.",
      "howToImprove": "Highlight automated bank-rule discipline as the unique value proposition."
    },
    "executionReadiness": {
      "scoreAchieved": 6,
      "maxScore": 10,
      "evidenceLevel": "Partial Evidence",
      "explanation": "Founder has high commercial capability but limited 0-5 hours/week available time.",
      "missingEvidence": "Dedicated weekly execution schedule.",
      "howToImprove": "Block out 5 recurring hours per week strictly for customer discovery."
    }
  },
  "swot": {
    "strengths": [
      "Deep founder domain expertise in accounting and financial systems.",
      "Clear, relatable problem statement addressing SMB cash flow discipline.",
      "Lean initial capital budget ($5,000 - $10,000) minimizing early risk."
    ],
    "weaknesses": [
      "Zero customer validation evidence at baseline stage.",
      "Limited weekly founder availability (0-5 hours/week).",
      "No in-house software engineering capacity."
    ],
    "opportunities": [
      "High adoption of cloud accounting APIs (Xero, MYOB) in New Zealand.",
      "Partner distribution through accounting and bookkeeping firms.",
      "Automated tax compliance regulation incentives."
    ],
    "threats": [
      "Customer inertia and reliance on manual sub-accounts.",
      "Accounting software incumbents adding native tax buffer features.",
      "Regulatory & banking API integration complexities."
    ],
    "interpretation": "SWOT highlights exceptional founder credibility applied to a real market problem. The principal commercial objective is replacing assumptions with direct customer evidence before building software."
  },
  "leanCanvas": {
    "problem": [
      "SMBs accidentally spend money reserved for GST and income tax obligations.",
      "Manual cash flow calculations are tedious and error-prone for sole traders."
    ],
    "customerSegments": [
      "NZ Sole Traders and Small Businesses (1-5 employees).",
      "Accountants & Bookkeepers managing client tax compliance."
    ],
    "earlyAdopters": [
      "Tech-savvy sole traders using Xero who have previously incurred IRD tax penalties."
    ],
    "existingAlternatives": [
      "Manual spreadsheets, separate savings sub-accounts, doing nothing until IRD tax dates."
    ],
    "uniqueValueProp": "Automated, low-friction GST set-aside that disciplines cash flow without full accounting software complexity.",
    "proposedSolution": [
      "Automated calculation based on incoming revenue feeds.",
      "Direct notification or automated transfer prompt to a dedicated tax account."
    ],
    "channels": [
      "Direct founder network & LinkedIn outreach.",
      "Accounting and bookkeeping referral partnerships."
    ],
    "revenueStreams": [
      "Monthly recurring SaaS subscription ($15 - $29/month per business)."
    ],
    "costStructure": [
      "Bank/Accounting API integration hosting.",
      "Customer acquisition & legal/compliance advisory."
    ],
    "keyMetrics": [
      "Number of active pilot accounts.",
      "Monthly recurring revenue (MRR) and churn rate."
    ],
    "unfairAdvantage": "Chartered Accountant founder status providing immediate trust, domain knowledge, and advisor network."
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
    "keep": [
      "Core automated GST calculation algorithm.",
      "Single integration with Xero accounting API."
    ],
    "simplify": [
      "User onboarding flow down to a 3-step setup.",
      "Dashboard display focusing solely on Tax Pot vs Available Cash."
    ],
    "delay": [
      "Native mobile iOS/Android apps (use web-responsive UI).",
      "Multi-currency, payroll, and invoicing features."
    ],
    "smallestTestableVersion": "A concierge MVP where the founder manually calculates tax set-asides for 5 pilot clients weekly to test workflow demand."
  },
  "mvpFeasibility": {
    "recommendedTestFormat": "Manual Concierge Pilot / Web Prototype",
    "complexityLevel": "Moderate Complexity",
    "suggestedValidationBudget": "$500 - $1,500",
    "whatToInclude": [
      "Simple tax set-aside calculation engine.",
      "Read-only Xero API integration for revenue feeds."
    ],
    "whatToExclude": [
      "Full general ledger features.",
      "Direct IRD payment filing and multi-entity support."
    ],
    "evidenceRequiredBeforeBuildingMore": "Written commitment from 3 pilot customers willing to pay for the automated service."
  },
  "businessTheme": {
    "primaryTheme": "FinTech & SMB Business Services",
    "secondaryTheme": "Workflow Automation",
    "whyFits": "Fits the founder's 20+ year Chartered Accountant background perfectly while addressing widespread small business cash flow errors.",
    "typicalSuccessFactors": [
      "Seamless integration with existing accounting tools.",
      "Zero friction setup for non-financial founders."
    ],
    "typicalRisks": [
      "Building unnecessary accounting features that overlap with Xero.",
      "Underestimating customer acquisition inertia."
    ],
    "founderImplications": "Leverage domain authority to lead discovery, but maintain extreme feature discipline."
  },
  "founderAssessment": {
    "commercialCapabilities": {
      "industryKnowledge": { "rating": "Exceptional", "evidence": "20+ years as Chartered Accountant and Finance Manager." },
      "customerUnderstanding": { "rating": "Capable", "evidence": "Intimate knowledge of tax compliance pain points." },
      "commercialFinancial": { "rating": "Exceptional", "evidence": "Expert in financial modeling, compliance, and budgeting." },
      "salesAcquisition": { "rating": "Developing", "evidence": "Untested sales and customer acquisition channels." },
      "operationalExecution": { "rating": "Capable", "evidence": "Strong project management and corporate governance." },
      "technologyCapability": { "rating": "Capable", "evidence": "High financial systems fluency, limited coding background." },
      "leadershipDecision": { "rating": "Strong", "evidence": "Proven executive experience across diverse businesses." },
      "networkPartnerships": { "rating": "Strong", "evidence": "Established accountant and advisor network in New Zealand." },
      "learningAdaptability": { "rating": "Strong", "evidence": "Methodical approach to validation and strategic learning." }
    },
    "founderMarketFit": "Exceptional founder-market fit. The founder's CA background creates immediate credibility with business owners and advisory partners.",
    "capabilityGaps": [
      { "gap": "Direct software engineering", "remedy": "Engage a technical partner or no-code builder for MVP.", "solutionType": "Contracting" },
      { "gap": "Digital customer acquisition", "remedy": "Focus initially on warm advisor referral networks.", "solutionType": "Advisory support" }
    ],
    "timeReality": {
      "weeklyAvailableHours": "0-5 hours/week",
      "expectedPace": "Steady validation pace over 90 days",
      "scopeFit": "Scope fits available time if software development is delayed until validation is complete.",
      "messaging": "Many founders begin while balancing employment or existing commitments. Consistent progress is more important than unrealistic full-time expectations during early validation."
    },
    "capitalReality": {
      "availableCapital": "$5,000 - $10,000",
      "amountWillingToInvest": "$5,000",
      "initialRiskCapital": "$1,000",
      "recommendedValidationBudget": "$500 - $1,500",
      "capitalPreservationAdvice": "Preserve capital until customer discovery interviews confirm willingness to pay."
    }
  },
  "validation": {
    "ladder": [
      { "stage": "Problem identified", "status": "Complete", "notes": "Pain point clearly articulated" },
      { "stage": "Target customer defined", "status": "Complete", "notes": "NZ sole traders & SMBs" },
      { "stage": "Customer interviews completed", "status": "Not yet evidenced", "notes": "Target: 10 interviews" },
      { "stage": "Problem severity confirmed", "status": "Not yet evidenced", "notes": "To be tested in Month 1" },
      { "stage": "Solution tested", "status": "Not yet evidenced", "notes": "To be tested in Month 2" },
      { "stage": "Willingness to pay tested", "status": "Not yet evidenced", "notes": "To be tested in Month 2" },
      { "stage": "Pilot users secured", "status": "Not yet evidenced", "notes": "Target: 2-3 pilots" },
      { "stage": "Paying customer secured", "status": "Not yet evidenced", "notes": "Target: 1 paid trial" },
      { "stage": "Repeat demand demonstrated", "status": "Not yet evidenced", "notes": "Post 90-day phase" },
      { "stage": "Scalable acquisition tested", "status": "Not yet evidenced", "notes": "Post 90-day phase" }
    ],
    "biggestAssumption": "Target customers feel enough pain with their current manual methods to adopt a dedicated tax set-aside tool.",
    "recommendedTest": {
      "hypothesis": "At least 7 out of 10 interviewed sole traders confirm that managing GST cash flow is a recurring headache.",
      "targetParticipants": "10 sole traders and SMB owners using Xero",
      "method": "Structured 20-minute problem discovery calls using objective questions.",
      "sampleSize": "10 participants",
      "successThreshold": "70% confirm high severity and ask to join the pilot",
      "reconsiderationThreshold": "Fewer than 3 confirm high pain",
      "timeRequired": "4 weeks (Month 1)",
      "estimatedCost": "$200 - $500",
      "evidenceProduced": "Qualitative interview transcripts and problem severity ratings"
    },
    "interviewGuidance": {
      "whoToContact": [
        "Sole traders in your professional network",
        "Small business clients of friendly bookkeepers"
      ],
      "whatToAsk": [
        "How do you currently set aside funds for GST and income tax?",
        "Have you ever been surprised by a tax bill or incurred IRD penalties?",
        "What workarounds have you tried, and what did they cost?"
      ],
      "whatNotToAsk": [
        "Do not ask 'Do you think Smart Tax is a good idea?'",
        "Do not ask 'Would you buy this software hypothetically?'"
      ],
      "evidenceToRecord": [
        "Actual money spent on penalties/workarounds",
        "Frequency of tax cash flow anxiety"
      ]
    }
  },
  "marketCompetition": {
    "primaryTargetCustomer": "NZ Sole Traders & Small Business Owners (1-5 staff)",
    "earlyAdopter": "Sole traders using Xero who have experienced GST cash flow shortages.",
    "customerProblem": "Accidentally spending tax obligations before quarterly filing dates.",
    "customerUrgency": "High urgency during tax payment deadlines, moderate ongoing.",
    "purchasingDecisionMaker": "Business owner / sole trader.",
    "marketEntryPoint": "Direct outreach to sole trader network and accounting partners.",
    "competitorsAlternatives": [
      "Manual spreadsheets and separate bank sub-accounts",
      "Accounting software built-in reporting (non-automated)",
      "Doing nothing until IRD filing dates"
    ],
    "switchingBarriers": "Moderate inertia due to existing manual habits.",
    "competitiveAdvantageRating": {
      "rating": "Emerging",
      "explanation": "Advantage relies on founder's trusted CA authority and focused low-friction user experience."
    },
    "whyCustomersSwitch": "Automatic discipline that eliminates manual calculations and prevents IRD penalty stress.",
    "commercialModel": {
      "whoPays": "Small business owner / sole trader",
      "paymentMethod": "Monthly recurring credit card subscription",
      "revenueType": "Recurring SaaS",
      "priceAssumptions": "$19/month per active business account",
      "costToServe": "Low hosting & API cost ($2 - $4/month)",
      "grossMarginPotential": "75 - 85%",
      "salesCycle": "1 - 3 weeks",
      "scalability": "High scalability once API integrations are built",
      "acquisitionReqs": "Accounting firm referral partnerships"
    }
  },
  "adviserOpinion": {
    "whatIsEncouraging": "Exceptional founder background as a Chartered Accountant, addressing a universally understood cash flow pain point with a lean budget.",
    "whatRequiresCaution": "Do not build full accounting features. Resist scope creep and delay custom app development until customer willingness to pay is proven.",
    "whatHasNotBeenProven": "Direct customer evidence confirming willingness to pay and switch from manual sub-accounts.",
    "whatIWouldDoNext": "Conduct 10 problem discovery interviews over the next 30 days following the 90-Day Validation Roadmap.",
    "currentRecommendation": "Proceed with Controlled Validation"
  },
  "ninetyDayRoadmap": {
    "month1": {
      "phase": "Days 1–30 — Understand the Problem",
      "goal": "Confirm whether the problem is frequent, painful and important enough for the target customer to seek a better solution.",
      "weeks": [
        { "week": "Week 1", "objective": "Define Customer Persona & Interview Guide", "tasks": ["Draft objective interview script", "Identify 15 target contacts"], "estimatedHours": "4 hours", "output": "Approved interview script" },
        { "week": "Week 2", "objective": "Conduct Initial Customer Discovery Calls", "tasks": ["Outreach to contacts", "Execute 3-4 discovery calls"], "estimatedHours": "4 hours", "output": "Notes from 3+ interviews" },
        { "week": "Week 3", "objective": "Complete Problem Interviews", "tasks": ["Conduct remaining 6 discovery calls", "Synthesize pain points"], "estimatedHours": "4 hours", "output": "10 completed interview summaries" },
        { "week": "Week 4", "objective": "Refine Value Proposition & Solution Concept", "tasks": ["Group recurring customer quotes", "Define core MVP test features"], "estimatedHours": "4 hours", "output": "Validated problem statement" }
      ]
    },
    "month2": {
      "phase": "Days 31–60 — Test the Solution",
      "goal": "Determine whether customers understand the proposed solution and consider it valuable enough to trial or purchase.",
      "weeks": [
        { "week": "Week 5", "objective": "Build Visual Prototype / Concept Deck", "tasks": ["Create 5-slide visual concept of Smart Tax dashboard"], "estimatedHours": "4 hours", "output": "Clickable concept prototype" },
        { "week": "Week 6", "objective": "Present Solution Concept to Prospects", "tasks": ["Show concept deck to 5 discovery participants"], "estimatedHours": "4 hours", "output": "Feature feedback ratings" },
        { "week": "Week 7", "objective": "Test Pricing & Payment Terms", "tasks": ["Present $19/mo pricing and ask for pilot commitment"], "estimatedHours": "4 hours", "output": "Pricing acceptance data" },
        { "week": "Week 8", "objective": "Finalize Pilot Program Offer", "tasks": ["Package concierge MVP pilot offer for early adopters"], "estimatedHours": "4 hours", "output": "Pilot offer sheet" }
      ]
    },
    "month3": {
      "phase": "Days 61–90 — Validate Demand",
      "goal": "Gather enough evidence to decide whether further investment is commercially justified.",
      "weeks": [
        { "week": "Week 9", "objective": "Recruit Pilot Participants", "tasks": ["Invite top prospects to join 30-day manual pilot"], "estimatedHours": "4 hours", "output": "2+ signed pilot agreements" },
        { "week": "Week 10", "objective": "Execute Manual Concierge Service", "tasks": ["Deliver weekly manual tax set-aside reports for pilot users"], "estimatedHours": "4 hours", "output": "Pilot execution log" },
        { "week": "Week 11", "objective": "Evaluate Pilot Results & Testimonials", "tasks": ["Gather end-of-pilot customer feedback"], "estimatedHours": "4 hours", "output": "Customer testimonial data" },
        { "week": "Week 12", "objective": "PitchLab Reassessment & Build Decision", "tasks": ["Update PitchLab answers with pilot evidence", "Decide software build phase"], "estimatedHours": "4 hours", "output": "Updated PitchLab Commercial Score" }
      ]
    }
  },
  "actionPlan": {
    "currentRecommendation": "Proceed with Controlled Validation",
    "topFivePriorities": [
      { "priority": "Conduct Discovery Interviews", "action": "Interview 10 target small business owners on current tax cash flow habits.", "metric": "10 completed interviews" },
      { "priority": "Confirm Problem Severity", "action": "Verify if customers spend time or money trying to solve tax set-aside errors today.", "metric": "70% confirmation rate" },
      { "priority": "Define Concierge MVP", "action": "Design the simplest manual service version before writing software code.", "metric": "MVP spec document" },
      { "priority": "Test Willingness to Pay", "action": "Present $19/mo target pricing to 5 prospects for direct feedback.", "metric": "2 pilot commitments" },
      { "priority": "Establish Execution Cadence", "action": "Block out 4 dedicated hours per week for customer validation.", "metric": "Weekly milestone completion" }
    ],
    "nextSevenDaysAction": "Draft your customer discovery interview script and list 10 target contacts in your network.",
    "biggestUnknown": "Whether target customers feel enough pain with their current manual methods to switch.",
    "biggestStrength": "Exceptional founder Chartered Accountant background providing immediate domain authority.",
    "successLooksLike90Days": [
      "10 completed discovery interviews with target small business owners.",
      "Verified evidence that tax cash flow anxiety is a recurring, urgent pain point.",
      "At least 2 pilot participants committed to testing the concierge solution."
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
}`;

const before = content.substring(0, startIdx);

const replacement = `EXPECTED JSON STRUCTURE:
      You MUST return ONLY a JSON object that matches the following structure exactly (with appropriate values filled in). Do not include any other root keys.
` + cleanMasterTemplate + '\n    `;';

const after = content.substring(endIdx + 2); // after backtick

content = before + replacement + after;

// Scrub any lingering unicode null byte glitches
content = content.replace(/\u0000/g, '');

fs.writeFileSync(indexJsPath, content, 'utf8');
console.log("SUCCESSFULLY CLEANED index.js with 100% UTF-8 encoding!");
