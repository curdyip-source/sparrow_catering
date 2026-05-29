from fastapi import APIRouter

from app.api.routes.admin import router as admin_router
from app.api.routes.bootstrap import router as bootstrap_router
from app.api.routes.public import router as public_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(admin_router)
api_router.include_router(bootstrap_router, tags=["bootstrap"])
api_router.include_router(public_router, tags=["public"])
