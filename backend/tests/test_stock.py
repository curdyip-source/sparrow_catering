from fastapi.testclient import TestClient

from app.core.security import create_admin_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.user import User


def _admin_headers() -> dict[str, str]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.login == "stock_admin").one_or_none()
        if user is None:
            user = User(
                full_name="Stock Admin",
                login="stock_admin",
                password_hash=hash_password("secret123"),
                is_admin=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_admin_token(user)
    finally:
        db.close()
    return {"Authorization": f"Bearer {token}"}


def _create_tobacco(client: TestClient, headers: dict[str, str]) -> int:
    response = client.post(
        "/api/v1/admin/tobacco",
        headers=headers,
        json={
            "strength": "Средний",
            "brand": "TestBrand",
            "flavor_name": "TestFlavor",
            "cost_per_gram": 12.0,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_inventory_writeoff_document_from_shortfall() -> None:
    with TestClient(app) as client:
        headers = _admin_headers()
        tobacco_id = _create_tobacco(client, headers)

        # Приход 100 → списание 30 → остаток 70.
        assert client.post(
            "/api/v1/admin/stock/receipt",
            headers=headers,
            json={"tobacco_id": tobacco_id, "grams": 100},
        ).status_code == 201
        assert client.post(
            "/api/v1/admin/stock/writeoff",
            headers=headers,
            json={"tobacco_id": tobacco_id, "grams": 30},
        ).status_code == 201

        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 70

        # Инвент создаётся пустым; позицию добавляем через поиск.
        session = client.post("/api/v1/admin/inventories", headers=headers, json={}).json()
        assert session["lines"] == []
        added = client.post(
            f"/api/v1/admin/inventories/{session['id']}/lines",
            headers=headers,
            json={"tobacco_id": tobacco_id},
        )
        assert added.status_code == 201, added.text
        session = added.json()
        line = next(item for item in session["lines"] if item["tobacco_id"] == tobacco_id)
        assert line["expected_grams"] == 70

        # Повторное добавление той же позиции запрещено.
        dup_line = client.post(
            f"/api/v1/admin/inventories/{session['id']}/lines",
            headers=headers,
            json={"tobacco_id": tobacco_id},
        )
        assert dup_line.status_code == 409

        patched = client.patch(
            f"/api/v1/admin/inventories/{session['id']}/lines/{line['id']}",
            headers=headers,
            json={"counted_grams": 50},
        ).json()
        assert patched["diff_grams"] == -20

        # Из инвента создаём документ списания на недостачу 20 г.
        doc_resp = client.post(
            f"/api/v1/admin/inventories/{session['id']}/documents",
            headers=headers,
            json={"kind": "writeoff", "lines": [{"tobacco_id": tobacco_id, "grams": 20}]},
        )
        assert doc_resp.status_code == 201, doc_resp.text
        detail = doc_resp.json()
        assert len(detail["documents"]) == 1
        assert detail["documents"][0]["kind"] == "writeoff"
        assert detail["documents"][0]["lines"][0]["grams"] == 20

        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 50
        assert stock[tobacco_id]["stock_value"] == 50 * 12.0

        # Разрешён ещё один документ того же типа (например, добавили позиции после первого).
        second = client.post(
            f"/api/v1/admin/inventories/{session['id']}/documents",
            headers=headers,
            json={"kind": "writeoff", "lines": [{"tobacco_id": tobacco_id, "grams": 5}]},
        )
        assert second.status_code == 201, second.text
        second_id = second.json()["documents"][-1]["id"]
        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 45

        # Удаление документа откатывает его движения — остаток восстанавливается.
        removed = client.delete(f"/api/v1/admin/stock/documents/{second_id}", headers=headers)
        assert removed.status_code == 204
        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 50

        # Пакетное сохранение пересчёта не двигает остаток (его двигают документы).
        saved = client.post(
            f"/api/v1/admin/inventories/{session['id']}/save",
            headers=headers,
            json={"lines": [{"line_id": line["id"], "counted_grams": 50}]},
        )
        assert saved.status_code == 200
        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 50


def test_inventory_receipt_document_sets_cost() -> None:
    with TestClient(app) as client:
        headers = _admin_headers()
        # без себестоимости в каталоге
        resp = client.post(
            "/api/v1/admin/tobacco",
            headers=headers,
            json={"strength": "Лёгкий", "brand": "B2", "flavor_name": "F2"},
        )
        tobacco_id = resp.json()["id"]

        session = client.post("/api/v1/admin/inventories", headers=headers, json={}).json()
        session = client.post(
            f"/api/v1/admin/inventories/{session['id']}/lines",
            headers=headers,
            json={"tobacco_id": tobacco_id},
        ).json()
        # Оприходование 200 г по 7 ₽/г из инвента.
        client.post(
            f"/api/v1/admin/inventories/{session['id']}/documents",
            headers=headers,
            json={"kind": "receipt", "lines": [{"tobacco_id": tobacco_id, "grams": 200, "cost_per_gram": 7}]},
        )
        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 200
        assert stock[tobacco_id]["cost_per_gram"] == 7
        assert stock[tobacco_id]["stock_value"] == 200 * 7


def test_standalone_document_and_registry() -> None:
    with TestClient(app) as client:
        headers = _admin_headers()
        tobacco_id = _create_tobacco(client, headers)

        # Оприходование без инвентаризации.
        created = client.post(
            "/api/v1/admin/stock/documents",
            headers=headers,
            json={"kind": "receipt", "lines": [{"tobacco_id": tobacco_id, "grams": 300, "cost_per_gram": 5}]},
        )
        assert created.status_code == 201, created.text
        doc = created.json()
        assert doc["inventory_session_id"] is None
        assert doc["lines"][0]["grams"] == 300

        stock = {row["tobacco_id"]: row for row in client.get("/api/v1/admin/stock", headers=headers).json()}
        assert stock[tobacco_id]["balance_grams"] == 300

        # Реестр содержит созданный документ.
        registry = client.get("/api/v1/admin/stock/documents", headers=headers).json()
        assert any(d["id"] == doc["id"] and d["kind"] == "receipt" for d in registry)


def test_inventory_counted_from_tare_and_gross() -> None:
    with TestClient(app) as client:
        headers = _admin_headers()
        tobacco_id = _create_tobacco(client, headers)

        session = client.post("/api/v1/admin/inventories", headers=headers, json={}).json()
        session = client.post(
            f"/api/v1/admin/inventories/{session['id']}/lines",
            headers=headers,
            json={"tobacco_id": tobacco_id},
        ).json()
        line = next(item for item in session["lines"] if item["tobacco_id"] == tobacco_id)

        # Тара 20 + брутто 95 → нетто 75.
        patched = client.patch(
            f"/api/v1/admin/inventories/{session['id']}/lines/{line['id']}",
            headers=headers,
            json={"tare_weight": 20, "gross_weight": 95},
        ).json()
        assert patched["counted_grams"] == 75
