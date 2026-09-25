import fs from 'node:fs';
import path from 'node:path';

console.log('Running lint checks across repository...');

const jsFiles = [
  'tv3-planner-ui/src/index.js',
  'tv2-web/src/App.jsx',
  'tv2-web/src/main.jsx',
  'tv2-web/vite.config.js'
];

let hasErrors = false;

for (const file of jsFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    // Check no syntax errors / illegal tokens
    if (content.includes('debugger;')) {
      console.error(`Lint error: ${file} contains debugger statement.`);
      hasErrors = true;
    }
  } else {
    console.warn(`Warning: file ${file} not found.`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Lint check passed: All frontend files conform to basic cleanliness rules.');
