from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database.connection import get_db
from backend.app.models.database import Alert, Machine
from backend.app.schemas.alert import AlertResponse, AlertUpdateStatus

router = APIRouter(prefix="/alerts", tags=["Alert Center"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    machine_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve industrial facility alerts with machine context and filter capabilities."""
    query = db.query(Alert, Machine.name.label("machine_name"), Machine.department.label("department")).join(
        Machine, Alert.machine_id == Machine.id
    ).order_by(Alert.timestamp.desc())

    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if machine_id:
        query = query.filter(Alert.machine_id == machine_id)

    rows = query.all()
    results = []
    for alert, machine_name, department in rows:
        resp = AlertResponse.from_orm(alert)
        resp.machine_name = machine_name
        resp.department = department
        results.append(resp)
    return results

@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(alert_id: int, update: AlertUpdateStatus, db: Session = Depends(get_db)):
    """Transition alert state: NEW -> ACKNOWLEDGED -> RESOLVED."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.status = update.status
    db.commit()
    db.refresh(alert)
    return AlertResponse.from_orm(alert)
