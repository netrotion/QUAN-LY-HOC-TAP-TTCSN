import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiện ích dùng chung cho các script kiểm tra contracts-v1 (không phụ thuộc thư viện ngoài).
 * Nguồn chuẩn: tv5-platform/contracts/{openapi/openapi-v1.yaml, glossary-v1.json, examples/*.json, src/main/java}.
 */

export const CONTRACTS_DIR = 'tv5-platform/contracts';
export const OPENAPI_FILE = `${CONTRACTS_DIR}/openapi/openapi-v1.yaml`;
export const EXAMPLES_DIR = `${CONTRACTS_DIR}/examples`;
export const GLOSSARY_FILE = `${CONTRACTS_DIR}/glossary-v1.json`;
export const LOCK_FILE = `${CONTRACTS_DIR}/contracts-v1.lock.json`;
export const CHANGELOG_FILE = `${CONTRACTS_DIR}/CHANGELOG.md`;
export const GENERATED_JS_FILE = `${CONTRACTS_DIR}/js/contracts-v1.generated.js`;
export const CURRICULUM_FILE = 'tv4-academic/fixtures/curriculum-ktpm-v1.json';
const JAVA_ROOT = `${CONTRACTS_DIR}/src/main/java/vn/haui/advisor/contracts`;
const ENUMS = ['StudyPlanStatus', 'ApiErrorCode', 'AcademicRiskLevel'];

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^﻿/, ''));
}

export function readText(file) {
  return fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');
}

export function loadManifest() {
  return readJson(`${EXAMPLES_DIR}/fixture-manifest.json`);
}

export function exampleFiles() {
  return fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json')).sort();
}

/**
 * Đọc danh sách operation từ openapi-v1.yaml theo đúng bố cục file (paths → method → operationId).
 * Không phải parser YAML tổng quát; contract test Java kiểm tra đầy đủ bằng SnakeYAML.
 */
export function loadOperations() {
  const lines = readText(OPENAPI_FILE).split('\n');
  const operations = {};
  let inPaths = false;
  let currentPath = null;
  let currentMethod = null;
  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line)) { inPaths = false; }
    if (!inPaths) continue;
    const pathMatch = line.match(/^ {2}"?(\/[^":]*)"?:\s*$/);
    if (pathMatch) { currentPath = pathMatch[1]; currentMethod = null; continue; }
    const methodMatch = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (methodMatch) { currentMethod = methodMatch[1].toUpperCase(); continue; }
    const opMatch = line.match(/^ {6}operationId:\s*"?(\w+)"?\s*$/);
    if (opMatch && currentPath && currentMethod) {
      operations[opMatch[1]] = { method: currentMethod, path: currentPath };
    }
  }
  return operations;
}

export function openApiVersion() {
  const match = readText(OPENAPI_FILE).match(/^info:\n(?: {2}.*\n)*? {2}version:\s*"?([^"\n]+)"?/m);
  return match ? match[1] : null;
}

export function javaContractVersion() {
  const match = readText(`${JAVA_ROOT}/ContractVersion.java`).match(/CURRENT\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

export function loadEnums() {
  const result = {};
  for (const name of ENUMS) {
    const source = readText(`${JAVA_ROOT}/dto/${name}.java`).replace(/\/\*\*[\s\S]*?\*\//g, '');
    const body = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
    result[name] = body.split(/[,;]/).map((s) => s.trim()).filter((s) => /^[A-Z][A-Z0-9_]*$/.test(s));
  }
  return result;
}

/** Tập khóa JSON xuất hiện (đệ quy) trong một giá trị. */
export function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((v) => collectKeys(v, keys));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      collectKeys(v, keys);
    }
  }
  return keys;
}

/** Các file thuộc phạm vi khóa contracts-v1 (đường dẫn POSIX tương đối repo, đã sắp xếp). */
export function lockedFiles() {
  const files = [OPENAPI_FILE, GLOSSARY_FILE, `${CONTRACTS_DIR}/package.json`, `${CONTRACTS_DIR}/js/index.js`];
  for (const f of exampleFiles()) files.push(`${EXAMPLES_DIR}/${f}`);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.java')) files.push(full);
    }
  };
  walk(JAVA_ROOT);
  return files.sort();
}

/** Băm nội dung đã chuẩn hóa xuống dòng LF để kết quả giống nhau trên Windows và Linux. */
export function computeFingerprints() {
  const fingerprints = {};
  for (const file of lockedFiles()) {
    fingerprints[file] = crypto.createHash('sha256').update(readText(file), 'utf-8').digest('hex');
  }
  return fingerprints;
}

/** Nội dung module JS sinh từ manifest + fixtures cho mock FE. */
export function renderFixturesModule() {
  const manifest = loadManifest();
  const operations = loadOperations();
  const fixtures = {};
  for (const item of manifest.fixtures) {
    fixtures[item.id] = {
      operationId: item.operationId,
      method: item.method,
      path: item.path,
      httpStatus: item.httpStatus,
      pathParams: item.pathParams ?? null,
      requestSchema: item.requestSchema ?? null,
      request: item.requestSample ? readJson(`${EXAMPLES_DIR}/${item.requestSample}`) : null,
      responseSchema: item.responseSchema,
      response: readJson(`${EXAMPLES_DIR}/${item.responseSample}`),
      consumers: item.consumers ?? [],
    };
  }
  const sortedOperations = Object.fromEntries(Object.keys(operations).sort().map((k) => [k, operations[k]]));
  const json = (v) => JSON.stringify(v, null, 2);
  return [
    '// GENERATED — KHÔNG SỬA TAY. Sinh bởi `npm run contracts:build` từ tv5-platform/contracts (openapi-v1.yaml, examples/*.json, enum Java).',
    `export const CONTRACT_VERSION = ${JSON.stringify(manifest.contractVersion)};`,
    `export const CONTRACT_MILESTONE = ${JSON.stringify(manifest.milestone)};`,
    "export const API_BASE_PATH = '/api/v1';",
    `export const DEMO_STUDENT = Object.freeze(${json(manifest.demoStudent)});`,
    `export const ENUMS = Object.freeze(${json(loadEnums())});`,
    `export const OPERATIONS = Object.freeze(${json(sortedOperations)});`,
    `export const FIXTURES = Object.freeze(${json(fixtures)});`,
    '',
  ].join('\n');
}

export function relativeExamplesPath(file) {
  return path.posix.join(EXAMPLES_DIR, file);
}
