#!/usr/bin/env bash
# ==============================================================================
# HaUI Advisor — Database Backup Script (Task 5.1)
# TV5 Platform / DevOps
# Usage: ./backup.sh [output_directory]
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

CONTAINER_NAME="${DB_CONTAINER:-haui-db}"
DB_NAME="${DB_NAME:-haui_advisor}"
DB_USER="${DB_USER:-postgres}"

OUTPUT_DIR="${1:-${PROJECT_ROOT}/tv5-platform/infra/backups}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${OUTPUT_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

mkdir -p "${OUTPUT_DIR}"

echo "[INFO] Khởi tạo sao lưu cơ sở dữ liệu HaUI Advisor..."
echo "[INFO] Container: ${CONTAINER_NAME}"
echo "[INFO] Database:  ${DB_NAME}"
echo "[INFO] Target:    ${BACKUP_FILE}"

# Kiểm tra container DB có đang hoạt động không
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[ERROR] Container '${CONTAINER_NAME}' không đang chạy. Vui lòng khởi động hạ tầng bằng docker compose trước." >&2
  exit 1
fi

# Thực thi pg_dump trong container
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists > "${BACKUP_FILE}"

if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
  echo "[SUCCESS] Sao lưu thành công! Tệp: ${BACKUP_FILE} (${FILE_SIZE})"
else
  echo "[ERROR] Tệp sao lưu rỗng hoặc xảy ra lỗi trong quá trình pg_dump." >&2
  exit 1
fi
