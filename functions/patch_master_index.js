const fs = require('fs');
const path = require('path');

const indexJsPath = path.join(__dirname, 'index.js');
const templatePath = path.join(__dirname, 'master_template.json');

const masterTemplateStr = fs.readFileSync(templatePath, 'utf8');

// Read current index.js
let indexJs = fs.readFileSync(indexJsPath, 'utf8');

// Make sure scoring_logic import has reconcileScores
indexJs = indexJs.replace(
  /const\s*\{\s*calculateFRI,\s*calculateOverallScore\s*\}\s*=\s*require\(["']\.\/scoring_logic["']\);/,
  'const { calculateFRI, calculateOverallScore, reconcileScores } = require("./scoring_logic");'
);

const promptHeader = `
      Evaluate the business idea objectively using the PitchLab Founder Commercial Assessment Framework.
      
      CRITICAL SCORING & INTEGRITY RULES:
      1. Score each of the 7 commercial categories:
         - problemCustomerClarity (max 15)
         - founderCapabilityFit (max 15)
         - customerValidation (max 20)
         - marketCommercialOpportunity (max 15)
         - businessModelWillingnessToPay (max 15)
         - competitivePosition (max 10)
         - executionReadiness (max 10)
         Total Maximum Score = 100.
      2. NEVER use raw "N/A" anywhere in the JSON output. Use clear explanatory phrases like "Not enough evidence yet", "Not yet tested", or "To be established during validation".
      3. NEVER output fabricated percentiles (e.g. "92nd percentile") or fake statistical probabilities. Use qualitative assessments ("Emerging", "Credible", "Strong", "Exceptional").
      4. Early-stage lack of customer validation must be framed constructively as "An important assumption that remains untested", NOT "A bad business idea".
      5. Provide exactly THREE priority actions in threePriorityActions.
      6. Provide a personalized 150-250 word executive summary.

      EXPECTED JSON STRUCTURE:
      You MUST return ONLY a JSON object that matches the following structure exactly (with appropriate values filled in). Do not include any other root keys.
`;

const indentedTemplate = masterTemplateStr.split('\n').map(line => '      ' + line).join('\n');

const startMarker = 'EXPECTED JSON STRUCTURE:';
const endMarker = '\n    `;\n\n    // 7. Build the evaluation schema.';

const startIndex = indexJs.indexOf(startMarker);
const endIndex = indexJs.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  // Find where evaluationPrompt starts
  const promptStartIdx = indexJs.lastIndexOf('const evaluationPrompt = `', startIndex);
  if (promptStartIdx !== -1) {
    const beforePrompt = indexJs.substring(0, promptStartIdx + 'const evaluationPrompt = `'.length);
    const afterPrompt = indexJs.substring(endIndex);
    indexJs = beforePrompt + promptHeader + indentedTemplate + afterPrompt;
  }
} else {
  console.warn("Could not find standard prompt markers, attempting fallback injection.");
}

// Ensure post-processing calls reconcileScores
const postProcessMarker = 'PitchLab: Genkit AI raw output received in';
if (indexJs.includes(postProcessMarker) && !indexJs.includes('reconcileScores(')) {
  indexJs = indexJs.replace(
    /const parsedResult = typeof rawOutput === 'string' \? JSON\.parse\(rawOutput\) : rawOutput;/,
    `let parsedResult = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    
    // Apply Master Prompt 7-Category Score Reconciliation & Band Mapping
    if (parsedResult && parsedResult.scorecard) {
      const rec = reconcileScores(parsedResult.scorecard);
      parsedResult.summaryBlock = parsedResult.summaryBlock || {};
      parsedResult.summaryBlock.overallScore = rec.overallScore;
      parsedResult.summaryBlock.scoreBand = rec.scoreBand;
      parsedResult.scorecard = rec.categoryScores;
      parsedResult.scores = { overall: rec.overallScore };
    }`
  );
}

fs.writeFileSync(indexJsPath, indexJs, 'utf8');
console.log("Successfully updated index.js with Master Prompt Schema & Score Reconciliation!");
