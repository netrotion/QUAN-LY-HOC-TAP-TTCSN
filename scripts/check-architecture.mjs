import fs from 'node:fs';
import path from 'node:path';

console.log('--- Checking Architecture Boundaries & Cyclic Dependencies ---');

let hasViolations = false;

// 1. Kiểm tra Frontend: tv3-planner-ui KHÔNG được import từ tv2-web
const tv3SrcDir = path.resolve('tv3-planner-ui/src');
if (fs.existsSync(tv3SrcDir)) {
  const files = fs.readdirSync(tv3SrcDir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(tv3SrcDir, file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('@haui/web') || content.includes('../../tv2-web') || content.includes('../tv2-web')) {
        console.error(`VIOLATION: ${file} in tv3-planner-ui imports from tv2-web! Reverse dependency prohibited.`);
        hasViolations = true;
      }
    }
  }
}

// 2. Kiểm tra Maven POM dependencies
function checkPomDependencies(pomPath, forbiddenArtifacts, moduleName) {
  if (fs.existsSync(pomPath)) {
    const content = fs.readFileSync(pomPath, 'utf-8');
    for (const forbidden of forbiddenArtifacts) {
      if (content.includes(`<artifactId>${forbidden}</artifactId>`)) {
        console.error(`VIOLATION: Module ${moduleName} declares prohibited dependency: ${forbidden}`);
        hasViolations = true;
      }
    }
  }
}

// Contracts không được phụ thuộc ai, academic, platform-app
checkPomDependencies('tv5-platform/contracts/pom.xml', ['haui-ai', 'haui-academic', 'haui-platform-app'], 'haui-contracts');

// AI không được phụ thuộc academic hoặc platform-app
checkPomDependencies('tv1-ai/pom.xml', ['haui-academic', 'haui-platform-app'], 'haui-ai');

// Academic không được phụ thuộc ai hoặc platform-app
checkPomDependencies('tv4-academic/pom.xml', ['haui-ai', 'haui-platform-app'], 'haui-academic');

if (hasViolations) {
  console.error('Architecture checks FAILED! Please fix boundary violations.');
  process.exit(1);
}

console.log('Architecture checks PASSED: No cyclic dependencies or boundary violations detected.');
