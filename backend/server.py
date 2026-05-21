"""
Fleet Reliability Intelligence Layer — Backend Simulation Engine
"""
import asyncio
import logging
import os
import random
import uuid
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------
GRID_W, GRID_H = 32, 18
TICK_INTERVAL = 0.9
MAX_INCIDENTS = 80
MAX_METRIC_HISTORY = 60
MAX_ROBOT_HISTORY = 100
MAX_ROUTE_HISTORY = 50

CHARGING_ZONE_ID = "charging"
BATTERY_CRITICAL = 10.0
BATTERY_LOW = 30.0
BATTERY_FULL = 95.0
BATTERY_CHARGE_RATE = 1.1   # % per tick while charging
BATTERY_PROXIMITY_THRESHOLD = 8.0  # grid units — opportunistic charge range

ZONES = [
    {"id": "inbound",    "label": "Inbound",    "x": 1,  "y": 1,  "w": 6,  "h": 4},
    {"id": "outbound",   "label": "Outbound",   "x": 25, "y": 1,  "w": 6,  "h": 4},
    {"id": "storage",    "label": "Storage",    "x": 1,  "y": 7,  "w": 9,  "h": 5},
    {"id": "assembly",   "label": "Assembly",   "x": 12, "y": 7,  "w": 8,  "h": 5},
    {"id": "inspection", "label": "Inspection", "x": 22, "y": 7,  "w": 9,  "h": 5},
    {"id": "charging",   "label": "Charging",   "x": 13, "y": 14, "w": 6,  "h": 3},
]

VENDOR_PROFILES = {
    "A": {"name": "Vendor A", "color": "#00D1FF", "speed": 1.3,  "fail": 0.08,  "ack_lag": 0.6},
    "B": {"name": "Vendor B", "color": "#00E59B", "speed": 0.75, "fail": 0.015, "ack_lag": 0.15},
    "C": {"name": "Vendor C", "color": "#FFB020", "speed": 1.0,  "fail": 0.045, "ack_lag": 0.35},
}

TASK_TYPES = [
    "move-inventory", "transfer-package", "dock-station",
    "deliver-component", "charge-cycle", "pallet-relocate",
]

TASK_DESCRIPTIONS = {
    "move-inventory":     "inventory move",
    "transfer-package":   "package transfer",
    "dock-station":       "docking sequence",
    "deliver-component":  "component delivery",
    "charge-cycle":       "charge cycle",
    "pallet-relocate":    "pallet relocation",
}

CALLSIGNS = [
    "KITE", "ORBIT", "MANTA", "VECTOR", "NOVA", "LYNX",
    "REED", "FLINT", "CAIRN", "DUNE", "SLOPE",
    "VALE", "BRIAR", "CREST", "HOLLOW", "RIDGE",
]

# --------------------------------------------------------------------------
# Helpers — pure functions
# --------------------------------------------------------------------------
def charging_zone_center():
    z = next(z for z in ZONES if z["id"] == CHARGING_ZONE_ID)
    return z["x"] + z["w"] / 2, z["y"] + z["h"] / 2

def dist_to_charging(robot: Dict) -> float:
    cx, cy = charging_zone_center()
    dx = robot["x"] - cx
    dy = robot["y"] - cy
    return (dx * dx + dy * dy) ** 0.5

def is_heading_to_charge(robot: Dict) -> bool:
    """True if robot is already committed to a charge-cycle task."""
    return (
        robot["status"] == "charging" or
        (robot.get("task") and robot["task"].get("type") == "charge-cycle")
    )

def add_route_checkpoint(robot: Dict, event: str, label: str):
    robot["route_history"].append({
        "tick": state.tick,
        "ts": now_ts(),
        "x": round(robot["x"], 2),
        "y": round(robot["y"], 2),
        "event": event,
        "label": label,
    })
    if len(robot["route_history"]) > MAX_ROUTE_HISTORY:
        robot["route_history"] = robot["route_history"][-MAX_ROUTE_HISTORY:]

# --------------------------------------------------------------------------
# State
# --------------------------------------------------------------------------
class SimState:
    def __init__(self):
        self.robots: List[Dict] = []
        self.incidents: deque = deque(maxlen=MAX_INCIDENTS)
        self.metric_history: deque = deque(maxlen=MAX_METRIC_HISTORY)
        self.trails: List[Dict] = []
        self.totals = {
            "tasks_completed": 0, "tasks_failed": 0,
            "recoveries": 0, "recovery_attempts": 0, "incidents_total": 0,
        }
        self.tick = 0
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.ai_insights: List[Dict] = []
        self.congestion_score = 0.0
        self.congestion_spike_ticks_remaining = 0
        self.paused_zones: Dict[str, int] = {}
        self.zone_congestion_history: Dict[str, List[int]] = {z["id"]: [] for z in ZONES}
        self.bootstrap()

    def bootstrap(self):
        callsign_idx = 0
        for vendor, profile in VENDOR_PROFILES.items():
            count = 6 if vendor == "A" else 5
            for i in range(count):
                zone = random.choice(ZONES)
                callsign = CALLSIGNS[callsign_idx] if callsign_idx < len(CALLSIGNS) else f"UNIT-{callsign_idx}"
                callsign_idx += 1
                self.robots.append({
                    "id": f"{vendor}-{i+1:02d}",
                    "callsign": callsign,
                    "vendor": vendor,
                    "color": profile["color"],
                    "x": float(zone["x"] + random.uniform(0, zone["w"] - 1)),
                    "y": float(zone["y"] + random.uniform(0, zone["h"] - 1)),
                    "target_x": None, "target_y": None, "task": None,
                    "status": "idle",
                    "battery": random.uniform(40, 100),
                    "idle_ticks": 0, "stalled_ticks": 0,
                    "completed": 0, "failed": 0,
                    "health_score": 100.0,
                    "history": [],
                    "last_reroute_reason": None,
                    "charge_started_at_battery": None,
                    "force_charge": False,
                    "route_history": [],
                })

state = SimState()

# --------------------------------------------------------------------------
# Helpers — state-dependent
# --------------------------------------------------------------------------
def now_ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")

def zone_label(zone_id: Optional[str]) -> str:
    for z in ZONES:
        if z["id"] == zone_id:
            return z["label"]
    return zone_id or "unknown zone"

def task_desc(robot: Dict) -> str:
    if robot.get("task") and robot["task"].get("type"):
        return TASK_DESCRIPTIONS.get(robot["task"]["type"], robot["task"]["type"])
    return "task"

def robot_zone(robot: Dict) -> Optional[str]:
    for z in ZONES:
        if z["x"] <= robot["x"] <= z["x"] + z["w"] and z["y"] <= robot["y"] <= z["y"] + z["h"]:
            return z["id"]
    return None

def add_robot_event(robot: Dict, event_type: str, detail: Dict):
    entry = {"tick": state.tick, "ts": now_ts(), "type": event_type, **detail}
    robot["history"].append(entry)
    if len(robot["history"]) > MAX_ROBOT_HISTORY:
        robot["history"] = robot["history"][-MAX_ROBOT_HISTORY:]

def log_incident(severity, kind, message, robot_id=None, zone=None, action=None):
    state.incidents.appendleft({
        "id": str(uuid.uuid4())[:8], "ts": now_ts(), "tick": state.tick,
        "severity": severity, "kind": kind, "message": message,
        "robot_id": robot_id, "zone": zone, "action": action,
    })
    state.totals["incidents_total"] += 1

def assign_task(robot):
    non_charge_tasks = [t for t in TASK_TYPES if t != "charge-cycle"]
    zone = random.choice([z for z in ZONES if z["id"] != CHARGING_ZONE_ID])
    robot["task"] = {
        "id": str(uuid.uuid4())[:6],
        "type": random.choice(non_charge_tasks),
        "zone": zone["id"],
        "started_tick": state.tick,
    }
    robot["target_x"] = zone["x"] + random.uniform(0.5, zone["w"] - 0.5)
    robot["target_y"] = zone["y"] + random.uniform(0.5, zone["h"] - 0.5)
    robot["status"] = "executing"
    robot["idle_ticks"] = 0
    add_robot_event(robot, "task_assigned", {
        "task_type": robot["task"]["type"],
        "zone": zone["id"],
        "zone_label": zone["label"],
    })
    add_route_checkpoint(robot, "dispatch", f"Dispatched → {zone['label']}")

def assign_charge(robot, reason: str):
    z = next(z for z in ZONES if z["id"] == CHARGING_ZONE_ID)
    robot["task"] = {
        "id": str(uuid.uuid4())[:6],
        "type": "charge-cycle",
        "zone": CHARGING_ZONE_ID,
        "started_tick": state.tick,
    }
    robot["target_x"] = z["x"] + random.uniform(0.5, z["w"] - 0.5)
    robot["target_y"] = z["y"] + random.uniform(0.5, z["h"] - 0.5)
    robot["status"] = "executing"
    robot["idle_ticks"] = 0
    robot["charge_started_at_battery"] = robot["battery"]
    add_robot_event(robot, "charge_dispatched", {
        "reason": reason,
        "battery": round(robot["battery"], 1),
    })
    add_route_checkpoint(robot, "charge_dispatch", f"→ Charging ({reason})")

def add_trail(robot: dict, kind: str = "reroute"):
    state.trails.append({
        "id": str(uuid.uuid4())[:6],
        "robot_id": robot["id"],
        "color": robot["color"],
        "kind": kind,
        "from_x": robot["x"],
        "from_y": robot["y"],
        "to_x": robot["target_x"],
        "to_y": robot["target_y"],
        "created_tick": state.tick,
    })
    state.trails = [t for t in state.trails if state.tick - t["created_tick"] <= 8][-60:]

def reroute(robot, reason):
    dest_zone = random.choice([z for z in ZONES if z["id"] != CHARGING_ZONE_ID])
    robot["target_x"] = dest_zone["x"] + random.uniform(0.5, dest_zone["w"] - 0.5)
    robot["target_y"] = dest_zone["y"] + random.uniform(0.5, dest_zone["h"] - 0.5)
    robot["status"] = "rerouting"
    robot["stalled_ticks"] = 0
    state.totals["recovery_attempts"] += 1
    state.totals["recoveries"] += 1
    add_trail(robot, kind="reroute")

    current_zone = robot_zone(robot)
    current_label = zone_label(current_zone)
    dest_label = zone_label(dest_zone["id"])

    if "congestion" in reason:
        msg = f"{robot['id']} rerouting around congestion in {current_label} — redirected to {dest_label}"
    elif "stall" in reason.lower():
        msg = f"{robot['id']} path recalculated after stall in {current_label} — now heading to {dest_label}"
    elif "operator" in reason.lower():
        msg = f"{robot['id']} rerouted by operator command — new destination: {dest_label}"
    else:
        msg = f"{robot['id']} rerouting from {current_label} to {dest_label} — {reason}"

    robot["last_reroute_reason"] = reason
    add_robot_event(robot, "reroute", {
        "reason": reason,
        "from_zone": current_zone,
        "from_zone_label": current_label,
        "to_zone": dest_zone["id"],
        "to_zone_label": dest_label,
    })
    add_route_checkpoint(robot, "reroute", f"Rerouted → {dest_label}")
    log_incident("recovery", "reroute", msg, robot_id=robot["id"], action="reroute")

def compute_congestion():
    counts: Dict[str, int] = {}
    for r in state.robots:
        for z in ZONES:
            if z["x"] <= r["x"] <= z["x"] + z["w"] and z["y"] <= r["y"] <= z["y"] + z["h"]:
                counts[z["id"]] = counts.get(z["id"], 0) + 1
                break
    return min(1.0, max(0.0, (max(counts.values(), default=0) - 3) / 6))

def is_robot_in_zone(robot: Dict, zone_id: str) -> bool:
    for z in ZONES:
        if z["id"] == zone_id:
            return z["x"] <= robot["x"] <= z["x"] + z["w"] and z["y"] <= robot["y"] <= z["y"] + z["h"]
    return False

def estimate_charge_ticks(robot: Dict) -> Optional[int]:
    if robot["status"] != "charging":
        return None
    remaining = BATTERY_FULL - robot["battery"]
    if remaining <= 0:
        return 0
    return max(1, int(remaining / BATTERY_CHARGE_RATE))

def update_health_score(robot: Dict):
    """Reliability score 0–100. Weighted: recent failures hurt more than old ones."""
    total = robot["completed"] + robot["failed"]
    if total == 0:
        robot["health_score"] = 100.0
        return
    # base reliability
    base = robot["completed"] / total * 100
    # penalise consecutive recent failures from history
    recent = [e for e in robot["history"][-20:] if e["type"] in ("task_complete", "task_failed")]
    recent_fails = sum(1 for e in recent if e["type"] == "task_failed")
    recent_total = len(recent)
    recency_penalty = (recent_fails / max(1, recent_total)) * 20
    robot["health_score"] = round(max(0.0, min(100.0, base - recency_penalty)), 1)

# --------------------------------------------------------------------------
# Simulation loop
# --------------------------------------------------------------------------
async def simulation_loop():
    logger.info("Simulation loop started")
    while True:
        try:
            await asyncio.sleep(TICK_INTERVAL)
            state.tick += 1
            tick = state.tick

            # Tick down operator overrides
            if state.congestion_spike_ticks_remaining > 0:
                state.congestion_spike_ticks_remaining -= 1
            paused_to_remove = [z for z, t in state.paused_zones.items() if t <= 1]
            for z in paused_to_remove:
                del state.paused_zones[z]
                log_incident("info", "zone_resumed",
                             f"{zone_label(z)} zone operations resumed — robots cleared for movement",
                             zone=z, action="resume")
            for z in list(state.paused_zones):
                state.paused_zones[z] -= 1

            for robot in state.robots:
                profile = VENDOR_PROFILES[robot["vendor"]]

                # ── CRITICAL BATTERY: force charge immediately ──
                if robot["battery"] < BATTERY_CRITICAL and not is_heading_to_charge(robot):
                    prev_task = task_desc(robot) if robot.get("task") else None
                    if robot["status"] not in ("idle",):
                        log_incident(
                            "critical", "battery_critical",
                            f"{robot['id']} · {robot['callsign']} battery critical at {robot['battery']:.0f}% — "
                            f"{'abandoning ' + prev_task if prev_task else 'emergency charge initiated'}",
                            robot_id=robot["id"], action="charge"
                        )
                    add_robot_event(robot, "battery_critical", {
                        "battery": round(robot["battery"], 1),
                        "interrupted_task": prev_task,
                    })
                    robot["task"] = None
                    robot["force_charge"] = True
                    assign_charge(robot, "critical battery")
                    continue

                # ── PAUSED ZONE ──
                current_zone = robot_zone(robot)
                if current_zone and current_zone in state.paused_zones:
                    robot["stalled_ticks"] += 1
                    continue

                # ── CHARGING STATUS: robot docked and charging ──
                if robot["status"] == "charging":
                    prev_battery = robot["battery"]
                    robot["battery"] = min(BATTERY_FULL, robot["battery"] + BATTERY_CHARGE_RATE)
                    if tick % 5 == 0:
                        add_robot_event(robot, "charging_progress", {
                            "battery_from": round(prev_battery, 1),
                            "battery_to": round(robot["battery"], 1),
                            "est_ticks_remaining": estimate_charge_ticks(robot),
                        })
                    if robot["battery"] >= BATTERY_FULL:
                        robot["battery"] = BATTERY_FULL
                        robot["status"] = "idle"
                        robot["task"] = None
                        robot["force_charge"] = False
                        robot["charge_started_at_battery"] = None
                        add_robot_event(robot, "charge_complete", {
                            "battery": round(robot["battery"], 1),
                        })
                        add_route_checkpoint(robot, "charge_complete", f"Charged · {robot['battery']:.0f}%")
                        log_incident("info", "charge_complete",
                                     f"{robot['id']} · {robot['callsign']} charge complete at {robot['battery']:.0f}% — ready for dispatch",
                                     robot_id=robot["id"], action="dispatch")
                    continue

                # ── IDLE ──
                if robot["status"] == "idle":
                    robot["idle_ticks"] += 1

                    if robot["idle_ticks"] >= 2 and random.random() < 0.65:
                        if robot["battery"] < BATTERY_LOW and dist_to_charging(robot) <= BATTERY_PROXIMITY_THRESHOLD:
                            log_incident("info", "charge_opportunistic",
                                         f"{robot['id']} · {robot['callsign']} battery at {robot['battery']:.0f}% — routing to nearby charging bay",
                                         robot_id=robot["id"], action="charge")
                            assign_charge(robot, "opportunistic — low battery, near charging")
                        else:
                            assign_task(robot)
                            log_incident("info", "task_assigned",
                                         f"{robot['id']} · {robot['callsign']} dispatched for {task_desc(robot)} in {zone_label(robot['task']['zone'])}",
                                         robot_id=robot["id"], zone=robot["task"]["zone"])

                    if robot["idle_ticks"] > 18:
                        log_incident("warning", "idle_timeout",
                                     f"{robot['id']} · {robot['callsign']} exceeded idle threshold — reassigning to active workflow",
                                     robot_id=robot["id"], action="reassign")
                        assign_task(robot)
                        state.totals["recoveries"] += 1
                        state.totals["recovery_attempts"] += 1
                    continue

                if robot["target_x"] is None:
                    robot["status"] = "idle"
                    continue

                dx = robot["target_x"] - robot["x"]
                dy = robot["target_y"] - robot["y"]
                dist = (dx * dx + dy * dy) ** 0.5
                speed = profile["speed"] * (0.55 + random.uniform(0, 0.4))

                if dist < 0.4:
                    # ── ARRIVED AT TARGET ──
                    if robot.get("task") and robot["task"]["type"] == "charge-cycle":
                        robot["status"] = "charging"
                        robot["charge_started_at_battery"] = robot["battery"]
                        add_robot_event(robot, "charge_started", {
                            "battery": round(robot["battery"], 1),
                            "zone": CHARGING_ZONE_ID,
                        })
                        add_route_checkpoint(robot, "charge_start", f"Docked · {robot['battery']:.0f}%")
                        log_incident("info", "charge_started",
                                     f"{robot['id']} · {robot['callsign']} docked at charging bay — {robot['battery']:.0f}% battery, charging",
                                     robot_id=robot["id"], zone=CHARGING_ZONE_ID)
                        continue

                    if random.random() < profile["fail"] + state.congestion_score * 0.05:
                        robot["failed"] += 1
                        state.totals["tasks_failed"] += 1
                        failure_type = random.choice(["docking_failure", "ack_missing", "stalled_execution"])
                        update_health_score(robot)
                        target_zone = zone_label(robot["task"]["zone"]) if robot.get("task") else "unknown zone"

                        add_robot_event(robot, "task_failed", {
                            "failure_type": failure_type,
                            "zone": robot["task"]["zone"] if robot.get("task") else None,
                            "zone_label": target_zone,
                        })
                        add_route_checkpoint(robot, "failure", f"Failed · {failure_type}")

                        if failure_type == "stalled_execution":
                            log_incident("warning", "stalled_execution",
                                         f"{robot['id']} · {robot['callsign']} stalled on {task_desc(robot)} in {target_zone} — triggering recovery",
                                         robot_id=robot["id"],
                                         zone=robot["task"]["zone"] if robot.get("task") else None,
                                         action="reroute")
                            reroute(robot, "stalled execution")
                            continue

                        if failure_type == "docking_failure":
                            log_incident("critical", "docking_failure",
                                         f"{robot['id']} · {robot['callsign']} failed to dock at {target_zone} — station handshake rejected, retrying",
                                         robot_id=robot["id"], action="retry")
                        else:
                            log_incident("warning", "ack_missing",
                                         f"{robot['id']} · {robot['callsign']} acknowledgment timeout in {target_zone} — command unconfirmed, reissuing",
                                         robot_id=robot["id"], action="retry")

                        zone = next(z for z in ZONES if z["id"] == robot["task"]["zone"])
                        robot["target_x"] = zone["x"] + random.uniform(0.5, zone["w"] - 0.5)
                        robot["target_y"] = zone["y"] + random.uniform(0.5, zone["h"] - 0.5)
                        robot["status"] = "retrying"
                        add_trail(robot, kind="retry")
                        state.totals["recovery_attempts"] += 1
                        if random.random() < 0.8:
                            state.totals["recoveries"] += 1
                    else:
                        # ── TASK COMPLETE ──
                        robot["completed"] += 1
                        state.totals["tasks_completed"] += 1
                        robot["battery"] = max(5, robot["battery"] - random.uniform(0.5, 1.5))
                        update_health_score(robot)
                        add_robot_event(robot, "task_complete", {
                            "task_type": robot["task"]["type"] if robot.get("task") else None,
                            "zone": robot["task"]["zone"] if robot.get("task") else None,
                            "battery": round(robot["battery"], 1),
                        })
                        add_route_checkpoint(robot, "complete", f"Completed {robot['task']['type'] if robot.get('task') else 'task'}")
                        robot["task"] = None
                        robot["target_x"] = None
                        robot["target_y"] = None
                        robot["status"] = "idle"
                        robot["idle_ticks"] = 0
                else:
                    # ── MOVING ──
                    step = min(speed * 0.35, dist)
                    robot["x"] += (dx / dist) * step
                    robot["y"] += (dy / dist) * step
                    # Don't drain battery if already critical — prevents floor loop
                    if robot["battery"] > BATTERY_CRITICAL:
                        robot["battery"] = max(BATTERY_CRITICAL, robot["battery"] - random.uniform(0.02, 0.06))

                    if state.congestion_score > 0.5 and random.random() < 0.04:
                        robot["stalled_ticks"] += 1
                        if robot["stalled_ticks"] > 6:
                            # Never reroute a robot heading to charge
                            if not is_heading_to_charge(robot):
                                target_zone = zone_label(robot["task"]["zone"]) if robot.get("task") else "unknown zone"
                                log_incident("warning", "blocked_path",
                                             f"{robot['id']} · {robot['callsign']} path blocked approaching {target_zone} — computing alternate corridor",
                                             robot_id=robot["id"], action="reroute")
                                reroute(robot, "congestion stall")
                    else:
                        robot["stalled_ticks"] = max(0, robot["stalled_ticks"] - 1)

            # ── CONGESTION ──
            computed = compute_congestion()
            if state.congestion_spike_ticks_remaining > 0:
                state.congestion_score = max(computed, 0.9)
            else:
                state.congestion_score = computed

            state.trails = [t for t in state.trails if state.tick - t["created_tick"] <= 8]

            # ── ZONE CONGESTION HISTORY — record occupancy per zone each tick ──
            for z in ZONES:
                count = sum(1 for r in state.robots if is_robot_in_zone(r, z["id"]))
                history = state.zone_congestion_history[z["id"]]
                history.append(count)
                if len(history) > MAX_METRIC_HISTORY:
                    state.zone_congestion_history[z["id"]] = history[-MAX_METRIC_HISTORY:]

            if state.congestion_score > 0.7 and random.random() < 0.18:
                counts: Dict[str, int] = {}
                for r in state.robots:
                    cz = robot_zone(r)
                    if cz:
                        counts[cz] = counts.get(cz, 0) + 1
                busiest = max(counts, key=counts.get) if counts else "assembly"
                busiest_label = zone_label(busiest)
                log_incident("critical", "congestion",
                             f"Critical density in {busiest_label} — {int(state.congestion_score*100)}% capacity, redistributing active units",
                             action="redistribute")
                # Never reroute robots heading to charge
                victims = [r for r in state.robots
                           if r["status"] == "executing" and not is_heading_to_charge(r)]
                for r in random.sample(victims, k=min(3, len(victims))):
                    reroute(r, "congestion redistribution")

            if random.random() < 0.04:
                vendor = random.choice(list(VENDOR_PROFILES.keys()))
                profile_name = VENDOR_PROFILES[vendor]["name"]
                lag = int(VENDOR_PROFILES[vendor]["ack_lag"] * 1000)
                log_incident("warning", "vendor_latency",
                             f"{profile_name} acknowledgment latency spike — {lag}ms above baseline, monitoring response chain",
                             action="monitor")

            if random.random() < 0.025:
                log_incident("warning", "throughput_drop",
                             "Throughput degradation on outbound corridor — package queue building, rebalancing dispatch",
                             zone="outbound", action="rebalance")

            active = sum(1 for r in state.robots if r["status"] not in ("idle", "charging"))
            charging_count = sum(1 for r in state.robots if r["status"] == "charging")
            attempts = max(1, state.totals["recovery_attempts"])
            attempted_tasks = max(1, state.totals["tasks_completed"] + state.totals["tasks_failed"])
            throughput = state.totals["tasks_completed"] / max(1, tick) * 60
            state.metric_history.append({
                "t": tick, "active": active,
                "charging": charging_count,
                "completed": state.totals["tasks_completed"],
                "failed": state.totals["tasks_failed"],
                "recovery_rate": round(state.totals["recoveries"] / attempts * 100, 1),
                "throughput": round(throughput, 2),
                "congestion": round(state.congestion_score * 100, 1),
                "incidents": state.totals["incidents_total"],
                "success_rate": round(state.totals["tasks_completed"] / attempted_tasks * 100, 1),
            })
        except Exception as e:
            logger.exception("Simulation loop error: %s", e)

def zone_congestion_stats() -> List[Dict]:
    """Per-zone congestion summary: current occupancy, peak, avg, spike count."""
    result = []
    for z in ZONES:
        history = state.zone_congestion_history.get(z["id"], [])
        if not history:
            result.append({"id": z["id"], "label": z["label"], "current": 0, "peak": 0, "avg": 0.0, "spikes": 0})
            continue
        current = history[-1]
        peak = max(history)
        avg = round(sum(history) / len(history), 1)
        # spike = any tick where occupancy exceeded 4 robots
        spikes = sum(1 for h in history if h >= 4)
        result.append({
            "id": z["id"], "label": z["label"],
            "current": current, "peak": peak, "avg": avg, "spikes": spikes,
        })
    return result

# --------------------------------------------------------------------------
# FastAPI
# --------------------------------------------------------------------------
app = FastAPI(title="Fleet Reliability Intelligence Layer")
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"service": "Fleet Reliability Intelligence Layer", "status": "online", "tick": state.tick}

@api_router.get("/sim/state")
async def sim_state():
    robots_out = []
    for r in state.robots:
        eta = None
        if r["target_x"] is not None and r["status"] != "charging":
            dx = r["target_x"] - r["x"]
            dy = r["target_y"] - r["y"]
            dist = (dx * dx + dy * dy) ** 0.5
            speed = VENDOR_PROFILES[r["vendor"]]["speed"]
            eta = round(dist / max(0.3, speed * 0.35) * TICK_INTERVAL, 1)
        robots_out.append({
            **r,
            "eta_s": eta,
            "dist_to_charging": round(dist_to_charging(r), 1),
            "est_charge_ticks": estimate_charge_ticks(r),
            "reliability_tier": (
                "critical" if r["health_score"] < 50 else
                "degraded" if r["health_score"] < 75 else
                "nominal"
            ),
        })
    trails_out = [
        {**t, "age": state.tick - t["created_tick"]}
        for t in state.trails
    ]
    return {
        "tick": state.tick, "started_at": state.started_at,
        "grid": {"w": GRID_W, "h": GRID_H}, "zones": ZONES,
        "vendors": VENDOR_PROFILES, "robots": robots_out,
        "trails": trails_out,
        "incidents": list(state.incidents)[:40],
        "metrics": state.metric_history[-1] if state.metric_history else None,
        "metric_history": list(state.metric_history),
        "ai_insights": state.ai_insights[-5:],
        "paused_zones": list(state.paused_zones.keys()),
        "congestion_spike_active": state.congestion_spike_ticks_remaining > 0,
        "zone_congestion_stats": zone_congestion_stats(),
    }

@api_router.get("/sim/incidents")
async def sim_incidents(limit: int = 40):
    return {"incidents": list(state.incidents)[:limit]}

@api_router.get("/sim/metrics")
async def sim_metrics():
    return {
        "current": state.metric_history[-1] if state.metric_history else None,
        "history": list(state.metric_history),
        "totals": state.totals,
    }

@api_router.get("/sim/robot/{robot_id}")
async def get_robot(robot_id: str):
    robot = next((r for r in state.robots if r["id"] == robot_id), None)
    if not robot:
        raise HTTPException(status_code=404, detail=f"Robot '{robot_id}' not found")
    return {
        **robot,
        "eta_s": None,
        "dist_to_charging": round(dist_to_charging(robot), 1),
        "est_charge_ticks": estimate_charge_ticks(robot),
        "reliability_tier": (
            "critical" if robot["health_score"] < 50 else
            "degraded" if robot["health_score"] < 75 else
            "nominal"
        ),
    }

# --------------------------------------------------------------------------
# Operator Control Endpoints
# --------------------------------------------------------------------------
@api_router.post("/sim/control/reroute-all")
async def control_reroute_all():
    rerouted = []
    for robot in state.robots:
        if robot["status"] in ("executing", "retrying", "rerouting") and not is_heading_to_charge(robot):
            reroute(robot, "operator command")
            rerouted.append(robot["id"])
    log_incident("info", "operator_reroute_all",
                 f"Operator triggered fleet-wide reroute — {len(rerouted)} units redirected",
                 action="reroute")
    return {"ok": True, "rerouted": rerouted, "count": len(rerouted)}

class PauseZoneRequest(BaseModel):
    zone_id: str
    duration_ticks: int = Field(default=8)

@api_router.post("/sim/control/pause-zone")
async def control_pause_zone(req: PauseZoneRequest):
    valid_ids = {z["id"] for z in ZONES}
    if req.zone_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Unknown zone '{req.zone_id}'")
    state.paused_zones[req.zone_id] = req.duration_ticks
    label = zone_label(req.zone_id)
    frozen = [r["id"] for r in state.robots if is_robot_in_zone(r, req.zone_id)]
    log_incident("warning", "zone_paused",
                 f"Operator paused {label} zone — {len(frozen)} units held in place for {req.duration_ticks} ticks",
                 zone=req.zone_id, action="pause")
    return {"ok": True, "zone_id": req.zone_id, "duration_ticks": req.duration_ticks, "frozen_robots": frozen}

@api_router.post("/sim/control/spike-congestion")
async def control_spike_congestion():
    state.congestion_spike_ticks_remaining = 6
    state.congestion_score = 0.9
    log_incident("critical", "congestion_spike",
                 "Operator simulated congestion spike — fleet density forced to 90%, recovery protocols active",
                 action="redistribute")
    return {"ok": True, "spike_ticks": 6}

# --------------------------------------------------------------------------
# AI Insights
# --------------------------------------------------------------------------
class InsightRequest(BaseModel):
    horizon: int = Field(default=25)

@api_router.post("/sim/insights")
async def sim_insights(req: InsightRequest):
    incidents = list(state.incidents)[:req.horizon]
    metrics = state.metric_history[-1] if state.metric_history else {}
    totals = state.totals
    if not incidents:
        return {"insights": [], "generated_at": now_ts()}

    incident_text = "\n".join(
        f"[{i['ts']}][{i['severity'].upper()}][{i['kind']}] {i['message']}" for i in incidents
    )

    robot_summary_lines = []
    for r in sorted(state.robots, key=lambda x: x["health_score"])[:6]:
        robot_summary_lines.append(
            f"  {r['id']} · {r['callsign']} (Vendor {r['vendor']}): "
            f"{r['completed']} completed, {r['failed']} failed, "
            f"health {r['health_score']}%, battery {r['battery']:.0f}%, status={r['status']}"
        )
    robot_summary = "\n".join(robot_summary_lines)

    zone_counts: Dict[str, int] = {}
    for r in state.robots:
        cz = robot_zone(r)
        if cz:
            zone_counts[cz] = zone_counts.get(cz, 0) + 1
    zone_summary = ", ".join(
        f"{zone_label(z)}: {n} robots"
        for z, n in sorted(zone_counts.items(), key=lambda x: -x[1])
    )

    charging_robots = [r for r in state.robots if r["status"] == "charging"]
    charging_summary = (
        f"{len(charging_robots)} robots currently charging"
        + (f" ({', '.join(r['id'] for r in charging_robots)})" if charging_robots else "")
    )

    zone_congestion = zone_congestion_stats()
    zone_health_text = " | ".join(
        f"{z['label']}: cur={z['current']} peak={z['peak']} spikes={z['spikes']}"
        for z in zone_congestion if z["id"] != CHARGING_ZONE_ID
    )

    metrics_text = (
        f"Active robots: {metrics.get('active', 0)}/{len(state.robots)} | "
        f"Charging: {metrics.get('charging', 0)} | "
        f"Tasks completed: {totals['tasks_completed']} | Tasks failed: {totals['tasks_failed']} | "
        f"Success rate: {metrics.get('success_rate', 0)}% | "
        f"Recovery rate: {metrics.get('recovery_rate', 0)}% | "
        f"Throughput: {metrics.get('throughput', 0)}/min | Congestion: {metrics.get('congestion', 0)}%"
    )

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
        chat = LlmChat(
            api_key=api_key, session_id=f"insights-{state.tick}",
            system_message=(
                "You are the operational intelligence core for an autonomous warehouse fleet. "
                "Produce sharp, specific observations a shift supervisor can act on immediately.\n\n"
                "Rules:\n"
                "- Always cite specific zone names (Inbound, Outbound, Storage, Assembly, Inspection, Charging)\n"
                "- Always cite specific robot IDs and callsigns (e.g., A-03 · KITE) when individual units are notable\n"
                "- Always cite specific percentages, counts, or rates — never vague qualifiers\n"
                "- Each observation must end with a concrete recommendation\n"
                "- One sentence each, under 25 words\n"
                "- Exactly 4 observations\n"
                "- Plain numbered list (1. 2. 3. 4.) no preamble, no markdown\n"
            ),
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        response = await chat.send_message(UserMessage(
            text=(
                f"Current metrics: {metrics_text}\n\n"
                f"Zone occupancy: {zone_summary}\n\n"
                f"Zone congestion history (current/peak/spikes): {zone_health_text}\n\n"
                f"Charging status: {charging_summary}\n\n"
                f"Top robots by health score (lowest first):\n{robot_summary}\n\n"
                f"Recent incidents ({len(incidents)}):\n{incident_text}\n\n"
                "Produce 4 operational observations now."
            )
        ))
        lines = []
        for raw in str(response).strip().split("\n"):
            raw = raw.strip()
            if not raw:
                continue
            for prefix in ("1.", "2.", "3.", "4.", "5.", "1)", "2)", "3)", "4)", "5)", "-", "•"):
                if raw.startswith(prefix):
                    raw = raw[len(prefix):].strip()
                    break
            if raw:
                lines.append(raw)
        record = {
            "id": str(uuid.uuid4())[:8], "generated_at": now_ts(), "tick": state.tick,
            "insights": lines[:5] or [str(response)], "snapshot": metrics,
        }
        state.ai_insights.append(record)
        state.ai_insights = state.ai_insights[-10:]
        return record
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("AI insight error: %s", e)
        fallback = [
            f"Recovery rate at {metrics.get('recovery_rate', 0)}% — review Vendor A retry logic in Assembly zone.",
            f"Congestion at {metrics.get('congestion', 0)}% — redistribute active units away from peak zones.",
            f"Success rate {metrics.get('success_rate', 0)}% with {totals['tasks_failed']} failures — audit docking sequences.",
            f"{charging_summary} — monitor bay availability to avoid dispatch delays.",
        ]
        record = {
            "id": str(uuid.uuid4())[:8], "generated_at": now_ts(), "tick": state.tick,
            "insights": fallback, "snapshot": metrics, "fallback": True, "error": str(e),
        }
        state.ai_insights.append(record)
        state.ai_insights = state.ai_insights[-10:]
        return record

@api_router.post("/sim/reset")
async def sim_reset():
    global state
    state = SimState()
    return {"ok": True, "started_at": state.started_at}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("fril")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())
    logger.info("FRIL backend booted with %d robots across %d zones", len(state.robots), len(ZONES))

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FRIL backend shutting down")