"""
Base Healing Strategy

Abstract base class for all healing strategies.
Provides _success() and _failure() helpers that return
consistently structured result dicts.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseHealingStrategy(ABC):
    """Base class all healing strategies must inherit from."""

    @abstractmethod
    async def execute(
        self, machine_alert: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the healing action. Must return a result dict."""
        ...

    def _success(
        self,
        healing_action: str,
        message: str,
        service: str,
        container_restarted: Any,
        scenarios_disabled: list,
        **extra,
    ) -> Dict[str, Any]:
        return {
            "status": "success",
            "healing_action": healing_action,
            "message": message,
            "service": service,
            "container_restarted": container_restarted,
            "scenarios_disabled": scenarios_disabled,
            **extra,
        }

    def _failure(
        self,
        healing_action: str,
        message: str,
        error: str,
        service: str,
        container_restarted: Any,
        scenarios_disabled: list,
        **extra,
    ) -> Dict[str, Any]:
        return {
            "status": "failed",
            "healing_action": healing_action,
            "message": message,
            "error": error,
            "service": service,
            "container_restarted": container_restarted,
            "scenarios_disabled": scenarios_disabled,
            **extra,
        }
