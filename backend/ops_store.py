"""
Lightweight SQLite persistence for operational memory (incidents, metrics, insights).
"""
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT_DIR = Path(__file__).parent
DB_PATH = ROOT_DIR / "data" / "fril_ops.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                tick INTEGER,
                ts TEXT,
                severity TEXT,
                kind TEXT,
                message TEXT,
                robot_id TEXT,
                zone TEXT,
                action TEXT,
                payload TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS metrics (
                tick INTEGER PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS insights (
                id TEXT PRIMARY KEY,
                tick INTEGER,
                payload TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


def clear_session() -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM incidents")
        conn.execute("DELETE FROM metrics")
        conn.execute("DELETE FROM insights")


def save_incident(incident: Dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO incidents
            (id, tick, ts, severity, kind, message, robot_id, zone, action, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                incident.get("id"),
                incident.get("tick"),
                incident.get("ts"),
                incident.get("severity"),
                incident.get("kind"),
                incident.get("message"),
                incident.get("robot_id"),
                incident.get("zone"),
                incident.get("action"),
                json.dumps(incident),
            ),
        )


def save_metric(row: Dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO metrics (tick, payload) VALUES (?, ?)",
            (row.get("t"), json.dumps(row)),
        )


def save_insight(record: Dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO insights (id, tick, payload) VALUES (?, ?, ?)",
            (record.get("id"), record.get("tick"), json.dumps(record)),
        )


def load_incidents(limit: int = 80) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT payload FROM incidents ORDER BY tick DESC LIMIT ?",
            (limit,),
        ).fetchall()
    items = [json.loads(r["payload"]) for r in reversed(rows)]
    return items


def load_metrics(limit: int = 60) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT payload FROM metrics ORDER BY tick DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [json.loads(r["payload"]) for r in reversed(rows)]


def load_insights(limit: int = 10) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT payload FROM insights ORDER BY tick DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [json.loads(r["payload"]) for r in reversed(rows)]
