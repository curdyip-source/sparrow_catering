# sparrow_catering

Локальный MVP для кальянного кейтеринга SP.ARROW: лендинг с калькулятором заявки, backend на FastAPI и задел под админку с хранением лидов, заказов и настраиваемых коэффициентов расчета.

## Стек

- backend: FastAPI, SQLAlchemy, Alembic, Redis, Celery
- frontend: React, TypeScript, Vite
- infra: PostgreSQL, Docker Compose, GitHub Actions

## Структура

- backend — API, модели, миграции и тесты
- frontend — лендинг, калькулятор и форма заявки
- docs — проектные заметки и checklist
- .github/workflows — CI

## Быстрый старт

1. Скопируйте `.env.example` в `.env`.
2. Проверьте, что портовый блок свободен: `./scripts/ports.sh`.
3. Запустите проект: `docker compose up --build`.
4. Откройте frontend на `http://localhost:42101`.
5. Проверьте backend health на `http://localhost:42100/health`.

## Порты

Дефолтные 5173/8000/5432/6379 не используются — у проекта свой блок из 10 портов,
чтобы несколько локальных проектов могли работать одновременно.

Блок `sparrow_catering`: **42100-42109**, раскладка от `PORT_BASE`:

| смещение | сервис   | переменная      | порт  |
| -------- | -------- | --------------- | ----- |
| +0       | backend  | `BACKEND_PORT`  | 42100 |
| +1       | frontend | `FRONTEND_PORT` | 42101 |
| +2       | postgres | `POSTGRES_PORT` | 42102 |
| +3       | redis    | `REDIS_PORT`    | 42103 |
| +4…+9    | запас    | —               |       |

Внутри контейнеров postgres и redis остаются на 5432/6379 — наружу публикуются
порты блока. `VITE_API_BASE_URL` и CORS выводятся из `BACKEND_PORT`/`FRONTEND_PORT`,
руками их править не нужно.

Команды:

```bash
./scripts/ports.sh          # текущий блок + кто занял порты
./scripts/ports.sh --scan   # какие блоки заняты соседними проектами
./scripts/ports.sh 42200    # перевести проект на блок 42200-42209
```

Для остальных проектов держите тот же принцип: `42000`, `42100`, `42200`, … —
по блоку на проект, `--scan` покажет, какие уже разобраны.

## Первый администратор

- Эндпоинт `GET /api/v1/bootstrap/status` показывает, нужен ли bootstrap первого администратора.
- Эндпоинт `POST /api/v1/bootstrap/admin` создает первого администратора, если таблица users пуста и передан корректный `FIRST_ADMIN_PASS`.

## Что уже заложено

- публичная заявка сохраняется как лид
- расчет стоимости выполняется на frontend и backend по одной формуле
- создана сущность заказа для дальнейшей конвертации лида в заказ и сравнения сметы с фактическими расходами
- коэффициенты вынесены в отдельную таблицу `pricing_configs`

## CI

Workflow в [.github/workflows/ci.yml](.github/workflows/ci.yml) выполняет:

- backend tests
- frontend build
- docker compose config validation
