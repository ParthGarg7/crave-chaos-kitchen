"""
CRAVE Log Shipper -- RabbitMQ Publisher

Publishes observation log events to Niramay's RabbitMQ
queue component-c-logs on the selfhealing-network.

Publishing is controlled by two conditions; both must
be true for any log to be sent:
  1. RABBITMQ_HOST is set and non-empty in config
  2. EITHER the env var NIRAMAY_PUBLISH_ENABLED=true
     OR the Redis key crave:rabbitmq:enabled == "1"

The env var override (NIRAMAY_PUBLISH_ENABLED=true) allows
enabling publishing at container startup without needing
a manual Redis key set. The Redis key remains supported
for runtime enable/disable without restart.

When either condition is false no connection is made
and no logs are sent. This allows the pipeline to be
enabled and disabled at runtime without restart.

The worker thread runs continuously but only connects
to RabbitMQ when publishing is enabled. If RabbitMQ
is unreachable it retries with exponential backoff
up to 60 seconds between attempts. Connection errors
are logged at WARNING level so they are visible during
development without being noisy.
"""
from __future__ import annotations

import json
import logging
import os
import queue
import threading
import time
from typing import Any, Dict, Optional

_log = logging.getLogger(__name__)

_queue: "queue.Queue[Optional[Dict[str, Any]]]" = \
    queue.Queue(maxsize=2000)
_thread: Optional[threading.Thread] = None
_stop = threading.Event()

# Module-level connection state
_connection = None
_channel = None
_connected = False
_retry_delay = 1.0


def _get_settings():
    from app.core.config import settings
    return settings


def _is_publishing_enabled() -> bool:
    """
    Check conditions required for publishing:
    1. RABBITMQ_HOST is configured (non-empty)
    2. Redis key crave:rabbitmq:enabled determines the state:
       - "0" → disabled (always respected, even if env var is true)
       - "1" → enabled
       - absent → fall back to NIRAMAY_PUBLISH_ENABLED env var

    The Redis key is the runtime toggle controlled by the UI.
    The env var is ONLY a fallback default when no Redis key exists.
    """
    settings = _get_settings()
    host = (getattr(settings, "RABBITMQ_HOST", None) or "").strip()
    if not host:
        return False

    try:
        import redis as redis_sync
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        val = r.get("crave:rabbitmq:enabled")
        if val is not None:
            # Redis key exists — it is the authoritative source
            return val == "1"
    except Exception:
        pass

    # No Redis key set yet — fall back to env var default
    return os.getenv("NIRAMAY_PUBLISH_ENABLED", "").lower() == "true"


def _connect() -> bool:
    """
    Attempt to connect to RabbitMQ.
    Returns True on success, False on failure.
    """
    global _connection, _channel, _connected
    try:
        import pika
        settings = _get_settings()
        credentials = pika.PlainCredentials(
            settings.RABBITMQ_USER,
            settings.RABBITMQ_PASSWORD,
        )
        params = pika.ConnectionParameters(
            host=settings.RABBITMQ_HOST,
            port=settings.RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300,
            connection_attempts=1,
            socket_timeout=5,
        )
        _connection = pika.BlockingConnection(params)
        _channel = _connection.channel()
        _channel.queue_declare(
            queue=settings.RABBITMQ_QUEUE,
            durable=True,
        )
        _connected = True
        _log.info(
            "log_shipper: connected to RabbitMQ at %s queue=%s",
            settings.RABBITMQ_HOST,
            settings.RABBITMQ_QUEUE,
        )
        return True
    except Exception as e:
        _connected = False
        _connection = None
        _channel = None
        _log.warning("log_shipper: RabbitMQ connect failed: %s", e)
        return False


def _disconnect() -> None:
    """Close RabbitMQ connection cleanly."""
    global _connection, _channel, _connected
    _connected = False
    _channel = None
    try:
        if _connection and not _connection.is_closed:
            _connection.close()
    except Exception:
        pass
    _connection = None


def _publish(event: Dict[str, Any]) -> bool:
    """
    Publish a single event to RabbitMQ.
    Returns True on success, False on failure.
    The event is stripped of the internal source field
    before publishing so Niramay receives clean logs.
    """
    global _channel
    try:
        import pika
        settings = _get_settings()

        # Remove internal fields Niramay does not need
        payload = {k: v for k, v in event.items() if k != "source"}

        body = json.dumps(payload, default=str).encode()
        _channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=body,
            properties=pika.BasicProperties(
                delivery_mode=2,  # persistent message
                content_type="application/json",
            ),
        )
        return True
    except Exception as e:
        _log.warning("log_shipper: publish failed: %s", e)
        _disconnect()
        return False


def _worker() -> None:
    """
    Background worker thread.
    Drains the queue and publishes to RabbitMQ when
    publishing is enabled. When disabled it drains
    the queue silently to prevent memory buildup.
    Uses exponential backoff on connection failures.
    """
    global _retry_delay

    while not _stop.is_set():
        try:
            item = _queue.get(timeout=0.5)
        except queue.Empty:
            # Periodically check if we should disconnect
            # when publishing gets disabled
            if _connected and not _is_publishing_enabled():
                _log.info(
                    "log_shipper: publishing disabled, disconnecting"
                )
                _disconnect()
            continue

        if item is None:
            break

        # Check if publishing is enabled
        if not _is_publishing_enabled():
            # Drain silently -- do not publish
            continue

        # Ensure we have a connection
        if not _connected:
            if not _connect():
                # Put item back and wait before retry
                try:
                    _queue.put_nowait(item)
                except queue.Full:
                    pass
                time.sleep(min(_retry_delay, 60.0))
                _retry_delay = min(_retry_delay * 2, 60.0)
                continue
            _retry_delay = 1.0  # reset on success

        # Publish the event
        if not _publish(item):
            # Connection lost -- put item back and retry
            try:
                _queue.put_nowait(item)
            except queue.Full:
                pass
            time.sleep(min(_retry_delay, 60.0))
            _retry_delay = min(_retry_delay * 2, 60.0)


def start_log_shipper_thread() -> None:
    """Start background worker (idempotent)."""
    global _thread
    if _thread is not None and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(
        target=_worker,
        name="log-shipper",
        daemon=True,
    )
    _thread.start()
    _log.info("log_shipper: worker thread started")


def stop_log_shipper_thread() -> None:
    """Signal worker to exit (best-effort on shutdown)."""
    global _thread
    _stop.set()
    _disconnect()
    try:
        _queue.put_nowait(None)
    except queue.Full:
        pass
    t = _thread
    if t is not None and t.is_alive():
        t.join(timeout=2.0)
    _thread = None


def enqueue_log_event(event: Dict[str, Any]) -> None:
    """
    Non-blocking enqueue.
    Drops silently if queue is full OR publishing is disabled.
    The early gate prevents events from accumulating in the
    in-memory queue when the toggle is OFF.
    """
    if not _is_publishing_enabled():
        return
    try:
        _queue.put_nowait(event)
    except queue.Full:
        _log.debug("log_shipper: queue full, dropping")
