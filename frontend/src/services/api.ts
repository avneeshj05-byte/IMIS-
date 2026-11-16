import {
  Machine,
  MachineSummary,
  SensorReading,
  DiagnosticResponse,
  MaintenanceRecord,
  Alert,
  DocumentItem
} from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Machines
  getMachines: async (department?: string, status?: string): Promise<Machine[]> => {
    let url = `${API_BASE}/machines`;
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },

  getMachineSummary: async (): Promise<MachineSummary> => {
    const res = await fetch(`${API_BASE}/machines/summary`);
    return res.json();
  },

  getMachineById: async (id: string): Promise<Machine> => {
    const res = await fetch(`${API_BASE}/machines/${id}`);
    return res.json();
  },

  // Sensors & Telemetry
  getLatestSensors: async (): Promise<Record<string, SensorReading>> => {
    const res = await fetch(`${API_BASE}/sensors/latest`);
    return res.json();
  },

  getSensorHistory: async (machineId: string, limit = 40): Promise<SensorReading[]> => {
    const res = await fetch(`${API_BASE}/sensors/${machineId}/history?limit=${limit}`);
    return res.json();
  },

  injectAnomaly: async (machineId: string, anomalyType: string, severityMultiplier = 1.35) => {
    const res = await fetch(`${API_BASE}/sensors/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, anomaly_type: anomalyType, severity_multiplier: severityMultiplier })
    });
    return res.json();
  },

  // Diagnostics (RAG)
  queryDiagnostics: async (query: string, machineId?: string): Promise<DiagnosticResponse> => {
    const res = await fetch(`${API_BASE}/diagnostics/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, machine_id: machineId, include_maintenance_history: true, top_k: 4 })
    });
    return res.json();
  },

  // Documents Knowledge Base
  getDocuments: async (): Promise<DocumentItem[]> => {
    const res = await fetch(`${API_BASE}/documents`);
    return res.json();
  },

  uploadDocument: async (file: File, documentType = 'TECHNICAL_MANUAL') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  deleteDocument: async (id: number) => {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Maintenance
  getMaintenanceRecords: async (machineId?: string, errorCode?: string): Promise<MaintenanceRecord[]> => {
    let url = `${API_BASE}/maintenance`;
    const params = new URLSearchParams();
    if (machineId) params.append('machine_id', machineId);
    if (errorCode) params.append('error_code', errorCode);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },

  createMaintenanceRecord: async (record: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> => {
    const res = await fetch(`${API_BASE}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    return res.json();
  },

  // Alerts
  getAlerts: async (status?: string, severity?: string): Promise<Alert[]> => {
    let url = `${API_BASE}/alerts`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    return res.json();
  },

  updateAlertStatus: async (id: number, status: string): Promise<Alert> => {
    const res = await fetch(`${API_BASE}/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateSettings: async (settings: { llm_provider: string; api_key?: string; model_name?: string }) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  }
};
