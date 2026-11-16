from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
from backend.app.services.sensor_simulator import sensor_simulator
from backend.app.schemas.sensor import SimulationInjectRequest

router = APIRouter(prefix="/sensors", tags=["IoT Sensor Analytics"])

@router.get("/latest")
def get_latest_sensors():
    """Get the most recent sensor telemetry readings for all monitored machines."""
    latest = sensor_simulator.generate_next_readings()
    return latest

@router.get("/{machine_id}/history")
def get_sensor_history(machine_id: str, limit: int = Query(40, ge=10, le=100)):
    """Retrieve historical time-series sensor data for technical line charts and trend analysis."""
    history = sensor_simulator.get_machine_history(machine_id, limit=limit)
    if not history:
        raise HTTPException(status_code=404, detail=f"No telemetry history found for machine '{machine_id}'.")
    return history

@router.post("/inject")
def inject_anomaly(req: SimulationInjectRequest):
    """
    Simulation Anomaly Injector.
    Allows engineers and evaluators to inject thermal spikes, bearing friction, or pressure loss
    to test ML anomaly detection and automated RAG diagnostics in real time.
    """
    success = sensor_simulator.inject_anomaly(
        machine_id=req.machine_id,
        anomaly_type=req.anomaly_type,
        severity=req.severity_multiplier
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{req.machine_id}' not recognized in simulator.")

    status_msg = (
        f"Simulated anomaly '{req.anomaly_type}' successfully injected into {req.machine_id}."
        if req.anomaly_type != "RESET" else
        f"Asset {req.machine_id} reset to baseline nominal operating parameters."
    )
    return {"message": status_msg, "machine_id": req.machine_id, "anomaly_type": req.anomaly_type}
