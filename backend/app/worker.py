from celery import Celery

from app.core.settings import get_settings

settings = get_settings()

celery_app = Celery("sparrow_catering", broker=settings.redis_url, backend=settings.redis_url)
