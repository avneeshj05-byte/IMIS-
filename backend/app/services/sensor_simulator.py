import random
import math
import time
import datetime
from typing import Dict, Any, List, Optional

class MachineSimulationProfile:
    """Baseline physical telemetry profiles for industrial assets."""
    def __init__(
        self,
        machine_id: str,
        name: str,
        department: str,
        temp_base: float,
        temp_noise: float,
        vib_base: float,
        vib_noise: float,
        press_base: float,
        press_noise: float,
        rpm_base: float,
        rpm_noise: float,
        curr_base: float,
        curr_noise: float,
        temp_max_threshold: float,
        vib_max_threshold: float,
        press_min_threshold: float,
        press_max_threshold: float
    ):
        self.machine_id = machine_id
        self.name = name
        self.department = department
        self.temp_base = temp_base
        self.temp_noise = temp_noise
        self.vib_base = vib_base
        self.vib_noise = vib_noise
        self.press_base = press_base
        self.press_noise = press_noise
        self.rpm_base = rpm_base
        self.rpm_noise = rpm_noise
        self.curr_base = curr_base
        self.curr_noise = curr_noise
        
        # Operational limits
        self.temp_max_threshold = temp_max_threshold
        self.vib_max_threshold = vib_max_threshold
        self.press_min_threshold = press_min_threshold
        self.press_max_threshold = press_max_threshold

        # Dynamic state & active anomaly injection
        self.step_counter = 0
        self.active_anomaly = None  # None, "THERMAL_OVERHEAT", "BEARING_VIBRATION", "PRESSURE_DROP", "CURRENT_SPIKE"
        self.anomaly_start_time = None
        self.anomaly_severity = 1.0


class SensorSimulator:
    """Continuous multi-asset IoT sensor data generator with physics-informed degradation patterns."""

    def __init__(self):
        self.profiles: Dict[str, MachineSimulationProfile] = {
            "M201": MachineSimulationProfile(
                machine_id="M201",
                name="CNC Milling Machine",
                department="Precision Machining Bay A",
                temp_base=52.0, temp_noise=1.5,
                vib_base=2.1, vib_noise=0.25,
                press_base=6.2, press_noise=0.15,
                rpm_base=3200.0, rpm_noise=25.0,
                curr_base=18.5, curr_noise=0.8,
                temp_max_threshold=78.0,
                vib_max_threshold=4.5,
                press_min_threshold=4.5,
                press_max_threshold=7.5
            ),
            "M202": MachineSimulationProfile(
                machine_id="M202",
                name="Hydraulic Press",
                department="Forming & Stamping",
                temp_base=48.0, temp_noise=1.2,
                vib_base=1.8, vib_noise=0.2,
                press_base=160.0, press_noise=4.0,  # High pressure hydraulic system
                rpm_base=1200.0, rpm_noise=15.0,
                curr_base=22.0, curr_noise=1.1,
                temp_max_threshold=75.0,
                vib_max_threshold=4.0,
                press_min_threshold=130.0,
                press_max_threshold=185.0
            ),
            "M203": MachineSimulationProfile(
                machine_id="M203",
                name="Industrial Compressor",
                department="Pneumatic Utilities",
                temp_base=68.0, temp_noise=2.0,
                vib_base=2.8, vib_noise=0.35,
                press_base=8.5, press_noise=0.3,
                rpm_base=2950.0, rpm_noise=30.0,
                curr_base=32.0, curr_noise=1.4,
                temp_max_threshold=92.0,
                vib_max_threshold=5.2,
                press_min_threshold=6.5,
                press_max_threshold=10.0
            ),
            "M204": MachineSimulationProfile(
                machine_id="M204",
                name="Conveyor Motor",
                department="Assembly Line 2",
                temp_base=58.0, temp_noise=1.4,
                vib_base=1.9, vib_noise=0.22,
                press_base=3.2, press_noise=0.1,
                rpm_base=1480.0, rpm_noise=12.0,
                curr_base=14.2, curr_noise=0.6,
                temp_max_threshold=80.0,
                vib_max_threshold=4.2,
                press_min_threshold=2.0,
                press_max_threshold=4.5
            ),
            "M205": MachineSimulationProfile(
                machine_id="M205",
                name="Injection Moulding Machine",
                department="Polymer Processing Bay B",
                temp_base=72.0, temp_noise=2.2,
                vib_base=2.4, vib_noise=0.3,
                press_base=140.0, press_noise=3.5,
                rpm_base=1450.0, rpm_noise=18.0,
                curr_base=28.4, curr_noise=1.2,
                temp_max_threshold=95.0,
                vib_max_threshold=4.8,
                press_min_threshold=115.0,
                press_max_threshold=165.0
            )
        }
        # Pre-seed initial historical telemetry memory per machine
        self.history: Dict[str, List[Dict[str, Any]]] = {m_id: [] for m_id in self.profiles}
        self._initialize_warmup_history()

    def _initialize_warmup_history(self):
        """Pre-populate 30 baseline readings per machine so charts have immediate real-time trendlines."""
        base_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
        for i in range(30):
            t = base_time + datetime.timedelta(seconds=i * 30)
            for m_id, prof in self.profiles.items():
                reading = self._calculate_reading(prof, t, apply_anomaly=False)
                self.history[m_id].append(reading)

    def inject_anomaly(self, machine_id: str, anomaly_type: str, severity: float = 1.35) -> bool:
        """Manually trigger or clear a simulated degradation anomaly."""
        if machine_id not in self.profiles:
            return False

        prof = self.profiles[machine_id]
        if anomaly_type == "RESET":
            prof.active_anomaly = None
            prof.anomaly_start_time = None
            prof.anomaly_severity = 1.0
        else:
            prof.active_anomaly = anomaly_type
            prof.anomaly_start_time = time.time()
            prof.anomaly_severity = severity
        return True

    def _calculate_reading(self, prof: MachineSimulationProfile, timestamp: datetime.datetime, apply_anomaly: bool = True) -> Dict[str, Any]:
        """Compute instantaneous telemetry values incorporating thermal inertia, cycle harmonics, and active anomalies."""
        prof.step_counter += 1
        harmonic = math.sin(prof.step_counter * 0.15) * 0.5

        # Base noise
        t_noise = random.gauss(0, prof.temp_noise * 0.4)
        v_noise = random.gauss(0, prof.vib_noise * 0.3)
        p_noise = random.gauss(0, prof.press_noise * 0.3)
        r_noise = random.gauss(0, prof.rpm_noise * 0.4)
        c_noise = random.gauss(0, prof.curr_noise * 0.3)

        temp = prof.temp_base + harmonic + t_noise
        vib = prof.vib_base + abs(harmonic * 0.2) + v_noise
        press = prof.press_base + p_noise
        rpm = prof.rpm_base + r_noise
        curr = prof.curr_base + c_noise

        # Apply active anomaly if configured
        is_anomaly = False
        anomaly_reason = None

        if apply_anomaly and prof.active_anomaly:
            is_anomaly = True
            sev = prof.anomaly_severity
            if prof.active_anomaly == "THERMAL_OVERHEAT":
                # Gradual thermal escalation simulating cooling failure / bearing seizure
                elapsed = min(15, (time.time() - (prof.anomaly_start_time or time.time())) / 2.0)
                temp += (prof.temp_max_threshold - prof.temp_base) * 0.4 * sev + elapsed * 1.5
                curr += 3.5 * sev
                anomaly_reason = "Abnormal Motor Casing Temperature"
            elif prof.active_anomaly == "BEARING_VIBRATION":
                # High frequency vibration harmonic simulating spalled bearing race
                vib += 3.2 * sev + random.uniform(0.5, 1.5)
                temp += 4.0 * sev
                anomaly_reason = "Harmonic Bearing Vibration Elevation"
            elif prof.active_anomaly == "PRESSURE_DROP":
                # Pressure loss simulating seal leakage or relief valve failure
                press = max(0.5, press * (0.65 / sev))
                curr += 2.0
                anomaly_reason = "System Pressure Attenuation / Hydraulic Leak"
            elif prof.active_anomaly == "CURRENT_SPIKE":
                # Electrical overload from mechanical binding
                curr += 12.0 * sev
                temp += 6.0 * sev
                anomaly_reason = "Phase Current Overload / Mechanical Binding"

        reading = {
            "machine_id": prof.machine_id,
            "machine_name": prof.name,
            "department": prof.department,
            "timestamp": timestamp.isoformat(),
            "temperature": round(temp, 2),
            "vibration": round(vib, 3),
            "pressure": round(press, 2),
            "rpm": round(rpm, 1),
            "current": round(curr, 2),
            "is_anomaly": is_anomaly,
            "anomaly_reason": anomaly_reason,
            "nominal_limits": {
                "temp_max": prof.temp_max_threshold,
                "vib_max": prof.vib_max_threshold,
                "press_min": prof.press_min_threshold,
                "press_max": prof.press_max_threshold
            }
        }
        return reading

    def generate_next_readings(self) -> Dict[str, Dict[str, Any]]:
        """Generate one tick of readings for all monitored factory assets."""
        now = datetime.datetime.utcnow()
        latest = {}
        for m_id, prof in self.profiles.items():
            reading = self._calculate_reading(prof, now, apply_anomaly=True)
            self.history[m_id].append(reading)
            # Maintain bounded history window (last 60 readings = 30 minutes at 30s)
            if len(self.history[m_id]) > 60:
                self.history[m_id] = self.history[m_id][-60:]
            latest[m_id] = reading
        return latest

    def get_latest_reading(self, machine_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent reading for a given machine."""
        if machine_id in self.history and self.history[machine_id]:
            return self.history[machine_id][-1]
        return None

    def get_machine_history(self, machine_id: str, limit: int = 40) -> List[Dict[str, Any]]:
        """Get time-series history for chart rendering."""
        if machine_id in self.history:
            return self.history[machine_id][-limit:]
        return []

sensor_simulator = SensorSimulator()
