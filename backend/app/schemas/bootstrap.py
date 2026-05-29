from pydantic import BaseModel, Field


class BootstrapStatus(BaseModel):
    needs_admin: bool
    secret_configured: bool


class BootstrapAdminCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    login: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    admin_secret: str = Field(min_length=1, max_length=255)
