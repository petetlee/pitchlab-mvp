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

  if (text.match(/nuclear|atomic|smr\b|fission|fusion|\bpower plant\b|\belectric grid\b|\bdam\b|hydroelectric|geothermal|refinery|pipeline|mining|railway|airport|infrastructure|utility scale/)) {
    return 'Energy / Infrastructure / Heavy Industrial';
  }
  if (text.match(/pharma|drug|clinical trial|medical device|biotech|surgical|implant|gene therapy|diagnostic|health|hospital|medical/)) {
    return 'Medical / Biotech / Clinical';
  }
  if (text.match(/quantum|semiconductor|nanotech|fusion|robotics|satellite|aerospace|rocket|deep tech/)) {
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

  const isNuclear = Boolean(fullText.match(/nuclear|atomic|power plant|reactor|fission|fusion/));
  const isNZ = Boolean(fullText.match(/new zealand|\bnz\b|kiwi|auckland|wellington|christchurch/)) || (locationCountry === "" && locationSummary === "");

  // 1. Verified Legal Ban / Statutory Prohibition
  if (isNuclear && isNZ) {
    gates.push({
      type: 'Legal & Statutory Framework Barrier',
      label: 'Land-based commercial nuclear power generation in New Zealand requires statutory legislative reform (under the Radiation Safety Act 2016, Resource Management Act 1991, and Atomic Energy Act 1945), distinct from the New Zealand Nuclear Free Zone Act 1987 warship/weapon prohibitions',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  } else if (fullText.match(/illegal|prohibited|unlawful|banned/)) {
    gates.push({
      type: 'Legal Prohibition',
      label: 'Statutory restriction or outright legal prohibition applies to this activity in the target jurisdiction',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  // 2. Extreme Regulatory & Government Approval
  if (isNuclear || fullText.match(/clinical trial|drug approval|fda approval|banking license|grid connection/)) {
    gates.push({
      type: 'Regulatory Dependency',
      label: 'Venture requires major government, statutory, safety, or environmental regulatory approvals before operating',
      severity: 'Critical',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // 3. Extreme Capital & Heavy Infrastructure Disproportion
  if (isNuclear || fullText.match(/\bpower plant\b|\brefinery\b|\bdam\b|\butility scale\b|\bbillion\b|\bhundred million\b|\bheavy infrastructure\b/)) {
    gates.push({
      type: 'Capital & Infrastructure Dependency',
      label: 'Extreme multi-million or billion-dollar capital requirement relative to founder initial validation budget',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  // 4. Unproven Scientific / Deep Tech Feasibility
  if (fullText.match(/fusion|quantum|novel compound|unproven science|gene editing/)) {
    gates.push({
      type: 'Scientific / Technical Feasibility',
      label: 'Core technology or underlying scientific principle remains unproven or in fundamental R&D stage',
      severity: 'Critical',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // 5. Social, Political, Public Acceptance & Environmental Feasibility
  if (isNuclear || fullText.match(/dam|mining|fracking|toxic|landfill|waste disposal|genetically modified/)) {
    gates.push({
      type: 'Social & Political Feasibility',
      label: 'Venture carries high social licence, community sentiment, public acceptance, or environmental regulatory barriers',
      severity: 'Major',
      status: 'Critical Constraint Requiring Verification'
    });
  }

  // Check Domain Fit Gap for High Specialization
  const isHighSpec = fullText.match(/nuclear|atomic|power plant|clinical trial|drug|quantum|fusion|aerospace|satellite/);
  const hasDomainExp = founderText.match(/nuclear|atomic|energy engineer|radiation|reactor|physicist|phd|md\b|doctor|clinical|oncology|biomedical|aerospace/);

  if (isHighSpec && !hasDomainExp) {
    gates.push({
      type: 'Domain Capability Gap',
      label: 'Founder lacks direct technical/regulatory domain expertise required for this high-specialization venture',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  }

  const hasCriticalGate = gates.some(g => g.severity === 'Critical');

  return {
    hasCriticalGate,
    gates,
    summary: gates.map(g => g.label).join('; ')
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

  const isNuclear = Boolean(allVentureText.match(/nuclear|atomic|reactor|fission|fusion|smr\b|radiation/i));
  const isHeavyInfrastructure = (isNuclear || Boolean(allVentureText.match(/refinery|\bdam\b|hydroelectric|geothermal|railway|airport|utility scale|grid-scale|\bpower plant\b|\benergy plant\b/i))) && !allVentureText.match(/solar-powered|device|hardware|pest|mooring/i);
  const isBiotech = Boolean(allVentureText.match(/pharma|drug|clinical trial|medical device|biotech|gene therapy|therapeutics|vaccine|diagnostic/i));
  const isDeepTech = Boolean(allVentureText.match(/quantum|semiconductor|nanotech|satellite|aerospace|rocket|fusion|deep tech/i));

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

  const score = Math.min(15, Object.values(subFactors).reduce((a, b) => a + b, 0));
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

    let finalScore = num;
    if (key === 'founderCapabilityFit') {
      // SINGLE SOURCE OF TRUTH (Section 11): Founder Capability Fit is ALWAYS calculated deterministically from founderCalc.score.
      // AI LLM raw outputs cannot inflate or override this value.
      finalScore = founderCalc.score;
    } else if (key === 'futureTrends') {
      const alignment = Number(rawObj.trendAlignmentScore ?? rawObj.score ?? 7);
      const calcFromAlignment = Math.round((Math.max(1, Math.min(10, alignment)) / 10) * config.max);
      finalScore = (isNaN(num) || num === 0) ? calcFromAlignment : Math.min(config.max, Math.round(num));
    } else if (isNaN(num) || num === 0) {
      finalScore = subFactorBaselines[key] || 0;
    } else {
      finalScore = Math.min(config.max, Math.round(num));
    }

    // FEASIBILITY GATE CAP: Cap specific categories if Critical Feasibility Gate exists (Exact Section 3 Caps)
    if (gatesInfo.hasCriticalGate) {
      if (key === 'marketCommercialOpportunity') finalScore = Math.min(finalScore, 2);
      if (key === 'businessModelWillingnessToPay') finalScore = Math.min(finalScore, 2);
      if (key === 'competitivePosition') finalScore = Math.min(finalScore, 2);
      if (key === 'executionReadiness') finalScore = Math.min(finalScore, 1);
      if (key === 'futureTrends') finalScore = Math.min(finalScore, 1);
    }

    let explanation = (rawObj.assessment || rawObj.explanation || `Evaluated based on sub-factors and supplied evidence.`).trim();

    // RECONCILE NARRATIVE CONTRADICTIONS & DOMAIN MISMATCH EXPLANATIONS
    if (finalScore <= 6 && key === 'founderCapabilityFit') {
      if (!founderCalc.hasDirectDomainMatch || explanation.match(/direct|relevant|strong|expert|technical|nuclear|engineering/i)) {
        explanation = `Founder demonstrates useful general commercial skills, but lacks direct technical engineering or sector-specific domain experience required for this venture.`;
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
      if (key === 'founderCapabilityFit' && !founderCalc.hasDirectDomainMatch) {
        missingEvidence = "Direct technical (nuclear/heavy engineering, SMR), project management, energy infrastructure development, and specific statutory regulatory experience.";
        howToImprove = "Acquire co-founders with deep, verifiable expertise in nuclear engineering, energy infrastructure, and nuclear regulatory compliance, or pivot to a concept that aligns with current expertise.";
      } else if (key === 'marketCommercialOpportunity') {
        missingEvidence = "Accessible market opportunity; the concept is legally prohibited or constrained by statutory frameworks in the target region.";
        howToImprove = "Verify statutory and regulatory feasibility with specialist legal advisers before committing project capital.";
      } else if (key === 'customerValidation') {
        missingEvidence = "Zero verified customer or off-taker validation; commercial engagement is premature and blocked prior to establishing statutory permissibility.";
        howToImprove = "Resolve fundamental statutory and regulatory feasibility with legal and domain experts before engaging potential commercial off-takers.";
      } else if (key === 'executionReadiness') {
        missingEvidence = "Detailed statutory compliance roadmap, site environmental assessment, and multi-stage capital allocation plan.";
        howToImprove = "Execute a formal 30-day pre-feasibility validation study focusing on legal permissibility, site prerequisites, and expert consultation.";
      } else if (key === 'businessModelWillingnessToPay') {
        missingEvidence = "Validated pricing, capital structure, and off-taker willingness to pay within a legally compliant framework.";
        howToImprove = "Establish statutory permissibility and foundational capital/expertise before scoping commercial pricing or revenue models.";
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

  // Section 4: Transparent Overall Score calculation with Feasibility Gate Ceiling
  let overallScore = Math.max(0, Math.min(100, Math.round(total)));

  // SCORE CEILING MECHANISM (Requirement 6): Where PitchLab has verified/strongly evidenced Critical Constraint, cap Commercial Readiness at max 20/100 (Exploration Stage)
  if (gatesInfo.hasCriticalGate) {
    overallScore = Math.min(overallScore, 20);
  }

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
      return "STOP";
    }
    return "REFRAME";
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

  if (masterRecommendation === "STOP") ventureStage = "Closed";

  // Problem vs Solution Separation (Fix 14 / Req #6)
  let problemStatus = "Worth Investigating";
  let solutionStatus = "Viable";
  let portfolioAction = "Proceed with controlled validation.";

  if (gatesInfo?.hasCriticalGate) {
    problemStatus = "Worth Investigating (Problem Preserved)";
    solutionStatus = "Infeasible in Current Formulation";
    portfolioAction = "Preserve the problem statement while exploring alternative solutions or target geographies.";
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
    nextEvidenceGateway = "Establish statutory, legal and public-policy feasibility with qualified specialists.";
    reassessmentTrigger = "Return when statutory legislation or preliminary legal advice confirms a viable regulatory pathway.";
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
  calculateFounderEvidenceGap
};
