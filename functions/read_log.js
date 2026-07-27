const fs = require('fs');

const logPath = 'C:\\Users\\petet\\.gemini\\antigravity\\brain\\3c2c3c60-ab04-49d7-81a5-bbaf6bd3ab26\\.system_generated\\tasks\\task-3278.log';

try {
  const data = fs.readFileSync(logPath, { encoding: 'utf8', flag: 'r' });
  const lines = data.split('\n');
  console.log("=== LAST 50 LINES OF EMULATOR LOG ===");
  console.log(lines.slice(-50).join('\n'));
} catch (e) {
  console.error("Error reading log:", e.message);
}
