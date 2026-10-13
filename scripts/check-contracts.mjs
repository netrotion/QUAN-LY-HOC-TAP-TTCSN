import fs from 'node:fs';
import {
  CHANGELOG_FILE,
  CURRICULUM_FILE,
  EXAMPLES_DIR,
  GENERATED_JS_FILE,
  GLOSSARY_FILE,
  LOCK_FILE,
  OPENAPI_FILE,
  collectKeys,
  computeFingerprints,
  exampleFiles,
  javaContractVersion,
  loadManifest,
  loadOperations,
  openApiVersion,
  readJson,
  readText,
  renderFixturesModule,
} from './lib/contracts-v1.mjs';

/**
 * Cổng kiểm tra contracts-v1 (chạy trong smoke và CI frontend).
 *   node scripts/check-contracts.mjs              kiểm tra
 *   node scripts/check-contracts.mjs --write      sinh lại tv5-platform/contracts/js/contracts-v1.generated.js
 *   node scripts/check-contracts.mjs --update-lock  ghi lại contracts-v1.lock.json (chỉ TV5, sau khi ghi CHANGELOG)
 * Contract test Java (mvnw test) kiểm tra sâu hơn: fixture ↔ OpenAPI schema ↔ DTO round-trip.
 */

const args = new Set(process.argv.slice(2));
const errors = [];
const fail = (message) => errors.push(message);

console.log('--- Verifying contracts-v1 (OpenAPI, glossary, fixtures, FE module, lock) ---');

for (const file of [OPENAPI_FILE, GLOSSARY_FILE, `${EXAMPLES_DIR}/fixture-manifest.json`, CHANGELOG_FILE]) {
  if (!fs.existsSync(file)) fail(`Thiếu file ${file}`);
}
if (errors.length) finish();

if (!readText(OPENAPI_FILE).includes('openapi: "3.0.3"')) fail('openapi-v1.yaml phải là OpenAPI 3.0.3');

// 1. Một phiên bản cho cả bộ contract
const manifest = loadManifest();
const glossary = readJson(GLOSSARY_FILE);
const contractsPackage = readJson('tv5-platform/contracts/package.json');
const versions = {
  'openapi info.version': openApiVersion(),
  'fixture-manifest.contractVersion': manifest.contractVersion,
  'glossary-v1.contractVersion': glossary.contractVersion,
  'ContractVersion.CURRENT': javaContractVersion(),
  '@haui/contracts version': contractsPackage.version,
};
if (new Set(Object.values(versions)).size !== 1) {
  fail(`Phiên bản contract không đồng nhất: ${JSON.stringify(versions)}`);
}
const version = manifest.contractVersion;
if (!readText(CHANGELOG_FILE).includes(`## [${version}]`)) {
  fail(`CHANGELOG.md chưa có mục "## [${version}]"`);
}

// 2. Manifest ↔ file mẫu ↔ operation OpenAPI
const operations = loadOperations();
const declared = new Set();
for (const item of manifest.fixtures) {
  for (const key of ['requestSample', 'responseSample']) {
    if (!item[key]) continue;
    declared.add(item[key]);
    const file = `${EXAMPLES_DIR}/${item[key]}`;
    if (!fs.existsSync(file)) { fail(`${item.id}: thiếu ${item[key]}`); continue; }
    try { readJson(file); } catch (e) { fail(`${item[key]}: JSON lỗi ${e.message}`); }
  }
  const op = operations[item.operationId];
  if (!op) fail(`${item.id}: operationId ${item.operationId} không có trong openapi-v1.yaml`);
  else if (op.method !== item.method || op.path !== item.path) {
    fail(`${item.id}: ${item.method} ${item.path} khác OpenAPI ${op.method} ${op.path}`);
  }
}
for (const file of exampleFiles()) {
  if (file !== 'fixture-manifest.json' && !declared.has(file)) fail(`File mẫu chưa đăng ký trong manifest: ${file}`);
}

// 3. Không dùng tên trường đã khai tử (một dữ liệu — một tên)
const retired = glossary.retired ?? {};
for (const file of exampleFiles()) {
  if (file === 'fixture-manifest.json') continue;
  for (const key of collectKeys(readJson(`${EXAMPLES_DIR}/${file}`))) {
    if (retired[key]) fail(`${file}: trường '${key}' đã khai tử, dùng '${retired[key].replacedBy}'`);
    else if (!glossary.fields[key]) fail(`${file}: trường '${key}' chưa đăng ký trong glossary-v1.json`);
  }
}
for (const name of Object.keys(retired)) {
  if (new RegExp(`^\\s+${name}:`, 'm').test(readText(OPENAPI_FILE))) fail(`openapi-v1.yaml còn trường khai tử '${name}'`);
}

// 4. Học phần trong fixture khớp CTĐT của TV4 (cùng mã → cùng tên, cùng số tín chỉ)
if (fs.existsSync(CURRICULUM_FILE)) {
  const curriculum = new Map(readJson(CURRICULUM_FILE).courses.map((c) => [c.courseCode, c]));
  const visit = (value, file) => {
    if (Array.isArray(value)) { value.forEach((v) => visit(v, file)); return; }
    if (!value || typeof value !== 'object') return;
    if (typeof value.courseCode === 'string') {
      const course = curriculum.get(value.courseCode);
      if (!course) fail(`${file}: học phần ${value.courseCode} không có trong ${CURRICULUM_FILE}`);
      else {
        if (value.courseName !== undefined && value.courseName !== course.courseName) {
          fail(`${file}: ${value.courseCode} tên '${value.courseName}' ≠ CTĐT '${course.courseName}'`);
        }
        if (value.credits !== undefined && value.credits !== course.credits) {
          fail(`${file}: ${value.courseCode} ${value.credits} TC ≠ CTĐT ${course.credits} TC`);
        }
      }
    }
    Object.values(value).forEach((v) => visit(v, file));
  };
  for (const file of exampleFiles()) {
    if (file !== 'fixture-manifest.json') visit(readJson(`${EXAMPLES_DIR}/${file}`), file);
  }
}

// 5. Module fixtures cho FE luôn sinh từ nguồn chuẩn
const rendered = renderFixturesModule();
if (args.has('--write')) {
  fs.writeFileSync(GENERATED_JS_FILE, rendered);
  console.log(`Đã sinh ${GENERATED_JS_FILE}`);
} else if (!fs.existsSync(GENERATED_JS_FILE) || readText(GENERATED_JS_FILE) !== rendered) {
  fail(`${GENERATED_JS_FILE} lệch nguồn chuẩn: chạy "npm run contracts:build"`);
}

// 6. Khóa mốc contracts-v1: mọi thay đổi phải đi kèm cập nhật lock (PR của TV5)
const fingerprints = computeFingerprints();
if (args.has('--update-lock')) {
  if (errors.length) finish();
  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    milestone: manifest.milestone,
    contractVersion: version,
    owner: 'TV5',
    policy: 'Thay đổi file trong danh sách cần PR của TV5: tăng contractVersion nếu đổi schema, ghi CHANGELOG, chạy mvnw test (contract + consumer test), npm run check:contract-consumers, rồi npm run contracts:lock.',
    files: fingerprints,
  }, null, 2) + '\n');
  console.log(`Đã ghi ${LOCK_FILE} (${Object.keys(fingerprints).length} file)`);
} else if (args.has('--write')) {
  console.log('Bỏ qua kiểm tra lock ở chế độ --write; chạy "npm run contracts:lock" sau khi hoàn tất thay đổi.');
} else if (!fs.existsSync(LOCK_FILE)) {
  fail(`Thiếu ${LOCK_FILE}: chạy "npm run contracts:lock"`);
} else {
  const lock = readJson(LOCK_FILE);
  if (lock.contractVersion !== version) fail(`Lock ghi contractVersion ${lock.contractVersion} ≠ ${version}`);
  const changed = [];
  for (const [file, hash] of Object.entries(fingerprints)) {
    if (lock.files[file] !== hash) changed.push(lock.files[file] ? `~ ${file}` : `+ ${file}`);
  }
  for (const file of Object.keys(lock.files)) {
    if (!fingerprints[file]) changed.push(`- ${file}`);
  }
  if (changed.length) {
    fail([
      'contracts-v1 đã khóa nhưng các file sau thay đổi so với contracts-v1.lock.json:',
      ...changed.map((c) => `    ${c}`),
      '  → Thay đổi contract phải là PR của TV5: ghi CHANGELOG, chạy mvnw test + npm run check:contract-consumers, rồi npm run contracts:lock.',
    ].join('\n'));
  }
}

finish();

function finish() {
  if (errors.length) {
    console.error('\n❌ Contracts validation FAILED:');
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  const lockState = args.has('--write') ? 'lock chưa kiểm tra' : 'lock khớp';
  console.log(`✅ Contracts check PASSED: contracts-v1 ${version}, ${manifest.fixtures.length} fixture, ${Object.keys(operations).length} operation, ${lockState}.`);
  process.exit(0);
}
