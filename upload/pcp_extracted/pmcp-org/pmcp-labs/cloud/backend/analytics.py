#!/usr/bin/env python3
"""
P-MCP Analytics Service
=======================

Provides analytics, reporting, and data aggregation for fleet operations.

Usage:
    python -m cloud.backend.analytics
"""

import asyncio
import hashlib
import json
import logging
import time
import uuid
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from collections import defaultdict
from enum import Enum
import statistics

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s [%(name)s] %(message)s'
)
logger = logging.getLogger("pmcp-analytics")


class MetricType(Enum):
    """Types of metrics tracked."""
    HEALTH = "health"
    UPTIME = "uptime"
    BATTERY = "battery"
    TEMPERATURE = "temperature"
    VELOCITY = "velocity"
    POSITION = "position"
    TASK_COMPLETION = "task_completion"
    ERROR_RATE = "error_rate"
    NETWORK_LATENCY = "network_latency"


class AggregationType(Enum):
    """Aggregation functions."""
    AVG = "avg"
    SUM = "sum"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    MEDIAN = "median"
    STDDEV = "stddev"
    PERCENTILE_95 = "p95"
    PERCENTILE_99 = "p99"


@dataclass
class MetricPoint:
    """A single metric data point."""
    metric_id: str
    robot_id: str
    metric_type: str
    value: float
    unit: str
    timestamp: float
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class TimeSeries:
    """Time series data container."""
    metric_type: str
    robot_id: str
    start_time: float
    end_time: float
    interval: int
    points: List[MetricPoint] = field(default_factory=list)
    aggregated_values: Dict[str, float] = field(default_factory=dict)


@dataclass
class Report:
    """Analytics report."""
    report_id: str
    report_type: str
    title: str
    description: str
    generated_at: float
    period_start: float
    period_end: float
    data: Dict[str, Any] = field(default_factory=dict)
    charts: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class Dashboard:
    """Dashboard configuration."""
    dashboard_id: str
    name: str
    description: str
    panels: List[Dict[str, Any]] = field(default_factory=list)
    refresh_interval: int = 60
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    created_by: str = "system"


class AnalyticsEngine:
    """Analytics processing engine."""

    def __init__(self):
        self._metrics: Dict[str, List[MetricPoint]] = defaultdict(list)
        self._reports: Dict[str, Report] = {}
        self._dashboards: Dict[str, Dashboard] = {}
        self._lock = threading.RLock()
        self._aggregation_cache: Dict[str, Dict[str, float]] = {}
        self._cleanup_interval = 3600
        self._running = False
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the analytics engine."""
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Analytics engine started")

    async def stop(self):
        """Stop the analytics engine."""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
        logger.info("Analytics engine stopped")

    async def _cleanup_loop(self):
        """Background cleanup of old metrics."""
        while self._running:
            await asyncio.sleep(self._cleanup_interval)
            self._cleanup_old_metrics()

    def _cleanup_old_metrics(self):
        """Remove metrics older than 7 days."""
        cutoff = time.time() - (7 * 24 * 3600)
        with self._lock:
            for metric_id in list(self._metrics.keys()):
                self._metrics[metric_id] = [
                    p for p in self._metrics[metric_id]
                    if p.timestamp > cutoff
                ]
                if not self._metrics[metric_id]:
                    del self._metrics[metric_id]

    def record_metric(
        self,
        robot_id: str,
        metric_type: str,
        value: float,
        unit: str = "",
        tags: Optional[Dict[str, str]] = None
    ) -> MetricPoint:
        """Record a metric data point."""
        metric_id = f"{robot_id}:{metric_type}"
        point = MetricPoint(
            metric_id=metric_id,
            robot_id=robot_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            timestamp=time.time(),
            tags=tags or {}
        )

        with self._lock:
            self._metrics[metric_id].append(point)

        return point

    def get_metrics(
        self,
        robot_id: str,
        metric_type: str,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> List[MetricPoint]:
        """Get metrics for a robot and type within a time range."""
        metric_id = f"{robot_id}:{metric_type}"
        with self._lock:
            points = self._metrics.get(metric_id, [])

        if start_time:
            points = [p for p in points if p.timestamp >= start_time]
        if end_time:
            points = [p for p in points if p.timestamp <= end_time]

        return points

    def aggregate(
        self,
        robot_id: str,
        metric_type: str,
        start_time: float,
        end_time: float,
        agg_type: AggregationType = AggregationType.AVG
    ) -> float:
        """Aggregate metrics over a time range."""
        points = self.get_metrics(robot_id, metric_type, start_time, end_time)
        if not points:
            return 0.0

        values = [p.value for p in points]

        switch = {
            AggregationType.AVG: lambda: statistics.mean(values),
            AggregationType.SUM: lambda: sum(values),
            AggregationType.MIN: lambda: min(values),
            AggregationType.MAX: lambda: max(values),
            AggregationType.COUNT: lambda: len(values),
            AggregationType.MEDIAN: lambda: statistics.median(values),
            AggregationType.STDDEV: lambda: statistics.stdev(values) if len(values) > 1 else 0.0,
            AggregationType.PERCENTILE_95: lambda: self._percentile(values, 95),
            AggregationType.PERCENTILE_99: lambda: self._percentile(values, 99),
        }

        return switch[agg_type]()

    def _percentile(self, values: List[float], p: float) -> float:
        """Calculate percentile of values."""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        idx = int(len(sorted_values) * p / 100)
        idx = min(idx, len(sorted_values) - 1)
        return sorted_values[idx]

    def generate_fleet_summary(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Generate fleet-wide summary statistics."""
        summary = {
            "period": {
                "start": start_time,
                "end": end_time,
                "duration": end_time - start_time,
            },
            "robots": {},
            "aggregates": {},
        }

        robot_metrics: Dict[str, List[float]] = defaultdict(list)

        with self._lock:
            for metric_id, points in self._metrics.items():
                robot_id = metric_id.split(":")[0]
                metric_type = metric_id.split(":")[1]

                filtered = [
                    p for p in points
                    if start_time <= p.timestamp <= end_time
                ]

                if filtered:
                    avg = statistics.mean([p.value for p in filtered])
                    robot_metrics[f"{robot_id}:{metric_type}"].append(avg)

        for key, values in robot_metrics.items():
            if values:
                summary["aggregates"][key] = {
                    "avg": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values),
                }

        return summary

    def generate_robot_report(
        self,
        robot_id: str,
        start_time: float,
        end_time: float
    ) -> Report:
        """Generate a detailed report for a specific robot."""
        metrics_by_type: Dict[str, List[MetricPoint]] = defaultdict(list)

        for metric_type in MetricType:
            points = self.get_metrics(robot_id, metric_type.value, start_time, end_time)
            metrics_by_type[metric_type.value] = points

        report_data = {
            "robot_id": robot_id,
            "metrics": {},
            "summary": {},
        }

        for metric_type, points in metrics_by_type.items():
            if not points:
                continue

            values = [p.value for p in points]
            report_data["metrics"][metric_type] = {
                "count": len(values),
                "avg": statistics.mean(values),
                "min": min(values),
                "max": max(values),
                "median": statistics.median(values),
                "stddev": statistics.stdev(values) if len(values) > 1 else 0.0,
            }

        avg_health = report_data["metrics"].get("health", {}).get("avg", 0)
        avg_uptime = report_data["metrics"].get("uptime", {}).get("avg", 0)

        report_data["summary"] = {
            "overall_health": avg_health,
            "overall_uptime": avg_uptime,
            "total_metrics": sum(m["count"] for m in report_data["metrics"].values()),
        }

        report = Report(
            report_id=f"report-{uuid.uuid4().hex[:8]}",
            report_type="robot_summary",
            title=f"Robot Report: {robot_id}",
            description=f"Performance report for robot {robot_id}",
            generated_at=time.time(),
            period_start=start_time,
            period_end=end_time,
            data=report_data,
        )

        with self._lock:
            self._reports[report.report_id] = report

        return report

    def generate_fleet_report(self, start_time: float, end_time: float) -> Report:
        """Generate a fleet-wide performance report."""
        summary = self.generate_fleet_summary(start_time, end_time)

        robot_health = []
        for key, value in summary["aggregates"].items():
            if ":health" in key:
                robot_health.append(value.get("avg", 0))

        fleet_health = statistics.mean(robot_health) if robot_health else 0

        report_data = {
            "fleet_summary": summary,
            "fleet_health": fleet_health,
            "total_robots": len(robot_health),
        }

        report = Report(
            report_id=f"report-{uuid.uuid4().hex[:8]}",
            report_type="fleet_summary",
            title="Fleet Performance Report",
            description="Overall fleet performance and health metrics",
            generated_at=time.time(),
            period_start=start_time,
            period_end=end_time,
            data=report_data,
        )

        with self._lock:
            self._reports[report.report_id] = report

        return report

    def create_dashboard(
        self,
        name: str,
        description: str = "",
        panels: Optional[List[Dict[str, Any]]] = None
    ) -> Dashboard:
        """Create a new dashboard."""
        dashboard = Dashboard(
            dashboard_id=f"dash-{uuid.uuid4().hex[:8]}",
            name=name,
            description=description,
            panels=panels or [],
        )

        with self._lock:
            self._dashboards[dashboard.dashboard_id] = dashboard

        return dashboard

    def get_dashboard(self, dashboard_id: str) -> Optional[Dashboard]:
        """Get a dashboard by ID."""
        with self._lock:
            return self._dashboards.get(dashboard_id)

    def list_dashboards(self) -> List[Dashboard]:
        """List all dashboards."""
        with self._lock:
            return list(self._dashboards.values())

    def get_report(self, report_id: str) -> Optional[Report]:
        """Get a report by ID."""
        with self._lock:
            return self._reports.get(report_id)

    def list_reports(self) -> List[Report]:
        """List all reports."""
        with self._lock:
            return list(self._reports.values())

    def get_trends(
        self,
        robot_id: str,
        metric_type: str,
        window: int = 3600,
        points: int = 10
    ) -> Dict[str, Any]:
        """Calculate trend data for a metric."""
        end_time = time.time()
        start_time = end_time - (window * points)

        points_data = self.get_metrics(robot_id, metric_type, start_time, end_time)

        if not points_data:
            return {"trend": "stable", "change": 0, "data": []}

        interval = window // points
        buckets: Dict[int, List[float]] = defaultdict(list)

        for p in points_data:
            bucket = int((p.timestamp - start_time) // interval)
            buckets[bucket].append(p.value)

        averages = []
        for i in range(points):
            if i in buckets:
                averages.append(statistics.mean(buckets[i]))
            else:
                averages.append(0)

        if len(averages) >= 2:
            first_half = statistics.mean(averages[:len(averages)//2])
            second_half = statistics.mean(averages[len(averages)//2:])
            change = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0

            if change > 5:
                trend = "increasing"
            elif change < -5:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "stable"
            change = 0

        return {
            "trend": trend,
            "change": change,
            "data": averages,
            "window": window,
            "points": points,
        }


class AlertAnalytics:
    """Analytics for alert patterns and trends."""

    def __init__(self, analytics: AnalyticsEngine):
        self.analytics = analytics
        self._alert_history: List[Dict[str, Any]] = []
        self._lock = threading.RLock()

    def record_alert(
        self,
        robot_id: str,
        severity: str,
        alert_type: str,
        message: str
    ):
        """Record an alert for analysis."""
        with self._lock:
            self._alert_history.append({
                "alert_id": f"alert-{uuid.uuid4().hex[:8]}",
                "robot_id": robot_id,
                "severity": severity,
                "type": alert_type,
                "message": message,
                "timestamp": time.time(),
            })

    def get_alert_rate(
        self,
        robot_id: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> float:
        """Calculate alert rate per hour."""
        with self._lock:
            alerts = self._alert_history

        if robot_id:
            alerts = [a for a in alerts if a["robot_id"] == robot_id]
        if start_time:
            alerts = [a for a in alerts if a["timestamp"] >= start_time]
        if end_time:
            alerts = [a for a in alerts if a["timestamp"] <= end_time]

        if not alerts:
            return 0.0

        time_range = (alerts[-1]["timestamp"] - alerts[0]["timestamp"]) / 3600
        if time_range <= 0:
            time_range = 1

        return len(alerts) / time_range

    def get_most_common_alerts(
        self,
        limit: int = 10,
        start_time: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Get the most common alert types."""
        with self._lock:
            alerts = self._alert_history

        if start_time:
            alerts = [a for a in alerts if a["timestamp"] >= start_time]

        counts: Dict[str, int] = defaultdict(int)
        for alert in alerts:
            key = f"{alert['type']}:{alert['severity']}"
            counts[key] += 1

        sorted_alerts = sorted(counts.items(), key=lambda x: x[1], reverse=True)

        return [
            {"type": k.split(":")[0], "severity": k.split(":")[1], "count": v}
            for k, v in sorted_alerts[:limit]
        ]

    def get_robots_with_most_alerts(
        self,
        limit: int = 10,
        start_time: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Get robots with the most alerts."""
        with self._lock:
            alerts = self._alert_history

        if start_time:
            alerts = [a for a in alerts if a["timestamp"] >= start_time]

        counts: Dict[str, int] = defaultdict(int)
        for alert in alerts:
            counts[alert["robot_id"]] += 1

        sorted_robots = sorted(counts.items(), key=lambda x: x[1], reverse=True)

        return [
            {"robot_id": k, "alert_count": v}
            for k, v in sorted_robots[:limit]
        ]


class PerformanceAnalyzer:
    """Analyze robot and fleet performance."""

    def __init__(self, analytics: AnalyticsEngine):
        self.analytics = analytics

    def calculate_availability(
        self,
        robot_id: str,
        start_time: float,
        end_time: float
    ) -> float:
        """Calculate robot availability percentage."""
        metrics = self.analytics.get_metrics(robot_id, "uptime", start_time, end_time)
        if not metrics:
            return 0.0

        online_points = sum(1 for m in metrics if m.value > 0)
        return (online_points / len(metrics)) * 100 if metrics else 0.0

    def calculate_mtbf(
        self,
        robot_id: str,
        start_time: float,
        end_time: float
    ) -> float:
        """Calculate Mean Time Between Failures (MTBF)."""
        errors = self.analytics.get_metrics(robot_id, "error_rate", start_time, end_time)
        if not errors or sum(e.value for e in errors) == 0:
            return 0.0

        uptime_metrics = self.analytics.get_metrics(robot_id, "uptime", start_time, end_time)
        total_time = end_time - start_time

        error_count = sum(e.value for e in errors)
        return total_time / error_count if error_count > 0 else 0.0

    def analyze_task_performance(
        self,
        robot_id: str,
        start_time: float,
        end_time: float
    ) -> Dict[str, Any]:
        """Analyze task completion performance."""
        tasks = self.analytics.get_metrics(robot_id, "task_completion", start_time, end_time)

        if not tasks:
            return {
                "total_tasks": 0,
                "completed": 0,
                "failed": 0,
                "success_rate": 0.0,
                "avg_duration": 0.0,
            }

        completed = sum(1 for t in tasks if t.value == 1)
        failed = sum(1 for t in tasks if t.value == 0)
        total = len(tasks)

        return {
            "total_tasks": total,
            "completed": completed,
            "failed": failed,
            "success_rate": (completed / total * 100) if total > 0 else 0.0,
            "avg_duration": statistics.mean([t.value for t in tasks]) if tasks else 0.0,
        }


async def main():
    """Run analytics service."""
    engine = AnalyticsEngine()
    await engine.start()

    engine.record_metric("robot-001", "health", 95.0, "%")
    engine.record_metric("robot-001", "battery", 85.0, "%")
    engine.record_metric("robot-001", "temperature", 45.0, "C")

    report = engine.generate_fleet_report(
        start_time=time.time() - 3600,
        end_time=time.time()
    )
    logger.info(f"Generated report: {report.report_id}")

    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())