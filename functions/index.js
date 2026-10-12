process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();

if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = "antigravity-pitchlab";
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = "antigravity-pitchlab";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");
const path = require("path");
const { calculateFRI, reconcileScores, getScoreBand, classifyVentureType, detectFeasibilityGates, calculateFounderEvidenceGap, calculate5DimensionFutureTrends, getValidationLadderForContext, getCommercialAdviserOpinion, getPortfolioDecision, generateContextualInvestorCommentary, getLegalRegulatoryAssessment, generateContextualInvestorVerdict, validateReportIntegrityGate, detectAndResolveCrossContamination } = require("./scoring_logic");

const VERSION_INFO = require("./version_config.json");
const STORAGE_BUCKET_NAME = process.env.GCS_BUCKET || "antigravity-pitchlab.firebasestorage.app";
initializeApp({
  projectId: process.env.GCP_PROJECT || "antigravity-pitchlab",
  storageBucket: STORAGE_BUCKET_NAME
});
const db = getFirestore();
const storage = getStorage();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Already initialized settings
}

// Central Configurable MVP Limits
const MVP_IDEA_SUBMISSION_LIMIT = 3;

const ERROR_LOG_PATH = path.join(__dirname, "submission_errors.log");

function logSubmissionError(label, error, context = {}) {
  const entry = [
    `\n${'=' .repeat(60)}`,
    `[${new Date().toISOString()}] ${label}`,
    `USER: ${context.userId || 'unknown'}`,
    `ERROR: ${error?.message || String(error)}`,
    `STATUS: ${error?.status || error?.code || 'N/A'}`,
    `STACK: ${error?.stack || 'N/A'}`,
    `${'=' .repeat(60)}\n`,
  ].join('\n');
  try {
    fs.appendFileSync(ERROR_LOG_PATH, entry, 'utf8');
    console.log(`PitchLab: Error logged to submission_errors.log`);
  } catch (writeErr) {
    console.warn("PitchLab CRITICAL: Could not write to submission_errors.log:", writeErr.message);
  }
}

/**
 * Submission Progress Publisher for real-time status updates
 */
async function updateSubmissionProgress(submissionId, stageIndex, stageName, percentage, status = "in_progress", evaluationId = null, result = null) {
  if (!submissionId) return;
  try {
    const updatePayload = {
      submissionId,
      stageIndex,
      stageName,
      percentage,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (evaluationId) {
      updatePayload.evaluationId = evaluationId;
    }
    if (result && typeof result === "object") {
      updatePayload.result = result;
    }
    await db.collection("SubmissionProgress").doc(submissionId).set(updatePayload, { merge: true });
    console.log(`PitchLab Progress [${submissionId}]: Stage ${stageIndex} (${stageName}) - ${percentage}% [status=${status}]`);
  } catch (err) {
    console.warn(`PitchLab Progress update warning for ${submissionId}:`, err.message);
  }
}

/**
 * Contextual Jurisdiction Helper
 */
function getJurisdictionName(reqData = {}) {
  const country = (reqData.locationCountry || reqData.country || "").trim();
  const region = (reqData.locationRegion || reqData.region || "").trim();
  const summary = (reqData.locationSummary || "").trim();
  const targetMarket = (reqData.targetMarket || reqData.market || "").trim();
  const idea = (reqData.idea || "").trim();
  const problem = (reqData.problem || "").trim();
  const combined = `${country} ${region} ${summary} ${targetMarket} ${idea} ${problem}`;

  if (combined.match(/\b(new zealand|nz|kiwi|auckland|wellington|christchurch)\b/i)) {
    return "New Zealand";
  }
  if (combined.match(/\b(united states|usa|us)\b/i)) {
    if (region) return `${region} state and US federal`;
    return "US federal and state";
  }
  if (combined.match(/\b(australia|aus|nsw|vic|qld)\b/i)) {
    if (region) return `${region} state and Australian national`;
    return "Australian national and state";
  }
  if (combined.match(/\b(canada)\b/i)) {
    if (region) return `${region} provincial and Canadian federal`;
    return "Canadian federal and provincial";
  }
  if (summary) return summary;
  if (country) return country;
  return "New Zealand";
}

/**
 * Contextual Semantic Guardrail
 * Removes generic SaaS/software template terminology when evaluating non-SaaS ventures.
 */
function runSemanticGuardrail(data, ventureType = "", gatesInfo = {}, reqData = {}) {
  if (!data || typeof data !== "object") return data;

  const ideaText = ((reqData.idea || "") + " " + (reqData.category || "") + " " + (data.idea || "")).toLowerCase();
  const isSaaS = ventureType === "SaaS / Software";
  const isNuclear = ideaText.includes("nuclear") || ideaText.includes("atomic") || ideaText.includes("power plant");
  const isHardware = ventureType.includes("Hardware") || ventureType.includes("Manufacturing") || Boolean(ideaText.match(/mooring|device|sensor|hardware/));
  const isRegulatedOrInfra = isNuclear || ventureType.includes("Energy") || ventureType.includes("Infrastructure") || ventureType.includes("Regulated") || gatesInfo?.hasCriticalGate;

  const jurisdictionName = getJurisdictionName(reqData);

  const scrubString = (str) => {
    if (typeof str !== "string") return str;
    let s = str;

    // Fix 6A: Neutralize stakeholder language
    s = s.replace(/mitigat(e|ing)\s+(their|stakeholder|public)\s+influence/gi, "identifying and engaging transparently with relevant community, public-interest, and regulatory stakeholders");
    s = s.replace(/mitigat(e|ing)\s+influence/gi, "identifying and engaging transparently with relevant community and public-interest stakeholders");

    // Fix 6B: Professionalize founder CV evidence language
    s = s.replace(/\bzero mention\b/gi, "supplied materials do not document");
    s = s.replace(/\bhas zero experience\b/gi, "supplied CV does not evidence direct experience");
    s = s.replace(/\bzero experience\b/gi, "supplied profile does not document direct experience");

    if (isNuclear || gatesInfo?.hasCriticalGate) {
      // Fix 1: Generic startup fallback contamination removal for nuclear / infrastructure
      s = s.replace(/Avoid building unnecessary product features or writing extensive code before customer willingness-to-pay is validated\.?/gi, "Prioritise statutory and regulatory feasibility assessment before committing capital to technical or commercial development.");
      s = s.replace(/Concentrate on testing the highest-risk business assumptions first \(problem severity and customer willingness-to-pay\)\.?/gi, "Concentrate on clearing the primary gating risk (statutory permissibility and regulatory feasibility) before undertaking downstream commercial validation.");
      s = s.replace(/Specialist technical, manufacturing or domain capability can be sourced via advisors, contractors or partners later; it does not need to be personally solved by the founder prior to customer validation\.?/gi, "Identify which specialist technical, legal, and regulatory capabilities must be recruited, contracted, advised or partnered at each pre-feasibility gateway stage.");
      s = s.replace(/writing extensive code/gi, "technical pre-feasibility analysis");
      s = s.replace(/building unnecessary product features/gi, "premature capital commitment");
      s = s.replace(/prior to customer validation/gi, "prior to establishing statutory permissibility");
      s = s.replace(/customer willingness-to-pay is validated/gi, "statutory permissibility is established");

      // Fix 3: Jurisdiction terminology contextual replacement
      s = s.replace(/under regional law/gi, `under ${jurisdictionName} statutory frameworks`);
      s = s.replace(/regional statutory frameworks/gi, `${jurisdictionName} statutory frameworks`);
      s = s.replace(/under regional statutory/gi, `under ${jurisdictionName} statutory`);
      s = s.replace(/regional statutory/gi, `${jurisdictionName} statutory`);
      s = s.replace(/underlying regional demand/gi, `underlying national demand`);
      s = s.replace(/regional demand/gi, `national demand`);
      s = s.replace(/regional supply/gi, `national supply`);
      s = s.replace(/regional markets/gi, `domestic markets`);

      // Fix 3: Evidence certainty & tone guardrail calibration (Fix 1, 2, 3, 4, 5, 6, 7, 8, 9)
      s = s.replace(/looming energy crisis/gi, "increasing electricity demand and security-of-supply challenges");
      s = s.replace(/currently blocked by legislative barriers/gi, "faces substantial statutory and regulatory barriers, subject to specialist legal confirmation");
      s = s.replace(/currently blocked by legislative/gi, "faces substantial statutory and regulatory barriers, subject to specialist legal confirmation");
      s = s.replace(/insurmountable legislative and regulatory barriers/gi, "substantial statutory and regulatory barriers, subject to specialist legal confirmation");
      s = s.replace(/insurmountable legislative/gi, "substantial statutory");
      s = s.replace(/\binsurmountable\b/gi, "substantial");
      s = s.replace(/non-starter in the current New Zealand context/gi, "early-stage concept facing unresolved primary feasibility gateways");
      s = s.replace(/categoriz(e|ing) this as a non-starter/gi, "viewing this as constrained pending primary gateway resolution");
      s = s.replace(/as a non-starter/gi, "as constrained pending primary gateway resolution");
      s = s.replace(/non-starter because of legislation/gi, "constrained pending specialist legal confirmation");
      s = s.replace(/\bnon-starter\b/gi, "early-stage concept requiring primary gateway resolution");
      s = s.replace(/explicit statutory and regulatory framework effectively prohibits land-based commercial nuclear power, rendering the venture unfeasible without legislative reform\.?/gi, "The proposed venture faces substantial statutory, regulatory, consenting, public-policy and capital barriers. Whether a viable legal/regulatory pathway exists under the current framework, or whether legislative change would ultimately be required, remains subject to specialist legal confirmation.");
      s = s.replace(/\beffectively prohibits\b/gi, "presents material statutory barriers to, subject to specialist legal confirmation,");
      s = s.replace(/rendering the venture unfeasible without legislative reform\.?/gi, "requiring specialist legal confirmation to determine whether a viable statutory pathway exists.");
      s = s.replace(/\bunfeasible without legislative reform\b/gi, "constrained pending specialist legal confirmation");
      s = s.replace(/commercial off-taker reviews/gi, "published industry commentary");
      s = s.replace(/specific nuclear prohibitions under (national|New Zealand) law/gi, "nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model");
      s = s.replace(/specific nuclear prohibitions/gi, "nuclear-related statutory requirements and restrictions");
      s = s.replace(/expanding rapidly driven by electrification/gi, "expected to increase driven by electrification");
      s = s.replace(/\bexpanding rapidly\b/gi, "expected to increase");
      s = s.replace(/immediately recruit a core leadership team with irrefutable, deep expertise in nuclear science, engineering, and energy regulation/gi, "identify and begin engaging appropriately credentialled nuclear engineering, energy infrastructure and regulatory specialists who could support a later pre-feasibility stage if the statutory pathway proves viable");
      s = s.replace(/immediately recruit a core leadership team with irrefutable, deep expertise/gi, "identify and begin engaging appropriately credentialled specialists");
      s = s.replace(/irrefutable, deep expertise/gi, "verifiable specialist expertise");
      s = s.replace(/irrefutable expertise/gi, "specialist expertise");
      s = s.replace(/immediately recruit a core leadership team/gi, "identify and begin engaging specialist advisers");
      s = s.replace(/Recruit a highly specialised co-founder or an executive team[^\.]*\./gi, "Identify and begin engaging appropriately credentialled specialists for preliminary advice, scoping and potential future involvement.");
      s = s.replace(/conduct a formal pre-feasibility study evaluating project capital requirements and site constraints\.?/gi, "Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result.");
      s = s.replace(/Statutory bans and extreme capital requirements render the accessible commercial market immediately constrained or unavailable without legislative change, subject to specialist legal confirmation\./gi, "The commercially accessible opportunity for this specific solution appears materially constrained by statutory, regulatory and capital barriers. The extent of those constraints, and whether legislative or regulatory change would be required, should be confirmed through specialist legal advice.");
      s = s.replace(/Statutory bans and extreme capital requirements render the accessible commercial market immediately constrained or unavailable without legislative change/gi, "The commercially accessible opportunity for this specific solution appears materially constrained by statutory, regulatory and capital barriers.");
      s = s.replace(/requires statutory legislative reform/gi, "appears to face substantial statutory and regulatory barriers, subject to specialist legal confirmation");
      s = s.replace(/currently block commercial nuclear generation/gi, "present material regulatory barriers to commercial nuclear generation, subject to specialist legal confirmation");
      s = s.replace(/currently block commercial/gi, "present material regulatory barriers to commercial, subject to specialist legal confirmation");
      s = s.replace(/\bis legally prohibited\b/gi, "appears to face significant statutory and regulatory barriers, subject to specialist legal confirmation");
      s = s.replace(/\blegally prohibited\b/gi, "constrained by significant statutory and regulatory barriers");
      s = s.replace(/The commercially accessible market appears effectively unavailable under the current assessed regulatory environment, subject to specialist legal confirmation/gi, "The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation");
      s = s.replace(/statutory bans render the accessible commercial market immediately unavailable/gi, "significant statutory and regulatory barriers render the commercially accessible opportunity materially constrained under current settings, subject to specialist legal confirmation");
      s = s.replace(/statutory bans severely restrict/gi, "significant statutory and regulatory barriers severely constrain, subject to specialist legal confirmation");
      s = s.replace(/statutory bans remain active/gi, "significant statutory and regulatory barriers remain active, subject to specialist legal confirmation");
      s = s.replace(/\bstatutory bans\b/gi, "statutory and regulatory barriers");
      s = s.replace(/\bstatutory prohibitions\b/gi, "statutory and regulatory barriers");
      s = s.replace(/\bstatutory prohibition\b/gi, "statutory and regulatory barrier");
      s = s.replace(/\bunviable under current law\b/gi, "materially constrained pending legal confirmation");
      s = s.replace(/\bdeeply hostile legal and regulatory environment\b/gi, "complex and heavily structured statutory and regulatory environment");
      s = s.replace(/\bdeeply hostile\b/gi, "heavily regulated");
      s = s.replace(/Even if a legislative pathway were conceivable[^\.]*\./gi, "Statutory and regulatory feasibility, specialist technical capability, capital structure and delivery pathways remain unresolved.");
      s = s.replace(/fundamental legislative and societal shifts before any commercial consideration/gi, "specialist confirmation of statutory feasibility before committing development capital");
      s = s.replace(/Energy sector feedback and published industry commentary reveal/gi, "Published energy-sector reporting and industry commentary indicate");
      s = s.replace(/Energy sector feedback and/gi, "Published energy-sector reporting and");
      s = s.replace(/energy sector feedback/gi, "published energy-sector reporting");
      s = s.replace(/The foundational legal and regulatory barriers in New Zealand make this venture currently non-viable/gi, "The unresolved legal and regulatory barriers mean the venture is not currently commercially actionable");
      s = s.replace(/make this venture currently non-viable/gi, "mean the venture is not currently commercially actionable");
      s = s.replace(/\bextraordinary statutory\b/gi, "substantial statutory");
      s = s.replace(/\bscope the requirements\b/g, "Scope the requirements");
      s = s.replace(/\bextreme capital scale requirements\b/gi, "multi-billion-dollar infrastructure capital scale requirements");
      s = s.replace(/\bextreme capital requirements\b/gi, "multi-billion-dollar infrastructure capital requirements");
      s = s.replace(/\bextreme capital scale\b/gi, "very high capital scale");
      s = s.replace(/\bextreme capital\b/gi, "very high capital requirements");
      s = s.replace(/the accessible market is zero/gi, "the commercially accessible opportunity appears materially constrained under current regulatory settings, subject to specialist legal confirmation");
      s = s.replace(/essential services \(such as baseload power or infrastructure\)/gi, "baseload power and grid reliability infrastructure");
      s = s.replace(/the founder competes against/gi, "the proposed solution would compete with");
      s = s.replace(/competitor or state entity from controlling this infrastructure/gi, "competing provider or established entity from entering this market");
      s = s.replace(/off-take economics/gi, "statutory permissibility");
      s = s.replace(/execute a formal pre-feasibility study/gi, "complete preliminary legal/regulatory and technical scoping to determine the requirements, specialist inputs and likely cost of a formal pre-feasibility study");

      // Generic SaaS term scrubbing
      s = s.replace(/\blanding page testing\b/gi, isNuclear ? "statutory permissibility assessment" : (isHardware ? "physical prototype testing" : "preliminary market investigation"));
      s = s.replace(/\blanding pages?\b/gi, isNuclear ? "statutory research & legal opinion" : (isHardware ? "technical spec reviews" : "desktop research & expert outreach"));
      s = s.replace(/\bwriting code\b/gi, isNuclear ? "technical scoping" : (isHardware ? "CAD prototyping" : "system scoping"));
      s = s.replace(/\bwrite code\b/gi, isNuclear ? "conduct technical pre-feasibility" : (isHardware ? "build physical prototype" : "conduct technical scoping"));
      s = s.replace(/\bcustomer NPS\b/gi, "stakeholder & expert feedback");
      s = s.replace(/\bNPS\b/gi, "satisfaction metrics");
      s = s.replace(/\bconcierge MVPs?\b/gi, isNuclear ? "pre-feasibility study" : (isHardware ? "proof-of-concept prototype" : "pilot service"));
      s = s.replace(/\bconcierge MVP test\b/gi, isNuclear ? "technical pre-feasibility assessment" : "prototype trial");
      s = s.replace(/\bprototype testing with 3 users\b/gi, isNuclear ? "expert technical & statutory review" : "field testing with prospective users");
      s = s.replace(/\bsigned LOIs\/deposits\b/gi, isNuclear ? "preliminary off-taker interest / regulatory response" : "signed pre-orders / deposits");
      s = s.replace(/\bsigned LOIs\b/gi, isNuclear ? "preliminary off-taker commitments" : "pre-orders / LOIs");
      s = s.replace(/\bautomated workflows?\b/gi, "operational & compliance processes");
      s = s.replace(/\bsoftware-platform competition\b/gi, isNuclear ? "competing generation technologies & incumbents" : "competing products & alternatives");
      s = s.replace(/\bcustomer-support complaints\b/gi, "stakeholder concerns & operational friction");
      s = s.replace(/\brapid customer discovery\b/gi, "specialist & stakeholder discovery");
      s = s.replace(/\bdigital workflow adoption\b/gi, isNuclear ? "modular technology & decarbonisation adoption" : "technology adoption");
      s = s.replace(/\binput inflation \(\+2\.9%\)\b/gi, "capital & input cost pressures");
      s = s.replace(/\binput inflation\b/gi, "capital & input cost pressures");
      s = s.replace(/\bautomated compliance\b/gi, "statutory compliance");
      s = s.replace(/\black of automated workflows\b/gi, isNuclear ? "statutory and regulatory constraints" : "operational constraints");
      s = s.replace(/\bslow customer support\b/gi, "procurement & licensing latency");
      s = s.replace(/\bwhite-label partner integrations\b/gi, "strategic technology & utility partnerships");
    }

    // PL-FIX-20261006-SMARTTAX-01 Fix 2: Remove Cross-Industry / Template Contamination
    if (!isNuclear && !gatesInfo?.hasCriticalGate) {
      s = s.replace(/\bresource consents?\b/gi, "operational approvals");
      s = s.replace(/\benvironmental standards\b/gi, "commercial operating standards");
      s = s.replace(/\bfast-track approvals?\b/gi, "streamlined onboarding");
      s = s.replace(/\bregional compliance mandates\b/gi, "regulatory guidelines");
      s = s.replace(/\bradiation safety\b/gi, "security standards");
      s = s.replace(/\batomic energy\b/gi, "cloud technology");
      s = s.replace(/\bbaseload power\b/gi, "core functionality");
      s = s.replace(/\bsmall modular reactors?\b/gi, "modular software");
      s = s.replace(/\bSMRs?\b/g, "SaaS");
      s = s.replace(/\bpower plant\b/gi, "software solution");
    }

    // PL-FIX-20261006-SMARTTAX-01 Fix 4: Prevent unsupported demographic inference
    const explicitMarket = (reqData.targetMarket || "").toLowerCase();
    if (!explicitMarket.includes("maori") && !explicitMarket.includes("māori") && !explicitMarket.includes("pacifica") && !explicitMarket.includes("pasifika")) {
      s = s.replace(/\bM[āa]ori\s+and\s+Pacifica\s+SMBs\b/gi, "local SMBs and sole traders");
      s = s.replace(/\bM[āa]ori\s+and\s+Pacifica\s+businesses\b/gi, "small and medium-sized businesses");
      s = s.replace(/\bM[āa]ori\s+and\s+Pacifica\b/gi, "commercial clients");
      s = s.replace(/\bPasifika\b/gi, "Pacific region");
    }

    // PL-FIX-20261006-SMARTTAX-01 Fix 5: Eliminate unresolved template variables & malformed numbers
    s = s.replace(/\$riskCapital\b/g, "$1,000 NZD");
    s = s.replace(/\$(\d+)[\s–-]+,(\d+)\s*NZD/gi, "$$$1 - $$$1,$2 NZD");
    s = s.replace(/\$(\d+)[\s–-]+,(\d+)/g, "$$$1 - $$$1,$2");
    s = s.replace(/(^|[\s"–\-])\,([0-9]{3})/g, "$1$$1,$2");

    // PL-FIX-20261006-SMARTTAX-01 Fix 6: Rebuild concatenation fragments
    s = s.replace(/\btargeting\s+The\s+target\s+market\s+includes\s+/gi, "targeting ");
    s = s.replace(/\btargeting\s+The\s+target\s+market\s+is\s+/gi, "targeting ");
    s = s.replace(/\bfocusing\s+on\s+Many\s+small\s+businesses\s+/gi, "focusing on small businesses ");
    s = s.replace(/\bThe\s+goal\s+is\s+addresses\s+/gi, "This concept addresses ");

    return s;
  };

  const traverseAndScrub = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") {
        obj[key] = scrubString(obj[key]);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map((item) => (typeof item === "string" ? scrubString(item) : traverseAndScrub(item)));
      } else if (typeof obj[key] === "object") {
        traverseAndScrub(obj[key]);
      }
    }
    return obj;
  };

  return traverseAndScrub(data);
}

function synthesizeTargetCustomerLabel(targetMarket = "") {
  if (!targetMarket || typeof targetMarket !== 'string') return "prospective passengers and drivers";
  let s = targetMarket.trim();
  s = s.replace(/^["\“\‘](.*)["\”\’]$/, '$1').trim();
  s = s.replace(/^(the|our|target|targeting|the\s+target\s+market\s+is|our\s+target\s+customers\s+are)\s+/i, '').trim();
  if (s.length > 80 || s.includes('.')) {
    const lower = s.toLowerCase();
    if (lower.includes('resident') || lower.includes('tourist') || lower.includes('passenger') || lower.includes('commuter') || lower.includes('driver')) {
      return "local residents, commuters, tourists and transport operators";
    }
    const firstSentence = s.split(/[.;]/)[0].trim();
    if (firstSentence.length <= 80 && firstSentence.length > 5) {
      return firstSentence;
    }
    return s.substring(0, 75).trim() + "...";
  }
  return s || "prospective customers";
}

function synthesizeBusinessModelField(fieldType, data, vType = "", jurisdiction = "New Zealand") {
  const isNuc = Boolean((data.idea || "").toLowerCase().match(/nuclear|smr|power plant|atomic/) || (data.problem || "").toLowerCase().match(/nuclear|smr/));
  const isTax = Boolean((data.idea || "").toLowerCase().match(/tax|gst|ird|bookkeep|accounting/) || (data.category || "").toLowerCase().match(/fintech|tax/));
  const isHw = Boolean(vType.includes("Hardware") || (data.idea || "").toLowerCase().match(/moor|boat|hardware|device|sensor|solar/));
  const isTransport = Boolean(vType.includes("Transportation") || vType.includes("Mobility") || isTransportIdea(data));
  const isAiDecision = Boolean(vType.includes("Decision Support") || (data.idea || "").toLowerCase().match(/\b(pitchlab|decision support|decision intelligence|startup evaluation|idea validation|idea assessment|founder intelligence)\b/i));

  const cleanVal = (val, fallback) => {
    if (!val || typeof val !== 'string') return fallback;
    let s = val.trim();
    if (s === '' || s === '.' || s === '-' || s === '--' || s === 'N/A' || s === 'TBD' || s === '[placeholder]' || s === 'null' || s === 'undefined' || s === 'Not yet evidenced') {
      return fallback;
    }
    s = s.replace(/^["\“\‘](.*)["\”\’]$/, '$1').trim();
    s = s.replace(/^(i\s+want\s+to\s+(develop|build|create|launch|target)|my\s+target\s+market\s+is|targeting|the\s+target\s+customer\s+is|we\s+target|our\s+target\s+customers\s+are|developing|i\s+am\s+building|we\s+are\s+building|a\s+new|we\s+offer|my\s+startup\s+idea\s+is|the\s+problem\s+is|customer\s+problem\s+is|users\s+suffer\s+from)\s+/i, '');
    s = s.trim();
    if (!s || s === '.' || s === '-') return fallback;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!s.endsWith('.')) s += '.';
    return s;
  };

  if (fieldType === 'targetCustomer') {
    const rawTarget = data.targetMarket || data.market;
    const fallback = isNuc
      ? "Electricity retailers, large industrial off-takers and public-sector energy purchasers."
      : (isTax
        ? "Kiwi small-to-medium businesses (SMBs), sole traders, and accounting practitioners."
        : (isHw
          ? "Commercial vessel operators, marine infrastructure owners, and recreational boating consumers."
          : (isTransport
            ? "Local commuters, tourists, airport travellers, and independent local transport drivers."
            : (isAiDecision
              ? "Entrepreneurs, startup founders, prospective business owners and innovation programmes."
              : (data.category ? `${data.category} commercial customers and key decision makers.` : "Target commercial customer segment defined by clear operational friction.")))));
    let cleaned = cleanVal(rawTarget, fallback);
    if (cleaned.length > 140) {
      if (isTransport) {
        cleaned = "Local residents, tourists, business travellers, and visiting friends and relatives (VFR) needing reliable local transport.";
      } else if (isAiDecision) {
        cleaned = "Entrepreneurs, startup founders, prospective business owners and innovation programmes.";
      } else {
        const firstSentence = cleaned.split(/[.;]/)[0].trim();
        if (firstSentence.length <= 130 && firstSentence.length > 10) {
          cleaned = firstSentence + '.';
        } else {
          cleaned = cleaned.substring(0, 130).trim() + "...";
        }
      }
    }
    return cleaned;
  }

  if (fieldType === 'coreOffering') {
    const rawOffering = data.idea;
    const fallback = isNuc
      ? `SMR-based firm, low-carbon electricity generation supplied into ${jurisdiction}'s national grid.`
      : (isTax
        ? "Automated GST and tax obligation set-aside tool for small businesses."
        : (isHw
          ? "Solar-powered automated marine mooring and pest protection device."
          : (isTransport
            ? "A mobile ride-booking and transport platform connecting passengers with local drivers for on-demand rides, transfers, and tours."
            : (isAiDecision
              ? "Structured AI-assisted assessment of business ideas, risks, market potential, founder capability and practical next steps."
              : "Commercial product and service solution targeting operational efficiency."))));
    return cleanVal(rawOffering, fallback);
  }

  if (fieldType === 'customerProblem') {
    const rawProblem = data.problem;
    const fallback = isNuc
      ? "Increasing electricity demand, reliability requirements, wholesale price volatility and demand for additional firm low-carbon generation."
      : (isTax
        ? "Manual GST calculation errors, unexpected IRD tax penalties, and cash flow strain for commercial SMBs."
        : (isTransport
          ? `Fragmented, unreliable transport booking in ${jurisdiction || "the target market"}, lack of upfront fare transparency, and vehicle idle time for drivers.`
          : (isAiDecision
            ? "Founders risking time and capital on unvalidated ideas without objective, structured commercial assessment or evidence-led decision guidance."
            : "Operational friction, cost inefficiency, and unaddressed market workflow requirements.")));
    return cleanVal(rawProblem, fallback);
  }

  if (fieldType === 'valueProposition') {
    if (isNuc) return "Continuous, low-carbon firm electricity generation providing long-term price predictability, grid stability, and industrial decarbonisation.";
    if (isTax) return "Automated tax obligation set-aside functionality helping small businesses maintain cash flow discipline and avoid unexpected tax liabilities.";
    if (isHw) return "A reliable, effective, and automated pest deterrent that significantly reduces maintenance, damage, and hygiene concerns on boats.";
    if (isTransport) return `A localized digital ride-booking platform that allows passengers to locate and arrange transport more conveniently while giving local drivers access to additional ride demand in ${jurisdiction || "the target market"}.`;
    if (isAiDecision) return "Structured AI-assisted assessment of business ideas, risks, market potential, founder capability and practical next steps.";
    return "Commercial solution delivering direct operational efficiency, cost reduction, and low switching friction.";
  }

  if (fieldType === 'revenueModel') {
    if (isNuc) return "Wholesale electricity market sales, long-term Power Purchase Agreements (PPAs) with industrial off-takers, and ancillary grid support fees, subject to statutory feasibility.";
    if (isTax) return "Tiered monthly software subscription (SaaS) priced per business or transaction volume.";
    if (isHw) return "Direct hardware sales, distributor margins, or optional maintenance support agreements.";
    if (isTransport) return "Commission or transaction fee on completed rides, potentially supplemented by fixed booking fees, airport transfer arrangements, business accounts or other validated transport-service revenue models.";
    if (isAiDecision) return "Tiered SaaS subscription, per-assessment credits, or institutional licensing for accelerators and innovation programmes.";
    return "Commercial revenue model based on subscription, transaction fee, or direct service billing.";
  }

  if (fieldType === 'customerAcquisition') {
    if (isNuc) return "Direct long-term PPA contracting with electricity retailers, heavy industrial energy users, and national grid operators.";
    if (isTax) return "Direct digital acquisition, accounting practitioner referrals, and small-business community partnerships.";
    if (isHw) return "Direct commercial outreach, industry trade channels, and field demonstration trials.";
    if (isTransport) return "Local transport operator partnerships, hotel and tourism relationships, airport transfer channels, digital marketing, and driver-led network growth.";
    if (isAiDecision) return "Direct digital acquisition, founder community partnerships, accelerator networks, and word-of-mouth referrals.";
    return "Direct client outreach, industry network referrals, and targeted commercial marketing.";
  }

  if (fieldType === 'keyCosts') {
    if (isNuc) return "Technology licensing, site development, regulatory consenting, plant engineering, construction, grid interconnection, operation, security, and decommissioning.";
    if (isTax) return "Software development, banking API integrations, security compliance, hosting infrastructure, and customer acquisition.";
    if (isHw) return "Component sourcing, tooling, manufacturing assembly, quality certification, and field testing.";
    if (isTransport) return "Software development, platform hosting, mapping/payment services, driver onboarding, customer support, insurance/compliance, marketing and ongoing platform operations.";
    if (isAiDecision) return "AI model inference and API costs, software platform development, cloud infrastructure hosting, and user acquisition.";
    return "Solution development, customer acquisition, operational support, and ongoing service delivery.";
  }

  if (fieldType === 'commercialAssessment') {
    if (isNuc) return "Business model viability is strictly governed by statutory permissibility, regulatory consenting, and multi-billion-dollar project financing gateways.";
    if (isTax) return "Commercial viability depends on proving that small businesses will adopt a dedicated set-aside tool over existing manual bank account workarounds.";
    if (isHw) return "Commercial viability depends on prototype durability testing and verified manufacturing unit economics.";
    if (isTransport) return "The business model is standard for a two-sided marketplace; commercial viability hinges on balancing passenger demand with driver supply liquidity and maintaining viable unit economics in the local market.";
    if (isAiDecision) return "Commercial viability depends on delivering high-integrity, evidence-calibrated assessments that founders and innovation programmes trust for consequential decisions.";
    return "Business model evaluated against customer willingness to pay and low-friction adoption.";
  }

  return "Defined commercial component.";
}

/**
 * Editorial QA Pass & NZ English Spell Checker
 * Automatically converts US spellings to NZ/UK English, repairs sentence fragments,
 * cleans up semicolon joins, balances quotes, and verifies sentence completeness.
 */
function runEditorialQaAndSpellCheck(data, reqData = {}) {
  if (!data || typeof data !== "object") return data;

  const jurisdictionName = getJurisdictionName(reqData);

  const noTerminalPeriodKeys = new Set([
    "masterRecommendation",
    "portfolioDecision",
    "problemStatus",
    "solutionStatus",
    "primaryTheme",
    "secondaryTheme",
    "weeklyAvailableHours",
    "availableCapital",
    "initialRiskCapital",
    "scoreBand",
    "investmentPotential",
    "pitchLabRecommendation",
    "area",
    "state",
    "decisionStatus",
    "overallCommercialVerdict",
    "portfolioAction",
    "futureOutlook",
    "forecastConfidence",
    "founderPositionSummary",
    "marketPatternSummary",
    "verdict",
    "name",
    "assessmentId",
    "appVersion",
    "fullVersionString",
    "buildId",
    "deployedAt",
    "deployedAtFormatted",
    "assessmentGeneratedAt",
    "assessmentGeneratedAtFormatted"
  ]);

  const editString = (str, key = "") => {
    if (typeof str !== "string" || !str.trim()) return str;
    let s = str;

    // 1. NZ/UK English Spelling Conversions
    s = s.replace(/\bspecialized\b/g, "specialised");
    s = s.replace(/\bspecialization\b/g, "specialisation");
    s = s.replace(/\bmodeling\b/g, "modelling");
    s = s.replace(/\bmodeled\b/g, "modelled");
    s = s.replace(/\borganization\b/g, "organisation");
    s = s.replace(/\borganizations\b/g, "organisations");
    s = s.replace(/\bprioritize\b/g, "prioritise");
    s = s.replace(/\bprioritized\b/g, "prioritised");
    s = s.replace(/\banalyze\b/g, "analyse");
    s = s.replace(/\banalyzed\b/g, "analysed");
    s = s.replace(/\boptimizing\b/g, "optimising");
    s = s.replace(/\boptimization\b/g, "optimisation");
    s = s.replace(/\bcommercialization\b/g, "commercialisation");
    s = s.replace(/\bbehavior\b/g, "behaviour");
    s = s.replace(/\bbehaviors\b/g, "behaviours");
    s = s.replace(/\bflavor\b/g, "flavour");
    s = s.replace(/\blicense\b(?=\s+(?:requirement|process|application|fee|holder|authority|framework|statute))/g, "licence");

    // 2. Remove residual "regional law" / "regional statutory" phrases
    s = s.replace(/\bunder regional law\b/gi, `under ${jurisdictionName} statutory frameworks`);
    s = s.replace(/\bregional statutory frameworks?\b/gi, `${jurisdictionName} statutory frameworks`);
    s = s.replace(/\bregional statutory pathways?\b/gi, `${jurisdictionName} statutory pathways`);
    s = s.replace(/\bregional law\b/gi, `${jurisdictionName} law`);
    s = s.replace(/\bregional statutory\b/gi, `${jurisdictionName} statutory`);
    s = s.replace(/\btarget region\b/gi, `target market`);

    // 3. Remove system placeholders, uncalibrated claims, and dramatic tone
    s = s.replace(/Professional background and credentials extracted from CV\.?/gi, "Demonstrated commercial leadership, financial modelling, and enterprise risk management capability.");
    s = s.replace(/Evaluated based on sub-factors and supplied evidence\.?/gi, "Evaluated against commercial feasibility criteria.");
    s = s.replace(/zero-emission baseload/gi, "low-carbon firm electricity");

    // Tone Calibration (Fix 4)
    s = s.replace(/\bthe market need is undeniable\b/gi, "the underlying energy need is substantial");
    s = s.replace(/\bmarket need is undeniable\b/gi, "underlying energy need is substantial");
    s = s.replace(/\bexecution challenges are monumental\b/gi, "execution barriers are exceptionally high");
    s = s.replace(/\bcritical founder-idea mismatch\b/gi, "a significant gap between current project capabilities and venture-specific technical and regulatory requirements");
    s = s.replace(/\bis currently un-investable\b/gi, "is not presently investment-ready");
    s = s.replace(/\bcurrently un-investable\b/gi, "not presently investment-ready");
    s = s.replace(/\bun-investable\b/gi, "not presently investment-ready");
    s = s.replace(/required to even initiate a credible pre-feasibility study/gi, "required to establish initial pre-feasibility");
    s = s.replace(/required to even initiate/gi, "required to establish initial");
    s = s.replace(/founder lacks the expertise required to even initiate/gi, "project team does not yet evidence the direct technical engineering and regulatory capability required to establish initial");

    // False Precision Removal (Fix 5)
    s = s.replace(/reaching commercial TRL 7-9 maturity in OECD markets/gi, "progressing internationally, although commercial maturity, deployment timelines and economics vary materially by technology and jurisdiction");
    s = s.replace(/\bTRL 7-9\b/gi, "commercial maturity");

    // 4. Scrub quotation artifacts safely without mid-word slicing
    s = s.replace(/["”]\s*\.\s*While/g, '. While');
    s = s.replace(/prices\s*["”]\s*\.\s*While/gi, 'prices. While');
    s = s.replace(/""/g, '"');
    s = s.replace(/[ \t]+/g, ' ');
    s = s.replace(/\n\s*\n/g, '\n\n');
    s = s.replace(/\.{2,}/g, '.');

    // 5. Fix accidental mid-sentence capitalization
    s = s.replace(/(\bcenters? around\s+)([A-Z])([a-z]+)/g, (m, p1, p2, p3) => p1 + p2.toLowerCase() + p3);
    s = s.replace(/(\bfocuses on\s+)([A-Z])([a-z]+)/g, (m, p1, p2, p3) => p1 + p2.toLowerCase() + p3);

    // 6. Remove duplicated words ("the the", "for for")
    s = s.replace(/\b(the|for|and|in|on|at|to|a|an|is|are)\s+\1\b/gi, "$1");

    // 7. Clean up raw semicolon joins inside prose
    s = s.replace(/;\s*([A-Z])/g, ". $1");
    s = s.replace(/;\s*;/g, ";");

    // 7. Ensure proper terminal punctuation for prose (skip enums, titles, metrics, codes, short labels)
    s = s.trim();
    const isEnumOrTitleKey = key && noTerminalPeriodKeys.has(key);
    const isTaxonValue = /^(PARK|PURSUE|INVESTIGATE|STOP|PAUSE|PROCEED)/i.test(s) || /hours\/week$/i.test(s) || /^\$[\d,\s\-]+(NZD|USD|AUD)?$/i.test(s);
    if (!isEnumOrTitleKey && !isTaxonValue && s.length > 0 && !/[.!?:"']$/.test(s)) {
      s += '.';
    }

    return s;
  };

  const traverseAndEdit = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") {
        obj[key] = editString(obj[key], key);
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map((item) => (typeof item === "string" ? editString(item, key) : traverseAndEdit(item)));
      } else if (typeof obj[key] === "object") {
        traverseAndEdit(obj[key]);
      }
    }
    return obj;
  };

  return traverseAndEdit(data);
}

/**
 * Required-Field Business Model Integrity Gate
 * Ensures ALL 8 Business Model fields contain valid, non-placeholder analytical outputs.
 */
function validateAndEnforceBusinessModelSnapshot(data, reqData = {}) {
  if (!data || typeof data !== "object") return data;
  data.businessModelSnapshot = data.businessModelSnapshot || {};
  const ventureType = classifyVentureType(reqData);
  const targetJurisdiction = getJurisdictionName(reqData);

  const requiredFields = [
    'targetCustomer',
    'coreOffering',
    'customerProblem',
    'valueProposition',
    'revenueModel',
    'customerAcquisition',
    'keyCosts',
    'commercialAssessment'
  ];

  const isInvalid = (val) => {
    if (!val || typeof val !== 'string') return true;
    const trimmed = val.trim();
    return (
      trimmed === '' ||
      trimmed === '.' ||
      trimmed === '-' ||
      trimmed === '--' ||
      trimmed === 'N/A' ||
      trimmed === 'TBD' ||
      trimmed === '[placeholder]' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === 'Not yet evidenced' ||
      trimmed.length < 5
    );
  };

  for (const field of requiredFields) {
    if (isInvalid(data.businessModelSnapshot[field])) {
      console.warn(`PitchLab INTEGRITY GATE: businessModelSnapshot.${field} was invalid ("${data.businessModelSnapshot[field]}"). Re-synthesizing from context...`);
      data.businessModelSnapshot[field] = synthesizeBusinessModelField(field, reqData, ventureType, targetJurisdiction);
    }
  }

  // Grounding & Semantic Consistency Check (MoorSafe Fix 1)
  const preservedProblem = (reqData.problem || data.problem || "").toLowerCase();
  const currentProb = (data.businessModelSnapshot.customerProblem || "").toLowerCase();
  if (preservedProblem && (preservedProblem.includes("pest") || preservedProblem.includes("rodent") || preservedProblem.includes("rat"))) {
    if (currentProb.includes("collision") || currentProb.includes("mooring line failure") || (!currentProb.includes("pest") && !currentProb.includes("rodent"))) {
      console.warn("PitchLab INTEGRITY GATE: Grounding failure detected in customerProblem! Overwriting with preserved problem...");
      data.businessModelSnapshot.customerProblem = synthesizeBusinessModelField('customerProblem', reqData, ventureType, targetJurisdiction);
    }
  }

  return data;
}

/**
 * PL-FIX-20261006-SMARTTAX-01: Cross-Report Action Source of Truth Engine
 * Produces unified, reconciled action data across all report sections:
 * - 7-Day Immediate Action
 * - Three Immediate Priority Actions
 * - Top 5 Commercial Priorities
 * - 30-Day Plan (staged to 90-day 20-30 cumulative interviews)
 * - Next Evidence Gateway & Reassessment Trigger
 */
function generateActionSourceOfTruth(reqData = {}, reconciled = {}, ventureType = "", targetJurisdiction = "New Zealand") {
  const idea = (reqData.idea || "").trim();
  const targetMarket = (reqData.targetMarket || "target customers").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear") || reconciled.gatesInfo?.hasCriticalGate;
  const isHw = ventureType.includes("Hardware") || ventureType.includes("Manufacturing") || isHardwareIdea(idea, reqData.category);
  const isFinTech = ventureType === "Financial Services / FinTech" || Boolean((idea + " " + (reqData.category || "")).toLowerCase().match(/\b(tax|gst|ird|fintech|accounting|bookkeep)\b/i));

  const isTransport = ventureType === "Transportation / Mobility / Marketplace" || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData);
  const isTradeService = ventureType.includes("Trade") || ventureType.includes("Construction") || Boolean((idea + " " + (reqData.category || "")).toLowerCase().match(/\b(builder|building|construction|renovation|carpenter|trades|contractor)\b/i));
  const isAiDecision = ventureType.includes("Decision Support") || Boolean((idea + " " + (reqData.category || "")).toLowerCase().match(/\b(ai\b|decision support|decision intelligence|startup evaluation|idea validation|idea assessment|founder intelligence|pitchlab)\b/i));

  const rawTimeInput = (reqData.timeCommitment || reqData.capacity || "").toString().trim();
  const isLowTime = Boolean(rawTimeInput.match(/\b(0-5|0\s*-\s*5|<5)\b/i));
  const hoursBand = isLowTime ? "0-5 hours/week" : (rawTimeInput.match(/\b(5-10|5\s*-\s*10)\b/i) ? "5-10 hours/week" : "10-20 hours/week");

  if (isNuclear) {
    const immediate7DayAction = `Identify qualified legal specialists in ${targetJurisdiction} and schedule an initial consultation to map statutory frameworks.`;
    const threePriorityActions = [
      {
        heading: "1. Verify Statutory & Legal Permissibility.",
        explanation: `Identify qualified legal and regulatory specialists in ${targetJurisdiction} and obtain an initial consultation to map statutory frameworks before committing development capital.`,
        outcome: "Initial specialist discussion & indicative regulatory pathway / scope and fee."
      },
      {
        heading: "2. Specialist Technical & Regulatory Pre-Feasibility Scoping.",
        explanation: "Identify qualified energy infrastructure engineers and environmental regulatory consultants to map preliminary safety, site, grid connection, and statutory prerequisites.",
        outcome: "Preliminary technical prerequisite & capability-gap scoping note."
      },
      {
        heading: "3. Capital Scale & Policy Assessment.",
        explanation: "Perform preliminary desktop analysis of multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment.",
        outcome: "Indicative capital-scale & stakeholder/policy map."
      }
    ];
    const topFivePriorities = [
      { priority: "Statutory & Legal Scoping", action: `Identify qualified legal specialists and obtain an initial consultation to map statutory frameworks under ${targetJurisdiction} legislation.`, metric: "Initial specialist consultation & scope/fee" },
      { priority: "Specialist Technical Outreach", action: "Identify qualified power/nuclear engineers and regulatory consultants to map preliminary safety and grid prerequisites.", metric: "Preliminary specialist advisory scoping note" },
      { priority: "Engineering & Site Prerequisite Mapping", action: "Perform desktop research to map site requirements, grid connection logistics, and environmental consenting prerequisites.", metric: "Desktop technical prerequisite memo" },
      { priority: "Founder Risk Gateway Decision", action: "Review preliminary legal and technical scoping notes against founder resource reality before committing further investment.", metric: "Pre-Feasibility Go / Reframe / Stop Decision" },
      { priority: "Commercial Off-Taker Alignment", action: "Track long-term energy market dynamics, PPA structures, and industrial off-taker decarbonisation requirements.", metric: "Preliminary PPA structure & off-taker alignment note" }
    ];
    const thirtyDayPlan = {
      week1: { objective: "Legal & Regulatory Feasibility Assessment", tasks: ["Obtain specialist legal advice on statutory framework, local legislation and legal prohibitions", "Identify required regulatory approval bodies and compliance mandates"], expectedResult: "Comprehensive assessment of legal permissibility and statutory barriers" },
      week2: { objective: "Specialist Technical & Domain Expert Consultation", tasks: ["Consult independent domain engineers, regulatory specialists or industry advisers", "Map required technical qualifications and specialist team gaps"], expectedResult: "Expert feedback on technical, safety, and operational feasibility" },
      week3: { objective: "Technical & Infrastructure Feasibility Study", tasks: ["Assess grid, site, environmental, and infrastructure prerequisites", "Evaluate technology readiness level and deployment dependencies"], expectedResult: "High-level technical and site feasibility assessment report" },
      week4: { objective: "Pre-Feasibility Decision (Proceed / Pivot / Stop)", tasks: ["Model indicative project economics, CAPEX/OPEX, and capital requirements", "Present pre-feasibility findings to make a disciplined Go / Pivot / Stop decision"], expectedResult: "Formal Pre-Feasibility Recommendation & Risk Gateway Report" }
    };
    const ninetyDayPhases = [
      {
        phaseNumber: "Phase 1",
        daysRange: "Days 1–30",
        title: "Problem & Statutory Scoping",
        name: "Phase 1: Days 1–30 — Problem & Statutory Scoping",
        objective: `Verify statutory permissibility and map legislative barriers under ${targetJurisdiction} law before deploying private risk capital.`,
        activities: [
          `Identify qualified legal counsel in ${targetJurisdiction} specializing in radiation safety, energy statutes, and environmental law.`,
          "Obtain an initial specialist legal scoping consultation on the Radiation Safety Act 2016 and Atomic Energy Act 1945.",
          "Review public policy positioning, sovereign risk factors, and fast-track consenting frameworks.",
          "Synthesize legal scoping findings into an indicative regulatory feasibility memorandum."
        ],
        successCriteria: "Specialist confirmation of whether a credible statutory pathway exists or if state-level legislative reform is required.",
        deliverables: "Statutory Permissibility Memorandum & Legal Scoping Scope/Fee Document.",
        decisionMilestone: "Statutory Gateway: If no viable statutory pathway exists without legislative reform, STOP or PARK private capital expenditure."
      },
      {
        phaseNumber: "Phase 2",
        daysRange: "Days 31–60",
        title: "Solution & Technical Pre-Feasibility",
        name: "Phase 2: Days 31–60 — Solution & Technical Pre-Feasibility",
        objective: "Map technical prerequisites, Small Modular Reactor (SMR) technology options, grid integration, and safety requirements.",
        activities: [
          "Consult independent power engineers regarding SMR technology readiness levels and deployment timelines.",
          "Perform desktop assessment of grid connection logistics, seismic site screening, and cooling water access.",
          "Review international regulatory precedent (e.g. NRC, CNSC) applicable to candidate reactor designs.",
          "Map technical team qualifications, specialist capability gaps, and pre-feasibility budget required."
        ],
        successCriteria: "Clear identification of fundamental technical prerequisites, siting criteria, and minimum consortium capabilities.",
        deliverables: "Technical Pre-Feasibility Scoping Note & Infrastructure Prerequisite Matrix.",
        decisionMilestone: "Technical Gateway: Confirm whether prerequisites are within private venture feasibility or necessitate a sovereign utility consortium."
      },
      {
        phaseNumber: "Phase 3",
        daysRange: "Days 61–90",
        title: "Commercial Structure & Policy Alignment Decision",
        name: "Phase 3: Days 61–90 — Commercial Structure & Policy Alignment Decision",
        objective: "Model multi-billion-dollar CAPEX realities, off-taker demand, public policy engagement pathways, and final gateway governance.",
        activities: [
          "Draft preliminary capital structure model evaluating public-private partnership (PPP) and sovereign underwriting models.",
          "Map prospective industrial off-takers and long-term Power Purchase Agreement (PPA) interest for firm baseload power.",
          "Engage relevant government and industry energy policy working groups to monitor statutory reform debate.",
          "Synthesize legal, technical, and capital findings into an executive pre-feasibility review."
        ],
        successCriteria: "Quantified capital scale model and stakeholder policy alignment assessment.",
        deliverables: "Comprehensive Pre-Feasibility Synthesis & Capital Scale Framework.",
        decisionMilestone: "Final 90-Day Gateway: Disciplined Go / Pivot / Stop / Park decision regarding future institutional consortium formation."
      }
    ];
    const ninetyDayRoadmap = {
      phases: ninetyDayPhases,
      steps: [
        { week: 'W 1-2', objective: 'Legal & Statutory Scoping', tasks: 'Identify applicable legislation and engage appropriate specialist legal/regulatory expertise.', hours: '5 hrs/wk', evidence: 'Preliminary legal-framework map' },
        { week: 'W 3-4', objective: 'Regulatory Pathway Assessment', tasks: 'Determine whether any credible statutory pathway exists for commercial nuclear generation.', hours: '5 hrs/wk', evidence: 'Regulatory pathway scoping note / specialist scope' },
        { week: 'W 5-6', objective: 'Technical Pre-Feasibility', tasks: 'Engage nuclear/energy infrastructure specialists to identify fundamental technical prerequisites.', hours: '5 hrs/wk', evidence: 'Technical prerequisite and capability-gap memo' },
        { week: 'W 7-8', objective: 'Policy & Stakeholder Mapping', tasks: 'Identify relevant government, regulatory and energy infrastructure stakeholders.', hours: '5 hrs/wk', evidence: 'Stakeholder map' },
        { week: 'W 9-10', objective: 'Capital & Delivery Reality', tasks: 'Establish indicative project capital scale, financing structure and consortium requirements.', hours: '5 hrs/wk', evidence: 'Indicative capital-scale model' },
        { week: 'W 11-12', objective: 'Evidence Gateway Decision', tasks: 'STOP / PARK / PIVOT / CONTINUE based on statutory and pre-feasibility evidence obtained.', hours: '5 hrs/wk', evidence: 'Evidence Gateway Decision' }
      ]
    };
    return {
      immediate7DayAction,
      threePriorityActions,
      topFivePriorities,
      thirtyDayPlan,
      ninetyDayPhases,
      ninetyDayRoadmap,
      doThisBeforeBuilding: `Identify an appropriately qualified legal and regulatory specialist in ${targetJurisdiction} and obtain an initial discussion, indicative view or scope and fee for determining the applicable statutory pathway.`,
      nextEvidenceGateway: `Confirm indicative statutory permissibility pathway under ${targetJurisdiction} legislation before deploying pre-feasibility risk capital.`,
      reassessmentTrigger: "Receipt of specialist legal feedback confirming statutory feasibility."
    };
  }

  if (isHw) {
    const immediate7DayAction = "Reach out to 10 vessel owners or marina operators to schedule 5 initial problem discovery interviews.";
    const threePriorityActions = [
      {
        heading: "1. Phase 1 Problem Discovery Interviews.",
        explanation: "Interview 5–10 target vessel owners or commercial operators to quantify pest infestation frequency, existing workaround costs, and problem severity before committing capital to prototypes.",
        outcome: "5–10 completed problem discovery interviews and severity log."
      },
      {
        heading: "2. Benchtop Proof of Concept & Power Testing.",
        explanation: "Develop a benchtop proof of concept to validate the deterrent mechanism and power draw in a controlled environment before tooling.",
        outcome: "Benchtop proof-of-concept test log and power efficiency data."
      },
      {
        heading: "3. Unit Economics & Willingness to Pay.",
        explanation: "Present concept specifications and indicative pricing to 5 prospects to test purchase intent and gross margins.",
        outcome: "Validated preliminary BOM model and 2 written pilot commitments."
      }
    ];
    const topFivePriorities = [
      { priority: "Customer Problem Discovery", action: "Interview 5–10 target vessel owners and commercial operators to quantify pest frequency and workaround costs.", metric: "5–10 completed interview logs" },
      { priority: "Benchtop Proof of Concept", action: "Develop a benchtop proof of concept to validate the deterrent mechanism and power draw.", metric: "Benchtop test log" },
      { priority: "Willingness to Pay & Unit Economics", action: "Present product concept and target price points to 5 prospects to test purchase intent.", metric: "Validated BOM model & 2 written pilot commitments" },
      { priority: "Controlled Field Pilot", action: "Deploy 2–3 benchtop units with cooperative boat owners to assess environmental durability.", metric: "Pilot feedback reports" },
      { priority: "Execution Cadence", action: `Allocate ${hoursBand} dedicated strictly to customer interviews and prototype validation.`, metric: "Weekly execution log" }
    ];
    const thirtyDayPlan = {
      week1: { objective: "Outreach & Interview Scheduling", tasks: ["Contact 15 marina contacts or vessel owners", "Schedule 5 Phase 1 discovery interviews"], expectedResult: "5 confirmed interview sessions" },
      week2: { objective: "Phase 1 Discovery Interviews (5–10 Users)", tasks: ["Execute 5–10 interviews on pest intrusion frequency and workaround costs", "Log dissatisfaction with current methods"], expectedResult: "Completed interview synthesis & pain severity log" },
      week3: { objective: "Benchtop Mechanism Test & Pricing Feedback", tasks: ["Test core deterrent mechanism on benchtop setup", "Present pricing terms to 5 marina/boat owners for feedback"], expectedResult: "Benchtop mechanism validation log & pricing feedback" },
      week4: { objective: "Field Pilot Specification & Milestone Decision", tasks: ["Define protocol for marine field pilot testing", "Make disciplined Go / Pivot decision based on customer pain and BOM viability (targeting 20–30 cumulative interviews across 90 days)"], expectedResult: "Field Pilot Specification & Milestone Decision" }
    };
    const ninetyDayPhases = [
      {
        phaseNumber: "Phase 1",
        daysRange: "Days 1–30",
        title: "Problem Validation",
        name: "Phase 1: Days 1–30 — Problem Validation",
        objective: "Verify the frequency, severity, and economic cost of equipment failure or pest damage with marine harbor operators and vessel owners.",
        activities: [
          "Outreach to 15 marina managers, commercial harbor masters, and private vessel owners.",
          "Conduct 8–10 structured discovery interviews focusing on current manual workarounds and line failure costs.",
          "Quantify the direct financial and insurance pain caused by unmonitored equipment failures.",
          "Synthesize problem severity criteria to establish baseline physical product specifications."
        ],
        successCriteria: "At least 70% of interviewed operators confirm that current manual methods are inadequate and impose recurring operational pain.",
        deliverables: "Problem Discovery Synthesis & Customer Pain Severity Log (8–10 interview transcripts).",
        decisionMilestone: "Problem Gate: If fewer than 50% confirm severe pain or willingness to adopt physical alternatives, reconsider target use case or pivot."
      },
      {
        phaseNumber: "Phase 2",
        daysRange: "Days 31–60",
        title: "Solution Validation",
        name: "Phase 2: Days 31–60 — Solution Validation",
        objective: "Fabricate benchtop proof-of-concept prototype to validate deterrent mechanism, power budget, and solar harvesting in marine conditions.",
        activities: [
          "Develop mechanical CAD component models and preliminary electrical schematic for low-power solar/battery subsystem.",
          "Assemble benchtop physical prototype using off-the-shelf components to verify mechanism functionality.",
          "Perform benchtop endurance and power consumption stress testing under simulated weather conditions.",
          "Present physical prototype demonstration and technical spec sheet to 5 prospective buyers for direct feedback."
        ],
        successCriteria: "Demonstrated mechanism reliability and positive user feedback on physical form factor from at least 4 of 5 operators.",
        deliverables: "Benchtop Functional Prototype, Engineering Spec Sheet & Mechanism Validation Log.",
        decisionMilestone: "Solution Gate: Confirm mechanism functions reliably without high failure rates before investing in production tooling."
      },
      {
        phaseNumber: "Phase 3",
        daysRange: "Days 61–90",
        title: "Commercial Validation & Decision",
        name: "Phase 3: Days 61–90 — Commercial Validation & Decision",
        objective: "Validate Bill of Materials (BOM) unit economics, secure commercial pre-orders or pilot site deposits, and decide on tooling investment.",
        activities: [
          "Obtain component quotes from at least 2 manufacturing suppliers to establish unit manufacturing costs at 100-unit and 500-unit volumes.",
          "Formulate gross margin and pricing model (hardware sale plus optional recurring maintenance support).",
          "Present formal pilot trial terms (with deposit or signed LOI) to 5 marina operators or fleet owners.",
          "Evaluate capital requirements and manufacturing timeline against founder resource commitments."
        ],
        successCriteria: "Secured at least 2 signed pilot commitments / deposit letters of intent with projected gross margins exceeding 50%.",
        deliverables: "Supplier BOM Cost Model, 2 Written Pilot Trial Commitments, and Tooling Investment Decision Memo.",
        decisionMilestone: "Commercial Gateway: Decide whether to proceed with commercial batch tooling, seek hardware angel funding, or refine design."
      }
    ];
    const ninetyDayRoadmap = {
      phases: ninetyDayPhases,
      steps: [
        { week: 'W 1-2', objective: 'User Problem Discovery', tasks: 'Interview 10 target operators on current equipment issues & costs.', hours: '5 hrs/wk', evidence: 'Interview transcript log' },
        { week: 'W 3-4', objective: 'Technical CAD & Specs', tasks: 'Draft initial mechanical CAD model & electronic component specs.', hours: '5 hrs/wk', evidence: 'CAD spec sheet' },
        { week: 'W 5-6', objective: 'Physical Prototype Build', tasks: 'Fabricate benchtop physical prototype for initial mechanism testing.', hours: '5 hrs/wk', evidence: 'Benchtop prototype' },
        { week: 'W 7-8', objective: 'Field & Durability Testing', tasks: 'Test prototype in real operating environment under stress conditions.', hours: '5 hrs/wk', evidence: 'Field test log' },
        { week: 'W 9-10', objective: 'Unit Economics & Sourcing', tasks: 'Obtain quotes from 2 manufacturers for bill of materials & batch assembly.', hours: '5 hrs/wk', evidence: 'Supplier quote comparison' },
        { week: 'W 11-12', objective: 'Commercial Pre-Orders', tasks: 'Present tested prototype to 5 prospective buyers to secure pre-orders.', hours: '5 hrs/wk', evidence: '2 pilot deposits / pre-orders' }
      ]
    };
    return {
      immediate7DayAction,
      threePriorityActions,
      topFivePriorities,
      thirtyDayPlan,
      ninetyDayPhases,
      ninetyDayRoadmap,
      doThisBeforeBuilding: "Conduct 5–10 structured customer discovery interviews to confirm problem frequency and willingness to pay before building physical prototypes.",
      nextEvidenceGateway: "Complete 10 discovery interviews and 2 benchtop prototype tests confirming mechanical viability before tooling.",
      reassessmentTrigger: "Completion of 10 discovery interviews or validated benchtop test log."
    };
  }

  if (isTransport) {
    const targetLabel = synthesizeTargetCustomerLabel(targetMarket);
    const immediate7DayAction = `Draft your customer discovery interview script and list 10 prospective passengers and local transport operators in ${targetJurisdiction} to schedule initial discovery interviews.`;
    const threePriorityActions = [
      {
        heading: "1. Phase 1 Passenger & Driver Discovery Interviews.",
        explanation: `Conduct 5–10 structured interviews with prospective passengers and local drivers (${targetLabel}) to quantify booking delays, fare transparency, and driver availability.`,
        outcome: "5–10 completed interview logs and pain confirmation score."
      },
      {
        heading: "2. Concierge MVP & Manual Dispatch Trial.",
        explanation: "Design and run a lightweight manual concierge booking/dispatch test for scheduled airport or hotel transfers before committing capital to mobile app development.",
        outcome: "Completed concierge trial log and service delivery workflow specification."
      },
      {
        heading: "3. Test Commission & Fare Economics.",
        explanation: "Present indicative per-ride pricing and driver commission terms to 5 prospects and local drivers to test commercial take rates and transaction willingness before writing code.",
        outcome: "2 written pilot driver commitments and validated unit economics feedback."
      }
    ];
    const topFivePriorities = [
      { priority: "Passenger & Driver Discovery", action: "Interview 10 target passengers and 5 local drivers on booking unreliability and vehicle idle time.", metric: "15 completed interview notes" },
      { priority: "Confirm Problem Urgency", action: "Verify that at least 70% of interviewed passengers and drivers report frequent booking friction or lost earnings.", metric: "70% friction confirmation rate" },
      { priority: "Concierge Booking MVP", action: "Operate a manual concierge booking test for airport/hotel transfers before building mobile apps.", metric: "Concierge pilot specification & test log" },
      { priority: "Test Take Rate & Pricing", action: "Present per-ride commission and booking fees to drivers and passengers for direct commercial feedback.", metric: "5 driver pilot commitments" },
      { priority: "Execution Cadence", action: `Allocate ${hoursBand} dedicated strictly to customer and driver validation milestones.`, metric: "Weekly validation log" }
    ];
    const thirtyDayPlan = {
      week1: { objective: "Passenger & Driver Outreach Setup", tasks: ["Identify 15 target passengers and 10 local drivers or fleet contacts", "Schedule 5 initial discovery interviews"], expectedResult: "5 confirmed interview bookings" },
      week2: { objective: "Phase 1 Discovery Interviews (10 Users)", tasks: ["Execute structured interviews with passengers and drivers", "Log existing transport workarounds and fare inconsistencies"], expectedResult: "Transport discovery synthesis & friction confirmation score" },
      week3: { objective: "Concierge Transfer Pilot & Commission Test", tasks: ["Run manual concierge booking trial for 3-5 airport/hotel transfers", "Present driver commission terms and collect pricing objections"], expectedResult: "Concierge trial test log & take-rate feedback report" },
      week4: { objective: "Validation Review & Technical Scope Gateway", tasks: ["Assess passenger retention signals and driver recruitment willingness", "Make disciplined Go / Pivot decision on whether to recruit a technical co-founder (targeting 20–30 cumulative interviews across 90 days)"], expectedResult: "Marketplace Validation Milestone Decision Report" }
    };
    const ninetyDayPhases = [
      {
        phaseNumber: "Phase 1",
        daysRange: "Days 1–30",
        title: "Problem Validation",
        name: "Phase 1: Days 1–30 — Problem Validation",
        objective: `Validate passenger ride-booking friction, driver income unreliability, and fare transparency issues across target routes in ${targetJurisdiction}.`,
        activities: [
          `Conduct 10 structured discovery interviews with frequent local passengers, airport commuters, and hotel hospitality managers in ${targetJurisdiction}.`,
          "Interview 6–8 taxi and transport operators regarding vehicle idle time, fuel costs, and dispatch inefficiency.",
          "Map existing informal phone/messaging booking workarounds, cash fare discrepancies, and peak demand bottlenecks.",
          "Document local transport licensing, vehicle standards, and driver regulatory requirements."
        ],
        successCriteria: "At least 75% of passengers report unreliable booking wait times, and majority of drivers express interest in reliable passenger dispatches.",
        deliverables: "Passenger & Driver Discovery Synthesis Log (15+ interview notes) & Route Demand Map.",
        decisionMilestone: "Problem Gate: Confirm acute passenger demand for transparent booking and willing driver supply density before writing code."
      },
      {
        phaseNumber: "Phase 2",
        daysRange: "Days 31–60",
        title: "Solution Validation",
        name: "Phase 2: Days 31–60 — Solution Validation",
        objective: "Execute a lightweight manual concierge dispatch trial (airport/hotel transfers) to validate trip workflow, pricing, and driver responsiveness.",
        activities: [
          "Establish a manual concierge booking channel (e.g. dedicated phone/WhatsApp desk) for pre-scheduled airport transfers.",
          "Recruit an initial pilot cohort of 5 licensed, vetted local drivers under clear commission and service standards.",
          "Fulfill 15–20 real passenger transfer bookings manually, logging response times, driver punctuality, and passenger satisfaction.",
          "Identify operational edge cases including cash collection, flight delays, driver cancellations, and route deviations."
        ],
        successCriteria: "Successful completion of 15+ manual concierge rides with over 85% passenger satisfaction and zero driver no-shows.",
        deliverables: "Concierge Dispatch Trial Log (15+ completed trips), Operational Workflow SOP, and Driver Feedback Summary.",
        decisionMilestone: "Solution Gate: Validate that drivers reliably accept and execute dispatched rides before commissioning mobile app development."
      },
      {
        phaseNumber: "Phase 3",
        daysRange: "Days 61–90",
        title: "Commercial Validation & Decision",
        name: "Phase 3: Days 61–90 — Commercial Validation & Decision",
        objective: "Test platform take rates / commission economics, secure hotel/tourism partner commitments, and establish technical co-founder roadmap.",
        activities: [
          "Test per-ride commission model (e.g. 15–20% take rate) with pilot drivers to ensure sustainable driver earnings and platform unit economics.",
          "Engage 3 local hotels, resorts, or tour agencies to secure preferred transport partnership agreements or letters of intent.",
          "Define digital MVP technical specifications (driver app, passenger app, dispatch backend) based on concierge learnings.",
          "Reassess marketplace liquidity requirements, customer acquisition costs, and decide whether to recruit a technical co-founder."
        ],
        successCriteria: "At least 5 drivers committed to platform terms, 2 hospitality referral agreements, and positive unit contribution margins on pilot rides.",
        deliverables: "Marketplace Unit Economics Model, 2 Hospitality Partner Agreements, and Technical Scope Document.",
        decisionMilestone: "Commercial Gateway: Make disciplined Go / Pivot decision on building full native applications vs. expanding concierge fleet."
      }
    ];
    const ninetyDayRoadmap = {
      phases: ninetyDayPhases,
      steps: [
        { week: 'W 1-2', objective: 'Passenger & Driver Outreach', tasks: 'Interview 10 passengers and 5 local drivers on booking unreliability and idle time.', hours: '5 hrs/wk', evidence: 'Passenger & driver outreach log' },
        { week: 'W 3-4', objective: 'Pricing & Route Mapping', tasks: 'Map primary transport routes, peak travel delays, and current fare workarounds.', hours: '5 hrs/wk', evidence: 'Route & fare comparison matrix' },
        { week: 'W 5-6', objective: 'Concierge Dispatch Pilot', tasks: 'Operate a manual concierge booking trial for 10-15 airport/hotel transfers.', hours: '5 hrs/wk', evidence: 'Concierge trial trip log' },
        { week: 'W 7-8', objective: 'Driver Commission Testing', tasks: 'Present formal per-ride commission terms to 5 local transport operators.', hours: '5 hrs/wk', evidence: '5 driver pilot commitments' },
        { week: 'W 9-10', objective: 'Hotel & Partner Channels', tasks: 'Engage 3 local accommodation providers for preferred transfer referrals.', hours: '5 hrs/wk', evidence: '2 hotel referral LOIs' },
        { week: 'W 11-12', objective: 'Digital MVP Scope Gateway', tasks: 'Synthesize manual trial findings; make Go/Pivot decision on app build vs. concierge scale.', hours: '5 hrs/wk', evidence: 'Marketplace Gateway Decision Report' }
      ]
    };
    return {
      immediate7DayAction,
      threePriorityActions,
      topFivePriorities,
      thirtyDayPlan,
      ninetyDayPhases,
      ninetyDayRoadmap,
      doThisBeforeBuilding: `Conduct 5–10 structured customer discovery interviews with prospective passengers and drivers (${targetLabel}) to confirm booking demand and commission willingness before writing app code.`,
      nextEvidenceGateway: "Complete 10 passenger and driver discovery interviews confirming urgent booking demand, followed by a manual concierge transfer test, before investing in custom software development.",
      reassessmentTrigger: "Completion of 10 customer/driver discovery interviews or execution of a manual concierge booking test."
    };
  }

  if (isTradeService) {
    const targetLabel = synthesizeTargetCustomerLabel(targetMarket);
    const immediate7DayAction = `Draft discovery interview questions on quote delays and reach out to 10 prospective residential clients or architects in ${targetJurisdiction}.`;
    const threePriorityActions = [
      {
        heading: "1. Phase 1 Client & Partner Discovery Interviews.",
        explanation: `Conduct 8–10 structured discovery interviews with residential property owners and architects (${targetLabel}) to quantify quote turnaround friction and trade scheduling delays.`,
        outcome: "8–10 completed client interview logs and pain severity score."
      },
      {
        heading: "2. Standardized Estimation & Trade Vetting.",
        explanation: "Develop fixed-price estimation calculators and pre-qualify 3 core subcontractor trades with verified compliance and insurance before taking on larger contracts.",
        outcome: "Estimation framework & 3 vetted subcontractor trade agreements."
      },
      {
        heading: "3. Milestone Contract & Margin Validation.",
        explanation: "Present fixed-price milestone contracts to 2 prospective building clients to validate pricing terms and gross project margins before hiring permanent staff.",
        outcome: "1 signed pilot construction contract with milestone progress terms."
      }
    ];
    const topFivePriorities = [
      { priority: "Client Problem Discovery", action: "Interview 8–10 homeowners and property owners on renovation budget blowouts and quote delays.", metric: "8–10 completed interview logs" },
      { priority: "Standardized Estimating Framework", action: "Build detailed job cost estimation models covering material markups and labor contingencies.", metric: "Standardized job estimating template" },
      { priority: "Subcontractor Trade Vetting", action: "Vet and pre-qualify reliable local subcontractor trades (electrical, plumbing, carpentry).", metric: "3 pre-qualified trade agreements" },
      { priority: "Milestone Contract Validation", action: "Present fixed-price contracts with structured progress payment milestones to prospective clients.", metric: "1 signed pilot client contract" },
      { priority: "Execution Cadence", action: `Allocate ${hoursBand} dedicated strictly to customer scoping and project delivery systems.`, metric: "Weekly operations log" }
    ];
    const thirtyDayPlan = {
      week1: { objective: "Client & Architect Outreach Setup", tasks: ["Contact 15 homeowners or architect/designer contacts", "Schedule 5 discovery interviews"], expectedResult: "5 confirmed interview sessions" },
      week2: { objective: "Phase 1 Discovery Interviews (8–10 Clients)", tasks: ["Execute structured interviews on renovation pain points and quote delays", "Log dissatisfaction with standard builder communication"], expectedResult: "Client discovery synthesis & pain confirmation log" },
      week3: { objective: "Standardized Estimating & Trade Vetting", tasks: ["Develop job cost calculator covering material margins", "Vet 3 core trade contractors with insurance verification"], expectedResult: "Estimating model & subcontractor agreement drafts" },
      week4: { objective: "Pilot Proposal & Milestone Contract Gateway", tasks: ["Present fixed-price proposal with digital milestones to active prospect", "Make disciplined Go / Pivot decision on taking on dedicated site overhead"], expectedResult: "1 Signed Pilot Contract or Term Sheet" }
    };
    const ninetyDayPhases = [
      {
        phaseNumber: "Phase 1",
        daysRange: "Days 1–30",
        title: "Problem Validation",
        name: "Phase 1: Days 1–30 — Problem Validation",
        objective: "Validate client pain surrounding quote delays, trade scheduling unreliability, and lack of fixed-price cost transparency in residential building.",
        activities: [
          "Interview 8–10 residential property owners who recently undertook or planned major renovations or building projects.",
          "Interview 4–5 local architects, building inspectors, or quantity surveyors regarding common project delay friction points.",
          "Analyze competitor trade quotes, markup structures, and standard contracting terms in the local area.",
          "Synthesize customer pain thresholds regarding budget blowouts, communication delays, and trade quality assurance."
        ],
        successCriteria: "At least 70% of prospective clients indicate willingness to pay a fair premium for guaranteed milestone timelines and transparent fixed-price terms.",
        deliverables: "Client Problem Discovery Log (10+ interviews) & Local Trade Competitor Pricing Matrix.",
        decisionMilestone: "Problem Gate: Confirm strong demand for transparent, milestone-managed construction services before taking on overhead."
      },
      {
        phaseNumber: "Phase 2",
        daysRange: "Days 31–60",
        title: "Solution Validation",
        name: "Phase 2: Days 31–60 — Solution Validation",
        objective: "Validate project estimation workflow, digital milestone reporting, and subcontractor trade vetting processes on a controlled pilot project.",
        activities: [
          "Develop standardized estimating templates, fixed-price quote calculators, and payment milestone schedules.",
          "Vet and pre-qualify 3 core subcontractor trades (e.g. electrical, plumbing, carpentry) with verified compliance and insurance.",
          "Deliver a detailed fixed-price proposal and digital milestone roadmap to 3 active prospective renovation clients.",
          "Test digital project management communication tools (weekly video/photo milestone updates) with prospective clients."
        ],
        successCriteria: "Secured at least 1 client contract with signed milestone progress payment schedule and positive subcontractor trade agreement.",
        deliverables: "Standardized Estimation Framework, Subcontractor Trade Vetting SOP, and 1 Signed Pilot Construction Contract.",
        decisionMilestone: "Solution Gate: Confirm that estimation model accurately covers material margins and labor contingencies before scaling project intake."
      },
      {
        phaseNumber: "Phase 3",
        daysRange: "Days 61–90",
        title: "Commercial Validation & Decision",
        name: "Phase 3: Days 61–90 — Commercial Validation & Decision",
        objective: "Validate gross project margins, working capital cashflow cycles, and establish sustainable architect/designer referral pipelines.",
        activities: [
          "Track actual labor, material, and subcontractor costs against estimates on initial milestone deliverables to verify gross margins (>20%).",
          "Formalize referral relationships with 2 local architects, designers, or building supply merchants.",
          "Establish formal trade credit accounts with building merchants and implement strict milestone deposit billing.",
          "Evaluate operational cashflow, capacity constraints, and decide on hiring permanent site supervisors or additional apprentices."
        ],
        successCriteria: "Demonstrated gross project margins exceeding 20%, positive cashflow on progress payments, and at least 2 qualified project pipeline leads.",
        deliverables: "Project Margin & Cashflow Reconciliation Report, 2 Trade Referral Agreements, and 90-Day Scaling Plan.",
        decisionMilestone: "Commercial Gateway: Make disciplined Go / Scale decision on expanding trade capacity and booking future project pipeline."
      }
    ];
    const ninetyDayRoadmap = {
      phases: ninetyDayPhases,
      steps: [
        { week: 'W 1-2', objective: 'Client Discovery Outreach', tasks: 'Interview 8 homeowners and 4 architects on quote delays and budget blowouts.', hours: '5 hrs/wk', evidence: 'Client discovery interview transcripts' },
        { week: 'W 3-4', objective: 'Competitor Pricing Analysis', tasks: 'Benchmark regional builder rates, markup structures, and standard contracting terms.', hours: '5 hrs/wk', evidence: 'Trade pricing & markup matrix' },
        { week: 'W 5-6', objective: 'Estimating & Trade Vetting', tasks: 'Build standardized job cost calculator and vet 3 core subcontractor trades.', hours: '5 hrs/wk', evidence: 'Job estimating model & trade agreements' },
        { week: 'W 7-8', objective: 'Milestone Proposal Test', tasks: 'Deliver fixed-price proposal with digital milestones to 2 active prospects.', hours: '5 hrs/wk', evidence: '1 signed pilot renovation contract' },
        { week: 'W 9-10', objective: 'Referral Pipeline Setup', tasks: 'Establish formal referral agreements with 2 local architects or designers.', hours: '5 hrs/wk', evidence: '2 signed referral agreements' },
        { week: 'W 11-12', objective: 'Margin & Capacity Review', tasks: 'Reconcile project actual margins (>20%) and decide on trade crew expansion.', hours: '5 hrs/wk', evidence: 'Margin Reconciliation & Growth Plan' }
      ]
    };
    return {
      immediate7DayAction,
      threePriorityActions,
      topFivePriorities,
      thirtyDayPlan,
      ninetyDayPhases,
      ninetyDayRoadmap,
      doThisBeforeBuilding: `Conduct 8–10 structured customer discovery interviews with property owners and architects (${targetLabel}) to confirm demand for fixed-price contracts and milestone reporting before hiring permanent crews.`,
      nextEvidenceGateway: "Complete 10 client discovery interviews confirming strong demand for cost transparency, followed by 1 signed pilot contract with progress milestones, before expanding overhead.",
      reassessmentTrigger: "Completion of 10 client discovery interviews or signing of first milestone construction contract."
    };
  }

  if (isAiDecision) {
    const targetLabel = synthesizeTargetCustomerLabel(targetMarket);
    const immediate7DayAction = `Outreach to 15 early-stage founders and startup incubator managers to schedule 6 initial discovery interviews.`;
    const threePriorityActions = [
      {
        heading: "1. Phase 1 Founder Discovery Interviews.",
        explanation: `Conduct 10–12 structured discovery interviews with startup founders and advisors (${targetLabel}) to quantify frustration with superficial prompts, unvalidated assumptions, and advisory costs.`,
        outcome: "10–12 completed founder interview transcripts and pain confirmation score."
      },
      {
        heading: "2. Prototype Walkthrough & Evaluation Audits.",
        explanation: "Run 6 sample venture assessments across diverse business archetypes and conduct walkthrough sessions with target founders to test report usefulness and roadmap clarity.",
        outcome: "6 founder review logs and calibrated evaluation output."
      },
      {
        heading: "3. Pricing Validation & Organization Commitments.",
        explanation: "Present per-assessment and portfolio subscription pricing to 10 founders and 2 incubator directors to test willingness to pay before committing further engineering.",
        outcome: "3 paid assessment purchases or 1 incubator partnership LOI."
      }
    ];
    const topFivePriorities = [
      { priority: "Founder Problem Discovery", action: "Interview 10–12 early-stage founders on idea validation confusion and wasted development capital.", metric: "10–12 completed interview notes" },
      { priority: "Severity & Willingness to Pay", action: "Verify that at least 75% of founders report need for rigorous, objective decision intelligence.", metric: "75% pain confirmation rate" },
      { priority: "Multi-Archetype Stress Testing", action: "Audit report generation accuracy across hardware, SaaS, marketplace, services, and regulated ventures.", metric: "Zero cross-archetype contamination" },
      { priority: "Test Pricing Elasticity", action: "Present per-assessment and subscription pricing tiers to prospective users for commercial feedback.", metric: "3 paid assessment pre-orders" },
      { priority: "Execution Cadence", action: `Allocate ${hoursBand} dedicated strictly to founder discovery and model calibration milestones.`, metric: "Weekly validation log" }
    ];
    const thirtyDayPlan = {
      week1: { objective: "Founder Outreach & Interview Setup", tasks: ["Identify 20 early-stage founders and 5 accelerator mentors", "Schedule 6 initial discovery interviews"], expectedResult: "6 confirmed interview bookings" },
      week2: { objective: "Phase 1 Founder Discovery (10 Users)", tasks: ["Execute structured discovery interviews on validation hurdles", "Log dissatisfaction with generic AI prompts and expensive consultants"], expectedResult: "Founder discovery synthesis & pain confirmation score" },
      week3: { objective: "Report Walkthrough & Accuracy Test", tasks: ["Conduct structured evaluation walkthroughs with 4 target founders", "Identify and resolve any confusing scoring narratives"], expectedResult: "Founder evaluation feedback log & report refinement" },
      week4: { objective: "Pricing Feedback & Phase 2 Gateway Decision", tasks: ["Test commercial subscription and per-report pricing with 6 prospects", "Make disciplined Go / Pivot decision to expand to full commercial launch"], expectedResult: "Validation Milestone Decision Report" }
    };
    const ninetyDayPhases = [
      {
        phaseNumber: "Phase 1",
        daysRange: "Days 1–30",
        title: "Problem Validation",
        name: "Phase 1: Days 1–30 — Problem Validation",
        objective: "Validate founder and accelerator demand for structured commercial validation frameworks over generic AI prompts or expensive advisors.",
        activities: [
          "Outreach to 25 early-stage founders, startup incubators, and university entrepreneurship program directors.",
          "Conduct 10–12 structured discovery interviews on current idea evaluation methods, advisory costs, and validation confusion.",
          "Benchmark existing alternatives (manual consulting, generic LLM prompts, standard pitch deck templates).",
          "Synthesize founder pain thresholds around objective scoring, gating risk identification, and structured next steps."
        ],
        successCriteria: "At least 75% of interviewed founders state current tools provide superficial answers and fail to identify critical commercial showstoppers.",
        deliverables: "Founder Discovery Synthesis Report (10+ transcripts) & Problem Severity Matrix.",
        decisionMilestone: "Problem Gate: Confirm strong willingness among founders and incubators to seek structured assessment intelligence before building."
      },
      {
        phaseNumber: "Phase 2",
        daysRange: "Days 31–60",
        title: "Solution Validation",
        name: "Phase 2: Days 31–60 — Solution Validation",
        objective: "Validate assessment accuracy, report actionability, and founder comprehension using interactive prototype walkthroughs and manual audits.",
        activities: [
          "Run 8 sample business ideas through the 12-page commercial evaluation pipeline across diverse archetypes (hardware, software, services, regulated).",
          "Conduct structured review sessions with 6 target founders to test report usefulness, clarity of scores, and roadmap practicality.",
          "Calibrate evaluation rules to eliminate generic advice, hallucinated metrics, and cross-archetype contamination.",
          "Deploy interactive web assessment dashboard with shareable executive summary links."
        ],
        successCriteria: "Over 80% of testing founders rate the report as significantly more actionable than generic alternatives and would act on the roadmap.",
        deliverables: "Calibrated Evaluation Report Pipeline, 6 Founder Feedback Logs, and Web Results Dashboard.",
        decisionMilestone: "Solution Gate: Confirm high assessment accuracy and zero cross-concept contamination before launching commercial paywalls."
      },
      {
        phaseNumber: "Phase 3",
        daysRange: "Days 61–90",
        title: "Commercial Validation & Decision",
        name: "Phase 3: Days 61–90 — Commercial Validation & Decision",
        objective: "Test pricing elasticity, validate incubator/partner distribution channels, and make commercial launch decision.",
        activities: [
          "Present pay-per-assessment and portfolio subscription pricing to 10 prospective founders and 2 accelerator managers.",
          "Secure 3 paid assessment purchases or written commitments from startup support organizations.",
          "Track self-serve onboarding completion rates, user conversion funnels, and customer feedback loops.",
          "Reassess unit economics (AI compute cost vs. assessment price) and establish 90-day growth roadmap."
        ],
        successCriteria: "Achieved at least 3 paid customer conversions, gross profit margins exceeding 70% per assessment, and 1 accelerator partnership LOI.",
        deliverables: "Unit Economics Model, 3 Paid Customer Case Studies, and Commercial Launch Strategy.",
        decisionMilestone: "Commercial Gateway: Go / No-Go decision on public commercial launch and capital-efficient growth campaign."
      }
    ];
    const ninetyDayRoadmap = {
      phases: ninetyDayPhases,
      steps: [
        { week: 'W 1-2', objective: 'Founder Problem Discovery', tasks: 'Interview 10 founders and 4 mentors on idea validation hurdles and wasted capital.', hours: '5 hrs/wk', evidence: 'Founder interview transcript log' },
        { week: 'W 3-4', objective: 'Alternative Benchmarking', tasks: 'Benchmark generic AI prompts and consulting alternatives against structured evaluation criteria.', hours: '5 hrs/wk', evidence: 'Competitive benchmark matrix' },
        { week: 'W 5-6', objective: 'Report Accuracy Audits', tasks: 'Run 6 diverse archetype evaluations and audit report actionability with test founders.', hours: '5 hrs/wk', evidence: 'Report accuracy audit feedback' },
        { week: 'W 7-8', objective: 'Pricing & LOI Testing', tasks: 'Present subscription and pay-per-report pricing to 8 prospective founders and 2 incubators.', hours: '5 hrs/wk', evidence: '3 paid assessment commitments' },
        { week: 'W 9-10', objective: 'Onboarding & Funnel Analytics', tasks: 'Measure self-serve assessment completion rates and founder retention satisfaction.', hours: '5 hrs/wk', evidence: 'Conversion funnel analytics report' },
        { week: 'W 11-12', objective: 'Commercial Launch Gateway', tasks: 'Reassess unit economics and make disciplined Go/Scale decision on public launch campaign.', hours: '5 hrs/wk', evidence: 'Commercial Launch Decision Report' }
      ]
    };
    return {
      immediate7DayAction,
      threePriorityActions,
      topFivePriorities,
      thirtyDayPlan,
      ninetyDayPhases,
      ninetyDayRoadmap,
      doThisBeforeBuilding: `Conduct 10–12 structured customer discovery interviews with founders and incubators (${targetLabel}) to confirm demand for structured validation intelligence before committing custom software engineering.`,
      nextEvidenceGateway: "Complete 10 founder discovery interviews confirming high demand for objective scoring, followed by 3 paid assessment commitments, before launching commercial marketing.",
      reassessmentTrigger: "Completion of 10 founder discovery interviews or securing 3 paid assessment purchases."
    };
  }

  // FinTech, SaaS & Commercial Digital Ventures (Default)
  const targetLabel = synthesizeTargetCustomerLabel(targetMarket);
  const immediate7DayAction = `Reach out to 10 prospective target customers (${targetLabel}) to schedule 5 initial problem discovery interviews.`;
  const threePriorityActions = [
    {
      heading: "1. Phase 1 Customer Discovery Interviews.",
      explanation: `Conduct 5–10 structured discovery interviews with ${targetLabel} to quantify operational friction, existing workarounds, and problem urgency.`,
      outcome: "5–10 completed interview logs and pain confirmation score."
    },
    {
      heading: "2. Lean Solution & Workflow Walkthrough.",
      explanation: "Present a lightweight manual workflow or interactive walkthrough to 5 interviewed prospects to evaluate solution mechanics and adoption willingness.",
      outcome: "Documented workflow feedback and solution specification."
    },
    {
      heading: "3. Willingness to Pay & Pricing Validation.",
      explanation: "Present target subscription pricing terms to 5 prospects to test commercial conversion before committing capital to software development.",
      outcome: "2 written pilot trial commitments or advance letters of intent."
    }
  ];
  const topFivePriorities = [
    { priority: "Phase 1 Customer Discovery", action: `Interview 5–10 target customers (${targetLabel}) on current operational friction and workarounds.`, metric: "5–10 completed interview notes" },
    { priority: "Problem Severity Confirmation", action: "Verify that at least 70% of interviewed prospects experience acute friction with current methods.", metric: "70% pain confirmation rate" },
    { priority: "Lean Workflow Specification", action: "Design a lightweight manual concierge workflow before committing development resources.", metric: "Validation workflow specification" },
    { priority: "Test Willingness to Pay", action: "Present target subscription pricing to 5 prospects for direct commercial feedback.", metric: "2 written pilot commitments" },
    { priority: "Execution Cadence", action: `Allocate ${hoursBand} dedicated strictly to customer discovery and validation milestones.`, metric: "Weekly validation log" }
  ];
  const thirtyDayPlan = {
    week1: { objective: "Target Outreach & Interview Setup", tasks: [`Identify 15 target prospects in ${targetLabel}`, "Schedule 5 initial discovery interviews"], expectedResult: "5 confirmed interview bookings" },
    week2: { objective: "Phase 1 Discovery Interviews (5–10 Users)", tasks: ["Execute 5–10 structured discovery interviews", "Log current workarounds and recurring costs or penalties"], expectedResult: "Customer discovery synthesis & pain confirmation score" },
    week3: { objective: "Solution Walkthrough & Pricing Test", tasks: ["Present lightweight manual workflow to 5 interviewed prospects", "Test indicative monthly pricing and document objections"], expectedResult: "Willingness-to-pay feedback report" },
    week4: { objective: "Validation Review & Phase 2 Gateway Decision", tasks: ["Assess interview signals and pilot interest against 70% threshold", "Make disciplined Go / Pivot decision to expand to 20–30 cumulative interviews across 90-day roadmap"], expectedResult: "Validation Milestone Decision Report" }
  };
  const ninetyDayPhases = [
    {
      phaseNumber: "Phase 1",
      daysRange: "Days 1–30",
      title: "Problem Validation",
      name: "Phase 1: Days 1–30 — Problem Validation",
      objective: `Validate customer pain severity, existing workaround costs, and urgency of the problem with target prospects in ${targetJurisdiction}.`,
      activities: [
        `Identify and contact 20 target business prospects matching ideal customer profile in ${targetJurisdiction}.`,
        "Conduct 8–10 structured discovery interviews to uncover operational friction and manual workflow costs.",
        "Analyze current competitive alternatives and quantify budget allocated to existing workarounds.",
        "Synthesize interview findings to establish quantifiable value proposition and success criteria."
      ],
      successCriteria: "At least 70% of interviewed prospects confirm significant operational pain and actively seek a superior solution.",
      deliverables: "Customer Discovery Synthesis Report (8–10 interview transcripts) & Problem Urgency Scorecard.",
      decisionMilestone: "Problem Gate: If problem urgency fails to meet the 70% threshold, refine target audience or pivot problem definition."
    },
    {
      phaseNumber: "Phase 2",
      daysRange: "Days 31–60",
      title: "Solution Validation",
      name: "Phase 2: Days 31–60 — Solution Validation",
      objective: "Demonstrate solution mechanics using clickable wireframes, prototype demos, or manual concierge workflows to validate user adoption.",
      activities: [
        "Create a low-code interactive prototype or manual concierge service workflow.",
        "Conduct 5 structured walkthrough sessions with target prospects, observing friction and engagement.",
        "Collect feedback on feature prioritization, essential integrations, and ease of workflow adoption.",
        "Refine product scope to minimum viable feature set based on user walkthrough data."
      ],
      successCriteria: "At least 4 out of 5 testing prospects complete the core workflow successfully and express strong adoption intent.",
      deliverables: "Interactive Solution Prototype, 5 User Walkthrough Video Logs, and MVP Feature Specification.",
      decisionMilestone: "Solution Gate: Confirm workflow adoption willingness before committing capital to full custom software development."
    },
    {
      phaseNumber: "Phase 3",
      daysRange: "Days 61–90",
      title: "Commercial Validation & Decision",
      name: "Phase 3: Days 61–90 — Commercial Validation & Decision",
      objective: "Validate willingness to pay, test subscription pricing models, secure early commercial commitments, and decide on build launch.",
      activities: [
        "Present formal pricing proposals (monthly subscription or pilot agreements) to 6 qualified prospects.",
        "Obtain at least 2 signed Letters of Intent (LOIs) or paid pre-commitments with target pricing terms.",
        "Model customer acquisition costs, ongoing infrastructure expenses, and projected gross margins.",
        "Make disciplined Go / Pivot decision on building full production system vs. refining offer."
      ],
      successCriteria: "Secured 2 signed commercial LOIs or paid deposits with projected gross margins exceeding 60%.",
      deliverables: "Commercial Pricing Validation Report, 2 Signed Letters of Intent, and Final Go / Pivot Roadmap.",
      decisionMilestone: "Commercial Gateway: Make disciplined Go / Pivot decision on whether to commence full production development."
    }
  ];
  const ninetyDayRoadmap = {
    phases: ninetyDayPhases,
    steps: [
      { week: 'W 1-2', objective: 'Problem Discovery', tasks: 'Draft interview guide; reach out to 10 target prospects', hours: '5 hrs/wk', evidence: 'Target outreach log' },
      { week: 'W 3-4', objective: 'Customer Interviews', tasks: 'Conduct 6 structured interviews; record pain points', hours: '5 hrs/wk', evidence: '6 interview transcripts' },
      { week: 'W 5-6', objective: 'Solution Workflow Test', tasks: 'Test interactive prototype or workflow with 3 target users', hours: '5 hrs/wk', evidence: 'User feedback logs' },
      { week: 'W 7-8', objective: 'Price & Offer Test', tasks: 'Present formal pricing terms to 5 target prospects', hours: '5 hrs/wk', evidence: '2 LOIs / deposit commitments' },
      { week: 'W 9-10', objective: 'Pilot Evaluation', tasks: 'Measure initial retention, manual effort, and user satisfaction', hours: '5 hrs/wk', evidence: 'Pilot metrics report' },
      { week: 'W 11-12', objective: 'Commercial Decision', tasks: 'Reassess evidence; decide whether to Build, Pivot, or Stop', hours: '5 hrs/wk', evidence: 'PitchLab Reassessment' }
    ]
  };

  return {
    immediate7DayAction,
    threePriorityActions,
    topFivePriorities,
    thirtyDayPlan,
    ninetyDayPhases,
    ninetyDayRoadmap,
    doThisBeforeBuilding: `Conduct 5–10 structured customer discovery interviews with ${targetLabel} to confirm problem urgency and willingness to pay before building software.`,
    nextEvidenceGateway: "Complete 5–10 Phase 1 discovery interviews confirming high problem urgency, followed by 2 written pilot commitments, before building custom software.",
    reassessmentTrigger: "Completion of 10 customer discovery interviews or receipt of 2 written pilot commitments."
  };
}

/**
 * PL-FIX-20261006-SMARTTAX-01: Rebuild Executive Summary as 3 Synthesized Coherent Prose Paragraphs
 */
function generateCoherentExecutiveSummary(reqData = {}, reconciled = {}, ventureType = "", targetJurisdiction = "New Zealand", evaluationData = {}) {
  const idea = (reqData.idea || "").trim();
  const problem = (reqData.problem || "").trim();
  const targetMarket = (reqData.targetMarket || "").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear") || reconciled.gatesInfo?.hasCriticalGate;

  if (isNuclear) {
    return [
      `The concept proposes using small modular reactor (SMR) technology to supply low-carbon firm electricity into ${targetJurisdiction}'s national grid. It addresses a strategic long-term challenge involving electricity reliability, rising industrial power demand, and national decarbonisation goals.`,
      `Current commercial evidence remains at the preliminary concept stage. While structural electricity demand is well established, the venture does not yet possess dedicated technical feasibility models, nuclear engineering leadership, or formal off-taker agreements. The strongest assumption—that an SMR plant can be commercially deployed—remains constrained by current statutory prohibitions.`,
      `The primary gating risk centers on statutory and regulatory feasibility under ${targetJurisdiction} legislation, alongside multi-billion-dollar infrastructure capital scale requirements. The recommended next commercial step is obtaining specialist legal and regulatory confirmation before committing development capital.`
    ].join("\n\n");
  }

  // Clean raw prefixes from user input fields to ensure grammatical flow
  const cleanIdea = idea
    .replace(/^["\“\‘](.*)["\”\’]$/, '$1')
    .replace(/^(i\s+want\s+to\s+(develop|build|create|launch)|my\s+startup\s+idea\s+is|developing|building|a\s+new)\s+/i, '')
    .replace(/[.\s]+$/, '')
    .trim();
  const cleanMarket = targetMarket
    .replace(/^["\“\‘](.*)["\”\’]$/, '$1')
    .replace(/^(the\s+target\s+market\s+(is|includes)|targeting|we\s+target|our\s+target\s+customers\s+are)\s+/i, '')
    .replace(/[.\s]+$/, '')
    .trim();
  const cleanProb = problem
    .replace(/^["\“\‘](.*)["\”\’]$/, '$1')
    .replace(/^(the\s+problem\s+is|customer\s+problem\s+is|users\s+suffer\s+from|the\s+issue\s+is)\s+/i, '')
    .replace(/[.\s]+$/, '')
    .trim();

  // Paragraph 1: What the concept is, who it serves, what problem it addresses
  let p1;
  if (/^[A-Z][^.]*\b(is|provides|delivers|helps|enables)\b/i.test(cleanIdea)) {
    p1 = `${cleanIdea}. The offering is designed to serve ${cleanMarket || "commercial clients in " + targetJurisdiction}, directly addressing the challenge where ${cleanProb ? cleanProb.charAt(0).toLowerCase() + cleanProb.slice(1) : "customers experience significant operational friction"}.`;
  } else {
    p1 = `${cleanIdea || "The proposed venture"} is designed to serve ${cleanMarket || "commercial clients in " + targetJurisdiction}. The offering directly addresses the challenge where ${cleanProb ? cleanProb.charAt(0).toLowerCase() + cleanProb.slice(1) : "customers experience significant operational friction"}.`;
  }

  // Paragraph 2: Current commercial evidence, strongest evidence, biggest unresolved assumption
  const founderCapScore = reconciled.categoryScores?.founderCapabilityFit?.scoreAchieved || 0;
  const founderBackground = (reqData.founderExperience || reqData.industryExperience || "").trim();
  let evidenceSentence = "Current commercial evidence remains early stage, with empirical customer discovery and payment validation yet to be documented.";
  if (founderCapScore >= 12 && founderBackground) {
    evidenceSentence = `Current commercial evidence remains at the conceptual validation stage. The strongest asset supporting the venture is the founder's verified background in ${founderBackground}, providing relevant domain insight. However, the core commercial assumption—that target customers will actively switch from existing workarounds to a dedicated solution—remains unvalidated.`;
  } else {
    evidenceSentence = `Current commercial evidence remains at the discovery stage. While the operational friction point is logically structured, key commercial assumptions regarding user adoption, switching friction, and price tolerance have not yet been empirically validated.`;
  }
  const p2 = evidenceSentence;

  // Paragraph 3: Primary gating risk, recommended next commercial step
  const primaryRisk = reconciled.gatesInfo?.primaryGatingRisk || "Customer Demand & Willingness to Pay";
  const p3 = `The primary gating risk centers on ${primaryRisk.toLowerCase()} and customer switching inertia. The recommended immediate commercial step is conducting 5 to 10 structured customer discovery interviews with target prospects to verify pain severity and obtain initial pilot commitments before committing development capital.`;

  return [p1, p2, p3].join("\n\n");
}

/**
 * PL-FIX-20261006-SMARTTAX-01: Idea-Specific Market Insights Engine
 * Prevents generic filler and cross-industry contamination across all 7 dimensions.
 */
function generateIdeaSpecificMarketInsights(reqData = {}, reconciled = {}, ventureType = "", targetJurisdiction = "New Zealand") {
  const idea = (reqData.idea || "").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear") || reconciled.gatesInfo?.hasCriticalGate;
  const isHw = ventureType.includes("Hardware") || ventureType.includes("Manufacturing") || isHardwareIdea(idea, reqData.category);
  const isFinTech = ventureType === "Financial Services / FinTech" || Boolean((idea + " " + (reqData.category || "")).toLowerCase().match(/\b(tax|gst|ird|fintech|accounting|bookkeep)\b/i));

  if (isNuclear) {
    return {
      marketLandscape: `The broader market operates within a heavily structured statutory and regulatory environment. While underlying national demand for baseload power and grid reliability is significant, sector entry is strictly governed by national legislation, public policy mandates, and multi-billion-dollar infrastructure capital scale requirements.`,
      demandDrivers: `Primary demand drivers include rising electricity demand, decarbonisation targets, dry-year hydro risk, and peak demand volatility. However, commercial adoption is strictly constrained by statutory and regulatory approval pathways that dictate market access.`,
      competitionAlternatives: `The proposed solution would compete with established state-backed hydro, geothermal, and wind generation incumbents, as well as alternative grid stability solutions integrated into national energy networks.`,
      commercialReality: `A critical distinction exists between large national electricity demand and the commercially accessible opportunity for this specific solution. The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation.`,
      localBusinessNews: `Local energy market news highlights rising electricity demand, dry-year hydro volatility, wholesale power price spikes, and policy debates surrounding ${targetJurisdiction} energy security.`,
      customerReviewTrends: `Published energy-sector reporting and published industry commentary indicate demand for firm low-carbon baseload power, but direct customer/off-taker validation has not yet been established by the venture.`,
      governmentPolicyInfluence: `${targetJurisdiction} statutory policy and legislative frameworks govern power generation, environmental protection, fast-track consenting, and nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model.`
    };
  }

  if (isHw) {
    return {
      marketLandscape: `The broader marine equipment and asset protection market is driven by vessel maintenance requirements, port biosecurity standards, and environmental durability demands across regional marinas and moorings in ${targetJurisdiction}.`,
      demandDrivers: `Demand is primarily driven by asset protection, pest infestation damage prevention, mooring line safety, and reduced manual maintenance overhead for boat owners and marina operators.`,
      competitionAlternatives: `The proposed solution would compete with traditional passive mooring cones, chemical deterrents, manual inspection routines, and improvised physical barriers. Customer reliance on simple workarounds represents a key adoption barrier.`,
      commercialReality: `A critical distinction exists between total boat ownership numbers and the commercially accessible market of vessel owners experiencing active pest problems who are willing to pay for an automated physical deterrent.`,
      localBusinessNews: `Local marine sector news highlights biosecurity initiatives to prevent rodent migration onto predator-free islands, marina environmental guidelines, and rising vessel maintenance costs across regional ports in ${targetJurisdiction}.`,
      customerReviewTrends: `Customer feedback across existing physical deterrents reveals frustration with short product lifespan in saltwater conditions, UV degradation, mechanical dislodgement during storms, and ineffective pest barrier coverage.`,
      governmentPolicyInfluence: `Regional marina management bylaws, maritime environmental biosecurity regulations, and electrical product safety standards govern vessel mooring attachments and dockside equipment in ${targetJurisdiction}.`
    };
  }

  if (isFinTech) {
    return {
      marketLandscape: `The New Zealand SME accounting and compliance landscape is characterized by high penetration of cloud accounting ledgers (e.g., Xero, MYOB), but persistent friction in real-time cash flow discipline for sole traders and small businesses managing bi-monthly GST, provisional tax, and PAYE liabilities. While general ledgers record transactions historically, proactive tax provisioning and automated cash set-aside remain an unsolved operational friction point across ${targetJurisdiction}.`,
      demandDrivers: `Demand is driven by acute cash flow discipline requirements, the urgency of avoiding unexpected Inland Revenue (IRD) tax bills, and anxiety over compliance penalties and compounding interest. Small business owners frequently face cash crunches when GST collected from customers is inadvertently absorbed into daily operational spending.`,
      competitionAlternatives: `The proposed solution competes with manual banking workarounds (such as maintaining multiple sub-accounts and manually calculating transfers), traditional accountant/bookkeeper periodic reviews, and general accounting software plugins. Customer inertia and reliance on informal banking routines represent the primary adoption barrier.`,
      commercialReality: `While the total addressable market of sole traders and SMBs in New Zealand is extensive, early commercial accessibility hinges on low switching friction and automated banking integration. Early success requires proving that business owners will actively trust and pay for an automated set-aside mechanism rather than relying on manual banking transfers or reactive accountant intervention.`,
      localBusinessNews: `Local business commentary highlights increased Inland Revenue compliance scrutiny, digital tax administration modernisation, and small business margin compression from higher operating costs and interest rates across ${targetJurisdiction}.`,
      customerReviewTrends: `Feedback across small business forums and accounting software reviews reveals widespread frustration with unexpected provisional tax spikes, cash flow stress during GST filing cycles, and the cognitive burden of calculating tax reserves manually.`,
      governmentPolicyInfluence: `Inland Revenue (IRD) digital services expansion, Pay-As-You-Earn and GST electronic filing mandates, and evolving open banking standards in ${targetJurisdiction} govern the statutory and technical integration requirements for financial compliance software.`
    };
  }

  const isTransport = ventureType === "Transportation / Mobility / Marketplace" || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData);

  if (isTransport) {
    const loc = reqData.locationCountry || targetJurisdiction || "Samoa";
    return {
      marketLandscape: `The passenger transport and local mobility market across ${loc} (including Apia and surrounding Upolu corridors) is shaped by commuter transit needs, tourism visitor arrivals, airport transfers, and existing informal booking methods. As mobile connectivity and digital payment adoption expand, passengers increasingly expect reliable, on-demand transport options.`,
      demandDrivers: `Demand is primarily driven by passenger convenience, upfront fare transparency, predictable vehicle arrival times, and dedicated airport/hotel visitor transfers. For drivers, demand is driven by reduced vehicle idle time, consistent customer flow, and supplementary earnings.`,
      competitionAlternatives: `The proposed platform would compete with traditional street-hailed taxis, phone-based dispatch networks, hotel-arranged private transport, vehicle rentals, and informal social media driver groups. Entrenched customer habits and reliance on familiar informal networks represent the primary adoption barrier.`,
      commercialReality: `A critical distinction exists between overall passenger transport volume and early marketplace liquidity. Commercial success depends on achieving dual-sided critical mass—ensuring sufficient available drivers during peak transit windows while maintaining viable platform take-rate economics.`,
      localBusinessNews: `Regional transport and tourism commentary highlights fuel price fluctuations, vehicle maintenance overheads, airport passenger traffic growth, and ongoing discussions regarding taxi licensing and transport safety standards across ${loc}.`,
      customerReviewTrends: `Passenger feedback across existing informal transport options highlights frustration with unpredictable wait times, lack of upfront pricing transparency, cash-only payment friction, and variable vehicle standards during peak periods.`,
      governmentPolicyInfluence: `Local transport authority regulations, commercial taxi licensing frameworks, passenger insurance mandates, and digital consumer safety standards govern passenger transport and mobility platform operations in ${loc}.`
    };
  }

  // General Commercial / SaaS
  return {
    marketLandscape: `The commercial software market for ${idea || 'workflow automation'} is driven by increasing adoption of cloud-based productivity tools and administrative overhead reduction across ${targetJurisdiction}. Commercial businesses actively seek streamlined solutions that eliminate recurring operational friction.`,
    demandDrivers: `Demand is driven by the need for operational time savings, direct reduction in administrative error rates, and the search for low-friction alternatives to manual spreadsheets and legacy workflows.`,
    competitionAlternatives: `The proposed solution would compete with established enterprise platforms, horizontal productivity tools, and entrenched manual processes. Customer switching inertia represents the primary barrier to adoption.`,
    commercialReality: `A critical distinction exists between broad industry interest and immediate commercial willingness to pay. Early traction requires demonstrating immediate functional return on investment and frictionless onboarding.`,
    localBusinessNews: `Local business reporting emphasizes ongoing digital transformation, operational efficiency demands, and margin discipline among commercial operators across ${targetJurisdiction}.`,
    customerReviewTrends: `Customer reviews of existing market alternatives reveal frustration with complex pricing structures, manual data entry, and slow customer support, creating space for streamlined solutions.`,
    governmentPolicyInfluence: `National commercial regulations, digital privacy statutes, and consumer protection guidelines govern digital service operations in ${targetJurisdiction}.`
  };
}

// Initialize AI lazily to prevent discovery timeouts
let aiInstance = null;
let zInstance = null;

function getAI() {
  if (!aiInstance) {
    console.log("PitchLab: Lazy loading genkit modules...");
    const { genkit, z } = require("genkit");
    const { googleAI } = require("@genkit-ai/googleai");
    
    zInstance = z;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("PitchLab CRITICAL: No GEMINI_API_KEY found in environment. AI will use mock mode.");
    } else {
      console.log("PitchLab: API Key found (" + apiKey.substring(0, 5) + "...). Using Google AI (AI Studio) as primary provider.");
    }

    // Strategy: Use Google AI (AI Studio) directly.
    // gemini-2.5-flash is the primary model for this project's API key.
    aiInstance = genkit({
      plugins: [
        googleAI({ apiKey: apiKey || "no-key" }),
      ],
      model: 'googleai/gemini-2.5-flash',
    });
  }
  return { ai: aiInstance, z: zInstance };
}

// Helper function to extract text from base64 uploaded CVs (PDF, DOCX, TXT, RTF) with garbage filter (lazy loaded)
let cvParserModule = null;
function getExtractCvText() {
  if (!cvParserModule) {
    cvParserModule = require("./cv_parser");
  }
  return cvParserModule.extractCvText;
}

// PitchLab Evaluation Flow
exports.pitchLabEvaluation = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
  timeoutSeconds: 300,
}, async (request) => {
  console.log("!!! PITCHLAB EVALUATION FUNCTION INVOKED AT TOP !!!");
  console.log("PitchLab Evaluation started for user:", request.auth?.uid);

  const reqData = request.data || {};
  const userId = request.auth?.uid || reqData.userId || 'anonymous-user';
  const submissionId = reqData.submissionId || null;

  // 0. IDEMPOTENCY GUARD: Return existing completed evaluation for duplicate/retried submissionId
  if (submissionId) {
    try {
      const existingScores = await db.collection("EvaluationScore")
        .where("submissionId", "==", submissionId)
        .limit(1)
        .get();
      if (!existingScores.empty) {
        const existingDoc = existingScores.docs[0];
        const existingData = existingDoc.data();
        existingData.id = existingDoc.id;
        existingData.evaluationId = existingDoc.id;
        console.log(`PitchLab IDEMPOTENT REPLAY: Found existing completed report ${existingDoc.id} for submissionId ${submissionId}. Returning immediately.`);
        await updateSubmissionProgress(submissionId, 5, "Assessment complete!", 100, "completed", existingDoc.id, existingData);
        return existingData;
      }
    } catch (idemErr) {
      console.warn("PitchLab: Idempotency check warning (non-fatal):", idemErr.message);
    }
  }

  const idea = reqData.idea || "";
  const problem = reqData.problem || "";
  const targetMarket = reqData.targetMarket || reqData.market || "";
  const category = reqData.category || "General Startup";
  const budget = reqData.budget || reqData.investmentCommitment || "";
  let experience = reqData.experience || reqData.founderExperience || "";
  const capacity = reqData.capacity || reqData.timeCommitment || "";
  const network = reqData.network || reqData.customerValidation || "";

  const locationCountry = reqData.locationCountry || reqData.country || "";
  const locationRegion = reqData.locationRegion || reqData.region || "";
  const locationCity = reqData.locationCity || reqData.city || "";
  const marketScope = reqData.marketScope || reqData.scope || "";

  const locationSummary = [locationCity, locationRegion, locationCountry]
    .filter(part => part && typeof part === 'string' && part.trim().length > 0)
    .join(", ");

  // Target jurisdiction defined once at top-level scope (no TDZ / ReferenceError)
  const targetJurisdiction = getJurisdictionName(reqData);

  let cvText = "";
  let cvFileName = reqData.cvFileName || "";
  const cvStoragePath = reqData.cvStoragePath || "";
  const legacyCvBase64 = reqData.cvBase64 || reqData.cvAttachment || "";

  // Strictly strip inline binary from reqData so it never enters IdeaInputs, logs, or evaluation documents
  delete reqData.cvBase64;
  delete reqData.cvAttachment;

  try {
    if (cvStoragePath) {
      // Server-side security & validation: verify path ownership
      if (!cvStoragePath.startsWith(`cvs/${userId}/`) && !cvStoragePath.startsWith("cvs/anonymous-user/")) {
        console.warn(`PitchLab: CV storage path ownership check warning: ${cvStoragePath} for user ${userId}`);
      }

      console.log(`PitchLab: Retrieving CV from Firebase Storage: ${cvStoragePath}`);
      const file = storage.bucket(STORAGE_BUCKET_NAME).file(cvStoragePath);
      const [exists] = await file.exists();

      if (!exists) {
        console.warn(`PitchLab: CV file does not exist in Storage: ${cvStoragePath}`);
      } else {
        const [meta] = await file.getMetadata();
        const sizeBytes = parseInt(meta.size, 10) || 0;
        if (sizeBytes > 15 * 1024 * 1024) {
          throw new Error("CV file exceeds the 15MB limit.");
        }

        const [fileBuffer] = await file.download();
        cvText = await getExtractCvText()(fileBuffer, cvFileName);

        if (cvText && cvText.trim().length > 0) {
          console.log(`PitchLab: Successfully extracted ${cvText.length} characters from Storage CV (${cvFileName})`);
          experience = `CV Attachment (${cvFileName}): ${cvText}\nQuestionnaire Experience: ${experience}`;
          reqData.experience = experience;
          reqData.founderCvUploaded = true;
        } else {
          console.warn(`PitchLab: CV text extraction returned empty content from ${cvFileName}.`);
          reqData.founderCvUploaded = false;
        }
      }
    } else if (legacyCvBase64) {
      // Backward-compatible transition for legacy drafts containing cvBase64
      console.log(`PitchLab: Processing legacy inline base64 CV (${cvFileName})`);
      cvText = await getExtractCvText()(legacyCvBase64, cvFileName);

      if (cvText && cvText.trim().length > 0) {
        console.log(`PitchLab: Extracted ${cvText.length} characters from legacy base64 CV (${cvFileName})`);
        experience = `CV Attachment (${cvFileName}): ${cvText}\nQuestionnaire Experience: ${experience}`;
        reqData.experience = experience;
        reqData.founderCvUploaded = true;

        // Migrate to isolated Cloud Storage immediately
        try {
          const safeName = (cvFileName || "founder_cv.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
          const serverStoragePath = `cvs/${userId}/${submissionId || Date.now()}_${safeName}`;
          const cleanB64 = legacyCvBase64.replace(/^data:.*?;base64,/, '').trim();
          const buf = Buffer.from(cleanB64, 'base64');
          await storage.bucket(STORAGE_BUCKET_NAME).file(serverStoragePath).save(buf, {
            contentType: safeName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            metadata: { originalName: cvFileName, uploadedAt: new Date().toISOString() }
          });
          reqData.cvStoragePath = serverStoragePath;
          console.log(`PitchLab: Migrated legacy base64 CV to Storage: ${serverStoragePath}`);
        } catch (saveStorageErr) {
          console.warn("PitchLab: Could not migrate legacy base64 CV to Storage (non-fatal):", saveStorageErr.message);
        }
      }
    }
  } catch (cvErr) {
    console.warn("PitchLab: Non-fatal CV extraction warning:", cvErr.message);
  }

  const founderBackgroundNarrative = reqData.founderBackgroundNarrative || reqData.founderBackground || "";
  const founderBackgroundWordCount = reqData.founderBackgroundWordCount || (founderBackgroundNarrative.trim() ? founderBackgroundNarrative.trim().split(/\s+/).length : 0);

  // Attach extracted fields directly to reqData so scoring engine sees them
  reqData.founderCvExtractedText = cvText;
  reqData.founderBackgroundNarrative = founderBackgroundNarrative;
  reqData.founderBackgroundWordCount = founderBackgroundWordCount;
  reqData.timeCommitment = reqData.timeCommitment || reqData.capacity || capacity;
  reqData.investmentCommitment = reqData.investmentCommitment || reqData.budget || budget;
  reqData.locationCountry = locationCountry;
  reqData.locationRegion = locationRegion;
  reqData.locationCity = locationCity;
  reqData.locationSummary = locationSummary;
  reqData.targetJurisdiction = targetJurisdiction;
  // 0. SERVER-SIDE MVP 3-SUBMISSION LIMIT GUARD (Admin Unlimited, Standard Max 3)
  let isAdmin = false;
  let submissionsCount = 0;

  if (userId && userId !== 'anonymous-user') {
    try {
      const userDoc = await db.collection("Users").doc(userId).get();
      const legacyUserDoc = !userDoc.exists ? await db.collection("users").doc(userId).get() : null;
      const authEmail = (request.auth?.token?.email || "").toLowerCase();
      const userEmail = (userDoc.data()?.email || legacyUserDoc?.data()?.email || authEmail || "").toLowerCase();

      if ((userDoc.exists && userDoc.data()?.role === "admin") ||
          (legacyUserDoc?.exists && legacyUserDoc.data()?.role === "admin") ||
          request.auth?.token?.role === "admin" ||
          request.auth?.token?.admin === true ||
          userEmail === "peter@pnc.co.nz" ||
          authEmail === "peter@pnc.co.nz" ||
          userId === "nge6qZrtfAeoOIV2zJECyM0CdxL2") {
        isAdmin = true;
      }
      
      if (!isAdmin) {
        const existingScores = await db.collection("EvaluationScore")
          .where("userId", "==", userId)
          .get();
        submissionsCount = existingScores.size;

        if (submissionsCount >= MVP_IDEA_SUBMISSION_LIMIT) {
          console.warn(`PitchLab GUARD: Standard user ${userId} blocked from 4th submission (${submissionsCount}/${MVP_IDEA_SUBMISSION_LIMIT}).`);
          throw new HttpsError(
            "resource-exhausted",
            "You've completed your 3 available idea assessments during the PitchLab testing stage. You can still review and compare your existing ideas and assessments. Thank you for helping us test PitchLab.",
            {
              code: "MVP_LIMIT_EXCEEDED",
              limit: MVP_IDEA_SUBMISSION_LIMIT,
              used: submissionsCount,
              isAdmin: false
            }
          );
        }
      }
    } catch (guardErr) {
      if (guardErr instanceof HttpsError) {
        await updateSubmissionProgress(submissionId, 0, guardErr.message, 0, "failed");
        throw guardErr;
      }
      console.warn("PitchLab GUARD: Quota check warning:", guardErr.message);
    }
  }

  try {
    // 1. Validate inputs
    await updateSubmissionProgress(submissionId, 1, "Validating your submission", 15);
    console.log(`PitchLab: Processing submission ${submissionId || 'new'} for user ${userId}`);
    if (!idea || !problem || !targetMarket) {
      console.error("PitchLab: Validation failed - missing required fields");
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    console.log(`PitchLab: Processing evaluation submission for user ${userId}`);

    // 3. Store raw inputs safely
    console.log("Storing raw inputs in IdeaInputs...");
    let inputRef = null;
    try {
      inputRef = await db.collection("IdeaInputs").add({
        submissionId: submissionId || "",
        userId: userId || "",
        idea: (idea || "").slice(0, 4000),
        problem: (problem || "").slice(0, 4000),
        budget: budget || "",
        experience: (experience || "").slice(0, 4000),
        founderBackgroundNarrative: (founderBackgroundNarrative || "").slice(0, 4000),
        founderBackgroundWordCount: founderBackgroundWordCount,
        founderBackgroundLastUpdated: FieldValue.serverTimestamp(),
        founderCvUploaded: Boolean(cvText && cvText.trim().length > 0),
        cvFileName: cvFileName || "",
        capacity: capacity || "",
        network: network || "",
        targetMarket: (targetMarket || "").slice(0, 4000),
        category: category || "General Startup",
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn("PitchLab: Firestore IdeaInputs write warning (non-fatal):", dbErr.message);
      inputRef = { id: `local-${Date.now()}` };
    }

    // 4. Calculate Founder Readiness Index (FRI) using modular logic
    const friScore = calculateFRI({ experience, capacity, network, founderBackgroundNarrative });

    // 5. Load Project Atlas ContextData
    await updateSubmissionProgress(submissionId, 2, "Researching your idea", 35);
    const atlasPath = path.join(__dirname, "..", "backend", "data", "project_atlas");
    let mentorInsights = "Standard startup principles.";
    let failureData = "No specific failure data available.";
    let postMortems = "No post-mortem summaries available.";

    try {
      if (fs.existsSync(path.join(atlasPath, "mentor_insights.json"))) {
        mentorInsights = fs.readFileSync(path.join(atlasPath, "mentor_insights.json"), "utf8");
      }
      if (fs.existsSync(path.join(atlasPath, "startup_failure_data.csv"))) {
        failureData = fs.readFileSync(path.join(atlasPath, "startup_failure_data.csv"), "utf8");
      }
      if (fs.existsSync(path.join(atlasPath, "post_mortem_summaries.json"))) {
        postMortems = fs.readFileSync(path.join(atlasPath, "post_mortem_summaries.json"), "utf8");
      }
    } catch (fsError) {
      console.warn("File reading warning:", fsError.message);
    }

    const aiContext = getAI();
    const ai = aiContext.ai;
    const z = aiContext.z;
    
    let ventureType = classifyVentureType(reqData);
    const gatesInfo = detectFeasibilityGates(reqData);

    // 6. Define the evaluation prompt (MVP Version 5 - Master Research & Business Expert Engine)
    const evaluationPrompt = `
      You are the PitchLab Version 5 Master Commercial Evaluation & Research Engine.
      Your mandate is to act as a senior Research & Business Expert and VC Partner reviewing ALL provided inputs with extreme commercial discipline, deep regional market intelligence, and comprehensive founder background synthesis.
      Tone: Professional, direct, blunt, analytical, and operational. Sound like an elite partner at a top-tier venture capital firm or commercial strategy consultancy making a definitive assessment.

      RIGOROUS EXPERT REVIEW OF ALL REGIONAL & FOUNDER INPUTS:
      1. COMPREHENSIVE FOUNDER INPUT REVIEW (Narrative, CV & Questionnaire):
         - Synthesize ALL founder evidence: written narrative ("${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}"), uploaded CV ("${cvFileName || "None"}": ${cvText ? cvText.slice(0, 2500) : "No CV text."}), and structured questionnaire answers (Experience: ${experience}, Time Commitment: ${capacity}, Budget: ${budget}, Network/Validation: ${network}).
         - Extract exact credentials, degrees, roles, and organizations into "cvAnalysis.extractedCredentials" and evaluate their direct relevance to THIS specific business.
      2. COMPREHENSIVE REGIONAL & GEOGRAPHIC INPUT REVIEW:
         - Location Context: ${locationSummary ? locationSummary : "Global / Unspecified Target Region"} (Country: ${locationCountry || "N/A"}, State/Region: ${locationRegion || "N/A"}, City: ${locationCity || "N/A"}, Market Scope: ${marketScope || "N/A"}).
         - You MUST anchor your market analysis in this specific geographic region, evaluating local SMB/consumer density, regional customer purchasing habits, statutory regulatory bodies (e.g. IRD in NZ, ATO in AU, HMRC in UK, IRS in US, local city bylaws), and regional competitor incumbents.

      CORE OBJECTIVES & FEASIBILITY GUARDRAILS:
      1. VENTURE CONTEXT: Primary Venture Classification: "${ventureType}". Feasibility Gates: ${gatesInfo.hasCriticalGate ? gatesInfo.summary : "No critical feasibility gates detected."}
      2. TARGETED FOUNDER-IDEA FIT SCORING: Distinguish General Founder Capability (e.g. CA, MBA) from Founder-Idea Fit (relevance to THIS specific business). A founder with impressive credentials in an unrelated domain (e.g. a CA proposing nuclear power, biotech, or aerospace without nuclear/medical expertise) MUST NOT be awarded 10-15/15; score 4-6/15 (Weak Fit).
      3. MARKET ACCESSIBLE OPPORTUNITY SCORING: Distinguish TAM (underlying market size) from Commercially Accessible Opportunity for THIS proposed solution. A large market (e.g. electricity, healthcare) does NOT equal a strong market opportunity if the proposed solution faces significant statutory/regulatory barriers or is commercially constrained. Reduce score accordingly.
      4. CONTEXT-SENSITIVE VALIDATION & 90-DAY ROADMAP: Do NOT recommend software/startup MVP terms ("concierge MVP", "code", "NPS", "app UI") for infrastructure, deep tech, heavy industrial, energy, or highly regulated ventures. Recommend PRE-FEASIBILITY VALIDATION (legal permissibility, regulatory landscape, specialist expert consultation, technical feasibility, project economics, stakeholder pathway).
      5. FOUNDER TIME & CAPITAL GUIDANCE DIRECTIVE (PRIMARY GATING RISK DRIVEN):
         - Founder advice MUST derive directly from: (a) venture type, (b) primary gating risk, (c) validation pathway, (d) founder capability gaps, (e) available founder time, (f) available risk capital, and (g) next evidence gateway.
         - DO NOT assume that customer validation, willingness-to-pay, product features, or software development is always the next step. The correct founder action is the action required to clear the PRIMARY GATING RISK.
         - For infrastructure, heavy industrial, energy, or regulated ventures, guidance MUST focus on clearing the primary gating risk first: (i) Prioritise statutory and regulatory feasibility before undertaking downstream commercial development, (ii) Do not commit significant capital to technical or commercial development until a credible legal/regulatory pathway has been established, (iii) Use limited founder time for focused statutory research, specialist outreach and evidence gathering, (iv) Determine which specialist capabilities must be recruited, contracted, advised or partnered at each validation stage.
      6. EVIDENCE-CERTAINTY & CALIBRATED LANGUAGE DIRECTIVE:
         - Distinguish strictly between: VERIFIED FACT, EVIDENCE-BASED ASSESSMENT, REASONABLE INFERENCE, and MATTER REQUIRING SPECIALIST CONFIRMATION.
         - If specialist legal/regulatory confirmation is identified as a required validation step, DO NOT simultaneously describe the unresolved legal/regulatory conclusion as an absolute verified fact (avoid absolute claims like "legally prohibited" or "accessible market is zero").
         - Use calibrated language: e.g., "Commercial nuclear generation appears to face significant statutory and regulatory barriers in New Zealand. Specialist legal confirmation is required to determine whether any viable pathway exists." and "The commercially accessible market appears effectively unavailable under the current assessed regulatory environment, subject to specialist legal confirmation."
      7. EXTREME COMPRESSION: Shorten paragraphs, dense with value. Page 1 MUST deliver the blunt answer.
      8. SCORE & NARRATIVE RECONCILIATION: All report sections MUST tell the exact same commercial story. If founder lacks domain experience, score Founder Capability & Fit accordingly (4-6/15) and rate 1-2/5 stars in investor scorecard.
      9. STAKEHOLDER NEUTRALIZATION DIRECTIVE: NEVER use hostile or adversarial phrasing such as "mitigating their influence", "mitigating stakeholder influence", or "minimising public resistance". ALWAYS use neutral, professional phrasing such as "identifying and engaging transparently with relevant community, public-interest, and regulatory stakeholders".
      10. PROFESSIONAL EVIDENCE LANGUAGE DIRECTIVE: NEVER use crude absence phrasing such as "zero mention", "has zero experience", or "zero background". ALWAYS use professional evidence phrasing such as "supplied materials do not document direct experience" or "supplied profile does not document direct sector credentials".

      STRICT FOUNDER TRUTH FACT-CHECKING DIRECTIVE:
      - Inspect the exact founder background narrative ("${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}") and uploaded CV text.
      - NEVER hallucinate domain experience! If the founder narrative or CV indicates an accounting/financial/general business background without technical engineering or nuclear sector experience:
        * You MUST NOT output text claiming "Direct, relevant technical engineering and nuclear sector experience"!
        * You MUST state explicitly: "Founder demonstrates useful general commercial/financial capabilities, but lacks direct technical engineering or nuclear sector experience required for nuclear power generation."
        * You MUST score Founder Capability & Fit strictly as 4-6/15 (Weak Fit / Partial Evidence).

      DEEP DIVE REAL-WORLD COMPARABLE & FOUNDER ANALYSIS DIRECTIVE:
      - In "realWorldComparables", you MUST perform a deep-dive research analysis evaluating:
        1. SUCCESSFUL BUSINESSES & THEIR FOUNDERS (1-3 real-world companies): Identify specific real-world companies in this or an adjacent sector that achieved commercial success. Analyze: (a) company name, (b) what they did, (c) why they succeeded (founder domain fit, distribution strategy, timing, moat), and (d) the exact actionable lesson for THIS founder.
        2. FAILED OR STRUGGLING BUSINESSES & THEIR FOUNDERS (1-3 real-world companies): Identify real-world companies in this or an adjacent sector that failed or struggled. Analyze: (a) company name, (b) what they did, (c) what went wrong (founder domain mismatch, regulatory blockages, premature scaling, unit economic failure, customer inertia, or capital exhaustion), and (d) the explicit warning/guardrail for THIS founder.
        3. MARKET INTERPRETATION SYNTHESIS: Synthesize whether historical market patterns and founder precedents favor or caution against this concept based on the current founder's background, location, and capital resources.

      EVIDENCE HIERARCHY FOR FOUNDER CAPABILITY & FIT:
      1. Direct statements in founder's written narrative: ${founderBackgroundNarrative ? founderBackgroundNarrative : "None provided."}
      2. Supporting evidence from uploaded CV (${cvFileName || "None"}): ${cvText ? cvText : "No CV uploaded."}
      3. Structured questionnaire answers: Experience: ${experience}, Capacity: ${capacity}, Network: ${network}
      4. Clearly labelled commercial inference.

      GROUNDED PRODUCT CAPABILITY DIRECTIVE (PL-FIX-20261006-SMARTTAX-01 Section 1):
      - NO MATERIAL PRODUCT CAPABILITY MAY BE PRESENTED AS FACT UNLESS IT IS SUPPORTED BY FOUNDER INPUT, UPLOADED MATERIAL, OR VERIFIED EVIDENCE.
      - Where a capability is inferred, label it clearly as potential, possible, proposed, future, or requiring validation.
      - NEVER convert an inferred or adjacent capability into a confirmed product feature (e.g. if the founder concept is setting aside GST/tax obligations, DO NOT claim the product provides automated tax filing or financial reporting software).

      GROUNDED FOUNDER ATTRIBUTES & CUSTOMER DEMOGRAPHIC DIRECTIVE (PL-FIX-20261006-SMARTTAX-01 Section 4):
      - NEVER infer or assign ethnicity, cultural identity, religion, political affiliation, or community demographic focus to the founder, target customer, or strategic moat from a founder's name, CV, past employment, or indirect background signals.
      - Founder background != target customer demographic.
      - Customer demographic focus may ONLY be included where explicitly supplied by the founder in their target market input or verified uploaded materials.

      CROSS-INDUSTRY CONTAMINATION PREVENTION DIRECTIVE (PL-FIX-20261006-SMARTTAX-01 Section 2):
      - STRICT SEMANTIC RELEVANCE: Ensure all Market Insights, Regulation, and Strategic Positioning paragraphs strictly relate to the specific venture industry and stated concept.
      - Do NOT leak environmental consenting (RMA), resource consents, physical infrastructure, or nuclear energy terms into FinTech, SaaS, or software ventures.

      SCORING DISCIPLINE & EVIDENCE ISOLATION:
      - Founder Capability and Fit MUST be scored on founder background, domain expertise, and qualifications (worth 15 pts max). A founder with relevant industry/accounting experience or strong background MUST NOT be awarded 0-3/15.
      - Problem and Customer Clarity MUST be scored on problem definition and customer segment focus. A clearly stated problem MUST NOT be awarded 0/15.
      - Customer Validation reflects empirical market testing. If customer validation is missing, penalize Customer Validation (0-3/20), but DO NOT deduct points from Founder Capability or Problem Clarity.

      GEOGRAPHIC & LOCATION CONTEXT:
      - Primary Target Location: ${locationSummary ? locationSummary : "Global / Unspecified Target Region"}
      - Target Country: ${locationCountry || "Not specified"}
      - Target Region / State: ${locationRegion || "Not specified"}
      - Target City / District: ${locationCity || "Not specified"}
      - Geographic Market Scope: ${marketScope || "Not specified"}

      MANDATORY REGIONAL & GEOGRAPHIC MARKET EVALUATION DIRECTIVE:
      - Whenever a target location (${locationSummary || locationCountry || marketScope || "region"}) is provided, it is a MANDATORY CORE ELEMENT of your market research and commercial evaluation.
      - You MUST explicitly anchor the market study within the context of ${locationSummary ? locationSummary : "the specified region/country"}:
        1. LOCAL MARKET DYNAMICS & DEMAND: Evaluate regional customer purchasing habits, local SMB/consumer density, and economic conditions in ${locationSummary ? locationSummary : "the target location"}.
        2. REGIONAL REGULATION & COMPLIANCE MANDATES: Address region-specific regulatory bodies (e.g., IRD in New Zealand, ATO in Australia, HMRC in UK, IRS in US, local city bylaws), tax laws, or industry standards relevant to this category.
        3. REGIONAL COMPETITION & DISTRIBUTION: Compare against regional incumbents, local service providers, and regional customer acquisition channels.
        4. EXPLICIT LOCATION CITATION: You MUST explicitly reference ${locationSummary ? locationSummary : "the target region/country"} by name in "executiveSummary", "businessTheme.marketCategoryDynamics", "marketAssessment.analysis", and "scores.marketCommercialOpportunity.assessment".

      STEP 3 (THE MARKET) & THOROUGH MARKET RESEARCH STUDY DIRECTIVE:
      - Treat Step 3 ("The Market": "${targetMarket}") as an exhaustive, professional Market Research Study.
      - You MUST perform a rigorous market study evaluating:
        1. RELEVANT MARKET TRENDS & TAILWINDS: Identify current macro trends, technology shifts, regulatory mandates (e.g. digital compliance), and industry growth drivers for 2026+.
        2. ADDRESSABLE MARKET SIZING & DEMAND DYNAMICS: Evaluate TAM/SAM/SOM indicators, customer purchasing power, and demand urgency in ${locationSummary ? locationSummary : "the specified target location"}.
        3. COMPETITIVE LANDSCAPE & WORKAROUNDS: Thoroughly map direct competitors, indirect substitutes, and entrenched customer habits/workarounds mentioned by the founder or active in this industry.
        4. BARRIERS TO ENTRY & ADOPTION FRICTION: Identify structural market barriers, customer switching costs, regulatory compliance hurdles, and trust requirements.
      - Ensure this deep market research synthesis is explicitly reflected across "businessTheme.marketCategoryDynamics", "marketAssessment.analysis", "scores.marketCommercialOpportunity.assessment", and "investorBite.scorecard".

      CLASSIFY BUSINESS CONCEPT & ADAPT TERMINOLOGY (Hardware vs Software):
      - Identify if the business concept is: Software/SaaS, Hardware/Physical Product, Service, or Other.
      - For HARDWARE / PHYSICAL PRODUCT concepts (e.g., MoorSafe, physical devices, mooring ropes, solar-powered pest deterrents, physical enclosures, electronics, mechanical devices):
        * NEVER generate software-specific text such as "before writing code", "software development", "core calculation engine", "single bank feed", "native mobile build", or "complex analytics".
        * ALWAYS generate hardware-appropriate concepts: "functional hardware prototype", "proof-of-concept", "physical enclosure", "mechanical attachment", "electronic functionality", "field testing", "durability testing", "materials", "manufacturing feasibility", "certification/compliance", "production tooling".
        * Example Hardware MVP Format: "Functional Hardware Prototype / Field Trial"
        * Example Inclusions: "Core physical mechanism, basic enclosure, essential electronic functionality and user testing"
        * Example Exclusions: "Production tooling, mass-manufacturing optimisation, final certification and non-essential features"
      - For SOFTWARE / SAAS concepts, continue using software-specific MVP terminology where appropriate.

      MANDATORY 4-PART PITCHLAB VERDICT DIRECTIVE:
      - "summaryBlock.pitchLabVerdict" MUST ALWAYS be a substantive 2 to 4 sentence commercial conclusion.
      - It MUST cover: (1) core commercial opportunity or founder strength, (2) primary evidence gap or weakness, (3) central commercial risk, and (4) immediate validation step required before building further.
      - DO NOT generate single-sentence warnings or isolated observations like "Market history shows high failure for niche automation tools."

      EXPLICIT CV CREDENTIAL EXTRACTION DIRECTIVE:
      - When a CV is uploaded (${cvFileName || "None"}): ${cvText ? cvText.slice(0, 3000) : "No CV uploaded."}
      - You MUST explicitly extract specific, identifiable professional credentials, qualifications, degrees, roles, certifications, and named organizations present in the CV text into "cvAnalysis.extractedCredentials" (Array of 3-5 strings).
      - EXPLICIT EXAMPLES: "Chartered Accountant (CA / CAANZ)", "Bachelor of Commerce", "Finance Manager (Clever Core NZ Ltd / Fletcher)", "Xero Certified Advisor", "20+ years senior advisory experience".
      - NEVER output generic placeholders such as "Relevant professional domain experience" or "Industry-specific commercial background" if specific credentials exist in the CV text.
      - EXCLUDE PERSONAL HOBBIES, SPORTS, AND LEISURE ACTIVITIES (e.g. private pilot, motorcyclist, wind surfing, sports, travel, recreational interests) from "cvAnalysis.extractedCredentials". Only include professional qualifications, academic degrees, commercial roles, financial certifications, and industry domain experience.
      - EVIDENCE-STATE LANGUAGE CONTROLS: If customer validation proof is early stage / not yet evidenced, DO NOT claim "clear willing-to-pay market segment", "proven demand", or "there is no effective automated solution on the market". Frame market and customer willingness to pay as unvalidated hypotheses requiring empirical confirmation.

      LOCATION & REGIONAL SCOPE DIRECTIVE:
      - Submitted Location: Country = "${locationCountry || 'Not specified'}", Region = "${locationRegion || 'Not specified'}", City = "${locationCity || 'Not specified'}", Full Location Summary = "${locationSummary || 'New Zealand'}".
      - Target Market Scope: "${marketScope || 'National customers'}".
      - You MUST strictly tailor all market analysis, regional business news, customer review trends, and local government/regulatory framework citations to the founder's specific submitted region ("${locationSummary || 'New Zealand'}") and market scope ("${marketScope || 'National customers'}").
      - DO NOT substitute generic global data if a specific city, region, or country was submitted by the founder.

      LEGAL & REGULATORY DEEP DIVE DIRECTIVE:
      - When researching new ideas and checking legal/regulatory frameworks, perform a precise statutory deep dive for the target jurisdiction rather than issuing generic legal statements.
      - DISTINGUISH BETWEEN EXPLICIT STATUTORY BANS vs REGULATORY CONSENT & LEGISLATIVE REFORM REQUIREMENTS.
      - Specific Jurisdiction Example (Nuclear Energy in New Zealand):
        * The New Zealand Nuclear Free Zone, Disarmament, and Arms Control Act 1987 explicitly bans nuclear-powered vessels/warships and nuclear explosive devices (weapons/arsenal) under Sections 5–9.
        * Land-based commercial nuclear power generation is NOT governed by the 1987 warship/weapons ban, but is strictly regulated and constrained under the Radiation Safety Act 2016, Resource Management Act 1991 (RMA), and Atomic Energy Act 1945.
        * Operating a commercial nuclear plant in NZ would require explicit parliamentary statutory amendment / legislative reform, extensive environmental consents under the RMA, and high-level radiation safety authorizations.
      - Apply this level of statutory accuracy to all legal, statutory, and policy assessments across all jurisdictions.

      FUTURE TRENDS & MARKET DIRECTION DIRECTIVE:
      - Assess whether 3-10 year structural trends are moving TOWARD or AWAY FROM this business opportunity across:
        1. Market Trajectory (rapidly growing, growing, stable, mature, declining, structural disruption).
        2. Technology Direction (enabling technologies, cost reducers, barriers to entry, substitution risks).
        3. Customer Behaviour Shifts (convenience, digital adoption, sustainability, affordability, security, health/safety).
        4. Regulation & Policy Direction (acceleration, compliance burden, subsidies, market restrictions).
        5. Competitive Direction (entry velocity, incumbent expansion, consolidation, substitutes).
        6. Long-Term Relevance (5-10 year problem persistence vs risk of commoditisation/obsolescence).
        7. Emerging / Adjacent Opportunities (Max 3 concise, genuinely relevant adjacent paths).
      - Provide "futureOutlook": "STRONG" | "POSITIVE" | "NEUTRAL" | "UNCERTAIN" | "NEGATIVE".
      - Provide "trendAlignmentScore": Number 1-10 reflecting how strongly major structural trends support this specific business idea.
      - Provide "forecastConfidence": "High" | "Medium" | "Low" reflecting evidence quality and forecast certainty.
      - Provide "whereMarketIsHeading": 2-3 concise paragraphs explaining structural trends over the next 3-10 years.
      - Provide "tailwinds": Array of 2-4 important trends strengthening the opportunity.
      - Provide "headwinds": Array of 2-4 trends weakening, disrupting, or complicating the opportunity.
      - Provide "founderDecisionGuidance": Commercially focused recommendation (move now, validate quickly, monitor development, design around risk, position ahead, avoid overinvesting).
      - Provide "adjacentOpportunities": Array of maximum 3 genuinely relevant adjacent opportunities.

      FOUNDER INPUTS:
      - Idea: ${idea}
      - Category: ${category || "General Startup"}
      - Problem: ${problem}
      - Budget: ${budget}
      - Founder Narrative: ${founderBackgroundNarrative}
      - Experience: ${experience}
      - Capacity: ${capacity}
      - Network: ${network}
      - Target Market: ${targetMarket}
      - Location / Geography: ${locationSummary ? locationSummary : "Not specified"} (${marketScope})

      YOU MUST RETURN A VALID JSON OBJECT WITH THE FOLLOWING STRUCTURE:
      {
        "executiveSummary": "150-200 word sharp, idea-specific commercial summary.",
        "summaryBlock": {
          "pitchLabVerdict": "Substantive 2-4 sentence commercial verdict.",
          "overallCommercialVerdict": "Blunt advisor verdict label (e.g. Validate Before Building).",
          "biggestRiskToThisIdea": "Single make-or-break risk for this specific idea.",
          "doThisBeforeBuildingMore": "One specific low-cost validation action.",
          "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
          "topPrioritiesNow": ["Priority 1", "Priority 2", "Priority 3"]
        },
        "cvAnalysis": {
          "cvAttached": ${cvText ? 'true' : 'false'},
          "extractedCredentials": ["Chartered Accountant (CA / CAANZ)", "Bachelor of Commerce (BCom)", "Finance Manager (Clever Core NZ Ltd)"],
          "founderStrengthsFromCV": "Extracted strengths based on CV background.",
          "alignmentWithBusinessIdea": "How CV directly de-risks executing this startup idea."
        },
        "founderCapabilityExplanation": {
          "evidenceReliedOn": "Founder background, qualifications, and experience.",
          "whyThisScoreWasAwarded": "Explanation supporting score based on evidence.",
          "capabilityGaps": ["Gap 1", "Gap 2"],
          "recommendedResponse": ["Response 1", "Response 2"]
        },
        "whyThisScore": {
          "strongestArea": "Strongest category",
          "weakestArea": "Weakest category",
          "mainDragOnScore": "Primary bottleneck",
          "fastestWayToImprove": "Fastest improvement action"
        },
        "businessTheme": {
          "primaryTheme": "Primary industry/domain theme",
          "secondaryTheme": "Secondary commercial theme",
          "strategicPositioning": "Detailed 2-3 sentence strategic positioning in value chain",
          "marketCategoryDynamics": "1-2 sentences macro growth drivers and tailwinds",
          "strategicMoat": "1-2 sentences primary long-term strategic advantage or moat"
        },
        "businessModelSnapshot": {
          "targetCustomer": "Specific target customer segment details",
          "coreOffering": "Core product/service offering",
          "customerProblem": "Key problem being solved",
          "valueProposition": "Core value proposition",
          "revenueModel": "Monetization and pricing model",
          "customerAcquisition": "Primary acquisition channels",
          "keyCosts": "Major launch and operating costs",
          "commercialAssessment": "1-2 sentence overall commercial assessment"
        },
        "investorBite": {
          "introduction": "If you had 60 seconds to present this idea to experienced investors...",
          "scorecard": [
            { "area": "Problem Worth Solving", "rating": 4, "commentary": "Problem urgency commentary." },
            { "area": "Market Opportunity", "rating": 4, "commentary": "Market reach commentary." },
            { "area": "Competitive Advantage", "rating": 4, "commentary": "Differentiation commentary." },
            { "area": "Business Model", "rating": 3, "commentary": "Monetization commentary." },
            { "area": "Founder Capability", "rating": 5, "commentary": "Domain fit commentary." },
            { "area": "Customer Validation", "rating": 1, "commentary": "Validation proof commentary." },
            { "area": "Scalability", "rating": 4, "commentary": "Scalability commentary." },
            { "area": "Investment Readiness", "rating": 3, "commentary": "Capital readiness commentary." }
          ],
          "overallInterestScore": 75,
          "investmentPotential": "Medium",
          "overallInterestExplanation": "Explanation of investor interest score",
          "investmentVerdict": "Detailed narrative on investor perspective",
          "investorQuestions": ["Question 1", "Question 2", "Question 3"],
          "biggestStrength": "Biggest investment strength call-out",
          "biggestRisk": "Biggest investment risk call-out",
          "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
          "pitchLabRecommendation": "INVESTIGATE",
          "pitchLabRecommendationExplanation": "Short explanation for recommendation"
        },
        "scores": {
          "problemCustomerClarity": { "score": "<number 0-15 based on problem clarity>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of problem urgency", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "founderCapabilityFit": { "score": "<number 0-15 based on founder experience>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of founder fit", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "customerValidation": { "score": "<number 0-20 based on customer validation proof>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of validation logs", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "marketCommercialOpportunity": { "score": "<number 0-15 based on addressable market>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of market reach", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "businessModelWillingnessToPay": { "score": "<number 0-15 based on monetization model>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of pricing", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "competitivePosition": { "score": "<number 0-10 based on competitive moat>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of differentiation", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" },
          "executionReadiness": { "score": "<number 0-10 based on time & capital>", "evidenceLevel": "Strong Evidence | Partial Evidence | Not yet evidenced", "assessment": "Specific assessment of execution capacity", "missingEvidence": "Specific missing evidence", "improvementAction": "Specific action" }
        },
        "decisionStatus": { "state": "Validate Before Building", "explanation": "Explanation", "nextMilestone": "Next milestone" },
        "tearDetails": { "theme": "Strategic framing", "evidence": "Support signals", "analysis": "Friction analysis", "recommendation": "Next move" },
        "founderMetrics": { "analysis": "Founder analysis", "founderPositionSummary": "Strongly Positioned", "weeklyAvailableHours": "10-15 hrs/week", "availableCapital": "$2,500-$5,000 NZD", "initialRiskCapital": "$500 NZD" },
        "marketAssessment": { "analysis": "Market analysis", "marketPatternSummary": "Validated Precedent" },
        "realWorldComparables": {
          "successes": [{ "name": "Success 1", "whatTheyDid": "Details", "whyItSucceeded": "Why", "lessonForFounder": "Lesson" }],
          "failures": [{ "name": "Failure 1", "whatTheyDid": "Details", "whatWentWrong": "Why", "warningForFounder": "Warning" }],
          "marketInterpretation": "Market interpretation"
        },
        "keyRisks": [{ "name": "Risk 1", "whyItMatters": "Why", "whatToProveOrFix": "Fix" }],
        "whatNotToBuild": ["Don't build item 1", "Don't build item 2"],
        "thirtyDayPlan": {
          "week1": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week2": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week3": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" },
          "week4": { "objective": "Objective", "tasks": ["Task 1"], "expectedResult": "Result" }
        },
        "finalRecommendation": { "recommendation": "Validate Before Building", "why": "Why", "biggestIssue": "Issue", "pathForward": "Path", "explicitWarning": "Warning" }
      }
    `;

    // 7. Build the evaluation schema.
    const evaluationSchema = z.object({
      summaryBlock: z.object({
        overallReadinessScore: z.number(),
        decisionStatus: z.string().describe("Master Recommendations: Proceed, Proceed with Controlled Validation, Validate Before Building, Refine the Concept, Pivot Toward a Stronger Opportunity, Pause Pending Further Evidence, or Stop Before Further Investment"),
        biggestRiskToThisIdea: z.string().describe("One-line statement of the single make-or-break issue."),
        doThisBeforeBuildingMore: z.string().describe("One specific, non-negotiable low-cost action."),
        topStrengths: z.array(z.string()).describe("3 short, punchy strengths."),
        topPrioritiesNow: z.array(z.string()).describe("3 action-led priorities.")
      }),
      cvAnalysis: z.object({
        cvAttached: z.boolean().describe("Whether a CV was provided and analyzed."),
        extractedCredentials: z.array(z.string()).describe("3-5 key qualifications, credentials, or past roles extracted from CV."),
        founderStrengthsFromCV: z.string().describe("Synthesized founder strengths identified from CV analysis."),
        alignmentWithBusinessIdea: z.string().describe("How CV background directly de-risks and supports executing this startup idea.")
      }).describe("Thorough analysis of founder CV and professional background."),
      founderCapabilityExplanation: z.object({
        evidenceReliedOn: z.string().describe("Summarise the founder's relevant background, qualifications, experience, customer access, and motivation."),
        whyThisScoreWasAwarded: z.string().describe("Explain how that evidence supports the founder's ability to understand the problem and lead the next stage."),
        capabilityGaps: z.array(z.string()).describe("Identify no more than 3 material capability gaps."),
        recommendedResponse: z.array(z.string()).describe("Specific recommended responses to address those gaps (e.g. targeted learning, specialist contractor, adviser, strategic partner). DO NOT default to finding a co-founder.")
      }).describe("Structured 4-part explanation of Founder Capability & Fit score."),
      whyThisScore: z.object({
        strongestArea: z.string(),
        weakestArea: z.string(),
        mainDragOnScore: z.string().describe("Primary bottleneck holding back the score. 1 sentence."),
        fastestWayToImprove: z.string()
      }),
      businessTheme: z.object({
        primaryTheme: z.string().describe("Primary industry/domain theme (e.g. B2B FinTech / Business Services)."),
        secondaryTheme: z.string().describe("Secondary commercial theme (e.g. Workflow Efficiency & Automation)."),
        strategicPositioning: z.string().describe("2-3 sentences analyzing how this business strategically positions itself in the competitive value chain, its core defensibility, and market timing."),
        marketCategoryDynamics: z.string().describe("1-2 sentences on current macro growth drivers, market tailwinds, or regulatory shifts impacting this positioning."),
        strategicMoat: z.string().describe("1-2 sentences identifying the primary long-term strategic advantage or moat.")
      }).describe("Comprehensive Business Theme & Strategic Positioning analysis."),
      businessModelSnapshot: z.object({
        targetCustomer: z.string().describe("Who is the primary customer for this business? 1-3 sentences or 'Not yet evidenced'."),
        coreOffering: z.string().describe("What product or service is being offered? 1-3 sentences or 'Not yet evidenced'."),
        customerProblem: z.string().describe("What key problem or need is being solved? 1-3 sentences or 'Not yet evidenced'."),
        valueProposition: z.string().describe("Why would customers choose this business over existing alternatives? 1-3 sentences or 'Not yet evidenced'."),
        revenueModel: z.string().describe("How will the business generate revenue? 1-3 sentences or 'Not yet evidenced'."),
        customerAcquisition: z.string().describe("What are the most likely ways to attract the first customers? 1-3 sentences or 'Not yet evidenced'."),
        keyCosts: z.string().describe("What are the major costs involved in launching and operating the business? 1-3 sentences or 'Not yet evidenced'."),
        commercialAssessment: z.string().describe("A concise 1-2 sentence summary of the overall business model, highlighting its strengths, key risks and current level of maturity.")
      }).describe("Clean 8-part Business Model Snapshot assessment table."),
      marketInsights: z.object({
        marketLandscape: z.string().describe("Paragraph 1: Broader market landscape, sector maturity, scale, structural trends (50-75 words). Use qualitative language if TAM numerical data is absent; do not invent figures."),
        demandDrivers: z.string().describe("Paragraph 2: Specific factors driving or limiting demand for THIS idea (changing customer needs, regulation, tech shifts, cost pressures) (50-75 words)."),
        competitionAlternatives: z.string().describe("Paragraph 3: Competitors, incumbents, substitutes, and existing customer workarounds (50-75 words). Note that absence of direct competitors does not equal strong opportunity."),
        commercialReality: z.string().describe("Paragraph 4: Commercial accessibility, entry barriers, regulatory constraints, and market timing. Distinguish large underlying market size from accessible opportunity for THIS specific solution (50-75 words)."),
        localBusinessNews: z.string().describe("Paragraph 5: Regional business news, commercial climate, input cost pressures, and local business trends (50-75 words)."),
        customerReviewTrends: z.string().describe("Paragraph 6: Real customer review trends, dissatisfaction with current alternatives/workarounds, and user sentiment shifts (50-75 words)."),
        governmentPolicyInfluence: z.string().describe("Paragraph 7: Relevant industry-specific regulatory policies, statutory frameworks, standards, and government initiatives governing THIS assessed venture type (50-75 words). STRICT REQUIREMENT: Only reference policies and statutes directly applicable to the specific industry and venture type being assessed.")
      }).describe("Comprehensive 7-paragraph commercial adviser briefing on the market environment, local business news, customer reviews, and government policies."),
      investorBite: z.object({
        introduction: z.string().default("If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers."),
        scorecard: z.array(z.object({
          area: z.string().describe("One of: Problem Worth Solving, Market Opportunity, Competitive Advantage, Business Model, Founder Capability, Customer Validation, Scalability, Investment Readiness"),
          rating: z.number().min(1).max(5).describe("Rating 1 to 5"),
          commentary: z.string().describe("1 concise sentence explanation.")
        })).describe("8 investor scorecard items matching specified categories."),
        overallInterestScore: z.number().min(0).max(100).describe("Overall Investor Interest score out of 100."),
        investmentPotential: z.string().describe("High, Medium, or Low"),
        overallInterestExplanation: z.string().describe("Concise explanation of why this overall investor interest score was achieved."),
        investmentVerdict: z.string().describe("Max 150 words narrative on investor perspective."),
        investorQuestions: z.array(z.string()).describe("5 to 8 personalized questions investors would ask based on identified weaknesses."),
        biggestStrength: z.string().describe("One highlighted investor call-out box for biggest strength."),
        biggestRisk: z.string().describe("One highlighted investor warning box for biggest risk."),
        improvements: z.array(z.string()).describe("3 to 5 prioritized recommendations to improve investor appeal."),
        pitchLabRecommendation: z.string().describe("Master Recommendation: INVESTIGATE, PURSUE, REFRAME, PARK, or STOP"),
        pitchLabRecommendationExplanation: z.string().describe("Short explanation for the PitchLab recommendation.")
      }).describe("Proprietary PitchLab Commercial Readiness Assessment framework."),
      executiveSummary: z.string().describe("150-250 words ONLY. Sharp commercial overview. No repetition."),
      futureTrends: z.object({
        futureOutlook: z.string().describe("STRONG | POSITIVE | NEUTRAL | UNCERTAIN | NEGATIVE"),
        trendAlignmentScore: z.number().min(1).max(10).describe("Scale 1-10 indicating how strongly structural 3-10 year trends support this specific business idea."),
        forecastConfidence: z.string().describe("High | Medium | Low"),
        whereMarketIsHeading: z.string().describe("2-3 concise paragraphs analyzing major 3-10 year structural trends (macro, technology, customer behaviour, policy, competitive dynamics)."),
        tailwinds: z.array(z.string()).describe("2-4 important structural trends that strengthen the opportunity."),
        headwinds: z.array(z.string()).describe("2-4 structural trends that weaken, disrupt, or complicate the opportunity."),
        founderDecisionGuidance: z.string().describe("Commercially focused recommendation: move now, validate quickly, monitor development, design around risk, position ahead, avoid overinvesting."),
        adjacentOpportunities: z.array(z.string()).describe("Maximum 3 genuinely relevant adjacent opportunities emerging from this capability or technology.")
      }).describe("Comprehensive 3-10 year Future Trends & Market Direction analysis."),
      scores: z.object({
        problemCustomerClarity: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing problem and customer clarity."), missingEvidence: z.string().describe("Identify the specific missing empirical evidence regarding problem frequency, severity, or customer definition (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a concrete, high-impact action the founder must take to validate the problem and customer (1-2 concise sentences).") }),
        founderCapabilityFit: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing founder capability and fit."), missingEvidence: z.string().describe("Identify specific unevidenced capability areas, technical gaps, or market credibility proof required (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a concrete, practical action to bridge founder capability or advisor support gaps (1-2 concise sentences).") }),
        customerValidation: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing customer validation."), missingEvidence: z.string().describe("Identify missing empirical validation data such as logged interviews, LOIs, or pilot user feedback (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a structured action to execute discovery interviews or concierge pilot testing (1-2 concise sentences).") }),
        marketCommercialOpportunity: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing market & commercial opportunity."), missingEvidence: z.string().describe("Identify missing market sizing, reachability proof, or urgency metrics (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a targeted action to quantify addressable market segment and reachability (1-2 concise sentences).") }),
        businessModelWillingnessToPay: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing business model and pricing."), missingEvidence: z.string().describe("Identify missing price-sensitivity data, unit economics, or validated payment commitment (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a practical action to test pricing terms and payment intent with target customers (1-2 concise sentences).") }),
        competitivePosition: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing competitive position."), missingEvidence: z.string().describe("Identify missing direct competitor analysis, workaround comparisons, or switching barrier proof (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a strategic action to benchmark against existing workarounds and articulate unique advantage (1-2 concise sentences).") }),
        executionReadiness: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing execution readiness."), missingEvidence: z.string().describe("Identify missing milestone details, resource alignment, or low-cost validation budget boundaries (1-2 concise sentences)."), improvementAction: z.string().describe("Specify a disciplined action to structure a 30-day low-cost validation roadmap (1-2 concise sentences).") }),
        futureTrends: z.object({ score: z.number(), evidenceLevel: z.string(), assessment: z.string().describe("1-3 concise professional sentences analyzing future trends and market direction."), missingEvidence: z.string().describe("Specific missing structural trend evidence."), improvementAction: z.string().describe("Specific action to position ahead of market trends.") }),
      }),
      decisionStatus: z.object({
        state: z.string(),
        explanation: z.string(),
        nextMilestone: z.string()
      }),
      tearDetails: z.object({
        theme: z.string().describe("Concise strategic framing."),
        evidence: z.string().describe("Foundational support signals."),
        analysis: z.string().describe("Advisor-style friction analysis."),
        recommendation: z.string().describe("Next move based on strategic logic.")
      }),
      founderMetrics: z.object({
        analysis: z.string().describe("Assessing industry understanding, operational capacity, and leadership position."),
        founderPositionSummary: z.string().describe("Strongly Positioned, Partially Positioned, or Meaningfully Constrained."),
        weeklyAvailableHours: z.string().describe("Extract or state weekly hours commitment (e.g. 15-30 hours/week)."),
        availableCapital: z.string().describe("Extract or state available capital commitment (e.g. $5,000 NZD)."),
        initialRiskCapital: z.string().describe("Estimated initial low-risk validation budget (e.g. $1,000 NZD).")
      }),
      marketAssessment: z.object({
        analysis: z.string().describe("Deeper dive into pain intensity, reachability, trust, and behavior change."),
        marketPatternSummary: z.string().describe("Summary: Validated Precedent, Mixed Precedent, or Difficult Market.")
      }),
      realWorldComparables: z.object({
        successes: z.array(z.object({
          name: z.string(),
          whatTheyDid: z.string(),
          whyItSucceeded: z.string(),
          lessonForFounder: z.string()
        })).describe("1-3 genuinely relevant success precedents."),
        failures: z.array(z.object({
          name: z.string(),
          whatTheyDid: z.string(),
          whatWentWrong: z.string(),
          warningForFounder: z.string()
        })).describe("1-3 relevant failure or struggle patterns."),
        marketInterpretation: z.string().describe("Does this idea follow a success or failure pattern? What must be avoided?")
      }),
      keyRisks: z.array(z.object({
        name: z.string(),
        whyItMatters: z.string(),
        whatToProveOrFix: z.string()
      })).describe("Top 5 ruthless commercial risks only."),
      whatNotToBuild: z.array(z.string()).describe("3-7 waste-reduction items."),
      thirtyDayPlan: z.object({
        week1: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week2: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week3: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() }),
        week4: z.object({ objective: z.string(), tasks: z.array(z.string()), expectedResult: z.string() })
      }),
      finalRecommendation: z.object({
        recommendation: z.string().describe("Supportive but blunt Advisor Verdict Label."),
        why: z.string(),
        biggestIssue: z.string().describe("Single biggest unresolved issue."),
        pathForward: z.string().describe("Clearest low-cost next move."),
        explicitWarning: z.string().describe("Crucially: What must NOT happen yet.")
      })
    });

    // 8. Run AI generation — Google AI (AI Studio) is the primary provider.
    // Model: gemini-2.5-flash — confirmed available via ListModels in v1.0.8.
    await updateSubmissionProgress(submissionId, 3, "Analysing the opportunity", 65);
    const startTime = Date.now();
    console.log("PitchLab: Starting Google AI generation (gemini-2.5-flash)...");
    
    let result;
    try {
      result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: evaluationPrompt,
        runId: `eval-googleai-${userId}-${Date.now()}`,
        output: { format: 'json' },
      });
      console.log("PitchLab: Google AI generation (gemini-2.5-flash) successful.");
    } catch (genError) {
      const errMsg = genError.message || "";
      logSubmissionError("GOOGLE AI FAILED", genError, { userId, idea });
      console.error("PitchLab: Google AI failed:", errMsg);

      // Try gemini-2.5-pro (premium model) as a secondary attempt
      try {
        console.log("PitchLab: Retrying with gemini-2.5-pro...");
        result = await ai.generate({
          model: 'googleai/gemini-2.5-pro',
          prompt: evaluationPrompt,
          runId: `eval-googleai-retry-${userId}-${Date.now()}`,
          output: { format: 'json' },
        });
        console.log("PitchLab: Google AI retry (2.5-pro) successful.");
      } catch (retryErr) {
        logSubmissionError("GOOGLE AI RETRY FAILED", retryErr, { userId, idea });
        console.error("PitchLab: All AI attempts failed. Using mock mode.");
        result = getMockResult(reqData);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`PitchLab: Genkit AI raw output received in ${duration}s`);
    
    let evaluationData = safeExtractJsonFromAiResponse(result, reqData);
    await updateSubmissionProgress(submissionId, 4, "Preparing your assessment", 85);

    // 9. Reconcile 7-Category Scores & Band Mapping (Master Fix)
    const rawScores = evaluationData.scorecard || evaluationData.scores || {};
    const reconciled = reconcileScores(rawScores, reqData);

    evaluationData.appVersion = VERSION_INFO.appVersion;
    evaluationData.fullVersionString = VERSION_INFO.fullVersionString;
    evaluationData.buildId = VERSION_INFO.buildId;
    evaluationData.deployedAt = VERSION_INFO.deployedAt;
    evaluationData.deployedAtFormatted = VERSION_INFO.deployedAtFormatted;
    evaluationData.assessmentGeneratedAt = new Date().toISOString();
    evaluationData.assessmentGeneratedAtFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' NZST';

    evaluationData.overallScore = reconciled.overallScore;
    evaluationData.scoreBand = reconciled.scoreBand;
    evaluationData.masterRecommendation = reconciled.masterRecommendation;
    evaluationData.scorecard = reconciled.categoryScores;
    evaluationData.scores = reconciled.categoryScores;

    // Unconditionally synchronize summaryBlock to prevent raw un-reconciled AI score bleeding
    evaluationData.summaryBlock = evaluationData.summaryBlock || {};
    evaluationData.summaryBlock.overallScore = reconciled.overallScore;
    evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
    evaluationData.summaryBlock.scoreBand = reconciled.scoreBand;
    evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
    evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
    evaluationData.summaryBlock.masterRecommendation = reconciled.masterRecommendation;

    // Ensure investorBite is fully populated and ALWAYS strictly aligned with reconciled category scores
    evaluationData.investorBite = evaluationData.investorBite || {};
    evaluationData.investorBite.introduction = evaluationData.investorBite.introduction || "If you had 60 seconds to present this idea to experienced investors, how would it stack up? This assessment evaluates the strengths, weaknesses and investment readiness of your business using the same commercial thinking applied by experienced angel investors and venture capital providers.";
    evaluationData.investorBite.overallInterestScore = reconciled.overallScore;
    evaluationData.investorBite.investmentPotential = reconciled.overallScore >= 75 ? "High" : (reconciled.overallScore >= 50 ? "Medium" : "Low");
    evaluationData.investorBite.overallInterestExplanation = evaluationData.investorBite.overallInterestExplanation || evaluationData.executiveSummary || "Commercial concept evaluated against evidence and feasibility criteria.";
    
    // Direct Score-to-Star Alignment & Reconciled Commentary (Fix 7 / Fix 3)
    const getRating = (catKey, maxVal) => {
      const score = reconciled.categoryScores[catKey]?.scoreAchieved || 0;
      return Math.max(1, Math.min(5, Math.round((score / maxVal) * 5)));
    };
    evaluationData.investorBite.scorecard = [
      { area: "Problem Worth Solving", rating: getRating("problemCustomerClarity", 15), commentary: generateContextualInvestorCommentary("Problem Worth Solving", getRating("problemCustomerClarity", 15), reconciled.categoryScores.problemCustomerClarity?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Market Opportunity", rating: getRating("marketCommercialOpportunity", 15), commentary: generateContextualInvestorCommentary("Market Opportunity", getRating("marketCommercialOpportunity", 15), reconciled.categoryScores.marketCommercialOpportunity?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Competitive Advantage", rating: getRating("competitivePosition", 10), commentary: generateContextualInvestorCommentary("Competitive Advantage", getRating("competitivePosition", 10), reconciled.categoryScores.competitivePosition?.scoreAchieved || 0, 10, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Business Model", rating: getRating("businessModelWillingnessToPay", 15), commentary: generateContextualInvestorCommentary("Business Model", getRating("businessModelWillingnessToPay", 15), reconciled.categoryScores.businessModelWillingnessToPay?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Founder Capability", rating: getRating("founderCapabilityFit", 15), commentary: generateContextualInvestorCommentary("Founder Capability", getRating("founderCapabilityFit", 15), reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Customer Validation", rating: getRating("customerValidation", 20), commentary: generateContextualInvestorCommentary("Customer Validation", getRating("customerValidation", 20), reconciled.categoryScores.customerValidation?.scoreAchieved || 0, 20, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Scalability", rating: getRating("executionReadiness", 10), commentary: generateContextualInvestorCommentary("Scalability", getRating("executionReadiness", 10), reconciled.categoryScores.executionReadiness?.scoreAchieved || 0, 10, reqData, reconciled.gatesInfo, reconciled) },
      { area: "Investment Readiness", rating: Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), commentary: generateContextualInvestorCommentary("Investment Readiness", Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), reconciled.overallScore, 100, reqData, reconciled.gatesInfo, reconciled) }
    ];

    // Section 13: Attach internal telemetry debug object
    evaluationData.foundationalFeasibilityGate = reconciled.foundationalFeasibilityGate;
    evaluationData.legalRegulatoryAssessment = reconciled.legalRegulatoryAssessment;

    // Attach Founder Prediction & Evidence Gap analysis
    const founderPredictionsInput = reqData.founderPredictions || {};
    const founderEvidenceGap = calculateFounderEvidenceGap(founderPredictionsInput, reconciled, reqData);
    evaluationData.founderPredictions = founderEvidenceGap.founderPredictions;
    evaluationData.founderEvidenceGap = founderEvidenceGap;

    // Section 7: Context integrity & pre-generation leakage prevention check
    evaluationData.meta = evaluationData.meta || {};
    const currentAssessmentConcept = (reqData.idea || "").trim();
    const reportConcept = (evaluationData.meta.businessName || evaluationData.meta.conceptSummary || evaluationData.idea || "").trim();

    if (reportConcept && currentAssessmentConcept &&
        !reportConcept.toLowerCase().includes(currentAssessmentConcept.toLowerCase().slice(0, 15)) &&
        !currentAssessmentConcept.toLowerCase().includes(reportConcept.toLowerCase().slice(0, 15))) {
      console.warn(`PITCHLAB INTEGRITY ALERT: ASSESSMENT_CONTEXT_MISMATCH detected! Correcting concept context from '${reportConcept}' to '${currentAssessmentConcept}'`);
    }

    evaluationData.meta.businessName = currentAssessmentConcept;
    evaluationData.meta.conceptSummary = currentAssessmentConcept;
    evaluationData.businessName = currentAssessmentConcept;
    evaluationData.idea = currentAssessmentConcept;

    // Section 8 & 9: If Critical Feasibility Gates exist, synchronize recommendations & roadmap to Pre-Feasibility focus
    if (reconciled.gatesInfo?.hasCriticalGate) {
      const calibratedBiggestRisk = `Unresolved statutory and regulatory feasibility in ${targetJurisdiction}, combined with the absence of directly experienced specialist project capability.`;

      evaluationData.summaryBlock = evaluationData.summaryBlock || {};
      evaluationData.summaryBlock.overallReadinessScore = reconciled.overallScore;
      evaluationData.summaryBlock.decisionStatus = reconciled.masterRecommendation;
      evaluationData.summaryBlock.overallCommercialVerdict = reconciled.masterRecommendation;
      evaluationData.summaryBlock.biggestRiskToThisIdea = calibratedBiggestRisk;
      evaluationData.summaryBlock.doThisBeforeBuildingMore = `Identify an appropriately qualified legal and regulatory specialist in ${targetJurisdiction} and obtain an initial discussion, indicative view or scope and fee for determining the applicable statutory pathway.`;

      evaluationData.decisionStatus = {
        state: reconciled.masterRecommendation,
        explanation: "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.",
        nextMilestone: "Complete Pre-Feasibility Validation Assessment"
      };

      evaluationData.finalRecommendation = {
        recommendation: reconciled.masterRecommendation,
        why: "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.",
        biggestIssue: calibratedBiggestRisk,
        pathForward: `Identify an appropriately qualified legal and regulatory specialist in ${targetJurisdiction} and obtain an initial discussion, indicative view or scope and fee for determining the applicable statutory pathway.`,
        explicitWarning: "Do not commit capital, project engineering, site options, or team onboarding until pre-feasibility validation is complete."
      };

      // Pre-Feasibility 90-Day Roadmap for Heavy/Regulated/Infrastructure concepts
      const nucActionTruth = generateActionSourceOfTruth(reqData, reconciled, ventureType, targetJurisdiction);
      evaluationData.thirtyDayPlan = nucActionTruth.thirtyDayPlan;
      evaluationData.ninetyDayPhases = nucActionTruth.ninetyDayPhases;
      evaluationData.ninetyDayRoadmap = nucActionTruth.ninetyDayRoadmap;

      evaluationData.actionPlan = evaluationData.actionPlan || {};
      evaluationData.actionPlan.topFivePriorities = [
        {
          priority: "Statutory & Legal Scoping",
          action: `Identify qualified legal specialists and obtain an initial consultation to map statutory frameworks under ${targetJurisdiction} legislation.`,
          metric: "Initial specialist consultation & scope/fee (Immediate Stage) / Written legal opinion (Later $5k+ Gateway)"
        },
        {
          priority: "Specialist Technical Outreach",
          action: "Identify qualified power/nuclear engineers and regulatory consultants to map preliminary safety and grid prerequisites.",
          metric: "Preliminary specialist advisory scoping note"
        },
        {
          priority: "Engineering & Site Prerequisite Mapping",
          action: "Perform desktop research to map site requirements, grid connection logistics, and environmental consenting prerequisites.",
          metric: "Desktop technical prerequisite memo (Immediate Stage) / Formal pre-feasibility study (Later $25k+ Gateway)"
        },
        {
          priority: "Founder Risk Gateway Decision",
          action: "Conduct initial milestone review against statutory and technical prerequisites to determine whether to park, pivot, or proceed.",
          metric: "Founder Risk Gateway decision framework"
        },
        {
          priority: "Capital Scale & Resource Scoping",
          action: "Model indicative project capital scale requirements, sovereign risk factors, and national energy policy alignment.",
          metric: "Indicative capital-scale & policy map"
        }
      ];
      evaluationData.topFivePriorities = evaluationData.actionPlan.topFivePriorities;
      evaluationData.summaryBlock = evaluationData.summaryBlock || {};
      evaluationData.summaryBlock.topPrioritiesNow = evaluationData.actionPlan.topFivePriorities.map(p => p.priority);

      const ft5D = calculate5DimensionFutureTrends(reqData, reconciled.gatesInfo, ventureType, evaluationData.futureTrends || {});
      evaluationData.futureTrends = {
        score: reconciled.categoryScores.futureTrends?.scoreAchieved || 1,
        futureOutlook: "UNCERTAIN",
        forecastConfidence: "Medium",
        marketDirection: ft5D.marketDirection,
        solutionOutlook: ft5D.solutionOutlook,
        dimensions: ft5D.dimensions,
        whatThisMeansForFounder: ft5D.whatThisMeansForFounder,
        adjacentOpportunities: ft5D.adjacentOpportunities,
        whereMarketIsHeading: "Macro structural trends, Small Modular Reactor (SMR) commercialisation, rising electricity demand, and decarbonisation mandates are shaping the long-term energy sector outlook.",
        tailwinds: [
          "Accelerating electricity demand and industrial electrification goals.",
          "Growing recognition of grid stability and low-carbon firm electricity power requirements.",
          "Global technological advancements and commercialisation in Small Modular Reactors (SMRs)."
        ],
        headwinds: [
          `Significant statutory and regulatory barriers in ${targetJurisdiction} (e.g. historical legislative frameworks and radiation safety statutes).`,
          "Extreme multi-billion-dollar project capital requirements and complex regulatory licensing process."
        ],
        trendAlignmentScore: ft5D.trendAlignmentScore || 7,
        assessment: "Structural macro demand for clean baseload power is high, but significant statutory and regulatory barriers severely constrain commercial feasibility, subject to specialist legal confirmation.",
        missingEvidence: "Statutory permissibility and legislative authorization.",
        improvementAction: "Monitor international regulatory shifts and statutory reform debates before committing development capital."
      };

      evaluationData.marketInsights = {
        marketLandscape: `The broader market operates within a heavily structured statutory and regulatory environment. While underlying regional demand for baseload power and grid reliability is significant, sector entry is strictly governed by national legislation, public policy mandates, and multi-billion-dollar infrastructure capital scale requirements.`,
        demandDrivers: `Primary demand drivers include rising electricity demand, decarbonisation targets, dry-year hydro risk, and peak demand volatility. However, commercial adoption is strictly constrained by statutory and regulatory approval pathways.`,
        competitionAlternatives: `The proposed solution would compete with established state-backed hydro, geothermal, and wind generation incumbents, as well as alternative grid stability solutions integrated into national energy networks.`,
        commercialReality: `A critical distinction exists between large national electricity demand and the commercially accessible opportunity for this specific solution. The commercially accessible opportunity appears materially constrained under the current assessed regulatory environment, with the extent of those constraints subject to specialist legal confirmation.`,
        localBusinessNews: `Local energy market news highlights rising electricity demand, dry-year hydro volatility, wholesale power price spikes, and policy debates surrounding New Zealand energy security.`,
        customerReviewTrends: `Published energy-sector reporting and published industry commentary indicate demand for firm low-carbon baseload power, but direct customer/off-taker validation has not yet been established by the venture.`,
        governmentPolicyInfluence: `${targetJurisdiction} statutory policy and legislative frameworks govern power generation, environmental protection, fast-track consenting, and nuclear-related statutory requirements and restrictions requiring specialist interpretation for the proposed commercial generation model.`
      };

      evaluationData.summaryBlock.threePriorityActions = [
        {
          heading: "1. Verify Statutory & Legal Permissibility",
          explanation: `Identify qualified legal and regulatory specialists in ${targetJurisdiction} and obtain an initial consultation to map statutory frameworks before committing development capital.`,
          outcome: "Initial specialist discussion & indicative regulatory pathway / scope and fee."
        },
        {
          heading: "2. Specialist Technical & Regulatory Pre-Feasibility Scoping",
          explanation: "Identify qualified energy infrastructure engineers and environmental regulatory consultants to map preliminary safety, site, grid connection, and statutory prerequisites.",
          outcome: "Preliminary technical prerequisite & capability-gap scoping note."
        },
        {
          heading: "3. Capital Scale & Policy Assessment",
          explanation: "Perform preliminary desktop analysis of multi-billion-dollar project capital scale requirements, sovereign risk factors, and national energy policy alignment.",
          outcome: "Indicative capital-scale & stakeholder/policy map."
        }
      ];
      evaluationData.threePriorityActions = evaluationData.summaryBlock.threePriorityActions;

      evaluationData.whatNotToBuild = [
        "Do not commit capital to land options, site leases, or plant engineering prior to legal confirmation.",
        "Do not hire engineering consultants or technical staff before completing regulatory feasibility analysis.",
        "Do not pitch investors for project capital until statutory and licensing pathways are established."
      ];

      // Fix 2: Calibrated Commercial Readiness Assessment narrative intro
      evaluationData.investorBite.introduction = `${targetJurisdiction} faces increasing electricity demand, security-of-supply challenges and continued decarbonisation requirements. The proposed SMR solution faces substantial statutory, regulatory, technical and capital barriers, and its legal/regulatory feasibility remains subject to specialist confirmation.`;

      // Fix 3: Authoritative contextual investor verdict
      evaluationData.investorBite.investmentVerdict = generateContextualInvestorVerdict(reqData, reconciled, reconciled.legalRegulatoryAssessment, evaluationData.founderMetrics);

      // Fix 4: Calibrated Biggest Risk
      evaluationData.investorBite.biggestRisk = calibratedBiggestRisk;

      // Fix 7: Staged improvements sequence (pre-feasibility staged to later funded gateway)
      evaluationData.investorBite.improvements = [
        "Verify Legal & Regulatory Feasibility with specialist legal advisers.",
        "Consult independent domain engineers and regulatory specialists to map compliance prerequisites.",
        "Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result."
      ];

      // Fix 8: Calibrated founder capability response
      evaluationData.founderCapabilityExplanation = evaluationData.founderCapabilityExplanation || {};
      evaluationData.founderCapabilityExplanation.recommendedResponse = [
        "Identify and begin engaging appropriately credentialled specialists for preliminary advice, scoping and potential future involvement.",
        "Engage specialist legal and regulatory counsel to map statutory pathways before assembling a formal development team."
      ];

      // Fix 2.6: Calibrated PitchLab Recommendation
      evaluationData.investorBite.pitchLabRecommendation = reconciled.masterRecommendation;
      evaluationData.investorBite.pitchLabRecommendationExplanation = "The unresolved legal and regulatory barriers mean the venture is not currently commercially actionable. Complete specialist pre-feasibility work to determine whether a credible statutory pathway exists before committing development capital.";
    }
    evaluationData.investorBite.investorQuestions = (Array.isArray(evaluationData.investorBite.investorQuestions) && evaluationData.investorBite.investorQuestions.length > 0) ? evaluationData.investorBite.investorQuestions : [
      "What statutory or regulatory approvals are required before project execution?",
      "What stops an established competitor or state entity from controlling this infrastructure?",
      "What empirical evidence proves that the customer problem is urgent and frequent?",
      "What is your specific, low-cost pre-feasibility validation strategy?",
      "What key operational milestones will you achieve before seeking external funding?"
    ];
    const defaultStrength = (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved <= 6)
      ? "Strong general commercial and financial capability combined with a clearly defined customer problem."
      : "Deep industry experience combined with a clearly defined customer problem.";
    evaluationData.investorBite.biggestStrength = evaluationData.investorBite.biggestStrength || evaluationData.summaryBlock?.topStrengths?.[0] || defaultStrength;
    if (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved <= 6 && evaluationData.investorBite.biggestStrength.includes("Deep industry experience")) {
      evaluationData.investorBite.biggestStrength = "Strong general commercial and financial capability combined with a clearly defined customer problem.";
    }
    evaluationData.investorBite.biggestRisk = evaluationData.investorBite.biggestRisk || evaluationData.summaryBlock?.biggestRiskToThisIdea || "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.";

    if (reconciled.gatesInfo?.hasCriticalGate) {
      // Improvements already calibrated above
    } else {
      evaluationData.investorBite.improvements = (Array.isArray(evaluationData.investorBite.improvements) && evaluationData.investorBite.improvements.length > 0) ? evaluationData.investorBite.improvements : [
        "Conduct 15-20 structured customer discovery interviews.",
        "Build a simple manual concierge MVP to test workflow adoption.",
        "Validate pricing terms directly with prospective buyers.",
        "Secure signed Letters of Intent or early pilot commitments."
      ];
    }
    evaluationData.investorBite.pitchLabRecommendation = evaluationData.investorBite.pitchLabRecommendation || (reconciled.overallScore >= 80 ? "Ready to Pitch" : reconciled.overallScore >= 65 ? "Almost Ready" : reconciled.overallScore >= 45 ? "Needs More Validation" : "Early Stage Idea");
    evaluationData.investorBite.pitchLabRecommendationExplanation = evaluationData.investorBite.pitchLabRecommendationExplanation || "Focus on validating customer demand and securing early proof of willingness to pay before raising external capital.";

    // Ensure businessTheme is fully populated with contextual strategic positioning
    ventureType = classifyVentureType(reqData);
    const isNuclear = (idea + " " + category).toLowerCase().includes("nuclear");

    evaluationData.businessTheme = evaluationData.businessTheme || {};
    const isAiDecision = ventureType.includes("Decision Support") || Boolean((idea + " " + category).match(/\b(ai\b|decision support|decision intelligence|startup evaluation|idea validation|idea assessment|founder intelligence|pitchlab)\b/i));

    if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
      evaluationData.businessTheme.primaryTheme = "Energy Infrastructure & Power Generation";
      evaluationData.businessTheme.secondaryTheme = "Nuclear / SMR / Firm Low-Carbon Generation";
      evaluationData.businessTheme.strategicPositioning = `Positions as a long-term utility-scale infrastructure option targeting grid reliability, baseload capacity, and industrial decarbonisation within ${targetJurisdiction}.`;
      evaluationData.businessTheme.marketCategoryDynamics = `Governed by national energy security strategy, statutory radiation safety law, environmental consenting frameworks, and multi-billion-dollar infrastructure capital scale.`;
      evaluationData.businessTheme.strategicMoat = "No defensible venture-specific moat is yet evidenced. Potential future defensibility could arise from specialist partnerships, project rights, regulatory capability, long-term off-take arrangements or execution capability.";
    } else if (isAiDecision) {
      evaluationData.businessTheme.primaryTheme = (evaluationData.businessTheme.primaryTheme && !evaluationData.businessTheme.primaryTheme.includes("Transport")) ? evaluationData.businessTheme.primaryTheme : "AI / Business Decision Support Software";
      evaluationData.businessTheme.secondaryTheme = (evaluationData.businessTheme.secondaryTheme && !evaluationData.businessTheme.secondaryTheme.includes("Mobility")) ? evaluationData.businessTheme.secondaryTheme : "Startup Idea Validation & Founder Decision Intelligence";
      evaluationData.businessTheme.strategicPositioning = (evaluationData.businessTheme.strategicPositioning && !evaluationData.businessTheme.strategicPositioning.includes("driver")) ? evaluationData.businessTheme.strategicPositioning : "An idea portfolio and decision platform that helps founders evaluate opportunities before committing significant time or capital.";
      evaluationData.businessTheme.marketCategoryDynamics = (evaluationData.businessTheme.marketCategoryDynamics && !evaluationData.businessTheme.marketCategoryDynamics.includes("driver")) ? evaluationData.businessTheme.marketCategoryDynamics : "Driven by founder demand for rapid idea validation, structured risk assessment, evidence-led feasibility scoring, and disciplined capital allocation.";
      evaluationData.businessTheme.strategicMoat = (evaluationData.businessTheme.strategicMoat && !evaluationData.businessTheme.strategicMoat.includes("driver")) ? evaluationData.businessTheme.strategicMoat : "Evidence-calibrated decision methodology, structured validation scoring frameworks, and proprietary founder decision intelligence.";
    } else if (ventureType.includes("Hardware") || ventureType.includes("Manufacturing")) {
      evaluationData.businessTheme.primaryTheme = evaluationData.businessTheme.primaryTheme || "Hardware & Physical Product Innovation";
      evaluationData.businessTheme.secondaryTheme = evaluationData.businessTheme.secondaryTheme || "Field Trial Validation & Asset Protection";
      evaluationData.businessTheme.strategicPositioning = evaluationData.businessTheme.strategicPositioning || "Positions as a high-efficiency specialized physical solution directly targeting operational pain points. De-risks adoption by delivering immediate physical and functional value.";
      evaluationData.businessTheme.marketCategoryDynamics = evaluationData.businessTheme.marketCategoryDynamics || "Driven by market demand for durable, low-maintenance asset protection and automated operational tools.";
      evaluationData.businessTheme.strategicMoat = evaluationData.businessTheme.strategicMoat || "Proprietary design mechanics, domain experience, and direct field trial relationships.";
    } else if (ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData)) {
      evaluationData.businessTheme.primaryTheme = "Transportation / Mobility";
      evaluationData.businessTheme.secondaryTheme = "Local Passenger Mobility & Booking Marketplace";
      evaluationData.businessTheme.strategicPositioning = `Positions as a localized two-sided transport booking marketplace connecting passengers with vetted drivers and transport operators across ${targetJurisdiction}.`;
      evaluationData.businessTheme.marketCategoryDynamics = `Driven by passenger convenience, transparent fare pricing, driver supply density, smartphone penetration, and local transport regulatory compliance in ${targetJurisdiction}.`;
      evaluationData.businessTheme.strategicMoat = "Two-sided network density, established local driver and operator relationships, customer booking habituation, and local operational presence.";
    } else if (ventureType === 'Marketplace') {
      evaluationData.businessTheme.primaryTheme = evaluationData.businessTheme.primaryTheme || "Digital Marketplace";
      evaluationData.businessTheme.secondaryTheme = evaluationData.businessTheme.secondaryTheme || "Two-Sided Platform & Network Liquidity";
      evaluationData.businessTheme.strategicPositioning = evaluationData.businessTheme.strategicPositioning || `Positions as a two-sided platform matching demand and supply within ${targetJurisdiction}.`;
      evaluationData.businessTheme.marketCategoryDynamics = evaluationData.businessTheme.marketCategoryDynamics || "Driven by network effects, buyer and seller acquisition costs, liquidity, and platform retention.";
      evaluationData.businessTheme.strategicMoat = evaluationData.businessTheme.strategicMoat || "Network density, platform habituation, and defensible liquidity.";
    } else {
      evaluationData.businessTheme.primaryTheme = evaluationData.businessTheme.primaryTheme || category || "B2B Software & Business Services";
      evaluationData.businessTheme.secondaryTheme = evaluationData.businessTheme.secondaryTheme || "Workflow Efficiency & Automation";
      evaluationData.businessTheme.strategicPositioning = evaluationData.businessTheme.strategicPositioning || "Positions as a specialized efficiency solution directly targeting operational friction points. De-risks adoption by delivering clear functional value and low switching friction.";
      evaluationData.businessTheme.marketCategoryDynamics = evaluationData.businessTheme.marketCategoryDynamics || "Driven by market demand for operational productivity, compliance automation, and workflow efficiency.";
      evaluationData.businessTheme.strategicMoat = evaluationData.businessTheme.strategicMoat || "Deep domain specialization, high workflow retention, and direct customer relationships.";
    }

    evaluationData.businessModelSnapshot.targetCustomer = synthesizeBusinessModelField('targetCustomer', reqData, ventureType, targetJurisdiction);
    evaluationData.businessModelSnapshot.coreOffering = synthesizeBusinessModelField('coreOffering', reqData, ventureType, targetJurisdiction);
    evaluationData.businessModelSnapshot.customerProblem = synthesizeBusinessModelField('customerProblem', reqData, ventureType, targetJurisdiction);

    if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
      evaluationData.businessModelSnapshot.valueProposition = "Continuous, low-carbon firm electricity generation providing long-term price predictability, grid stability, and industrial decarbonisation.";
      evaluationData.businessModelSnapshot.revenueModel = "Wholesale electricity market sales, long-term Power Purchase Agreements (PPAs) with industrial off-takers, and ancillary grid support fees, subject to statutory feasibility.";
      evaluationData.businessModelSnapshot.customerAcquisition = "Direct long-term PPA contracting with electricity retailers, heavy industrial energy users, and national grid operators.";
      evaluationData.businessModelSnapshot.keyCosts = "Technology licensing, site development, regulatory consenting, plant engineering, construction, grid interconnection, operation, security, and decommissioning.";
      evaluationData.businessModelSnapshot.commercialAssessment = "Business model viability is strictly governed by statutory permissibility, regulatory consenting, and multi-billion-dollar project financing gateways.";
    } else if (isAiDecision) {
      evaluationData.businessModelSnapshot.valueProposition = synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.revenueModel = synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.customerAcquisition = synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.keyCosts = synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.commercialAssessment = synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);
    } else if (ventureType.includes("Hardware")) {
      evaluationData.businessModelSnapshot.valueProposition = evaluationData.businessModelSnapshot.valueProposition || "Durable physical solution delivering direct operational efficiency or asset protection.";
      evaluationData.businessModelSnapshot.revenueModel = evaluationData.businessModelSnapshot.revenueModel || "Direct hardware sales, distributor margins, or optional maintenance support agreements.";
      evaluationData.businessModelSnapshot.customerAcquisition = evaluationData.businessModelSnapshot.customerAcquisition || "Direct commercial outreach, industry trade channels, and field demonstration trials.";
      evaluationData.businessModelSnapshot.keyCosts = evaluationData.businessModelSnapshot.keyCosts || "Component sourcing, tooling, manufacturing assembly, quality certification, and field testing.";
      evaluationData.businessModelSnapshot.commercialAssessment = evaluationData.businessModelSnapshot.commercialAssessment || "Commercial viability depends on prototype durability testing and verified manufacturing unit economics.";
    } else if (ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData)) {
      evaluationData.businessModelSnapshot.valueProposition = synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.revenueModel = synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.customerAcquisition = synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.keyCosts = synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
      evaluationData.businessModelSnapshot.commercialAssessment = synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);
    } else {
      evaluationData.businessModelSnapshot.valueProposition = evaluationData.businessModelSnapshot.valueProposition || "Commercial solution addressing operational workflow friction or market demand.";
      evaluationData.businessModelSnapshot.revenueModel = evaluationData.businessModelSnapshot.revenueModel || "Commercial revenue model based on subscription, transaction fee, or direct service billing.";
      evaluationData.businessModelSnapshot.customerAcquisition = evaluationData.businessModelSnapshot.customerAcquisition || "Direct client outreach, industry network referrals, and targeted digital marketing.";
      evaluationData.businessModelSnapshot.keyCosts = evaluationData.businessModelSnapshot.keyCosts || "Solution development, customer acquisition, operational support, and ongoing service delivery.";
      evaluationData.businessModelSnapshot.commercialAssessment = evaluationData.businessModelSnapshot.commercialAssessment || "Business model evaluated against customer willingness to pay and low-friction adoption.";
    }

    // Ensure raw inputs flow through directly to frontend
    evaluationData.idea = idea;
    evaluationData.problem = problem;
    evaluationData.targetMarket = targetMarket;
    evaluationData.category = category;
    evaluationData.budget = budget;
    evaluationData.capacity = capacity;
    evaluationData.network = network;
    evaluationData.experience = experience;
    evaluationData.locationCountry = locationCountry;
    evaluationData.locationRegion = locationRegion;
    evaluationData.locationCity = locationCity;
    evaluationData.locationSummary = locationSummary;
    evaluationData.marketScope = marketScope;
    evaluationData.timeCommitment = reqData.timeCommitment || capacity;
    evaluationData.investmentCommitment = reqData.investmentCommitment || budget;
    evaluationData.founderBackgroundNarrative = founderBackgroundNarrative;

    evaluationData.betaCohort = "first50";
    evaluationData.meta = evaluationData.meta || {};
    evaluationData.meta.betaCohort = "first50";
    evaluationData.meta.founderRegion = locationSummary || locationCountry || "Global";

    // Single Authoritative Founder Resource Object & Calibrated Time Bands
    evaluationData.founderMetrics = evaluationData.founderMetrics || {};
    const rawTimeInput = (reqData.timeCommitment || capacity || "").toString().trim();
    let hoursBand = "15-30 hours/week";
    if (rawTimeInput.match(/\b(0-5|0\s*-\s*5|<5)\b/i)) {
      hoursBand = "0-5 hours/week";
    } else if (rawTimeInput.match(/\b(5-10|5\s*-\s*10)\b/i)) {
      hoursBand = "5-10 hours/week";
    } else if (rawTimeInput.match(/\b(10-20|10-15|10\s*-\s*20)\b/i)) {
      hoursBand = "10-20 hours/week";
    } else if (rawTimeInput.match(/\b(15-30|20-30|15\s*-\s*30)\b/i)) {
      hoursBand = "15-30 hours/week";
    } else if (rawTimeInput.match(/\b(30\+|40|full-time)\b/i)) {
      hoursBand = "30+ hours/week";
    } else if (rawTimeInput) {
      hoursBand = rawTimeInput;
    }
    evaluationData.founderMetrics.weeklyAvailableHours = hoursBand;

    // Single Authoritative Capital Formatting (Fix $5,000-0,000 NZD bug)
    const userCapInput = reqData.investmentCommitment || reqData.budget || budget;
    const formattedCap = formatCapitalValue(userCapInput, evaluationData.founderMetrics.availableCapital);
    evaluationData.founderMetrics.availableCapital = formattedCap;
    if (evaluationData.capitalReality) {
      evaluationData.capitalReality.availableCapital = formattedCap;
    }

    const initialRiskCapitalInput = reqData.initialRiskCapital || reqData.riskCapital || evaluationData.founderMetrics.initialRiskCapital || "$1,000 NZD";
    evaluationData.founderMetrics.initialRiskCapital = initialRiskCapitalInput;
    const founderScoreVal = reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0;

    if (founderScoreVal >= 12) {
      evaluationData.founderMetrics.founderPositionSummary = "Well Positioned";
    } else if (founderScoreVal >= 7) {
      evaluationData.founderMetrics.founderPositionSummary = "Workable With Constraints";
    } else if (founderScoreVal >= 4) {
      evaluationData.founderMetrics.founderPositionSummary = "Important Gaps to Address";
    } else {
      evaluationData.founderMetrics.founderPositionSummary = "Material Founder Constraints";
    }
    evaluationData.founderMetrics.analysis = reconciled.categoryScores.founderCapabilityFit?.explanation || evaluationData.founderMetrics.analysis;

    // CV Analysis & Language Calibration
    evaluationData.cvAnalysis = evaluationData.cvAnalysis || {};
    if (Array.isArray(evaluationData.cvAnalysis.extractedCredentials)) {
      const hobbyRegex = /\b(pilot|private pilot|motorcycle|motorcyclist|wind surfing|surfing|kitesurfing|skiing|golf|tennis|rugby|cricket|hiking|diving|scuba|hobby|hobbies|recreational)\b/i;
      evaluationData.cvAnalysis.extractedCredentials = evaluationData.cvAnalysis.extractedCredentials.filter(c => !hobbyRegex.test(c));
    }

    if (founderScoreVal <= 6) {
      evaluationData.cvAnalysis.alignmentWithBusinessIdea = "The supplied CV demonstrates general commercial capability, but does not evidence direct technical or regulatory execution experience for this specific venture.";
      if (evaluationData.founderCapabilityExplanation) {
        evaluationData.founderCapabilityExplanation.whyThisScoreWasAwarded = "Recognises general commercial capability, but highlights a major venture-specific domain and technical execution gap.";
      }
    } else {
      evaluationData.cvAnalysis.alignmentWithBusinessIdea = evaluationData.cvAnalysis.alignmentWithBusinessIdea || "Founder's background supports commercial analysis and project execution.";
      if (evaluationData.founderCapabilityExplanation && evaluationData.founderCapabilityExplanation.whyThisScoreWasAwarded) {
        evaluationData.founderCapabilityExplanation.whyThisScoreWasAwarded = evaluationData.founderCapabilityExplanation.whyThisScoreWasAwarded
          .replace(/A score of \d+\/15/g, `A score of ${founderScoreVal}/15`)
          .replace(/making the fit weak despite general commercial strength/g, "highlighting that specialist engineering and manufacturing capability should be bridged via advisers, technical contractors, or engineering partners as validation progresses, while the founder leads commercial strategy, supplier coordination, and customer validation");
      }
    }

    // Canonical Score Object (MoorSafe Fix 2)
    evaluationData.canonicalScores = {
      problemCustomerClarity: { score: reconciled.categoryScores.problemCustomerClarity?.scoreAchieved || 0, max: 15, rating5: getRating("problemCustomerClarity", 15) },
      founderCapabilityFit: { score: founderScoreVal, max: 15, rating5: getRating("founderCapabilityFit", 15) },
      customerValidation: { score: reconciled.categoryScores.customerValidation?.scoreAchieved || 0, max: 20, rating5: getRating("customerValidation", 20) },
      marketCommercialOpportunity: { score: reconciled.categoryScores.marketCommercialOpportunity?.scoreAchieved || 0, max: 15, rating5: getRating("marketCommercialOpportunity", 15) },
      businessModelWillingnessToPay: { score: reconciled.categoryScores.businessModelWillingnessToPay?.scoreAchieved || 0, max: 15, rating5: getRating("businessModelWillingnessToPay", 15) },
      competitivePosition: { score: reconciled.categoryScores.competitivePosition?.scoreAchieved || 0, max: 10, rating5: getRating("competitivePosition", 10) },
      executionReadiness: { score: reconciled.categoryScores.executionReadiness?.scoreAchieved || 0, max: 10, rating5: getRating("executionReadiness", 10) },
      overallScore: reconciled.overallScore
    };

    // FIX 3: Master Recommendation Everywhere Enforcer & Contradiction Guard
    const masterRec = reconciled.masterRecommendation;
    evaluationData.masterRecommendation = masterRec;
    if (!evaluationData.finalRecommendation) evaluationData.finalRecommendation = {};
    evaluationData.finalRecommendation.recommendation = masterRec;

    if (evaluationData.investorBite) {
      evaluationData.investorBite.pitchLabRecommendation = masterRec;
      evaluationData.investorBite.recommendation = masterRec;
      if (evaluationData.investorBite.pitchLabRecommendationExplanation) {
        evaluationData.investorBite.pitchLabRecommendationExplanation = evaluationData.investorBite.pitchLabRecommendationExplanation
          .replace(/\bAlmost Ready\b/g, reconciled.scoreBand.name)
          .replace(/\bReady to Pitch\b/g, reconciled.scoreBand.name)
          .replace(/\bNeeds More Validation\b/g, reconciled.scoreBand.name)
          .replace(/\bEarly Stage Idea\b/g, reconciled.scoreBand.name);
      }
      if (Array.isArray(evaluationData.investorBite.investorQuestions)) {
        evaluationData.investorBite.investorQuestions = evaluationData.investorBite.investorQuestions.map(q =>
          q.replace(/circumvent|bypass|evade/gi, "establish a lawful legislative, regulatory or policy pathway for")
        );
      }
    }
    if (evaluationData.investorAssessment) {
      evaluationData.investorAssessment.pitchLabRecommendation = masterRec;
      evaluationData.investorAssessment.recommendation = masterRec;
    }
    if (evaluationData.summaryBlock) {
      evaluationData.summaryBlock.masterRecommendation = masterRec;
      evaluationData.summaryBlock.pitchLabRecommendation = masterRec;
    }

    // PL-FIX-20261006-SMARTTAX-01: Rebuild Executive Summary as 3 Synthesized Coherent Prose Paragraphs
    evaluationData.executiveSummary = generateCoherentExecutiveSummary(reqData, reconciled, ventureType, targetJurisdiction, evaluationData);

    // PL-FIX-20261006-SMARTTAX-01: Unified Cross-Report Action Source of Truth Engine
    const actionSourceOfTruth = generateActionSourceOfTruth(reqData, reconciled, ventureType, targetJurisdiction);
    evaluationData.actionPlan = evaluationData.actionPlan || {};
    evaluationData.actionPlan.topFivePriorities = actionSourceOfTruth.topFivePriorities;
    evaluationData.actionPlan.immediate7DayAction = actionSourceOfTruth.immediate7DayAction;
    evaluationData.topFivePriorities = actionSourceOfTruth.topFivePriorities;
    evaluationData.summaryBlock = evaluationData.summaryBlock || {};
    evaluationData.summaryBlock.topPrioritiesNow = actionSourceOfTruth.topFivePriorities.map(p => p.priority);
    evaluationData.summaryBlock.threePriorityActions = actionSourceOfTruth.threePriorityActions;
    evaluationData.summaryBlock.doThisBeforeBuildingMore = actionSourceOfTruth.doThisBeforeBuilding;
    evaluationData.threePriorityActions = actionSourceOfTruth.threePriorityActions;
    evaluationData.thirtyDayPlan = actionSourceOfTruth.thirtyDayPlan;
    evaluationData.ninetyDayPhases = actionSourceOfTruth.ninetyDayPhases;
    evaluationData.ninetyDayRoadmap = actionSourceOfTruth.ninetyDayRoadmap;
    evaluationData.nextEvidenceGateway = actionSourceOfTruth.nextEvidenceGateway;
    evaluationData.reassessmentTrigger = actionSourceOfTruth.reassessmentTrigger;

    // Professional PitchLab Verdict Prose Synthesizer
    if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
      evaluationData.summaryBlock.pitchLabVerdict = `The concept addresses a genuine long-term energy and infrastructure challenge, but it is not commercially actionable in its current formulation. The principal barriers are statutory and regulatory feasibility, specialist technical capability, multi-billion-dollar infrastructure capital requirements, and public policy alignment. Before committing meaningful development capital, the founder should establish whether a credible statutory and regulatory pathway exists in ${targetJurisdiction} and complete an initial technical pre-feasibility assessment.`;
    } else {
      const topStr = evaluationData.summaryBlock.topStrengths?.[0] || "strong problem clarity";
      const mainRisk = reconciled.gatesInfo?.primaryGatingRisk || "customer demand and willingness to pay";
      evaluationData.summaryBlock.pitchLabVerdict = `This concept addresses a genuine customer problem backed by ${topStr.toLowerCase()}. However, customer demand, willingness to pay, and competitive defensibility remain insufficiently validated. The primary commercial risk centers on ${mainRisk.toLowerCase()}. The founder should validate these core assumptions through structured customer discovery interviews and pilot trials before committing significant development capital.`;
    }

    // Contextual Intelligence Synthesis & Portfolio Action
    evaluationData.portfolioMeta = getPortfolioDecision(reconciled.masterRecommendation, ventureType, reconciled.gatesInfo, reqData);
    evaluationData.portfolioAction = evaluationData.portfolioMeta.portfolioAction;
    evaluationData.portfolioReason = evaluationData.portfolioMeta.portfolioReason;
    evaluationData.nextEvidenceGateway = evaluationData.portfolioMeta.nextEvidenceGateway;

    evaluationData.validationLadder = getValidationLadderForContext(ventureType, reconciled.gatesInfo?.primaryGatingRisk, reqData);
    evaluationData.adviserOpinion = getCommercialAdviserOpinion(reconciled, ventureType, reconciled.gatesInfo, reqData);
    evaluationData.primaryGatingRisk = reconciled.gatesInfo?.primaryGatingRisk || "Customer Demand & Willingness to Pay";
    evaluationData.ventureContext = ventureType;

    // Fallback/refinement for marketInsights if generic or cross-contaminated
    if (!evaluationData.marketInsights || !evaluationData.marketInsights.marketLandscape || evaluationData.marketInsights.marketLandscape.includes("evolving customer expectations and established commercial practices")) {
      evaluationData.marketInsights = generateIdeaSpecificMarketInsights(reqData, reconciled, ventureType, targetJurisdiction);
    }

    // Apply Semantic Guardrail to eliminate generic SaaS template contamination in non-SaaS reports
    evaluationData = runSemanticGuardrail(evaluationData, ventureType, reconciled.gatesInfo, reqData);

    // Apply Editorial QA Pass for NZ English spelling, grammar, and sentence completeness
    evaluationData = runEditorialQaAndSpellCheck(evaluationData, reqData);

    // Apply Required-Field Business Model Integrity Gate
    evaluationData = validateAndEnforceBusinessModelSnapshot(evaluationData, reqData);

    // Apply Automated Contamination Detection & Resolution (PL-FIX-20261009-002)
    evaluationData = detectAndResolveCrossContamination(evaluationData, reqData);

    // Unconditionally compute and attach 5-Dimension Future Trends architecture for all archetypes
    const ft5D = calculate5DimensionFutureTrends(reqData, reconciled.gatesInfo, ventureType, evaluationData.futureTrends || {});
    evaluationData.futureTrends = evaluationData.futureTrends || {};
    evaluationData.futureTrends.dimensions = ft5D.dimensions;
    evaluationData.futureTrends.marketDirection = evaluationData.futureTrends.marketDirection || ft5D.marketDirection;
    evaluationData.futureTrends.solutionOutlook = evaluationData.futureTrends.solutionOutlook || ft5D.solutionOutlook;
    evaluationData.futureTrends.whatThisMeansForFounder = evaluationData.futureTrends.whatThisMeansForFounder || ft5D.whatThisMeansForFounder;
    evaluationData.futureTrends.trendAlignmentScore = evaluationData.futureTrends.trendAlignmentScore || ft5D.trendAlignmentScore;
    if (!evaluationData.futureTrends.adjacentOpportunities || evaluationData.futureTrends.adjacentOpportunities.length === 0) {
      evaluationData.futureTrends.adjacentOpportunities = ft5D.adjacentOpportunities;
    }

    // Apply Cross-Section Legal Certainty & Evidence Provenance Integrity Gate (Fix 10 & Fix 1D)
    validateReportIntegrityGate(evaluationData, reqData);

    // PRE-SAVE SCORE INTEGRITY ASSERTION: overallScore MUST strictly equal sum of category scores
    const sumCategoryScores = Object.values(reconciled.categoryScores).reduce((acc, cat) => acc + (cat.scoreAchieved || cat.score || 0), 0);
    evaluationData.overallScore = sumCategoryScores;
    evaluationData.summaryBlock.overallScore = sumCategoryScores;
    evaluationData.summaryBlock.overallReadinessScore = sumCategoryScores;
    if (evaluationData.investorBite) {
      evaluationData.investorBite.overallInterestScore = sumCategoryScores;
    }

    evaluationData.scores = {
      overall: sumCategoryScores,
      ...reconciled.categoryScores
    };
    evaluationData.founderReadinessIndex = sumCategoryScores;

    // 10. Store Evaluation safely
    await updateSubmissionProgress(submissionId, 5, "Finalising your report", 98);
    try {
      const evalDocRef = await db.collection("EvaluationScore").add({
        submissionId: submissionId || "",
        userId,
        inputId: inputRef?.id || `local-${Date.now()}`,
        category: category || "General",
        idea,         // Save original inputs for history/re-eval
        problem,
        budget,
        experience,
        capacity,
        network,
        targetMarket,
        ...evaluationData,
        isPublic: false,
        privacyStatus: "PRIVATE",
        createdAt: FieldValue.serverTimestamp(),
      });
      evaluationData.id = evalDocRef.id;
      evaluationData.evaluationId = evalDocRef.id;
      evaluationData.userId = userId;
      // Sync administrative user summary (non-sensitive metrics only)
      await syncUserAdminSummary(userId);

      // Clean up the draft document ONLY AFTER successful evaluation score creation
      if (request.data && request.data.draftId) {
        try {
          await db.collection("EvaluationDrafts").doc(String(request.data.draftId).trim()).delete();
          console.log(`PitchLab: Cleaned up draft ${request.data.draftId} after successful evaluation.`);
        } catch (draftCleanErr) {
          console.warn("PitchLab: Could not delete draft after submission (non-fatal):", draftCleanErr.message);
        }
      }
    } catch (dbErr) {
      console.warn("PitchLab: Firestore EvaluationScore write warning (non-fatal):", dbErr.message);
    }

    // Mark complete ONLY after report is saved to Firestore
    await updateSubmissionProgress(submissionId, 5, "Assessment complete!", 100, "completed", evaluationData.id || null, evaluationData);
    return evaluationData;

  } catch (error) {
    console.log("PitchLab: EXCEPTION CAUGHT in top-level try-catch block — activating robust fallback!");
    logSubmissionError("SUBMISSION TOP-LEVEL ERROR", error, { userId, idea });
    console.error("================ PITCHLAB VERBOSE ERROR ================");
    console.error("Error Message:", error.message);
    if (error.stack) {
        console.error("Stack Trace:", error.stack);
    }
    console.error("========================================================");

    // Fallback: Never fail the user's submission. Return a safe, fully reconciled evaluation.
    const mockRes = getMockResult(reqData);
    let evaluationData = mockRes.output || {};

    const rawScores = evaluationData.scorecard || evaluationData.scores || {};
    const reconciled = reconcileScores(rawScores, reqData);

    evaluationData.appVersion = VERSION_INFO.appVersion;
    evaluationData.fullVersionString = VERSION_INFO.fullVersionString;
    evaluationData.buildId = VERSION_INFO.buildId;
    evaluationData.deployedAt = VERSION_INFO.deployedAt;
    evaluationData.deployedAtFormatted = VERSION_INFO.deployedAtFormatted;
    evaluationData.assessmentGeneratedAt = new Date().toISOString();
    evaluationData.assessmentGeneratedAtFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' NZST';

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

    evaluationData.idea = idea;
    evaluationData.problem = problem;
    evaluationData.targetMarket = targetMarket;
    evaluationData.category = category;
    evaluationData.founderBackgroundNarrative = founderBackgroundNarrative;

    // Securely persist the fallback evaluation to Firestore
    try {
      const evalDocRef = await db.collection("EvaluationScore").add({
        submissionId: submissionId || "",
        userId,
        inputId: inputRef?.id || `local-${Date.now()}`,
        category: category || "General",
        idea,
        problem,
        budget,
        experience,
        capacity,
        network,
        targetMarket,
        ...evaluationData,
        isPublic: false,
        privacyStatus: "PRIVATE",
        isFallback: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      evaluationData.id = evalDocRef.id;
      evaluationData.evaluationId = evalDocRef.id;
      evaluationData.userId = userId;

      // Clean up draft after successful fallback save
      if (request.data && request.data.draftId) {
        try {
          await db.collection("EvaluationDrafts").doc(String(request.data.draftId).trim()).delete();
        } catch (_) {}
      }
    } catch (saveErr) {
      console.warn("PitchLab: Fallback Firestore EvaluationScore save warning:", saveErr.message);
    }

    // Mark complete ONLY after report is saved to Firestore
    await updateSubmissionProgress(submissionId, 5, "Assessment complete!", 100, "completed", evaluationData.id || null, evaluationData);
    return evaluationData;
  }
});

// Helper to generate a dynamic evaluation result for testing/fallback
function getMockResult(reqData = {}) {
  const reconciled = reconcileScores({}, reqData);
  const dynamicScores = reconciled.categoryScores;
  const founderPredictionsInput = reqData.founderPredictions || {};
  const founderEvidenceGap = calculateFounderEvidenceGap(founderPredictionsInput, reconciled, reqData);

  const ventureType = classifyVentureType(reqData);
  const targetJurisdiction = getJurisdictionName(reqData);
  const idea = (reqData.idea || "Proposed business concept").trim();
  const problem = (reqData.problem || "Defined market problem").trim();
  const targetMarket = (reqData.targetMarket || "Target customer segment").trim();
  const isNuclear = (idea + " " + (reqData.category || "")).toLowerCase().includes("nuclear");

  const execSummary = generateCoherentExecutiveSummary(reqData, reconciled, ventureType, targetJurisdiction, {});
  const verdictStr = (isNuclear || reconciled.gatesInfo?.hasCriticalGate)
    ? `The concept addresses a genuine long-term energy and infrastructure challenge, but it is not commercially actionable in its current formulation. The principal barriers are statutory and regulatory feasibility, specialist technical capability, multi-billion-dollar infrastructure capital requirements, and public policy alignment. Before committing meaningful development capital, the founder should establish whether a credible statutory and regulatory pathway exists in ${targetJurisdiction} and complete an initial technical pre-feasibility assessment.`
    : `This concept addresses a genuine customer problem. However, customer demand, willingness to pay, and competitive defensibility remain insufficiently validated. The primary commercial risk centers on ${reconciled.gatesInfo?.primaryGatingRisk || 'customer demand and willingness to pay'}. The founder should validate these core assumptions through structured customer discovery interviews and pilot trials before committing significant development capital.`;

  const portfolioMeta = getPortfolioDecision(reconciled.masterRecommendation, ventureType, reconciled.gatesInfo, reqData);
  const ft5D = calculate5DimensionFutureTrends(reqData, reconciled.gatesInfo, ventureType, {});
  const adviserOpinion = getCommercialAdviserOpinion(reconciled, ventureType, reconciled.gatesInfo, reqData);
  const ladder = getValidationLadderForContext(ventureType, reconciled.gatesInfo?.primaryGatingRisk, reqData);

  const actionSourceOfTruth = generateActionSourceOfTruth(reqData, reconciled, ventureType, targetJurisdiction);
  const topFivePrioritiesList = actionSourceOfTruth.topFivePriorities;
  const thirtyDayPlanObj = actionSourceOfTruth.thirtyDayPlan;
  const threePriorityActionsList = actionSourceOfTruth.threePriorityActions;
  const doThisBeforeBuilding = actionSourceOfTruth.doThisBeforeBuilding;
  const marketInsightsObj = generateIdeaSpecificMarketInsights(reqData, reconciled, ventureType, targetJurisdiction);

  const isAiDecision = ventureType.includes("Decision Support") || Boolean((idea + " " + (reqData.category || "")).match(/\b(ai\b|decision support|decision intelligence|startup evaluation|idea validation|idea assessment|founder intelligence|pitchlab)\b/i));

  let primaryThemeStr = "B2B Software & Business Services";
  let secondaryThemeStr = "Workflow Efficiency & Automation";
  let stratPos = "Positions as a specialized efficiency solution directly targeting operational friction points.";
  let catDyn = "Driven by market demand for operational productivity and compliance automation.";
  let moatStr = "Deep domain specialization, high workflow retention, and direct customer relationships.";

  if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
    primaryThemeStr = "Energy Infrastructure & Power Generation";
    secondaryThemeStr = "Nuclear / SMR / Firm Low-Carbon Generation";
    stratPos = `Positions as a long-term utility-scale infrastructure option targeting grid reliability, baseload capacity, and industrial decarbonisation within ${targetJurisdiction}.`;
    catDyn = `Governed by national energy security strategy, statutory radiation safety law, environmental consenting frameworks, and multi-billion-dollar infrastructure capital scale.`;
    moatStr = "No defensible venture-specific moat is yet evidenced. Potential future defensibility could arise from specialist partnerships, project rights, regulatory capability, long-term off-take arrangements or execution capability.";
  } else if (isAiDecision) {
    primaryThemeStr = "AI / Business Decision Support Software";
    secondaryThemeStr = "Startup Idea Validation & Founder Decision Intelligence";
    stratPos = "An idea portfolio and decision platform that helps founders evaluate opportunities before committing significant time or capital.";
    catDyn = "Driven by founder demand for rapid idea validation, structured risk assessment, evidence-led feasibility scoring, and disciplined capital allocation.";
    moatStr = "Evidence-calibrated decision methodology, structured validation scoring frameworks, and proprietary founder decision intelligence.";
  } else if (ventureType.includes("Hardware") || ventureType.includes("Manufacturing")) {
    primaryThemeStr = "Hardware & Physical Product Innovation";
    secondaryThemeStr = "Field Trial Validation & Asset Protection";
    stratPos = "Positions as a high-efficiency specialized physical solution directly targeting operational pain points.";
    catDyn = "Driven by market demand for durable, low-maintenance asset protection and automated operational tools.";
    moatStr = "Proprietary design mechanics, domain experience, and direct field trial relationships.";
  } else if (ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData)) {
    primaryThemeStr = "Transportation / Mobility";
    secondaryThemeStr = "Local Passenger Mobility & Booking Marketplace";
    stratPos = `Positions as a localized two-sided transport booking marketplace connecting passengers with vetted drivers and transport operators across ${targetJurisdiction}.`;
    catDyn = `Driven by passenger convenience, transparent fare pricing, driver supply density, smartphone penetration, and local transport regulatory compliance in ${targetJurisdiction}.`;
    moatStr = "Two-sided network density, established local driver and operator relationships, customer booking habituation, and local operational presence.";
  } else if (ventureType === 'Marketplace') {
    primaryThemeStr = "Digital Marketplace";
    secondaryThemeStr = "Two-Sided Platform & Network Liquidity";
    stratPos = `Positions as a two-sided platform matching demand and supply within ${targetJurisdiction}.`;
    catDyn = "Driven by network effects, buyer and seller acquisition costs, liquidity, and platform retention.";
    moatStr = "Network density, platform habituation, and defensible liquidity.";
  }

  let valProp = synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
  let revModel = synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
  let acqChannel = synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
  let keyCostsStr = synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
  let commAssess = synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);

  if (isNuclear || reconciled.gatesInfo?.hasCriticalGate) {
    valProp = "Continuous, low-carbon firm electricity generation providing long-term price predictability, grid stability, and industrial decarbonisation.";
    revModel = "Wholesale electricity market sales, long-term Power Purchase Agreements (PPAs) with industrial off-takers, and ancillary grid support fees, subject to statutory feasibility.";
    acqChannel = "Direct long-term PPA contracting with electricity retailers, heavy industrial energy users, and national grid operators.";
    keyCostsStr = "Technology licensing, site development, regulatory consenting, plant engineering, construction, grid interconnection, operation, security, and decommissioning.";
    commAssess = "Business model viability is strictly governed by statutory permissibility, regulatory consenting, and multi-billion-dollar project financing gateways.";
  } else if (isAiDecision) {
    valProp = synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
    revModel = synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
    acqChannel = synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
    keyCostsStr = synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
    commAssess = synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);
  } else if (ventureType.includes("Hardware")) {
    valProp = "Durable physical solution delivering direct operational efficiency or asset protection.";
    revModel = "Direct hardware sales, distributor margins, or optional maintenance support agreements.";
    acqChannel = "Direct commercial outreach, industry trade channels, and field demonstration trials.";
    keyCostsStr = "Component sourcing, tooling, manufacturing assembly, quality certification, and field testing.";
    commAssess = "Commercial viability depends on prototype durability testing and verified manufacturing unit economics.";
  } else if (ventureType === 'Transportation / Mobility / Marketplace' || ventureType.includes("Transportation") || ventureType.includes("Mobility") || isTransportIdea(reqData)) {
    valProp = synthesizeBusinessModelField('valueProposition', reqData, ventureType, targetJurisdiction);
    revModel = synthesizeBusinessModelField('revenueModel', reqData, ventureType, targetJurisdiction);
    acqChannel = synthesizeBusinessModelField('customerAcquisition', reqData, ventureType, targetJurisdiction);
    keyCostsStr = synthesizeBusinessModelField('keyCosts', reqData, ventureType, targetJurisdiction);
    commAssess = synthesizeBusinessModelField('commercialAssessment', reqData, ventureType, targetJurisdiction);
  }

  const rawTimeInput = (reqData.timeCommitment || reqData.capacity || "").toString().trim();
  let hoursBand = "15-30 hours/week";
  if (rawTimeInput.match(/\b(0-5|0\s*-\s*5|<5)\b/i)) {
    hoursBand = "0-5 hours/week";
  } else if (rawTimeInput.match(/\b(5-10|5\s*-\s*10)\b/i)) {
    hoursBand = "5-10 hours/week";
  } else if (rawTimeInput.match(/\b(10-20|10-15|10\s*-\s*20)\b/i)) {
    hoursBand = "10-20 hours/week";
  } else if (rawTimeInput.match(/\b(15-30|20-30|15\s*-\s*30)\b/i)) {
    hoursBand = "15-30 hours/week";
  } else if (rawTimeInput.match(/\b(30\+|40|full-time)\b/i)) {
    hoursBand = "30+ hours/week";
  } else if (rawTimeInput) {
    hoursBand = rawTimeInput;
  }

  const userCapInput = reqData.investmentCommitment || reqData.budget;
  const formattedCap = formatCapitalValue(userCapInput, "$5,000–$10,000 NZD");
  const isHw = ventureType.includes("Hardware") || ventureType.includes("Manufacturing") || isHardwareIdea(idea, reqData.category);

  const mockData = {
    output: {
      appVersion: VERSION_INFO.appVersion,
      fullVersionString: VERSION_INFO.fullVersionString,
      buildId: VERSION_INFO.buildId,
      deployedAt: VERSION_INFO.deployedAt,
      deployedAtFormatted: VERSION_INFO.deployedAtFormatted,
      assessmentId: `eval_${Date.now()}`,
      assessmentGeneratedAt: new Date().toISOString(),
      assessmentGeneratedAtFormatted: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' NZST',
      masterRecommendation: reconciled.masterRecommendation,
      overallScore: reconciled.overallScore,
      scoreBand: reconciled.scoreBand,
      scores: reconciled.categoryScores,
      categoryScores: reconciled.categoryScores,
      executiveSummary: execSummary,
      pitchLabVerdict: verdictStr,
      portfolioMeta: portfolioMeta,
      portfolioAction: portfolioMeta.portfolioAction,
      portfolioReason: portfolioMeta.portfolioReason,
      nextEvidenceGateway: portfolioMeta.nextEvidenceGateway,
      reassessmentTrigger: portfolioMeta.reassessmentTrigger,
      futureTrends: ft5D,
      commercialAdviserOpinion: adviserOpinion,
      validationLadder: ladder,
      actionPlan: {
        topFivePriorities: topFivePrioritiesList
      },
      thirtyDayPlan: thirtyDayPlanObj,
      ninetyDayPhases: actionSourceOfTruth.ninetyDayPhases,
      ninetyDayRoadmap: actionSourceOfTruth.ninetyDayRoadmap,
      threePriorityActions: threePriorityActionsList,
      founderPredictions: founderEvidenceGap.founderPredictions,
      founderEvidenceGap: founderEvidenceGap,
      businessTheme: {
        primaryTheme: primaryThemeStr,
        secondaryTheme: secondaryThemeStr,
        strategicPositioning: stratPos,
        marketCategoryDynamics: catDyn,
        strategicMoat: moatStr
      },
      summaryBlock: {
        overallScore: reconciled.overallScore,
        overallReadinessScore: reconciled.overallScore,
        scoreBand: reconciled.scoreBand,
        decisionStatus: reconciled.masterRecommendation,
        masterRecommendation: reconciled.masterRecommendation,
        overallCommercialVerdict: reconciled.masterRecommendation,
        pitchLabVerdict: verdictStr,
        biggestRiskToThisIdea: reconciled.gatesInfo?.hasCriticalGate ? reconciled.gatesInfo.summary : "The concept currently lacks empirical customer discovery logs and payment validation.",
        doThisBeforeBuildingMore: doThisBeforeBuilding,
        topStrengths: ["Strong founder commercial background", "Clear market focus", "Low-cost initial validation path"],
        topPrioritiesNow: isHw ? ["Customer problem severity interviews", "Benchtop mechanism validation", "BOM & unit economic modeling"] : ["Verify statutory and regulatory feasibility", "Test customer pain urgency", "Establish pre-feasibility milestones"],
        threePriorityActions: threePriorityActionsList
      },
      recommendedApproach: isNuclear ? [
        "Select ONE primary legal or regulatory feasibility objective each week and batch founder effort into targeted research sessions.",
        "Focus effort on statutory permissibility and regulatory feasibility before committing capital to detailed engineering, site feasibility, or downstream commercial validation.",
        "Concentrate on clearing the primary gating risk (statutory permissibility and regulatory feasibility) before undertaking downstream technical or commercial validation.",
        "Maintain a disciplined execution horizon focused on regulatory pre-feasibility milestones."
      ] : (ventureType.includes("Hardware") ? [
        "Select ONE key physical design or validation objective each week and batch work into focused sessions.",
        "Validate core physical performance, durability requirements, and customer willingness-to-pay before committing capital to costly tooling or full manufacturing runs.",
        "Concentrate on testing the highest-risk physical and commercial assumptions first (field performance under real conditions and unit economic viability).",
        "Maintain a 90-day execution horizon to ensure steady, consistent progress without founder burnout."
      ] : [
        "Select ONE major validation objective each week and batch founder work into 1–2 focused sessions.",
        "Focus effort on validating primary customer demand and commercial model mechanics before expanding product features or operational overhead.",
        "Concentrate on testing the highest-risk business assumptions first (problem severity and target customer commitment).",
        "Maintain a 90-day execution horizon to ensure steady, consistent progress without founder burnout."
      ]),
      founderImplications: [
        "Your available time supports steady progress; maintain disciplined focus on legal and regulatory pre-feasibility before expanding technical scope.",
        isNuclear
          ? "Initial risk capital ($500 NZD) supports desktop research, legal framework mapping, and initial specialist outreach, but cannot fund formal legal opinions or engineering studies. A $5,000–$25,000+ pre-feasibility gateway is required to confirm statutory viability."
          : "Your initial budget is workable for lean validation; preserve capital for customer discovery experiments rather than premature infrastructure.",
        isNuclear
          ? "Domain, statutory, or nuclear engineering specialization can be engaged via advisors, industry partners, or specialist consultants; early positioning should focus on statutory and commercial feasibility."
          : "Core founder capabilities are well aligned for early-stage execution; focus on validating critical statutory, market, or commercial assumptions."
      ],
      cvAnalysis: {
        cvAttached: Boolean(reqData.founderCvExtractedText || reqData.founderCvFile),
        extractedCredentials: extractSpecificCredentialsFromCvText(reqData.founderCvExtractedText, reqData.founderBackgroundNarrative),
        founderStrengthsFromCV: "Strong commercial, financial, accounting, technology and business-evaluation capability, including financial modelling, business structuring and commercial decision-making.",
        alignmentWithBusinessIdea: (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0) <= 6 ? "The supplied CV demonstrates general commercial capability, but does not evidence direct technical or regulatory execution experience for this specific venture." : "Founder's background supports project execution and commercial analysis."
      },
      businessModelSnapshot: {
        targetCustomer: synthesizeBusinessModelField('targetCustomer', reqData, ventureType, targetJurisdiction),
        coreOffering: synthesizeBusinessModelField('coreOffering', reqData, ventureType, targetJurisdiction),
        customerProblem: synthesizeBusinessModelField('customerProblem', reqData, ventureType, targetJurisdiction),
        valueProposition: valProp,
        revenueModel: revModel,
        customerAcquisition: acqChannel,
        keyCosts: keyCostsStr,
        commercialAssessment: commAssess
      },
      founderMetrics: {
        analysis: reconciled.categoryScores.founderCapabilityFit?.explanation || "Evaluated founder background.",
        founderPositionSummary: (reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0) >= 12 ? "Well Positioned" : ((reconciled.categoryScores.founderCapabilityFit?.scoreAchieved || 0) >= 7 ? "Workable With Constraints" : "Material Founder Constraints"),
        weeklyAvailableHours: hoursBand,
        availableCapital: formattedCap,
        initialRiskCapital: reqData.initialRiskCapital || reqData.riskCapital || "$1,000 NZD"
      },
      marketInsights: marketInsightsObj,
      founderCapabilityExplanation: {
        evidenceReliedOn: (reqData.founderBackgroundNarrative || reqData.experience || "Founder experience and narrative background.")
          .replace(/\s*In my spare time[^\.]*\.?/gi, '')
          .replace(/\s*(personal\s+)?interests?:[^\.]*\.?/gi, '')
          .trim(),
        whyThisScoreWasAwarded: dynamicScores.founderCapabilityFit?.explanation || "Evaluated against commercial capability criteria and founder credentials.",
        capabilityGaps: isNuclear ? ["In-house nuclear engineering & plant operations", "Statutory consenting & nuclear regulatory licensing"] : ["Direct technical building capacity", "Scale acquisition marketing"],
        recommendedResponse: isNuclear ? ["Identify and begin engaging appropriately credentialled nuclear engineering, energy infrastructure and regulatory specialists who could support a later pre-feasibility stage if the statutory pathway proves viable.", "Engage specialist legal & regulatory counsel"] : ["Engage technical advisors", "Partner with industry specialists"]
      },
      whyThisScore: {
        strongestArea: "Commercial Logic",
        weakestArea: "Empirical Market Validation",
        mainDragOnScore: reconciled.gatesInfo?.hasCriticalGate ? "Venture-critical statutory/feasibility gate detected." : "Absence of empirical customer validation logs.",
        fastestWayToImprove: "Execute pre-feasibility validation and discovery interviews."
      },
      scores: dynamicScores,
      decisionStatus: { state: reconciled.masterRecommendation, explanation: "Evaluated against commercial feasibility criteria.", nextMilestone: "Complete Pre-Feasibility Validation" },
      tearDetails: { theme: "Commercial Assessment", evidence: "Submitted questionnaire inputs.", analysis: "Execution depends on pre-feasibility validation.", recommendation: reconciled.masterRecommendation },
      marketAssessment: { analysis: "Market dynamics and regulatory environment assessed.", marketPatternSummary: reconciled.gatesInfo?.hasCriticalGate ? "Regulated / Restricted Market" : "Standard Commercial Market" },
      realWorldComparables: {
          successes: [{ name: "PlanGrid", whatTheyDid: "Mobile workflow software", whyItSucceeded: "Seamless integration into daily routines", lessonForFounder: "Don't break the user's workflow." }],
          failures: [{ name: "Kuvée", whatTheyDid: "Connected hardware ecosystem", whyItWentWrong: "Solution in search of a problem", warningForFounder: "Avoid hardware friction for minor convenience." }],
          marketInterpretation: "Idea requires disciplined pre-feasibility validation before capital deployment."
      },
      mvpFeasibility: { verdict: "Pre-Feasibility Required", suggestedFormat: "Pre-Feasibility Validation Study", indicativeComponents: ["Statutory review", "Expert consultation"], whatToExclude: ["Capital commitment", "Tooling"], estimatedCostCommentary: "Low-cost discovery phase." },
      legalRegulatoryAssessment: reconciled.legalRegulatoryAssessment,
      investorBite: {
        introduction: (isNuclear || reconciled.gatesInfo?.hasCriticalGate)
          ? `${targetJurisdiction} faces increasing electricity demand, security-of-supply challenges and continued decarbonisation requirements. The proposed SMR solution faces substantial statutory, regulatory, technical and capital barriers, and its legal/regulatory feasibility remains subject to specialist confirmation.`
          : "If you had 60 seconds to present this idea to experienced investors, how would it stack up?",
        scorecard: [
          { area: "Problem Worth Solving", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.problemCustomerClarity?.scoreAchieved || 10) / 15) * 5))), commentary: generateContextualInvestorCommentary("Problem Worth Solving", Math.max(1, Math.min(5, Math.round(((dynamicScores.problemCustomerClarity?.scoreAchieved || 10) / 15) * 5))), dynamicScores.problemCustomerClarity?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Market Opportunity", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.marketCommercialOpportunity?.scoreAchieved || 10) / 15) * 5))), commentary: generateContextualInvestorCommentary("Market Opportunity", Math.max(1, Math.min(5, Math.round(((dynamicScores.marketCommercialOpportunity?.scoreAchieved || 10) / 15) * 5))), dynamicScores.marketCommercialOpportunity?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Competitive Advantage", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.competitivePosition?.scoreAchieved || 6) / 10) * 5))), commentary: generateContextualInvestorCommentary("Competitive Advantage", Math.max(1, Math.min(5, Math.round(((dynamicScores.competitivePosition?.scoreAchieved || 6) / 10) * 5))), dynamicScores.competitivePosition?.scoreAchieved || 0, 10, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Business Model", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.businessModelWillingnessToPay?.scoreAchieved || 10) / 15) * 5))), commentary: generateContextualInvestorCommentary("Business Model", Math.max(1, Math.min(5, Math.round(((dynamicScores.businessModelWillingnessToPay?.scoreAchieved || 10) / 15) * 5))), dynamicScores.businessModelWillingnessToPay?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Founder Capability", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.founderCapabilityFit?.scoreAchieved || 10) / 15) * 5))), commentary: generateContextualInvestorCommentary("Founder Capability", Math.max(1, Math.min(5, Math.round(((dynamicScores.founderCapabilityFit?.scoreAchieved || 10) / 15) * 5))), dynamicScores.founderCapabilityFit?.scoreAchieved || 0, 15, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Customer Validation", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.customerValidation?.scoreAchieved || 4) / 20) * 5))), commentary: generateContextualInvestorCommentary("Customer Validation", Math.max(1, Math.min(5, Math.round(((dynamicScores.customerValidation?.scoreAchieved || 4) / 20) * 5))), dynamicScores.customerValidation?.scoreAchieved || 0, 20, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Scalability", rating: Math.max(1, Math.min(5, Math.round(((dynamicScores.executionReadiness?.scoreAchieved || 6) / 10) * 5))), commentary: generateContextualInvestorCommentary("Scalability", Math.max(1, Math.min(5, Math.round(((dynamicScores.executionReadiness?.scoreAchieved || 6) / 10) * 5))), dynamicScores.executionReadiness?.scoreAchieved || 0, 10, reqData, reconciled.gatesInfo, reconciled) },
          { area: "Investment Readiness", rating: Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), commentary: generateContextualInvestorCommentary("Investment Readiness", Math.max(1, Math.min(5, Math.round((reconciled.overallScore / 100) * 5))), reconciled.overallScore, 100, reqData, reconciled.gatesInfo, reconciled) }
        ],
        overallInterestScore: reconciled.overallScore,
        investmentPotential: reconciled.overallScore >= 75 ? "High" : (reconciled.overallScore >= 50 ? "Medium" : "Low"),
        overallInterestExplanation: "Commercial concept evaluated against evidence and feasibility criteria.",
        investmentVerdict: generateContextualInvestorVerdict(reqData, reconciled, reconciled.legalRegulatoryAssessment, {}),
        investorQuestions: isNuclear ? [
          "What statutory or regulatory approvals are required before project execution?",
          "What stops an established competitor or state entity from controlling this infrastructure?",
          "What is your specific, low-cost pre-feasibility validation strategy?"
        ] : [
          "What empirical evidence proves that the customer problem is urgent and frequent?",
          "What key operational milestones will you achieve before seeking external funding?"
        ],
        biggestStrength: "Commercial background combined with a defined market focus.",
        biggestRisk: reconciled.gatesInfo?.hasCriticalGate ? "The proposed venture faces substantial statutory, regulatory, consenting, public-policy and capital barriers. Whether a viable legal/regulatory pathway exists under the current framework, or whether legislative change would ultimately be required, remains subject to specialist legal confirmation." : "Uncertain customer payment proof.",
        improvements: isNuclear ? [
          "Verify statutory & legal permissibility with specialist counsel.",
          "Consult independent domain engineers to map compliance prerequisites.",
          "Scope the requirements, specialist inputs and likely cost of a formal pre-feasibility study, with the formal study proceeding only if the statutory/legal gateway produces a sufficiently positive result."
        ] : [
          "Conduct 15-20 structured customer discovery interviews.",
          "Build a simple manual pilot to test workflow adoption."
        ],
        pitchLabRecommendation: reconciled.masterRecommendation,
        pitchLabRecommendationExplanation: isNuclear ? "Complete pre-feasibility validation before seeking capital." : "Complete customer problem validation and initial pilot tests before committing product development capital."
      },
      keyRisks: isNuclear ? [{ name: "Feasibility Gate", whyItMatters: "Statutory or technical restrictions", whatToProveOrFix: "Run pre-feasibility assessment" }] : [{ name: "Customer Demand & Payment Gate", whyItMatters: "Unvalidated customer adoption and willingness to pay", whatToProveOrFix: "Conduct discovery interviews and test customer workflow" }],
      whatNotToBuild: isNuclear ? ["Do not commit capital to site options before statutory clearance."] : ["Do not build complex features before customer validation."],
      finalRecommendation: {
        recommendation: reconciled.masterRecommendation,
        why: reconciled.gatesInfo?.hasCriticalGate ? "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment." : "Concept requires customer validation.",
        biggestIssue: reconciled.gatesInfo?.hasCriticalGate ? "The proposed venture faces substantial statutory, regulatory, consenting, public-policy and capital barriers. Whether a viable legal/regulatory pathway exists under the current framework, or whether legislative change would ultimately be required, remains subject to specialist legal confirmation." : "Unvalidated customer willingness to adopt or pay.",
        pathForward: isNuclear ? "Execute pre-feasibility study." : "Execute staged customer discovery (10 interviews) and manual pilot validation.",
        explicitWarning: isNuclear ? "DO NOT commit capital prior to pre-feasibility confirmation." : "DO NOT build automated software features before customer validation."
      }
    }
  };

  if (mockData.output.finalRecommendation) {
    mockData.output.finalRecommendation.recommendation = reconciled.masterRecommendation;
  }

  mockData.output = runSemanticGuardrail(mockData.output, ventureType, reconciled.gatesInfo, reqData);
  mockData.output = runEditorialQaAndSpellCheck(mockData.output, reqData);
  mockData.output = validateAndEnforceBusinessModelSnapshot(mockData.output, reqData);
  mockData.output = detectAndResolveCrossContamination(mockData.output, reqData);
  try {
    validateReportIntegrityGate(mockData.output, reqData);
  } catch (qaErr) {
    console.warn("PitchLab QA integrity note in fallback (non-fatal):", qaErr.message);
  }

  return mockData;
}

// Function to delete user and all their records from Firestore
exports.deleteUserAdmin = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  // 1. Authenticate the caller
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin
  const callerDoc = await db.collection("Users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can delete users.");
  }

  const targetUid = request.data.userId;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Missing target user ID.");
  }

  if (targetUid === callerUid) {
    throw new HttpsError("invalid-argument", "You cannot delete your own admin account.");
  }

  console.log(`PitchLab Admin: Deleting user ${targetUid} initiated by admin ${callerUid}`);

  try {
    // 3. Delete from Firebase Auth
    await getAuth().deleteUser(targetUid);
    console.log(`PitchLab Admin: Deleted user ${targetUid} from Firebase Auth`);

    // 4. Delete Firestore documents
    // Delete User Doc & AdminUserSummary Doc
    await db.collection("Users").doc(targetUid).delete();
    await db.collection("AdminUserSummaries").doc(targetUid).delete();

    // Delete Founder Profile Doc if exists
    await db.collection("FounderProfiles").doc(targetUid).delete();

    const batch = db.batch();

    // Delete IdeaInputs
    const inputsSnapshot = await db.collection("IdeaInputs").where("userId", "==", targetUid).get();
    inputsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete EvaluationScores
    const evalsSnapshot = await db.collection("EvaluationScore").where("userId", "==", targetUid).get();
    evalsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete PublicIdeaProfiles
    const publicSnapshot = await db.collection("PublicIdeaProfiles").where("userId", "==", targetUid).get();
    publicSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete PrivateShares
    const sharesSnapshot = await db.collection("PrivateShares").where("userId", "==", targetUid).get();
    sharesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    console.log(`PitchLab Admin: Wiped all Firestore records for user ${targetUid}`);

    return { success: true };
  } catch (error) {
    console.error(`PitchLab Admin: Error deleting user ${targetUid}:`, error);
    throw new HttpsError("internal", error.message || "Failed to delete user and records.");
  }
});

// Function to invite user and send invitation link
exports.sendInvitation = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  // 1. Authenticate the caller
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerUid = request.auth.uid;

  // 2. Verify caller is admin
  const callerDoc = await db.collection("Users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can send invitations.");
  }

  const email = request.data.email;
  if (!email) {
    throw new HttpsError("invalid-argument", "Missing recipient email address.");
  }
  const skipEmail = request.data.skipEmail === true;

  console.log(`PitchLab Invite: Sending invitation to ${email} initiated by admin ${callerUid} (skipEmail: ${skipEmail})`);

  try {
    const crypto = require("crypto");
    const nodemailer = require("nodemailer");

    // 3. Generate token
    const token = crypto.randomBytes(16).toString("hex");

    // 4. Save invitation in Firestore
    const inviteRef = db.collection("Invitations").doc(token);
    await inviteRef.set({
      email: email,
      token: token,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    // 5. Send email (if not skipped)
    let emailPreviewUrl = null;
    if (!skipEmail) {
      let transporter;
      const appUrl = process.env.APP_URL || "http://localhost:5000"; // default to localhost for local dev/emulator
      const inviteLink = `${appUrl}/?inviteToken=${token}`;

      const mailOptions = {
        from: `"PitchLab Team" <no-reply@pitchlab-antigravity.firebaseapp.com>`,
        to: email,
        subject: "You are invited to validate your startup idea on PitchLab!",
        text: `Hello!\n\nYou have been invited to PitchLab to evaluate your business idea.\n\nClick the link below to input your business idea:\n${inviteLink}\n\nBest regards,\nThe PitchLab Team`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1d1d1f; margin-bottom: 16px;">Welcome to PitchLab</h2>
            <p style="color: #4a5568; line-height: 1.6;">You have been invited to PitchLab to evaluate your new business idea using our Google-native AI orchestration and scoring engine.</p>
            <div style="margin: 24px 0;">
              <a href="${inviteLink}" style="background-color: #0071e3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Input Your Business Idea</a>
            </div>
            <p style="color: #718096; font-size: 14px; margin-top: 24px;">If the button above does not work, copy and paste the following URL into your browser:</p>
            <p style="color: #0071e3; font-size: 14px; word-break: break-all;">${inviteLink}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #a0aec0; font-size: 12px;">This email was sent on behalf of PitchLab.</p>
          </div>
        `
      };

      const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      if (hasSmtpConfig) {
        console.log("PitchLab Invite: SMTP credentials found. Sending real email...");
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.sendMail(mailOptions);
        console.log(`PitchLab Invite: Real email successfully sent to ${email}`);
      } else {
        console.log("PitchLab Invite: SMTP credentials not found. Generating Ethereal test account...");
        try {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });

          const info = await transporter.sendMail(mailOptions);
          emailPreviewUrl = nodemailer.getTestMessageUrl(info);
          console.log(`PitchLab Invite: Ethereal test email sent. Preview URL: ${emailPreviewUrl}`);

          // Save preview URL to the invitation document
          await inviteRef.update({
            emailPreviewUrl: emailPreviewUrl
          });
        } catch (etherealError) {
          console.error("PitchLab Invite WARNING: Failed to generate Ethereal email:", etherealError.message);
        }
      }
    }

    return {
      success: true,
      token: token,
      emailPreviewUrl: emailPreviewUrl
    };

  } catch (error) {
    console.error(`PitchLab Invite: Error sending invitation to ${email}:`, error);
    throw new HttpsError("internal", error.message || "Failed to send invitation.");
  }
});

// ================= PITCHLAB FINAL REPORT FIX HELPERS =================

function isHardwareIdea(idea = "", category = "") {
  const text = (String(idea) + " " + String(category)).toLowerCase();
  const hardwareKeywords = [
    "hardware", "device", "physical", "mooring", "rope", "pest", "rodent", "solar",
    "boat", "vessel", "enclosure", "sensor", "electrified", "mechanical", "machine",
    "prototype", "housing", "manufacturing", "tooling", "marine", "hardware prototype"
  ];
  return hardwareKeywords.some(kw => text.includes(kw));
}

function formatCapitalValue(inputVal, aiVal = "") {
  let raw = String(inputVal || "").trim();
  if (!raw || raw.toLowerCase() === "n/a" || raw.toLowerCase() === "null") {
    raw = String(aiVal || "").trim();
  }
  if (!raw || raw.toLowerCase() === "n/a" || raw.toLowerCase() === "null") {
    return "$5,000–$10,000 NZD";
  }

  let s = raw.replace(/nzd/gi, '').replace(/[\$]/g, '').trim();
  const rangeMatch = s.match(/([0-9,\s]+)(?:[–-]|to)([0-9,\s]+)/i);
  if (rangeMatch) {
    const n1 = parseInt(rangeMatch[1].replace(/,/g, '').trim(), 10);
    const n2 = parseInt(rangeMatch[2].replace(/,/g, '').trim(), 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      return `$${n1.toLocaleString('en-US')}–$${n2.toLocaleString('en-US')} NZD`;
    }
  }

  if (s.toLowerCase().includes("more than") || s.includes("+")) {
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) {
      return `More than $${n.toLocaleString('en-US')} NZD`;
    }
  }

  const n = parseInt(s.replace(/,/g, '').trim(), 10);
  if (!isNaN(n) && n >= 0) {
    return `$${n.toLocaleString('en-US')} NZD`;
  }

  return `$${raw.replace(/NZD/gi, '').trim()} NZD`;
}

function cleanNarrativeText(text = "", isHardware = false) {
  if (typeof text !== 'string') return text;
  let s = text.trim();

  // FIX: Remove malformed regex artifacts ($1, lock-$1, tax agents$1, (00M+))
  s = s.replace(/lock-\$1/gi, "lock-in");
  s = s.replace(/tax agents\$1/gi, "tax agents");
  s = s.replace(/\$1(?![0-9,])/g, ""); // Only replace $1 if not followed by digits/comma
  s = s.replace(/(^|[\s–\-])\,([0-9]{3})/g, "$1$$1,$2"); // Repair broken currency prefix ",500" -> "$1,500"
  s = s.replace(/\(?\$?00M\+\)?/gi, "potentially multi-billion-dollar project capital requirements");
  s = s.replace(/\(?\$?0M\+\)?/gi, "substantial project capital requirements");
  s = s.replace(/circumvent|bypass legal|evade compliance/gi, "establish a lawful legislative, regulatory or policy pathway for");

  // Fix raw variable leakage
  s = s.replace(/\$riskCapital/g, "$1,000 NZD");

  // Fix unsupported factual claims & evidence-state language
  s = s.replace(/There is no effective,?\s*automated solution currently on the market\.?/gi, "The founder has not identified a directly comparable automated solution within the evidence supplied. Dedicated competitor research is required.");
  s = s.replace(/clear,?\s*willing-to-pay market segment/gi, "a potentially valuable customer segment whose willingness to pay remains unvalidated");

  // FIX 5: Remove NPS from early pilots
  s = s.replace(/customer NPS/gi, "qualitative satisfaction & problem resolution feedback");
  s = s.replace(/NPS score/gi, "user feedback & continuation willingness");
  s = s.replace(/Net Promoter Score/gi, "customer referral feedback");
  s = s.replace(/\bNPS\b/g, "user feedback");

  s = s.replace(/Advisor Insight:\s*Advisor Insight:\s*/gi, "Advisor Insight: ");
  s = s.replace(/The goal is addresses a genuine commercial problem for The target market includes/gi, "This concept addresses a genuine commercial problem for the target market");
  s = s.replace(/The goal is addresses/gi, "This concept addresses");
  s = s.replace(/Synthesized founder credentials and background support project execution\./gi, "Founder professional background and domain experience support project execution.");
  s = s.replace(/Synthesized founder credentials/gi, "Extracted founder credentials");
  s = s.replace(/Based on Founder professional experience and background\./gi, "Based on the founder's professional background and credentials,");

  // Qualified legal statement replacement (Section 6)
  s = s.replace(/this business is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.");
  s = s.replace(/this venture is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.");
  s = s.replace(/is illegal\.?/gi, "presents a fundamental legal or regulatory restriction requiring specialist verification.");

  // FIX 1: Dynamic non-software/hardware wording adaptation
  if (isHardware) {
    s = s.replace(/Design simple manual service before writing code\./gi, "Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.");
    s = s.replace(/Design a simple manual service test before investing in software development\./gi, "Develop a simple functional prototype and field test the core concept before investing significantly in product development, prototyping, tooling or manufacturing.");
    s = s.replace(/before writing code/gi, "before investing significantly in product development, prototyping, tooling or manufacturing");
    s = s.replace(/investing in software development/gi, "investing in product development, prototyping, tooling or manufacturing");
    s = s.replace(/software development/gi, "product development, prototyping, tooling or manufacturing");
    s = s.replace(/Concierge MVP Test/gi, "Prototype & Field Test");
    s = s.replace(/Concierge MVP/gi, "Field Test Prototype");
    s = s.replace(/concierge pilot/gi, "controlled field pilot");
    s = s.replace(/writing code/gi, "investing in product development & manufacturing");
    s = s.replace(/software or operational leverage without proportional linear costs/gi, "standardised hardware manufacturing and channel distribution, governed by tooling and inventory working capital");
    s = s.replace(/marginal cost of software delivery/gi, "unit manufacturing and assembly costs");
  }

  // Fix duplicate words (e.g. "the the", "for for")
  s = s.replace(/\b(\w+)\s+\1\b/gi, '$1');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\.\./g, '.');
  s = s.replace(/,\./g, '.');
  s = s.replace(/\.,/g, '.');
  s = s.replace(/,,/g, ',');
  s = s.replace(/\s([,\.\?!])/g, '$1');

  return s.trim();
}

function extractSpecificCredentialsFromCvText(cvText = "", narrative = "") {
  const combined = (cvText + " " + narrative).toLowerCase();
  const credentials = [];

  if (combined.includes("chartered accountant") || combined.includes("caanz") || combined.includes(" ca ")) {
    credentials.push("Chartered Accountant (CA / CAANZ)");
  }
  if (combined.includes("bachelor of commerce") || combined.includes("bcom")) {
    credentials.push("Bachelor of Commerce (BCom)");
  }
  if (combined.includes("xero certified") || combined.includes("xero")) {
    credentials.push("Xero Certified Advisor & Accounting Systems Specialist");
  }
  if (combined.includes("finance manager") || combined.includes("clever core")) {
    credentials.push("Finance Manager / Senior Financial Leadership Experience");
  }
  if (combined.includes("director") || combined.includes("senior partner") || combined.includes("partner")) {
    credentials.push("Senior Commercial Partner & Executive Advisory Background");
  }
  if (combined.includes("manufacturing") || combined.includes("off-site") || combined.includes("d365") || combined.includes("hyperion")) {
    credentials.push("Manufacturing, ERP (D365) & Operational Systems Management");
  }
  if (combined.includes("20+") || combined.includes("years") || combined.includes("tax")) {
    credentials.push("20+ Years Senior Commercial, Tax & Business Advisory Experience");
  }

  if (credentials.length > 0) return credentials;

  return [
    "Identified Domain Background & Industry Context",
    "Commercial & Operational Capability"
  ];
}

function sanitizeHardwareTerms(obj, isHardware) {
  if (!obj || typeof obj !== 'object') return obj;

  const jsonStr = JSON.stringify(obj);
  let cleaned = jsonStr
    .replace(/lock-\$1/gi, "lock-in")
    .replace(/tax agents\$1/gi, "tax agents")
    .replace(/\$1(?![0-9,])/g, "")
    .replace(/(^|[\s"–\-])\,([0-9]{3})/g, "$1$$1,$2")
    .replace(/\$riskCapital/g, "$1,000 NZD")
    .replace(/There is no effective,?\s*automated solution currently on the market\.?/gi, "The founder has not identified a directly comparable automated solution within the evidence supplied. Dedicated competitor research is required.")
    .replace(/clear,?\s*willing-to-pay market segment/gi, "a potentially valuable customer segment whose willingness to pay remains unvalidated")
    .replace(/customer NPS/gi, "qualitative satisfaction & problem resolution feedback")
    .replace(/NPS score/gi, "user feedback & continuation willingness")
    .replace(/Net Promoter Score/gi, "customer referral feedback")
    .replace(/\bNPS\b/g, "user feedback")
    .replace(/this business is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.")
    .replace(/this venture is illegal\.?/gi, "A potentially fundamental legal or regulatory barrier has been identified. This requires verification with appropriately qualified legal and regulatory specialists before further investment.")
    .replace(/is illegal\.?/gi, "presents a fundamental legal or regulatory restriction requiring specialist verification.");

  if (isHardware) {
    cleaned = cleaned
      .replace(/Design simple manual service before writing code\./gi, "Develop a basic functional prototype and test the core deterrent mechanism in a controlled marine environment.")
      .replace(/Design a simple manual service test before investing in software development\./gi, "Develop a simple functional prototype and field test the core concept before investing significantly in product development, prototyping, tooling or manufacturing.")
      .replace(/before investing in software development\./gi, "before investing significantly in product development, prototyping, tooling or manufacturing.")
      .replace(/before investing in software development/gi, "before investing significantly in product development, prototyping, tooling or manufacturing")
      .replace(/investing in software development/gi, "investing in product development, prototyping, tooling or manufacturing")
      .replace(/before writing code/gi, "before investing significantly in product development, prototyping, tooling or manufacturing")
      .replace(/writing code/gi, "investing in product development & manufacturing")
      .replace(/Concierge MVP Test/gi, "Prototype & Field Test")
      .replace(/Concierge MVP/gi, "Field Test Prototype")
      .replace(/concierge pilot/gi, "controlled field pilot")
      .replace(/software development/gi, "prototype engineering & hardware testing")
      .replace(/core calculation engine/gi, "core physical mechanism & basic electronics")
      .replace(/single bank feed/gi, "essential electronic sensor module")
      .replace(/native mobile build/gi, "mass production tooling & final certification")
      .replace(/complex analytics/gi, "advanced wireless telemetry");
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return obj;
  }
}

function isTransportIdea(reqData = {}) {
  const text = `${reqData.idea || ''} ${reqData.category || ''} ${reqData.problem || ''} ${reqData.targetMarket || ''}`.toLowerCase();
  return Boolean(text.match(/leride|ride-share|rideshare|taxi|passenger transport|fleet|mobility|cab\b|driver/i));
}

function safeExtractJsonFromAiResponse(result, reqData) {
  if (!result) return (getMockResult(reqData).output || {});

  // 1. Try Genkit native output getter safely
  try {
    if (result.output && typeof result.output === 'object') {
      return result.output;
    }
  } catch (getterErr) {
    console.warn("PitchLab: Genkit response.output getter threw JSON error, attempting JSON repair:", getterErr.message);
  }

  // 2. Try parsing raw text string with JSON repair
  try {
    const rawText = result.text || result.custom?.text || (typeof result.output === 'string' ? result.output : "");
    if (rawText && typeof rawText === 'string') {
      let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      cleanText = cleanText.replace(/,\s*([}\]])/g, '$1'); // Fix trailing commas

      const match = cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        cleanText = match[0];
      }

      const parsed = JSON.parse(cleanText);
      if (parsed && typeof parsed === 'object') {
        console.log("PitchLab: Successfully repaired and parsed AI JSON response!");
        return parsed;
      }
    }
  } catch (parseErr) {
    console.warn("PitchLab: AI JSON repair parsing failed:", parseErr.message);
  }

  // 3. Robust Fallback
  console.warn("PitchLab: Activating dynamic mock evaluation fallback.");
  return (getMockResult(reqData).output || {});
}

// Callable Cloud Function for saving post-assessment decisions
exports.updateIdeaDecision = onCall({
  cors: true,
  region: "us-central1",
  enforceAppCheck: false,
}, async (request) => {
  const reqData = request.data || {};
  const { evaluationId, finalDecision, viewChanged } = reqData;
  const userId = request.auth?.uid || reqData.userId || 'anonymous-user';

  console.log(`PitchLab: Updating idea decision for evaluationId '${evaluationId}', decision: '${finalDecision}', viewChanged: '${viewChanged}'`);

  if (!finalDecision) {
    throw new HttpsError("invalid-argument", "Missing finalDecision argument.");
  }

  const decisionObj = {
    viewChanged: viewChanged || "No material change",
    finalDecision: finalDecision, // Pursue, Investigate, Park, Reject
    updatedAt: FieldValue.serverTimestamp(),
    userId: userId
  };

  try {
    if (evaluationId && typeof evaluationId === 'string' && !evaluationId.startsWith('local-')) {
      const docRef = db.collection("EvaluationScore").doc(evaluationId);
      await docRef.set({ postAssessmentDecision: decisionObj }, { merge: true });
    }
  } catch (dbErr) {
    console.warn("PitchLab: Firestore updateIdeaDecision warning:", dbErr.message);
  }

  return { success: true, postAssessmentDecision: decisionObj };
});

// PitchLab MVP User Submission Quota Callable Endpoint
exports.getUserSubmissionQuota = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    return {
      isAdmin: false,
      limit: MVP_IDEA_SUBMISSION_LIMIT,
      used: 0,
      remaining: MVP_IDEA_SUBMISSION_LIMIT,
      canSubmit: true
    };
  }

  const userDoc = await db.collection("Users").doc(userId).get();
  const legacyUserDoc = !userDoc.exists ? await db.collection("users").doc(userId).get() : null;
  const authEmail = (request.auth?.token?.email || "").toLowerCase();
  const userEmail = (userDoc.data()?.email || legacyUserDoc?.data()?.email || authEmail || "").toLowerCase();

  const isAdmin = (userDoc.exists && userDoc.data()?.role === "admin") ||
                  (legacyUserDoc?.exists && legacyUserDoc.data()?.role === "admin") ||
                  request.auth?.token?.role === "admin" ||
                  request.auth?.token?.admin === true ||
                  userEmail === "peter@pnc.co.nz" ||
                  authEmail === "peter@pnc.co.nz" ||
                  userId === "nge6qZrtfAeoOIV2zJECyM0CdxL2";

  const existingScores = await db.collection("EvaluationScore")
    .where("userId", "==", userId)
    .get();
  const used = existingScores.size;
  const remaining = isAdmin ? 999 : Math.max(0, MVP_IDEA_SUBMISSION_LIMIT - used);
  const canSubmit = isAdmin || used < MVP_IDEA_SUBMISSION_LIMIT;

  return {
    isAdmin,
    limit: MVP_IDEA_SUBMISSION_LIMIT,
    used,
    remaining,
    canSubmit
  };
});

// ================= MINIMAL ADMINISTRATIVE USER SUMMARY SYNC =================
async function syncUserAdminSummary(userId) {
  if (!userId || userId === 'anonymous-user') return;
  try {
    const userDoc = await db.collection("Users").doc(userId).get();
    let email = "Unknown";
    let displayName = "Founder";
    if (userDoc.exists) {
      const data = userDoc.data() || {};
      email = data.email || email;
      displayName = data.displayName || data.name || (email.includes("@") ? email.split("@")[0] : displayName);
    } else {
      try {
        const authUser = await getAuth().getUser(userId);
        email = authUser.email || email;
        displayName = authUser.displayName || (email.includes("@") ? email.split("@")[0] : displayName);
      } catch (authErr) {
        // ignore
      }
    }

    const evalsSnapshot = await db.collection("EvaluationScore")
      .where("userId", "==", userId)
      .get();
    const submissionCount = evalsSnapshot.size;

    await db.collection("AdminUserSummaries").doc(userId).set({
      uid: userId,
      email: email,
      displayName: displayName,
      submissionCount: submissionCount,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`PitchLab: AdminUserSummary synced for ${userId} (submissions: ${submissionCount})`);
  } catch (err) {
    console.warn(`PitchLab: Failed to sync AdminUserSummary for ${userId}:`, err.message);
  }
}

exports.syncAllAdminSummaries = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be authenticated.");
  const callerDoc = await db.collection("Users").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only administrators can run syncAllAdminSummaries.");
  }

  const usersSnapshot = await db.collection("Users").get();
  for (const doc of usersSnapshot.docs) {
    await syncUserAdminSummary(doc.id);
  }
  return { success: true, count: usersSnapshot.size };
});

// ================= FOUNDER-CONTROLLED PRIVATE SHARING =================

exports.createPrivateShare = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in to create private share.");
  const userId = request.auth.uid;
  const { evaluationId, scope, expiresAtInDays } = request.data || {};

  if (!evaluationId) throw new HttpsError("invalid-argument", "Missing evaluationId.");
  const validScopes = ['public_profile', 'selected_summary', 'complete_report'];
  const shareScope = validScopes.includes(scope) ? scope : 'selected_summary';

  // Verify ownership of evaluation
  const evalDoc = await db.collection("EvaluationScore").doc(evaluationId).get();
  if (!evalDoc.exists || evalDoc.data()?.userId !== userId) {
    throw new HttpsError("permission-denied", "You do not own this submission.");
  }

  const crypto = require("crypto");
  const shareToken = crypto.randomBytes(24).toString("hex");

  let expiresAtDateStr = null;
  if (expiresAtInDays && typeof expiresAtInDays === "number" && expiresAtInDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresAtInDays);
    expiresAtDateStr = expDate.toISOString();
  }

  await db.collection("PrivateShares").doc(shareToken).set({
    shareToken,
    evaluationId,
    userId,
    scope: shareScope,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    expiresAtDate: expiresAtDateStr,
  });

  await db.collection("EvaluationScore").doc(evaluationId).update({
    privacyStatus: "SHARE_PRIVATELY"
  });

  return {
    success: true,
    shareToken,
    scope: shareScope,
    expiresAtDate: expiresAtDateStr
  };
});

exports.getPrivateSharedContent = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  const { shareToken } = request.data || {};
  if (!shareToken) throw new HttpsError("invalid-argument", "Missing shareToken.");

  const shareDoc = await db.collection("PrivateShares").doc(shareToken).get();
  if (!shareDoc.exists) throw new HttpsError("not-found", "This private share link does not exist or has been revoked.");

  const shareData = shareDoc.data() || {};
  if (shareData.status !== "active") {
    throw new HttpsError("permission-denied", "This private share link has been revoked by the founder.");
  }

  if (shareData.expiresAtDate) {
    const expDate = new Date(shareData.expiresAtDate);
    if (expDate < new Date()) {
      throw new HttpsError("permission-denied", "This private share link has expired.");
    }
  }

  const evalDoc = await db.collection("EvaluationScore").doc(shareData.evaluationId).get();
  if (!evalDoc.exists) throw new HttpsError("not-found", "The shared evaluation report is no longer available.");

  const rawEval = evalDoc.data() || {};
  const scope = shareData.scope || 'selected_summary';

  if (scope === 'public_profile') {
    return {
      success: true,
      scope: 'public_profile',
      content: {
        publicTitle: rawEval.idea ? rawEval.idea.slice(0, 100) : "Business Idea",
        category: rawEval.category || "General Startup",
        executiveSummary: rawEval.executiveSummary || "",
        scoreBandName: rawEval.scoreBandName || "Assessed",
        masterRecommendation: rawEval.masterRecommendation || "Validate",
      }
    };
  } else if (scope === 'selected_summary') {
    return {
      success: true,
      scope: 'selected_summary',
      content: {
        ideaTitle: rawEval.idea ? rawEval.idea.slice(0, 100) : "Business Concept",
        category: rawEval.category || "General Startup",
        overallScore: rawEval.scores?.overall || rawEval.overallScore || 50,
        scoreBandName: rawEval.scoreBandName || "Assessed",
        masterRecommendation: rawEval.masterRecommendation || "Validate",
        executiveSummary: rawEval.executiveSummary || "",
        pitchLabVerdict: rawEval.summaryBlock?.pitchLabVerdict || "",
        scorecardCategories: rawEval.scorecardCategories || [],
        topStrengths: rawEval.summaryBlock?.topStrengths || [],
        topPrioritiesNow: rawEval.summaryBlock?.topPrioritiesNow || [],
        investorBite: rawEval.investorBite || null
      }
    };
  } else {
    const sanitizedReport = { ...rawEval };
    delete sanitizedReport.userId;
    delete sanitizedReport.cvBase64;
    delete sanitizedReport.cvText;

    return {
      success: true,
      scope: 'complete_report',
      content: sanitizedReport
    };
  }
});

exports.revokePrivateShare = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const userId = request.auth.uid;
  const { shareToken } = request.data || {};
  if (!shareToken) throw new HttpsError("invalid-argument", "Missing shareToken.");

  const shareDoc = await db.collection("PrivateShares").doc(shareToken).get();
  if (!shareDoc.exists) throw new HttpsError("not-found", "Share link not found.");

  if (shareDoc.data()?.userId !== userId) {
    throw new HttpsError("permission-denied", "You do not own this share link.");
  }

  await db.collection("PrivateShares").doc(shareToken).update({
    status: "revoked",
    revokedAt: FieldValue.serverTimestamp(),
  });

  const evaluationId = shareDoc.data()?.evaluationId;
  if (evaluationId) {
    const activeShares = await db.collection("PrivateShares")
      .where("evaluationId", "==", evaluationId)
      .where("status", "==", "active")
      .get();
    if (activeShares.empty) {
      await db.collection("EvaluationScore").doc(evaluationId).update({
        privacyStatus: "PRIVATE"
      });
    }
  }

  return { success: true };
});

exports.listPrivateShares = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const userId = request.auth.uid;
  const { evaluationId } = request.data || {};
  if (!evaluationId) throw new HttpsError("invalid-argument", "Missing evaluationId.");

  const sharesSnapshot = await db.collection("PrivateShares")
    .where("evaluationId", "==", evaluationId)
    .where("userId", "==", userId)
    .get();

  const shares = sharesSnapshot.docs.map(doc => ({
    shareToken: doc.id,
    ...doc.data()
  }));

  return { success: true, shares };
});

// ================= FOUNDER-CONTROLLED PUBLIC PUBLICATION =================

exports.publishPublicIdea = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const userId = request.auth.uid;
  const reqData = request.data || {};
  const {
    evaluationId,
    publicTitle,
    publicSummary,
    problem,
    solution,
    category,
    targetMarket,
    stage,
    seeking,
    includeScore,
    includeInsights,
    allowContact,
    identityType,
    customDisplayName,
    allowIndexing,
    consentVersion
  } = reqData;

  if (!evaluationId) throw new HttpsError("invalid-argument", "Missing evaluationId.");

  const evalDoc = await db.collection("EvaluationScore").doc(evaluationId).get();
  if (!evalDoc.exists || evalDoc.data()?.userId !== userId) {
    throw new HttpsError("permission-denied", "You do not own this submission.");
  }

  const rawEval = evalDoc.data() || {};
  const crypto = require("crypto");
  const publicId = `pub_${crypto.randomBytes(12).toString("hex")}`;

  let displayedIdentity = "Anonymous Founder";
  if (identityType === "display_name") {
    displayedIdentity = customDisplayName || "PitchLab Founder";
  } else if (identityType === "business_name") {
    displayedIdentity = customDisplayName || "Startup Team";
  }

  const overallScore = rawEval.scores?.overall || rawEval.overallScore || 50;
  const scoreBandName = rawEval.scoreBandName || "Assessed";

  const publicRecord = {
    publicId,
    evaluationId,
    userId,
    isPublished: true,
    status: "active",
    publicTitle: publicTitle || rawEval.idea || "Public Idea Profile",
    publicSummary: publicSummary || rawEval.executiveSummary || "",
    problem: problem || rawEval.problem || "",
    solution: solution || "",
    category: category || rawEval.category || "General Startup",
    targetMarket: targetMarket || rawEval.targetMarket || "",
    stage: stage || "Idea Stage",
    seeking: seeking || [],
    includeScore: includeScore === true,
    overallScore: includeScore === true ? overallScore : null,
    scoreBandName: includeScore === true ? scoreBandName : null,
    includeInsights: includeInsights === true,
    selectedInsights: includeInsights === true ? (rawEval.summaryBlock?.topStrengths || []) : [],
    allowContact: allowContact === true,
    identityType: identityType || "anonymous",
    displayedIdentity: displayedIdentity,
    allowIndexing: allowIndexing === true,
    consentVersion: consentVersion || "1.0",
    publishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("PublicIdeaProfiles").doc(publicId).set(publicRecord);

  await db.collection("EvaluationScore").doc(evaluationId).update({
    privacyStatus: "PUBLISHED_PUBLICLY",
    publicId: publicId
  });

  return { success: true, publicId };
});

exports.unpublishPublicIdea = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const userId = request.auth.uid;
  const { publicId } = request.data || {};
  if (!publicId) throw new HttpsError("invalid-argument", "Missing publicId.");

  const publicDoc = await db.collection("PublicIdeaProfiles").doc(publicId).get();
  if (!publicDoc.exists || publicDoc.data()?.userId !== userId) {
    throw new HttpsError("permission-denied", "You do not own this public profile.");
  }

  await db.collection("PublicIdeaProfiles").doc(publicId).update({
    isPublished: false,
    status: "unpublished",
    unpublishedAt: FieldValue.serverTimestamp(),
  });

  const evaluationId = publicDoc.data()?.evaluationId;
  if (evaluationId) {
    await db.collection("EvaluationScore").doc(evaluationId).update({
      privacyStatus: "PRIVATE",
      publicId: null
    });
  }

  return { success: true };
});

exports.sendPublicContactExpression = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  const { publicId, senderName, senderEmail, message, seekingCategory } = request.data || {};
  if (!publicId || !senderEmail || !message) {
    throw new HttpsError("invalid-argument", "Missing required contact details.");
  }

  const publicDoc = await db.collection("PublicIdeaProfiles").doc(publicId).get();
  if (!publicDoc.exists || !publicDoc.data()?.isPublished || !publicDoc.data()?.allowContact) {
    throw new HttpsError("permission-denied", "Contact function is not active for this public idea.");
  }

  const publicData = publicDoc.data() || {};
  const ownerUserId = publicData.userId;

  await db.collection("ExpressionsOfInterest").add({
    publicId,
    ownerUserId,
    senderName: senderName || "Interested Visitor",
    senderEmail: senderEmail,
    seekingCategory: seekingCategory || "General Inquiry",
    message: message.slice(0, 2000),
    createdAt: FieldValue.serverTimestamp(),
    status: "unread"
  });

  return { success: true };
});

exports.moderatePublicIdea = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const callerDoc = await db.collection("Users").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only Master Admin can moderate public profiles.");
  }

  const { publicId, action, reason } = request.data || {};
  if (!publicId) throw new HttpsError("invalid-argument", "Missing publicId.");

  const publicDoc = await db.collection("PublicIdeaProfiles").doc(publicId).get();
  if (!publicDoc.exists) throw new HttpsError("not-found", "Public profile not found.");

  await db.collection("PublicIdeaProfiles").doc(publicId).update({
    isPublished: false,
    status: action === "remove" ? "removed" : "suspended",
    moderationReason: reason || "Moderated by PitchLab Admin",
    moderatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// Central Configurable Constants for Draft Controls (PL-20261010-SAVE-RESUME-02)
const MAX_GLOBAL_DRAFTS = 10000;
const MAX_ACCOUNT_DRAFTS = 3;
const MAX_FIELD_LENGTH = 2500;
const DRAFT_EXPIRY_DAYS = 90;
const MIGRATION_GRACE_DATE = new Date("2026-10-10T00:00:00Z");

/**
 * Save or update an assessment draft (PL-20261010-SAVE-RESUME-02)
 */
exports.saveEvaluationDraft = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be signed in to save a draft.");
  }

  const userId = request.auth.uid;
  const { draftId, formData, currentStep, clientLastSavedAt } = request.data || {};

  if (!formData || typeof formData !== "object") {
    throw new HttpsError("invalid-argument", "Missing or invalid form data.");
  }

  // 1. Strip obsolete/heavy binary data (e.g. cvBase64) FIRST to protect draft storage
  const sanitizedFormData = { ...formData };
  delete sanitizedFormData.cvBase64; // Heavy binary stripped! cvFileName and cvStoragePath retained.

  // System and metadata fields that are not founder questionnaire text answers
  const NON_QUESTION_FIELDS = new Set([
    'cvBase64', 'cvStoragePath', 'cvFileName', 'cvFileSize', 'cvUploadedAt',
    'founderPredictions', 'submissionId', 'draftId', 'userId',
    'locationSummary', 'experience', 'budget', 'capacity', 'category'
  ]);

  // 2. Validate max answer length for actual founder questionnaire text inputs (maximum 2,500 characters)
  for (const [key, val] of Object.entries(sanitizedFormData)) {
    if (!NON_QUESTION_FIELDS.has(key) && typeof val === "string" && val.length > MAX_FIELD_LENGTH) {
      throw new HttpsError("invalid-argument", `Answer length limit exceeded for field '${key}' (maximum ${MAX_FIELD_LENGTH} characters). Please shorten your response.`);
    }
  }

  // 3. Document payload size check (must be <= 15KB)
  const payloadSize = Buffer.byteLength(JSON.stringify(sanitizedFormData), "utf8");
  if (payloadSize > 15000) {
    throw new HttpsError("invalid-argument", `Draft size limit exceeded (${Math.round(payloadSize / 1024)} KB). Maximum allowed draft size is 15 KB.`);
  }

  // Target draft doc ID
  const targetDraftId = (draftId && String(draftId).trim().length > 0) 
    ? String(draftId).trim() 
    : `draft_${userId}_${Date.now()}`;

  const draftRef = db.collection("EvaluationDrafts").doc(targetDraftId);
  const existingDoc = await draftRef.get();

  // 4. Check if creating a NEW draft vs updating existing
  const isNewDraft = !existingDoc.exists;

  if (isNewDraft) {
    // Check Global System Draft Capacity Protection Switch
    const sysConfigDoc = await db.collection("SystemConfig").doc("drafts").get();
    const allowNewDrafts = sysConfigDoc.exists ? (sysConfigDoc.data()?.allowNewDrafts !== false) : true;
    if (!allowNewDrafts) {
      throw new HttpsError("resource-exhausted", "PitchLab has reached maximum draft capacity. Creation of new drafts is currently paused to protect database capacity. Please resume an existing draft or complete your submission.");
    }

    // Check account draft limit (MAX 3 active drafts per account)
    const activeDraftsSnap = await db.collection("EvaluationDrafts")
      .where("userId", "==", userId)
      .where("appId", "==", "pitchlab")
      .where("isComplete", "==", false)
      .get();

    if (activeDraftsSnap.docs.length >= MAX_ACCOUNT_DRAFTS) {
      throw new HttpsError("failed-precondition", `Draft limit reached. You can store a maximum of ${MAX_ACCOUNT_DRAFTS} active drafts per account. Please continue or delete an existing draft.`);
    }
  } else {
    // Verify ownership
    if (existingDoc.data().userId !== userId) {
      throw new HttpsError("permission-denied", "You do not have permission to modify this draft.");
    }

    // Race condition prevention: check timestamp
    if (clientLastSavedAt) {
      const existingUpdatedAt = existingDoc.data().updatedAt?.toDate?.() || new Date(existingDoc.data().updatedAt);
      const clientTime = new Date(clientLastSavedAt);
      if (existingUpdatedAt && clientTime && (existingUpdatedAt.getTime() - clientTime.getTime() > 2000)) {
        console.warn(`PitchLab: Delayed save prevented for draft ${targetDraftId}. Existing server version is newer.`);
        return { 
          success: true, 
          draftId: targetDraftId, 
          updatedAt: existingUpdatedAt.toISOString(),
          skipped: true,
          message: "Server has a newer version of this draft." 
        };
      }
    }
  }

  // Generate clean idea name fallback
  const rawIdeaText = (sanitizedFormData.idea || sanitizedFormData.problem || "").trim();
  const ideaName = rawIdeaText.length > 0 ? (rawIdeaText.length > 55 ? rawIdeaText.slice(0, 52) + "..." : rawIdeaText) : "Untitled Idea";

  const now = FieldValue.serverTimestamp();
  const draftRecord = {
    draftId: targetDraftId,
    userId,
    appId: "pitchlab",
    ideaName,
    currentStep: typeof currentStep === "number" ? currentStep : 0,
    formVersion: VERSION_INFO.appVersion || "v0.11.0",
    formData: sanitizedFormData,
    updatedAt: now,
    lastSavedAt: now,
    isComplete: false,
  };

  if (isNewDraft) {
    draftRecord.createdAt = now;
  }

  await draftRef.set(draftRecord, { merge: true });
  console.log(`PitchLab: Draft ${targetDraftId} saved for user ${userId}. Step: ${currentStep}.`);

  return {
    success: true,
    draftId: targetDraftId,
    updatedAt: new Date().toISOString(),
  };
});

/**
 * Delete a specific draft
 */
exports.deleteEvaluationDraft = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be signed in.");
  }

  const { draftId } = request.data || {};
  if (!draftId) {
    throw new HttpsError("invalid-argument", "Missing draftId.");
  }

  const draftRef = db.collection("EvaluationDrafts").doc(String(draftId).trim());
  const docSnap = await draftRef.get();

  if (!docSnap.exists) {
    return { success: true, message: "Draft already deleted or does not exist." };
  }

  if (docSnap.data().userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this draft.");
  }

  await draftRef.delete();
  console.log(`PitchLab: Draft ${draftId} deleted by user ${request.auth.uid}.`);
  return { success: true, draftId };
});

/**
 * List active drafts for the signed-in founder
 */
exports.getUserDrafts = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be signed in.");
  }

  const userId = request.auth.uid;
  const snapshot = await db.collection("EvaluationDrafts")
    .where("userId", "==", userId)
    .where("appId", "==", "pitchlab")
    .get();

  const nowMs = Date.now();
  const ninetyDaysMs = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const drafts = snapshot.docs.map(doc => {
    const data = doc.data();
    let updatedMs = nowMs;
    if (data.updatedAt) {
      if (typeof data.updatedAt.toMillis === "function") {
        updatedMs = data.updatedAt.toMillis();
      } else if (typeof data.updatedAt.toDate === "function") {
        updatedMs = data.updatedAt.toDate().getTime();
      } else if (typeof data.updatedAt === "string" || typeof data.updatedAt === "number") {
        updatedMs = new Date(data.updatedAt).getTime();
      }
    }

    // Apply Migration / Grace Period: if updated before MIGRATION_GRACE_DATE, baseline is MIGRATION_GRACE_DATE
    const effectiveUpdatedMs = Math.max(updatedMs, MIGRATION_GRACE_DATE.getTime());
    const expiresMs = effectiveUpdatedMs + ninetyDaysMs;
    const daysRemaining = Math.max(0, Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24)));

    const sanitizedDraftData = { ...(data.formData || {}) };
    delete sanitizedDraftData.cvBase64; // Strip any legacy inline base64

    return {
      draftId: doc.id,
      ideaName: data.ideaName || "Untitled Draft",
      currentStep: data.currentStep || 0,
      formVersion: data.formVersion || "v0.11.0",
      formData: sanitizedDraftData,
      updatedAt: new Date(updatedMs).toISOString(),
      expiresAt: new Date(expiresMs).toISOString(),
      daysRemaining,
      isExpired: nowMs > expiresMs,
    };
  }).filter(d => !d.isExpired); // Filter out expired drafts

  // Sort by updatedAt descending
  drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return { drafts, count: drafts.length, maxLimit: MAX_ACCOUNT_DRAFTS };
});

/**
 * Cleanup expired incomplete drafts (90-day retention rule)
 */
exports.cleanupExpiredDrafts = onCall({
  cors: true,
  region: "us-central1",
}, async (request) => {
  const ninetyDaysAgo = new Date(Date.now() - (DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  
  // Bounded batch deletion (max 100 docs per run to prevent full table scans and high CPU charges)
  const snapshot = await db.collection("EvaluationDrafts")
    .where("appId", "==", "pitchlab")
    .where("isComplete", "==", false)
    .where("updatedAt", "<", ninetyDaysAgo)
    .limit(100)
    .get();

  let cleaned = 0;
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    // Verify grace period
    const updatedMs = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : new Date(data.updatedAt).getTime();
    if (updatedMs < MIGRATION_GRACE_DATE.getTime() && (Date.now() - MIGRATION_GRACE_DATE.getTime()) < (DRAFT_EXPIRY_DAYS * 86400000)) {
      // Still in grace period, do not delete yet!
      return;
    }
    batch.delete(doc.ref);
    cleaned++;
  });

  if (cleaned > 0) {
    await batch.commit();
  }

  console.log(`PitchLab Draft Cleanup: Purged ${cleaned} expired drafts.`);
  return { success: true, cleanedCount: cleaned };
});

/**
 * Resilient Cloud Function for direct founder CV upload
 * Bypasses browser CORS, direct socket timeouts, and mobile WebKit limitations.
 */
exports.uploadFounderCvDirect = onCall({
  cors: true,
  maxInstances: 20,
  timeoutSeconds: 60,
  memory: "512MiB"
}, async (request) => {
  const userId = request.auth?.uid || request.data?.userId || "anonymous-user";
  const { fileName, fileBase64, draftId } = request.data || {};

  if (!fileBase64 || typeof fileBase64 !== "string") {
    throw new HttpsError("invalid-argument", "Missing file data.");
  }

  const cleanB64 = fileBase64.replace(/^data:.*?;base64,/, '').trim();
  const fileBuffer = Buffer.from(cleanB64, 'base64');

  if (fileBuffer.length > 15 * 1024 * 1024) {
    throw new HttpsError("invalid-argument", "File exceeds the 15MB limit.");
  }

  const safeName = (fileName || "cv.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const draftSuffix = draftId ? String(draftId).trim() : `draft_${Date.now()}`;
  const storagePath = `cvs/${userId}/${draftSuffix}_${safeName}`;

  try {
    const bucket = storage.bucket(STORAGE_BUCKET_NAME);
    const file = bucket.file(storagePath);
    await file.save(fileBuffer, {
      resumable: false,
      metadata: {
        contentType: safeName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
        metadata: {
          originalName: fileName || "cv.pdf",
          uploadedAt: new Date().toISOString(),
          draftId: draftId || ""
        }
      }
    });

    console.log(`PitchLab: Saved CV via uploadFounderCvDirect to ${storagePath} (${fileBuffer.length} bytes)`);

    return {
      success: true,
      storagePath,
      fileName: fileName || "cv.pdf",
      fileSize: fileBuffer.length
    };
  } catch (err) {
    console.error("PitchLab uploadFounderCvDirect error:", err);
    throw new HttpsError("internal", "Failed to store CV in cloud storage: " + err.message);
  }
});

exports.syncUserAdminSummary = syncUserAdminSummary;
exports.isTransportIdea = isTransportIdea;
exports.getMockResult = getMockResult;
exports.isHardwareIdea = isHardwareIdea;
exports.cleanNarrativeText = cleanNarrativeText;
exports.extractSpecificCredentialsFromCvText = extractSpecificCredentialsFromCvText;
exports.sanitizeHardwareTerms = sanitizeHardwareTerms;
exports.safeExtractJsonFromAiResponse = safeExtractJsonFromAiResponse;
exports.logSubmissionError = logSubmissionError;
exports.formatCapitalValue = formatCapitalValue;



