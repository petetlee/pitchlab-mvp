const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'frontend', 'build', 'web', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const cacheBuster = `PL-20261009-03_${Date.now()}`;
  html = html.replace(/src="flutter_bootstrap\.js[^"]*"/, `src="flutter_bootstrap.js?v=${cacheBuster}"`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`Successfully updated index.html with cache buster v=${cacheBuster}`);
} else {
  console.error('frontend/build/web/index.html not found');
}
