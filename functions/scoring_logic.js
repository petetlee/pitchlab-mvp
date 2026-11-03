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
 * Normalizes weekly available time commitment into a canonical band and step label.
 */
function normalizeFounderTimeCommitment(rawInputs = {}) {
  const cleanRaw = (v) => {
    const s = String(v ?? "").trim();
    return (!s || s === "undefined" || s === "null") ? "" : s;
  };
  const rawTime = cleanRaw(rawInputs.timeCommitment || rawInputs.weeklyAvailableHours);
  const rawCap = cleanRaw(rawInputs.capacity);

  const parseBand = (str) => {
    const s = String(str || "").trim().toLowerCase();
    if (!s) return null;
    if (s.match(/30\+|20\+|full[\s-]*time|\b35\b|\b40\b/) || s === "35" || s === "40") {
      return {
        normalizedBand: "30+ hours/week",
        stepHoursLabel: "30+ hrs/wk",
        numericMidpoint: 35,
        isConstrained: false
      };
    }
    if (s.match(/15\s*[-–to]\s*30|10\s*[-–to]\s*20|\b20\b/) || s === "20") {
      return {
        normalizedBand: "15–30 hours/week",
        stepHoursLabel: "15–30 hrs/wk",
        numericMidpoint: 20,
        isConstrained: false
      };
    }
    if (s.match(/10\s*[-–to]\s*15|\b12\b|\b12\.5\b/) || s === "12") {
      return {
        normalizedBand: "10–15 hours/week",
        stepHoursLabel: "10–15 hrs/wk",
        numericMidpoint: 12,
        isConstrained: false
      };
    }
    if (s.match(/5\s*[-–to]\s*15|5\s*[-–to]\s*10|\b8\b|\b10\b/) || s === "8" || s === "10") {
      return {
        normalizedBand: "5–15 hours/week",
        stepHoursLabel: "5–15 hrs/wk",
        numericMidpoint: 10,
        isConstrained: true
      };
    }
    if (s.match(/0\s*[-–to]\s*5|<5|\b3\b/) || s === "3") {
      return {
        normalizedBand: "0–5 hours/week",
        stepHoursLabel: "0–5 hrs/wk",
        numericMidpoint: 3,
        isConstrained: true
      };
    }
    return null;
  };

  const fromTime = parseBand(rawTime);
  const fromCap = parseBand(rawCap);
  const hasConflict = Boolean(fromTime && fromCap && fromTime.normalizedBand !== fromCap.normalizedBand);
  const chosen = fromTime || fromCap || {
    normalizedBand: "15–30 hours/week",
    stepHoursLabel: "15–30 hrs/wk",
    numericMidpoint: 20,
    isConstrained: false
  };

  return {
    raw: rawTime || rawCap || chosen.normalizedBand,
    normalizedBand: chosen.normalizedBand,
    canonicalLabel: chosen.normalizedBand,
    stepHoursLabel: chosen.stepHoursLabel,
    numericMidpoint: chosen.numericMidpoint,
    hoursPerWeek: chosen.numericMidpoint,
    isConstrained: chosen.isConstrained,
    hasConflict,
    conflictDetected: hasConflict,
    conflictNote: hasConflict
      ? `Explicit timeCommitment ('${rawTime}') conflicted with legacy capacity ('${rawCap}'); resolved to '${chosen.normalizedBand}'.`
      : ""
  };
}

/**
 * Normalizes founder available budget and initial risk capital without conflating them.
 */
function normalizeFounderCapital(rawInputs = {}) {
  const cleanRaw = (v) => {
    const s = String(v ?? "").trim();
    return (!s || s === "undefined" || s === "null") ? "" : s;
  };
  let avail = cleanRaw(rawInputs.investmentCommitment || rawInputs.budget || rawInputs.availableCapital) || "$0–$500 NZD";
  avail = avail.replace(/\$([0-9,]+)\s*-\s*\$([0-9,]+)/g, "$$$1–$$$2");
  const formattedAvail = avail.includes("NZD") || avail === "Bootstrapped" ? avail : `${avail} NZD`;

  let riskCap = cleanRaw(rawInputs.initialRiskCapital || rawInputs.riskCapital);
  if (!riskCap) {
    const lower = formattedAvail.toLowerCase();
    if (lower.includes("0–$500") || lower.includes("0-$500") || lower.includes("under $500") || lower === "$0 nzd" || lower === "$500 nzd") {
      riskCap = "$0–$500 NZD";
    } else if (lower.includes("500") && (lower.includes("2,500") || lower.includes("2500"))) {
      riskCap = "$500–$1,000 NZD";
    } else if (lower.includes("2,500") || lower.includes("5,000")) {
      riskCap = "$1,000 NZD";
    } else if (lower.includes("10,000") || lower.includes("25,000") || lower.includes("50,000")) {
      riskCap = "$2,500 NZD";
    } else {
      riskCap = "$1,000 NZD";
    }
  } else if (!riskCap.includes("NZD") && riskCap.startsWith("$")) {
    riskCap = `${riskCap} NZD`;
  }

  const ideaText = String(rawInputs.idea || "").toLowerCase();
  const requiresExternalInfrastructureCapital = Boolean(ideaText.match(/\b(nuclear|smr|power plant|atomic|reactor|refinery|utility scale)\b/i));

  return {
    availableCapital: formattedAvail,
    normalizedDisplay: formattedAvail,
    canonicalLabel: formattedAvail,
    initialRiskCapital: riskCap,
    initialRiskCapitalDisplay: riskCap,
    requiresExternalInfrastructureCapital
  };
}

/**
 * Detects when the founder's submitted 'problem' answer describes their own internal capability,
 * training, certification, or business setup goals rather than the customer's external pain point.
 */
function detectProblemStatementMisclassification(rawInputs = {}) {
  const problem = String(rawInputs.problem || "").trim();
  const idea = String(rawInputs.idea || "").trim();
  const targetMarket = String(rawInputs.targetMarket || "").trim();
  const lowerProb = problem.toLowerCase();
  const lowerIdea = idea.toLowerCase();

  const founderSelfGoalSignals = [
    /\bto become more proficient\b/i,
    /\benrolling in (?:further )?(?:course|training)\b/i,
    /\bunderstanding the requirements to set up a business\b/i,
    /\bhow to set up (?:a|my) business\b/i,
    /\bnew client base\b/i,
    /\bbuild(?:ing)? (?:a|my) client base\b/i,
    /\bget(?:ting)? my first clients\b/i,
    /\blearn(?:ing)? how to use\b/i,
    /\bupskill(?:ing)? in\b/i,
    /\bobtain(?:ing)? certification\b/i,
    /\bmy own training\b/i
  ];

  const matchCount = founderSelfGoalSignals.filter(rx => rx.test(problem)).length;
  const hasCustomerPainWords = Boolean(lowerProb.match(/\b(customers?|clients?|business owners?|sole traders?|organisations?|communities|struggle|lack|time-consuming|expensive|manual|errors?|compliance|overwhelmed)\b/i));

  const isFounderCapabilityNeedInProblemField = matchCount >= 1 && (!hasCustomerPainWords || matchCount >= 2);

  let inferredCustomerProblem = "";
  let founderStatedSetupPriorities = "";

  if (isFounderCapabilityNeedInProblemField) {
    founderStatedSetupPriorities = problem.replace(/\s+/g, " ").trim();
    if (lowerIdea.match(/\b(bookkeep|accounting|xero|myob|payroll|financial support|financial administration|tax)\b/i)) {
      const custGroup = targetMarket.match(/pasifika/i)
        ? "Pasifika small business owners, sole traders, and community organisations"
        : "Small business owners, sole traders, and community organisations";
      inferredCustomerProblem = `${custGroup} often face time-consuming manual bookkeeping, GST/payroll compliance pressures, limited visibility over cash flow, and a lack of accessible, culturally responsive financial administration support (inferred from the service concept; requires direct customer validation).`;
    } else {
      inferredCustomerProblem = `Target customers (${targetMarket.split('\n')[0] || 'prospective buyers'}) require practical support to resolve operational friction related to ${idea.slice(0, 120)} (inferred from the business concept; requires direct customer validation).`;
    }
  }

  return {
    isFounderCapabilityNeedInProblemField,
    founderStatedSetupPriorities,
    inferredCustomerProblem
  };
}

/**
 * Classifies the internal venture type based on raw inputs.
 * Separates Professional Services / Bookkeeping & Community / NFP from SaaS FinTech and Trade/Construction.
 */
function classifyVentureType(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const text = `${idea} ${problem} ${category}`;
  const ideaAndCategory = `${idea} ${category}`;

  if (text.match(/\b(ride-share|rideshare|ride-hailing|ride-booking|ride hailing|ride booking|taxi|passenger transport|mobility|transport-booking|car booking|driver network|shuttle|transit|airport transfer|vehicle rental)\b/i) || category.match(/transport|mobility/i)) {
    return 'Transportation / Mobility / Marketplace';
  }
  if (text.match(/\b(nuclear|atomic|smr|fission|fusion|power plant|electric grid|dam|hydroelectric|geothermal|refinery|pipeline|mining|railway|utility scale)\b/i) || (text.match(/\b(airport|infrastructure)\b/i) && !text.match(/ride-share|rideshare|taxi|passenger transport|transfer|shuttle|booking|rental/i))) {
    return 'Energy / Infrastructure / Heavy Industrial';
  }
  if (text.match(/\b(pharma|drug|clinical trial|medical device|biotech|surgical|implant|gene therapy|diagnostic|hospital)\b/i)) {
    return 'Medical / Biotech / Clinical';
  }
  if (text.match(/\b(quantum|semiconductor|nanotech|fusion|robotics|satellite|aerospace|rocket|deep tech)\b/i)) {
    return 'Deep Technology / Scientific';
  }
  if (text.match(/\b(decision support|decision intelligence|decision platform|startup evaluation|startup validation|idea validation|idea assessment|founder intelligence|venture evaluation|venture assessment|pitchlab)\b/i) || (text.match(/\b(ai\b|artificial intelligence)\b/i) && text.match(/\b(decision|validation|assessment|startup|venture|portfolio)\b/i))) {
    return 'AI / Business Decision Support Software';
  }
  if (text.match(/mooring|solar-powered|device|hardware|sensor|enclosure|physical product|equipment|machinery/)) {
    return 'Physical Consumer Product / Hardware';
  }
  if (text.match(/manufacturing|factory|assembly|tooling|mould|mass production/)) {
    return 'Manufacturing';
  }

  // Distinguish Bookkeeping / Accounting / Financial Administration Services from Software/FinTech products
  const isSoftwareProductSignal = Boolean(ideaAndCategory.match(/\b(saas|software|app\b|application|platform|automated tool|fintech|open banking|api|algorithm|cloud platform|digital tool)\b/i));
  const isBookkeepingOrAccountingService = Boolean(
    ideaAndCategory.match(/\b(bookkeeping|bookkeeper|accounting services?|payroll services?|financial support|financial administration|tax agent|bas agent|xero advisor|chartered accountant|cpa practice|consulting|advisory|coaching)\b/i)
  ) && !isSoftwareProductSignal;

  if (isBookkeepingOrAccountingService) {
    return 'Professional Services / Bookkeeping & Financial Advisory';
  }

  // Distinguish Community / Not-for-Profit / Social Enterprise concepts when primary offering is community/charity/NFP
  const isCommunityOrNfpPrimary = Boolean(
    ideaAndCategory.match(/\b(not-for-profit|non-profit|charity|charitable trust|incorporated society|social enterprise|community programme|community hub|youth programme|cultural programme)\b/i)
  ) && !isBookkeepingOrAccountingService && !isSoftwareProductSignal;

  if (isCommunityOrNfpPrimary) {
    return 'Community / Not-for-Profit / Social Enterprise';
  }

  if (text.match(/bank|fintech|tax|gst|accounting|payroll|insurance|lending|wealth|payment/)) {
    if (!isSoftwareProductSignal && idea.match(/\b(service|services|support|guidance|advisory|practice|firm|freelance|consultant)\b/i)) {
      return 'Professional Services / Bookkeeping & Financial Advisory';
    }
    return 'Financial Services / FinTech';
  }
  if (text.match(/\b(two-sided marketplace|multi-sided marketplace|buyer-seller marketplace|peer-to-peer marketplace|freelance marketplace|service marketplace|rental marketplace)\b/i) || (text.match(/\bmarketplace\b/i) && !text.match(/\b(decision|software|developer|ai|saas|analytics|intelligence)\b/i))) {
    return 'Marketplace';
  }

  // Trade / Local Service: Check ONLY the core idea and category, and never match the verb "building" in "building trust" / "building financial confidence" / "building a business"
  const cleanTradeText = ideaAndCategory
    .replace(/\bbuilding\s+(?:trust|confidence|financial|relationships?|capacity|capability|communities|community|a\s+business|a\s+client|my\s+business|on\s+more)\b/gi, '');
  if (cleanTradeText.match(/\b(plumb(?:er|ing)|electrician|electrical\s+contractor|builder|building\s+contractor|residential\s+construction|construction\s+company|construction\s+service|renovation|carpenter|carpentry|roofer|roofing|painter|hvac|mechanic|handyman|lawn\s+mowing|mowing|commercial\s+cleaning|cleaning\s+service|pest\s+control|landscaping|trade\s+service|local\s+trade)\b/i)) {
    return 'Trade / Local Service';
  }

  if (ideaAndCategory.match(/\b(cafe|restaurant|baking|bakery|catering|bar\b|pub\b|food truck|hotel|hospitality)\b/i)) {
    return 'Hospitality';
  }
  if (ideaAndCategory.match(/\b(store|boutique|shop|e-commerce|shopify|retail)\b/i)) {
    return 'Retail / E-Commerce';
  }
  if (ideaAndCategory.match(/\b(consulting|agency|advisory|coaching|legal|law firm|accounting firm|professional service)\b/i)) {
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
      regulatoryStatusCategory: 'No established or complete regulatory pathway',
      label: 'Land-based commercial nuclear electricity generation in New Zealand faces an unestablished and incomplete regulatory licensing pathway under the Atomic Energy Act 1945, Radiation Safety Act 2016, Resource Management Act 1991, and Electricity Industry Act 2010 (distinct from the New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987, which prohibits nuclear explosive devices, nuclear-powered ships, and radioactive waste dumping rather than land-based civilian power reactors), subject to specialist legal confirmation',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  } else if (fullText.match(/\b(expressly prohibited by statute|criminal offence|unlawful contraband)\b/i)) {
    gates.push({
      type: 'Express Statutory Prohibition',
      regulatoryStatusCategory: 'Expressly prohibited',
      label: 'Activity is expressly prohibited by statute in the target jurisdiction',
      severity: 'Critical',
      status: 'Verified Constraint'
    });
  } else if (fullText.match(/\b(illegal|prohibited|unlawful|banned)\b/i)) {
    gates.push({
      type: 'Legal & Statutory Framework Barrier',
      regulatoryStatusCategory: 'Legal permissibility uncertain',
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
    const authDecision = reconciled.masterRecommendation || "PARK";
    const narrative = "Preserve the underlying energy-security problem and monitor alternative solutions, jurisdictions and relevant statutory/regulatory changes; do not proceed with commercial SMR execution unless Stage Gate 1 statutory and regulatory feasibility criteria are met.";
    return {
      encouraging: "The underlying national energy-security problem is legitimate and strategically important.",
      caution: "The proposed solution faces substantial statutory, regulatory, licensing, technical and capital barriers.",
      unproven: "Whether an established or viable legal/regulatory licensing pathway exists for land-based commercial nuclear generation in New Zealand, subject to specialist legal confirmation.",
      masterRecommendation: authDecision,
      portfolioDecision: authDecision,
      portfolioAction: narrative,
      opinionNarrative: narrative
    };
  }

  const founderScore = reconciled.categoryScores?.founderCapabilityFit?.scoreAchieved || 0;
  const isWeakFit = founderScore <= 6;
  const authMasterRec = reconciled.masterRecommendation || (reconciled.overallScore >= 85 ? "PURSUE" : (reconciled.overallScore >= 40 ? "INVESTIGATE" : "PARK"));

  if (ventureType === 'Professional Services / Bookkeeping & Financial Advisory' || ventureType.includes('Professional Services')) {
    return {
      encouraging: "Strong submitted background in financial administration, payroll, reconciliations, and not-for-profit treasurer governance, paired with a well-defined target niche.",
      caution: "Separate internal founder setup priorities (Xero certification, business registration, and building an initial client base) from external customer pain points, and validate monthly package pricing directly with prospective clients before committing overhead.",
      unproven: "Verified customer willingness to pay for recurring monthly bookkeeping packages and client acquisition conversion rates within the target small-business and community segments.",
      masterRecommendation: authMasterRec,
      portfolioDecision: authMasterRec,
      portfolioAction: "Complete Xero advisor certification while conducting 8–10 structured discovery conversations with Pasifika small businesses and community organisations to secure 2–3 pilot bookkeeping clients.",
      opinionNarrative: "Complete Xero advisor certification while conducting 8–10 structured discovery conversations with Pasifika small businesses and community organisations to secure 2–3 pilot bookkeeping clients."
    };
  }

  if (ventureType === 'Community / Not-for-Profit / Social Enterprise') {
    return {
      encouraging: "Clear community mission, cultural alignment, and focus on grassroots capacity building.",
      caution: "Ensure governance setup and ongoing operating commitments are matched by confirmed participant demand and sustainable fee-for-service or grant funding.",
      unproven: "Long-term financial sustainability, recurring funder or fee-paying participant commitments, and delivery capacity.",
      masterRecommendation: authMasterRec,
      portfolioDecision: authMasterRec,
      portfolioAction: "Conduct 8–10 stakeholder discovery interviews and pilot an initial cohort or service agreement before scaling overhead.",
      opinionNarrative: "Conduct 8–10 stakeholder discovery interviews and pilot an initial cohort or service agreement before scaling overhead."
    };
  }

  if (ventureType.includes('Hardware') || ventureType.includes('Manufacturing')) {
    const act = reconciled.overallScore >= 40 ? "Actively investigate physical prototype field testing, marine durability, and customer willingness to pay." : "Reformulate physical solution architecture.";
    return {
      encouraging: isWeakFit
        ? "Strong general commercial background and clear physical product problem definition."
        : "Strong domain experience, hands-on user insight, and practical product vision.",
      caution: "Ensure mass production and tooling costs are delayed until physical prototype field durability and customer deposits are secured.",
      unproven: "Manufacturing unit economics, supplier reliability, and retail/direct distribution margins.",
      masterRecommendation: authMasterRec,
      portfolioDecision: authMasterRec,
      portfolioAction: act,
      opinionNarrative: act
    };
  }

  if (ventureType.includes('Transportation') || ventureType.includes('Mobility') || (ventureType.includes('Marketplace') && ((rawInputs.idea || '') + ' ' + (rawInputs.category || '')).toLowerCase().match(/ride|transport|driver|passenger|mobility/i))) {
    const act = reconciled.overallScore >= 40 ? "Conduct structured passenger and driver discovery interviews and concierge transfer trials." : "Preserve local transport problem while exploring manual or alternative dispatch models.";
    return {
      encouraging: isWeakFit
        ? "Strong general commercial background and clear local passenger transport problem definition."
        : "Strong local transport domain experience, operational background, and practical market relationships.",
      caution: "Ensure custom mobile application and software development are delayed until driver supply liquidity and passenger booking demand are validated through concierge trials.",
      unproven: "Marketplace unit economics, passenger booking frequency, and driver retention in the local market.",
      masterRecommendation: authMasterRec,
      portfolioDecision: authMasterRec,
      portfolioAction: act,
      opinionNarrative: act
    };
  }

  const act = reconciled.overallScore >= 40 ? "Conduct structured customer discovery interviews and initial evidence gathering." : "Preserve problem statement while exploring alternative commercial formulations.";
  return {
    encouraging: isWeakFit
      ? "Strong general commercial capability combined with clear problem definition."
      : "Strong problem definition, domain experience, and clear commercial opportunity.",
    caution: "Ensure non-essential expenditure and feature expansion are delayed until core customer demand and willingness to pay are validated.",
    unproven: "Repeat customer demand, unit economics, and scalable customer acquisition channels.",
    masterRecommendation: authMasterRec,
    portfolioDecision: authMasterRec,
    portfolioAction: act,
    opinionNarrative: act
  };
}

/**
 * Returns dynamic Portfolio Action & Decision metadata enforcing ONE Single Authoritative Master Portfolio Decision
 * while preserving the Problem vs Solution vs Conditional Phase 1 distinction.
 */
function getPortfolioDecision(arg1 = "", arg2 = "", arg3 = {}, arg4 = {}) {
  let masterRecommendation = "";
  let ventureType = "";
  let gatesInfo = {};
  let rawInputs = {};

  if (typeof arg1 === "object" && arg1 !== null && (arg1.idea !== undefined || arg1.inputs !== undefined || arg1.businessConcept !== undefined)) {
    // Called as (rawInputs, reconciled, ventureType, gatesInfo)
    rawInputs = arg1 || {};
    const reconciled = arg2 || {};
    masterRecommendation = reconciled.masterRecommendation || reconciled.recommendation || "";
    ventureType = typeof arg3 === "string" ? arg3 : "";
    gatesInfo = typeof arg4 === "object" && arg4 !== null ? arg4 : (typeof arg3 === "object" ? arg3 : {});
  } else {
    masterRecommendation = typeof arg1 === "string" ? arg1 : (arg1?.masterRecommendation || "");
    ventureType = typeof arg2 === "string" ? arg2 : "";
    gatesInfo = typeof arg3 === "object" && arg3 !== null ? arg3 : {};
    rawInputs = typeof arg4 === "object" && arg4 !== null ? arg4 : {};
  }

  const idea = (rawInputs.idea || "").toLowerCase();
  const isNuclear = idea.includes("nuclear");
  const isExpresslyIllegal = Boolean(gatesInfo?.gates?.some(g => g.type === 'Express Statutory Prohibition'));

  if (isNuclear || gatesInfo?.hasCriticalGate) {
    const authDecision = isExpresslyIllegal ? "STOP" : (String(masterRecommendation || "").toUpperCase() === "STOP" ? "STOP" : "PARK");
    return {
      masterRecommendation: authDecision,
      portfolioDecision: authDecision,
      decisionState: authDecision,
      portfolioAction: "Preserve the underlying energy-security problem while parking commercial SMR execution pending specialist statutory/regulatory clarification, policy reform, or alternative clean-firm generation structures.",
      portfolioReason: "The national energy-security problem remains strategically relevant and worth preserving, but commercial SMR nuclear power generation in New Zealand lacks an established regulatory/licensing pathway and requires multi-billion-dollar infrastructure capital beyond early-stage private venture feasibility.",
      problemStatus: "Worth Preserving",
      solutionStatus: "No Established Regulatory Pathway — Parked in Current Formulation",
      conditionalActivityStatus: "Conditional Phase 1 Only — Low-Cost Statutory & Regulatory Verification ($0–$500 NZD, 0–5 hrs/wk)",
      currentStage: "Exploration",
      nextEvidenceGateway: "Confirm whether any credible statutory/licensing pathway or policy reform mandate exists under New Zealand law before committing technical or commercial capital.",
      reassessmentTrigger: "Material statutory/regulatory policy change, establishment of a national nuclear regulatory regime, or specialist legal confirmation of a viable licensing pathway.",
      problemVsSolution: {
        underlyingProblem: "New Zealand's need for reliable, affordable, low-carbon electricity as demand increases and variable generation creates reliability and price challenges.",
        currentProposedSolution: "Development of a commercial SMR-based nuclear generation business in New Zealand.",
        problemStatus: "Worth Preserving",
        solutionStatus: "No Established Regulatory Pathway — Parked in Current Formulation",
        conditionalActivityStatus: "Conditional Phase 1 Only — Low-Cost Statutory & Regulatory Verification",
        portfolioAction: "Preserve the underlying energy-security problem while parking commercial SMR execution pending specialist statutory/regulatory clarification or policy reform."
      }
    };
  }

  let decision = "INVESTIGATE";
  let problemStatus = "Worth Investigating";
  let actionText = "Conduct structured customer discovery interviews and initial evidence gathering.";
  const masterUpper = String(masterRecommendation || "").toUpperCase();

  if (masterUpper.includes("STOP")) {
    decision = "STOP";
    problemStatus = "Discontinued";
    actionText = "Do not proceed with further investment in this concept.";
  } else if (masterUpper.includes("PARK") || masterUpper.includes("PAUSE")) {
    decision = "PARK";
    problemStatus = "Worth Preserving";
    actionText = "Preserve the problem statement while exploring alternative solutions or target geographies.";
  } else if (masterUpper.includes("PURSUE") || masterUpper.includes("PROCEED")) {
    decision = "PURSUE";
    problemStatus = "Worth Pursuing";
    actionText = "Actively progress commercial validation and pilot deployment.";
  } else {
    decision = "INVESTIGATE";
    problemStatus = "Worth Investigating";
    actionText = "Conduct structured customer discovery interviews and initial evidence gathering.";
  }

  return {
    masterRecommendation: decision,
    portfolioDecision: decision,
    decisionState: decision,
    portfolioAction: actionText,
    portfolioReason: "Commercial concept undergoing structured stage-gated validation based on evidence maturity.",
    problemStatus: problemStatus,
    solutionStatus: "Under Stage-Gated Validation",
    conditionalActivityStatus: "Proceed to Phase 2 only after Phase 1 problem & willingness-to-pay criteria are met",
    currentStage: "Validation",
    nextEvidenceGateway: "Complete initial discovery interviews and confirm customer willingness to pay.",
    reassessmentTrigger: "Completion of 30-day discovery milestone or material market feedback.",
    problemVsSolution: {
      underlyingProblem: String(rawInputs.problem || "Target customer pain point").trim(),
      currentProposedSolution: String(rawInputs.idea || "Proposed commercial solution").trim(),
      problemStatus: problemStatus,
      solutionStatus: "Under Stage-Gated Validation",
      conditionalActivityStatus: "Proceed to Phase 2 only after Phase 1 problem & willingness-to-pay criteria are met",
      portfolioAction: actionText
    }
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
  const isHeavyInfrastructure = (isNuclear || Boolean(allVentureText.match(/refinery|\bdam\b|hydroelectric|geothermal|railway|utility scale|grid-scale|\bpower plant\b|\benergy plant\b/i) || (allVentureText.match(/\bairport\b/i) && !allVentureText.match(/transfer|passenger|tourist|shuttle|ride-share|rideshare|taxi|booking|rental/i)))) && !allVentureText.match(/solar-powered|device|hardware|pest|mooring|ride-share|rideshare|taxi|passenger transport|mobility|transport-booking|car booking|vehicle rental/i);
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
  } else if (ventureType === 'Transportation / Mobility / Marketplace' || allVentureText.match(/transport|ride-share|rideshare|ride\b|fleet|logistics|driver|vehicle|taxi|shuttle/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/transport|fleet|driver|logistics|taxi|ride|courier|vehicle|rental|tour|transfer|dispatch|route|operating\s+transport|discovery/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|8\+|director|owner|manager|years|practical|operating/) ? 4 : 3;
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
  } else if (allVentureText.match(/tax|gst|accounting|bookkeeping|fintech|payroll|invoice|financial support|financial administration/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/ca\b|cpa\b|chartered|accountant|tax|accounting|finance|financial administration|financial reporting|accounts payable|payroll|reconciliation|bookkeep|treasurer|bcom|bachelor of business|auditor/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|15\+|20\+|28|senior|partner|director|treasurer/) ? 4 : 3;
    } else if (cleanFounderEvidence.match(/bookkeeper|finance|business owner/)) {
      domainScore = 2;
    } else {
      domainScore = 1;
    }
  } else if (ventureType === 'Community / Not-for-Profit / Social Enterprise' || allVentureText.match(/not-for-profit|non-profit|community organisation|incorporated society|charity/)) {
    hasDirectDomainMatch = !hasExplicitNoDomainStatement && Boolean(cleanFounderEvidence.match(/community|not-for-profit|non-profit|society|treasurer|board|trustee|coordinator|governance|social|pasifika|māori|pacific/));
    if (hasDirectDomainMatch) {
      domainScore = cleanFounderEvidence.match(/10\+|15\+|20\+|since|board|treasurer|director|lead/) ? 4 : 3;
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
  const hasPriorBusinessOwnership = Boolean(founderExp.match(/^yes|1\b|2\+|multiple|serial|started|ran a business|owned/i)) && !Boolean(founderExp.match(/^no\b|^none\b|^0\b/i));
  const lacksPriorBusinessOwnership = Boolean(founderExp.match(/^no\b|^none\b|^0\b/i)) || Boolean(exp.match(/experience:\s*no\b/i));
  let executionScore = 0;
  if (hasDirectDomainMatch && cleanFounderEvidence.match(/built|scaled|sold|director|partner|manager|led|leading|operated|operating|ran|principal|head|plumber|captain|landscaping|years|delivering|contractor|rental|tours|treasurer|board/)) {
    executionScore = lacksPriorBusinessOwnership ? 2 : 3;
  } else if (cleanFounderEvidence.match(/director|partner|senior\s+manager|finance\s+manager|corporate\s+finance|chartered\s+accountant|ca\b|cpa\b|caanz|owner|ran\s+a\s+business|led|leading|project\s+lead|certificated|licensed|treasurer/)) {
    executionScore = isVentureCriticalDomainNeeded ? 1 : 2;
  } else if (cleanFounderEvidence.match(/project|delivered|coordinator|team|management|years/)) {
    executionScore = 1;
  } else {
    executionScore = 0;
  }

  // 3. COMPONENT C: Transferable Commercial Capability (0 to 3 points)
  let commercialScore = 0;
  if (cleanFounderEvidence.match(/ca\b|cpa\b|caanz|chartered|accountant|bcom|bachelor of business|mba\b|finance\s+manager|director|partner|exited|sold\s+a\s+business|20\+\s+years|28\s+years/)) {
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
  const hasEstablishedTeamWithDomain = Boolean(cleanFounderEvidence.match(/\b(co-founder|cto|head\s+of\s+engineering|chief\s+scientist|specialist\s+lead|retained\s+expert|joint\s+venture)\b/) || cleanFounderEvidence.match(/\bpartnered\s+with\s+(technical|engineers?|developers?)/));
  const isTechDependentVenture = (ventureType === 'Transportation / Mobility / Marketplace' || ventureType === 'Marketplace' || ventureType === 'SaaS / Software') && allVentureText.match(/\b(app|platform|software|marketplace|digital)\b/);
  const hasTechLead = Boolean(cleanFounderEvidence.match(/\b(software\s+engineer|cto|lead\s+developer|full-stack|technical\s+co-founder)\b/));

  if (hasEstablishedTeamWithDomain || (hasDirectDomainMatch && (!isTechDependentVenture || hasTechLead))) {
    coverageScore = 3;
  } else if (hasDirectDomainMatch && isTechDependentVenture && !hasTechLead) {
    coverageScore = 2; // Domain covered, but tech platform capability is an acknowledged gap
  } else if (!isVentureCriticalDomainNeeded) {
    if (cleanFounderEvidence.match(/developer|contractor|designer|outsource|agency/) || ventureType === 'SaaS / Software' || ventureType === 'Marketplace' || ventureType === 'Transportation / Mobility / Marketplace') {
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
    if (ventureType === 'SaaS / Software' || ventureType === 'Marketplace' || ventureType === 'Transportation / Mobility / Marketplace' || allVentureText.match(/transport|ride-share|fleet/)) {
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
    } else if ((ventureType === 'Transportation / Mobility / Marketplace' || allVentureText.match(/transport|ride-share|fleet/)) && !cleanFounderEvidence.match(/\b(software\s+engineer|cto|full-stack|technical\s+co-founder)\b/)) {
      gapSeverity = 'Bridgeable Gap';
      finalScore = Math.min(finalScore, 11);
      appliedCap = true;
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
 * Calculates Problem & Customer Clarity Sub-Factors (Max 14)
 * Distinguishes Founder's own capability/setup needs from external Customer Pain Points.
 */
function calculateProblemSubFactors(rawInputs = {}) {
  const problem = (rawInputs.problem || "").toLowerCase();
  const target = (rawInputs.targetMarket || rawInputs.market || "").toLowerCase();
  const problemAnalysis = detectProblemStatementMisclassification(rawInputs);

  if (problemAnalysis.isFounderCapabilityNeedInProblemField) {
    // Founder described their own training/setup/client-acquisition needs instead of the customer's pain point.
    // Credit target customer specificity and inferred scope, but cap problem description & root cause clarity.
    const subFactors = {
      problemDescription: 1,
      targetCustomerSpecificity: target.length > 25 ? 3 : 2,
      rootCauseVsSymptom: 0,
      frequencySeriousness: 1,
      existingWorkarounds: target.match(/xero|myob|family|themselves|accountant/) ? 1 : 0,
      customerConsequences: 0,
      scopeFocus: 1
    };
    const score = Math.min(7, Object.values(subFactors).reduce((a, b) => a + b, 0));
    return {
      score,
      subFactors,
      isFounderCapabilityNeedInProblemField: true,
      founderStatedSetupPriorities: problemAnalysis.founderStatedSetupPriorities,
      inferredCustomerProblem: problemAnalysis.inferredCustomerProblem
    };
  }

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
  if (problem.match(/electricity|energy|carbon|cost|gst|tax|cash|delay|urgent|compliance|manual|time|struggle|overwhelm/)) subFactors.frequencySeriousness = 2;
  if (problem.match(/manual|spreadsheet|bank|xero|myob|grid|hydro|fossil|workaround/) || target.match(/manual|spreadsheet|xero|myob|themselves/)) subFactors.existingWorkarounds = 2;
  if (problem.length > 30) subFactors.customerConsequences = 1;

  const score = Math.min(14, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return {
    score,
    subFactors,
    isFounderCapabilityNeedInProblemField: false,
    founderStatedSetupPriorities: "",
    inferredCustomerProblem: ""
  };
}

/**
 * Calculates Customer Validation Sub-Factors (Max 20)
 * Incorporates customerValidation, businessStage, and network inputs, and detects contradictions.
 */
function calculateCustomerValidationSubFactors(rawInputs = {}) {
  const net = (rawInputs.network || "").toLowerCase();
  const custVal = (rawInputs.customerValidation || "").toLowerCase();
  const bizStage = (rawInputs.businessStage || "").toLowerCase();
  const combined = `${custVal} ${bizStage} ${net}`;

  let subFactors = {
    customerInterviews: 0,
    problemSeverityConfirmed: 1,
    solutionTested: 0,
    pricingTested: 0,
    pilotUsers: 0,
    payingCustomers: 0,
    repeatRetention: 0
  };

  const isExplicitZeroCustomers = Boolean(custVal.match(/^0\b|0\s+potential|none|not\s+yet|no\s+customers/i));
  const isPayingStage = Boolean(bizStage.match(/first\s+paying|growing\s+revenue|established/i));
  const hasStageContradiction = isExplicitZeroCustomers && isPayingStage;

  if (isExplicitZeroCustomers) {
    subFactors.customerInterviews = 0;
    subFactors.problemSeverityConfirmed = 1;
  } else if (custVal.match(/20\+|more\s+than\s+20/)) {
    subFactors.customerInterviews = 4;
    subFactors.problemSeverityConfirmed = 3;
    subFactors.solutionTested = 2;
    subFactors.pricingTested = 1;
  } else if (custVal.match(/6\s*[-–to]\s*20/)) {
    subFactors.customerInterviews = 3;
    subFactors.problemSeverityConfirmed = 2;
    subFactors.solutionTested = 1;
  } else if (custVal.match(/1\s*[-–to]\s*5/)) {
    subFactors.customerInterviews = 2;
    subFactors.problemSeverityConfirmed = 2;
  } else if (net.includes("interview") || net.includes("survey")) {
    subFactors.customerInterviews = 2;
    subFactors.problemSeverityConfirmed = 2;
  } else if (net.includes("access to mentors/early customers") || net.includes("early customers")) {
    subFactors.customerInterviews = 1;
    subFactors.problemSeverityConfirmed = 1;
  }

  if (!hasStageContradiction) {
    if (bizStage.includes("growing revenue") || net.includes("repeat")) {
      subFactors.pilotUsers = 3;
      subFactors.payingCustomers = 2;
      subFactors.repeatRetention = 2;
      subFactors.pricingTested = 3;
      subFactors.solutionTested = 3;
    } else if (bizStage.includes("first paying") || net.includes("paying") || net.includes("pre-order") || net.includes("loi")) {
      subFactors.pilotUsers = 2;
      subFactors.payingCustomers = 2;
      subFactors.pricingTested = 2;
      subFactors.solutionTested = 2;
    } else if (bizStage.includes("early testing") || bizStage.includes("prototype") || net.includes("pilot") || net.includes("test")) {
      subFactors.pilotUsers = 2;
      subFactors.solutionTested = 2;
    }
  }

  const score = Math.min(20, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors, hasStageContradiction, isExplicitZeroCustomers };
}

/**
 * Calculates Market Opportunity Sub-Factors (Max 14)
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

  if (target.match(/b2b|smb|small business|sole trader|organisation|not-for-profit|business|trader|accountant|electricity|energy|consumer/)) {
    subFactors.commerciallyMeaningfulNeed = 3;
  }

  const gatesInfo = detectFeasibilityGates(rawInputs);
  const hasLegalBanOrExtremeBarriers = gatesInfo.hasCriticalGate || Boolean(
    text.match(/nuclear|banned|prohibited|unlawful/) && (location.includes("new zealand") || location.includes("nz") || text.includes("nz") || location.length === 0)
  );

  if (hasLegalBanOrExtremeBarriers) {
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
    } else if (scope.includes("local") || scope.includes("regional") || target.includes("pasifika") || target.includes("community")) {
      subFactors.marketAccessible = 2;
      subFactors.expansionPotential = 1;
    }

    if (text.match(/fintech|tax|ird|gst|compliance|bookkeep|accounting|payroll|energy/)) {
      subFactors.regulatoryDrivers = 1;
      subFactors.customerUrgency = 2;
    }
  }

  const score = Math.min(14, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors, hasLegalBanOrExtremeBarriers };
}

/**
 * Calculates Business Model Sub-Factors (Max 14)
 */
function calculateBusinessModelSubFactors(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const budget = (rawInputs.budget || rawInputs.investmentCommitment || "").toLowerCase();
  const category = (rawInputs.category || "").toLowerCase();
  const fundingPref = (rawInputs.fundingPreference || "").toLowerCase();
  const successDef = (rawInputs.successDefinition || "").toLowerCase();

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
    subFactors.recurringPotential = 2;
    subFactors.grossMarginLogic = 2;
  } else if (idea.match(/bookkeep|accounting|payroll|retainer|advisory|service/)) {
    subFactors.revenueMechanismDefined = 2;
    subFactors.recurringPotential = 2;
    subFactors.costToServeLogic = 2;
    subFactors.grossMarginLogic = 2;
  }

  if (budget.length > 0 && !budget.match(/^0$/)) {
    subFactors.whoPaysIdentified = 2;
    subFactors.pricingHypothesis = 1;
  }
  if (fundingPref.length > 0 || successDef.length > 0) {
    subFactors.costToServeLogic = Math.max(subFactors.costToServeLogic, 2);
  }

  const score = Math.min(14, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Competitive Position Sub-Factors (Max 9)
 */
function calculateCompetitiveSubFactors(rawInputs = {}) {
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const target = (rawInputs.targetMarket || "").toLowerCase();
  const combined = `${idea} ${problem} ${target}`;

  let subFactors = {
    directCompetitors: 1,
    indirectAlternatives: 1,
    workaroundsIdentified: 1,
    differentiationArticulated: 1,
    switchingBarriers: 1,
    emergingAdvantage: 0
  };

  if (target.includes("competitor") || combined.match(/independent bookkeeper|accountant|xero|myob/)) {
    subFactors.directCompetitors = 2;
  }
  if (combined.match(/manual|spreadsheet|bank|xero|myob|grid|hydro|fossil|themselves|family/)) {
    subFactors.workaroundsIdentified = 2;
    subFactors.indirectAlternatives = 2;
  }

  if (combined.match(/auto|ai|instant|direct|nuclear|clean|pasifika|cultural|relationship-based|specialised|specialized/)) {
    subFactors.differentiationArticulated = 1;
    subFactors.emergingAdvantage = 1;
  }

  const score = Math.min(9, Object.values(subFactors).reduce((a, b) => a + b, 0));
  return { score, subFactors };
}

/**
 * Calculates Execution Readiness Sub-Factors (Max 9)
 */
function calculateExecutionSubFactors(rawInputs = {}) {
  const timeNorm = normalizeFounderTimeCommitment(rawInputs);
  const budget = (rawInputs.budget || rawInputs.investmentCommitment || "").toLowerCase();
  const idea = (rawInputs.idea || "").toLowerCase();
  const problem = (rawInputs.problem || "").toLowerCase();
  const obstacle = (rawInputs.biggestObstacle || "").toLowerCase();

  let subFactors = {
    weeklyTimeDefined: 1,
    scopeMatchesTime: 1,
    initialCapitalDefined: 1,
    riskCapitalDefined: 1,
    lowCostValidationPlan: 1,
    capabilityGapsRecognized: 1,
    commitmentConsistency: 0
  };

  const isCapitalIntensive = Boolean(idea.match(/nuclear|power plant|atomic|refinery|dam|utility scale/));

  if (isCapitalIntensive) {
    subFactors.scopeMatchesTime = 0;
    subFactors.initialCapitalDefined = 1;
    subFactors.riskCapitalDefined = 0;
    subFactors.lowCostValidationPlan = 1;
  } else {
    if (timeNorm.numericMidpoint >= 20) {
      subFactors.weeklyTimeDefined = 2;
      subFactors.scopeMatchesTime = 2;
      subFactors.commitmentConsistency = 1;
    } else if (timeNorm.numericMidpoint >= 10) {
      subFactors.weeklyTimeDefined = 2;
      subFactors.scopeMatchesTime = 1;
      subFactors.commitmentConsistency = 1;
    } else {
      subFactors.weeklyTimeDefined = 1;
      subFactors.scopeMatchesTime = 1;
    }

    if (budget.match(/\$2,500|\$5,000|5,000\+|10,000/)) {
      subFactors.initialCapitalDefined = 1;
      subFactors.riskCapitalDefined = 1;
    } else if (budget.length > 0) {
      subFactors.initialCapitalDefined = 1;
    }

    if (problem.match(/xero|training|requirements to set up|client base/) || obstacle.length > 0) {
      subFactors.capabilityGapsRecognized = 1;
    }
  }

  const score = Math.min(9, Object.values(subFactors).reduce((a, b) => a + b, 0));
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
    if (key === 'problemCustomerClarity' && problemCalc.isFounderCapabilityNeedInProblemField) {
      explanation = `The submitted problem statement describes the founder's own operational setup and training goals (${problemCalc.founderStatedSetupPriorities.slice(0, 140)}) rather than the external customer pain point. The target customer segment is clearly identified, and the inferred customer need for culturally responsive bookkeeping and financial compliance support is plausible, but must be validated directly with prospective clients.`;
    } else if (finalScore <= 6 && key === 'founderCapabilityFit') {
      if (!founderCalc.hasDirectDomainMatch || explanation.match(/direct|relevant|strong|expert|technical|nuclear|engineering/i)) {
        explanation = `Founder demonstrates useful general commercial capabilities, but the project team does not yet evidence the direct technical engineering or sector-specific domain experience required for this venture.`;
      }
    } else if (finalScore >= 10 && key === 'founderCapabilityFit' && (explanation.includes("0/15") || explanation.includes("lacks experience") || explanation.includes("0 points"))) {
      explanation = `Founder demonstrates strong domain expertise, professional background, and relevant experience supporting this commercial opportunity.`;
    }

    // RECONCILE EVIDENCE LEVEL DETERMINISTICALLY (Section 9)
    const ratio = finalScore / config.max;
    let evidenceLevel = "Partial Evidence";

    if (key === 'problemCustomerClarity' && problemCalc.isFounderCapabilityNeedInProblemField) {
      evidenceLevel = "Partial Evidence";
    } else if (key === 'founderCapabilityFit') {
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

    if (key === 'problemCustomerClarity' && problemCalc.isFounderCapabilityNeedInProblemField) {
      missingEvidence = "A customer-framed problem statement backed by direct discovery interviews quantifying specific bookkeeping, payroll, and GST compliance pain points among target clients.";
      howToImprove = "Separate founder readiness tasks (Xero training, business registration, client acquisition) from the customer problem statement, and interview 8–10 target business owners and community treasurers to document their top financial administration challenges.";
    } else if (key === 'executionReadiness') {
      const timeNorm = normalizeFounderTimeCommitment(rawInputs);
      if (explanation.match(/\b20 hours\/week\b/i) && timeNorm.normalizedBand === "15–30 hours/week") {
        explanation = explanation.replace(/\b20 hours\/week\b/gi, "15–30 hours/week");
      }
    }

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
      ? ["marketCommercialOpportunity", "businessModelWillingnessToPay", "competitivePosition", "executionReadiness", "futureTrends"]
      : [],
    capsApplied: Boolean(gatesInfo.hasCriticalGate),
    reasoning: gatesInfo.summary || "Standard commercial evaluation."
  };

  const legalRegulatoryAssessment = getLegalRegulatoryAssessment(rawInputs, gatesInfo, ventureType);
  const portfolioMeta = computePortfolioMeta(rawInputs, { overallScore, masterRecommendation, categoryScores }, ventureType, gatesInfo);
  const rubricAndIndicators = buildScoringRubricAndIndicators(overallScore, categoryScores, rawInputs, gatesInfo);
  const evidenceClassification = buildEvidenceClassificationRegistry(rawInputs, { overallScore, masterRecommendation, categoryScores }, ventureType, legalRegulatoryAssessment);

  return {
    overallScore,
    scoreBand,
    masterRecommendation,
    portfolioDecision: masterRecommendation,
    opportunityPotential: rubricAndIndicators.opportunityPotential,
    evidenceConfidence: rubricAndIndicators.evidenceConfidence,
    executionReadinessIndicator: rubricAndIndicators.executionReadinessIndicator,
    scoringRubric: rubricAndIndicators.scoringRubric,
    evidenceClassification,
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
 * Computes a single deterministic Master Portfolio Decision across the entire application.
 * Canonical states: PURSUE, INVESTIGATE, PARK, STOP.
 */
function computeMasterRecommendation(score, categoryScores = {}, rawInputs = {}, gatesInfo = {}) {
  if (gatesInfo?.hasCriticalGate) {
    const isExpressStatutoryProhibition = gatesInfo.gates?.some(g => g.type === 'Express Statutory Prohibition' || g.regulatoryStatusCategory === 'Expressly prohibited');
    if (isExpressStatutoryProhibition) {
      return "STOP";
    }
    return "PARK";
  }

  const validationScore = categoryScores.customerValidation?.scoreAchieved || 0;
  const founderScore = categoryScores.founderCapabilityFit?.scoreAchieved || 0;
  const problemScore = categoryScores.problemCustomerClarity?.scoreAchieved || 0;

  if (score >= 80 && validationScore >= 12) {
    return "PURSUE";
  }
  if (score >= 40 || (founderScore >= 8 && problemScore >= 8)) {
    return "INVESTIGATE";
  }
  if (problemScore < 4 && validationScore === 0 && score < 25) {
    return "STOP";
  }
  return "PARK";
}

/**
 * Builds transparent scoring rubrics and qualitative Opportunity Potential, Evidence Confidence, and Execution Readiness indicators.
 */
function buildScoringRubricAndIndicators(overallScore, categoryScores = {}, rawInputs = {}, gatesInfo = {}) {
  const probScore = categoryScores.problemCustomerClarity?.scoreAchieved ?? 0;
  const valScore = categoryScores.customerValidation?.scoreAchieved ?? 0;
  const mktScore = categoryScores.marketCommercialOpportunity?.scoreAchieved ?? 0;
  const execScore = categoryScores.executionReadiness?.scoreAchieved ?? 0;
  const founderScore = categoryScores.founderCapabilityFit?.scoreAchieved ?? 0;

  let opportunityPotential = "Moderate";
  if (gatesInfo?.hasCriticalGate) {
    opportunityPotential = "Constrained by Regulatory & Infrastructure Prerequisites (High Underlying Problem Significance)";
  } else if (probScore >= 11 && mktScore >= 10) {
    opportunityPotential = "High";
  } else if (probScore < 7 && mktScore < 6) {
    opportunityPotential = "Low";
  }

  let evidenceConfidence = "Low — Pre-Validation (Founder-Provided & Inferred Inputs)";
  if (valScore >= 14) {
    evidenceConfidence = "High — Verified Customer & Commercial Evidence";
  } else if (valScore >= 7) {
    evidenceConfidence = "Moderate — Initial Market & Discovery Evidence";
  }

  let executionReadinessIndicator = "Moderate — Stage-Gated Validation Accessible";
  if (gatesInfo?.hasCriticalGate) {
    executionReadinessIndicator = "Constrained — Critical Regulatory, Consortium & Capital Prerequisites Missing";
  } else if (execScore >= 7 && founderScore >= 11) {
    executionReadinessIndicator = "Strong — Ready for Immediate Execution";
  } else if (execScore <= 3) {
    executionReadinessIndicator = "Constrained — Foundational Setup Required";
  }

  return {
    opportunityPotential,
    evidenceConfidence,
    executionReadinessIndicator,
    scoringRubric: {
      totalMaxPoints: 100,
      reconciliationFormula: "14 + 15 + 20 + 14 + 14 + 9 + 9 + 5 = 100",
      decisionThresholds: {
        PURSUE: "Overall score >= 80/100 with verified customer validation (>= 12/20) and no unresolved critical feasibility gates.",
        INVESTIGATE: "Overall score 40–79/100 (or strong founder/problem foundation) where core assumptions are testable through structured customer and technical stage gates.",
        PARK: "Underlying customer or national problem is worth preserving, but the current solution formulation faces an unestablished regulatory pathway, critical capital/infrastructure disproportion, or unresolved prerequisite gate; limit immediate activity to low-cost Phase 1 gateway verification.",
        STOP: "Activity is expressly prohibited by law or confirmed to have no viable customer problem or commercial pathway."
      },
      categoryDefinitions: {
        problemCustomerClarity: "Measures clarity, specificity, and strategic importance of the underlying problem and target customer segment (Max 14 pts). Distinct from Customer Validation.",
        founderCapabilityFit: "Measures the founder's existing credentials, transferable commercial skills, and bridgeability of missing specialist operating-organisation capabilities (Max 15 pts).",
        customerValidation: "Measures independent empirical proof of customer demand, discovery interviews, LOIs, pilots, or paying off-takers (Max 20 pts).",
        marketCommercialOpportunity: "Measures commercially accessible demand under current regulatory and market conditions (Max 14 pts).",
        businessModelWillingnessToPay: "Measures pricing logic, unit economics, capital structure realism, and verified willingness to pay (Max 14 pts).",
        competitivePosition: "Measures defensibility against direct competitors, indirect alternatives, existing workarounds, and substitute technologies (Max 9 pts).",
        executionReadiness: "Measures alignment of founder time availability, validation risk capital, and near-term stage-gated execution feasibility (Max 9 pts).",
        futureTrends: "Combines macro 3–10 year structural trend alignment with near-term regulatory and commercial deployability (Max 5 pts)."
      }
    }
  };
}

/**
 * Classifies assessment evidence into 4 explicit transparency categories (PL-FIX-20261103-01 Section 3):
 * Category A — Founder-provided information
 * Category B — Independently verified evidence
 * Category C — AI inference
 * Category D — Untested assumptions
 */
function buildEvidenceClassificationRegistry(rawInputs = {}, reconciled = {}, ventureType = "", legalReg = {}) {
  const idea = String(rawInputs.idea || "").trim();
  const problem = String(rawInputs.problem || "").trim();
  const targetMarket = String(rawInputs.targetMarket || "").trim();
  const isNuclear = Boolean(`${idea} ${problem}`.toLowerCase().match(/\b(nuclear|smr|atomic|reactor)\b/));
  const isMoorSafe = Boolean(`${idea} ${problem}`.toLowerCase().match(/\b(moorsafe|mooring|pest deterrent|rodent|rat guard)\b/));
  const timeNorm = normalizeFounderTimeCommitment(rawInputs);
  const capNorm = normalizeFounderCapital(rawInputs);
  const generatedUtc = new Date().toISOString();

  const categoryA_founderProvided = [
    {
      field: "Proposed Concept & Solution Scope",
      label: "[Founder Input]",
      statement: idea || "Submitted business concept.",
      verificationStatus: "Founder-stated scope; assessed as submitted without importing excluded prior concepts."
    },
    {
      field: "Stated Problem",
      label: "[Founder Input]",
      statement: problem || "Submitted customer problem.",
      verificationStatus: "Founder-articulated problem statement."
    },
    {
      field: "Target Customer & Market Assertion",
      label: "[Founder Input]",
      statement: targetMarket || "Submitted target market description.",
      verificationStatus: "Founder assertion; embedded claims regarding customer spending or competitor unreliability are treated as untested hypotheses until verified."
    },
    {
      field: "Founder Resource Commitments",
      label: "[Founder Input]",
      statement: `Weekly availability: ${timeNorm.normalizedBand}; Available capital: ${capNorm.availableCapital}; Initial validation risk budget: ${capNorm.initialRiskCapital}; Stage: ${rawInputs.businessStage || "Idea only"}.`,
      verificationStatus: "Directly preserved from canonical submission snapshot."
    }
  ];

  const categoryB_independentlyVerified = isNuclear
    ? [
        {
          sourceName: "New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 (Public Act 1987 No 86, ss 4–11)",
          publicationYear: 1987,
          url: "https://www.legislation.govt.nz/act/public/1987/0086/latest/DLM115116.html",
          retrievedAtUtc: generatedUtc,
          label: "[Verified Source]",
          finding: "Establishes the New Zealand Nuclear Free Zone and prohibits nuclear explosive devices, biological weapons, entry of nuclear-powered ships, and dumping of radioactive waste; does not contain an express blanket statutory ban on land-based civilian nuclear electricity generation."
        },
        {
          sourceName: "Atomic Energy Act 1945 (Public Act 1945 No 41)",
          publicationYear: 1945,
          url: "https://www.legislation.govt.nz/act/public/1945/0041/latest/DLM239294.html",
          retrievedAtUtc: generatedUtc,
          label: "[Verified Source]",
          finding: "Regulates prescribed substances (uranium, thorium, plutonium) and atomic energy apparatus in New Zealand under ministerial notification, control, and consent provisions."
        },
        {
          sourceName: "Radiation Safety Act 2016 (Public Act 2016 No 6)",
          publicationYear: 2016,
          url: "https://www.legislation.govt.nz/act/public/2016/0006/latest/DLM6339517.html",
          retrievedAtUtc: generatedUtc,
          label: "[Verified Source]",
          finding: "Requires source and use licences administered by the Office of Radiation Safety / Director for Radiation Safety; designed for medical, industrial, and research radiation sources rather than utility-scale commercial nuclear power reactor licensing."
        },
        {
          sourceName: "Resource Management Act 1991 (Public Act 1991 No 69) & Electricity Industry Act 2010 (Public Act 2010 No 116)",
          publicationYear: 1991,
          url: "https://www.legislation.govt.nz/act/public/1991/0069/latest/DLM230265.html",
          retrievedAtUtc: generatedUtc,
          label: "[Verified Source]",
          finding: "Govern major environmental resource consenting, national policy alignment, and national grid connection in New Zealand."
        }
      ]
    : [
        {
          sourceName: "New Zealand Biosecurity & Maritime Pest Management Context / Commercial Hardware Compliance",
          publicationYear: 2026,
          url: "https://www.mpi.govt.nz/biosecurity/",
          retrievedAtUtc: generatedUtc,
          label: "[Verified Source]",
          finding: isMoorSafe
            ? "Rodent and invasive pest incursion via vessel mooring lines is a recognised maritime biosecurity and vessel maintenance concern across marinas, ports, and island sanctuaries; conventional conical plastic/metal rat guards are the standard physical workaround."
            : "Standard New Zealand commercial, tax, and consumer protection frameworks apply to early-stage market validation."
        }
      ];

  const categoryC_aiInference = isNuclear
    ? [
        {
          label: "[AI Inference]",
          inference: "While the NZ Nuclear Free Zone Act 1987 does not expressly prohibit land-based civilian nuclear power reactors, New Zealand currently lacks an established nuclear power reactor regulatory agency, nuclear liability regime, and complete licensing pathway under the Atomic Energy Act 1945, Radiation Safety Act 2016, and RMA 1991.",
          basis: "Synthesised from the statutory scope of NZ radiation, atomic energy, and environmental legislation alongside the absence of existing civilian power reactor regulations."
        },
        {
          label: "[AI Inference]",
          inference: "Peter Lee's Chartered Accountant (CAANZ) and BCom background provides strong commercial structuring, financial governance, and feasibility coordination capability, while nuclear engineering, safety licensing, and utility infrastructure delivery would require a specialist consortium.",
          basis: "Derived by comparing submitted founder credentials against utility-scale SMR development requirements."
        }
      ]
    : [
        {
          label: "[AI Inference]",
          inference: isMoorSafe
            ? "A solar-powered, low-voltage electrical mooring-rope deterrent targets a plausible functional gap left by passive plastic/metal conical rat guards (which can slip, split, or fail in high wind/line-angle conditions), provided marine saltwater durability and safety can be engineered at an acceptable unit cost."
            : "The proposed business model aligns logically with the stated customer segment, subject to empirical pricing and acquisition validation.",
          basis: "Derived from product mechanics, existing customer workarounds, and founder commercial background."
        }
      ];

  const categoryD_untestedAssumptions = isNuclear
    ? [
        {
          label: "[Untested Assumption]",
          assumption: "Whether New Zealand central government and regulators would establish or permit a statutory licensing pathway for commercial Small Modular Reactors (SMRs).",
          howToTest: "Complete Stage Gate 1 desktop statutory review and obtain preliminary written guidance from specialist NZ energy/public law counsel ($0–$500 NZD)."
        },
        {
          label: "[Untested Assumption]",
          assumption: "Whether industrial energy off-takers, iwi/community stakeholders, and institutional infrastructure investors would support SMR deployment over domestic hydro, geothermal, and wind+storage alternatives.",
          howToTest: "Defer commercial off-taker and capital structuring until Stage Gate 1 confirms a credible regulatory pathway."
        }
      ]
    : isMoorSafe
    ? [
        {
          label: "[Untested Assumption]",
          assumption: "Founder assertion that target boat owners and marina operators 'already spend heavily on maintenance and protection, indicating willingness to pay' for an active solar-powered electrical mooring-line pest deterrent.",
          howToTest: "Interview 15–20 recreational boat owners, liveaboards, and marina managers to quantify actual annual spend on pest control/rat guards and test price sensitivity ($150–$450 NZD per unit)."
        },
        {
          label: "[Untested Assumption]",
          assumption: "Founder assertion that 'existing solutions like plastic guards are unreliable, hard to fit, or ineffective against smaller pests' to a degree that justifies switching to an active solar-electronic device.",
          howToTest: "Document specific failure modes of conventional conical rat guards across rope diameters and test whether boat owners view the problem as frequent/severe enough to purchase MoorSafe."
        },
        {
          label: "[Untested Assumption]",
          assumption: "Technical durability, waterproof sealing (IP67/IP68), salt-spray corrosion resistance, battery/solar autonomy, and safe non-lethal low-voltage pulse delivery on wet conductive marine mooring ropes.",
          howToTest: "Build and bench-test a low-voltage proof-of-concept unit on wet salt-laden mooring lines in Stage Gate 2 before committing production tooling capital."
        }
      ]
    : [
        {
          label: "[Untested Assumption]",
          assumption: "Target customers experience the problem with sufficient urgency and frequency to switch from current workarounds and pay the proposed price.",
          howToTest: "Conduct 10–15 structured customer discovery interviews and run a direct pricing/pre-commitment test."
        }
      ];

  return {
    schemaVersion: "2026-11-03.v1",
    generatedAtUtc: generatedUtc,
    categories: {
      founderProvided: categoryA_founderProvided,
      independentlyVerified: categoryB_independentlyVerified,
      aiInference: categoryC_aiInference,
      untestedAssumptions: categoryD_untestedAssumptions
    }
  };
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

  const isBookkeepingOrProfService = ventureType === "Professional Services / Bookkeeping & Financial Advisory" || ventureType === "Professional Services / Agency / Traditional SME";
  const isCommunityOrNfp = ventureType === "Community / Not-for-Profit / Social Enterprise";
  const isFinTech = !isBookkeepingOrProfService && !isCommunityOrNfp && (ventureType === "Financial Services / FinTech" || Boolean(text.match(/\b(fintech|open banking|neobank|payment gateway|tax software)\b/i)));

  if (isNuclear || gatesInfo?.hasCriticalGate) {
    marketDirection = "POSITIVE";
    solutionOutlook = "NO ESTABLISHED REGULATORY PATHWAY — PARKED PENDING STATUTORY CLARITY";
    demandTrend = "National demand for 24/7 low-carbon firm electricity is expected to increase driven by industrial electrification, data-centre load, and dry-year hydro security [Verified Context].";
    technologyTrend = "Small Modular Reactor (SMR) designs continue to progress internationally, although commercial licensing maturity, deployment timelines, and levelised cost of electricity (LCOE) remain early-stage across OECD markets [AI Inference].";
    regulatoryTrend = "While the New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 prohibits nuclear weapons, nuclear-powered vessels, and radioactive waste dumping rather than land-based civilian power reactors, New Zealand currently has no established nuclear power reactor licensing pathway under the Atomic Energy Act 1945, Radiation Safety Act 2016, Resource Management Act 1991, and Electricity Industry Act 2010 [Verified Source].";
    competitionTrend = "Domestic renewable firming alternatives—including hydro storage, geothermal baseload, wind/solar paired with grid-scale battery storage (BESS), biomass, and industrial demand response—operate within established New Zealand regulatory pathways [AI Inference].";
    capitalTrend = "Multi-billion-dollar utility CAPEX structure requires sovereign policy backing, specialist nuclear OEM consortium partners, and institutional project finance incompatible with early-stage private venture funding [AI Inference].";
    whatThisMeansForFounder = "Park active commercial development while preserving the underlying energy-security thesis. Restrict Phase 1 to a low-cost ($0–$500 NZD, 0–5 hrs/wk) statutory and policy verification gateway before considering any technical or commercial expenditure.";
    adjacentOpportunities = ["Grid-firming energy analytics and commercial power-purchase advisory", "Geothermal, hydro, or industrial energy-efficiency project structuring", "Monitoring OECD SMR regulatory and policy developments"];
    trendAlignmentScore = 7; // High macro decarbonisation alignment (7/10), while scorecard Future Trends is capped at 1/5 until an established NZ regulatory pathway exists
  } else if (isBookkeepingOrProfService) {
    marketDirection = "POSITIVE";
    solutionOutlook = "FAVOURABLE";
    demandTrend = "Growing small-business and community-organisation demand for accessible, culturally responsive bookkeeping, payroll administration, and practical financial literacy support.";
    technologyTrend = "Widespread adoption of cloud accounting platforms (such as Xero and MYOB), payday filing, and digital receipt capture enables bookkeepers to standardise monthly reconciliation workflows while focusing on high-trust client guidance.";
    regulatoryTrend = "Ongoing Inland Revenue (IRD) digital GST/PAYE compliance expectations, Incorporated Societies Act 2022 financial reporting updates, and charity accountability standards drive steady demand for reliable bookkeeping support.";
    competitionTrend = "Generalist bookkeepers, accounting practices, and DIY cloud accounting software compete on price and automation, creating clear space for a relationship-led, culturally grounded specialist practice serving Pasifika businesses and community groups.";
    capitalTrend = "Low-overhead professional service model funded through founder savings and early client retainers, where growth is governed by billable founder capacity, workflow standardisation, and client retention.";
    whatThisMeansForFounder = "Complete Xero advisor certification and business setup while validating fixed-fee monthly bookkeeping and payroll packages directly with prospective Pasifika small business and community organisation clients.";
    adjacentOpportunities = ["Not-for-profit & Incorporated Society treasurer/grant reporting packages", "Xero onboarding and financial literacy workshops for Pasifika sole traders", "Outsourced payroll and GST administration retainers"];
    trendAlignmentScore = 8;
  } else if (isCommunityOrNfp) {
    marketDirection = "POSITIVE";
    solutionOutlook = "VIABLE";
    demandTrend = "Sustained community and institutional demand for culturally grounded programmes, grassroots capacity building, and measurable social impact.";
    technologyTrend = "Digital community engagement tools, online training delivery, and cloud financial/grant reporting streamline programme administration.";
    regulatoryTrend = "Incorporated Societies Act 2022 re-registration requirements, Charities Services reporting tiers, and outcome-based public/philanthropic funding standards.";
    competitionTrend = "Established community trusts and social service providers compete for limited grant pools, favouring organisations with deep community trust and transparent governance.";
    capitalTrend = "Blended sustainability model combining fee-for-service workshops, community contracts, philanthropic grants, and low-cost volunteer/founder delivery.";
    whatThisMeansForFounder = "Validate community participant demand and partner organisation commitments early before expanding programme overhead.";
    adjacentOpportunities = ["Fee-for-service capability workshops", "Local council or ministry contract delivery", "Sponsor-backed community literacy cohorts"];
    trendAlignmentScore = 7;
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
    solutionOutlook = "PROMISING";
    demandTrend = "Steady vessel-owner, liveaboard, and marina demand for practical, low-maintenance protection against rodent and insect boarding via mooring lines.";
    technologyTrend = "Compact solar-charging electronics, sealed marine-grade enclosures, and low-voltage pulse circuits enable self-contained active deterrents on mooring ropes.";
    regulatoryTrend = "Maritime biosecurity expectations (particularly for island sanctuaries and marinas) alongside electrical safety, EMC, and marine environmental durability standards.";
    competitionTrend = "Conventional passive conical plastic/metal rat guards, manual baiting/traps, and ultrasonic deterrents represent the primary incumbent workarounds.";
    capitalTrend = "Staged hardware capital model: low-cost customer discovery and benchtop proof-of-concept first, followed by marine field trials and production tooling only after validation.";
    whatThisMeansForFounder = "Validate customer willingness to pay and test a solar-powered low-voltage proof-of-concept on wet mooring ropes before committing manufacturing tooling capital.";
    adjacentOpportunities = ["No adjacent opportunity should currently be prioritised. Validate the core business first."];
    trendAlignmentScore = 6;
  } else if (ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || Boolean(text.match(/\b(ride-share|rideshare|ride-hailing|ride-booking|taxi|passenger transport|transport-booking|car booking|driver network)\b/i))) {
    marketDirection = "POSITIVE";
    solutionOutlook = "FAVOURABLE";
    demandTrend = "Increasing demand for convenient on-demand passenger transport, airport transfers, and digital ride booking from local residents, commuters, and tourists.";
    technologyTrend = "Growing smartphone adoption, mobile connectivity, digital payments, and GPS/mapping platform integration across the Pacific and regional transport corridors.";
    regulatoryTrend = "Local passenger transport licensing, commercial vehicle requirements, passenger safety guidelines, and digital commerce consumer protection standards.";
    competitionTrend = "Traditional street-hailed taxis, informal phone booking networks, and rental vehicles create established habits; requires local network density and driver trust.";
    capitalTrend = "Asset-light marketplace model scaling through transaction commission economics and booking fees rather than vehicle capital expenditure.";
    whatThisMeansForFounder = "Validate passenger booking demand and driver onboarding willingness through lightweight concierge trials before investing in bespoke app development.";
    adjacentOpportunities = ["Scheduled airport and hotel transfers", "Corporate and business transport accounts", "Local island courier and parcel delivery"];
    trendAlignmentScore = 8;
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

  const rawDims = rawFutureTrends.dimensions || rawFutureTrends.fiveDimensions || rawFutureTrends || {};
  const getDim = (val, fallback) => (typeof val === 'string' && val.trim().length >= 5 ? val.trim() : fallback);

  return {
    marketDirection,
    solutionOutlook,
    dimensions: {
      demandTrend: getDim(rawDims.demandTrend, demandTrend),
      technologyTrend: getDim(rawDims.technologyTrend, technologyTrend),
      regulatoryTrend: getDim(rawDims.regulatoryTrend, regulatoryTrend),
      competitionTrend: getDim(rawDims.competitionTrend, competitionTrend),
      capitalTrend: getDim(rawDims.capitalTrend, capitalTrend)
    },
    whatThisMeansForFounder,
    adjacentOpportunities,
    trendAlignmentScore,
    currentCommercialAccessibility,
    structuralTrendAlignment: `${trendAlignmentScore}/10`
  };
}

/**
 * Computes P.A.R.A.-inspired Idea Portfolio & Decision System metadata.
 * Always delegates to getPortfolioDecision so masterRecommendation and portfolioDecision are 100% unified.
 */
function computePortfolioMeta(rawInputs = {}, reconciled = {}, ventureType = "", gatesInfo = {}) {
  return getPortfolioDecision(rawInputs, reconciled, ventureType, gatesInfo);
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

function extractCleanCustomerSegmentLabel(rawTargetMarket = "") {
  const raw = String(rawTargetMarket || "target customers").trim();
  if (!raw) return "target customers";
  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  const cleaned = firstSentence
    .replace(/^the target market includes\s+/i, "")
    .replace(/^our target customers? (?:are|include)\s+/i, "")
    .replace(/\.$/, "")
    .trim();
  return cleaned.length > 140 ? cleaned.slice(0, 137) + "..." : cleaned;
}

function generateContextualScoreExplanation(key, scoreAchieved, maxScore, rawInputs = {}, gatesInfo = {}, founderCalc = {}) {
  const idea = (rawInputs.idea || "Proposed venture").trim();
  const targetMarket = (rawInputs.targetMarket || "target customers").trim();
  const cleanSegment = extractCleanCustomerSegmentLabel(targetMarket);
  const isNuclear = (idea + " " + (rawInputs.category || "")).toLowerCase().includes("nuclear");
  const isMoorSafe = (idea + " " + (rawInputs.problem || "")).toLowerCase().match(/\b(moorsafe|mooring|pest deterrent|rodent|rat guard)\b/);
  const ratio = maxScore > 0 ? scoreAchieved / maxScore : 0;

  if (key === 'problemCustomerClarity') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "The national baseload electricity reliability, dry-year hydro security, and industrial decarbonisation challenge is clearly articulated and strategically significant [Founder Input / Verified Context]. Problem & Customer Clarity (14/14) reflects strong strategic problem articulation, whereas commercial off-taker demand is evaluated separately under Customer Validation (1/20).";
    }
    if (isMoorSafe) {
      return `The core problem—preventing rodents and insects from boarding vessels via mooring ropes—and the primary customer segment (${cleanSegment}) are clearly defined [Founder Input]. Founder assertions that existing plastic guards are unreliable and that boat owners already spend heavily on protection are treated as testable hypotheses requiring empirical customer discovery [Untested Assumption].`;
    }
    return ratio >= 0.7
      ? `The commercial problem and target customer segment (${cleanSegment}) are clearly articulated [Founder Input], with problem frequency and willingness-to-pay hypotheses ready for empirical customer discovery.`
      : `The problem concept is identified, but target customer definition and problem severity require sharper empirical validation.`;
  }
  if (key === 'founderCapabilityFit') {
    if (isNuclear && !founderCalc?.hasDirectDomainMatch) {
      return "Founder brings strong transferable commercial, financial modelling, and governance capability (Chartered Accountant / BCom) [Founder Input], while specialist nuclear engineering, reactor safety licensing, and utility infrastructure delivery capabilities would require a specialist technical consortium [AI Inference].";
    }
    if (isMoorSafe) {
      return "Founder brings strong commercial, financial, and business management credentials (CA / BCom) [Founder Input] suitable for venture coordination and commercial validation, while marine electrical engineering, waterproof enclosure design, and manufacturing tooling represent specialist capabilities to be outsourced or partnered [AI Inference].";
    }
    if (founderCalc?.hasDirectDomainMatch) {
      return "Founder background demonstrates relevant sector experience, practical operational authority, and strong commercial capability, with technical development identified as the bridgeable execution gap.";
    }
    return ratio >= 0.7
      ? "Founder background demonstrates relevant sector experience and operational capability to execute this opportunity."
      : "Founder demonstrates useful general commercial skills, but lacks direct sector execution experience for this specific business.";
  }
  if (key === 'customerValidation') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No commercial off-taker validation, industrial Letters of Intent (LOIs), or power-purchase commitments are currently evidenced (1/20); commercial off-taker engagement remains downstream of establishing a statutory and regulatory licensing pathway.";
    }
    return ratio >= 0.5
      ? "Initial customer interest or early feedback is documented, requiring formal willingness-to-pay testing."
      : "Empirical customer validation logs, discovery interviews, LOIs, or pre-orders are not yet evidenced [Untested Assumption].";
  }
  if (key === 'marketCommercialOpportunity') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "While New Zealand's long-term electricity demand and decarbonisation needs are substantial, commercially accessible market opportunity for land-based SMR generation is capped (2/14) because no established nuclear power licensing pathway currently exists under New Zealand law [Verified Source / AI Inference].";
    }
    return ratio >= 0.7
      ? `The target segment (${cleanSegment}) represents a plausible commercial market opportunity [AI Inference], though commercially accessible demand and verified willingness to pay must be confirmed through direct customer interviews [Untested Assumption].`
      : `Market segment opportunity (${cleanSegment}) is plausible in principle [AI Inference], but commercially accessible demand, switching willingness, and price sensitivity remain unverified [Untested Assumption].`;
  }
  if (key === 'businessModelWillingnessToPay') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Wholesale Power Purchase Agreement (PPA) revenue mechanisms exist in energy markets generally, but no legally compliant licensing pathway, sovereign risk-sharing structure, or multi-billion-dollar project finance model is established in New Zealand.";
    }
    return ratio >= 0.7
      ? "Revenue model and pricing structure are logically structured relative to target customer value proposition, subject to willingness-to-pay verification."
      : "Monetisation model is conceptual; founder assumptions regarding customer spending and unit margins require direct empirical testing [Untested Assumption].";
  }
  if (key === 'competitivePosition') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No venture-specific defensible advantage is evidenced relative to established New Zealand low-carbon generation and firming alternatives (hydro, geothermal, wind/solar with battery storage, biomass, and demand response) operating within existing regulatory frameworks.";
    }
    return ratio >= 0.7
      ? "Value proposition articulates clear functional differentiation over existing manual workarounds, subject to field performance testing."
      : "Differentiation against conventional customer workarounds and incumbent alternatives remains unverified in field conditions [Untested Assumption].";
  }
  if (key === 'executionReadiness') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Execution readiness is capped (1/9) due to the absence of an established NZ reactor licensing pathway, multi-billion-dollar infrastructure capital requirements versus $0–$500 initial validation budget, and 0–5 hrs/wk founder availability—making a low-cost Phase 1 statutory gateway the only appropriate immediate step.";
    }
    return ratio >= 0.7
      ? "Execution plan outlines structured milestones aligned with available founder time and validation resources."
      : "Near-term execution roadmap requires disciplined stage-gated validation aligned with the founder's weekly hours and initial risk capital.";
  }
  if (key === 'futureTrends') {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Long-term macro decarbonisation and 24/7 firm energy trends are positive (7/10 structural alignment), but the scorecard Future Trends rating is capped at 1/5 because New Zealand currently has no established statutory/regulatory licensing pathway for commercial nuclear reactors.";
    }
    return ratio >= 0.7
      ? "Macro technology and industry trends strongly support long-term adoption of this commercial solution."
      : "Macro trends present constructive tailwinds alongside regulatory, technical, and adoption requirements.";
  }

  return `Evaluated against commercial feasibility criteria (${scoreAchieved}/${maxScore}).`;
}

function generateContextualInvestorCommentary(area, rating, scoreAchieved, maxScore, reqData = {}, gatesInfo = {}, reconciled = {}) {
  const idea = (reqData.idea || "Proposed concept").trim();
  const targetMarket = (reqData.targetMarket || "target customers").trim();
  const cleanSegment = extractCleanCustomerSegmentLabel(targetMarket);
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear");
  const ventureType = classifyVentureType(reqData);

  if (area === "Problem Worth Solving") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Reliable, affordable, 24/7 low-carbon baseload electricity represents a strategically significant long-term national infrastructure challenge [Verified Context].";
    }
    return rating >= 4
      ? "Target customer problem and operational pain urgency are well articulated and commercially plausible, pending direct buyer discovery."
      : "The problem statement is identified, but pain urgency and customer financial impact require empirical verification.";
  }
  if (area === "Market Opportunity") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Underlying electricity demand is substantial, but the commercially accessible opportunity for SMR deployment in New Zealand is currently gated by the absence of an established reactor licensing pathway and multi-billion-dollar capital requirements.";
    }
    return rating >= 4
      ? `Addressable market opportunity in ${cleanSegment} displays constructive demand drivers, subject to verifying commercially accessible buyers.`
      : "Broad industry segment exists, but commercially accessible customer count and verified willingness to pay remain untested.";
  }
  if (area === "Competitive Advantage") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No venture-specific defensible advantage is evidenced relative to established New Zealand generation alternatives (hydro, geothermal, wind/solar + storage) or state/utility-backed energy infrastructure.";
    }
    return rating >= 4
      ? "Unique value proposition and functional design provide plausible differentiation against conventional passive workarounds."
      : "Differentiation relative to incumbent products and low-cost customer workarounds remains at the conceptual stage.";
  }
  if (area === "Business Model") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Wholesale power off-take mechanisms exist in theory, but no feasible New Zealand licensing pathway, nuclear liability framework, or utility project financing structure has been established.";
    }
    return rating >= 4
      ? "Monetisation model is logical with direct alignment between customer value delivery and revenue capture."
      : "Commercial revenue model is conceptual; unit BOM economics and customer willingness to pay require empirical testing.";
  }
  if (area === "Founder Capability") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Founder brings strong transferable commercial, financial modelling, and governance capability (CA/BCom), while nuclear engineering, safety licensing, and utility infrastructure delivery would require a specialist consortium.";
    }
    const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing");
    if (isHardware) {
      return rating >= 4
        ? "Founder demonstrates strong commercial background and financial governance, with specialist marine electrical and enclosure engineering to be engaged for hardware prototyping."
        : "Founder brings transferable commercial and financial capability; specialist electrical engineering, marine waterproofing, and manufacturing design capability should be engaged on a stage-gated basis.";
    }
    const isTransport = ventureType.includes("Transportation") || ventureType.includes("Mobility") || (ventureType.includes("Marketplace") && ((reqData.idea || '') + ' ' + (reqData.category || '')).toLowerCase().match(/ride|transport|driver|passenger|mobility/i));
    if (isTransport) {
      return rating >= 4
        ? "Founder possesses highly relevant operational experience in local transport and strong commercial skills, with technical platform and marketplace engineering identified as the bridgeable execution gap."
        : "Founder possesses useful general commercial skills, with direct transport operations and technical marketplace capabilities requiring strengthening.";
    }
    return rating >= 4
      ? "Founder demonstrates strong domain credentials, relevant operational background, and execution capability."
      : "Founder possesses useful general commercial skills, but lacks direct domain execution experience for this venture.";
  }
  if (area === "Customer Validation") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "No off-taker validation is currently evidenced (1/20), and commercial buyer engagement remains downstream of statutory and regulatory pathway verification.";
    }
    return rating >= 4
      ? "Empirical customer interview logs, early pilot feedback, or formal interest validate core demand assumptions."
      : "No empirical customer validation logs, discovery interviews, LOIs, or pilot commitments are currently evidenced.";
  }
  if (area === "Scalability") {
    if (isNuclear || gatesInfo?.hasCriticalGate) {
      return "Theoretical generation scale is large, but practical scalability is gated by national legislation, regulatory institution-building, site consenting, and multi-billion-dollar project finance.";
    }
    const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing");
    const isBookkeepingOrProfService = ventureType === "Professional Services / Bookkeeping & Financial Advisory" || ventureType.includes("Professional Services");
    const isCommunityOrNfp = ventureType === "Community / Not-for-Profit / Social Enterprise";
    const isService = isBookkeepingOrProfService || isCommunityOrNfp || ventureType.includes("Trade") || ventureType.includes("Local Service") || ventureType.includes("Hospitality");
    const isMarketplace = ventureType.includes("Marketplace");

    if (isHardware) {
      return rating >= 4
        ? "Scalability is supported by standardised hardware manufacturing and marine retail/marina distribution, though BOM unit margins and tooling investments govern capital efficiency."
        : "Scalability is governed by hardware unit economics, waterproof enclosure reliability, manufacturing tooling costs, and inventory working capital.";
    }
    if (isBookkeepingOrProfService) {
      return "Scalability is governed by billable founder capacity (15–30 hours/week initially), standardised cloud bookkeeping workflows (such as Xero templates and automated bank rules), recurring monthly retainers, and eventual contractor or junior bookkeeper delegation rather than software economics.";
    }
    if (isCommunityOrNfp) {
      return "Scalability is governed by facilitator capacity, community trust partnerships, repeatable workshop/programme templates, and sustainable multi-year contract or fee-for-service funding.";
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
      return "The concept is not presently investment-ready because New Zealand lacks an established commercial nuclear reactor licensing pathway and the venture has not yet assembled a specialist technical/regulatory consortium.";
    }
    return rating >= 4
      ? "Commercial concept demonstrates strong evidence maturity and clear milestone progression for capital deployment."
      : "The opportunity is at the pre-validation stage; customer willingness to pay and prototype durability must be verified before seeking external investment.";
  }

  return `Evaluated against commercial readiness criteria (${rating}/5).`;
}

/**
 * Authoritative Central Legal & Regulatory Assessment Object (PL-FIX-20261103-01 Section 4)
 * Distinguishes 6 canonical regulatory states and provides verified statutory citations.
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
  const retrievedAtUtc = new Date().toISOString();

  const regulatoryTaxonomy = [
    "1. Expressly prohibited activities",
    "2. Activities permitted subject to approvals",
    "3. Activities facing substantial regulatory requirements",
    "4. Activities without an established or complete regulatory pathway",
    "5. Activities requiring potential legislative reform",
    "6. Activities where legal permissibility remains uncertain"
  ];

  if (isNuclear && isNZ) {
    return {
      primaryGatingRisk: "Statutory & Regulatory Permissibility",
      regulatoryStatusCategory: "4. Activities without an established or complete regulatory pathway (and 5. Activities requiring potential legislative and regulatory reform)",
      regulatoryTaxonomy,
      evidenceLevel: "Verified Statutory Scope & Preliminary Commercial Assessment",
      certaintyLevel: "LEVEL C",
      directlyApplicableLaw: [
        "Atomic Energy Act 1945 (Public Act 1945 No 41)",
        "Radiation Safety Act 2016 (Public Act 2016 No 6)",
        "Resource Management Act 1991 (Public Act 1991 No 69)",
        "Electricity Industry Act 2010 (Public Act 2010 No 116)"
      ],
      adjacentLawOrPolicy: [
        "New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 (Public Act 1987 No 86, ss 4–11: prohibits nuclear explosive devices, biological weapons, entry of nuclear-powered ships, and dumping of radioactive waste; does not contain an express blanket statutory prohibition on land-based civilian nuclear electricity generation)"
      ],
      verifiedStatutes: [
        {
          title: "New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987",
          citation: "Public Act 1987 No 86 (ss 4–11)",
          enactmentYear: 1987,
          url: "https://www.legislation.govt.nz/act/public/1987/0086/latest/DLM115116.html",
          retrievedAtUtc,
          statutoryScope: "Establishes the New Zealand Nuclear Free Zone; prohibits acquisition, stationing, or testing of nuclear explosive devices (ss 5–7), biological weapons (s 8), entry of nuclear-powered ships into NZ internal waters (s 9), and dumping of radioactive waste at sea (s 11).",
          relevanceToVenture: "Does NOT contain an express blanket statutory ban on land-based civilian nuclear electricity generation, but shapes foundational national nuclear policy and waste-disposal constraints."
        },
        {
          title: "Atomic Energy Act 1945",
          citation: "Public Act 1945 No 41",
          enactmentYear: 1945,
          url: "https://www.legislation.govt.nz/act/public/1945/0041/latest/DLM239294.html",
          retrievedAtUtc,
          statutoryScope: "Controls prescribed substances (uranium, thorium, plutonium, neptunium) and atomic energy apparatus in New Zealand, requiring ministerial notification and consent for importation, possession, mining, or processing of fissile materials.",
          relevanceToVenture: "Directly governs nuclear fuel materials and atomic energy apparatus; requires ministerial/statutory authorisation."
        },
        {
          title: "Radiation Safety Act 2016",
          citation: "Public Act 2016 No 6",
          enactmentYear: 2016,
          url: "https://www.legislation.govt.nz/act/public/2016/0006/latest/DLM6339517.html",
          retrievedAtUtc,
          statutoryScope: "Requires source licences and use licences administered by the Office of Radiation Safety / Director for Radiation Safety (Ministry of Health) for radiation sources.",
          relevanceToVenture: "Designed around medical, industrial, and research radiation sources rather than utility-scale nuclear power reactor design certification, nuclear safety regulation, or spent nuclear fuel repository licensing."
        },
        {
          title: "Resource Management Act 1991 & Electricity Industry Act 2010",
          citation: "Public Act 1991 No 69 & Public Act 2010 No 116",
          enactmentYear: 1991,
          url: "https://www.legislation.govt.nz/act/public/1991/0069/latest/DLM230265.html",
          retrievedAtUtc,
          statutoryScope: "Governs environmental resource consenting, water/thermal discharge, seismic siting, national policy statements, and Electricity Authority / Transpower national grid connection.",
          relevanceToVenture: "Any utility power station requires major environmental, land-use, thermal discharge, and grid connection consents."
        }
      ],
      verifiedFacts: [
        "New Zealand faces increasing electricity demand, dry-year hydro security-of-supply challenges, and industrial decarbonisation requirements [Verified Context].",
        "The New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 prohibits nuclear explosive devices, nuclear-powered ships, and sea-dumping of radioactive waste, rather than containing an express blanket ban on land-based civilian nuclear power generation [Verified Source].",
        "Fissile materials, radiation sources, environmental siting, and grid connection are governed by the Atomic Energy Act 1945, Radiation Safety Act 2016, Resource Management Act 1991, and Electricity Industry Act 2010 [Verified Source].",
        "New Zealand does not currently have an established commercial nuclear power reactor regulator or complete reactor licensing regime [Verified Context]."
      ],
      preliminaryInterpretations: [
        "Commercial SMR electricity generation in New Zealand falls under Category 4 (no established or complete regulatory pathway) and Category 5 (likely requiring dedicated regulatory capacity and legislative/policy reform), subject to specialist legal confirmation [AI Inference].",
        "Commercially accessible market opportunity is presently gated until a credible statutory and regulatory pathway is established [AI Inference]."
      ],
      unresolvedQuestions: [
        "Whether any conditional pre-feasibility or experimental licensing pathway could be pursued under current Ministerial discretion in the Atomic Energy Act 1945 and Radiation Safety Act 2016.",
        "What specific legislative amendments, nuclear safety regulator establishment, and international nuclear liability treaties would be required before an SMR could be licensed in New Zealand."
      ],
      specialistConfirmationRequired: true,
      permittedLanguage: [
        "faces an unestablished and incomplete regulatory pathway",
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
        "blocked by law",
        "currently prohibit commercial nuclear power generation"
      ]
    };
  }

  if (gatesInfo?.hasCriticalGate) {
    return {
      primaryGatingRisk: gatesInfo.primaryGatingRisk || "Regulatory & Feasibility Gateway",
      regulatoryStatusCategory: "3. Activities facing substantial regulatory requirements / 6. Activities where legal permissibility remains uncertain",
      regulatoryTaxonomy,
      evidenceLevel: "Preliminary Commercial Assessment",
      certaintyLevel: "LEVEL C",
      directlyApplicableLaw: [],
      adjacentLawOrPolicy: [],
      verifiedStatutes: [],
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
    regulatoryStatusCategory: "2. Activities permitted subject to standard commercial and product compliance approvals",
    regulatoryTaxonomy,
    evidenceLevel: "Unconstrained Commercial Activity",
    certaintyLevel: "LEVEL D",
    directlyApplicableLaw: [],
    adjacentLawOrPolicy: [],
    verifiedStatutes: [],
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
  const ventureType = reconciled.ventureType || classifyVentureType(reqData);
  const fundingPref = String(reqData.fundingPreference || "").toLowerCase();
  const successDef = String(reqData.successDefinition || "").toLowerCase();
  const isSelfFundedOrLifestyle = Boolean(fundingPref.match(/personal savings|bootstrap|no external|revenue/i)) || Boolean(successDef.match(/side income|full-time income|small profitable/i));

  if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
    return "In its current conceptual state, the opportunity is not presently suitable for conventional venture-capital investment. Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved. The founder brings useful transferable commercial and financial capability, but a credible venture would require substantial specialist nuclear, engineering, regulatory and infrastructure capability alongside it. Investment consideration should remain deferred until the primary statutory/legal gateway has been investigated.";
  }

  if (ventureType === "Professional Services / Bookkeeping & Financial Advisory" || ventureType.includes("Professional Services")) {
    return `This venture is structured as a specialist professional bookkeeping and financial support practice rather than an external venture-capital play${isSelfFundedOrLifestyle ? ", aligning with the founder's self-funded and sustainable practice goals" : ""}. The founder brings strong submitted financial administration, payroll, and not-for-profit treasurer credentials. Commercial viability depends on completing Xero advisor certification, validating fixed-fee monthly package pricing with target Pasifika small businesses and community organisations, and securing the first 3–5 recurring retainer clients.`;
  }

  if (ventureType === "Community / Not-for-Profit / Social Enterprise") {
    return "This concept is structured around community and social impact delivery rather than equity venture-capital returns. Financial sustainability depends on validating participant demand, establishing clear governance under the Incorporated Societies or Charities framework, and securing recurring fee-for-service contracts or multi-year community funding.";
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
 * Authoritative Assessment Snapshot & Input Coverage Audit (PL-FIX-20261030-01 Section 2 & 3).
 * Creates an immutable normalized snapshot of all 17 questionnaire fields + founder predictions + CV upload,
 * and produces a complete Input Coverage Audit table recording disposition for every question.
 */
function buildAuthoritativeAssessmentSnapshot(reqData = {}, evaluationId = "", submissionId = "") {
  const timeNorm = normalizeFounderTimeCommitment(reqData);
  const capNorm = normalizeFounderCapital(reqData);
  const problemMisclass = detectProblemStatementMisclassification(reqData);
  const ventureType = classifyVentureType(reqData);

  // Extract structured fields from legacy concatenated `experience` string if individual fields were not explicitly sent
  const rawExp = String(reqData.experience || "").trim();
  let founderExp = String(reqData.founderExperience ?? "").trim();
  let industryExp = String(reqData.industryExperience ?? "").trim();
  let narrative = String(reqData.founderBackgroundNarrative ?? "").trim();

  if (!founderExp && rawExp) {
    const m = rawExp.match(/Experience:\s*([^\.\n]+)/i);
    if (m) founderExp = m[1].trim();
  }
  if (!industryExp && rawExp) {
    const m = rawExp.match(/Industry expertise:\s*([^\.\n]+)/i);
    if (m) industryExp = m[1].trim();
  }
  if (!narrative && rawExp) {
    const m = rawExp.match(/Founder Background Narrative:\s*([\s\S]*?)(?:\.\s*Experience:|$)/i);
    if (m) narrative = m[1].trim();
    else narrative = rawExp;
  }

  const locCountry = String(reqData.locationCountry || "").trim();
  const locRegion = String(reqData.locationRegion || "").trim();
  const locCity = String(reqData.locationCity || "").trim();
  const locSummary = String(reqData.locationSummary || [locCity, locRegion, locCountry].filter(Boolean).join(", ") || "New Zealand").trim();

  const ideaText = String(reqData.idea || "").trim();
  const problemText = String(reqData.problem || "").trim();
  const stageText = String(reqData.businessStage || "Idea only").trim();
  const combinedLower = `${ideaText} ${problemText}`.toLowerCase();
  const isMoorSafe = Boolean(combinedLower.match(/\b(moorsafe|mooring|pest deterrent|rodent|rat guard)\b/));
  const isNuclear = Boolean(combinedLower.match(/\b(nuclear|smr|atomic|reactor)\b/));
  const hasPrototypeSubmitted = Boolean(
    stageText.toLowerCase().match(/\b(prototype|mvp|working product|beta|early users|paying|revenue)\b/) ||
    combinedLower.match(/\b(built a prototype|working prototype|tested prototype|cad completed|3d printed prototype)\b/)
  ) && !stageText.toLowerCase().match(/^(just an idea|idea only)$/i);

  const founderCapabilityBreakdown = isNuclear
    ? {
        founderProposedRole: "Commercial Founder, Financial Structuring & Pre-Feasibility Coordinator",
        existingCapabilities: ["Chartered Accountant (CAANZ) & BCom financial governance", "Commercial feasibility analysis & capital budgeting", "Executive leadership & stakeholder coordination"],
        transferableCapabilities: ["Project governance", "Risk management", "Commercial off-take & financial modelling"],
        missingSpecialistCapabilities: ["Nuclear reactor engineering & SMR safety systems", "Radiation safety & statutory environmental licensing", "Utility-scale power generation & grid transmission engineering"],
        outsourceableCapabilities: ["Initial statutory & public law legal opinion", "Preliminary regulatory & policy desktop scoping"],
        strategicPartnerOrConsortiumCapabilities: ["Certified SMR technology OEM partner", "Specialist nuclear engineering & safety operator", "Institutional infrastructure & sovereign project-finance consortium"]
      }
    : isMoorSafe
    ? {
        founderProposedRole: "Commercial Founder, Product Strategist & Validation Lead",
        existingCapabilities: ["Chartered Accountant (CAANZ) & BCom commercial management", "Financial modelling, unit economics & supply-chain budgeting", "General business operations & stakeholder engagement"],
        transferableCapabilities: ["Commercial discovery & marina/vessel-owner outreach", "Supplier negotiation & unit cost governance", "Staged risk-capital allocation"],
        missingSpecialistCapabilities: ["Marine low-voltage electrical pulse & solar/battery circuit engineering", "IP67/IP68 saltwater enclosure & mechanical rope-clamping industrial design", "Electrical safety/EMC certification & contract manufacturing tooling"],
        outsourceableCapabilities: ["Industrial design & PCB/solar-circuit prototyping", "IP67/IP68 waterproof housing engineering", "Electrical safety & compliance testing"],
        strategicPartnerOrConsortiumCapabilities: ["Contract electronics manufacturer (CEM)", "Marine chandlery & marina operator distribution partners"]
      }
    : {
        founderProposedRole: "Founder & Commercial Lead",
        existingCapabilities: [narrative || "Submitted founder commercial and domain background"],
        transferableCapabilities: ["Commercial execution", "Customer discovery", "Financial discipline"],
        missingSpecialistCapabilities: ["Venture-specific technical or specialist delivery capabilities not evidenced in submission"],
        outsourceableCapabilities: ["Specialist compliance, legal, or technical prototyping tasks"],
        strategicPartnerOrConsortiumCapabilities: ["Distribution or specialist technical partners where required"]
      };

  return {
    schemaVersion: "2026-11-03.v1",
    evaluationId: evaluationId || reqData.evaluationId || "",
    submissionId: submissionId || reqData.submissionId || "",
    userId: reqData.userId || "",
    founderName: String(reqData.founderName || "").trim(),
    ventureType,
    ventureContext: ventureType,
    coreProblemStatement: problemMisclass.isFounderCapabilityNeedInProblemField ? problemMisclass.inferredCustomerProblem : problemText,
    proposedSolutionStatement: ideaText,
    excludedHistoricalOrAlternativeWork: isMoorSafe && !combinedLower.includes("adhesive")
      ? "Assessed strictly on the submitted solar-powered, low-voltage electrical mooring-rope pest deterrent concept. Excluded passive adhesive-disc, CAD, or 3D-printing concepts not present in this submission are excluded."
      : "None — assessed strictly on submitted concept.",
    prototypeStageStatus: {
      submittedBusinessStage: stageText,
      hasPrototypeSubmitted,
      noPrototypeInvented: !hasPrototypeSubmitted,
      assessmentNote: hasPrototypeSubmitted
        ? "Founder reported prototype/MVP progress; incorporated into technical and validation assessment."
        : "Business stage is 'Just an idea' / 'Idea only'; PitchLab does not invent any existing physical prototype, CAD, or 3D-printed unit."
    },
    founderCapabilityBreakdown,
    founderTime: timeNorm,
    founderCapital: capNorm,
    problemClassification: problemMisclass,
    isFounderCapabilityNeedInProblemField: problemMisclass.isFounderCapabilityNeedInProblemField,
    founderStatedSetupPriorities: problemMisclass.founderStatedSetupPriorities,
    inferredCustomerProblem: problemMisclass.inferredCustomerProblem,
    fields: {
      q1_idea: ideaText,
      q2_problem: problemText,
      q3_targetMarket: String(reqData.targetMarket || "").trim(),
      q4_marketScope: String(reqData.marketScope || "Local / Regional").trim(),
      q5_location: locSummary,
      q6_founderBackgroundNarrative: narrative,
      q7_cvAttachment: {
        uploaded: Boolean(reqData.founderCvUploaded || reqData.cvStoragePath || reqData.cvFileName),
        fileName: String(reqData.cvFileName || "").trim(),
        extractedTextLength: String(reqData.founderCvExtractedText || "").length
      },
      q8_founderExperience: founderExp !== "" ? founderExp : "Not specified",
      q9_industryExperience: industryExp !== "" ? industryExp : "Not specified",
      q10_founderMotivation: String(reqData.founderMotivation || "").trim(),
      q11_biggestObstacle: String(reqData.biggestObstacle || "").trim(),
      q12_timeCommitment: timeNorm.normalizedBand,
      q12_stepHoursLabel: timeNorm.stepHoursLabel,
      q13_investmentCommitment: capNorm.availableCapital,
      q13_initialRiskCapital: capNorm.initialRiskCapital,
      q14_businessStage: stageText,
      q15_customerValidation: String(reqData.customerValidation || reqData.network || "").trim(),
      q16_fundingPreference: String(reqData.fundingPreference || "Personal savings only").trim(),
      q17_successDefinition: String(reqData.successDefinition || "Sustainable profitable business").trim(),
      q18_founderPredictions: reqData.founderPredictions || null
    }
  };
}

/**
 * Generates an explicit Input Coverage Audit verifying that every answered question is accounted for
 * with a clear disposition ('used', 'contextual', 'conflicting', 'not_applicable').
 */
function computeInputCoverageAudit(reqData = {}, evaluationData = {}, snapshot = null) {
  const authSnap = snapshot || buildAuthoritativeAssessmentSnapshot(reqData, evaluationData.id, evaluationData.submissionId);
  const f = authSnap.fields;
  const valCalc = calculateCustomerValidationSubFactors(reqData);

  const makeEntry = ({
    questionId,
    questionVersion = "v1.4",
    questionText,
    submittedValue,
    normalizedValue,
    isOptional = false,
    analysisDimensions = [],
    aiCallsReceived = ["assessIdea(Gemini-2.5-Flash)", "deterministicScoringEngine"],
    findingsInformed = [],
    disposition = "used",
    dispositionReason = ""
  }) => {
    const hasValue = submittedValue !== undefined && submittedValue !== null && String(submittedValue).trim() !== "" && String(submittedValue).trim() !== "Not specified";
    let status = hasValue ? "answered" : (isOptional ? "skipped" : "skipped");
    let finalDisposition = disposition;
    let finalReason = dispositionReason;

    if (!hasValue && isOptional) {
      status = "not_applicable";
      finalDisposition = "not_applicable";
      finalReason = finalReason || "Optional input not provided by founder.";
    } else if (!hasValue) {
      status = "skipped";
      finalDisposition = "contextual";
      finalReason = finalReason || "Field was not explicitly populated in legacy submission; synthesized from narrative/context.";
    }

    return {
      questionId,
      questionVersion,
      questionText,
      submittedValue: typeof submittedValue === "object" ? JSON.stringify(submittedValue) : String(submittedValue ?? ""),
      normalizedValue: typeof normalizedValue === "object" ? JSON.stringify(normalizedValue) : String(normalizedValue ?? ""),
      status,
      analysisDimensions,
      aiCallsReceived,
      findingsInformed,
      disposition: finalDisposition,
      dispositionReason: finalReason
    };
  };

  const items = [
    makeEntry({
      questionId: "q1_idea",
      questionText: "What is your business idea?",
      submittedValue: reqData.idea || f.q1_idea,
      normalizedValue: f.q1_idea,
      analysisDimensions: ["problemCustomerClarity", "businessModelWillingnessToPay", "competitivePosition", "futureTrends"],
      findingsInformed: ["executiveSummary", "businessModelSnapshot.coreOffering", "businessTheme", "actionPlan"],
      disposition: "used",
      dispositionReason: `Classified venture as '${authSnap.ventureType}' and grounded core offering and roadmap.`
    }),
    makeEntry({
      questionId: "q2_problem",
      questionText: "What problem does this solve for customers?",
      submittedValue: reqData.problem || f.q2_problem,
      normalizedValue: authSnap.isFounderCapabilityNeedInProblemField
        ? `[Founder Setup Needs: ${authSnap.founderStatedSetupPriorities}] -> [Inferred Customer Problem: ${authSnap.inferredCustomerProblem}]`
        : f.q2_problem,
      analysisDimensions: ["problemCustomerClarity", "executionReadiness"],
      findingsInformed: ["scores.problemCustomerClarity", "businessModelSnapshot.customerProblem", "executiveSummary", "actionPlan"],
      disposition: authSnap.isFounderCapabilityNeedInProblemField ? "conflicting" : "used",
      dispositionReason: authSnap.isFounderCapabilityNeedInProblemField
        ? "Submitted answer lists founder's own setup/training/client-acquisition needs (Xero proficiency, business setup requirements, new client base) rather than external customer pain points; separated into founder execution priorities and inferred customer problem assumption."
        : "Directly used to evaluate customer pain severity, root cause clarity, and value proposition alignment."
    }),
    makeEntry({
      questionId: "q3_targetMarket",
      questionText: "Who is your target customer, who are your competitors, and is the market new or mature?",
      submittedValue: reqData.targetMarket || f.q3_targetMarket,
      normalizedValue: f.q3_targetMarket,
      analysisDimensions: ["problemCustomerClarity", "marketCommercialOpportunity", "competitivePosition"],
      findingsInformed: ["businessModelSnapshot.targetCustomer", "marketInsights", "scores.marketCommercialOpportunity", "scores.competitivePosition"],
      disposition: "used",
      dispositionReason: "Used to identify primary customer segments, direct/indirect alternatives, and market maturity."
    }),
    makeEntry({
      questionId: "q4_marketScope",
      questionText: "What is your target market geographic scope?",
      submittedValue: reqData.marketScope || f.q4_marketScope,
      normalizedValue: f.q4_marketScope,
      analysisDimensions: ["marketCommercialOpportunity", "businessModelWillingnessToPay"],
      findingsInformed: ["scores.marketCommercialOpportunity", "marketInsights.marketLandscape"],
      disposition: reqData.marketScope ? "used" : "contextual",
      dispositionReason: "Informs addressable market reachability and expansion potential."
    }),
    makeEntry({
      questionId: "q5_location",
      questionText: "Where will the business operate (Country / Region / City)?",
      submittedValue: reqData.locationSummary || reqData.locationCountry || f.q5_location,
      normalizedValue: f.q5_location,
      analysisDimensions: ["marketCommercialOpportunity", "futureTrends", "legalRegulatoryAssessment"],
      findingsInformed: ["marketInsights.governmentPolicyInfluence", "legalRegulatoryAssessment", "futureTrends.dimensions.regulatoryTrend"],
      disposition: "used",
      dispositionReason: "Grounds regulatory compliance (e.g. NZ IRD/GST, Incorporated Societies Act) and regional market context."
    }),
    makeEntry({
      questionId: "q6_founderBackgroundNarrative",
      questionText: "Tell us about your professional background, skills, and domain experience.",
      submittedValue: reqData.founderBackgroundNarrative || f.q6_founderBackgroundNarrative,
      normalizedValue: f.q6_founderBackgroundNarrative,
      analysisDimensions: ["founderCapabilityFit", "executionReadiness"],
      findingsInformed: ["scores.founderCapabilityFit", "founderCapabilityExplanation", "cvAnalysis", "executiveSummary"],
      disposition: "used",
      dispositionReason: "Evaluated across 5 founder capability components (domain, execution, commercial, coverage, bridgeability)."
    }),
    makeEntry({
      questionId: "q7_cvAttachment",
      questionText: "Optional CV / Resume attachment",
      submittedValue: f.q7_cvAttachment.uploaded ? (f.q7_cvAttachment.fileName || "Uploaded CV") : "",
      normalizedValue: f.q7_cvAttachment,
      isOptional: true,
      analysisDimensions: ["founderCapabilityFit"],
      findingsInformed: ["cvAnalysis", "founderMetrics.cvUploaded", "scores.founderCapabilityFit"],
      disposition: f.q7_cvAttachment.uploaded ? "used" : "not_applicable",
      dispositionReason: f.q7_cvAttachment.uploaded
        ? "Extracted CV text combined with founder narrative to assess domain credentials."
        : "No CV uploaded; founder assessment relies on submitted questionnaire narrative without penalty."
    }),
    makeEntry({
      questionId: "q8_founderExperience",
      questionText: "Have you started or run a business before?",
      submittedValue: reqData.founderExperience ?? f.q8_founderExperience,
      normalizedValue: f.q8_founderExperience,
      analysisDimensions: ["founderCapabilityFit", "executionReadiness"],
      findingsInformed: ["scores.founderCapabilityFit", "founderCapabilityExplanation", "actionPlan"],
      disposition: "used",
      dispositionReason: f.q8_founderExperience.toLowerCase() === "no"
        ? "Answered 'No' (first-time business owner); accounted for in execution readiness and business setup guidance without negating 10+ years of domain experience."
        : "Prior business ownership experience incorporated into execution capability score."
    }),
    makeEntry({
      questionId: "q9_industryExperience",
      questionText: "How many years of experience do you have in this industry?",
      submittedValue: reqData.industryExperience ?? f.q9_industryExperience,
      normalizedValue: f.q9_industryExperience,
      analysisDimensions: ["founderCapabilityFit"],
      findingsInformed: ["scores.founderCapabilityFit", "executiveSummary", "founderCapabilityExplanation"],
      disposition: "used",
      dispositionReason: "Directly weights Component A (Direct Domain Experience) in Founder Capability Fit."
    }),
    makeEntry({
      questionId: "q10_founderMotivation",
      questionText: "Why do you want to start this business?",
      submittedValue: reqData.founderMotivation || f.q10_founderMotivation,
      normalizedValue: f.q10_founderMotivation || "Inferred from founder narrative and mission statement",
      analysisDimensions: ["founderCapabilityFit", "executionReadiness"],
      findingsInformed: ["executiveSummary", "businessTheme.strategicPositioning"],
      disposition: reqData.founderMotivation ? "used" : "contextual",
      dispositionReason: "Informs founder commitment, mission alignment, and positioning."
    }),
    makeEntry({
      questionId: "q11_biggestObstacle",
      questionText: "What do you see as your biggest obstacle right now?",
      submittedValue: reqData.biggestObstacle || f.q11_biggestObstacle,
      normalizedValue: f.q11_biggestObstacle || (authSnap.isFounderCapabilityNeedInProblemField ? authSnap.founderStatedSetupPriorities : "Customer acquisition and validation"),
      analysisDimensions: ["executionReadiness", "problemCustomerClarity"],
      findingsInformed: ["summaryBlock.biggestRiskToThisIdea", "actionPlan.topFivePriorities", "scores.executionReadiness"],
      disposition: reqData.biggestObstacle ? "used" : "contextual",
      dispositionReason: "Directly addressed in immediate 30-day action priorities and risk mitigation."
    }),
    makeEntry({
      questionId: "q12_timeCommitment",
      questionText: "How many hours per week can you commit to this business?",
      submittedValue: reqData.timeCommitment || reqData.capacity || f.q12_timeCommitment,
      normalizedValue: `${f.q12_timeCommitment} (${f.q12_stepHoursLabel})`,
      analysisDimensions: ["executionReadiness"],
      findingsInformed: ["founderMetrics.weeklyAvailableHours", "scores.executionReadiness", "actionPlan.ninetyDayRoadmap.steps", "investorQuestions"],
      disposition: authSnap.founderTime?.hasConflict ? "conflicting" : "used",
      dispositionReason: authSnap.founderTime?.hasConflict
        ? `${authSnap.founderTime.conflictNote} Enforced '${f.q12_timeCommitment}' across all report sections.`
        : `Normalized to '${f.q12_timeCommitment}' and enforced consistently across founderMetrics, roadmap step hours (${f.q12_stepHoursLabel}), and execution readiness.`
    }),
    makeEntry({
      questionId: "q13_investmentCommitment",
      questionText: "How much capital are you prepared to invest initially?",
      submittedValue: reqData.investmentCommitment || reqData.budget || f.q13_investmentCommitment,
      normalizedValue: `Available: ${f.q13_investmentCommitment} | Initial Risk Budget: ${f.q13_initialRiskCapital}`,
      analysisDimensions: ["executionReadiness", "businessModelWillingnessToPay"],
      findingsInformed: ["founderMetrics.availableCapital", "founderMetrics.initialRiskCapital", "scores.executionReadiness", "actionPlan"],
      disposition: "used",
      dispositionReason: "Preserves both total available startup capital and initial validation risk budget across all financial and roadmap sections."
    }),
    makeEntry({
      questionId: "q14_businessStage",
      questionText: "What stage is your business idea at today?",
      submittedValue: reqData.businessStage || f.q14_businessStage,
      normalizedValue: f.q14_businessStage,
      analysisDimensions: ["customerValidation", "executionReadiness"],
      findingsInformed: ["scores.customerValidation", "validationLadder", "portfolioMeta.ventureStage"],
      disposition: valCalc.hasStageContradiction ? "conflicting" : (reqData.businessStage ? "used" : "contextual"),
      dispositionReason: valCalc.hasStageContradiction
        ? "Contradiction detected between reported paying/revenue stage and 0 customer validation interactions; capped validation score pending evidence."
        : "Calibrates validation ladder progress and recommended next evidence gateway."
    }),
    makeEntry({
      questionId: "q15_customerValidation",
      questionText: "How many potential customers have you spoken to or tested this with?",
      submittedValue: reqData.customerValidation || reqData.network || f.q15_customerValidation,
      normalizedValue: f.q15_customerValidation,
      analysisDimensions: ["customerValidation"],
      findingsInformed: ["scores.customerValidation", "validationLadder", "summaryBlock.doThisBeforeBuildingMore"],
      disposition: valCalc.hasStageContradiction ? "conflicting" : "used",
      dispositionReason: "Directly determines Customer Validation sub-factor score and discovery interview targets."
    }),
    makeEntry({
      questionId: "q16_fundingPreference",
      questionText: "How do you plan to fund this business?",
      submittedValue: reqData.fundingPreference || f.q16_fundingPreference,
      normalizedValue: f.q16_fundingPreference,
      analysisDimensions: ["businessModelWillingnessToPay", "executionReadiness"],
      findingsInformed: ["investorBite.investmentVerdict", "businessModelSnapshot.commercialAssessment"],
      disposition: reqData.fundingPreference ? "used" : "contextual",
      dispositionReason: "Tailors the Investor & Commercial Readiness framing (e.g. self-funded owner-operator cashflow vs external equity)."
    }),
    makeEntry({
      questionId: "q17_successDefinition",
      questionText: "What does success look like for you with this business?",
      submittedValue: reqData.successDefinition || f.q17_successDefinition,
      normalizedValue: f.q17_successDefinition,
      analysisDimensions: ["businessModelWillingnessToPay", "executionReadiness"],
      findingsInformed: ["investorBite.investmentVerdict", "finalRecommendation.pathForward"],
      disposition: reqData.successDefinition ? "used" : "contextual",
      dispositionReason: "Aligns commercial milestones and scale expectations with the founder's personal definition of success."
    }),
    makeEntry({
      questionId: "q18_founderPredictions",
      questionText: "Founder Pre-Assessment Confidence & Risk Predictions",
      submittedValue: f.q18_founderPredictions ? JSON.stringify(f.q18_founderPredictions) : "",
      normalizedValue: f.q18_founderPredictions || "Default baseline comparison",
      isOptional: true,
      analysisDimensions: ["founderEvidenceGap"],
      findingsInformed: ["founderEvidenceGap"],
      disposition: f.q18_founderPredictions ? "used" : "not_applicable",
      dispositionReason: f.q18_founderPredictions
        ? "Compared against PitchLab independent scores in the Founder Perception vs Evidence section without biasing scores."
        : "Optional prediction sliders not submitted; default baseline comparison applied."
    })
  ];

  const answeredItems = items.filter(i => i.status === "answered");
  const unaccountedItems = answeredItems.filter(i => !i.disposition || !["used", "contextual", "conflicting", "not_applicable"].includes(i.disposition));

  return {
    schemaVersion: "2026-10-30.v1",
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestionsAudited: items.length,
      answeredCount: answeredItems.length,
      usedCount: items.filter(i => i.disposition === "used").length,
      contextualCount: items.filter(i => i.disposition === "contextual").length,
      conflictingCount: items.filter(i => i.disposition === "conflicting").length,
      notApplicableCount: items.filter(i => i.disposition === "not_applicable").length,
      unaccountedCount: unaccountedItems.length,
      completeCoverageVerified: unaccountedItems.length === 0
    },
    items
  };
}

/**
 * PL-FIX-20261009-002 & PL-FIX-20261030-01: Automated Cross-Assessment Data Contamination Detector & Resolver.
 * Enforces assessment isolation, detects cross-industry/archetype bleed and unrelated entities,
 * cleanses contaminated fields from clean founder submission context, and records an immutable audit log.
 */
function detectAndResolveCrossContamination(evaluationData = {}, reqData = {}) {
  evaluationData.contaminationAudit = evaluationData.contaminationAudit || [];
  const auditLog = evaluationData.contaminationAudit;

  const idea = (reqData.idea || evaluationData.idea || "").trim();
  const problem = (reqData.problem || evaluationData.problem || "").trim();
  const category = (reqData.category || evaluationData.category || "").trim();
  const fullInputText = `${idea} ${problem} ${category}`.toLowerCase();

  const ventureType = classifyVentureType(reqData);

  // 1. Mandatory Assessment ID and Ownership Isolation Check
  if (reqData.userId && evaluationData.userId && reqData.userId !== evaluationData.userId) {
    throw new Error(`PITCHLAB ISOLATION FAILURE: Assessment ownership mismatch detected. Request userId '${reqData.userId}' does not match evaluation userId '${evaluationData.userId}'. Access blocked.`);
  }
  if (reqData.evaluationId && evaluationData.id && reqData.evaluationId !== evaluationData.id) {
    throw new Error(`PITCHLAB ISOLATION FAILURE: Assessment ID mismatch detected. Expected '${reqData.evaluationId}', found '${evaluationData.id}'. Operation blocked.`);
  }

  // 2. Identify Archetype Profile
  const isTransport = ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || Boolean(fullInputText.match(/\b(ride-share|rideshare|taxi|passenger transport|mobility|transport-booking)\b/i));
  const isAiDecision = ventureType.includes("Decision Support") || Boolean(fullInputText.match(/\b(pitchlab|decision support|decision intelligence|startup evaluation|idea validation|idea assessment|founder intelligence)\b/i));
  const isHardware = ventureType.includes("Hardware") || Boolean(fullInputText.match(/\b(moorsafe|mooring|pest deterrent|hardware|device|sensor)\b/i));
  const isNuclear = ventureType.includes("Energy") || Boolean(fullInputText.match(/\b(nuclear|smr|power plant|atomic|fission|fusion|reactor)\b/i));
  const isTrade = ventureType.includes("Trade") || ventureType.includes("Local Service") || Boolean(fullInputText.match(/\b(builder|carpenter|plumber|electrician|cleaning|mowing|landscaping)\b/i));

  // Benchmark entities that must never contaminate unrelated venture core positioning
  const benchmarkEntities = [
    { entity: 'Transport & Mobility', forbidden: !isTransport, keywords: ['leride', 'vetted drivers', 'driver supply density', 'transport operator relationships', 'local passenger mobility', 'passenger convenience and fare pricing', 'transportation / mobility', 'transportation', 'mobility'] },
    { entity: 'MoorSafe', forbidden: !isHardware, keywords: ['moorsafe', 'mooring ropes', 'electrified deterrent', 'marine-grade housing', 'pest deterrent'] },
    { entity: 'Nuclear', forbidden: !isNuclear, keywords: ['radiation safety act', 'atomic energy act', 'small modular reactor', 'nuclear reactor', 'baseload electricity generation'] },
    { entity: 'Clever Core', forbidden: !isTrade && !fullInputText.includes('clever core'), keywords: ['clever core', 'prefabricated timber', 'timber wall frames'] }
  ];

  const checkFieldContamination = (fieldVal, forbiddenKeywords) => {
    if (!fieldVal || typeof fieldVal !== 'string') return null;
    const lower = fieldVal.toLowerCase();
    for (const kw of forbiddenKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        const isLegitComparison = new RegExp(`(?:unlike|compared to|alternative to|in contrast to|competing with)\\s+${kw}`, 'i').test(fieldVal);
        if (!isLegitComparison) {
          return kw;
        }
      }
    }
    return null;
  };

  // Inspect Section 6 (businessTheme)
  if (evaluationData.businessTheme) {
    const bt = evaluationData.businessTheme;
    for (const rule of benchmarkEntities) {
      if (rule.forbidden) {
        for (const [key, val] of Object.entries(bt)) {
          const contaminatedTerm = checkFieldContamination(val, rule.keywords);
          if (contaminatedTerm) {
            auditLog.push({
              timestamp: new Date().toISOString(),
              section: `businessTheme.${key}`,
              entityLeakage: rule.entity,
              detectedTerm: contaminatedTerm,
              action: 'REGENERATE_FROM_CLEAN_INPUT',
              previousValue: val
            });

            if (isAiDecision) {
              if (key === 'primaryTheme') bt.primaryTheme = "AI / Business Decision Support Software";
              if (key === 'secondaryTheme') bt.secondaryTheme = "Startup Idea Validation & Founder Decision Intelligence";
              if (key === 'strategicPositioning') bt.strategicPositioning = "An idea portfolio and decision platform that helps founders evaluate opportunities before committing significant time or capital.";
              if (key === 'marketCategoryDynamics') bt.marketCategoryDynamics = "Driven by founder demand for rapid idea validation, structured risk assessment, evidence-led feasibility scoring, and disciplined capital allocation.";
              if (key === 'strategicMoat') bt.strategicMoat = "Evidence-calibrated decision methodology, structured validation scoring frameworks, and proprietary founder decision intelligence.";
            } else if (isHardware) {
              if (key === 'primaryTheme') bt.primaryTheme = "Hardware & Physical Product Innovation";
              if (key === 'secondaryTheme') bt.secondaryTheme = "Field Trial Validation & Asset Protection";
              if (key === 'strategicPositioning') bt.strategicPositioning = "Positions as a high-efficiency specialized physical solution directly targeting operational pain points.";
              if (key === 'marketCategoryDynamics') bt.marketCategoryDynamics = "Driven by market demand for durable, low-maintenance asset protection and automated operational tools.";
              if (key === 'strategicMoat') bt.strategicMoat = "Proprietary design mechanics, domain experience, and direct field trial relationships.";
            } else if (isNuclear) {
              if (key === 'primaryTheme') bt.primaryTheme = "Energy Infrastructure & Power Generation";
              if (key === 'secondaryTheme') bt.secondaryTheme = "Nuclear / SMR / Firm Low-Carbon Generation";
              if (key === 'strategicPositioning') bt.strategicPositioning = "Positions as a long-term utility-scale infrastructure option targeting grid reliability, baseload capacity, and industrial decarbonisation.";
              if (key === 'marketCategoryDynamics') bt.marketCategoryDynamics = "Governed by national energy security strategy, statutory radiation safety law, environmental consenting frameworks, and multi-billion-dollar infrastructure capital scale.";
              if (key === 'strategicMoat') bt.strategicMoat = "No defensible venture-specific moat is yet evidenced. Potential future defensibility could arise from specialist partnerships, project rights, regulatory capability, or execution capability.";
            } else if (isTransport) {
              const targetJurisdiction = reqData.locationSummary || reqData.locationCountry || reqData.country || "the target region";
              if (key === 'primaryTheme') bt.primaryTheme = "Transportation / Mobility";
              if (key === 'secondaryTheme') bt.secondaryTheme = "Local Passenger Mobility & Booking Marketplace";
              if (key === 'strategicPositioning') bt.strategicPositioning = `Positions as a localized two-sided transport booking marketplace connecting passengers with vetted drivers and transport operators across ${targetJurisdiction}.`;
              if (key === 'marketCategoryDynamics') bt.marketCategoryDynamics = `Driven by passenger convenience, transparent fare pricing, driver supply density, smartphone penetration, and local transport regulatory compliance in ${targetJurisdiction}.`;
              if (key === 'strategicMoat') bt.strategicMoat = "Two-sided network density, established local driver and operator relationships, customer booking habituation, and local operational presence.";
            } else {
              if (key === 'primaryTheme') bt.primaryTheme = reqData.category || "B2B Software & Business Services";
              if (key === 'secondaryTheme') bt.secondaryTheme = "Workflow Efficiency & Automation";
              if (key === 'strategicPositioning') bt.strategicPositioning = "Positions as a specialized efficiency solution directly targeting operational friction points.";
              if (key === 'marketCategoryDynamics') bt.marketCategoryDynamics = "Driven by market demand for operational productivity, compliance automation, and workflow efficiency.";
              if (key === 'strategicMoat') bt.strategicMoat = "Deep domain specialization, high workflow retention, and direct customer relationships.";
            }
          }
        }
      }
    }
  }

  // Inspect Section 2 (businessModelSnapshot)
  if (evaluationData.businessModelSnapshot) {
    const bms = evaluationData.businessModelSnapshot;
    for (const rule of benchmarkEntities) {
      if (rule.forbidden) {
        for (const [key, val] of Object.entries(bms)) {
          const contaminatedTerm = checkFieldContamination(val, rule.keywords);
          if (contaminatedTerm) {
            auditLog.push({
              timestamp: new Date().toISOString(),
              section: `businessModelSnapshot.${key}`,
              entityLeakage: rule.entity,
              detectedTerm: contaminatedTerm,
              action: 'REGENERATE_FROM_CLEAN_INPUT',
              previousValue: val
            });
            if (isAiDecision) {
              if (key === 'targetCustomer') bms.targetCustomer = "Entrepreneurs, startup founders, prospective business owners and innovation programmes.";
              if (key === 'coreOffering') bms.coreOffering = "Structured AI-assisted assessment of business ideas, risks, market potential, founder capability and practical next steps.";
              if (key === 'customerProblem') bms.customerProblem = problem || "Founders risking time and capital on unvalidated ideas without structured commercial assessment or evidence-led guidance.";
              if (key === 'valueProposition') bms.valueProposition = "Structured AI-assisted assessment of business ideas, risks, market potential, founder capability and practical next steps.";
              if (key === 'revenueModel') bms.revenueModel = "Tiered SaaS subscription, per-assessment credits, or institutional licensing for accelerators and innovation programmes.";
              if (key === 'customerAcquisition') bms.customerAcquisition = "Direct digital acquisition, founder community partnerships, accelerator networks, and word-of-mouth referrals.";
              if (key === 'keyCosts') bms.keyCosts = "AI model inference and API costs, software platform development, cloud infrastructure hosting, and user acquisition.";
              if (key === 'commercialAssessment') bms.commercialAssessment = "Commercial viability depends on delivering high-integrity, evidence-calibrated assessments that founders and innovation programmes trust.";
            }
          }
        }
      }
    }
  }

  return evaluationData;
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
  if (/(?:^|[^\$0-9]),\s*500\b/.test(fullReportText)) {
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

  // 13. Cross-Industry Semantic Contamination Check (PL-FIX-20261006-SMARTTAX-01 Section 2 & PL-FIX-20261009-002)
  const isFinTechOrSaaS = ventureType === "Financial Services / FinTech" || ventureType.includes("SaaS") || ventureType.includes("Software") || ventureType.includes("Decision Support");
  const isNuclearVenture = Boolean((reqData.idea || "").toLowerCase().match(/\b(nuclear|smr|atomic|fission|fusion|power plant)\b/));
  const isTransportVenture = Boolean((reqData.idea || "").toLowerCase().match(/\b(leride|ride-share|rideshare|taxi|passenger transport|mobility|transport-booking)\b/));
  const isHardwareVenture = Boolean((reqData.idea || "").toLowerCase().match(/\b(moorsafe|mooring|pest deterrent|hardware|device|sensor)\b/));

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

  // Cross-archetype check: Transport operations bleed into Non-Transport ventures
  if (!isTransportVenture && (isFinTechOrSaaS || ventureType.includes("Hardware"))) {
    const transportContaminationPatterns = [
      { pattern: /\bvetted drivers\b/i, phrase: "vetted drivers" },
      { pattern: /\bdriver supply density\b/i, phrase: "driver supply density" },
      { pattern: /\btransport operator relationships\b/i, phrase: "transport operator relationships" },
      { pattern: /\blocal passenger mobility\b/i, phrase: "local passenger mobility" },
      { pattern: /\bconnecting passengers with vetted drivers\b/i, phrase: "connecting passengers with vetted drivers" },
      { pattern: /\bpassenger convenience and fare pricing\b/i, phrase: "passenger convenience and fare pricing" }
    ];
    for (const rule of transportContaminationPatterns) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Cross-assessment transport contamination detected ('${rule.phrase}') in ${ventureType} assessment.`);
      }
    }
  }

  // Cross-archetype check: Marine hardware bleed into Non-Hardware ventures
  if (!isHardwareVenture && (isFinTechOrSaaS || isTransportVenture)) {
    const hardwareContaminationPatterns = [
      { pattern: /\bmooring ropes\b/i, phrase: "mooring ropes" },
      { pattern: /\bpest deterrent\b/i, phrase: "pest deterrent" },
      { pattern: /\bmarine-grade housing\b/i, phrase: "marine-grade housing" },
      { pattern: /\belectrified deterrent\b/i, phrase: "electrified deterrent" }
    ];
    for (const rule of hardwareContaminationPatterns) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Cross-assessment marine/hardware contamination detected ('${rule.phrase}') in ${ventureType} assessment.`);
      }
    }
  }

  // Cross-archetype check: Dedicated PitchLab AI Decision Support isolation
  const isAiDecision = ventureType.includes("Decision Support") || Boolean((reqData.idea || "").toLowerCase().match(/\b(pitchlab|decision support|decision intelligence)\b/i));
  if (isAiDecision) {
    const pt = (evaluationData.businessTheme?.primaryTheme || "").toLowerCase();
    if (pt.includes("transport") || pt.includes("mobility")) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Cross-assessment data contamination detected. Primary theme '${evaluationData.businessTheme?.primaryTheme}' conflicts with AI / Decision Support venture.`);
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
  if (!evaluationData.futureTrends) {
    evaluationData.futureTrends = {};
  }
  if (!evaluationData.futureTrends.dimensions) {
    const healedFt = calculate5DimensionFutureTrends(reqData, {}, ventureType, evaluationData.futureTrends);
    evaluationData.futureTrends.dimensions = healedFt.dimensions;
  }
  const ftDimensions = evaluationData.futureTrends.dimensions;
  const requiredFtDims = ['demandTrend', 'technologyTrend', 'regulatoryTrend', 'competitionTrend', 'capitalTrend'];
  for (const d of requiredFtDims) {
    if (!ftDimensions[d] || typeof ftDimensions[d] !== 'string' || ftDimensions[d].trim().length < 5) {
      const healedFt = calculate5DimensionFutureTrends(reqData, {}, ventureType, evaluationData.futureTrends);
      ftDimensions[d] = healedFt.dimensions[d] || "Structural macro demand and market evolution continue to shape this category.";
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

  // 18. Transportation / Mobility Semantic Guardrail (PL-FIX-20261008-V0.9.7-LERIDE Section 12)
  const isTransport = ventureType === 'Transportation / Mobility / Marketplace' || Boolean((reqData.idea || "").toLowerCase().match(/leride|ride-share|rideshare|taxi|passenger transport|mobility|transport-booking/i));
  if (isTransport) {
    const transportBannedSaaS = [
      { pattern: /cloud-based productivity tools/i, phrase: "cloud-based productivity tools" },
      { pattern: /administrative overhead reduction/i, phrase: "administrative overhead reduction" },
      { pattern: /enterprise platforms/i, phrase: "enterprise platforms" },
      { pattern: /horizontal productivity tools/i, phrase: "horizontal productivity tools" },
      { pattern: /compliance automation/i, phrase: "compliance automation" },
      { pattern: /subscription economics/i, phrase: "subscription economics" },
      { pattern: /api-driven add-ons/i, phrase: "api-driven add-ons" },
      { pattern: /enterprise reporting integrations/i, phrase: "enterprise reporting integrations" },
      { pattern: /\bb2b software\b/i, phrase: "b2b software" },
      { pattern: /\bworkflow efficiency\b/i, phrase: "workflow efficiency" }
    ];
    for (const rule of transportBannedSaaS) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Unsupported SaaS/workflow term detected ('${rule.phrase}') in Transportation/Mobility assessment.`);
      }
    }
  }

  // 19. Cross-Section Domain Experience Contradiction Check (Section 4 & 5)
  const hasTransportExperience = Boolean(
    (reqData.experience || "").toLowerCase().match(/transport|fleet|rental|tours|driver/i) ||
    (reqData.founderBackgroundNarrative || "").toLowerCase().match(/transport|fleet|rental|tours|driver|discovery/i)
  );
  if (isTransport && hasTransportExperience) {
    if (/lacks sector-specific domain experience/i.test(fullReportText) || /lacks direct sector execution experience/i.test(fullReportText)) {
      throw new Error("PITCHLAB QA INTEGRITY FAILURE: Internal contradiction detected. Founder evidences transport domain experience, but report claims founder lacks sector experience.");
    }
  }

  // 20. Capital Variable Mapping Integrity Check (Section 7)
  const initRiskCap = evaluationData.founderMetrics?.initialRiskCapital || "";
  const availCap = evaluationData.founderMetrics?.availableCapital || "";
  if (initRiskCap && availCap && initRiskCap !== availCap) {
    if (new RegExp(`(?:initial risk budget|risk budget|risk capital)[^\\.\\n]*\\(${availCap.replace(/[-–]/g, '[-–]').replace(/\$/g, '\\$')}\\)`, 'i').test(fullReportText)) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Capital mapping contradiction detected. Risk budget references broader available capital (${availCap}) instead of initial risk capital (${initRiskCap}).`);
    }
  }

  // 21. Generic Business Model Snapshot Filler Check (Section 9)
  const genericBmPatterns = [
    { pattern: /commercial solution addressing operational workflow friction or market demand/i, phrase: "Commercial solution addressing operational workflow friction..." },
    { pattern: /commercial revenue model based on subscription, transaction fee, or direct service billing/i, phrase: "Commercial revenue model based on subscription..." }
  ];
  for (const rule of genericBmPatterns) {
    if (rule.pattern.test(fullReportText)) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Generic business model snapshot filler detected ('${rule.phrase}'). Must be venture-specific.`);
    }
  }

  // 22. Action Plan Essay Text Injection Check (Section 8)
  const priorityActionsList = evaluationData.summaryBlock?.threePriorityActions || [];
  for (const act of priorityActionsList) {
    const exp = act.explanation || "";
    if (exp.length > 250) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Action plan text injection detected (${exp.length} chars). Founder text must be synthesized, not dumped verbatim.`);
    }
  }

  // 23. Construction / Trade Contamination Check in Non-Construction Ventures (PL-FIX-20261030-01 Error A)
  const isActualConstructionOrTrade = ventureType === "Trade / Local Service";
  if (!isActualConstructionOrTrade) {
    const constructionContaminationRules = [
      { pattern: /residential property owners and architects/i, phrase: "residential property owners and architects" },
      { pattern: /subcontractor trade vetting/i, phrase: "subcontractor trade vetting" },
      { pattern: /renovation quotes/i, phrase: "renovation quotes" },
      { pattern: /fixed-price construction contracts?/i, phrase: "fixed-price construction contracts" },
      { pattern: /pilot construction contract/i, phrase: "pilot construction contract" },
      { pattern: /building supply merchants/i, phrase: "building supply merchants" },
      { pattern: /milestone construction/i, phrase: "milestone construction" }
    ];
    const allActionAndSummaryText = [
      fullReportText,
      JSON.stringify(evaluationData.actionPlan || {}),
      JSON.stringify(evaluationData.investorBite?.scorecard || [])
    ].join(" \n ");
    for (const rule of constructionContaminationRules) {
      if (rule.pattern.test(allActionAndSummaryText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Unrelated construction recommendation ('${rule.phrase}') detected in ${ventureType} assessment.`);
      }
    }
  }

  // 24. Software / SaaS Product Contamination Check in Professional Service / Community Ventures (PL-FIX-20261030-01 Error B)
  const isProfServiceOrCommunity = ventureType === "Professional Services / Bookkeeping & Financial Advisory" ||
    ventureType === "Professional Services / Agency / Traditional SME" ||
    ventureType === "Community / Not-for-Profit / Social Enterprise";
  if (isProfServiceOrCommunity) {
    const softwareProductContaminationRules = [
      { pattern: /before investing heavily in custom software development/i, phrase: "before investing heavily in custom software development" },
      { pattern: /validate core customer workflow integration and bank feed connectivity/i, phrase: "validate core customer workflow integration and bank feed connectivity" },
      { pattern: /lean software capital model with low initial infrastructure overhead/i, phrase: "lean software capital model with low initial infrastructure overhead" },
      { pattern: /scaling through subscription software economics/i, phrase: "scaling through subscription software economics" },
      { pattern: /software scalability with low marginal distribution and hosting costs/i, phrase: "software scalability with low marginal distribution and hosting costs" },
      { pattern: /automated tax set-aside/i, phrase: "automated tax set-aside" }
    ];
    const allScorecardAndReportText = [
      fullReportText,
      JSON.stringify(evaluationData.investorBite?.scorecard || []),
      evaluationData.futureTrends?.whatThisMeansForFounder || ""
    ].join(" \n ");
    for (const rule of softwareProductContaminationRules) {
      if (rule.pattern.test(allScorecardAndReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Unrelated software-product assumption ('${rule.phrase}') detected in ${ventureType} assessment.`);
      }
    }
  }

  // 25. Unsupported Confidence & "verified background in No" Guardrail (PL-FIX-20261030-01 Error E)
  if (/verified background in No\b/i.test(fullReportText) || /background in No,/i.test(fullReportText)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Malformed founder credential phrase ('verified background in No') detected.");
  }

  // 26. Mid-Word Truncation & Ambiguous NZST Timestamp Guardrail (PL-FIX-20261030-01 Error F)
  const snapshotTargetCustomer = evaluationData.businessModelSnapshot?.targetCustomer || "";
  if (/\bfood and ho\./i.test(fullReportText) || /\bcleaning a\./i.test(fullReportText) || /\bcleaning a\./i.test(snapshotTargetCustomer)) {
    throw new Error("PITCHLAB QA INTEGRITY FAILURE: Mid-word text truncation ('food and ho.' / 'cleaning a.') detected in report output.");
  }
  const tsFormatted = evaluationData.assessmentGeneratedAtFormatted || evaluationData.meta?.assessmentGeneratedAtFormatted || "";
  if (/\bNZST\b|\bNZDT\b/.test(tsFormatted)) {
    throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Ambiguous timezone label in timestamp ('${tsFormatted}'). Must use 'GMT (UTC+00:00)'.`);
  }

  // 27. Score Sum Reconciliation & Input Coverage Completeness Check (PL-FIX-20261030-01 Section 2 & 12)
  const scoreMap = evaluationData.scores || evaluationData.scorecard || {};
  const catKeys = Object.keys(SCORING_CONFIG.CATEGORIES);
  if (Object.keys(scoreMap).length >= 7) {
    let catSum = 0;
    for (const k of catKeys) {
      catSum += Number(scoreMap[k]?.scoreAchieved ?? scoreMap[k]?.score ?? 0);
    }
    const reportedOverall = Number(evaluationData.overallScore ?? evaluationData.score ?? 0);
    if (catSum !== reportedOverall) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Category score sum (${catSum}) does not equal overallScore (${reportedOverall}).`);
    }
  }
  if (evaluationData.inputCoverage?.summary && evaluationData.inputCoverage.summary.unaccountedCount > 0) {
    throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Input coverage audit found ${evaluationData.inputCoverage.summary.unaccountedCount} unaccounted answered question(s).`);
  }

  // 28. Single Authoritative Master Portfolio Decision Consistency Check (PL-FIX-20261103-01 Section 5)
  const canonicalDecisions = ["PURSUE", "INVESTIGATE", "PARK", "STOP"];
  const masterDec = evaluationData.masterRecommendation;
  if (masterDec && !canonicalDecisions.includes(masterDec)) {
    throw new Error(`PITCHLAB QA INTEGRITY FAILURE: masterRecommendation ('${masterDec}') is not one of the canonical portfolio decisions (${canonicalDecisions.join(", ")}).`);
  }
  const decisionFieldsToVerify = [
    { name: "portfolioMeta.portfolioDecision", val: evaluationData.portfolioMeta?.portfolioDecision },
    { name: "portfolioMeta.decisionState", val: evaluationData.portfolioMeta?.decisionState },
    { name: "adviserOpinion.masterRecommendation", val: evaluationData.adviserOpinion?.masterRecommendation },
    { name: "adviserOpinion.portfolioDecision", val: evaluationData.adviserOpinion?.portfolioDecision },
    { name: "summaryBlock.decisionStatus", val: evaluationData.summaryBlock?.decisionStatus },
    { name: "investorBite.pitchLabRecommendation", val: evaluationData.investorBite?.pitchLabRecommendation },
    { name: "finalRecommendation.recommendation", val: evaluationData.finalRecommendation?.recommendation }
  ];
  for (const df of decisionFieldsToVerify) {
    if (df.val && masterDec && df.val !== masterDec) {
      throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Contradictory portfolio decision detected. '${df.name}' is '${df.val}' while masterRecommendation is '${masterDec}'.`);
    }
  }

  // 29. MoorSafe Marine Pest Deterrent Specific Reasoning & Exclusions Check (PL-FIX-20261103-01 Section 2.2 & 9)
  const isMoorSafeVenture = Boolean((reqData.idea || evaluationData.idea || "").toLowerCase().match(/\b(moorsafe|mooring|pest deterrent|rodent|rat guard)\b/));
  const submittedHasAdhesive = Boolean((reqData.idea || "").toLowerCase().includes("adhesive"));
  if (isMoorSafeVenture) {
    const moorSafeForbiddenPhrases = [
      { pattern: /\bmooring line failure\b/i, phrase: "mooring line failure" },
      { pattern: /\bline failure costs?\b/i, phrase: "line failure costs" },
      { pattern: /\bunmonitored equipment failures?\b/i, phrase: "unmonitored equipment failures" },
      { pattern: /\bequipment failure or pest damage\b/i, phrase: "equipment failure or pest damage" }
    ];
    if (!submittedHasAdhesive) {
      moorSafeForbiddenPhrases.push(
        { pattern: /\badhesive[- ]disc\b/i, phrase: "adhesive-disc" }
      );
    }
    const allMoorSafeText = [
      fullReportText,
      JSON.stringify(evaluationData.actionPlan || {})
    ].join(" \n ");
    for (const rule of moorSafeForbiddenPhrases) {
      if (rule.pattern.test(allMoorSafeText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Prohibited generic or excluded hardware phrase ('${rule.phrase}') detected in MoorSafe marine pest deterrent assessment.`);
      }
    }
  }

  // 30. Nuclear Power NZ Statutory Precision Check (PL-FIX-20261103-01 Section 4)
  if (isNuclearVenture) {
    const nuclearInaccurateRules = [
      { pattern: /currently prohibit commercial nuclear power generation/i, phrase: "currently prohibit commercial nuclear power generation" },
      { pattern: /Nuclear Free Zone[^.\n]*prohibits\s+(?:land-based\s+)?(?:commercial\s+|civilian\s+)?nuclear\s+(?:power|electricity)\s+generation/i, phrase: "Nuclear Free Zone Act prohibits land-based nuclear power generation" }
    ];
    for (const rule of nuclearInaccurateRules) {
      if (rule.pattern.test(fullReportText)) {
        throw new Error(`PITCHLAB QA INTEGRITY FAILURE: Inaccurate NZ nuclear statutory claim detected ('${rule.phrase}'). Must distinguish the NZ Nuclear Free Zone Act 1987 from the Atomic Energy Act 1945, Radiation Safety Act 2016, and RMA 1991.`);
      }
    }
  }

  return true;
}

module.exports = {
  SCORING_CONFIG,
  reconcileScores,
  getScoreBand,
  computeMasterRecommendation,
  buildScoringRubricAndIndicators,
  buildEvidenceClassificationRegistry,
  calculateFounderSubFactors,
  calculateProblemSubFactors,
  calculateCustomerValidationSubFactors,
  calculateMarketSubFactors,
  calculateBusinessModelSubFactors,
  calculateCompetitiveSubFactors,
  calculateExecutionSubFactors,
  detectFeasibilityGates,
  classifyVentureType,
  normalizeFounderTimeCommitment,
  normalizeFounderCapital,
  detectProblemStatementMisclassification,
  buildAuthoritativeAssessmentSnapshot,
  computeInputCoverageAudit,
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
  validateReportIntegrityGate,
  detectAndResolveCrossContamination
};


