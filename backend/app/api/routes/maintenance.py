from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from backend.app.database.connection import get_db
from backend.app.models.database import MaintenanceRecord, Machine
from backend.app.schemas.maintenance import MaintenanceRecordResponse, MaintenanceRecordCreate, MaintenanceStats

router = APIRouter(prefix="/maintenance", tags=["Maintenance History"])

@router.get("", response_model=List[MaintenanceRecordResponse])
def get_maintenance_records(
    machine_id: Optional[str] = None,
    error_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve historical maintenance logs with optional machine and error code filters."""
    query = db.query(MaintenanceRecord).order_by(MaintenanceRecord.id.desc())
    if machine_id:
        query = query.filter(MaintenanceRecord.machine_id == machine_id)
    if error_code:
        query = query.filter(MaintenanceRecord.error_code == error_code)
    return query.all()

@router.post("", response_model=MaintenanceRecordResponse)
def create_maintenance_record(data: MaintenanceRecordCreate, db: Session = Depends(get_db)):
    """Log a completed or in-progress maintenance intervention."""
    # Verify machine exists
    machine = db.query(Machine).filter(Machine.id == data.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{data.machine_id}' does not exist.")

    rec = MaintenanceRecord(**data.dict())
    db.add(rec)
    
    # Update machine status & health
    if data.resolution_status == "RESOLVED":
        machine.status = "OPERATIONAL"
        machine.health_score = min(100.0, machine.health_score + 15.0)
        machine.last_maintenance = data.maintenance_date
    elif data.resolution_status == "IN_PROGRESS":
        machine.status = "MAINTENANCE"

    db.commit()
    db.refresh(rec)
    return rec

@router.get("/stats", response_model=MaintenanceStats)
def get_maintenance_statistics(db: Session = Depends(get_db)):
    """Get aggregated metrics on recurrent machine failures, downtime, and resolution statuses."""
    records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.id.desc()).all()
    total = len(records)
    total_downtime = sum(r.downtime_hours for r in records)

    # Recurrent error code breakdown
    code_counts = {}
    for r in records:
        code = r.error_code if r.error_code != "N/A" else "Unclassified"
        code_counts[code] = code_counts.get(code, 0) + 1

    common_codes = [{"error_code": k, "count": v} for k, v in sorted(code_counts.items(), key=lambda x: x[1], reverse=True)]

    return MaintenanceStats(
        total_records=total,
        total_downtime_hours=round(total_downtime, 1),
        common_error_codes=common_codes,
        recent_records=records[:5]
    )
