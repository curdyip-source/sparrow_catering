from __future__ import annotations

import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from app.core.settings import get_settings


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url)

    for attempt in range(30):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database is ready")
            return
        except OperationalError:
            if attempt == 29:
                raise
            print("Waiting for database...")
            time.sleep(2)


if __name__ == "__main__":
    main()