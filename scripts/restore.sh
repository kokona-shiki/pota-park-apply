#!/bin/bash
set -e

if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${DATA_DIR}/backups"

echo "Available backups in ${BACKUP_DIR}:"
echo "-------------------"
ls -lh "${BACKUP_DIR}"/pota_park_*.sql.gz 2>/dev/null || echo "No backups found"
echo ""

read -p "Enter the backup filename to restore (e.g., pota_park_20240101_020000.sql.gz): " BACKUP_FILE

if [ -z "${BACKUP_FILE}" ]; then
    echo "Error: No backup file specified"
    exit 1
fi

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

if [ ! -f "${BACKUP_PATH}" ]; then
    echo "Error: Backup file not found: ${BACKUP_PATH}"
    exit 1
fi

read -p "This will replace the current database. Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting database restore..."
gunzip -c "${BACKUP_PATH}" | docker exec -i pota-park-db psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-pota_park}"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully!"
else
    echo "Restore failed!"
    exit 1
fi
