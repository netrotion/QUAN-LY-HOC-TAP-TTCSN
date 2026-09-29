/**
 * HaUI Advisor — Web Host Public Contract Export (`ui-api-v0`)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * File xuất khẩu chính thức cấu trúc `{ api, ui }` và các hàm tích hợp route
 * phục vụ bàn giao mốc `ui-api-v0` cho TV3 (Study Planner, AI Advisor Chat, What-if Simulator).
 */

import { api, createApiClient, ApiClientError } from './services/apiClient.js';
import {
  ui,
  Button,
  Card,
  Table,
  Modal,
  Loading,
  Error,
  EmptyState
} from './components/ui/index.js';
import {
  UI_API_CONTRACT_VERSION,
  REQUIRED_UI_COMPONENT_NAMES,
  REQUIRED_API_METHODS,
  TV3_DEFAULT_FALLBACK_SPECS,
  verifyUiApiContract,
  resolveStudentRoutesWithFallback
} from './routes/tv3RouteContract.js';
import { mountStudentRoutes } from './routes/mountStudentRoutes.jsx';

export {
  // Handoff cốt lõi cho TV3: { api, ui }
  api,
  ui,
  // Các UI components thành phần V0
  Button,
  Card,
  Table,
  Modal,
  Loading,
  Error,
  EmptyState,
  // Singleton API Client & Error class
  createApiClient,
  ApiClientError,
  // Cơ chế mount route không vòng phụ thuộc
  mountStudentRoutes,
  verifyUiApiContract,
  resolveStudentRoutesWithFallback,
  UI_API_CONTRACT_VERSION,
  REQUIRED_UI_COMPONENT_NAMES,
  REQUIRED_API_METHODS,
  TV3_DEFAULT_FALLBACK_SPECS
};

export default Object.freeze({
  version: UI_API_CONTRACT_VERSION,
  api,
  ui,
  mountStudentRoutes
});
