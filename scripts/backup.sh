#!/bin/sh
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pota_park_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting database backup..."
pg_dump | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed: ${BACKUP_FILE}"
    
    find "${BACKUP_DIR}" -name "pota_park_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"
else
    echo "[$(date)] Backup failed!"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
