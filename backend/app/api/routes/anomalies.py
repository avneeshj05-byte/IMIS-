import json
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.database.connection import get_db
from backend.app.models.database import AnomalyEvent, Alert, Machine
from backend.app.services.anomaly_detector import anomaly_detector
from backend.app.services.sensor_simulator import sensor_simulator

router = APIRouter(prefix="/anomalies", tags=["ML Anomaly Detection"])

@router.get("")
def get_anomalies(db: Session = Depends(get_db)):
    """Retrieve all logged anomaly events detected by Isolation Forest or safety limits."""
    anomalies = db.query(AnomalyEvent).order_by(AnomalyEvent.timestamp.desc()).limit(50).all()
    results = []
    for a in anomalies:
        results.append({
            "id": a.id,
            "machine_id": a.machine_id,
            "timestamp": a.timestamp.isoformat(),
            "anomaly_score": a.anomaly_score,
            "detection_source": a.detection_source,
            "deviating_parameters": json.loads(a.deviating_parameters) if a.deviating_parameters else [],
            "description": a.description,
            "status": a.status
        })
    return results

@router.post("/evaluate/{machine_id}")
def evaluate_machine_telemetry(machine_id: str, db: Session = Depends(get_db)):
    """
    Run Scikit-Learn Isolation Forest against the current real-time telemetry of a machine.
    If an anomaly is detected, automatically logs an AnomalyEvent and raises a Maintenance Alert.
    """
    reading = sensor_simulator.get_latest_reading(machine_id)
    if not reading:
        raise HTTPException(status_code=404, detail=f"No telemetry available for machine '{machine_id}'.")

    result = anomaly_detector.evaluate_reading(reading)

    if result["is_anomaly"]:
        # Log to AnomalyEvent table
        desc = (
            f"Isolation Forest flagged anomaly (Score: {result['anomaly_score']:.2f}) on {machine_id}. "
            f"Breaches: {', '.join(result['threshold_breaches']) if result['threshold_breaches'] else 'Multivariate Distribution Drift'}."
        )
        anomaly_obj = AnomalyEvent(
            machine_id=machine_id,
            timestamp=datetime.datetime.utcnow(),
            anomaly_score=result["anomaly_score"],
            detection_source=result["detection_source"],
            deviating_parameters=json.dumps([p["parameter"] for p in result["deviating_parameters"]]),
            description=desc,
            status="OPEN"
        )
        db.add(anomaly_obj)
        db.flush()

        # Generate a corresponding Alert if none open recently
        recent_alert = (
            db.query(Alert)
            .filter(Alert.machine_id == machine_id, Alert.status == "NEW")
            .first()
        )
        if not recent_alert:
            alert_code = f"ALT-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
            category = "Temperature Anomaly" if any(p["parameter"] == "temperature" for p in result["deviating_parameters"]) else (
                "Vibration Anomaly" if any(p["parameter"] == "vibration" for p in result["deviating_parameters"]) else "Operating Anomaly"
            )
            severity = "CRITICAL" if result["anomaly_score"] > 0.7 else "WARNING"
            new_alert = Alert(
                alert_code=alert_code,
                machine_id=machine_id,
                category=category,
                severity=severity,
                description=desc,
                status="NEW",
                anomaly_id=anomaly_obj.id
            )
            db.add(new_alert)

        db.commit()

    return result
