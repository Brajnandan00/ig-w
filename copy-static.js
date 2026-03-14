const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying static assets to standalone directory...');
copyDir(path.join(__dirname, '.next/static'), path.join(__dirname, '.next/standalone/.next/static'));
if (fs.existsSync(path.join(__dirname, 'public'))) {
  copyDir(path.join(__dirname, 'public'), path.join(__dirname, '.next/standalone/public'));
}
console.log('Done.');
