#!/usr/bin/env bash
# ==============================================================================
# HaUI Advisor — Database Restore Script (Task 5.1)
# TV5 Platform / DevOps
# Usage: ./restore.sh <path_to_backup.sql>
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.sql>" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${DB_CONTAINER:-haui-db}"
DB_NAME="${DB_NAME:-haui_advisor}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERROR] Tệp sao lưu không tồn tại: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "[WARNING] Thao tác này sẽ ghi đè dữ liệu hiện tại trong cơ sở dữ liệu '${DB_NAME}'!"
echo "[INFO] Container: ${CONTAINER_NAME}"
echo "[INFO] Source:    ${BACKUP_FILE}"

# Kiểm tra container DB
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[ERROR] Container '${CONTAINER_NAME}' không đang chạy. Vui lòng khởi động hạ tầng bằng docker compose trước." >&2
  exit 1
fi

echo "[INFO] Đang tiến hành khôi phục..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}"

echo "[SUCCESS] Khôi phục cơ sở dữ liệu thành công từ tệp ${BACKUP_FILE}!"
