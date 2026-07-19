#!/bin/sh
# One-shot restore: on `docker compose up` this always overwrites the database
# with the dump stored in the git-crypt volume. If no dump exists yet (fresh
# project), it does nothing and lets alembic build the schema.
set -u

DUMP_FILE="${DUMP_FILE:-/backup/db.dump}"

if [ ! -f "${DUMP_FILE}" ]; then
  echo "[db-restore] no ${DUMP_FILE} — fresh database, alembic will build the schema"
  exit 0
fi

echo "[db-restore] overwriting '${POSTGRES_DB}' from ${DUMP_FILE}"
psql -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
pg_restore -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --no-owner --no-privileges --exit-on-error "${DUMP_FILE}"
echo "[db-restore] restore complete"
