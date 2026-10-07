const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function auditMoorSafePdf() {
  const pdfPath = path.join(__dirname, 'PitchLab_MoorSafe_Premium_Solar_Powered_Assessment_2026-10-06.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    process.exit(1);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  const text = typeof result === 'string' ? result : (result.text || '');

  console.log("==========================================================================");
  console.log("📑 AUDITING GENERATED MOORSAFE PDF CONTENT");
  console.log(`Text Length: ${text.length}`);
  console.log("==========================================================================");

  let errors = 0;
  function check(label, condition, detail = "") {
    if (condition) {
      console.log(`✅ PASS: ${label}`);
    } else {
      console.error(`❌ FAIL: ${label} ${detail ? '(' + detail + ')' : ''}`);
      errors++;
    }
  }

  // 1. Raw variable leakage
  check("1. No $riskCapital leakage", !text.includes("$riskCapital"));
  check("1b. No ${...} or {{...}} template leakage", !/\$\{|\{\{/.test(text));
  check("1c. No undefined or [object Object]", !text.includes("undefined") && !text.includes("[object Object]"));

  // 2. Broken currency (,500)
  check("2. No broken currency (,500)", !/(^|[\s"–\-])\,500/.test(text));

  // 3. Undeclared stage / recommendation conflict
  check("3. No 'Almost Ready' undeclared stage", !text.includes("Almost Ready"));
  check("3b. Master recommendation is 'INVESTIGATE'", text.includes("INVESTIGATE"));
  check("3c. Score band is 'Emerging Opportunity'", text.includes("Emerging Opportunity"));

  // 4. Business model grounding
  check("4. Preserved pest/rodent problem", text.toLowerCase().includes("pest") || text.toLowerCase().includes("rodent"));
  check("4b. No 'vessel collision' or 'mooring line failures' in Problem Snapshot", 
    !text.toLowerCase().includes("vessel collision damage risk") && 
    !text.toLowerCase().includes("mooring line failures, vessel collision")
  );

  // 5. Software / SaaS contamination in hardware
  check("5. No 'software or operational leverage'", !text.toLowerCase().includes("software or operational leverage"));
  check("5b. No 'before writing code'", !text.toLowerCase().includes("before writing code"));
  check("5c. No 'investing in software development'", !text.toLowerCase().includes("investing in software development"));

  // 6. CV extraction filtering
  check("6. Excludes 'private pilot' / 'pilot license' hobby", !text.toLowerCase().includes("private pilot") && !text.toLowerCase().includes("pilot license"));
  check("6b. Excludes 'motorcyclist' hobby", !text.toLowerCase().includes("motorcycl"));
  check("6c. Excludes 'wind surfing' hobby", !text.toLowerCase().includes("wind surf"));

  // 7. Unsupported absolute claims
  check("7. No 'no effective, automated solution currently on the market'", 
    !text.toLowerCase().includes("no effective, automated solution currently on the market") &&
    !text.toLowerCase().includes("no effective automated solution currently on the market")
  );
  check("7b. No 'clear, willing-to-pay market segment'", 
    !text.toLowerCase().includes("clear, willing-to-pay market segment") &&
    !text.toLowerCase().includes("clear willing-to-pay market segment")
  );

  // 8. Adjacent opportunity hallucination
  check("8. No 'Automated compliance reporting module'", !text.toLowerCase().includes("compliance reporting module"));

  // 9. Version string
  check("9. Contains v0.9.6 version marker", text.includes("v0.9.6"));

  console.log("==========================================================================");
  if (errors === 0) {
    console.log("🎉 ALL PDF AUDIT CHECKS PASSED PERFECTLY (0 FAILURES)!");
    process.exit(0);
  } else {
    console.error(`💥 PDF AUDIT FAILED WITH ${errors} ERRORS.`);
    process.exit(1);
  }
}

auditMoorSafePdf().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
