export interface Machine {
  id: string;
  name: string;
  machine_type: string;
  department: string;
  installation_date: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'STANDBY';
  health_score: number;
  last_maintenance: string;
  next_maintenance: string;
  operating_hours: number;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  current_temp?: number;
  current_vib?: number;
  current_press?: number;
  current_rpm?: number;
  current_curr?: number;
  temp_min: number;
  temp_max: number;
  vib_max: number;
  press_min: number;
  press_max: number;
}

export interface MachineSummary {
  total_machines: number;
  operational_machines: number;
  maintenance_machines: number;
  critical_machines: number;
  active_alerts: number;
  critical_alerts: number;
  maintenance_due: number;
  avg_fleet_health: number;
}

export interface SensorReading {
  machine_id: string;
  machine_name: string;
  department: string;
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
  rpm: number;
  current: number;
  is_anomaly: boolean;
  anomaly_reason?: string;
  nominal_limits: {
    temp_max: number;
    vib_max: number;
    press_min: number;
    press_max: number;
  };
}

export interface SourceCitation {
  document_name: string;
  page_number: number;
  excerpt: string;
  similarity_score: number;
}

export interface DiagnosticResponse {
  query: string;
  machine_id?: string;
  diagnostic_summary: string;
  probable_causes: string[];
  recommended_inspections: string[];
  step_by_step_troubleshooting: string[];
  safety_precautions: string[];
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_rationale: string;
  citations: SourceCitation[];
  retrieval_count: number;
  is_sufficient_evidence: boolean;
  generated_at: string;
  llm_provider: string;
}

export interface MaintenanceRecord {
  id: number;
  machine_id: string;
  maintenance_date: string;
  reported_issue: string;
  error_code: string;
  root_cause: string;
  corrective_action: string;
  technician_notes: string;
  technician_name: string;
  downtime_hours: number;
  resolution_status: 'RESOLVED' | 'IN_PROGRESS' | 'SCHEDULED';
}

export interface Alert {
  id: number;
  alert_code: string;
  machine_id: string;
  machine_name?: string;
  department?: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  anomaly_id?: number;
}

export interface DocumentItem {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  page_count: number;
  chunk_count: number;
  document_type: string;
  upload_timestamp: string;
  status: string;
  summary?: string;
}
