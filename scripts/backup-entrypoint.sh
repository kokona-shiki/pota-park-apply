#!/bin/sh
set -e

BACKUP_HOUR="${BACKUP_HOUR:-2}"
BACKUP_MINUTE="${BACKUP_MINUTE:-0}"
LOG_DIR="/var/log"

mkdir -p "${LOG_DIR}"

echo "${BACKUP_MINUTE} ${BACKUP_HOUR} * * * /backup.sh >> ${LOG_DIR}/backup.log 2>&1" > /etc/crontabs/root

touch "${LOG_DIR}/backup.log"

echo "[$(date)] Backup cron job scheduled at ${BACKUP_HOUR}:${BACKUP_MINUTE}"
echo "[$(date)] Starting crond..."

exec crond -f -l 2
