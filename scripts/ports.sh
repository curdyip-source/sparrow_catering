#!/usr/bin/env bash
# Управление портовым блоком проекта.
#
#   ./scripts/ports.sh              — показать текущий блок и занятость портов
#   ./scripts/ports.sh 42200        — перевести проект на блок 42200-42209
#   ./scripts/ports.sh --scan       — какие блоки заняты соседними проектами
#
# Раскладка блока (base + смещение):
#   +0 backend   +1 frontend   +2 postgres   +3 redis   +4..+9 запас
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
EXAMPLE_FILE="$ROOT/.env.example"
BLOCK_SIZE=10

# Каталог, в котором лежат все проекты (родитель этого репозитория).
PROJECTS_DIR="$(dirname "$ROOT")"

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

port_owner() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -F c 2>/dev/null | sed -n 's/^c//p' | head -1
}

read_var() {
  # read_var <file> <VAR>
  sed -n "s/^$2=//p" "$1" | head -1
}

scan() {
  printf 'Занятые блоки в %s:\n' "$PROJECTS_DIR"
  local found=0
  for env in "$PROJECTS_DIR"/*/.env; do
    [ -f "$env" ] || continue
    local base
    base="$(read_var "$env" PORT_BASE)"
    [ -n "$base" ] || continue
    found=1
    printf '  %-28s %s-%s\n' "$(basename "$(dirname "$env")")" "$base" "$((base + BLOCK_SIZE - 1))"
  done
  [ "$found" = 1 ] || printf '  (ни в одном соседнем .env нет PORT_BASE)\n'
}

show() {
  local base backend frontend pg redis
  base="$(read_var "$ENV_FILE" PORT_BASE)"
  backend="$(read_var "$ENV_FILE" BACKEND_PORT)"
  frontend="$(read_var "$ENV_FILE" FRONTEND_PORT)"
  pg="$(read_var "$ENV_FILE" POSTGRES_PORT)"
  redis="$(read_var "$ENV_FILE" REDIS_PORT)"

  printf 'Блок проекта: %s-%s\n\n' "$base" "$((base + BLOCK_SIZE - 1))"
  local busy=0
  for pair in "backend:$backend" "frontend:$frontend" "postgres:$pg" "redis:$redis"; do
    local name="${pair%%:*}" p="${pair##*:}"
    if port_busy "$p"; then
      printf '  %-9s %-7s ЗАНЯТ (%s)\n' "$name" "$p" "$(port_owner "$p")"
      busy=1
    else
      printf '  %-9s %-7s свободен\n' "$name" "$p"
    fi
  done
  if [ "$busy" = 1 ]; then
    printf '\nЕсли занял не этот проект — возьмите другой блок: ./scripts/ports.sh <base>\n'
  fi
}

apply() {
  local base="$1"
  case "$base" in
    ''|*[!0-9]*) echo "base должен быть числом" >&2; exit 1 ;;
  esac
  if [ "$base" -lt 1024 ] || [ "$((base + BLOCK_SIZE - 1))" -gt 49151 ]; then
    echo "base должен укладываться в 1024-49151 (выше — эфемерный диапазон macOS)" >&2
    exit 1
  fi

  local conflict=0
  for offset in 0 1 2 3; do
    local p=$((base + offset))
    if port_busy "$p"; then
      printf 'Порт %s уже занят (%s)\n' "$p" "$(port_owner "$p")" >&2
      conflict=1
    fi
  done
  [ "$conflict" = 0 ] || { echo "Блок $base занят, выберите другой." >&2; exit 1; }

  for file in "$ENV_FILE" "$EXAMPLE_FILE"; do
    [ -f "$file" ] || continue
    local tmp="$file.tmp.$$"
    sed \
      -e "s|^PORT_BASE=.*|PORT_BASE=$base|" \
      -e "s|^BACKEND_PORT=.*|BACKEND_PORT=$((base + 0))|" \
      -e "s|^FRONTEND_PORT=.*|FRONTEND_PORT=$((base + 1))|" \
      -e "s|^POSTGRES_PORT=.*|POSTGRES_PORT=$((base + 2))|" \
      -e "s|^REDIS_PORT=.*|REDIS_PORT=$((base + 3))|" \
      -e "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:$((base + 0))|" \
      -e "s|^# Блок .*|# Блок $(read_var "$ENV_FILE" PROJECT_NAME): $base-$((base + BLOCK_SIZE - 1)) (PORT_BASE=$base).|" \
      "$file" > "$tmp"
    mv "$tmp" "$file"
  done

  printf 'Блок переключён на %s-%s. Перезапустите: docker compose up -d\n\n' "$base" "$((base + BLOCK_SIZE - 1))"
  show
}

case "${1:-}" in
  '')       show ;;
  --scan)   scan ;;
  -h|--help) sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *)        apply "$1" ;;
esac
