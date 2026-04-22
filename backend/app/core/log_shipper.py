"""
Background log shipper: POST JSON events to a remote collector when configured.

Set LOG_SHIP_ENDPOINT in the environment (or .env) to your ingest URL.
Leave it empty (default) to disable shipping — no outbound calls are made.
"""
from __future__ import annotations

import json
import logging
import queue
import threading
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

_log = logging.getLogger(__name__)

_queue: "queue.Queue[Optional[Dict[str, Any]]]" = queue.Queue(maxsize=2000)
_thread: Optional[threading.Thread] = None
_stop = threading.Event()


def _ship_url() -> str:
    from app.core.config import settings

    return (getattr(settings, "LOG_SHIP_ENDPOINT", None) or "").strip()


def _worker() -> None:
    while not _stop.is_set():
        try:
            item = _queue.get(timeout=0.5)
        except queue.Empty:
            continue
        if item is None:
            break
        url = _ship_url()
        if not url:
            continue
        try:
            body = json.dumps(item, default=str).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                if resp.status >= 400:
                    _log.debug("log_shipper: remote returned %s", resp.status)
        except urllib.error.URLError as e:
            _log.debug("log_shipper: ship failed: %s", e)
        except Exception as e:  # pragma: no cover
            _log.debug("log_shipper: unexpected: %s", e)


def start_log_shipper_thread() -> None:
    """Start background worker (idempotent)."""
    global _thread
    if _thread is not None and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_worker, name="log-shipper", daemon=True)
    _thread.start()


def stop_log_shipper_thread() -> None:
    """Signal worker to exit (best-effort on shutdown)."""
    global _thread
    _stop.set()
    try:
        _queue.put_nowait(None)
    except queue.Full:
        pass
    t = _thread
    if t is not None and t.is_alive():
        t.join(timeout=2.0)
    _thread = None


def enqueue_log_event(event: Dict[str, Any]) -> None:
    """Non-blocking enqueue; drops if queue is full or LOG_SHIP_ENDPOINT is unset."""
    if not _ship_url():
        return
    try:
        _queue.put_nowait(event)
    except queue.Full:
        _log.debug("log_shipper: queue full, dropping event")
