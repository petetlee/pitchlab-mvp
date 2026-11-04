const fs = require('fs');
const path = require('path');

console.log("===============================================================");
console.log("🚀 PITCHLAB MVP — DEPLOYMENT VERSION CONTROL HEALTH CHECK");
console.log("===============================================================");

// 1. Read Backend Version Config
const backendConfigPath = path.join(__dirname, 'version_config.json');
if (!fs.existsSync(backendConfigPath)) {
  console.error("❌ FAIL: version_config.json not found in functions/");
  process.exit(1);
}

const backendConfig = JSON.parse(fs.readFileSync(backendConfigPath, 'utf8'));

// 2. Read Frontend Version Config
const frontendConfigPath = path.join(__dirname, '..', 'frontend', 'lib', 'config', 'version_config.dart');
if (!fs.existsSync(frontendConfigPath)) {
  console.error("❌ FAIL: version_config.dart not found in frontend/lib/config/");
  process.exit(1);
}

const frontendContent = fs.readFileSync(frontendConfigPath, 'utf8');

// Extract values from Dart file
const feVersionMatch = frontendContent.match(/appVersion\s*=\s*'([^']+)'/);
const feBuildMatch = frontendContent.match(/buildId\s*=\s*'([^']+)'/);

const feVersion = feVersionMatch ? feVersionMatch[1] : 'UNKNOWN';
const feBuild = feBuildMatch ? feBuildMatch[1] : 'UNKNOWN';

// 3. Inspect PDF Service Footer Renderer
const pdfServicePath = path.join(__dirname, '..', 'frontend', 'lib', 'pdf_service.dart');
const pdfServiceContent = fs.readFileSync(pdfServicePath, 'utf8');
const pdfHasVersionFooter = pdfServiceContent.includes('PitchLab MVP \${res.appVersion} | Build \${res.buildId}') || pdfServiceContent.includes('PitchLab MVP \${res.appVersion} • Build \${res.buildId}');

// 4. Verify Version Consistency Across Stack
const versionMatch = (backendConfig.appVersion === feVersion) && (backendConfig.buildId === feBuild) && pdfHasVersionFooter;

console.log(`PITCHLAB VERSION:   ${backendConfig.fullVersionString}`);
console.log(`BUILD ID:           ${backendConfig.buildId}`);
console.log(`DEPLOYED:           ${backendConfig.deployedAtFormatted}`);
console.log(`WEB VERSION:        PitchLab MVP ${feVersion} (Build ${feBuild})`);
console.log(`ASSESSMENT ENGINE:  ${backendConfig.fullVersionString} (Build ${backendConfig.buildId})`);
console.log(`PDF ENGINE VERSION: PitchLab MVP ${backendConfig.appVersion} (Build ${backendConfig.buildId}) [Footer Active: ${pdfHasVersionFooter}]`);
console.log(`VERSION MATCH:      ${versionMatch ? 'YES' : 'NO'}`);

if (versionMatch) {
  console.log("\n===============================================================");
  console.log("✅ DEPLOYMENT VERIFIED: Web, Engine, & PDF Version Metadata Match 100%");
  console.log("===============================================================");
  process.exit(0);
} else {
  console.error("\n===============================================================");
  console.error("❌ VERSION MISMATCH — DEPLOYMENT INCOMPLETE!");
  console.error("===============================================================");
  process.exit(1);
}
