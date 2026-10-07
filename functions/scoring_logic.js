/**
 * PitchLab Master Sub-Factor Scoring Engine & Assessment Integrity System
 * Evaluates 7 commercial categories strictly using deterministic sub-factor rules.
 * Distinguishes General Founder Capability from Founder-Idea Fit.
 * Distinguishes TAM from Accessible Commercial Opportunity.
 * Detects Venture-Critical Feasibility Gates and enforces Score-Narrative Reconciliation.
 */

const SCORING_CONFIG = {
  CATEGORIES: {
    problemCustomerClarity: {
      max: 14,
      label: "Problem and customer clarity",
      aliases: ["ideaClarity", "problemStrength", "problemCustomerClarity"],
      defaultMissing: "Empirical data quantifying problem frequency, severity, and exact customer persona boundaries.",
      defaultImprove: "Conduct 10 focused problem discovery conversations with ideal customer profiles without pitching the solution.",
      subFactorWeights: {
        problemDescription: 3,
        targetCustomerSpecificity: 3,
        rootCauseVsSymptom: 2,
        frequencySeriousness: 2,
        existingWorkarounds: 2,
        customerConsequences: 1,
        scopeFocus: 1
      }
    },
    founderCapabilityFit: {
      max: 15,
      label: "Founder capability and fit",
      aliases: ["founderFit", "founderCapabilityFit", "founderExperience"],
      defaultMissing: "Documented proof of domain credentials, technical execution capability, or direct target customer access.",
      defaultImprove: "Bridge technical or commercial capability gaps by onboarding a specialist advisor or technical contractor.",
      subFactorWeights: {
        industryExperience: 3,
        problemUnderstanding: 3,
        operationalCapability: 2,
        customerAccess: 2,
        commercialCapability: 2,
        marketCredibility: 1,
        learningAdaptability: 1,
        validationLeadership: 1
      }
    },
    customerValidation: {
      max: 20,
      label: "Customer validation",
      aliases: ["validationReadiness", "customerValidation"],
      defaultMissing: "Structured discovery interview logs, LOIs, pre-orders, or recorded feedback from target users.",
      defaultImprove: "Execute a manual concierge pilot or structured interviews with 5-10 target users to gather empirical usage and satisfaction data.",
      subFactorWeights: {
        customerInterviews: 4,
        problemSeverityConfirmed: 3,
        solutionTested: 3,
        pricingTested: 3,
        pilotUsers: 3,
        payingCustomers: 2,
        repeatRetention: 2
      }
    },
    marketCommercialOpportunity: {
      max: 14,
      label: "Market and commercial opportunity",
      aliases: ["marketAttractiveness", "marketCommercialOpportunity"],
      defaultMissing: "Validated market segment sizing, urgency indicators, and customer channel reachability proof.",
      defaultImprove: "Calculate bottom-up addressable market size and test cold outreach response rates across two acquisition channels.",
      subFactorWeights: {
        targetMarketIdentifiable: 3,
        commerciallyMeaningfulNeed: 3,
        marketAccessible: 2,
        customerUrgency: 2,
        expansionPotential: 2,
        regulatoryDrivers: 1,
        marketEvidence: 1
      }
    },
    businessModelWillingnessToPay: {
      max: 14,
      label: "Business model and willingness to pay",
      aliases: ["businessModel", "businessModelWillingnessToPay"],
      defaultMissing: "Tested pricing tiers, unit margin calculations, and explicit customer payment commitments.",
      defaultImprove: "Present formal pricing options during customer discovery calls to test deposit or subscription willingness.",
      subFactorWeights: {
        whoPaysIdentified: 2,
        revenueMechanismDefined: 2,
        pricingHypothesis: 2,
        costToServeLogic: 2,
        recurringPotential: 2,
        grossMarginLogic: 2,
        willingnessToPayEvidence: 2
      }
    },
    competitivePosition: {
      max: 9,
      label: "Competitive position",
      aliases: ["competitivePosition", "competition"],
      defaultMissing: "Detailed feature and workflow benchmarking against existing manual workarounds and alternatives.",
      defaultImprove: "Map out step-by-step how customers currently solve this problem to highlight your core efficiency advantage.",
      subFactorWeights: {
        directCompetitors: 2,
        indirectAlternatives: 2,
        workaroundsIdentified: 2,
        differentiationArticulated: 1,
        switchingBarriers: 1,
        emergingAdvantage: 1
      }
    },
    executionReadiness: {
      max: 9,
      label: "Execution readiness",
      aliases: ["mvpFeasibility", "executionReadiness"],
      defaultMissing: "A formal 30-day low-cost validation plan with defined weekly milestones and budget boundaries.",
      defaultImprove: "Lock in a weekly time commitment (e.g. 10-15 hrs/week) dedicated strictly to customer discovery and validation.",
      subFactorWeights: {
        weeklyTimeDefined: 2,
        scopeMatchesTime: 2,
        initialCapitalDefined: 1,
        riskCapitalDefined: 1,
        lowCostValidationPlan: 1,
        capabilityGapsRecognized: 1,
        commitmentConsistency: 1
      }
    },
    futureTrends: {
      max: 5,
      label: "Future trends and market direction",
      aliases: ["futureTrends", "marketDirection", "futureOutlook"],
      defaultMissing: "Specific empirical signals on 3-10 year structural tailwinds, regulatory shifts, or technology trajectories.",
      defaultImprove: "Monitor key technology adoption milestones and regulatory policy signals relevant to your target market segment.",
      subFactorWeights: {
        marketTrajectory: 1,
        technologyDirection: 1,
        customerBehaviourShifts: 1,
        regulatoryPolicyDirection: 1,
        longTermRelevance: 1
      }
    }
  },

  BANDS: [
    { min: 85, max: 100, name: "Investment Ready", meaning: "Strong commercial foundations supported by meaningful evidence. Focus should move toward disciplined execution, growth planning and capital allocation." },
    { min: 70, max: 84, name: "High Potential", meaning: "A promising opportunity with strong fundamentals. Some areas still require validation or strengthening before major investment." },
    { min: 55, max: 69, name: "Emerging Opportunity", meaning: "Encouraging foundations exist, but important commercial assumptions remain untested. Proceed through structured validation." },
    { min: 40, max: 54, name: "Early-Stage Potential", meaning: "The idea may have potential, but the problem, customer, solution or business model requires further clarification and evidence." },
    { min: 0, max: 39, name: "Exploration Stage", meaning: "The opportunity is still being defined. Focus on customer understanding and refining the concept before committing significant capital or development effort." }
  ]
};

/**
 * Classifies the internal venture type based on raw inputs.
 */
function classifyVentureType(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const text = `${idea} ${problem} ${category}`;

  if (text.match(/\b(nuclear|atomic|smr|fission|fusion|power plant|electric grid|dam|hydroelectric|geothermal|refinery|pipeline|mining|railway|airport|infrastructure|utility scale)\b/i)) {
    return 'Energy / Infrastructure / Heavy Industrial';
  }
  if (text.match(/\b(pharma|drug|clinical trial|medical device|biotech|surgical|implant|gene therapy|diagnostic|hospital)\b/i)) {
    return 'Medical / Biotech / Clinical';
  }
  if (text.match(/\b(quantum|semiconductor|nanotech|fusion|robotics|satellite|aerospace|rocket|deep tech)\b/i)) {
    return 'Deep Technology / Scientific';
  }
  if (text.match(/mooring|solar-powered|device|hardware|sensor|enclosure|physical product|equipment|machinery/)) {
    return 'Physical Consumer Product / Hardware';
  }
  if (text.match(/manufacturing|factory|assembly|tooling|mould|mass production/)) {
    return 'Manufacturing';
  }
  if (text.match(/bank|fintech|tax|gst|accounting|payroll|insurance|lending|wealth|payment/)) {
    return 'Financial Services / FinTech';
  }
  if (text.match(/marketplace|platform|two-sided|directory/)) {
    return 'Marketplace';
  }
  if (text.match(/plumb|electrician|builder|carpenter|roofer|painter|hvac|mechanic|handyman|\blawn\b|\bmow\b|cleaning|pest control|landscaping|\btrade\b|\blocal service\b/)) {
    return 'Trade / Local Service';
  }
  if (text.match(/cafe|restaurant|baking|catering|bar|pub|food truck|hotel|hospitality/)) {
    return 'Hospitality';
  }
  if (text.match(/store|boutique|shop|e-commerce|shopify|retail/)) {
    return 'Retail / E-Commerce';
  }
  if (text.match(/consulting|agency|advisory|coaching|legal|law firm|accounting firm/)) {
    return 'Professional Services / Agency / Traditional SME';
  }
  if (text.match(/regulated|compliance service|gaming|casino|liquor/)) {
    return 'Regulated Service';
  }
  return 'SaaS / Software';
}

/**
 * Detects venture-critical feasibility gates & constraints (legal bans, regulatory approvals, extreme capital, etc.)
 */
function detectFeasibilityGates(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const targetMarket = (rawInputs.targetMarket || "").toLowerCase();
  const locationCountry = (rawInputs.locationCountry || "").toLowerCase();
  const locationRegion = (rawInputs.locationRegion || "").toLowerCase();
  const locationCity = (rawInputs.locationCity || "").toLowerCase();
  const locationSummary = (rawInputs.locationSummary || "").toLowerCase();
  const marketScope = (rawInputs.marketScope || "").toLowerCase();

  const exp = (rawInputs.experience || "").toLowerCase();
  const narrative = (rawInputs.founderBackgroundNarrative || "").toLowerCase();
  const cvText = (rawInputs.founderCvExtractedText || "").toLowerCase();

  const fullText = `${idea} ${problem} ${category} ${targetMarket} ${locationCountry} ${locationRegion} ${locationCity} ${locationSummary} ${marketScope}`.toLowerCase();
  const founderText = `${exp} ${narrative} ${cvText}`.toLowerCase();

  const gates = [];

  const isNuclear = Boolean(fullText.match(/\b(nuclear|atomic|power plant|reactor|fission|fusion|smr)\b/i));
  const isNZ = Boolean(fullText.match(/\b(new zealand|nz|kiwi|auckland|wellington|christchurch)\b/i)) || (locationCountry === "" && locationSummary === "");

  // 1. Statutory & Regulatory Framework Barrier
  if (isNuclear && isNZ) {
    gates.push({
      type: 'Legal & Statutory Framework Barrier',
      label: 'Land-based commercial nuclear power generation in New Zealand appears to face substantial statutory and regulatory barriers (under the Radiation Safety Act 2016, Resource Management Act 1991, and Atomic Energy Act 1945), distinct from the New Zealand Nuclear Free Zone Act 1987 warship/weapon prohibitions, subject to specialist legal confirmation',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  } else if (fullText.match(/\b(illegal|prohibited|unlawful|banned)\b/i)) {
    gates.push({
      type: 'Legal & Statutory Framework Barrier',
      label: 'Statutory or regulatory restrictions apply to this activity in the target jurisdiction, subject to specialist legal confirmation',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  // 2. Extreme Regulatory & Government Approval
  if (isNuclear || fullText.match(/\b(clinical trial|drug approval|fda approval|banking license|grid connection)\b/i)) {
    gates.push({
      type: 'Regulatory Dependency',
      label: 'Venture requires major government, statutory, safety, or environmental regulatory approvals before operating',
      severity: 'Critical',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // 3. Extreme Capital & Heavy Infrastructure Disproportion
  if (isNuclear || fullText.match(/\b(power plant|refinery|dam|utility scale|billion|hundred million|heavy infrastructure)\b/i)) {
    gates.push({
      type: 'Capital & Infrastructure Dependency',
      label: 'Multi-billion-dollar infrastructure capital requirement relative to founder initial validation budget',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  // 4. Unproven Scientific / Deep Tech Feasibility
  if (fullText.match(/\b(fusion|quantum|novel compound|unproven science|gene editing)\b/i)) {
    gates.push({
      type: 'Scientific / Technical Feasibility',
      label: 'Core technology or underlying scientific principle remains unproven or in fundamental R&D stage',
      severity: 'Critical',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // 5. Social, Political, Public Acceptance & Environmental Feasibility
  if (isNuclear || fullText.match(/\b(dam|mining|fracking|toxic|landfill|waste disposal|genetically modified)\b/i)) {
    gates.push({
      type: 'Social & Political Feasibility',
      label: 'Venture carries high social licence, community sentiment, public acceptance, or environmental regulatory barriers',
      severity: 'Major',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // Check Domain Fit Gap for High Specialization
  const isHighSpec = fullText.match(/\b(nuclear|atomic|power plant|clinical trial|drug|quantum|fusion|aerospace|satellite)\b/i);
  const hasDomainExp = founderText.match(/\b(nuclear|atomic|energy engineer|radiation|reactor|physicist|phd|md|doctor|clinical|oncology|biomedical|aerospace)\b/i);

  if (isHighSpec && !hasDomainExp) {
    gates.push({
      type: 'Domain Capability Gap',
      label: 'Founder lacks direct technical/regulatory domain expertise required for this high-specialization venture',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  const hasCriticalGate = gates.some(g => g.severity === 'Critical');

  let primaryGatingRisk = 'Customer Demand & Willingness to Pay';
  if (isNuclear || gates.some(g => g.type.includes('Legal') || g.type.includes('Regulatory'))) {
    primaryGatingRisk = 'Statutory & Regulatory Permissibility';
  } else if (gates.some(g => g.type.includes('Scientific') || g.type.includes('Technical'))) {
    primaryGatingRisk = 'Technical & Scientific Feasibility';
  } else if (gates.some(g => g.type.includes('Capital'))) {
    primaryGatingRisk = 'Capital & Infrastructure Scale';
  } else if (gates.some(g => g.type.includes('Domain'))) {
    primaryGatingRisk = 'Founder Domain Capability Gap';
  } else if (fullText.match(/mooring|hardware|device|sensor|manufacturing/)) {
    primaryGatingRisk = 'Technical Feasibility & Manufacturing';
  }

  return {
    hasCriticalGate,
    gates,
    summary: gates.map(g => g.label).join('; '),
    primaryGatingRisk
  };
}

/**
 * Returns dynamic Customer & Commercial Validation Ladder stages tailored to venture context & gating risk.
 */
function getValidationLadderForContext(ventureType = "", primaryGatingRisk = "", rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const isNuclear = idea.includes("nuclear");

  if (isNuclear || primaryGatingRisk === 'Statutory & Regulatory Permissibility' || ventureType.includes('Energy') || ventureType.includes('Regulated')) {
    return [
      { stage: 'Problem identified', status: 'Complete', notes: 'National energy security & baseload need confirmed' },
      { stage: 'Strategic need established', status: 'Complete', notes: 'Clean electricity demand & grid resilience' },
      { stage: 'Statutory permissibility assessed', status: 'Not yet evidenced', notes: 'Specialist legal assessment under RSA 2016, RMA 1991 & AEA 1945' },
      { stage: 'Regulatory pathway identified', status: 'Not yet evidenced', notes: 'Radiation safety, environmental consent & parliamentary reform roadmap' },
      { stage: 'Technical pre-feasibility assessed', status: 'Not yet evidenced', notes: 'Grid connection, cooling, site & TRL prerequisites' },
      { stage: 'Specialist team/advisers identified', status: 'Not yet evidenced', notes: 'Nuclear engineering & regulatory counsel expertise' },
      { stage: 'Capital feasibility assessed', status: 'Not yet evidenced', notes: 'Multi-billion CAPEX, financing structure & consortium requirements' },
      { stage: 'Policy/stakeholder feasibility assessed', status: 'Not yet evidenced', notes: 'Government policy, local council & community sentiment' },
      { stage: 'Off-taker interest tested', status: 'Not yet evidenced', notes: 'PPA & industrial off-taker validation' },
      { stage: 'Formal pre-feasibility completed', status: 'Not yet evidenced', notes: 'Evidence Gateway Decision (Proceed / Pivot / Stop)' }
    ];
  }
  if (ventureType.includes('Hardware') || ventureType.includes('Manufacturing') || idea.match(/mooring|device|hardware|sensor/)) {
    return [
      { stage: 'Problem identified', status: 'Complete', notes: 'Customer pain point confirmed' },
      { stage: 'Target customer defined', status: 'Complete', notes: 'User persona & operating environment defined' },
      { stage: 'Problem severity confirmed', status: 'Not yet evidenced', notes: 'Empirical user interviews & field observation' },
      { stage: 'Technical feasibility & CAD model', status: 'Not yet evidenced', notes: 'Core mechanical & electronic design' },
      { stage: 'Physical prototype built', status: 'Not yet evidenced', notes: 'Functional proof-of-concept prototype' },
      { stage: 'Field & durability testing completed', status: 'Not yet evidenced', notes: 'Real-world marine/outdoor stress testing' },
      { stage: 'Manufacturing unit economics verified', status: 'Not yet evidenced', notes: 'Supplier quotes & bill of materials' },
      { stage: 'Willingness to pay tested', status: 'Not yet evidenced', notes: 'Deposit / pre-order commitments' },
      { stage: 'Initial pilot batch produced', status: 'Not yet evidenced', notes: 'Small-batch manufacturing run' },
      { stage: 'Commercial distribution established', status: 'Not yet evidenced', notes: 'Retail or direct supply channel' }
    ];
  }
  if (ventureType.includes('Deep Technology') || primaryGatingRisk === 'Technical & Scientific Feasibility') {
    return [
      { stage: 'Problem identified', status: 'Complete', notes: 'Industry bottleneck identified' },
      { stage: 'Scientific principle validated', status: 'Complete', notes: 'Theoretical / lab proof' },
      { stage: 'Technical proof-of-concept', status: 'Not yet evidenced', notes: 'Benchtop demonstration' },
      { stage: 'IP & freedom to operate checked', status: 'Not yet evidenced', notes: 'Patent search & IP strategy' },
      { stage: 'Regulatory & safety pathway mapped', status: 'Not yet evidenced', notes: 'Compliance requirements' },
      { stage: 'Specialist advisory board formed', status: 'Not yet evidenced', notes: 'Domain expert advisors' },
      { stage: 'Prototype lab demonstration', status: 'Not yet evidenced', notes: 'Validated test performance' },
      { stage: 'Industry partner interest tested', status: 'Not yet evidenced', notes: 'Co-development / LOIs' },
      { stage: 'Pilot customer trial executed', status: 'Not yet evidenced', notes: 'Field validation trial' },
      { stage: 'Commercial licensing / rollout', status: 'Not yet evidenced', notes: 'Scale-up agreement' }
    ];
  }
  // Standard SaaS / Digital / Service
  return [
    { stage: 'Problem identified', status: 'Complete', notes: 'Problem statement defined' },
    { stage: 'Target customer defined', status: 'Complete', notes: 'Customer segment defined' },
    { stage: 'Customer interviews completed', status: 'Not yet evidenced', notes: 'Target: 10 interviews' },
    { stage: 'Problem severity confirmed', status: 'Not yet evidenced', notes: 'Empirical feedback' },
    { stage: 'Solution tested', status: 'Not yet evidenced', notes: 'Prototype / workflow test' },
    { stage: 'Willingness to pay tested', status: 'Not yet evidenced', notes: 'Pricing test' },
    { stage: 'Pilot users secured', status: 'Not yet evidenced', notes: 'Target: 2 pilots' },
    { stage: 'Paying customer secured', status: 'Not yet evidenced', notes: 'Target: 1 paying customer' },
    { stage: 'Repeat demand demonstrated', status: 'Not yet evidenced', notes: 'Retention tracking' },
    { stage: 'Scalable acquisition tested', status: 'Not yet evidenced', notes: 'Unit economics' }
  ];
}

/**
 * Returns dynamic Commercial Adviser Opinion block synthesizing the assessment without generic SaaS boilerplate.
 */
function getCommercialAdviserOpinion(reconciled = {}, ventureType = "", gatesInfo = {}, rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const isNuclear = idea.includes("nuclear");

  if (isNuclear || gatesInfo?.hasCriticalGate) {
    return {
      encouraging: "The underlying national energy-security problem is legitimate and strategically important.",
      caution: "The proposed solution faces substantial statutory, political, technical and capital barriers.",
      unproven: "Whether a credible legal/regulatory pathway exists for commercial nuclear generation in New Zealand, subject to specialist legal confirmation.",
      masterRecommendation: reconciled.masterRecommendation || "STOP - Current Formulation",
      portfolioDecision: "PARK",
      portfolioAction: "Preserve the underlying energy-security problem and monitor alternative solutions, jurisdictions and relevant external changes."
    };
  }

  const founderScore = reconciled.categoryScores?.founderCapabilityFit?.scoreAchieved || 0;
  const isWeakFit = founderScore <= 6;

  if (ventureType.includes('Hardware') || ventureType.includes('Manufacturing')) {
    return {
      encouraging: isWeakFit
        ? "Strong general commercial background and clear physical product problem definition."
        : "Strong domain experience, hands-on user insight, and practical product vision.",
      caution: "Ensure mass production and tooling costs are delayed until physical prototype field durability and customer deposits are secured.",
      unproven: "Manufacturing unit economics, supplier reliability, and retail/direct distribution margins.",
      masterRecommendation: reconciled.masterRecommendation || "Validate Before Building",
      portfolioDecision: reconciled.overallScore >= 55 ? "INVESTIGATE" : (reconciled.overallScore >= 40 ? "PIVOT" : "PARK"),
      portfolioAction: reconciled.overallScore >= 55 ? "Actively investigate physical prototype field testing and pre-orders." : "Reformulate physical solution architecture."
    };
  }

  return {
    encouraging: isWeakFit
      ? "Strong general commercial capability combined with clear problem definition."
      : "Strong problem definition, domain experience, and clear commercial opportunity.",
    caution: "Ensure non-essential expenditure and feature expansion are delayed until core customer demand and willingness to pay are validated.",
    unproven: "Repeat customer demand, unit economics, and scalable customer acquisition channels.",
    masterRecommendation: reconciled.masterRecommendation || "Validate Before Building",
    portfolioDecision: reconciled.overallScore >= 55 ? "INVESTIGATE" : (reconciled.overallScore >= 40 ? "PIVOT" : "PARK"),
    portfolioAction: reconciled.overallScore >= 55 ? "Conduct structured customer discovery interviews and initial evidence gathering." : "Preserve problem statement while exploring alternative commercial formulations."
  };
}

/**
 * Returns dynamic Portfolio Action & Decision metadata separating Commercial Recommendation from Portfolio State.
 */
function getPortfolioDecision(masterRecommendation = "", ventureType = "", gatesInfo = {}, rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const isNuclear = idea.includes("nuclear");

  if (isNuclear || gatesInfo?.hasCriticalGate) {
    return {
      masterRecommendation: "STOP — Current Formulation",
      portfolioDecision: "PARK",
      portfolioAction: "Preserve the underlying energy-security problem while exploring alternative solutions, jurisdictions or material future changes in feasibility.",
      portfolioReason: "The national energy-security problem remains strategically relevant and worth tracking, but the proposed solution faces significant statutory and regulatory barriers under current legislation, subject to specialist legal confirmation.",
      problemStatus: "Worth Preserving",
      solutionStatus: "Materially Constrained Pending Legal Confirmation",
      currentStage: "Exploration",
      nextEvidenceGateway: "Credible statutory/legal and regulatory pathway.",
      reassessmentTrigger: "Material statutory/regulatory policy change, relevant technology development, or formal pre-feasibility legal clarification.",
      problemVsSolution: {
        underlyingProblem: "New Zealand's need for reliable, affordable, low-carbon electricity as demand increases and variable generation creates reliability and price challenges.",
        currentProposedSolution: "Development of a commercial SMR-based nuclear generation business in New Zealand.",
        problemStatus: "Worth Preserving",
        solutionStatus: "Materially Constrained Pending Legal Confirmation",
        portfolioAction: "Preserve the underlying energy-security problem while exploring alternative solutions, jurisdictions or material future changes in feasibility."
      }
    };
  }

  let decision = "INVESTIGATE";
  let problemStatus = "Worth Investigating";
  let actionText = "Conduct structured customer discovery interviews and initial evidence gathering.";
  const masterLower = (masterRecommendation || "").toLowerCase();

  if (masterLower.includes("stop") || masterLower.includes("pause")) {
    decision = "PARK";
    problemStatus = "Worth Preserving";
    actionText = "Preserve the problem statement while exploring alternative solutions or target geographies.";
  } else if (masterLower.includes("pivot") || masterLower.includes("refine")) {
    decision = "PIVOT";
    problemStatus = "Worth Investigating";
    actionText = "Reformulate the solution, customer segment, or business model around validated friction points.";
  } else if (masterLower.includes("proceed") || masterLower.includes("pursue")) {
    decision = "PURSUE";
    problemStatus = "Worth Pursuing";
    actionText = "Actively progress commercial validation and pilot deployment.";
  }

  return {
    masterRecommendation: masterRecommendation || "INVESTIGATE — Validate Assumptions",
    portfolioDecision: decision,
    portfolioAction: actionText,
    portfolioReason: "Commercial concept undergoing structured validation based on evidence maturity.",
    problemStatus: problemStatus,
    solutionStatus: "Under Validation",
    currentStage: "Validation",
    nextEvidenceGateway: "Complete initial discovery interviews and confirm customer willingness to pay.",
    reassessmentTrigger: "Completion of 30-day discovery milestone or material market feedback."
  };
}

/**
 * Calculates Founder Capability & Founder-Idea Fit Sub-Factors (Max 15)
 * Distinguishes General Founder Capability from Founder-Idea Fit.
 */
function calculateFounderSubFactors(rawInputs = {}) {
  const exp = (rawInputs.experience || "").toLowerCase();
  const net = (rawInputs.network || "").toLowerCase();
  const narrative = (rawInputs.founderBackgroundNarrative || "").toLowerCase();
  const cvText = (rawInputs.founderCvExtractedText || "").toLowerCase();
  const founderExp = (rawInputs.founderExperience || "").toLowerCase();
  const indExp = (rawInputs.industryExperience || "").toLowerCase();
  const idea = (rawInputs.idea || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const targetMarket = (rawInputs.targetMarket || "").toLowerCase();
  const locationCountry = (rawInputs.locationCountry || "").toLowerCase();
  const locationSummary = (rawInputs.locationSummary || "").toLowerCase();

  const rawFounderText = `${narrative} ${cvText} ${exp} ${founderExp} ${indExp}`.toLowerCase();
  const allVentureText = `${idea} ${category} ${problem} ${targetMarket} ${locationCountry} ${locationSummary}`.toLowerCase();

  // Strip negative phrases to prevent false positives like "No nuclear background" or "no experience in nuclear power"
  const cleanFounderEvidence = rawFounderText
    .replace(/(?:\bno\b|\bzero\b|\bwithout\b|\blacks?\b|\bnever\b)\s+(?:experience|background|expertise|knowledge|training|degree|credentials?)\s+(?:in|with|of|on)?\s*(?:nuclear|atomic|power|energy|engineering|maritime|marine|transport|sector|industry)/gi, '')
    .replace(/(?:\bno\b|\bzero\b|\bwithout\b|\blacks?\b|\bnever\b)\s+(?:nuclear|atomic|power|engineering|maritime|marine|transport|sector|industry)/gi, '')
    .toLowerCase();

  const hasExplicitNoDomainStatement = Boolean(
    rawFounderText.match(/(?:no|zero|without|lacks?|never)\s+(?:experience|background|expertise|knowledge|training)\s+(?:in|with|of)?\s*(?:nuclear|atomic|power|energy|engineering|maritime|marine|transport|sector|industry)/i) ||
    rawFounderText.match(/no\s+(?:nuclear|engineering|maritime|marine|transport)\s+(?:experience|background)/i) ||
    rawFounderText.match(/no\s+experience\s+in\s+nuclear/i)
  );

  const ventureType = classifyVentureType(rawInputs);

  const isNuclear = Boolean(allVentureText.match(/\b(nuclear|atomic|reactor|fission|fusion|smr|radiation)\b/i));
  const isHeavyInfrastructure = (isNuclear || Boolean(allVentureText.match(/refinery|\bdam\b|hydroelectric|geothermal|railway|airport|utility scale|grid-scale|\bpower plant\b|\benergy plant\b/i))) && !allVentureText.match(/solar-powered|device|hardware|pest|mooring/i);
  const isBiotech = Boolean(allVentureText.match(/\b(pharma|drug|clinical trial|medical device|biotech|gene therapy|therapeutics|vaccine|diagnostic)\b/i));
  const isDeepTech = Boolean(allVentureText.match(/\b(quantum|semiconductor|nanotech|satellite|aerospace|rocket|fusion|deep tech)\b/i));

  const isVentureCriticalDomainNeeded = isNuclear || isHeavyInfrastructure || isBiotech || isDeepTech;

  // 1. COMPONENT A: Direct Domain Experience (0 to 4 points)
  let domainScore = 0;
  let hasDirectDomainMatch = false;

  if (isNuclear) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/nuclear\s+engineer|nuclear\s+physicist|atomic\s+engineer|reactor\s+operator|radiation\s+safety|physicist|phd\s+in\s+nuclear|worked\s+in\s+nuclear/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|20\+|15\+|senior|lead|director/) ? 4 : 3;
    } else {
      domainScore = 0;
    }
  } else if (isHeavyInfrastructure) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/power\s+systems|electrical\s+engineer|systems\s+engineer|energy\s+engineer|infrastructure\s+engineer|power\s+generation|utility\s+engineer|grid/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|20\+|15\+|senior|lead/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/engineer|industrial|energy/)) {
      domainScore = 2;
    } else {
      domainScore = 0;
    }
  } else if (isBiotech) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/phd\b|md\b|oncology|biomedical|pharma|drug\s+development|clinical\s+trial/));
    domainScore = hasDirectDomainMatch ? (cleanFounderEvidence.match(/10\+|20\+|senior|head/) ? 4 : 3) : 0;
  } else if (isDeepTech) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/quantum|semiconductor|aerospace|astrophysics|phd\b|physicist/));
    domainScore = hasDirectDomainMatch ? 4 : 0;
  } else if (allVentureText.match(/transport|ride-share|ride\b|fleet|logistics|driver|vehicle/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/transport|fleet|driver|logistics|taxi|ride|courier|vehicle|dispatch|route|operating\s+transport/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|8\+|director|owner|manager/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/operations|manager|logistics/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else if (allVentureText.match(/mooring|marine|boat|vessel|nautical|ocean|dock|harbour/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/marine|maritime|boat|vessel|mooring|captain|sailor|harbour|nautical/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|20\+|captain|owner|operator/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/hardware|equipment|outdoor/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else if (allVentureText.match(/tax|gst|accounting|bookkeeping|fintech|payroll|invoice/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/ca\b|cpa\b|chartered|accountant|tax|accounting|finance|bcom|auditor/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/15\+|20\+|senior|partner|director/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/bookkeeper|finance|business owner/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else if (ventureType === 'Trade / Local Service' || allVentureText.match(/plumb|electrician|builder|landscap|mow|lawn|trade/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/plumb|electrician|builder|landscap|mow|lawn|trade|contractor|drainlayer|carpenter|hvac/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|8\+|5\+|master|certificated|licensed|qualified|years/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/laborer|apprentice|handyman|worker/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else if (allVentureText.match(/property|landlord|real estate|building|compliance|proptech/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/property|landlord|real estate|building|asset manager|proptech|facility|tenancy/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/15\+|20\+|senior|director|manager/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/manager|business owner|director/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else {
    // FALLBACK ONLY FOR GENERAL VENTURES
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/worked\s+in\s+this\s+industry|industry\s+experience\s+in\s+this|direct\s+sector\s+experience|founder\s+in\s+this\s+sector/i));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|20\+|15\+/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/experience\s+in\s+this\s+sector|worked\s+in\s+sector/i)) {
      domainScore = 2;
    } else {
      domainScore = 0;
    }
  }

  const isZeroIndustryExp = Boolean(
    indExp.match(/^0\b|^zero\b|0\s*years|zero\s*years/i) ||
    exp.match(/0\s*years\s+in\s+this\s+industry|no\s+industry\s+experience|no\s+direct\s+experience/i)
  );

  if (hasExplicitNoDomainStatement || isZeroIndustryExp) {
    hasDirectDomainMatch = false;
    domainScore = 0;
  }

  // 2. COMPONENT B: Relevant Execution Experience (0 to 3 points)
  let executionScore = 0;
  if (hasDirectDomainMatch && cleanFounderEvidence.match(/built|scaled|sold|director|partner|manager|led|leading|operated|ran|principal|head|plumber|captain|landscaping|years|delivering|contractor/)) {
    executionScore = 3;
  } else if (cleanFounderEvidence.match(/director|partner|senior\s+manager|finance\s+manager|corporate\s+finance|chartered\s+accountant|ca\b|cpa\b|owner|ran\s+a\s+business|led|leading|project\s+lead|certificated|licensed/)) {
    executionScore = isVentureCriticalDomainNeeded ? 1 : 2;
  } else if (cleanFounderEvidence.match(/project|delivered|coordinator|team|management|years/)) {
    executionScore = 1;
  } else {
    executionScore = 0;
  }

  // 3. COMPONENT C: Transferable Commercial Capability (0 to 3 points)
  let commercialScore = 0;
  if (cleanFounderEvidence.match(/ca\b|cpa\b|chartered|accountant|bcom|mba\b|finance\s+manager|director|partner|exited|sold\s+a\s+business|20\+\s+years/)) {
    commercialScore = 3;
  } else if (cleanFounderEvidence.match(/finance|accounting|budget|sales|marketing|commercial|business\s+degree|manager|phd\b|senior|principal/)) {
    commercialScore = 2;
  } else if (cleanFounderEvidence.match(/work|business|sole\s+trader|operating/)) {
    commercialScore = 1;
  } else {
    commercialScore = 0;
  }

  // 4. COMPONENT D: Critical Capability Coverage (0 to 3 points)
  let coverageScore = 0;
  const hasEstablishedTeamWithDomain = Boolean(cleanFounderEvidence.match(/co-founder|cto|head\s+of\s+engineering|chief\s+scientist|specialist\s+lead|retained\s+expert|partnered\s+with|joint\s+venture/));

  if (hasDirectDomainMatch || hasEstablishedTeamWithDomain) {
    coverageScore = 3;
  } else if (!isVentureCriticalDomainNeeded) {
    if (cleanFounderEvidence.match(/developer|contractor|designer|outsource|agency/) || ventureType === 'SaaS / Software' || ventureType === 'Marketplace') {
      coverageScore = 2;
    } else if (ventureType === 'Physical Consumer Product / Hardware') {
      coverageScore = 2;
    } else {
      coverageScore = 1;
    }
  } else {
    coverageScore = 0;
  }

  // 5. COMPONENT E: Capability Gap Bridgeability (0 to 2 points)
  let bridgeabilityScore = 0;
  if (hasDirectDomainMatch) {
    bridgeabilityScore = 2;
  } else if (!isVentureCriticalDomainNeeded) {
    if (ventureType === 'SaaS / Software' || ventureType === 'Marketplace' || allVentureText.match(/transport|ride-share|fleet/)) {
      bridgeabilityScore = 2;
    } else if (ventureType === 'Physical Consumer Product / Hardware' || allVentureText.match(/mooring|marine/)) {
      bridgeabilityScore = 2;
    } else {
      bridgeabilityScore = 1;
    }
  } else {
    bridgeabilityScore = 0;
  }

  let rawSum = domainScore + executionScore + commercialScore + coverageScore + bridgeabilityScore;

  // HARD CAP FOR CRITICAL CAPABILITY ABSENCE (Section 5)
  // Max 4/15 if critical capability absent for high-spec/regulated; max 6/15 if no direct domain match for standard.
  let finalScore = rawSum;
  let appliedCap = false;
  let gapSeverity = 'Minor Gap';

  const capacity = (rawInputs.capacity || rawInputs.timeCommitment || "").toLowerCase();
  const isLimitedTime = Boolean(capacity.match(/0-5|5-15|0\s*-\s*5|5\s*-\s*15|<15/i));

  if (isZeroIndustryExp) {
    appliedCap = true;
    gapSeverity = isVentureCriticalDomainNeeded ? 'Venture-Critical Gap' : 'No Industry Experience';
    finalScore = Math.min(finalScore, isVentureCriticalDomainNeeded ? 4 : 6);
  } else if (isVentureCriticalDomainNeeded && !hasDirectDomainMatch && !hasEstablishedTeamWithDomain) {
    appliedCap = true;
    gapSeverity = 'Venture-Critical Gap';
    finalScore = Math.min(finalScore, 4); // Capped at max 4/15 for venture-critical domain absence
  } else if (!hasDirectDomainMatch && isVentureCriticalDomainNeeded) {
    appliedCap = true;
    gapSeverity = 'Major Gap';
    finalScore = Math.min(finalScore, 5);
  } else if (!hasDirectDomainMatch) {
    gapSeverity = 'Bridgeable Gap';
    finalScore = Math.min(finalScore, 11);
  } else if (hasDirectDomainMatch) {
    if (ventureType === 'Physical Consumer Product / Hardware' && !cleanFounderEvidence.match(/mechanical\s+engineer|industrial\s+designer|hardware\s+engineer/)) {
      gapSeverity = 'Bridgeable Gap';
      finalScore = Math.min(finalScore, 10);
    } else if (allVentureText.match(/transport|ride-share|fleet/) && !cleanFounderEvidence.match(/software\s+engineer|cto|full-stack/)) {
      gapSeverity = 'Bridgeable Gap';
      finalScore = Math.min(finalScore, 11);
    }
  }

  // DEBUG LOGGING (Section 10)
  console.log(`[PitchLab Debug] Founder Capability Breakdown:`);
  console.log(`  - Domain (A): ${domainScore}/4`);
  console.log(`  - Comparable Execution (B): ${executionScore}/3`);
  console.log(`  - Transferable Commercial (C): ${commercialScore}/3`);
  console.log(`  - Critical Capability Coverage (D): ${coverageScore}/3`);
  console.log(`  - Bridgeability (E): ${bridgeabilityScore}/2`);
  console.log(`  - Raw Sum: ${rawSum}/15`);
  console.log(`  - Applied Cap: ${appliedCap ? 'Yes — critical capability/experience absence' : 'No'}`);
  console.log(`  - Final score after cap: ${finalScore}/15`);

  let founderPositionSummary = "Workable With Constraints";
  if (finalScore >= 12) {
    founderPositionSummary = "Well Positioned";
  } else if (finalScore >= 7) {
    founderPositionSummary = "Workable With Constraints";
  } else if (finalScore >= 4) {
    founderPositionSummary = "Important Gaps to Address";
  } else {
    founderPositionSummary = "Material Founder Constraints";
  }

  return {
    score: finalScore,
    rawSum,
    appliedCap,
    founderPositionSummary,
    subFactors: {
      industryExperience: domainScore,
      problemUnderstanding: Math.min(3, hasDirectDomainMatch ? 3 : 2),
      operationalCapability: executionScore,
      customerAccess: Math.min(2, (net.match(/client|access|customer|network/) || hasDirectDomainMatch) ? 2 : 1),
      commercialCapability: Math.min(2, commercialScore >= 2 ? 2 : commercialScore),
      marketCredibility: Math.min(1, (hasDirectDomainMatch || commercialScore >= 2) ? 1 : 0),
      learningAdaptability: 1,
      validationLeadership: Math.min(1, executionScore >= 1 ? 1 : 0)
    },
    components: {
      domainScore,
      executionScore,
      commercialScore,
      coverageScore,
      bridgeabilityScore
    },
    isHighSpecialization: isVentureCriticalDomainNeeded,
    hasDirectDomainMatch,
    gapSeverity
  };
}

/**
 * Calculates Problem & Customer Clarity Sub-Factors (Max 15)
 * Does NOT double-penalize if the underlying problem is legitimate.
 */
function calculateProblemSubFactors(rawInputs = {}) {
  const problem = (rawInputs.problem || "").toLowerCase();
  const target = (rawInputs.targetMarket || rawInputs.market || "").toLowerCase();

  let subFactors = {
    problemDescription: 2,
    targetCustomerSpecificity: 2,
    rootCauseVsSymptom: 1,
    frequencySeriousness: 1,
    existingWorkarounds: 1,
    customerConsequences: 1,
    scopeFocus: 1
  };

  if (problem.length > 40) subFactors.problemDescription = 3;
  if (target.length > 15) subFactors.targetCustomerSpecificity = 3;
  if (problem.length > 20) subFactors.rootCauseVsSymptom = 2;
  if (problem.match(/electricity|energy|carbon|cost|gst|tax|cash|delay|urgent/)) subFactors.frequencySeriousness = 2;
  if (problem.match(/manual|spreadsheet|bank|xero|myob|grid|hydro|fossil/)) subFactors.existingWorkarounds = 2;
  if (problem.length > 30) subFactors.customerConsequences = 2;

  const score = Math.min(14, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Customer Validation Sub-Factors (Max 20)
 */
function calculateCustomerValidationSubFactors(rawInputs = {}) {
  const net = (rawInputs.network || "").toLowerCase();
  let subFactors = {
    customerInterviews: 0,
    problemSeverityConfirmed: 1,
    solutionTested: 0,
    pricingTested: 0,
    pilotUsers: 0,
    payingCustomers: 0,
    repeatRetention: 0
  };

  if (net.includes("interview") || net.includes("survey")) subFactors.customerInterviews = 2;
  if (net.includes("pilot") || net.includes("test")) subFactors.pilotUsers = 2;
  if (net.includes("paying") || net.includes("pre-order") || net.includes("loi")) subFactors.payingCustomers = 2;

  const score = Math.min(20, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Market Opportunity Sub-Factors (Max 15)
 * Distinguishes TAM from Accessible Commercial Opportunity for proposed solution.
 */
function calculateMarketSubFactors(rawInputs = {}) {
  const target = (rawInputs.targetMarket || "").toLowerCase();
  const scope = (rawInputs.marketScope || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const idea = (rawInputs.idea || "").toLowerCase();
  const location = (rawInputs.locationSummary || rawInputs.locationCountry || "").toLowerCase();
  const text = `${idea} ${target} ${category}`;

  let subFactors = {
    targetMarketIdentifiable: 1,
    commerciallyMeaningfulNeed: 1,
    marketAccessible: 1,
    customerUrgency: 1,
    expansionPotential: 1,
    regulatoryDrivers: 0,
    marketEvidence: 1
  };

  if (target.length > 20) subFactors.targetMarketIdentifiable = 3;
  else if (target.length > 5) subFactors.targetMarketIdentifiable = 2;

  if (target.match(/b2b|smb|business|trader|accountant|electricity|energy|consumer/)) {
    subFactors.commerciallyMeaningfulNeed = 3;
  }

  const gatesInfo = detectFeasibilityGates(rawInputs);
  const hasLegalBanOrExtremeBarriers = gatesInfo.hasCriticalGate || Boolean(
    text.match(/nuclear|banned|prohibited|unlawful/) && (location.includes("new zealand") || location.includes("nz") || text.includes("nz") || location.length === 0)
  );

  if (hasLegalBanOrExtremeBarriers) {
    // Distinguish TAM (underlying market size, e.g. electricity demand) from accessible commercial market for THIS specific proposed solution.
    subFactors.targetMarketIdentifiable = Math.min(subFactors.targetMarketIdentifiable, 2);
    subFactors.commerciallyMeaningfulNeed = 1;
    subFactors.marketAccessible = 0;
    subFactors.customerUrgency = 0;
    subFactors.expansionPotential = 0;
    subFactors.regulatoryDrivers = 0;
    subFactors.marketEvidence = 0;
  } else {
    if (scope.includes("national") || scope.includes("global") || scope.includes("international")) {
      subFactors.expansionPotential = 2;
      subFactors.marketAccessible = 2;
    }

    if (category.match(/fintech|tax|ird|gst|compliance|energy/)) {
      subFactors.regulatoryDrivers = 2;
      subFactors.customerUrgency = 2;
    }
  }

  const score = Math.min(15, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors, hasLegalBanOrExtremeBarriers };
}

/**
 * Calculates Business Model Sub-Factors (Max 15)
 */
function calculateBusinessModelSubFactors(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const budget = (rawInputs.budget || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();

  let subFactors = {
    whoPaysIdentified: 1,
    revenueMechanismDefined: 1,
    pricingHypothesis: 1,
    costToServeLogic: 1,
    recurringPotential: 1,
    grossMarginLogic: 1,
    willingnessToPayEvidence: 0
  };

  if (idea.match(/saas|subscription|tool|software/) || category.includes("saas")) {
    subFactors.revenueMechanismDefined = 2;
    subFactors.recurringPotential = 3;
    subFactors.grossMarginLogic = 2;
  }

  if (budget.length > 0 && !budget.includes("0")) {
    subFactors.whoPaysIdentified = 2;
    subFactors.pricingHypothesis = 2;
  }

  const score = Math.min(15, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Competitive Position Sub-Factors (Max 10)
 */
function calculateCompetitiveSubFactors(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();

  let subFactors = {
    directCompetitors: 1,
    indirectAlternatives: 1,
    workaroundsIdentified: 1,
    differentiationArticulated: 1,
    switchingBarriers: 1,
    emergingAdvantage: 0
  };

  if (problem.match(/manual|spreadsheet|bank|xero|myob|grid|hydro|fossil/)) {
    subFactors.workaroundsIdentified = 2;
    subFactors.indirectAlternatives = 2;
  }

  if (idea.match(/auto|ai|instant|direct|nuclear|clean/)) {
    subFactors.differentiationArticulated = 2;
    subFactors.emergingAdvantage = 1;
  }

  const score = Math.min(10, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Execution Readiness Sub-Factors (Max 10)
 */
function calculateExecutionSubFactors(rawInputs = {}) {
  const capacity = (rawInputs.capacity || rawInputs.timeCommitment || "").toLowerCase();
  const budget = (rawInputs.budget || rawInputs.investmentCommitment || "").toLowerCase();
  const idea = (rawInputs.idea || "").toLowerCase();

  let subFactors = {
    weeklyTimeDefined: 1,
    scopeMatchesTime: 1,
    initialCapitalDefined: 1,
    riskCapitalDefined: 1,
    lowCostValidationPlan: 1,
    capabilityGapsRecognized: 1,
    commitmentConsistency: 0
  };

  // Capital & Timeline gap check for capital-intensive infrastructure
  const isCapitalIntensive = Boolean(idea.match(/nuclear|power plant|atomic|refinery|dam|utility scale/));

  if (isCapitalIntensive) {
    // Extreme gap between $5k founder budget & 15-year multi-billion infrastructure project
    subFactors.scopeMatchesTime = 0;
    subFactors.initialCapitalDefined = 1;
    subFactors.riskCapitalDefined = 0;
    subFactors.lowCostValidationPlan = 1;
  } else {
    if (capacity.match(/20\+|35|full-time/)) {
      subFactors.weeklyTimeDefined = 2;
      subFactors.commitmentConsistency = 2;
    } else if (capacity.match(/10-15|10|15/)) {
      subFactors.weeklyTimeDefined = 2;
      subFactors.commitmentConsistency = 1;
    }

    if (budget.match(/\$2,500|\$5,000|5,000\+/)) {
      subFactors.initialCapitalDefined = 2;
      subFactors.riskCapitalDefined = 2;
    } else if (budget.length > 0) {
      subFactors.initialCapitalDefined = 1;
    }
  }

  const score = Math.min(10, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Reconciles category scores and computes overall score, band, and master recommendation.
 * Enforces Score-Narrative Reconciliation and Feasibility Gate Caps.
 */
function reconcileScores(rawCategories = {}, rawInputs = {}) {
  const founderCalc = calculateFounderSubFactors(rawInputs);
  const problemCalc = calculateProblemSubFactors(rawInputs);
  const validationCalc = calculateCustomerValidationSubFactors(rawInputs);
  const marketCalc = calculateMarketSubFactors(rawInputs);
  const bizCalc = calculateBusinessModelSubFactors(rawInputs);
  const compCalc = calculateCompetitiveSubFactors(rawInputs);
  const execCalc = calculateExecutionSubFactors(rawInputs);
  const gatesInfo = detectFeasibilityGates(rawInputs);
  const ventureType = classifyVentureType(rawInputs);

  const subFactorBaselines = {
    founderCapabilityFit: founderCalc.score,
    problemCustomerClarity: problemCalc.score,
    customerValidation: validationCalc.score,
    marketCommercialOpportunity: marketCalc.score,
    businessModelWillingnessToPay: bizCalc.score,
    competitivePosition: compCalc.score,
    executionReadiness: execCalc.score
  };

  const categoryScores = {};
  let total = 0;

  for (const [key, config] of Object.entries(SCORING_CONFIG.CATEGORIES)) {
    let rawObj = rawCategories[key];
    if (!rawObj) {
      for (const alias of config.aliases) {
        if (rawCategories[alias]) {
          rawObj = rawCategories[alias];
          break;
        }
      }
    }
    rawObj = rawObj || {};

    const rawVal = rawObj.scoreAchieved ?? rawObj.score ?? rawObj;
    let num = Number(rawVal);

    if (!isNaN(num) && num > config.max) {
      num = Math.round((num / 100) * config.max);
    }

    let finalScore = subFactorBaselines[key] !== undefined ? Math.min(config.max, subFactorBaselines[key]) : 0;
    if (key === 'founderCapabilityFit') {
      // SINGLE SOURCE OF TRUTH (Section 11): Founder Capability Fit is ALWAYS calculated deterministically from founderCalc.score.
      // AI LLM raw outputs cannot inflate or override this value.
      finalScore = Math.min(config.max, founderCalc.score);
    } else if (key === 'problemCustomerClarity') {
      // SINGLE SOURCE OF TRUTH (Fix 1): Problem & Customer Clarity is ALWAYS calculated deterministically from problemCalc.score.
      // Measures problem articulation, customer specificity, and problem-solution coherence.
      // AI LLM raw outputs cannot override this value or double-penalise for missing customer validation.
      finalScore = Math.min(config.max, problemCalc.score);
    } else if (key === 'customerValidation') {
      // SINGLE SOURCE OF TRUTH: Customer Validation is calculated deterministically from validationCalc.score.
      finalScore = Math.min(config.max, validationCalc.score);
    } else if (key === 'futureTrends') {
      const futureTrends5D = calculate5DimensionFutureTrends(rawInputs, gatesInfo, ventureType, rawObj);
      const calcFromAlignment = Math.round((Math.max(1, Math.min(10, futureTrends5D.trendAlignmentScore)) / 10) * config.max);
      finalScore = calcFromAlignment;
    }

    // FEASIBILITY GATE CAP: Cap specific categories if Critical Feasibility Gate exists (Exact Section 3 Caps)
    if (gatesInfo.hasCriticalGate) {
      if (key === 'marketCommercialOpportunity') finalScore = Math.min(finalScore, 2);
      if (key === 'businessModelWillingnessToPay') finalScore = Math.min(finalScore, 2);
      if (key === 'competitivePosition') finalScore = Math.min(finalScore, 2);
      if (key === 'executionReadiness') finalScore = Math.min(finalScore, 1);
      if (key === 'futureTrends') finalScore = Math.min(finalScore, 1);
    }

    let explanation = (rawObj.assessment || rawObj.explanation || "").trim();
    if (!explanation || explanation.includes("Evaluated based on sub-factors") || explanation.includes("current commercial evidence")) {
      explanation = generateContextualScoreExplanation(key, finalScore, config.max, rawInputs, gatesInfo, founderCalc);
    }

    // RECONCILE NARRATIVE CONTRADICTIONS & DOMAIN MISMATCH EXPLANATIONS
    if (finalScore <= 6 && key === 'founderCapabilityFit') {
      if (!founderCalc.hasDirectDomainMatch || explanation.match(/direct|relevant|strong|expert|technical|nuclear|engineering/i)) {
        explanation = `Founder demonstrates useful general commercial capabilities, but the project team does not yet evidence the direct technical engineering or sector-specific domain experience required for this venture.`;
      }
    } else if (finalScore >= 10 && key === 'founderCapabilityFit' && (explanation.includes("0/15") || explanation.includes("lacks experience") || explanation.includes("0 points"))) {
      explanation = `Founder demonstrates strong domain expertise, professional background, and relevant experience supporting this commercial opportunity.`;
    }

    // RECONCILE EVIDENCE LEVEL DETERMINISTICALLY (Section 9)
    const ratio = finalScore / config.max;
    let evidenceLevel = "Partial Evidence";

    if (key === 'founderCapabilityFit') {
      if (finalScore >= 13) {
        evidenceLevel = "Strong Evidence";
      } else if (finalScore >= 10) {
        evidenceLevel = "Partial Evidence";
      } else if (finalScore >= 4) {
        evidenceLevel = "Limited Evidence";
      } else {
        evidenceLevel = "Not yet evidenced";
      }
    } else if (key === 'customerValidation' && finalScore <= 3) {
      evidenceLevel = "Not yet evidenced";
    } else if (gatesInfo.hasCriticalGate && (key === 'marketCommercialOpportunity' || key === 'executionReadiness' || key === 'customerValidation' || key === 'businessModelWillingnessToPay')) {
      evidenceLevel = finalScore <= 3 ? "Not yet evidenced" : "Partial Evidence";
    } else {
      if (ratio >= 0.75) {
        evidenceLevel = "Strong Evidence";
      } else if (ratio >= 0.25) {
        evidenceLevel = "Partial Evidence";
      } else {
        evidenceLevel = "Not yet evidenced";
      }
    }

    // RECONCILE MISSING EVIDENCE & IMPROVEMENT ACTIONS
    let missingEvidence = (rawObj.missingEvidence || config.defaultMissing || `Direct validation and market evidence required.`).trim();
    let howToImprove = (rawObj.improvementAction || rawObj.howToImprove || config.defaultImprove || `Conduct pre-feasibility analysis and test core assumptions.`).trim();

    if (gatesInfo.hasCriticalGate) {
      if (key === 'problemCustomerClarity') {
        missingEvidence = "Empirical problem frequency and operational consequences within the target sector, subject to initial feasibility verification.";
        howToImprove = "Note that while problem clarity is relevant, customer discovery conversations should be treated as secondary until primary statutory and feasibility gating risks are resolved.";
      } else if (key === 'founderCapabilityFit') {
        if (!founderCalc.hasDirectDomainMatch) {
          missingEvidence = "Supplied materials do not document direct technical engineering (nuclear/heavy engineering, SMR), project management, energy infrastructure development, or specific statutory regulatory experience.";
          howToImprove = "Acquire co-founders or advisers with verifiable specialist expertise in relevant statutory compliance and sector engineering, or pivot to an unconstrained formulation.";
        }
      } else if (key === 'customerValidation') {
        missingEvidence = "Off-taker interest and commercial requirements; customer validation is a downstream requirement once statutory permissibility is established.";
        howToImprove = "Treat commercial customer validation as downstream until fundamental statutory permissibility and technical feasibility are resolved with domain experts.";
      } else if (key === 'marketCommercialOpportunity') {
        missingEvidence = "Accessible market opportunity under national legislation; the concept appears to face major statutory barriers, subject to specialist legal confirmation.";
        howToImprove = "Verify statutory permissibility under national legislation with specialist legal advisers before committing commercial development capital.";
      } else if (key === 'businessModelWillingnessToPay') {
        missingEvidence = "Validated pricing, capital structure, and off-taker willingness to pay within a legally compliant framework.";
        howToImprove = "Establish statutory permissibility and foundational capital/expertise before scoping commercial pricing or revenue models.";
      } else if (key === 'competitivePosition') {
        missingEvidence = "Comparative positioning relative to existing national energy infrastructure and alternative low-carbon firm generation options.";
        howToImprove = "Benchmark solution feasibility and capital intensity against existing compliant energy generation alternatives under current national policy.";
      } else if (key === 'executionReadiness') {
        missingEvidence = "Detailed statutory compliance roadmap, site environmental assessment, and multi-stage capital allocation plan.";
        howToImprove = "Complete preliminary legal/regulatory and technical scoping to determine the requirements, specialist inputs and likely cost of a formal pre-feasibility study.";
      }
    } else {
      if (ventureType === 'Heavy Industrial' || ventureType === 'Energy & Infrastructure') {
        if (key === 'customerValidation' && finalScore <= 4) {
          missingEvidence = "Letters of Intent (LOIs), off-take inquiries, or regulatory pre-consultation feedback from industrial energy buyers.";
          howToImprove = "Conduct discovery briefings with major commercial energy off-takers to assess demand for alternative power solutions.";
        }
      }
    }

    categoryScores[key] = {
      scoreAchieved: finalScore,
      score: finalScore,
      maxScore: config.max,
      label: config.label,
      evidenceLevel: evidenceLevel,
      explanation: explanation,
      missingEvidence: missingEvidence,
      howToImprove: howToImprove
    };
    total += finalScore;
  }

  // Section 4: Transparent Overall Score calculation (Exact Sum of Displayed Category Scores)
  let overallScore = Math.max(0, Math.min(100, Math.round(total)));

  const scoreBand = getScoreBand(overallScore);
  const masterRecommendation = computeMasterRecommendation(overallScore, categoryScores, rawInputs, gatesInfo);

  // Section 13: Internal telemetry debug object
  const foundationalFeasibilityGate = {
    triggered: Boolean(gatesInfo.hasCriticalGate),
    blockerType: gatesInfo.gates?.[0]?.type || "N/A",
    evidence: gatesInfo.summary || "No critical feasibility gate detected.",
    confidence: gatesInfo.hasCriticalGate ? "high" : "low",
    categoriesAffected: gatesInfo.hasCriticalGate
      ? ["marketCommercialOpportunity", "businessModelWillingnessToPay", "competitivePosition", "executionReadiness"]
      : [],
    capsApplied: Boolean(gatesInfo.hasCriticalGate),
    reasoning: gatesInfo.summary || "Standard commercial evaluation."
  };

  const portfolioMeta = computePortfolioMeta(rawInputs, { overallScore, masterRecommendation }, ventureType, gatesInfo);
  const legalRegulatoryAssessment = getLegalRegulatoryAssessment(rawInputs, gatesInfo, ventureType);

  return {
    overallScore,
    scoreBand,
    masterRecommendation,
    categoryScores,
    subFactors: {
      founder: founderCalc.subFactors,
      problem: problemCalc.subFactors,
      validation: validationCalc.subFactors,
      market: marketCalc.subFactors
    },
    gatesInfo,
    legalRegulatoryAssessment,
    foundationalFeasibilityGate,
    portfolioMeta,
    ventureType,
    reconciled: true
  };
}

/**
 * Computes a single deterministic Master Recommendation across the entire application using expanded taxonomy.
 */
function computeMasterRecommendation(score, categoryScores = {}, rawInputs = {}, gatesInfo = {}) {
  if (gatesInfo?.hasCriticalGate) {
    const isLegalProhibition = gatesInfo.gates?.some(g => g.type === 'Legal Prohibition');
    const isExtremeCapital = gatesInfo.gates?.some(g => g.type === 'Capital & Infrastructure Dependency');
    if (isLegalProhibition || isExtremeCapital) {
      return "STOP — Current Formulation";
    }
    return "REFRAME — Current Formulation";
  }

  const validationScore = categoryScores.customerValidation?.scoreAchieved || 0;
  const founderScore = categoryScores.founderCapabilityFit?.scoreAchieved || 0;
  const problemScore = categoryScores.problemCustomerClarity?.scoreAchieved || 0;

  if (score >= 85 && validationScore >= 14) {
    return "PURSUE";
  }
  if (score >= 70 && validationScore >= 8) {
    return "INVESTIGATE";
  }
  if (score >= 40 || (founderScore >= 8 && problemScore >= 8)) {
    return "INVESTIGATE";
  }
  if (problemScore < 5) {
    return "REFRAME";
  }
  return "PARK";
}

/**
 * Computes 5-Dimension Future Trends Architecture separating Underlying Market Direction from Solution-Specific Outlook.
 */
function calculate5DimensionFutureTrends(rawInputs = {}, gatesInfo = {}, ventureType = "", rawFutureTrends = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const targetMarket = (rawInputs.targetMarket || "").toLowerCase();
  const text = `${idea} ${problem} ${targetMarket}`.toLowerCase();
  const isNuclear = text.includes("nuclear") || text.includes("atomic");

  let marketDirection = "POSITIVE";
  let solutionOutlook = "FAVOURABLE";

  // Clean default trends for digital/commercial software
  let demandTrend = "Growing demand for automated workflow efficiency, digital productivity, and reduced manual overhead.";
  let technologyTrend = "Expansion of cloud integrations, automated workflows, and modern API ecosystems.";
  let regulatoryTrend = "Standard data privacy, commercial consumer protection, and statutory business guidelines.";
  let competitionTrend = "Established incumbent solutions create high switching friction, requiring clear niche focus.";
  let capitalTrend = "Lean software capital model with low initial infrastructure overhead, scaling through subscription economics.";

  let whatThisMeansForFounder = "Focus on solving a specific workflow friction point and validating customer willingness to pay before expanding development scope.";
  let adjacentOpportunities = ["Workflow automation tools", "API-driven add-ons", "Enterprise reporting integrations"];
  let trendAlignmentScore = 7;

  const isFinTech = ventureType === "Financial Services / FinTech" || Boolean(text.match(/\b(tax|gst|ird|fintech|accounting|bookkeep|invoic|payroll|banking)\b/i));

  if (isNuclear || gatesInfo?.hasCriticalGate) {
    marketDirection = "POSITIVE";
    solutionOutlook = "MATERIAL CONSTRAINTS PENDING LEGAL CONFIRMATION";
    demandTrend = "National demand for 24/7 low-carbon firm electricity is expected to increase driven by electrification and climate targets.";
    technologyTrend = "SMR technologies continue to progress internationally, although commercial maturity, deployment timelines and economics vary materially by technology and jurisdiction.";
    regulatoryTrend = "Significant statutory and regulatory frameworks (e.g. Radiation Safety Act 2016, Atomic Energy Act 1945, RMA) currently constrain commercial nuclear generation in NZ, subject to specialist legal confirmation.";
    competitionTrend = "Traditional grid generators (hydro, geothermal, wind) dominate under current regulatory architecture.";
    capitalTrend = "Multi-billion dollar CAPEX structure incompatible with early-stage venture funding without government underwriting.";
    whatThisMeansForFounder = "Preserve the problem definition and track policy developments. Do not deploy private development capital into commercial nuclear generation in NZ until a clear statutory and regulatory pathway has been confirmed by specialist counsel.";
    adjacentOpportunities = ["Off-grid micro-grids and clean energy storage", "Geothermal & hydro grid-firming technologies", "Nuclear technology & regulatory advisory for OECD markets"];
    trendAlignmentScore = 7; // Reflects high structural alignment with 3-10 year decarbonization & energy demand trends
  } else if (isFinTech) {
    marketDirection = "POSITIVE";
    solutionOutlook = "FAVOURABLE";
    demandTrend = "Growing SME demand for automated cash-flow discipline, automated tax set-aside, and real-time tax compliance support.";
    technologyTrend = "Expansion of open banking APIs, automated bank transaction feeds, and cloud accounting integrations.";
    regulatoryTrend = "Inland Revenue (IRD) digital services expansion, Pay-As-You-Earn/GST real-time reporting evolution, and digital tax compliance standards.";
    competitionTrend = "Incumbent accounting platforms (Xero, MYOB) dominate general ledgers; niche opportunities exist in dedicated cash-flow and automated tax provisioning tools.";
    capitalTrend = "Lean software capital model with low initial infrastructure overhead, scaling through subscription software economics.";
    whatThisMeansForFounder = "Validate core customer workflow integration and bank feed connectivity before investing heavily in custom software development.";
    adjacentOpportunities = ["Automated provisional tax calculator", "SME cash-flow buffer advisory", "Accountant/bookkeeper dashboard integration"];
    trendAlignmentScore = 8;
  } else if (ventureType.includes("Hardware") || ventureType.includes("Manufacturing")) {
    marketDirection = "POSITIVE";
    solutionOutlook = "PROMISSING";
    demandTrend = "Increasing market demand for durable physical equipment and automation.";
    technologyTrend = "Falling costs of rapid prototyping, IoT sensors, and local manufacturing tooling.";
    regulatoryTrend = "Standard environmental and safety compliance standards apply.";
    competitionTrend = "Moderate competition from established traditional equipment suppliers.";
    capitalTrend = "Requires upfront tooling and prototype risk capital prior to revenue.";
    whatThisMeansForFounder = "Validate physical prototype durability and secure customer pre-orders before committing tooling capital.";
    adjacentOpportunities = ["No adjacent opportunity should currently be prioritised. Validate the core business first."];
    trendAlignmentScore = 6;
  } else if (ventureType.includes("Trade") || ventureType.includes("Local Service")) {
    marketDirection = "STABLE";
    solutionOutlook = "VIABLE";
    demandTrend = "Steady, recession-resilient local customer demand for trade & maintenance services.";
    technologyTrend = "Digital scheduling, automated invoicing, and mobile customer dispatch tools.";
    regulatoryTrend = "Occupational licensing, health & safety, and trade certification compliance.";
    competitionTrend = "Fragmented local competition with opportunity for high-service differentiation.";
    capitalTrend = "Low initial capital intensity with quick cash-flow generation potential.";
    whatThisMeansForFounder = "Focus on local reputation, customer response times, and job margin profitability.";
    adjacentOpportunities = ["Specialist trade niches", "Commercial maintenance contracts", "Franchise model expansion"];
    trendAlignmentScore = 7;
  }

  if (rawFutureTrends.whatThisMeansForFounder && !isNuclear) {
    whatThisMeansForFounder = rawFutureTrends.whatThisMeansForFounder;
  }
  if (Array.isArray(rawFutureTrends.adjacentOpportunities) && rawFutureTrends.adjacentOpportunities.length > 0 && !isNuclear) {
    const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing");
    const filtered = rawFutureTrends.adjacentOpportunities.filter(op => {
      if (typeof op !== 'string') return false;
      const lower = op.toLowerCase();
      if (isHardware && (lower.includes("compliance reporting module") || lower.includes("regulatory bodies") || lower.includes("saas") || lower.includes("software-enabled") || lower.includes("white-label partner integration") || lower.includes("platform integration"))) {
        return false;
      }
      return true;
    });
    if (filtered.length > 0) {
      adjacentOpportunities = filtered.slice(0, 3);
    } else {
      adjacentOpportunities = ["No adjacent opportunity should currently be prioritised. Validate the core business first."];
    }
  } else if (ventureType.includes("Hardware") || ventureType.includes("Manufacturing")) {
    adjacentOpportunities = ["No adjacent opportunity should currently be prioritised. Validate the core business first."];
  }

  const currentCommercialAccessibility = (isNuclear || gatesInfo?.hasCriticalGate) ? 1 : Math.round((trendAlignmentScore / 10) * 10);

  return {
    marketDirection,
    solutionOutlook,
    dimensions: {
      demandTrend: rawFutureTrends.demandTrend || demandTrend,
      technologyTrend: rawFutureTrends.technologyTrend || technologyTrend,
      regulatoryTrend: rawFutureTrends.regulatoryTrend || regulatoryTrend,
      competitionTrend: rawFutureTrends.competitionTrend || competitionTrend,
      capitalTrend: rawFutureTrends.capitalTrend || capitalTrend
    },
    whatThisMeansForFounder,
    adjacentOpportunities,
    trendAlignmentScore,
    currentCommercialAccessibility,
    structuralTrendAlignment: `${trendAlignmentScore}/10`
  };
}

/**
 * Computes P.A.R.A.-inspired Idea Portfolio & Decision System metadata (Fix 14).
 * Preserves underlying problem definition while evaluating current proposed solution.
 */
function computePortfolioMeta(rawInputs = {}, reconciled = {}, ventureType = "", gatesInfo = {}) {
  const idea = rawInputs.idea || "Business Opportunity";
  const problem = rawInputs.problem || "Observed customer or market challenge";
  const masterRecommendation = reconciled.masterRecommendation || "INVESTIGATE";
  const score = reconciled.overallScore || 0;

  let ventureStage = "Exploration";
  if (score >= 85) ventureStage = "Build";
  else if (score >= 70) ventureStage = "Validation";
  else if (score >= 40) ventureStage = "Research";
  else ventureStage = "Exploration";

  // Problem vs Solution Separation (Fix 14 / Req #6 / Fix 6)
  let problemStatus = "Worth Investigating";
  let solutionStatus = "Viable";
  let portfolioAction = "Proceed with controlled validation.";

  if (gatesInfo?.hasCriticalGate) {
    problemStatus = "Worth Investigating (Problem Preserved)";
    solutionStatus = "Materially Constrained Pending Legal Confirmation";
    portfolioAction = "PARK / PRESERVE";
  } else if (score < 40) {
    problemStatus = "Requires Problem Discovery";
    solutionStatus = "Requires Reframing";
    portfolioAction = "Conduct discovery interviews to validate problem urgency before solution build.";
  } else {
    problemStatus = "Validated Urgency";
    solutionStatus = "Viable Candidate";
    portfolioAction = "Focus on customer willingness-to-pay and execution velocity.";
  }

  // Archetype-Specific Next Evidence Gateway (Req #7)
  let nextEvidenceGateway = "";
  let reassessmentTrigger = "";

  if (gatesInfo?.hasCriticalGate) {
    nextEvidenceGateway = "Credible statutory/regulatory pathway or material external change.";
    reassessmentTrigger = "Statutory reform under land-based energy legislation (such as Radiation Safety Act or RMA), central government policy change, or commercial SMR deployment in peer OECD nations.";
  } else if (ventureType === "Trade / Local Service") {
    nextEvidenceGateway = "Present fixed-price service offer to 5 prospective local commercial/residential clients.";
    reassessmentTrigger = "Return after completing 5 service quotes and securing 2 paying local clients.";
  } else if (ventureType === "Physical Consumer Product / Hardware") {
    nextEvidenceGateway = "Produce physical proof-of-concept prototype & obtain manufacturer unit cost estimates.";
    reassessmentTrigger = "Return after completing field durability testing and receiving formal supplier BOM pricing.";
  } else if (ventureType === "Energy / Infrastructure / Heavy Industrial" || ventureType === "Medical / Biotech / Clinical" || ventureType === "Regulated Service") {
    nextEvidenceGateway = "Obtain preliminary regulatory advice and technical pre-feasibility confirmation.";
    reassessmentTrigger = "Return after securing written regulatory guidance or specialist pre-feasibility clearance.";
  } else {
    nextEvidenceGateway = "Conduct 10 customer discovery interviews & validate prototype interactive workflow.";
    reassessmentTrigger = "Return after completing 10 discovery calls and securing 3 LOIs or pre-orders.";
  }

  return {
    ideaId: rawInputs.ideaId || `idea_${Date.now()}`,
    decisionState: masterRecommendation,
    ventureStage: ventureStage,
    problemVsSolution: {
      underlyingProblem: problem,
      currentProposedSolution: idea,
      problemStatus: problemStatus,
      solutionStatus: solutionStatus,
      portfolioAction: portfolioAction
    },
    nextEvidenceGateway: nextEvidenceGateway,
    reassessmentTrigger: reassessmentTrigger,
    lastAssessedDate: new Date().toISOString().split('T')[0]
  };
}

/**
 * Gets score band metadata for a given score.
 */
function getScoreBand(score) {
  const validScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const band = SCORING_CONFIG.BANDS.find(b => validScore >= b.min && validScore <= b.max);
  return band ? { name: band.name, meaning: band.meaning } : { name: "Exploration Stage", meaning: SCORING_CONFIG.BANDS[4].meaning };
}

/**
 * FRI telemetry helper.
 */
function calculateFRI(profile) {
  let score = 50;
  const { founderExperience = "", industryExperience = "", timeCommitment = "" } = profile || {};

  if (founderExperience.includes("operating") || founderExperience.includes("sold")) score += 15;
  if (industryExperience.includes("5-10") || industryExperience.includes("10+")) score += 15;
  if (timeCommitment.includes("20+")) score += 10;

  return Math.min(score, 100);
}

/**
 * Calculates Founder-Evidence Gap, Blind Spots, and Positive Surprises.
 * Founder predictions DO NOT influence PitchLab independent scores.
 */
function calculateFounderEvidenceGap(founderPredictions = {}, reconciled = {}, rawInputs = {}) {
  const predictions = founderPredictions || {};
  const categoryScores = reconciled.categoryScores || {};

  const overallConfidence = Number(predictions.overallConfidence) || 75;
  const founderProblem = Number(predictions.problemStrength) || 7;
  const founderDiff = Number(predictions.differentiation) || 7;
  const founderCompDifficulty = Number(predictions.competitionDifficulty) || 5;
  const founderDemand = Number(predictions.customerDemand) || 7;
  const statedBiggestRisk = String(predictions.statedBiggestRisk || "").trim();

  const pitchLabOverall = reconciled.overallScore ?? 50;

  const probScoreObj = categoryScores.problemCustomerClarity || {};
  const pitchLabProblem = Math.max(1, Math.min(10, Math.round(((probScoreObj.scoreAchieved ?? 10) / 15) * 10)));

  const mktScoreObj = categoryScores.marketCommercialOpportunity || {};
  const pitchLabMarket = Math.max(1, Math.min(10, Math.round(((mktScoreObj.scoreAchieved ?? 10) / 15) * 10)));

  const compScoreObj = categoryScores.competitivePosition || {};
  const pitchLabDifferentiation = Math.max(1, Math.min(10, Math.round(((compScoreObj.scoreAchieved ?? 6) / 10) * 10)));
  const pitchLabCompDifficulty = Math.max(1, Math.min(10, 10 - Math.round(((compScoreObj.scoreAchieved ?? 6) / 10) * 10)));

  const bizScoreObj = categoryScores.businessModelWillingnessToPay || {};
  const pitchLabDemand = Math.max(1, Math.min(10, Math.round(((bizScoreObj.scoreAchieved ?? 10) / 15) * 10)));

  const overallGap = overallConfidence - pitchLabOverall;
  const problemGap = founderProblem - pitchLabProblem;
  const diffGap = founderDiff - pitchLabDifferentiation;
  const compDiffGap = founderCompDifficulty - pitchLabCompDifficulty;
  const demandGap = founderDemand - pitchLabDemand;

  const comparisons = [
    { area: "Problem Strength", founderView: founderProblem, pitchLabView: pitchLabProblem, gap: problemGap, maxScale: 10 },
    { area: "Market Opportunity", founderView: null, pitchLabView: pitchLabMarket, gap: null, maxScale: 10 },
    { area: "Differentiation", founderView: founderDiff, pitchLabView: pitchLabDifferentiation, gap: diffGap, maxScale: 10 },
    { area: "Competition Difficulty", founderView: founderCompDifficulty, pitchLabView: pitchLabCompDifficulty, gap: compDiffGap, maxScale: 10 },
    { area: "Customer Demand", founderView: founderDemand, pitchLabView: pitchLabDemand, gap: demandGap, maxScale: 10 }
  ];

  const blindSpots = [];

  if (diffGap >= 2) {
    blindSpots.push({
      area: "Differentiation",
      whatIBelieved: `You rated solution differentiation ${founderDiff}/10.`,
      whatPitchLabFound: `PitchLab's assessment found relatively limited differentiation (${pitchLabDifferentiation}/10) from existing alternatives.`,
      whyItMatters: compScoreObj.explanation || "Customers rely heavily on existing workarounds, requiring clear differentiation to overcome switching inertia.",
      gapPoints: diffGap
    });
  }

  if (compDiffGap <= -2 || (founderCompDifficulty <= 4 && pitchLabCompDifficulty >= 7)) {
    blindSpots.push({
      area: "Competition & Market Barriers",
      whatIBelieved: `You rated competitive difficulty as low/moderate (${founderCompDifficulty}/10).`,
      whatPitchLabFound: `PitchLab identified a more challenging competitive environment (${pitchLabCompDifficulty}/10 difficulty).`,
      whyItMatters: compScoreObj.missingEvidence || "Established market incumbents and customer reliance on manual workarounds pose significant competition friction.",
      gapPoints: Math.abs(compDiffGap)
    });
  }

  if (demandGap >= 2) {
    blindSpots.push({
      area: "Customer Demand & Pricing",
      whatIBelieved: `You expressed high confidence (${founderDemand}/10) in customer willingness to pay.`,
      whatPitchLabFound: `PitchLab's assessment noted limited direct evidence of customer payment commitment (${pitchLabDemand}/10).`,
      whyItMatters: bizScoreObj.missingEvidence || "Unvalidated pricing tiers and cost-to-serve assumptions require direct empirical testing with prospective buyers.",
      gapPoints: demandGap
    });
  }

  if (problemGap >= 2) {
    blindSpots.push({
      area: "Problem Severity & Urgency",
      whatIBelieved: `You rated customer problem severity ${founderProblem}/10.`,
      whatPitchLabFound: `PitchLab found that while a problem exists, evidence of acute customer urgency is moderate (${pitchLabProblem}/10).`,
      whyItMatters: probScoreObj.missingEvidence || "Validate problem frequency and severity directly through structured discovery conversations.",
      gapPoints: problemGap
    });
  }

  if (blindSpots.length === 0 && overallGap > 10) {
    blindSpots.push({
      area: "Validation & Market Proof",
      whatIBelieved: `Your initial confidence (${overallConfidence}/100) exceeds current evidence maturity.`,
      whatPitchLabFound: `PitchLab's overall assessment evaluated the concept at ${pitchLabOverall}/100.`,
      whyItMatters: "Focus on conducting discovery interviews and testing willingness to pay before committing capital.",
      gapPoints: overallGap
    });
  }

  const positiveSurprises = [];

  if (problemGap <= -2) {
    positiveSurprises.push({
      area: "Problem Urgency",
      whatIBelieved: `You rated the customer problem ${founderProblem}/10.`,
      whatPitchLabFound: `PitchLab found evidence suggesting problem urgency and market frequency are materially stronger (${pitchLabProblem}/10).`,
      whyItMatters: "Strong underlying problem urgency increases customer willingness to consider new solutions."
    });
  }

  if (demandGap <= -2) {
    positiveSurprises.push({
      area: "Business Model Mechanics",
      whatIBelieved: `You estimated customer willingness to pay at ${founderDemand}/10.`,
      whatPitchLabFound: `PitchLab identified encouraging commercial model dynamics and recurring revenue potential (${pitchLabDemand}/10).`,
      whyItMatters: "A well-structured business model can accelerate early unit margin profitability."
    });
  }

  let interpretation = "";
  if (Math.abs(overallGap) <= 10) {
    interpretation = "Your initial confidence closely aligns with PitchLab's independent assessment. Both indicate a similar level of commercial maturity.";
  } else if (overallGap > 0) {
    const mainGapNames = blindSpots.map(b => b.area).join(" and ");
    interpretation = `Your initial confidence (${overallConfidence}/100) is higher than PitchLab's assessment (${pitchLabOverall}/100). The key area${blindSpots.length > 1 ? 's' : ''} to investigate: ${mainGapNames || 'unvalidated market demand'}.`;
  } else {
    interpretation = `PitchLab's independent assessment (${pitchLabOverall}/100) found stronger commercial foundations than your initial prediction (${overallConfidence}/100).`;
  }

  return {
    hasPrediction: Boolean(predictions && (predictions.overallConfidence !== undefined || predictions.problemStrength !== undefined)),
    founderPredictions: {
      overallConfidence,
      problemStrength: founderProblem,
      differentiation: founderDiff,
      competitionDifficulty: founderCompDifficulty,
      customerDemand: founderDemand,
      statedBiggestRisk
    },
    pitchLabDimensions: {
      overallScore: pitchLabOverall,
      problemStrength: pitchLabProblem,
      marketOpportunity: pitchLabMarket,
      differentiation: pitchLabDifferentiation,
      competitionDifficulty: pitchLabCompDifficulty,
      customerDemand: pitchLabDemand
    },
    gaps: {
      overallGap,
      problemGap,
      diffGap,
      compDiffGap,
      demandGap
    },
    comparisons,
    blindSpots: blindSpots.slice(0, 3),
    positiveSurprises: positiveSurprises.slice(0, 2),
    interpretation,
    disclaimer: "The purpose of this comparison is not to determine who is 'right', but to identify assumptions worth validating before committing significant time or capital."
  };
}

function generateContextualScoreExplanation(key, scoreAchieved, maxScore, rawInputs = {}, gatesInfo = {}, founderCalc = {}) {
  const idea = (rawInputs.idea || "Proposed venture").trim();
  const targetMarket = (rawInputs.targetMarket || "target customers").trim();
  const isNuclear = (idea + " " + (rawInputs.category || "")).toLowerCase().includes("nuclear");
  const ratio = maxScore > 0 ? scoreAchieved / maxScore : 0;

  if (key === 'problemCustomerClarity') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "The underlying energy-security and baseload supply challenge is clearly defined, but commercial demand accessibility is governed by statutory framework constraints.";
    }
    return ratio >= 0.7
      ? `The commercial problem and target customer segment (${targetMarket}) are clearly defined with high articulated urgency.`
      : `The problem concept is identified, but target customer definition and problem severity require sharper empirical validation.`;
  }
  if (key === 'founderCapabilityFit') {
    if (isNuclear && !founderCalc?.hasDirectDomainMatch) {
      return "Founder demonstrates strong transferable commercial and financial capability, but lacks direct technical nuclear engineering credentials.";
    }
    return ratio >= 0.7
      ? "Founder background demonstrates relevant sector experience and operational capability to execute this opportunity."
      : "Founder demonstrates useful general commercial skills, but lacks direct sector execution experience for this specific business.";
  }
  if (key === 'customerValidation') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No commercial off-taker validation is currently evidenced; customer commitment is a downstream step following statutory permissibility.";
    }
    return ratio >= 0.5
      ? "Initial customer interest or early feedback is documented, requiring formal willingness-to-pay testing."
      : "Empirical customer validation logs, LOIs, or formal user feedback are not yet evidenced.";
  }
  if (key === 'marketCommercialOpportunity') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Underlying electricity market demand is substantial, but accessible commercial market opportunity is severely constrained by statutory and capital barriers.";
    }
    return ratio >= 0.7
      ? `Addressable market opportunity in ${targetMarket} displays positive growth tailwinds and accessible customer segments.`
      : `Market segment opportunity is present, but early commercial reachability and adoption friction require verification.`;
  }
  if (key === 'businessModelWillingnessToPay') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Wholesale power revenue mechanisms are identifiable, but no compliant off-take, regulatory consenting, or multi-billion project financing structure exists.";
    }
    return ratio >= 0.7
      ? "Revenue model and pricing structure are logically structured relative to target customer value proposition."
      : "Monetisation model is conceptual; customer willingness-to-pay and unit margins require empirical testing.";
  }
  if (key === 'competitivePosition') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No venture-specific defensible advantage is yet evidenced relative to established generation alternatives or state-backed utility infrastructure.";
    }
    return ratio >= 0.7
      ? "Value proposition articulates clear operational advantages over existing manual workarounds."
      : "Differentiation against entrenched market incumbents and existing customer workarounds remains early stage.";
  }
  if (key === 'executionReadiness') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Execution readiness is constrained by multi-billion-dollar capital scale, multi-stage statutory consenting, and specialist capability prerequisites.";
    }
    return ratio >= 0.7
      ? "Execution plan outlines structured milestones aligned with available founder time and validation resources."
      : "Near-term execution roadmap requires disciplined scoping around high-risk commercial assumptions.";
  }
  if (key === 'futureTrends') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Macro decarbonisation tailwinds support clean energy, but significant statutory and regulatory barriers present immediate feasibility headwinds.";
    }
    return ratio >= 0.7
      ? "Macro technology and industry trends strongly support long-term adoption of this commercial solution."
      : "Macro trends present mixed dynamics requiring proactive positioning ahead of regulatory and technology shifts.";
  }

  return `Evaluated against commercial feasibility criteria (${scoreAchieved}/${maxScore}).`;
}

function generateContextualInvestorCommentary(area, rating, scoreAchieved, maxScore, reqData = {}, gatesInfo = {}, reconciled = {}) {
  const idea = (reqData.idea || "Proposed concept").trim();
  const targetMarket = (reqData.targetMarket || "target customers").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear");
  const ventureType = classifyVentureType(reqData);

  if (area === "Problem Worth Solving") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Reliable, affordable, low-carbon electricity represents a strategically significant long-term infrastructure challenge.";
    }
    return rating >= 4
      ? "Target customer problem and operational pain urgency are well articulated and commercially significant."
      : "The problem statement is identified, but pain urgency and customer impact require sharper empirical verification.";
  }
  if (area === "Market Opportunity") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Underlying electricity demand is substantial, but the accessible opportunity for this solution remains severely constrained by regulatory and capital barriers.";
    }
    return rating >= 4
      ? `Addressable market opportunity in ${targetMarket} displays strong underlying demand drivers.`
      : "Underlying market exists, but commercially accessible TAM and early customer reachability remain unverified.";
  }
  if (area === "Competitive Advantage") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No venture-specific defensible advantage is yet evidenced relative to established generation alternatives or potential state-backed infrastructure development.";
    }
    return rating >= 4
      ? "Unique value proposition and operational advantages provide clear differentiation against current manual workarounds."
      : "Differentiation relative to entrenched market incumbents and existing customer workarounds remains early stage.";
  }
  if (area === "Business Model") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Potential revenue mechanisms are identifiable, but no feasible regulatory, financing or off-take structure has been established.";
    }
    return rating >= 4
      ? "Monetisation model is logical with direct alignment between customer value delivery and revenue capture."
      : "Commercial revenue model is conceptual; customer willingness-to-pay and unit margins require empirical testing.";
  }
  if (area === "Founder Capability") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Strong transferable commercial capability is present, but venture-specific nuclear, engineering and regulatory execution capability is not evidenced.";
    }
    const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing");
    if (isHardware) {
      return rating >= 4
        ? "Founder demonstrates strong commercial background and execution leadership, with specialist engineering capability to be engaged as hardware design matures."
        : "Founder brings transferable commercial capability; direct hardware engineering, electrical design, and manufacturing specialist capability should be engaged to support execution.";
    }
    return rating >= 4
      ? "Founder demonstrates strong domain credentials, relevant operational background, and execution capability."
      : "Founder possesses useful general commercial skills, but lacks direct domain execution experience for this venture.";
  }
  if (area === "Customer Validation") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No off-taker validation is currently evidenced and this remains downstream of statutory permissibility.";
    }
    return rating >= 4
      ? "Empirical customer interview logs, early pilot feedback, or formal interest validate core demand assumptions."
      : "No empirical customer validation logs, LOIs, or pilot user commitments are currently evidenced.";
  }
  if (area === "Scalability") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "The theoretical generation opportunity is large, but practical scalability is constrained by capital, regulation, site development and infrastructure requirements.";
    }
    const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing");
    const isService = ventureType.includes("Trade") || ventureType.includes("Local Service") || ventureType.includes("Professional Services");
    const isMarketplace = ventureType.includes("Marketplace");

    if (isHardware) {
      return rating >= 4
        ? "Scalability is supported by standardised hardware manufacturing and channel distribution, though unit gross margins and tooling investments govern capital efficiency."
        : "Scalability is constrained by hardware manufacturing tooling costs, physical inventory working capital, and supply chain lead times.";
    }
    if (isService) {
      return rating >= 4
        ? "Scalability is supported by standardised operating procedures and workflow delegability, balancing labour utilisation and capacity."
        : "Scalability is constrained by direct labour dependence, service delivery capacity, and linear staffing requirements.";
    }
    if (isMarketplace) {
      return rating >= 4
        ? "Scalability is driven by platform network effects and two-sided liquidity without proportional marginal servicing costs."
        : "Scalability is constrained by dual-sided acquisition friction, chicken-and-egg liquidity hurdles, and local supply retention.";
    }
    return rating >= 4
      ? "Business model displays capacity for software scalability with low marginal distribution and hosting costs."
      : "Scalability is constrained by initial capital intensity, high customer acquisition costs, or manual service delivery.";
  }
  if (area === "Investment Readiness") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "The concept is not presently investment-ready because fundamental statutory and technical feasibility remains unresolved.";
    }
    return rating >= 4
      ? "Commercial concept demonstrates strong evidence maturity and clear milestone progression for capital deployment."
      : "The opportunity is early stage with foundational evidence gaps requiring resolution before seeking investment.";
  }

  return `Evaluated against commercial readiness criteria (${rating}/5).`;
}

/**
 * Authoritative Central Legal & Regulatory Assessment Object (Fix 1B / 1C)
 * Single authoritative source controlling all legal/regulatory conclusions across the report.
 */
function getLegalRegulatoryAssessment(rawInputs = {}, gatesInfo = {}, ventureType = "") {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const targetMarket = (rawInputs.targetMarket || "").toLowerCase();
  const locationCountry = (rawInputs.locationCountry || "").toLowerCase();
  const locationSummary = (rawInputs.locationSummary || "").toLowerCase();
  const fullText = `${idea} ${problem} ${targetMarket} ${locationCountry} ${locationSummary}`.toLowerCase();

  const isNuclear = Boolean(fullText.match(/\b(nuclear|atomic|power plant|reactor|fission|fusion|smr)\b/i));
  const isNZ = Boolean(fullText.match(/new zealand|\bnz\b|kiwi|auckland|wellington|christchurch/)) || (locationCountry === "" && locationSummary === "");

  if (isNuclear && isNZ) {
    return {
      primaryGatingRisk: "Statutory & Regulatory Permissibility",
      evidenceLevel: "Preliminary Commercial Assessment",
      certaintyLevel: "LEVEL C",
      directlyApplicableLaw: [
        "Radiation Safety Act 2016",
        "Resource Management Act 1991",
        "Atomic Energy Act 1945"
      ],
      adjacentLawOrPolicy: [
        "New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 (nuclear explosive devices and nuclear-propelled vessels provisions)"
      ],
      verifiedFacts: [
        "New Zealand faces increasing electricity demand, security-of-supply challenges and continued decarbonisation requirements.",
        "Land-based commercial nuclear power generation is not currently deployed in New Zealand.",
        "Radiation safety and environmental consenting frameworks apply to nuclear and radioactive activities."
      ],
      preliminaryInterpretations: [
        "The concept appears to face substantial statutory and regulatory barriers, subject to specialist legal confirmation.",
        "The commercially accessible market opportunity appears materially constrained pending legal confirmation."
      ],
      unresolvedQuestions: [
        "Whether a viable commercial generation pathway exists under the current statutory framework.",
        "Whether legislative amendment or statutory reform would ultimately be required."
      ],
      specialistConfirmationRequired: true,
      permittedLanguage: [
        "appears to face substantial statutory and regulatory barriers",
        "material constraints pending legal confirmation",
        "subject to specialist legal confirmation",
        "pathway remains unresolved"
      ],
      prohibitedLanguage: [
        "currently blocked by legislative barriers",
        "insurmountable legislative and regulatory barriers",
        "non-starter",
        "effectively prohibits",
        "unfeasible without legislative reform",
        "requires legislative reform",
        "statutory bans",
        "blocked by law"
      ]
    };
  }

  if (gatesInfo?.hasCriticalGate) {
    return {
      primaryGatingRisk: gatesInfo.primaryGatingRisk || "Regulatory & Feasibility Gateway",
      evidenceLevel: "Preliminary Commercial Assessment",
      certaintyLevel: "LEVEL C",
      directlyApplicableLaw: [],
      adjacentLawOrPolicy: [],
      verifiedFacts: [
        "Specialist statutory or regulatory compliance prerequisites apply to this sector."
      ],
      preliminaryInterpretations: [
        "The concept appears to face critical feasibility or regulatory constraints, subject to specialist confirmation."
      ],
      unresolvedQuestions: [
        "Whether a compliant commercial pathway exists under current regulations."
      ],
      specialistConfirmationRequired: true,
      permittedLanguage: [
        "subject to specialist confirmation",
        "appears to face material constraints"
      ],
      prohibitedLanguage: [
        "blocked by law",
        "illegal",
        "prohibited",
        "insurmountable",
        "non-starter"
      ]
    };
  }

  return {
    primaryGatingRisk: "Customer Demand & Willingness to Pay",
    evidenceLevel: "Unconstrained Commercial Activity",
    certaintyLevel: "LEVEL D",
    directlyApplicableLaw: [],
    adjacentLawOrPolicy: [],
    verifiedFacts: [],
    preliminaryInterpretations: [],
    unresolvedQuestions: [],
    specialistConfirmationRequired: false,
    permittedLanguage: [],
    prohibitedLanguage: []
  };
}

/**
 * Authoritative Contextual Investor Verdict Generator (Fix 3A / 3B)
 * Dynamically synthesizes why investment is not appropriate now without categorical permanence.
 */
function generateContextualInvestorVerdict(reqData = {}, reconciled = {}, legalReg = {}, founderResourceReality = {}) {
  const idea = (reqData.idea || "").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear");

  if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
    return "In its current conceptual state, the opportunity is not presently suitable for conventional venture-capital investment. Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved. The founder brings useful transferable commercial and financial capability, but a credible venture would require substantial specialist nuclear, engineering, regulatory and infrastructure capability alongside it. Investment consideration should remain deferred until the primary statutory/legal gateway has been investigated.";
  }

  if (reconciled.overallScore >= 75) {
    return "This opportunity demonstrates strong commercial fundamentals, clear problem clarity, and actionable customer validation. Investors would view this as an attractive early-stage candidate with identifiable next milestones.";
  }
  if (reconciled.overallScore >= 50) {
    return "This opportunity addresses a genuine market problem and demonstrates commercial potential. The business model is logical and the founder possesses relevant experience. However, investors would expect stronger evidence of customer demand before committing capital. Completing customer interviews, securing early users and validating pricing would substantially strengthen the investment proposition.";
  }
  return "Investor interest is currently constrained because core customer validation and commercial unit economics remain unproven. Capital allocation should be deferred until the founder validates customer willingness to pay and market reach.";
}

/**
 * Cross-Section QA Integrity Gate (Fix 10 & Fix 1D)
 * Validates legal certainty consistency, evidence provenance, sensational language, and staging sequence.
 * Throws Error on any assertion failure.
 */
function validateReportIntegrityGate(evaluationData = {}, reqData = {}) {
  const legalObj = evaluationData.legalRegulatoryAssessment || {};
  const certaintyLevel = legalObj.certaintyLevel || "LEVEL D";
  const custValScore = evaluationData.scores?.customerValidation?.scoreAchieved ?? evaluationData.scorecard?.customerValidation?.scoreAchieved ?? 0;

  // Collect text across all report sections
  const texts = [
    evaluationData.summaryBlock?.pitchLabVerdict,
    evaluationData.summaryBlock?.biggestRiskToThisIdea,
    evaluationData.summaryBlock?.doThisBeforeBuildingMore,
    evaluationData.executiveSummary,
    evaluationData.investorBite?.introduction,
    evaluationData.investorBite?.investmentVerdict,
    evaluationData.investorBite?.biggestRisk,
    JSON.stringify(evaluationData.investorBite?.improvements || []),
    evaluationData.marketInsights?.customerReviewTrends,
    evaluationData.marketInsights?.governmentPolicyInfluence,
    evaluationData.marketInsights?.commercialReality,
    evaluationData.marketInsights?.marketLandscape,
    evaluationData.businessTheme?.strategicPositioning,
    evaluationData.businessTheme?.marketCategoryDynamics,
    JSON.stringify(evaluationData.futureTrends?.dimensions || {}),
    JSON.stringify(evaluationData.actionPlan?.topFivePriorities || []),
    JSON.stringify(evaluationData.summaryBlock?.threePriorityActions || []),
    JSON.stringify(evaluationData.founderCapabilityExplanation?.recommendedResponse || []),
    evaluationData.cvAnalysis?.alignmentWithBusinessIdea,
    evaluationData.finalRecommendation?.why,
    evaluationData.finalRecommendation?.pathForward
  ].filter(Boolean);

  const fullReportText = texts.join(" \n ");

  // 1. Certainty Escalation Check: If legal certainty is below LEVEL A, assert absence of escalatory certainty
  if (certaintyLevel !== "LEVEL A") {
    const escalationRules = [
      { pattern: /effectively prohibits/i, phrase: "effectively prohibits" },
      { pattern: /unfeasible without legislative reform/i, phrase: "unfeasible without legislative reform" },
      { pattern: /currently blocked by legislative/i, phrase: "currently blocked by legislative" },
      { pattern: /insurmountable legislative/i, phrase: "insurmountable legislative" },
      { pattern: /\bblocked by law\b/i, phrase: "blocked by law" },
      { pattern: /\bnon-starter because of legislation\b/i, phrase: "non-starter because of legislation" },
      { pattern: /\bdeeply hostile\b/i, phrase: "deeply hostile" },
      { pattern: /legislative pathway were conceivable/i, phrase: "legislative pathway were conceivable" },
      { pattern: /societal shifts before any commercial/i, phrase: "societal shifts before any commercial" },
      { pattern: /effectively unavailable/i, phrase: "effectively unavailable" },
      { pattern: /make this venture currently non-viable/i, phrase: "make this venture currently non-viable" }
    ];
    for (const rule of escalationRules) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Certainty escalation detected ('${rule.phrase}'). Central legal certainty is ${certaintyLevel}.`);
      }
    }
  }

  // 2. Evidence Provenance Check: If Customer Validation <= 4/20, assert absence of unevidenced primary discovery claims
  if (custValScore <= 4) {
    const provenanceRules = [
      { pattern: /commercial off-taker reviews/i, phrase: "commercial off-taker reviews" },
      { pattern: /off-taker reviews reveal/i, phrase: "off-taker reviews reveal" },
      { pattern: /customer reviews reveal/i, phrase: "customer reviews reveal" },
      { pattern: /users report/i, phrase: "users report" },
      { pattern: /feedback from prospective clients/i, phrase: "feedback from prospective clients" },
      { pattern: /energy sector feedback/i, phrase: "energy sector feedback" },
      { pattern: /off-taker feedback/i, phrase: "off-taker feedback" }
    ];
    for (const rule of provenanceRules) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Evidence provenance mismatch detected ('${rule.phrase}'). Customer validation score is ${custValScore}/20.`);
      }
    }
  }

  // 3. Sensational & Categorical Language Check
  const bannedLanguageRules = [
    { pattern: /looming energy crisis/i, phrase: "looming energy crisis" },
    { pattern: /\binsurmountable\b/i, phrase: "insurmountable" },
    { pattern: /\bnon-starter\b/i, phrase: "non-starter" },
    { pattern: /\birrefutable\b/i, phrase: "irrefutable" },
    { pattern: /immediately recruit a core leadership team/i, phrase: "immediately recruit a core leadership team" },
    { pattern: /recruit a highly specialised co-founder/i, phrase: "recruit a highly specialised co-founder" },
    { pattern: /\bextraordinary statutory\b/i, phrase: "extraordinary statutory" }
  ];
  for (const rule of bannedLanguageRules) {
    if (rule.pattern.test(fullReportText)) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Prohibited language detected ('${rule.phrase}').`);
    }
  }

  // 4. Sequence Check: Formal pre-feasibility study must not appear as an immediate action
  const immediateActions = JSON.stringify(evaluationData.summaryBlock?.threePriorityActions || []);
  if (/Conduct a formal pre-feasibility study/i.test(immediateActions)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Formal pre-feasibility study positioned as immediate action instead of staged gateway.");
  }

  // 5. Business-Context & Problem Grounding Check (MoorSafe Fix 1)
  const custProblem = evaluationData.businessModelSnapshot?.customerProblem || "";
  const preservedProb = (reqData.problem || evaluationData.problem || "").toLowerCase();
  if (preservedProb && (preservedProb.includes("pest") || preservedProb.includes("rodent") || preservedProb.includes("rat"))) {
    if (custProblem.toLowerCase().includes("collision") || custProblem.toLowerCase().includes("mooring line failure")) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Business Model Customer Problem grounding mismatch. Found '${custProblem}' which conflicts with preserved pest/rodent problem.`);
    }
  }

  // 6. Raw Variable & Broken Placeholder Integrity Check (MoorSafe Fix 9 & 10)
  if (/\$riskCapital/i.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Raw template variable '$riskCapital' leaked into report output.");
  }
  if (/\$\{[^}]+\}/.test(fullReportText) || /\{\{[^}]+\}\}/.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Unresolved template placeholder detected in report output.");
  }
  if (/\b(?:undefined|null|\[object Object\])\b/.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Raw undefined/null/[object Object] detected in report output.");
  }
  if (/(?:^|[^\$])\s*,\s*500\b/.test(fullReportText) || /,\s*500\s*[-–]/.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Malformed currency range starting with ',500' detected in report output.");
  }

  // 7. Unsupported Factual Claims & Evidence-State Language Controls (MoorSafe Fix 3 & 4)
  if (custValScore <= 4) {
    const unverifiedClaimRules = [
      { pattern: /There is no effective,? automated solution currently on the market/i, phrase: "There is no effective automated solution currently on the market" },
      { pattern: /clear,? willing-to-pay market segment/i, phrase: "clear, willing-to-pay market segment" },
      { pattern: /\bproven demand\b/i, phrase: "proven demand" },
      { pattern: /\bcustomers will pay\b/i, phrase: "customers will pay" },
      { pattern: /\bstrong willingness to pay\b/i, phrase: "strong willingness to pay" },
      { pattern: /\bconfirmed customer need\b/i, phrase: "confirmed customer need" },
      { pattern: /\bvalidated market\b/i, phrase: "validated market" }
    ];
    for (const rule of unverifiedClaimRules) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Unsupported factual claim detected ('${rule.phrase}') when customer validation is ${custValScore}/20.`);
      }
    }
  }

  // 8. Business-Type Contamination Check (MoorSafe Fix 6)
  const ventureType = classifyVentureType(reqData);
  if (!ventureType.includes("SaaS") && !ventureType.includes("Software")) {
    if (/software or operational leverage without proportional linear costs/i.test(fullReportText)) {
      throw new Error("PITCHLAB QA INTEGRITY FAILURE: Software scalability language detected in non-software venture assessment.");
    }
  }

  // 9. Stage & Recommendation Taxonomy Reconciliation (MoorSafe Fix 8)
  const undeclaredStages = [
    { pattern: /\bAlmost Ready\b/i, phrase: "Almost Ready" },
    { pattern: /\bReady to Pitch\b/i, phrase: "Ready to Pitch" },
    { pattern: /\bNeeds More Validation\b/i, phrase: "Needs More Validation" },
    { pattern: /\bEarly Stage Idea\b/i, phrase: "Early Stage Idea" }
  ];
  for (const rule of undeclaredStages) {
    if (rule.pattern.test(fullReportText)) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Undeclared maturity stage label detected ('${rule.phrase}'). Must use canonical PitchLab taxonomy.`);
    }
  }

  // 10. Founder Time Constraint Preservation Check (MoorSafe Fix 11)
  const timeInput = (reqData.timeCommitment || reqData.capacity || "").toLowerCase();
  if (timeInput.includes("0-5") || timeInput.includes("0–5") || timeInput.includes("<5")) {
    if (/Block 5-10 hours\/week/i.test(fullReportText)) {
      throw new Error("PITCHLAB QA INTEGRITY FAILURE: Founder time constraint overridden (found 'Block 5-10 hours/week' for 0-5 hrs/wk availability).");
    }
  }

  // 11. No Invented Core Offering Check (PL-FIX-20261006-SMARTTAX-01 Section 1)
  const founderIdea = (reqData.idea || "").toLowerCase();
  const coreOffering = (evaluationData.businessModelSnapshot?.coreOffering || "").toLowerCase();
  if (!founderIdea.includes("filing") && !founderIdea.includes("returns") && !founderIdea.includes("financial reporting")) {
    if (coreOffering.includes("tax compliance filing") || coreOffering.includes("financial reporting software")) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Invented core offering detected ('${evaluationData.businessModelSnapshot.coreOffering}'). Founder concept does not state automated tax filing or financial reporting.`);
    }
  }

  // 12. Grounded Founder Moat & Customer Demographic Check (PL-FIX-20261006-SMARTTAX-01 Section 4)
  const explicitTarget = (reqData.targetMarket || "").toLowerCase();
  if (!explicitTarget.includes("maori") && !explicitTarget.includes("māori") && !explicitTarget.includes("pacifica") && !explicitTarget.includes("pasifika")) {
    const stratMoat = (evaluationData.businessTheme?.strategicMoat || "").toLowerCase();
    const bmCustomer = (evaluationData.businessModelSnapshot?.targetCustomer || "").toLowerCase();
    if (stratMoat.includes("maori") || stratMoat.includes("māori") || stratMoat.includes("pacifica") || stratMoat.includes("pasifika") ||
        bmCustomer.includes("maori") || bmCustomer.includes("māori") || bmCustomer.includes("pacifica") || bmCustomer.includes("pasifika")) {
      throw new Error("PITCHLAB QA INTEGRITY FAILURE: Unsupported demographic inference detected. Māori/Pacifica demographic attributed as customer or moat without explicit founder target definition.");
    }
  }

  // 13. Cross-Industry Semantic Contamination Check (PL-FIX-20261006-SMARTTAX-01 Section 2)
  const isFinTechOrSaaS = ventureType === "Financial Services / FinTech" || ventureType.includes("SaaS") || ventureType.includes("Software");
  const isNuclearVenture = Boolean((reqData.idea || "").toLowerCase().match(/\b(nuclear|smr|atomic|fission|fusion|power plant)\b/));
  if (isFinTechOrSaaS && !isNuclearVenture) {
    const crossIndustryPatterns = [
      { pattern: /\bresource consents?\b/i, phrase: "resource consents" },
      { pattern: /\benvironmental standards\b/i, phrase: "environmental standards" },
      { pattern: /\bfast-track approvals?\b/i, phrase: "fast-track approvals" },
      { pattern: /\bregional compliance mandates\b/i, phrase: "regional compliance mandates" },
      { pattern: /\bradiation safety\b/i, phrase: "radiation safety" },
      { pattern: /\batomic energy\b/i, phrase: "atomic energy" },
      { pattern: /\bbaseload power\b/i, phrase: "baseload power" },
      { pattern: /\bsmall modular reactor\b/i, phrase: "small modular reactor" },
      { pattern: /\bpower plant\b/i, phrase: "power plant" }
    ];
    for (const rule of crossIndustryPatterns) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Cross-industry contamination detected ('${rule.phrase}') in ${ventureType} assessment.`);
      }
    }
  }

  // 14. Business Model Snapshot Completeness Check (8 Rows Preserved - Section 9)
  const bmSnapshot = evaluationData.businessModelSnapshot || {};
  const requiredBmKeys = ['targetCustomer', 'coreOffering', 'customerProblem', 'valueProposition', 'revenueModel', 'customerAcquisition', 'keyCosts', 'commercialAssessment'];
  for (const k of requiredBmKeys) {
    if (!bmSnapshot[k] || typeof bmSnapshot[k] !== 'string' || bmSnapshot[k].trim().length < 5) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Business Model Snapshot row '${k}' is missing or empty.`);
    }
  }

  // 15. Future Trends 5 Dimensions Completeness Check (5 Dimensions Preserved - Section 10)
  const ftDimensions = evaluationData.futureTrends?.dimensions || {};
  const requiredFtDims = ['demandTrend', 'technologyTrend', 'regulatoryTrend', 'competitionTrend', 'capitalTrend'];
  for (const d of requiredFtDims) {
    if (!ftDimensions[d] || typeof ftDimensions[d] !== 'string' || ftDimensions[d].trim().length < 5) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Future Trends dimension '${d}' is missing or empty.`);
    }
  }

  // 16. Executive Summary Synthesized Prose Check (Section 6)
  const execSummary = evaluationData.executiveSummary || "";
  if (/targeting\s+the\s+target\s+market/i.test(execSummary) || /focusing\s+on\s+many\s+small\s+businesses/i.test(execSummary) || /the\s+goal\s+is\s+addresses/i.test(execSummary)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Executive summary contains ungrammatical raw field concatenation.");
  }

  // 17. Staged Action Interview Feasibility Check (Section 7)
  if (/20[–-]30\s+interviews\s+(?:in|within)\s+7\s+days/i.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Inconsistent action plan demanding 20-30 interviews within 7 days.");
  }

  return true;
}

module.exports = {
  SCORING_CONFIG,
  reconcileScores,
  getScoreBand,
  computeMasterRecommendation,
  calculateFounderSubFactors,
  calculateProblemSubFactors,
  calculateMarketSubFactors,
  calculateBusinessModelSubFactors,
  calculateCompetitiveSubFactors,
  calculateExecutionSubFactors,
  detectFeasibilityGates,
  classifyVentureType,
  calculateFRI,
  calculateFounderEvidenceGap,
  calculate5DimensionFutureTrends,
  getValidationLadderForContext,
  getCommercialAdviserOpinion,
  getPortfolioDecision,
  generateContextualScoreExplanation,
  generateContextualInvestorCommentary,
  getLegalRegulatoryAssessment,
  generateContextualInvestorVerdict,
  validateReportIntegrityGate
};


