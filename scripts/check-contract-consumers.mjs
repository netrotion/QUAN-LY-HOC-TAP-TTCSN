import fs from 'node:fs';
import path from 'node:path';
import { GLOSSARY_FILE, loadOperations, readJson, readText } from './lib/contracts-v1.mjs';

/**
 * Kiểm tra phía sử dụng contracts-v1 cho FE (TV2, TV3; chỉ đọc), tìm
 *  - tên trường đã khai tử (glossary-v1.json#retired),
 *  - path API không có trong openapi-v1.yaml (V0 hoặc chưa được hợp đồng hóa).
 * Phía Java (TV1, TV4) do compiler kiểm tra chính xác theo kiểu: accessor chuyển tiếp mang
 * @Deprecated(forRemoval = true) nên javac in cảnh báo [removal] tại từng chỗ còn dùng.
 *
 * Mặc định chỉ báo cáo (exit 0) để owner tự sửa trong PR của mình; --strict trả exit 1 khi còn phát hiện.
 *   node scripts/check-contract-consumers.mjs [--strict] [--owner tv3]
 */

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const ownerFilter = args.includes('--owner') ? args[args.indexOf('--owner') + 1]?.toUpperCase() : null;

const CONSUMERS = [
  { owner: 'TV2', dirs: ['tv2-web/src', 'tv2-web/test'], exts: ['.js', '.jsx', '.mjs'] },
  { owner: 'TV3', dirs: ['tv3-planner-ui/src', 'tv3-planner-ui/test'], exts: ['.js', '.jsx', '.mjs'] },
];
const JAVA_HINT = 'Java (TV1, TV4): chạy "./mvnw -pl tv1-ai,tv4-academic test-compile" — cảnh báo [removal] chỉ đúng chỗ còn dùng accessor chuyển tiếp (glossary-v1.json#javaBridges).';

const retired = readJson(GLOSSARY_FILE).retired;
const templates = Object.values(loadOperations()).map((op) => op.path);
const API_PATH = /['"`](?:(?:GET|POST|PUT|PATCH|DELETE)\s+)?(?:\/api\/v1)?(\/(?:academic|planner|simulation|audit|advisor|system|mock)\/[A-Za-z0-9_\-/{}$]*)/g;
// Chỉ xét dòng gọi API (api.get/post..., case 'GET /...', '/api/v1/...'); bỏ qua route giao diện React.
const API_CONTEXT = /\.(?:get|post|put|patch|delete|request)\(\s*['"`]|case\s+['"`](?:GET|POST|PUT|PATCH|DELETE)\s|\/api\/v1\//;

function knownPath(apiPath) {
  const actual = apiPath.split('?')[0].replace(/\/+$/, '').split('/');
  return templates.some((t) => {
    const parts = t.split('/');
    return parts.length === actual.length
      && parts.every((p, i) => /^\{.+\}$/.test(p) || p === actual[i] || actual[i].includes('${'));
  });
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const findings = [];
for (const consumer of CONSUMERS) {
  if (ownerFilter && consumer.owner !== ownerFilter) continue;
  for (const file of consumer.dirs.flatMap((d) => walk(d, consumer.exts))) {
    readText(file).split('\n').forEach((line, index) => {
      const where = `${file}:${index + 1}`;
      for (const [name, info] of Object.entries(retired)) {
        if (new RegExp(`(?:\\b${name}\\s*:|\\.${name}\\b|['"]${name}['"])`).test(line)) {
          findings.push({ owner: consumer.owner, kind: 'RETIRED_FIELD', where, detail: `'${name}' → dùng '${info.replacedBy}'` });
        }
      }
      if (API_CONTEXT.test(line)) {
        for (const match of line.matchAll(API_PATH)) {
          const apiPath = match[1];
          if (apiPath.startsWith('/mock/') || knownPath(apiPath)) continue;
          findings.push({ owner: consumer.owner, kind: 'UNKNOWN_PATH', where, detail: `${apiPath} không có trong openapi-v1.yaml` });
        }
      }
    });
  }
}

console.log('--- contracts-v1: kiểm tra phía sử dụng FE (TV2, TV3; chỉ đọc) ---');
if (!findings.length) {
  console.log('✅ FE không còn tên trường khai tử hay path ngoài contracts-v1.');
  console.log(JAVA_HINT);
  process.exit(0);
}

const byOwner = new Map();
for (const f of findings) byOwner.set(f.owner, [...(byOwner.get(f.owner) ?? []), f]);
for (const [owner, items] of byOwner) {
  console.log(`\n${owner}: ${items.length} điểm cần owner xử lý trong PR của mình`);
  for (const item of items) console.log(`  [${item.kind}] ${item.where}  ${item.detail}`);
}
const counts = {};
for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
console.log(`\nTổng: ${findings.length} (${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}).`);
console.log('Hướng dẫn đổi tên: tv5-platform/contracts/CHANGELOG.md và glossary-v1.json.');
console.log(JAVA_HINT);

if (strict) {
  console.error('❌ --strict: phía sử dụng chưa khớp contracts-v1.');
  process.exit(1);
}
console.log('ℹ️  Chế độ báo cáo (không chặn CI). Dùng --strict sau khi các owner đã chuyển sang contracts-v1.');
