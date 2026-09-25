import fs from 'node:fs';
import path from 'node:path';

console.log('--- Verifying Contracts V0 and Fixture Samples ---');

let hasErrors = false;

// 1. Kiểm tra OpenAPI specification file
const openApiFile = path.resolve('tv5-platform/contracts/openapi/openapi-v0.yaml');
if (!fs.existsSync(openApiFile)) {
  console.error(`ERROR: OpenAPI file not found at ${openApiFile}`);
  hasErrors = true;
} else {
  const content = fs.readFileSync(openApiFile, 'utf-8');
  if (content.length < 100 || !content.includes('openapi: 3.0.3')) {
    console.error('ERROR: OpenAPI file is invalid or empty.');
    hasErrors = true;
  } else {
    console.log('OpenAPI V0 spec verified successfully.');
  }
}

// 2. Kiểm tra fixture manifest và các file JSON mẫu
const manifestPath = path.resolve('tv5-platform/contracts/examples/fixture-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`ERROR: Fixture manifest not found at ${manifestPath}`);
  hasErrors = true;
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Verifying ${manifest.fixtures.length} fixture capabilities...`);

  for (const item of manifest.fixtures) {
    if (item.requestSample) {
      const p = path.resolve('tv5-platform/contracts/examples', item.requestSample);
      if (!fs.existsSync(p)) {
        console.error(`Missing request sample: ${item.requestSample}`);
        hasErrors = true;
      } else {
        try {
          JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (e) {
          console.error(`Invalid JSON in ${item.requestSample}: ${e.message}`);
          hasErrors = true;
        }
      }
    }

    if (item.responseSample) {
      const p = path.resolve('tv5-platform/contracts/examples', item.responseSample);
      if (!fs.existsSync(p)) {
        console.error(`Missing response sample: ${item.responseSample}`);
        hasErrors = true;
      } else {
        try {
          JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (e) {
          console.error(`Invalid JSON in ${item.responseSample}: ${e.message}`);
          hasErrors = true;
        }
      }
    }
  }
}

if (hasErrors) {
  console.error('Contracts validation FAILED!');
  process.exit(1);
}

console.log('Contracts check PASSED: All OpenAPI specs and JSON fixtures are valid.');
