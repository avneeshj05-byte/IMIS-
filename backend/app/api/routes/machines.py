from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database.connection import get_db
from backend.app.models.database import Machine, Alert, MaintenanceRecord
from backend.app.schemas.machine import MachineResponse, MachineSummary, MachineCreate
from backend.app.services.sensor_simulator import sensor_simulator

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineResponse])
def get_machines(
    department: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all monitored machines with attached latest sensor readings."""
    query = db.query(Machine)
    if department:
        query = query.filter(Machine.department == department)
    if status:
        query = query.filter(Machine.status == status)
    
    machines = query.all()
    results = []
    for m in machines:
        resp = MachineResponse.from_orm(m)
        latest = sensor_simulator.get_latest_reading(m.id)
        if latest:
            resp.current_temp = latest.get("temperature")
            resp.current_vib = latest.get("vibration")
            resp.current_press = latest.get("pressure")
            resp.current_rpm = latest.get("rpm")
            resp.current_curr = latest.get("current")
        results.append(resp)
    return results

@router.get("/summary", response_model=MachineSummary)
def get_machine_summary(db: Session = Depends(get_db)):
    """Retrieve industrial facility aggregated KPIs for the Overview Dashboard."""
    machines = db.query(Machine).all()
    total = len(machines)
    operational = sum(1 for m in machines if m.status == "OPERATIONAL")
    maintenance = sum(1 for m in machines if m.status == "MAINTENANCE")
    critical = sum(1 for m in machines if m.status == "CRITICAL" or m.health_score < 75.0)

    alerts = db.query(Alert).filter(Alert.status != "RESOLVED").all()
    active_alerts = len(alerts)
    critical_alerts = sum(1 for a in alerts if a.severity == "CRITICAL")
    
    # Machines with next maintenance in near future
    maintenance_due = sum(1 for m in machines if m.health_score < 80.0 or m.status == "MAINTENANCE")
    avg_health = round(sum(m.health_score for m in machines) / total, 1) if total > 0 else 100.0

    return MachineSummary(
        total_machines=total,
        operational_machines=operational,
        maintenance_machines=maintenance,
        critical_machines=critical,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        maintenance_due=maintenance_due,
        avg_fleet_health=avg_health
    )

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine_by_id(machine_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed specification and telemetry of a single machine."""
    m = db.query(Machine).filter(Machine.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
    
    resp = MachineResponse.from_orm(m)
    latest = sensor_simulator.get_latest_reading(m.id)
    if latest:
        resp.current_temp = latest.get("temperature")
        resp.current_vib = latest.get("vibration")
        resp.current_press = latest.get("pressure")
        resp.current_rpm = latest.get("rpm")
        resp.current_curr = latest.get("current")
    return resp

@router.post("", response_model=MachineResponse)
def create_machine(data: MachineCreate, db: Session = Depends(get_db)):
    """Register a new industrial machine into the facility inventory."""
    existing = db.query(Machine).filter(Machine.id == data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Machine with ID '{data.id}' already exists.")
    
    new_machine = Machine(**data.dict())
    db.add(new_machine)
    db.commit()
    db.refresh(new_machine)
    return MachineResponse.from_orm(new_machine)
