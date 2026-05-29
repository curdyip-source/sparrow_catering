from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.settings import get_settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.bootstrap import BootstrapAdminCreate, BootstrapStatus

router = APIRouter(prefix="/bootstrap")
settings = get_settings()


@router.get("/status", response_model=BootstrapStatus)
def bootstrap_status(db: Session = Depends(get_db)) -> BootstrapStatus:
    has_users = db.scalar(select(User.id).limit(1)) is not None
    return BootstrapStatus(needs_admin=not has_users, secret_configured=bool(settings.first_admin_pass))


@router.post("/admin", status_code=status.HTTP_201_CREATED)
def create_first_admin(payload: BootstrapAdminCreate, db: Session = Depends(get_db)) -> dict[str, str]:
    if db.scalar(select(User.id).limit(1)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Первый администратор уже создан")

    if not settings.first_admin_pass:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="FIRST_ADMIN_PASS не настроен")

    if payload.admin_secret != settings.first_admin_pass:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Неверный пароль администратора")

    admin = User(
        full_name=payload.full_name,
        login=payload.login,
        password_hash=hash_password(payload.password),
        is_admin=True,
    )
    db.add(admin)
    db.commit()

    return {"status": "created"}
