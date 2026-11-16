import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(50), primary_key=True, index=True)  # e.g., 'M201'
    name = Column(String(100), nullable=False)            # CNC Milling Machine
    machine_type = Column(String(100), nullable=False)     # 5-Axis Vertical Machining Center
    department = Column(String(100), nullable=False)       # Precision Machining Bay A
    installation_date = Column(String(20), nullable=False) # 2021-04-15
    status = Column(String(30), default="OPERATIONAL")    # OPERATIONAL, MAINTENANCE, STANDBY, CRITICAL
    health_score = Column(Float, default=95.0)            # 0 to 100
    last_maintenance = Column(String(20), default="2026-10-10")
    next_maintenance = Column(String(20), default="2026-12-10")
    operating_hours = Column(Float, default=1420.5)
    criticality = Column(String(20), default="HIGH")       # HIGH, MEDIUM, LOW
    specs_json = Column(Text, default="{}")

    # Sensor Nominal Ranges
    temp_min = Column(Float, default=45.0)
    temp_max = Column(Float, default=85.0)
    vib_max = Column(Float, default=4.5)                  # mm/s RMS
    press_min = Column(Float, default=2.0)                # bar
    press_max = Column(Float, default=8.0)
    rpm_nominal = Column(Float, default=1500.0)
    current_max = Column(Float, default=25.0)             # Amperes

    # Relationships
    sensors = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyEvent", back_populates="machine", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    temperature = Column(Float, nullable=False)     # °C
    vibration = Column(Float, nullable=False)       # mm/s RMS
    pressure = Column(Float, nullable=False)        # bar
    rpm = Column(Float, nullable=False)             # RPM
    current = Column(Float, nullable=False)         # Amperes
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)

    machine = relationship("Machine", back_populates="sensors")


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    anomaly_score = Column(Float, nullable=False)
    detection_source = Column(String(50), default="ML_ISOLATION_FOREST") # ML_ISOLATION_FOREST, THRESHOLD_RULE
    deviating_parameters = Column(Text, nullable=False)                  # JSON list: ["temperature", "vibration"]
    description = Column(Text, nullable=False)
    status = Column(String(30), default="OPEN")                         # OPEN, INVESTIGATING, RESOLVED

    machine = relationship("Machine", back_populates="anomalies")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    alert_code = Column(String(30), unique=True, index=True)            # e.g., 'ALT-2026-089'
    machine_id = Column(String(50), ForeignKey("machines.id"), index=True, nullable=False)
    category = Column(String(50), nullable=False)                       # Temperature Anomaly, Vibration Spike, Hydraulic Pressure Drop
    severity = Column(String(20), default="WARNING")                    # CRITICAL, WARNING, INFO
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    status = Column(String(30), default="NEW")                          # NEW, ACKNOWLEDGED, RESOLVED
    anomaly_id = Column(Integer, ForeignKey("anomaly_events.id"), nullable=True)

    machine = relationship("Machine", back_populates="alerts")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), index=True, nullable=False)
    maintenance_date = Column(String(20), nullable=False)               # YYYY-MM-DD
    reported_issue = Column(String(255), nullable=False)
    error_code = Column(String(50), default="N/A", index=True)         # e.g., 'E17', 'E04', 'E88'
    root_cause = Column(Text, default="Pending Inspection")
    corrective_action = Column(Text, nullable=False)
    technician_notes = Column(Text, default="")
    technician_name = Column(String(100), default="Senior Maintenance Specialist")
    downtime_hours = Column(Float, default=1.5)
    resolution_status = Column(String(30), default="RESOLVED")          # RESOLVED, IN_PROGRESS, SCHEDULED

    machine = relationship("Machine", back_populates="maintenance_records")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)                              # bytes
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    document_type = Column(String(50), default="TECHNICAL_MANUAL")      # TECHNICAL_MANUAL, SOP, ERROR_CODE_SPEC, INSPECTION_REPORT
    upload_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="INDEXED")                      # PROCESSING, INDEXED, FAILED
    summary = Column(Text, default="")

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")

    document = relationship("Document", back_populates="chunks")
