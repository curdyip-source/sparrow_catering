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
2. Запустите проект: `docker compose up --build`.
3. Откройте frontend на `http://localhost:5173`.
4. Проверьте backend health на `http://localhost:8000/health`.

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
