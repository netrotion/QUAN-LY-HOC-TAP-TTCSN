/**
 * HaUI Advisor — Shared UI Library V0 (`ui-api-v0`)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Xuất khẩu đầy đủ 7 thành phần UI chuẩn cho cả TV2 (Web Host) và TV3 (Planner/AI UI).
 */

import { Button } from './Button.jsx';
import { Card } from './Card.jsx';
import { Table } from './Table.jsx';
import { Modal } from './Modal.jsx';
import { Loading } from './Loading.jsx';
import { Error } from './Error.jsx';
import { EmptyState } from './EmptyState.jsx';

export { Button, Card, Table, Modal, Loading, Error, EmptyState };

/**
 * Bộ UI Component V0 đóng gói theo hợp đồng Dependency Injection `createStudentRoutes({ api, ui })`
 */
export const ui = Object.freeze({
  Button,
  Card,
  Table,
  Modal,
  Loading,
  Error,
  EmptyState
});

export default ui;
