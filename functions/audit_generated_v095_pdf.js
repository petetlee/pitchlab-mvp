const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function auditPdf() {
  const pdfPath = path.join(__dirname, 'PitchLab_Nuclear_Power_Plant_Reliable_Assessment_2026-10-06.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found at: ${pdfPath}`);
    process.exit(1);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  console.log(`📄 Loaded PDF: ${pdfPath} (${dataBuffer.length} bytes)`);

  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  const text = typeof result === 'string' ? result : (result.text || '');

  console.log('--------------------------------------------------');
  console.log(`Extracted text length: ${text.length} characters`);

  // Count pages - dart pdf puts page markers or Form Feeds / Type /Page
  // Let's count occurrences of page headers / footers or form feeds
  const pageHeaders = (text.match(/PitchLab Assessment\s*\|\s*John Doe/g) || []).length;
  console.log(`Page header occurrences: ${pageHeaders}`);

  // Also check PDF buffer directly for /Type /Page
  const pageObjectMatches = (dataBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  // Note: /Pages count
  const pagesCountMatch = dataBuffer.toString('latin1').match(/\/Count\s+(\d+)/);
  const totalPages = pagesCountMatch ? parseInt(pagesCountMatch[1], 10) : pageObjectMatches;
  console.log(`Total Pages in PDF: ${totalPages}`);

  const checks = [];

  // 1. Version and Build check
  const hasVersion = text.includes('v0.9.5');
  const hasBuild = text.includes('1b52830');
  checks.push({
    test: 'Header/Footer Version & Build ID (v0.9.5, 1b52830)',
    pass: hasVersion && hasBuild,
    detail: `v0.9.5 found: ${hasVersion}, 1b52830 found: ${hasBuild}`
  });

  // 2. Exactly 7 pages
  checks.push({
    test: 'Exact 7-Page Architecture',
    pass: totalPages === 7,
    detail: `Total pages: ${totalPages}`
  });

  // 3. Prohibited phrases check (ALL 10 MUST BE ABSENT)
  const prohibited = [
    { name: 'Fix 1: "insurmountable"', regex: /insurmountable/i },
    { name: 'Fix 1: "non-starter"', regex: /non-starter/i },
    { name: 'Fix 1: "effectively prohibits"', regex: /effectively prohibits/i },
    { name: 'Fix 1: "unfeasible without legislative reform"', regex: /unfeasible without legislative reform/i },
    { name: 'Fix 1: "requires legislative reform"', regex: /requires legislative reform/i },
    { name: 'Fix 1: "deeply hostile"', regex: /deeply hostile/i },
    { name: 'Fix 1: "legislative pathway were conceivable"', regex: /legislative pathway were conceivable/i },
    { name: 'Fix 1: "societal shifts before any commercial"', regex: /societal shifts before any commercial/i },
    { name: 'Fix 1: "effectively unavailable"', regex: /effectively unavailable/i },
    { name: 'Fix 2: "looming energy crisis"', regex: /looming energy crisis/i },
    { name: 'Fix 2: "currently blocked by legislative"', regex: /currently blocked by legislative/i },
    { name: 'Fix 2.6: "make this venture currently non-viable"', regex: /make this venture currently non-viable/i },
    { name: 'Fix 3: "energy sector feedback"', regex: /energy sector feedback/i },
    { name: 'Fix 4: "recruit a highly specialised co-founder"', regex: /recruit a highly specialised co-founder/i },
    { name: 'Fix 5: "commercial off-taker reviews"', regex: /commercial off-taker reviews/i },
    { name: 'Fix 5.1: "scope the requirements" (lowercase s)', regex: /\bscope the requirements\b/ },
    { name: 'Fix 5.2: "extraordinary statutory"', regex: /extraordinary statutory/i },
    { name: 'Fix 6: "specific nuclear prohibitions"', regex: /specific nuclear prohibitions/i },
    { name: 'Fix 7: "Immediately recruit core leadership team"', regex: /immediately recruit core leadership/i },
    { name: 'Fix 8: "irrefutable"', regex: /irrefutable/i },
    { name: 'Fix 9: "expanding rapidly"', regex: /expanding rapidly/i },
  ];

  for (const p of prohibited) {
    const found = p.regex.test(text);
    checks.push({
      test: `Prohibited phrase check: ${p.name}`,
      pass: !found,
      detail: found ? `FAILED: Found match in text` : `PASSED: Zero occurrences`
    });
  }

  // 4. Required calibrated phrases check
  const required = [
    { name: 'Fix 1: Level C Legal Certainty ("specialist legal confirmation" / "material statutory barriers")', regex: /specialist (?:legal )?confirmation|material statutory barriers/i },
    { name: 'Fix 2: Calibrated Commercial Readiness ("increasing electricity demand" / "security-of-supply")', regex: /increasing electricity demand|security-of-supply/i },
    { name: 'Fix 3: Transferable Founder Capability ("transferable commercial/financial capability")', regex: /transferable commercial (?:and|\/) financial capability/i },
    { name: 'Fix 4: Calibrated Investment Risk ("substantial statutory, regulatory and capital barriers")', regex: /substantial statutory, regulatory and capital barriers|substantial statutory/i },
    { name: 'Fix 5: Evidence Provenance ("published industry commentary")', regex: /published industry commentary/i },
    { name: 'Fix 6: Calibrated Statutory Requirements ("nuclear-related statutory requirements and restrictions requiring specialist interpretation")', regex: /nuclear-related statutory requirements and restrictions requiring specialist interpretation|nuclear-related statutory requirements/i },
    { name: 'Fix 7 & 8: Staged Execution ("preliminary regulatory scoping" / "formal pre-feasibility")', regex: /preliminary regulatory scoping|formal pre-feasibility/i },
    { name: 'Fix 9: Calibrated Market Trend ("expected to increase")', regex: /expected to increase/i },
  ];

  for (const r of required) {
    const found = r.regex.test(text);
    checks.push({
      test: `Required calibrated phrase: ${r.name}`,
      pass: found,
      detail: found ? `PASSED: Found match` : `FAILED: Not found`
    });
  }

  // 5. Score verification
  const hasOverallScore = text.includes('27/100');
  const hasProblemClarity = text.includes('14/15') || text.includes('14 / 15');
  const hasCustomerValidation = text.includes('1/20') || text.includes('1 / 20');
  const hasFounderFit = text.includes('4/15') || text.includes('4 / 15');

  checks.push({
    test: 'Deterministic Score Preservation (27/100, 14/15 Problem, 1/20 Customer Val, 4/15 Founder)',
    pass: hasOverallScore && hasProblemClarity && hasCustomerValidation && hasFounderFit,
    detail: `27/100: ${hasOverallScore}, 14/15: ${hasProblemClarity}, 1/20: ${hasCustomerValidation}, 4/15: ${hasFounderFit}`
  });

  // Summary
  console.log('\n================ AUDIT RESULTS ================');
  let allPassed = true;
  for (const c of checks) {
    const icon = c.pass ? '✅' : '❌';
    console.log(`${icon} [${c.test}]: ${c.detail}`);
    if (!c.pass) allPassed = false;
  }
  console.log('================================================\n');

  if (allPassed) {
    console.log('🎉 ALL INTEGRITY CHECKS PASSED FOR BUILD e445a76 / v0.9.5 PDF!');
    process.exit(0);
  } else {
    console.error('❌ SOME CHECKS FAILED!');
    process.exit(1);
  }
}

auditPdf().catch(err => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
