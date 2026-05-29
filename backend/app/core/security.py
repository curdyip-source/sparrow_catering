from __future__ import annotations

import base64
import hashlib
import hmac
import hashlib
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.db.session import get_db
from app.models.user import User


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_hex, digest_hex = password_hash.split(":", maxsplit=1)
    except ValueError:
        return False

    salt = bytes.fromhex(salt_hex)
    expected_digest = bytes.fromhex(digest_hex)
    actual_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual_digest, expected_digest)


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("utf-8"))


def create_admin_token(user: User) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(hours=settings.admin_token_ttl_hours)
    payload = f"{user.id}:{int(expires_at.timestamp())}:{int(user.is_admin)}"
    signature = hmac.new(
        settings.admin_token_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{_b64encode(payload.encode('utf-8'))}.{_b64encode(signature)}"


def decode_admin_token(token: str) -> dict[str, Any]:
    settings = get_settings()

    try:
        payload_part, signature_part = token.split(".", maxsplit=1)
        payload_raw = _b64decode(payload_part)
        expected_signature = hmac.new(
            settings.admin_token_secret.encode("utf-8"),
            payload_raw,
            hashlib.sha256,
        ).digest()
        actual_signature = _b64decode(signature_part)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")

    if not hmac.compare_digest(actual_signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")

    try:
        user_id_raw, expires_at_raw, is_admin_raw = payload_raw.decode("utf-8").split(":", maxsplit=2)
        user_id = int(user_id_raw)
        expires_at = int(expires_at_raw)
        is_admin = bool(int(is_admin_raw))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")

    if datetime.now(UTC).timestamp() >= expires_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сессия истекла")

    return {"user_id": user_id, "is_admin": is_admin}


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")

    payload = decode_admin_token(credentials.credentials)
    user = db.scalar(select(User).where(User.id == payload["user_id"]))

    if user is None or not user.is_admin or not payload["is_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")

    return user
