"""P-MCP Audit Service - Audit logging and compliance."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
import time
import hashlib


class AuditAction(Enum):
    """Audit action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    COMMAND = "command"
    CONFIG_CHANGE = "config_change"


@dataclass
class AuditEvent:
    """Audit event record."""

    def __init__(
        self,
        action: str,
        actor: str,
        target_type: str,
        target_id: str,
        details: Dict[str, Any] = None,
        ip_address: str = "",
    ):
        self.event_id = f"audit-{hashlib.sha256(f'{action}{target_id}{time.time()}'.encode()).hexdigest()[:16]}"
        self.timestamp = time.time()
        self.action = action
        self.actor = actor
        self.target_type = target_type
        self.target_id = target_id
        self.details = details or {}
        self.ip_address = ip_address


@dataclass
class AuditService:
    """Service for audit logging."""

    _events: List[AuditEvent] = field(default_factory=list)
    _max_events: int = 100000

    def log(self, event: AuditEvent):
        """Log an audit event."""
        self._events.append(event)
        if len(self._events) > self._max_events:
            self._events = self._events[-self._max_events // 2:]

    def query(
        self,
        action: Optional[str] = None,
        actor: Optional[str] = None,
        target_type: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 100,
    ) -> List[AuditEvent]:
        """Query audit events."""
        results = self._events
        if action:
            results = [e for e in results if e.action == action]
        if actor:
            results = [e for e in results if e.actor == actor]
        if target_type:
            results = [e for e in results if e.target_type == target_type]
        if start_time:
            results = [e for e in results if e.timestamp >= start_time]
        if end_time:
            results = [e for e in results if e.timestamp <= end_time]
        return results[-limit:]

    def get_compliance_report(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Generate compliance report."""
        events = self.query(start_time=start_time, end_time=end_time, limit=100000)
        return {
            "period": {"start": start_time, "end": end_time},
            "totalEvents": len(events),
            "byAction": self._count_by_field(events, "action"),
            "byActor": self._count_by_field(events, "actor"),
            "byTargetType": self._count_by_field(events, "target_type"),
        }

    def _count_by_field(self, events: List[AuditEvent], field: str) -> Dict[str, int]:
        counts = {}
        for e in events:
            key = getattr(e, field, "unknown")
            counts[key] = counts.get(key, 0) + 1
        return counts