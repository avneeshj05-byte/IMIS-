from pydantic import BaseModel, Field
from typing import Optional, List

class MaintenanceRecordBase(BaseModel):
    machine_id: str
    maintenance_date: str = Field(..., example="2026-11-02")
    reported_issue: str = Field(..., example="Excessive conveyor bearing friction and motor temperature elevation")
    error_code: str = Field("N/A", example="E17")
    root_cause: str = Field(..., example="Drive pulley bearing race galling and grease breakdown")
    corrective_action: str = Field(..., example="Flushed bearing housing, replaced deep-groove ball bearings, re-lubricated with ISO VG 220")
    technician_notes: str = Field("", example="Operational test ran for 30 minutes. Temperature stabilized at 62°C.")
    technician_name: str = Field("Senior Specialist R. Vance")
    downtime_hours: float = Field(2.5, ge=0.0)
    resolution_status: str = Field("RESOLVED", example="RESOLVED")

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int

    class Config:
        from_attributes = True

class MaintenanceStats(BaseModel):
    total_records: int
    total_downtime_hours: float
    common_error_codes: List[dict]
    recent_records: List[MaintenanceRecordResponse]
