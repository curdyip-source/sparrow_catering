#!/bin/sh
# Sidecar that idles until it receives SIGTERM (sent by `docker compose stop`
# and `docker compose down`), then dumps the database into the git-crypt volume.
set -u

DUMP_FILE="${DUMP_FILE:-/backup/db.dump}"

dump() {
  echo "[db-backup] stop signal received — dumping '${POSTGRES_DB}' -> ${DUMP_FILE}"
  if pg_dump -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc -f "${DUMP_FILE}.tmp"; then
    mv "${DUMP_FILE}.tmp" "${DUMP_FILE}"
    echo "[db-backup] dump complete ($(wc -c < "${DUMP_FILE}") bytes)"
  else
    echo "[db-backup] dump FAILED — keeping previous ${DUMP_FILE}" >&2
    rm -f "${DUMP_FILE}.tmp"
  fi
  exit 0
}

trap dump TERM INT

echo "[db-backup] ready — will dump on 'docker compose stop' / 'down'"
# Sleep in the background and wait, so the trap can interrupt promptly.
while true; do
  sleep 3600 &
  wait "$!"
done
