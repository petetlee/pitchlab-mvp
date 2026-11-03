const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { reconcileScores, validateReportIntegrityGate } = require('./scoring_logic');

try {
  initializeApp({
    projectId: 'antigravity-pitchlab'
  });
} catch (e) {
  // Already initialized
}

const db = getFirestore();

async function runRepair() {
  console.log("=== PITCHLAB PRODUCTION FIRESTORE REPAIR: PL-FIX-20261103-01 ===");

  // 1. Check Nuclear Power NZ EvaluationScore/FsNbqXLh94CuQxouJYkM
  const nucRef = db.collection('EvaluationScore').doc('FsNbqXLh94CuQxouJYkM');
  const nucDoc = await nucRef.get();
  if (!nucDoc.exists) {
    console.log("Nuclear doc FsNbqXLh94CuQxouJYkM not found directly by ID. Searching by idea...");
    const nucSnap = await db.collection('EvaluationScore').where('idea', '>=', 'Nuclear').limit(5).get();
    nucSnap.forEach(d => console.log(`Found candidate nuclear score: ${d.id} => ${d.data().idea}`));
  } else {
    console.log(`Found Nuclear evaluation doc: ${nucDoc.id}`);
    const nucData = nucDoc.data();
    console.log(`Current masterRecommendation: ${nucData.masterRecommendation}`);
    console.log(`Current portfolioDecision: ${nucData.portfolioMeta?.portfolioDecision || nucData.portfolioDecision}`);
    
    // Backup current document to EvaluationScoreHistory
    await db.collection('EvaluationScoreHistory').doc(`${nucDoc.id}_pre_fix_20261103`).set({
      originalId: nucDoc.id,
      archivedAt: new Date().toISOString(),
      fixReference: 'PL-FIX-20261103-01',
      data: nucData
    });
    console.log(`✅ Archived Nuclear doc to EvaluationScoreHistory/${nucDoc.id}_pre_fix_20261103`);

    // Patch Nuclear document to ensure unified master decision PARK
    const updatedNucData = {
      ...nucData,
      appVersion: 'v0.12.5',
      fullVersionString: 'PitchLab MVP v0.12.5',
      buildId: 'sr20261103a',
      changeId: 'PL-FIX-20261103-01',
      masterRecommendation: 'PARK',
      portfolioDecision: 'PARK',
      portfolioMeta: {
        ...(nucData.portfolioMeta || {}),
        masterRecommendation: 'PARK',
        portfolioDecision: 'PARK',
        decisionState: 'PARK',
        problemStatus: 'Worth Preserving',
        solutionStatus: 'No Established Regulatory Pathway — Parked in Current Formulation',
        conditionalActivityStatus: 'Conditional Phase 1 Only — Low-Cost Statutory & Regulatory Verification ($0–$500 NZD, 0–5 hrs/wk)',
        portfolioAction: 'Preserve the underlying energy-security problem while parking commercial SMR execution pending specialist statutory/regulatory clarification, policy reform, or alternative clean-firm generation structures.'
      },
      adviserOpinion: {
        ...(nucData.adviserOpinion || {}),
        masterRecommendation: 'PARK',
        portfolioDecision: 'PARK',
        opinionNarrative: 'Preserve the underlying energy-security problem and monitor alternative solutions, jurisdictions and relevant statutory/regulatory changes; do not proceed with commercial SMR execution unless Stage Gate 1 statutory and regulatory feasibility criteria are met.'
      },
      summaryBlock: {
        ...(nucData.summaryBlock || {}),
        decisionStatus: 'PARK'
      },
      investorBite: {
        ...(nucData.investorBite || {}),
        pitchLabRecommendation: 'PARK'
      },
      finalRecommendation: {
        ...(nucData.finalRecommendation || {}),
        recommendation: 'PARK'
      }
    };

    await nucRef.set(updatedNucData, { merge: true });
    console.log(`✅ Repaired Nuclear evaluation doc ${nucDoc.id} with unified decision PARK and v0.12.5 release metadata.`);
  }

  // 2. Check MoorSafe in EvaluationScore
  console.log("\nSearching for MoorSafe in EvaluationScore...");
  const moorSnap = await db.collection('EvaluationScore').get();
  let foundMoor = false;
  for (const doc of moorSnap.docs) {
    const d = doc.data();
    const txt = (d.idea || "" + " " + (d.businessName || "")).toLowerCase();
    if (txt.includes('moorsafe') || txt.includes('marine pest deterrent')) {
      foundMoor = true;
      console.log(`Found MoorSafe score doc: ${doc.id}`);
      
      // Archive
      await db.collection('EvaluationScoreHistory').doc(`${doc.id}_pre_fix_20261103`).set({
        originalId: doc.id,
        archivedAt: new Date().toISOString(),
        fixReference: 'PL-FIX-20261103-01',
        data: d
      });
      console.log(`✅ Archived MoorSafe doc to EvaluationScoreHistory/${doc.id}_pre_fix_20261103`);

      // Update to INVESTIGATE, clean phrases
      const updatedMoorData = {
        ...d,
        appVersion: 'v0.12.5',
        fullVersionString: 'PitchLab MVP v0.12.5',
        buildId: 'sr20261103a',
        changeId: 'PL-FIX-20261103-01',
        masterRecommendation: 'INVESTIGATE',
        portfolioDecision: 'INVESTIGATE',
        portfolioMeta: {
          ...(d.portfolioMeta || {}),
          masterRecommendation: 'INVESTIGATE',
          portfolioDecision: 'INVESTIGATE',
          decisionState: 'INVESTIGATE',
          problemStatus: 'Worth Investigating',
          solutionStatus: 'Under Stage-Gated Validation',
          portfolioAction: 'Conduct structured customer discovery interviews and initial evidence gathering.'
        },
        adviserOpinion: {
          ...(d.adviserOpinion || {}),
          masterRecommendation: 'INVESTIGATE',
          portfolioDecision: 'INVESTIGATE'
        },
        summaryBlock: {
          ...(d.summaryBlock || {}),
          decisionStatus: 'INVESTIGATE'
        },
        investorBite: {
          ...(d.investorBite || {}),
          pitchLabRecommendation: 'INVESTIGATE'
        },
        finalRecommendation: {
          ...(d.finalRecommendation || {}),
          recommendation: 'INVESTIGATE'
        }
      };

      await doc.ref.set(updatedMoorData, { merge: true });
      console.log(`✅ Repaired MoorSafe evaluation doc ${doc.id} with unified decision INVESTIGATE and v0.12.5 release metadata.`);
    }
  }

  if (!foundMoor) {
    console.log("No completed MoorSafe EvaluationScore found. Checking SubmissionProgress/1793661760232_5500...");
    const subRef = db.collection('SubmissionProgress').doc('1793661760232_5500');
    const subDoc = await subRef.get();
    if (subDoc.exists) {
      console.log(`Found MoorSafe SubmissionProgress: ${subDoc.id}, status: ${subDoc.data().status}`);
    }
  }

  console.log("\n=== FIRESTORE REPAIR COMPLETE ===");
}

runRepair()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Repair error:", err);
    process.exit(1);
  });
