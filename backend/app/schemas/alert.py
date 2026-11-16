from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

class AlertBase(BaseModel):
    alert_code: str
    machine_id: str
    category: str
    severity: str = Field("WARNING", example="CRITICAL")
    description: str
    status: str = Field("NEW", example="NEW")
    anomaly_id: Optional[int] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    timestamp: datetime.datetime
    machine_name: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True

class AlertUpdateStatus(BaseModel):
    status: str = Field(..., example="ACKNOWLEDGED") # NEW, ACKNOWLEDGED, RESOLVED
