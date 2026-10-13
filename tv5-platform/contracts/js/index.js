/**
 * @haui/contracts — fixtures và danh mục operation của contracts-v1 cho mock FE (TV2/TV3).
 * Dữ liệu sinh từ tv5-platform/contracts (openapi-v1.yaml, examples/*.json); không sửa tay file generated.
 *
 *   import { getFixture, findFixture, OPERATIONS, ENUMS } from '@haui/contracts';
 *   const plan = getFixture('get-study-plan').response;          // StudyPlanDetailResponse
 *   const mock = findFixture('POST', '/planner/plans/plan-1/activate'); // khớp path template
 */
import { FIXTURES, OPERATIONS } from './contracts-v1.generated.js';

export {
  API_BASE_PATH,
  CONTRACT_MILESTONE,
  CONTRACT_VERSION,
  DEMO_STUDENT,
  ENUMS,
  FIXTURES,
  OPERATIONS,
} from './contracts-v1.generated.js';

const clone = (value) => (value == null ? value : structuredClone(value));

function matchesTemplate(template, actualPath) {
  const t = template.split('/');
  const a = actualPath.split('?')[0].replace(/\/+$/, '').split('/');
  return t.length === a.length && t.every((part, i) => /^\{.+\}$/.test(part) || part === a[i]);
}

/** Bản sao sâu của một fixture theo id trong fixture-manifest.json. */
export function getFixture(id) {
  const fixture = FIXTURES[id];
  if (!fixture) {
    throw new Error(`Không có fixture contracts-v1 với id "${id}"`);
  }
  return clone(fixture);
}

/**
 * Fixture cho một request HTTP (path tương đối /api/v1, có thể là path cụ thể).
 * Mặc định trả fixture thành công (2xx); truyền httpStatus để lấy fixture lỗi.
 */
export function findFixture(method, path, { httpStatus } = {}) {
  const upper = String(method).toUpperCase();
  const candidates = Object.values(FIXTURES).filter(
    (f) => f.method === upper && matchesTemplate(f.path, path)
      && (httpStatus ? f.httpStatus === httpStatus : f.httpStatus < 300),
  );
  return candidates.length ? clone(candidates[0]) : null;
}

/** operationId → { method, path } theo openapi-v1.yaml. */
export function operationFor(operationId) {
  const operation = OPERATIONS[operationId];
  if (!operation) {
    throw new Error(`operationId "${operationId}" không có trong contracts-v1`);
  }
  return { ...operation };
}
