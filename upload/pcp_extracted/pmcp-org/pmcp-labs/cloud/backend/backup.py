#!/usr/bin/env python3
"""
P-MCP Backup and Restore Service
==================================

Backup and restore fleet data.

Usage:
    python -m cloud.backend.backup
"""

import asyncio
import gzip
import hashlib
import json
import logging
import os
import shutil
import time
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s [%(name)s] %(message)s')
logger = logging.getLogger("pmcp-backup")


@dataclass
class BackupMetadata:
    """Backup metadata."""
    backup_id: str
    created_at: float
    size_bytes: int
    checksum: str
    includes_robots: bool
    includes_alerts: bool
    includes_tasks: bool
    includes_zones: bool


@dataclass
class Backup:
    """A backup instance."""
    metadata: BackupMetadata
    data: Dict[str, Any]


class BackupManager:
    """Manage backups of fleet data."""

    def __init__(self, backup_dir: str = "./backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True, parents=True)
        self._current_data: Dict[str, Any] = {}

    def set_current_data(self, data: Dict[str, Any]):
        """Set current data to backup."""
        self._current_data = data

    async def create_backup(
        self,
        include_robots: bool = True,
        include_alerts: bool = True,
        include_tasks: bool = True,
        include_zones: bool = True,
        compress: bool = True
    ) -> BackupMetadata:
        """Create a backup."""
        backup_id = f"backup-{int(time.time())}"
        backup_data = {}

        if include_robots and "robots" in self._current_data:
            backup_data["robots"] = self._current_data["robots"]
        if include_alerts and "alerts" in self._current_data:
            backup_data["alerts"] = self._current_data["alerts"]
        if include_tasks and "tasks" in self._current_data:
            backup_data["tasks"] = self._current_data["tasks"]
        if include_zones and "zones" in self._current_data:
            backup_data["zones"] = self._current_data["zones"]

        json_data = json.dumps(backup_data, indent=2)
        checksum = hashlib.sha256(json_data.encode()).hexdigest()

        if compress:
            json_data = self._compress(json_data)

        file_path = self.backup_dir / f"{backup_id}.backup"
        with open(file_path, 'wb') as f:
            if compress:
                f.write(gzip.compress(json_data.encode()))
            else:
                f.write(json_data.encode())

        size_bytes = os.path.getsize(file_path)

        metadata = BackupMetadata(
            backup_id=backup_id,
            created_at=time.time(),
            size_bytes=size_bytes,
            checksum=checksum,
            includes_robots=include_robots,
            includes_alerts=include_alerts,
            includes_tasks=include_tasks,
            includes_zones=include_zones,
        )

        metadata_path = self.backup_dir / f"{backup_id}.meta"
        with open(metadata_path, 'w') as f:
            json.dump({
                "backup_id": metadata.backup_id,
                "created_at": metadata.created_at,
                "size_bytes": metadata.size_bytes,
                "checksum": metadata.checksum,
                "includes_robots": metadata.includes_robots,
                "includes_alerts": metadata.includes_alerts,
                "includes_tasks": metadata.includes_tasks,
                "includes_zones": metadata.includes_zones,
            }, f, indent=2)

        logger.info(f"Created backup {backup_id} ({size_bytes} bytes)")
        return metadata

    def _compress(self, data: str) -> str:
        """Compress data."""
        return gzip.compress(data.encode()).decode('latin-1')

    def _decompress(self, data: str) -> str:
        """Decompress data."""
        return gzip.decompress(data.encode('latin-1')).decode()

    async def restore_backup(self, backup_id: str) -> Dict[str, Any]:
        """Restore from a backup."""
        file_path = self.backup_dir / f"{backup_id}.backup"
        if not file_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_id}")

        with open(file_path, 'rb') as f:
            data = f.read()

        try:
            data = gzip.decompress(data).decode()
        except Exception:
            data = data.decode()

        return json.loads(data)

    def list_backups(self) -> List[BackupMetadata]:
        """List all backups."""
        backups = []
        for meta_file in self.backup_dir.glob("*.meta"):
            with open(meta_file, 'r') as f:
                meta = json.load(f)
                backups.append(BackupMetadata(
                    backup_id=meta["backup_id"],
                    created_at=meta["created_at"],
                    size_bytes=meta["size_bytes"],
                    checksum=meta["checksum"],
                    includes_robots=meta["includes_robots"],
                    includes_alerts=meta["includes_alerts"],
                    includes_tasks=meta["includes_tasks"],
                    includes_zones=meta["includes_zones"],
                ))
        return sorted(backups, key=lambda b: b.created_at, reverse=True)

    def delete_backup(self, backup_id: str) -> bool:
        """Delete a backup."""
        backup_file = self.backup_dir / f"{backup_id}.backup"
        meta_file = self.backup_dir / f"{backup_id}.meta"

        deleted = False
        if backup_file.exists():
            backup_file.unlink()
            deleted = True
        if meta_file.exists():
            meta_file.unlink()
            deleted = True

        return deleted


class SchedulerBackup:
    """Schedule automatic backups."""

    def __init__(self, manager: BackupManager):
        self.manager = manager
        self._running = False
        self._schedule: Dict[str, Any] = {}

    def schedule_backup(self, interval_hours: int, include_options: Dict[str, bool]):
        """Schedule recurring backups."""
        self._schedule = {
            "interval_hours": interval_hours,
            "include_robots": include_options.get("robots", True),
            "include_alerts": include_options.get("alerts", True),
            "include_tasks": include_options.get("tasks", True),
            "include_zones": include_options.get("zones", True),
            "next_backup": time.time() + (interval_hours * 3600),
        }

    async def run_scheduler(self):
        """Run backup scheduler."""
        self._running = True

        while self._running:
            if self._schedule and time.time() >= self._schedule["next_backup"]:
                await self.manager.create_backup(
                    include_robots=self._schedule["include_robots"],
                    include_alerts=self._schedule["include_alerts"],
                    include_tasks=self._schedule["include_tasks"],
                    include_zones=self._schedule["include_zones"],
                )
                self._schedule["next_backup"] = time.time() + (
                    self._schedule["interval_hours"] * 3600
                )

            await asyncio.sleep(60)

    def stop(self):
        """Stop scheduler."""
        self._running = False


async def main():
    """Run backup service."""
    manager = BackupManager("./backups")

    manager.set_current_data({
        "robots": [{"robot_id": "robot-001", "name": "Test"}],
        "alerts": [{"alert_id": "alert-001", "severity": "warning"}],
        "tasks": [{"task_id": "task-001", "status": "pending"}],
        "zones": [{"zone_id": "zone-001", "name": "Test Zone"}],
    })

    backup = await manager.create_backup()
    logger.info(f"Created backup: {backup.backup_id}")

    backups = manager.list_backups()
    logger.info(f"Total backups: {len(backups)}")

    restored = await manager.restore_backup(backup.backup_id)
    logger.info(f"Restored data: {list(restored.keys())}")

    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())