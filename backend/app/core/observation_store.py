import json
import logging
from collections import deque
from typing import List, Dict, Any, Optional
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Constants
REDIS_KEY = "observation:logs"
MAX_LOGS = 1000

class ObservationStore:
    """
    Storage layer for API observation logs.
    Uses Redis as primary store and an in-memory deque as fallback.
    """
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._fallback_store: deque = deque(maxlen=MAX_LOGS)
        self._redis_connected = False

    async def _get_redis(self) -> Optional[redis.Redis]:
        """Lazy initialization of Redis connection"""
        if self._redis_connected:
            return self._redis
        
        try:
            self._redis = redis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            self._redis_connected = True
            logger.info("ObservationStore connected to Redis")
            return self._redis
        except Exception as e:
            self._redis_connected = False
            self._redis = None
            logger.warning(f"ObservationStore failed to connect to Redis, using in-memory fallback: {e}")
            return None

    async def push_log(self, entry: Dict[str, Any]) -> None:
        """Add a new log entry to the store"""
        json_entry = json.dumps(entry)
        
        # Try Redis first
        r = await self._get_redis()
        if r:
            try:
                # LPUSH and LTRIM to maintain a capped list
                async with r.pipeline(transaction=True) as pipe:
                    await pipe.lpush(REDIS_KEY, json_entry)
                    await pipe.ltrim(REDIS_KEY, 0, MAX_LOGS - 1)
                    await pipe.execute()
                return
            except Exception as e:
                logger.error(f"Error pushing log to Redis: {e}")
                self._redis_connected = False

        # Fallback to in-memory
        self._fallback_store.appendleft(entry)

    async def get_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve the last N log entries"""
        limit = min(limit, MAX_LOGS)
        
        # Try Redis first
        r = await self._get_redis()
        if r:
            try:
                raw_logs = await r.lrange(REDIS_KEY, 0, limit - 1)
                return [json.loads(log) for log in raw_logs]
            except Exception as e:
                logger.error(f"Error retrieving logs from Redis: {e}")
                self._redis_connected = False

        # Fallback to in-memory
        return list(self._fallback_store)[:limit]

# Global singleton instance
observation_store = ObservationStore()
