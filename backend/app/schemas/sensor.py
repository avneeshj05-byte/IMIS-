from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

class SensorReadingBase(BaseModel):
    machine_id: str
    temperature: float = Field(..., description="Motor/Casing Temperature in °C")
    vibration: float = Field(..., description="Vibration velocity in mm/s RMS")
    pressure: float = Field(..., description="Operating hydraulic/pneumatic pressure in bar")
    rpm: float = Field(..., description="Shaft rotational speed in RPM")
    current: float = Field(..., description="Motor load current in Amperes")
    is_anomaly: bool = False
    anomaly_score: float = 0.0

class SensorReadingCreate(SensorReadingBase):
    pass

class SensorReadingResponse(SensorReadingBase):
    id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class MachineTelemetry(BaseModel):
    machine_id: str
    machine_name: str
    department: str
    status: str
    latest_reading: Optional[SensorReadingResponse] = None
    recent_readings: List[SensorReadingResponse] = []
    normal_ranges: dict

class SimulationInjectRequest(BaseModel):
    machine_id: str
    anomaly_type: str = Field(..., example="THERMAL_OVERHEAT") # THERMAL_OVERHEAT, BEARING_VIBRATION, PRESSURE_DROP, CURRENT_SPIKE, RESET
    severity_multiplier: float = 1.35
