const fs = require('fs');

const indexJsPath = 'index.js';
const templatePath = 'generated_template.json';

let indexContent = fs.readFileSync(indexJsPath, 'utf8');
const templateContent = fs.readFileSync(templatePath, 'utf8');

const startMarker = "EXPECTED JSON STRUCTURE:\n      You MUST return ONLY a JSON object that matches the following structure exactly (with appropriate values filled in). Do not include any other root keys.\n";
const endMarker = "\n    `;\n\n    // 7. Build the evaluation schema.";

const startIndex = indexContent.indexOf(startMarker);
const endIndex = indexContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const before = indexContent.substring(0, startIndex + startMarker.length);
  const after = indexContent.substring(endIndex);
  
  // Format the template with proper indentation for the template literal
  const indentedTemplate = templateContent.split('\n').map(line => '      ' + line).join('\n');
  
  fs.writeFileSync(indexJsPath, before + indentedTemplate + after);
  console.log("Successfully patched index.js with the full JSON template!");
} else {
  console.log("Could not find markers in index.js");
}
