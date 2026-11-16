from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class MachineBase(BaseModel):
    id: str = Field(..., example="M201")
    name: str = Field(..., example="CNC Milling Machine")
    machine_type: str = Field(..., example="5-Axis Vertical Machining Center")
    department: str = Field(..., example="Precision Machining Bay A")
    installation_date: str = Field(..., example="2021-04-15")
    status: str = Field("OPERATIONAL", example="OPERATIONAL")
    health_score: float = Field(95.0, ge=0.0, le=100.0)
    last_maintenance: str = Field("2026-10-10")
    next_maintenance: str = Field("2026-12-10")
    operating_hours: float = Field(1420.5)
    criticality: str = Field("HIGH")
    temp_min: float = 45.0
    temp_max: float = 85.0
    vib_max: float = 4.5
    press_min: float = 2.0
    press_max: float = 8.0
    rpm_nominal: float = 1500.0
    current_max: float = 25.0

class MachineCreate(MachineBase):
    pass

class MachineResponse(MachineBase):
    specs_json: Optional[str] = "{}"
    current_temp: Optional[float] = None
    current_vib: Optional[float] = None
    current_press: Optional[float] = None
    current_rpm: Optional[float] = None
    current_curr: Optional[float] = None

    class Config:
        from_attributes = True

class MachineSummary(BaseModel):
    total_machines: int
    operational_machines: int
    maintenance_machines: int
    critical_machines: int
    active_alerts: int
    critical_alerts: int
    maintenance_due: int
    avg_fleet_health: float
