import os
import json
import redis
from typing import Any, Optional
from functools import wraps
import hashlib


class RedisCache:
    _redis_client: Optional[redis.Redis] = None

    @classmethod
    def get_client(cls) -> redis.Redis:
        if cls._redis_client is None:
            redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
            cls._redis_client = redis.from_url(redis_url, decode_responses=True)
        return cls._redis_client

    @classmethod
    def get(cls, key: str) -> Any:
        try:
            client = cls.get_client()
            value = client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            print(f"Redis get error: {e}")
        return None

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            client = cls.get_client()
            serialized_value = json.dumps(value, default=str)
            return client.setex(key, ttl, serialized_value)
        except Exception as e:
            print(f"Redis set error: {e}")
            return False

    @classmethod
    def delete(cls, key: str) -> bool:
        try:
            client = cls.get_client()
            return bool(client.delete(key))
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False

    @classmethod
    def clear_pattern(cls, pattern: str) -> int:
        """Clear keys matching a pattern (e.g., 'kpis:*')"""
        try:
            client = cls.get_client()
            keys = client.keys(pattern)
            if keys:
                return client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Redis clear pattern error: {e}")
            return 0


def cache_result(key_prefix: str, ttl: int = 300):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key_parts = [key_prefix, func.__name__]
            
            # Add args to cache key
            for arg in args:
                cache_key_parts.append(str(arg))
            
            # Add kwargs to cache key (sorted for consistency)
            for k, v in sorted(kwargs.items()):
                cache_key_parts.append(f"{k}={v}")
            
            cache_key = ":".join(cache_key_parts)
            
            # Try to get from cache first
            cached_result = RedisCache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Cache miss - execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            RedisCache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


def invalidate_cache_group(group: str):
    """Invalidate all cache keys with a specific prefix"""
    pattern = f"{group}:*"
    cleared_count = RedisCache.clear_pattern(pattern)
    print(f"Cleared {cleared_count} cache keys matching {pattern}")
    return cleared_count
