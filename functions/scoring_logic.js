/**
 * PitchLab Scoring Configuration & Logic Engine (Master Fix)
 * Reconciles 7 scoring categories to an exact 100-point total and maps to Master Prompt score bands.
 * Automatically handles key aliases, scales 0-100 percentage scores, enforces credit separation,
 * and computes a single deterministic Master Recommendation across all web & PDF views.
 */

const SCORING_CONFIG = {
  CATEGORIES: {
    problemCustomerClarity: {
      max: 15,
      label: "Problem and customer clarity",
      aliases: ["ideaClarity", "problemStrength", "problemCustomerClarity"],
      defaultExplanation: "The core problem and target customer segment have been articulated based on founder inputs.",
      defaultMissing: "Direct customer confirmation of problem urgency and frequency.",
      defaultImprove: "Conduct structured discovery interviews with 10 target customers to validate root causes."
    },
    founderCapabilityFit: {
      max: 15,
      label: "Founder capability and fit",
      aliases: ["founderFit", "founderCapabilityFit", "founderExperience"],
      defaultExplanation: "Assesses relevant domain knowledge, professional background, and operational capability.",
      defaultMissing: "Demonstrated software product delivery or direct digital customer acquisition experience.",
      defaultImprove: "Partner with technical/product advisors and leverage professional network for early distribution."
    },
    customerValidation: {
      max: 20,
      label: "Customer validation",
      aliases: ["validationReadiness", "customerValidation"],
      defaultExplanation: "Evaluates empirical evidence including interviews, waitlists, pilot agreements, and revenue.",
      defaultMissing: "Structured customer interview logs, signed pilot commitments, or pre-orders.",
      defaultImprove: "Run a 4-week manual pilot program to capture direct behavioral evidence and feedback."
    },
    marketCommercialOpportunity: {
      max: 15,
      label: "Market and commercial opportunity",
      aliases: ["marketAttractiveness", "marketCommercialOpportunity"],
      defaultExplanation: "Evaluates target market accessibility, urgency of customer need, and growth potential.",
      defaultMissing: "Quantified target customer volume and verified willingness to pay.",
      defaultImprove: "Segment early adopters by willingness to pay and quantify initial addressable market size."
    },
    businessModelWillingnessToPay: {
      max: 15,
      label: "Business model and willingness to pay",
      aliases: ["businessModel", "businessModelWillingnessToPay"],
      defaultExplanation: "Assesses pricing structure, unit economics, revenue frequency, and cost to serve.",
      defaultMissing: "Direct pricing test data and customer commitment to proposed pricing terms.",
      defaultImprove: "Present concrete pricing options during pilot recruitment to test price sensitivity."
    },
    competitivePosition: {
      max: 10,
      label: "Competitive position",
      aliases: ["competitivePosition", "competition"],
      defaultExplanation: "Evaluates differentiation, switching costs, and current customer manual workarounds.",
      defaultMissing: "Deep competitor teardown and documented customer switching triggers.",
      defaultImprove: "Map existing manual workarounds and position product specifically against entrenched habits."
    },
    executionReadiness: {
      max: 10,
      label: "Execution readiness",
      aliases: ["mvpFeasibility", "executionReadiness"],
      defaultExplanation: "Assesses capital discipline, weekly time allocation, scope control, and operational plan.",
      defaultMissing: "Detailed MVP scope boundaries and staged 90-day validation roadmap.",
      defaultImprove: "Define strict non-negotiable MVP inclusions/exclusions and align roadmap with weekly hours."
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
 * Reconciles category scores and computes overall score, band, and master recommendation.
 * Automatically resolves category aliases, scales 0-100 percentage scores, and prevents incorrect zeroing.
 * @param {Object} rawCategories - Object containing scores for categories
 * @param {Object} rawInputs - Raw founder questionnaire inputs
 * @returns {Object} { overallScore, scoreBand, masterRecommendation, categoryScores, reconciled }
 */
function reconcileScores(rawCategories = {}, rawInputs = {}) {
  const categoryScores = {};
  let total = 0;

  for (const [key, config] of Object.entries(SCORING_CONFIG.CATEGORIES)) {
    // Look up by primary key or known aliases
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

    if (isNaN(num)) {
      num = 0;
    } else if (num > config.max) {
      // AI outputted a 0-100 percentage score (e.g. 80 for a 15-max category -> 12/15)
      num = Math.round((num / 100) * config.max);
    }

    // Heuristic credit fallback if AI failed to award points despite strong founder inputs
    if (key === 'founderCapabilityFit' && num < 6) {
      const exp = (rawInputs.founderExperience || rawInputs.experience || '').toLowerCase();
      const ind = (rawInputs.industryExperience || '').toLowerCase();
      if (exp.includes('20+') || exp.includes('10+') || exp.includes('ca') || exp.includes('accounting') || exp.includes('expert') || ind.length > 5) {
        num = Math.max(num, 10); // Award credit for founder domain background
      }
    }
    if (key === 'problemCustomerClarity' && num < 6) {
      const problem = (rawInputs.problem || '').trim();
      if (problem.length > 25) {
        num = Math.max(num, 9); // Award credit for clear problem description
      }
    }

    const validNum = Math.max(0, Math.min(config.max, Math.round(num)));

    categoryScores[key] = {
      scoreAchieved: validNum,
      maxScore: config.max,
      label: config.label,
      evidenceLevel: rawObj.evidenceLevel || (validNum > config.max * 0.7 ? "Strong Evidence" : validNum > config.max * 0.3 ? "Partial Evidence" : "Not yet evidenced"),
      explanation: (rawObj.assessment || rawObj.explanation || config.defaultExplanation).trim(),
      missingEvidence: (rawObj.missingEvidence || config.defaultMissing).trim(),
      howToImprove: (rawObj.improvementAction || rawObj.howToImprove || config.defaultImprove).trim()
    };
    total += validNum;
  }

  const overallScore = Math.max(0, Math.min(100, Math.round(total)));
  const scoreBand = getScoreBand(overallScore);
  const masterRecommendation = computeMasterRecommendation(overallScore, categoryScores, rawInputs);

  return {
    overallScore,
    scoreBand,
    masterRecommendation,
    categoryScores,
    reconciled: true
  };
}

/**
 * Computes a single deterministic Master Recommendation across the entire application.
 * @param {number} score 
 * @param {Object} categoryScores 
 * @param {Object} rawInputs 
 * @returns {string} One of the 7 Master Recommendation strings
 */
function computeMasterRecommendation(score, categoryScores = {}, rawInputs = {}) {
  const customerValidationScore = categoryScores.customerValidation?.scoreAchieved || 0;
  const founderScore = categoryScores.founderCapabilityFit?.scoreAchieved || 0;
  const problemScore = categoryScores.problemCustomerClarity?.scoreAchieved || 0;

  if (score >= 85 && customerValidationScore >= 14) {
    return "Proceed";
  }
  if (score >= 70 && customerValidationScore >= 8) {
    return "Proceed with Controlled Validation";
  }
  if (score >= 40 || (founderScore >= 8 && problemScore >= 8)) {
    return "Validate Before Building";
  }
  if (problemScore < 5) {
    return "Refine the Concept";
  }
  return "Validate Before Building";
}

/**
 * Gets score band metadata for a given score.
 * @param {number} score 
 * @returns {Object} { name, meaning }
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

module.exports = {
  SCORING_CONFIG,
  reconcileScores,
  getScoreBand,
  computeMasterRecommendation,
  calculateFRI
};
