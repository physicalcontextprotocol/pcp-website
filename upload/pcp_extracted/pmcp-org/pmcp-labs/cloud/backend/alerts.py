"""P-MCP Alert Service - Fleet alerting and notification."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from enum import Enum
import time


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class AlertRule:
    """Rule for automatic alert generation."""
    rule_id: str
    name: str
    condition: str
    severity: AlertSeverity
    enabled: bool = True
    cooldown_seconds: int = 300


@dataclass
class AlertService:
    """Service for managing fleet alerts."""

    _rules: List[AlertRule] = field(default_factory=list)
    _handlers: List[Callable[[Alert], None]] = field(default_factory=list)

    def add_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self._rules.append(rule)

    def register_handler(self, handler: Callable[[Alert], None]):
        """Register an alert handler."""
        self._handlers.append(handler)

    def evaluate_rules(self, robot_data: Dict[str, Any]) -> List[Alert]:
        """Evaluate rules against robot data and generate alerts."""
        alerts = []
        for rule in self._rules:
            if not rule.enabled:
                continue
            if self._evaluate_condition(rule.condition, robot_data):
                alert = Alert(
                    alert_id=f"auto-{rule.rule_id}-{int(time.time())}",
                    robot_id=robot_data.get("robotId"),
                    zone_id=robot_data.get("zoneId"),
                    severity=rule.severity.value,
                    title=rule.name,
                    message=f"Rule triggered: {rule.condition}",
                    source=f"rule:{rule.rule_id}",
                )
                alerts.append(alert)
        return alerts

    def _evaluate_condition(self, condition: str, data: Dict[str, Any]) -> bool:
        """Evaluate a simple condition against data."""
        try:
            parts = condition.split()
            if len(parts) != 3:
                return False
            field, op, value = parts
            actual = data.get(field, 0)
            if op == ">":
                return float(actual) > float(value)
            elif op == "<":
                return float(actual) < float(value)
            elif op == "==":
                return actual == value
            return False
        except:
            return False

    def notify(self, alert: Alert):
        """Notify all handlers of an alert."""
        for handler in self._handlers:
            try:
                handler(alert)
            except Exception:
                pass