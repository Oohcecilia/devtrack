#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_ENV_FILE="${PROJECT_ROOT}/.env"
BACKUP_ENV_FILE="${HOME}/.config/devtrack-backup.env"
BACKUP_ROOT="${HOME}/devtrack/backups"
LOG_ROOT="${HOME}/devtrack/logs"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
RUN_LOG="${LOG_ROOT}/couchdb-backup-${TIMESTAMP}.log"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DROPBOX_BACKUP_PATH="${DROPBOX_BACKUP_PATH:-/DevTrackBackups}"

mkdir -p "${BACKUP_ROOT}" "${LOG_ROOT}"
touch "${RUN_LOG}"

log() {
  local level="$1"
  shift
  printf '[%s] [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "${level}" "$*" | tee -a "${RUN_LOG}"
}

fail() {
  log "ERROR" "$*"
  exit 1
}

if [[ -f "${APP_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${APP_ENV_FILE}"
  set +a
else
  fail "Missing application environment file at ${APP_ENV_FILE}"
fi

if [[ -f "${BACKUP_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${BACKUP_ENV_FILE}"
  set +a
fi

: "${COUCHDB_URL:?COUCHDB_URL is required}"
: "${COUCHDB_USERNAME:?COUCHDB_USERNAME is required}"
: "${COUCHDB_PASSWORD:?COUCHDB_PASSWORD is required}"
: "${COUCHDB_DB_PREFIX:?COUCHDB_DB_PREFIX is required}"

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v tar >/dev/null 2>&1 || fail "tar is required"
command -v find >/dev/null 2>&1 || fail "find is required"

WORK_DIR="${BACKUP_ROOT}/couchdb-${TIMESTAMP}"
ARCHIVE_NAME="devtrack-couchdb-backup-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_ROOT}/${ARCHIVE_NAME}"

mkdir -p "${WORK_DIR}"

cleanup_workdir() {
  rm -rf "${WORK_DIR}"
}

trap cleanup_workdir EXIT

log "INFO" "Starting CouchDB backup run"

db_list_raw="$(curl -sf -u "${COUCHDB_USERNAME}:${COUCHDB_PASSWORD}" "${COUCHDB_URL}/_all_dbs")" \
  || fail "Unable to fetch CouchDB database list"

db_list="$(printf '%s' "${db_list_raw}" | tr -d '[]"' | tr ',' '\n' | sed '/^[[:space:]]*$/d' | grep "^${COUCHDB_DB_PREFIX}_" || true)"

if [[ -z "${db_list}" ]]; then
  fail "No CouchDB databases found with prefix ${COUCHDB_DB_PREFIX}_"
fi

while IFS= read -r db_name; do
  [[ -z "${db_name}" ]] && continue
  log "INFO" "Backing up database ${db_name}"

  curl -sf -u "${COUCHDB_USERNAME}:${COUCHDB_PASSWORD}" \
    "${COUCHDB_URL}/${db_name}" \
    > "${WORK_DIR}/${db_name}.meta.json" \
    || fail "Unable to fetch metadata for ${db_name}"

  curl -sf -u "${COUCHDB_USERNAME}:${COUCHDB_PASSWORD}" \
    "${COUCHDB_URL}/${db_name}/_all_docs?include_docs=true" \
    > "${WORK_DIR}/${db_name}.json" \
    || fail "Unable to export documents for ${db_name}"
done <<< "${db_list}"

cat > "${WORK_DIR}/manifest.txt" <<MANIFEST
timestamp=${TIMESTAMP}
host=$(hostname)
project_root=${PROJECT_ROOT}
db_prefix=${COUCHDB_DB_PREFIX}
databases=$(printf '%s' "${db_list}" | tr '\n' ',' | sed 's/,$//')
MANIFEST

tar -czf "${ARCHIVE_PATH}" -C "${BACKUP_ROOT}" "$(basename "${WORK_DIR}")" \
  || fail "Unable to compress backup archive"

log "INFO" "Created archive ${ARCHIVE_PATH}"

find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'devtrack-couchdb-backup-*.tar.gz' -mtime "+${RETENTION_DAYS}" -print -delete \
  | while IFS= read -r deleted_file; do
      [[ -n "${deleted_file}" ]] && log "INFO" "Deleted old backup ${deleted_file}"
    done

find "${BACKUP_ROOT}" -maxdepth 1 -type d -name 'couchdb-*' -mtime "+${RETENTION_DAYS}" -print -exec rm -rf {} + \
  | while IFS= read -r deleted_dir; do
      [[ -n "${deleted_dir}" ]] && log "INFO" "Deleted old unpacked backup directory ${deleted_dir}"
    done

if [[ -z "${DROPBOX_ACCESS_TOKEN:-}" ]]; then
  fail "DROPBOX_ACCESS_TOKEN is not configured. Archive created locally at ${ARCHIVE_PATH}"
fi

dropbox_target="${DROPBOX_BACKUP_PATH%/}/${ARCHIVE_NAME}"
dropbox_api_arg="$(printf '{"path":"%s","mode":"add","autorename":true,"mute":false,"strict_conflict":false}' "${dropbox_target}")"
dropbox_response_file="$(mktemp)"
dropbox_http_code="$(
  curl -sS -o "${dropbox_response_file}" -w '%{http_code}' -X POST "https://content.dropboxapi.com/2/files/upload" \
    --header "Authorization: Bearer ${DROPBOX_ACCESS_TOKEN}" \
    --header "Dropbox-API-Arg: ${dropbox_api_arg}" \
    --header "Content-Type: application/octet-stream" \
    --data-binary @"${ARCHIVE_PATH}"
)"

if [[ "${dropbox_http_code}" != "200" ]]; then
  dropbox_error="$(tr '\n' ' ' < "${dropbox_response_file}")"
  rm -f "${dropbox_response_file}"
  fail "Dropbox upload failed for ${ARCHIVE_NAME}: HTTP ${dropbox_http_code} ${dropbox_error}"
fi

rm -f "${dropbox_response_file}"

log "INFO" "Uploaded archive to Dropbox at ${dropbox_target}"
log "INFO" "Backup run completed successfully"
