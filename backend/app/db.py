import os
from urllib.parse import urlparse
from typing import Optional
import aiomysql


class MySQLPool:
    _pool: Optional[aiomysql.Pool] = None

    @classmethod
    async def create_pool(cls) -> aiomysql.Pool:
        if cls._pool is not None:
            return cls._pool

        db_url = os.getenv("DB_URL")
        if db_url:
            parsed = urlparse(db_url)
            user = parsed.username or os.getenv("MYSQL_USER", "traffic")
            password = parsed.password or os.getenv("MYSQL_PASSWORD", "changeme")
            host = parsed.hostname or os.getenv("MYSQL_HOST", "mysql")
            port = parsed.port or int(os.getenv("MYSQL_PORT", "3306"))
            db = (parsed.path or "/traffic").lstrip("/")
        else:
            user = os.getenv("MYSQL_USER", "traffic")
            password = os.getenv("MYSQL_PASSWORD", "changeme")
            host = os.getenv("MYSQL_HOST", "mysql")
            port = int(os.getenv("MYSQL_PORT", "3306"))
            db = os.getenv("MYSQL_DATABASE", "traffic")

        cls._pool = await aiomysql.create_pool(
            host=host,
            port=port,
            user=user,
            password=password,
            db=db,
            minsize=1,
            maxsize=5,
            autocommit=True,
            charset="utf8mb4",
        )
        return cls._pool

    @classmethod
    async def close_pool(cls) -> None:
        if cls._pool is not None:
            cls._pool.close()
            await cls._pool.wait_closed()
            cls._pool = None


