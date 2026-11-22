import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Bot, 
  FileText, 
  Activity, 
  Wrench, 
  AlertTriangle, 
  Settings as SettingsIcon,
  RefreshCw,
  Search,
  Plus,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sliders,
  X,
  ChevronRight,
  Info,
  ShieldAlert,
  Trash2,
  AlertCircle,
  ExternalLink,
  Gauge
} from 'lucide-react';
import { api } from './services/api';
import { 
  Machine, 
  MachineSummary, 
  Alert, 
  SensorReading, 
  DiagnosticResponse, 
  MaintenanceRecord, 
  DocumentItem 
} from './types';

// Standalone SVG Telemetry Trendline Component
const TechSensorChart: React.FC<{
  data: number[];
  unit: string;
  limitVal?: number | null;
  color: string;
  title: string;
}> = ({ data, unit, limitVal, color, title }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[#737D76] font-mono bg-[#FAFBFA] border border-[#DDE2DD] rounded">
        Gathering telemetry samples...
      </div>
    );
  }
  const minV = Math.min(...data) * 0.95;
  const maxV = Math.max(...data) * 1.05;
  const w = 460;
  const h = 170;
  const padX = 40;
  const padY = 22;

  const points = data.map((v, idx) => {
    const x = padX + (idx / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - ((v - minV) / (maxV - minV || 1)) * (h - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const ly = (limitVal !== undefined && limitVal !== null && limitVal >= minV && limitVal <= maxV)
    ? h - padY - ((limitVal - minV) / (maxV - minV || 1)) * (h - padY * 2)
    : null;

  const latest = data[data.length - 1];

  return (
    <div className="bg-[#FAFBFA] border border-[#DDE2DD] rounded p-3">
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="font-semibold text-[#202A25]">{title}</span>
        <div className="font-mono text-[11px] flex gap-3">
          <span className="text-[#737D76]">Min: {Math.min(...data).toFixed(1)}</span>
          <span className="text-[#737D76]">Max: {Math.max(...data).toFixed(1)}</span>
          <span className="font-bold text-[#315C49]">Now: {latest.toFixed(1)} {unit}</span>
        </div>
      </div>
      <svg className="w-full h-36" viewBox={`0 0 ${w} ${h}`}>
        {/* Gridlines */}
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#E5E8E5" strokeDasharray="3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#E5E8E5" strokeDasharray="3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#E5E8E5" strokeDasharray="3" />
        
        {/* Threshold limit line */}
        {ly !== null && (
          <g>
            <line x1={padX} y1={ly} x2={w - padX} y2={ly} stroke="#B84C42" strokeDasharray="4" strokeWidth="1.5" />
            <text x={w - padX - 4} y={ly - 4} fill="#B84C42" fontFamily="IBM Plex Mono" fontSize="9" textAnchor="end">
              LIMIT ({limitVal} {unit})
            </text>
          </g>
        )}

        {/* Polylines */}
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'diagnostics' | 'knowledge' | 'sensors' | 'maintenance' | 'alerts' | 'settings'>('overview');
  
  // Core Operational State
  const [summary, setSummary] = useState<MachineSummary | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  
  // Selected Machine for Detail / Telemetry
  const [selectedMachineId, setSelectedMachineId] = useState<string>('M204');
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  
  // Diagnostics State
  const [diagQuery, setDiagQuery] = useState('Machine M204 is showing error E17. What should I check?');
  const [diagMachine, setDiagMachine] = useState('M204');
  const [diagResult, setDiagResult] = useState<DiagnosticResponse | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Filters
  const [assetSearch, setAssetSearch] = useState('');
  const [assetDept, setAssetDept] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState('');
  const [alertSevFilter, setAlertSevFilter] = useState('');
  const [maintSearch, setMaintSearch] = useState('');
  const [maintMachineFilter, setMaintMachineFilter] = useState('');

  // Settings State
  const [llmProvider, setLlmProvider] = useState('LOCAL_GROUNDED');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [healthInfo, setHealthInfo] = useState<any>(null);

  // Modals State
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [simMachine, setSimMachine] = useState('M204');
  const [simType, setSimType] = useState('THERMAL_OVERHEAT');
  const [simSev, setSimSev] = useState(1.4);

  const [showMaintModal, setShowMaintModal] = useState(false);
  const [newMaint, setNewMaint] = useState({
    machine_id: 'M204',
    error_code: 'E17',
    reported_issue: 'Conveyor drive bearing overheating and high vibration',
    root_cause: 'Galling on outer bearing race due to grease degradation',
    corrective_action: 'Flushed housing, replaced 6308-2RS bearing, re-lubricated with Mobil Polyrex EM, aligned laser coupling.',
    technician_notes: 'Completed under OSHA LOTO protocol.',
    technician_name: 'Lead Mech. J. Taylor',
    downtime_hours: 1.5,
    resolution_status: 'RESOLVED' as const
  });

  const [docUploadMsg, setDocUploadMsg] = useState('');
  const [docUploading, setDocUploading] = useState(false);

  // Load Initial & Polling Data
  useEffect(() => {
    loadDashboardData();
    loadAllRecords();
    const interval = setInterval(() => {
      loadDashboardData();
      if (activeTab === 'sensors' || activeTab === 'overview') {
        loadTelemetryData(selectedMachineId);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeTab, selectedMachineId]);

  const loadDashboardData = async () => {
    try {
      const [sum, machs, alts] = await Promise.all([
        api.getMachineSummary(),
        api.getMachines(),
        api.getAlerts('NEW')
      ]);
      setSummary(sum);
      setMachines(machs);
      setActiveAlerts(alts);
    } catch (e) {
      console.error("Dashboard poll error:", e);
    }
  };

  const loadAllRecords = async () => {
    try {
      const [allAlts, maints, docs, sets] = await Promise.all([
        api.getAlerts(),
        api.getMaintenanceRecords(),
        api.getDocuments(),
        api.getSettings()
      ]);
      setAllAlerts(allAlts);
      setMaintenanceRecords(maints);
      setDocuments(docs);
      if (sets) {
        setLlmProvider(sets.llm_provider || 'LOCAL_GROUNDED');
        setModelName(sets.model_name || 'gemini-1.5-flash');
      }
    } catch (e) {
      console.error("Records load error:", e);
    }
  };

  const loadTelemetryData = async (machId: string) => {
    try {
      const hist = await api.getSensorHistory(machId, 30);
      setSensorHistory(hist);
    } catch (e) {
      console.error("Telemetry fetch error:", e);
    }
  };

  // Diagnostics Handler
  const handleExecuteDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await api.queryDiagnostics(diagQuery, diagMachine);
      setDiagResult(res);
    } catch (e) {
      alert("Diagnostic retrieval failed: " + e);
    } finally {
      setDiagLoading(false);
    }
  };

  // Anomaly Injector Handler
  const handleTriggerAnomaly = async () => {
    try {
      await api.injectAnomaly(simMachine, simType, simSev);
      setShowAnomalyModal(false);
      alert(`Anomaly pattern '${simType}' successfully injected into machine ${simMachine}. Telemetry degradation is now streaming.`);
      loadDashboardData();
      loadTelemetryData(simMachine);
    } catch (e) {
      alert("Failed to inject anomaly: " + e);
    }
  };

  // Maintenance Submit
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rec = await api.createMaintenanceRecord({
        ...newMaint,
        maintenance_date: new Date().toISOString()
      });
      setMaintenanceRecords([rec, ...maintenanceRecords]);
      setShowMaintModal(false);
      alert("Maintenance record successfully logged to facility registry.");
      loadDashboardData();
    } catch (e) {
      alert("Failed to create maintenance record: " + e);
    }
  };

  // Alert Actions
  const handleUpdateAlert = async (id: number, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await api.updateAlertStatus(id, status);
      const updated = await api.getAlerts();
      setAllAlerts(updated);
      const active = await api.getAlerts('NEW');
      setActiveAlerts(active);
    } catch (e) {
      alert("Failed to update alert status: " + e);
    }
  };

  // Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setDocUploading(true);
    setDocUploadMsg(`Parsing & chunking '${file.name}' with PyMuPDF and generating sentence embeddings...`);
    try {
      await api.uploadDocument(file);
      setDocUploadMsg(`✓ Successfully indexed '${file.name}' into FAISS vector database!`);
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      setDocUploadMsg(`Upload failed: ${err}`);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm("Are you sure you want to remove this document from the knowledge base?")) return;
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (e) {
      alert("Failed to delete document: " + e);
    }
  };

  // Settings Save
  const handleSaveSettings = async () => {
    try {
      await api.updateSettings({
        llm_provider: llmProvider,
        api_key: apiKey,
        model_name: modelName
      });
      setSettingsNotice("✓ Provider settings updated successfully.");
      setTimeout(() => setSettingsNotice(''), 4000);
    } catch (e) {
      alert("Failed to update settings: " + e);
    }
  };

  const handleTestHealth = async () => {
    try {
      const res = await api.getSettings();
      setHealthInfo(res);
    } catch (e) {
      alert("Health check failed: " + e);
    }
  };

  // Navigate & Pre-fill Diagnostics from Alerts or Machine
  const navigateToDiagnostics = (machineId: string, queryPrompt?: string) => {
    setDiagMachine(machineId);
    if (queryPrompt) setDiagQuery(queryPrompt);
    setActiveTab('diagnostics');
  };

  // Selected Machine Details
  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];
  const latestSensor = sensorHistory[sensorHistory.length - 1];

  // Filtered Machines
  const filteredMachines = machines.filter(m => {
    const matchSearch = m.id.toLowerCase().includes(assetSearch.toLowerCase()) || 
                        m.name.toLowerCase().includes(assetSearch.toLowerCase());
    const matchDept = !assetDept || m.department === assetDept;
    return matchSearch && matchDept;
  });

  // Filtered Maintenance Records
  const filteredMaint = maintenanceRecords.filter(r => {
    const matchSearch = !maintSearch || 
                        r.error_code.toLowerCase().includes(maintSearch.toLowerCase()) || 
                        r.reported_issue.toLowerCase().includes(maintSearch.toLowerCase());
    const matchMach = !maintMachineFilter || r.machine_id === maintMachineFilter;
    return matchSearch && matchMach;
  });

  // Filtered Alerts
  const filteredAlerts = allAlerts.filter(a => {
    const matchStatus = !alertStatusFilter || a.status === alertStatusFilter;
    const matchSev = !alertSevFilter || a.severity === alertSevFilter;
    return matchStatus && matchSev;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4F2] text-[#202A25]">
      {/* FIXED INDUSTRIAL SIDEBAR */}
      <aside className="w-64 bg-[#17251F] text-[#B2BDB6] flex flex-col flex-shrink-0 border-r border-[#0E1713]">
        <div className="p-5 border-b border-[#23342C]">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wider text-white">IMIS</span>
            <span className="bg-[#315C49] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">PRO v1.0</span>
          </div>
          <p className="text-[11px] text-[#8DAA91] mt-1 font-medium tracking-wider uppercase">Industrial Maintenance Intelligence</p>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'A. OVERVIEW', icon: LayoutDashboard },
            { id: 'assets', label: 'B. ASSET MONITORING', icon: Cpu },
            { id: 'diagnostics', label: 'C. AI DIAGNOSTICS', icon: Bot },
            { id: 'knowledge', label: 'D. KNOWLEDGE BASE', icon: FileText },
            { id: 'sensors', label: 'E. SENSOR ANALYTICS', icon: Activity },
            { id: 'maintenance', label: 'F. MAINTENANCE LOGS', icon: Wrench },
            { id: 'alerts', label: 'G. ALERT CENTER', icon: AlertTriangle, badge: activeAlerts.length },
            { id: 'settings', label: 'H. SETTINGS & HEALTH', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (item.id === 'sensors' && selectedMachineId) {
                    loadTelemetryData(selectedMachineId);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-colors ${
                  isActive
                    ? 'bg-[#2C483B] text-white border-l-4 border-[#8DAA91]'
                    : 'text-[#B2BDB6] hover:bg-[#22372E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="bg-[#B84C42] text-white font-mono text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#23342C] bg-[#121E19] text-[11px]">
          <div className="flex items-center gap-2 text-[#8DAA91] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#39D353] shadow-[0_0_6px_#39D353]"></span>
            <span>MQTT/SCADA: LIVE</span>
          </div>
          <div className="flex justify-between text-[#8C9990] mt-2">
            <span>FACILITY BAY-04</span>
            <span className="font-mono">OP-882</span>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-[#DDE2DD] px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#202A25]">
              {activeTab === 'overview' && 'Industrial Operations Overview'}
              {activeTab === 'assets' && 'Asset Monitoring & Specifications'}
              {activeTab === 'diagnostics' && 'AI Diagnostics & RAG Knowledge Retrieval'}
              {activeTab === 'knowledge' && 'Document Knowledge Base & Chunks'}
              {activeTab === 'sensors' && 'IoT Sensor Telemetry Analytics'}
              {activeTab === 'maintenance' && 'Equipment Maintenance History Logs'}
              {activeTab === 'alerts' && 'Centralized Alert Center'}
              {activeTab === 'settings' && 'System Settings & Operational Health'}
            </h1>
            <div className="inline-flex items-center gap-2 bg-[#EBF3ED] border border-[#8DAA91] text-[#315C49] font-mono text-xs font-semibold px-2.5 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315C49] animate-pulse"></span>
              <span>SIMULATION MODE (PHYSICS DEGRADATION ACTIVE)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnomalyModal(true)}
              className="bg-[#FAFBFA] border border-[#AAB2AA] hover:bg-[#E8ECE8] text-[#202A25] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2"
            >
              <Sliders className="w-3.5 h-3.5 text-[#D69A36]" />
              <span>Inject Anomaly</span>
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="bg-[#315C49] hover:bg-[#264A3A] text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Bot className="w-4 h-4" />
              <span>Diagnostic Assistant</span>
            </button>
          </div>
        </header>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW */}
          {/* ============================================================ */}
          {activeTab === 'overview' && (
            <>
              {/* KPIS */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Total Machines</div>
                  <div className="text-2xl font-bold font-mono text-[#202A25] mt-1">{summary?.total_machines ?? 5}</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Monitored Assets</div>
                </div>
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Operational</div>
                  <div className="text-2xl font-bold font-mono text-[#2E7D5A] mt-1">{summary?.operational_machines ?? 4}</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Online & Normal</div>
                </div>
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Under Maintenance</div>
                  <div className="text-2xl font-bold font-mono text-[#D69A36] mt-1">{summary?.maintenance_machines ?? 1}</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Service Required</div>
                </div>
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Active Alerts</div>
                  <div className="text-2xl font-bold font-mono text-[#B84C42] mt-1">{summary?.active_alerts ?? activeAlerts.length}</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Requiring Attention</div>
                </div>
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Fleet Health Index</div>
                  <div className="text-2xl font-bold font-mono text-[#315C49] mt-1">{summary?.avg_fleet_health ?? 88.6}%</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Calculated via ML</div>
                </div>
              </div>

              {/* ASSET STATUS TABLE */}
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#DDE2DD] flex justify-between items-center bg-[#FAFBFA]">
                  <h3 className="text-xs font-bold text-[#202A25] uppercase tracking-wider">Asset Operational Status Matrix</h3>
                  <button onClick={loadDashboardData} className="text-xs flex items-center gap-1.5 text-[#315C49] font-semibold hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9F8] text-[#737D76] border-b border-[#DDE2DD] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Machine Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Temperature</th>
                      <th className="p-3">Vibration</th>
                      <th className="p-3">Pressure</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Service</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE2DD]">
                    {machines.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-3 font-mono font-bold text-[#315C49]">{m.id}</td>
                        <td className="p-3 font-semibold">{m.name}</td>
                        <td className="p-3 text-[#737D76]">{m.department}</td>
                        <td className="p-3 font-mono">{m.current_temp ? `${m.current_temp.toFixed(1)} °C` : '--'}</td>
                        <td className="p-3 font-mono">{m.current_vib ? `${m.current_vib.toFixed(2)} mm/s` : '--'}</td>
                        <td className="p-3 font-mono">{m.current_press ? `${m.current_press.toFixed(1)} bar` : '--'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'OPERATIONAL' ? 'bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]' : 'bg-[#FCF6EC] text-[#D69A36] border border-[#F2DDB8]'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">{m.last_maintenance}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedMachineId(m.id);
                              setActiveTab('assets');
                            }}
                            className="text-[#315C49] hover:underline font-semibold text-[11px]"
                          >
                            Inspect &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RECENT ALERTS + PREVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#DDE2DD]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#D69A36]" /> Recent Facility Alerts
                    </h3>
                    <button onClick={() => setActiveTab('alerts')} className="text-xs text-[#315C49] font-semibold hover:underline">
                      View All ({allAlerts.length})
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeAlerts.slice(0, 4).map((a) => (
                      <div key={a.id} className="p-2.5 bg-[#FAFBFA] border border-[#DDE2DD] rounded flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#B84C42]">{a.alert_code}</span>
                            <span className="font-semibold">{a.machine_id} - {a.machine_name}</span>
                          </div>
                          <p className="text-[11px] text-[#737D76] mt-0.5">{a.description}</p>
                        </div>
                        <button
                          onClick={() => navigateToDiagnostics(a.machine_id, `Diagnose alert ${a.alert_code} on ${a.machine_id}: ${a.description}`)}
                          className="bg-[#315C49] text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Bot className="w-3 h-3" /> Diagnose
                        </button>
                      </div>
                    ))}
                    {activeAlerts.length === 0 && (
                      <p className="text-xs text-[#737D76] py-3 text-center">No active alerts. All machines within nominal tolerances.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#DDE2DD]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#315C49]" /> Live Telemetry Preview (M204 Thermal Profile)
                    </h3>
                    <button onClick={() => { setSelectedMachineId('M204'); setActiveTab('sensors'); }} className="text-xs text-[#315C49] font-semibold hover:underline">
                      Sensor Analytics &rarr;
                    </button>
                  </div>
                  <TechSensorChart
                    data={sensorHistory.map(h => h.temperature)}
                    unit="°C"
                    limitVal={80.0}
                    color="#315C49"
                    title="M204 Conveyor Motor - Operating Temperature"
                  />
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ASSET MONITORING */}
          {/* ============================================================ */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-[#DDE2DD]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Asset Fleet Registry</h3>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#737D76]" />
                      <input
                        type="text"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        placeholder="Search Machine ID or Name..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#DDE2DD] rounded"
                      />
                    </div>
                    <select
                      value={assetDept}
                      onChange={(e) => setAssetDept(e.target.value)}
                      className="text-xs border border-[#DDE2DD] rounded px-3 py-1.5"
                    >
                      <option value="">All Departments</option>
                      <option value="Precision Machining Bay A">Precision Machining Bay A</option>
                      <option value="Forming & Stamping">Forming & Stamping</option>
                      <option value="Pneumatic Utilities">Pneumatic Utilities</option>
                      <option value="Assembly Line 2">Assembly Line 2</option>
                      <option value="Polymer Processing Bay B">Polymer Processing Bay B</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-left text-xs mt-3">
                  <thead className="bg-[#F8F9F8] text-[#737D76] border-b border-[#DDE2DD] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Machine ID</th>
                      <th className="p-3">Machine Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Health Score</th>
                      <th className="p-3">Operating Hours</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE2DD]">
                    {filteredMachines.map((m) => (
                      <tr 
                        key={m.id} 
                        onClick={() => setSelectedMachineId(m.id)}
                        className={`cursor-pointer transition-colors ${selectedMachineId === m.id ? 'bg-[#EBF3ED]' : 'hover:bg-[#F9FAF9]'}`}
                      >
                        <td className="p-3 font-mono font-bold text-[#315C49]">{m.id}</td>
                        <td className="p-3 font-semibold">{m.name}</td>
                        <td className="p-3 text-[#737D76]">{m.machine_type}</td>
                        <td className="p-3 text-[#737D76]">{m.department}</td>
                        <td className="p-3 font-mono font-bold">
                          <span className={m.health_score > 85 ? 'text-[#2E7D5A]' : 'text-[#D69A36]'}>
                            {m.health_score}%
                          </span>
                        </td>
                        <td className="p-3 font-mono">{m.operating_hours.toLocaleString()} hrs</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'OPERATIONAL' ? 'bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]' : 'bg-[#FCF6EC] text-[#D69A36] border border-[#F2DDB8]'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedMachineId(m.id)}
                            className="bg-[#315C49] text-white px-2 py-1 rounded text-[11px] font-semibold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* INSPECTION DETAIL CARD */}
              {selectedMachine && (
                <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-6 space-y-5">
                  <div className="flex justify-between items-center border-b border-[#DDE2DD] pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold font-mono text-[#315C49]">{selectedMachine.id}</span>
                        <h2 className="text-base font-bold text-[#202A25]">{selectedMachine.name}</h2>
                        <span className="text-xs bg-[#EBF3ED] text-[#315C49] font-mono font-semibold px-2 py-0.5 rounded border border-[#8DAA91]">
                          {selectedMachine.department}
                        </span>
                      </div>
                      <p className="text-xs text-[#737D76] mt-1">Model: {selectedMachine.machine_type} &bull; Commissioned: {selectedMachine.installation_date}</p>
                    </div>
                    <button
                      onClick={() => navigateToDiagnostics(selectedMachine.id, `Evaluate operational integrity and check error codes for ${selectedMachine.name} (${selectedMachine.id})`)}
                      className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Investigate with AI RAG &rarr;</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-[#DDE2DD] p-3 rounded bg-[#FAFBFA]">
                      <span className="text-[10px] font-bold text-[#737D76] uppercase">Criticality Tier</span>
                      <div className="text-sm font-bold font-mono text-[#B84C42] mt-1">{selectedMachine.criticality} CRITICALITY</div>
                    </div>
                    <div className="border border-[#DDE2DD] p-3 rounded bg-[#FAFBFA]">
                      <span className="text-[10px] font-bold text-[#737D76] uppercase">Operating Hours</span>
                      <div className="text-sm font-bold font-mono text-[#202A25] mt-1">{selectedMachine.operating_hours.toLocaleString()} Hours</div>
                    </div>
                    <div className="border border-[#DDE2DD] p-3 rounded bg-[#FAFBFA]">
                      <span className="text-[10px] font-bold text-[#737D76] uppercase">Last Maintenance</span>
                      <div className="text-sm font-bold font-mono text-[#202A25] mt-1">{selectedMachine.last_maintenance}</div>
                    </div>
                    <div className="border border-[#DDE2DD] p-3 rounded bg-[#FAFBFA]">
                      <span className="text-[10px] font-bold text-[#737D76] uppercase">Next Scheduled Service</span>
                      <div className="text-sm font-bold font-mono text-[#315C49] mt-1">{selectedMachine.next_maintenance}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#737D76] mb-3">Live Parameter Telemetry Snapshot</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                        <span className="text-[10px] font-bold text-[#737D76] uppercase">Temperature</span>
                        <div className="text-lg font-bold font-mono text-[#202A25] mt-1">
                          {selectedMachine.current_temp ? `${selectedMachine.current_temp.toFixed(1)} °C` : '--'}
                        </div>
                        <span className="text-[10px] font-mono text-[#737D76]">Max: {selectedMachine.temp_max}°C</span>
                      </div>
                      <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                        <span className="text-[10px] font-bold text-[#737D76] uppercase">Vibration (RMS)</span>
                        <div className="text-lg font-bold font-mono text-[#202A25] mt-1">
                          {selectedMachine.current_vib ? `${selectedMachine.current_vib.toFixed(2)} mm/s` : '--'}
                        </div>
                        <span className="text-[10px] font-mono text-[#737D76]">ISO: {selectedMachine.vib_max} mm/s</span>
                      </div>
                      <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                        <span className="text-[10px] font-bold text-[#737D76] uppercase">Pressure</span>
                        <div className="text-lg font-bold font-mono text-[#202A25] mt-1">
                          {selectedMachine.current_press ? `${selectedMachine.current_press.toFixed(1)} bar` : '--'}
                        </div>
                        <span className="text-[10px] font-mono text-[#737D76]">{selectedMachine.press_min} - {selectedMachine.press_max} bar</span>
                      </div>
                      <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                        <span className="text-[10px] font-bold text-[#737D76] uppercase">Shaft RPM</span>
                        <div className="text-lg font-bold font-mono text-[#202A25] mt-1">
                          {selectedMachine.current_rpm ? `${Math.round(selectedMachine.current_rpm)}` : '--'}
                        </div>
                        <span className="text-[10px] font-mono text-[#737D76]">Nominal: 1450 RPM</span>
                      </div>
                      <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                        <span className="text-[10px] font-bold text-[#737D76] uppercase">Load Current</span>
                        <div className="text-lg font-bold font-mono text-[#202A25] mt-1">
                          {selectedMachine.current_curr ? `${selectedMachine.current_curr.toFixed(1)} A` : '--'}
                        </div>
                        <span className="text-[10px] font-mono text-[#737D76]">3-Phase 400V</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: AI DIAGNOSTICS (CORE RAG MODULE) */}
          {/* ============================================================ */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] p-5 rounded shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[#DDE2DD] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">RAG Intelligent Diagnostics Engine</h3>
                  <span className="text-[11px] font-mono text-[#737D76]">STRICT DOCUMENT GROUNDING</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Target Asset</label>
                    <select
                      value={diagMachine}
                      onChange={(e) => setDiagMachine(e.target.value)}
                      className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                    >
                      <option value="M201">M201 - CNC Milling</option>
                      <option value="M202">M202 - Hydraulic Press</option>
                      <option value="M203">M203 - Industrial Compressor</option>
                      <option value="M204">M204 - Conveyor Motor</option>
                      <option value="M205">M205 - Injection Moulding</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Diagnostic Question / Error Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={diagQuery}
                        onChange={(e) => setDiagQuery(e.target.value)}
                        className="flex-1 border border-[#DDE2DD] rounded p-2 text-xs"
                        placeholder="e.g. Machine M204 is showing error E17. What should I check?"
                      />
                      <button
                        onClick={handleExecuteDiagnostics}
                        disabled={diagLoading}
                        className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-2 rounded text-xs font-bold shadow-sm"
                      >
                        {diagLoading ? 'Searching FAISS...' : 'Run RAG'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[11px] font-bold text-[#737D76]">Quick Scenarios:</span>
                  <button
                    onClick={() => {
                      setDiagMachine('M204');
                      setDiagQuery('Machine M204 is showing error E17. What should I check?');
                    }}
                    className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[11px] px-2.5 py-1 rounded"
                  >
                    E17 Motor Thermal Overload (M204)
                  </button>
                  <button
                    onClick={() => {
                      setDiagMachine('M201');
                      setDiagQuery('Machine M201 spindle vibration alarm E04 during high speed milling. What are the corrective actions?');
                    }}
                    className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[11px] px-2.5 py-1 rounded"
                  >
                    E04 Spindle Imbalance (M201)
                  </button>
                  <button
                    onClick={() => {
                      setDiagMachine('M202');
                      setDiagQuery('Hydraulic Press M202 showing error E88 with pressure dropping below 135 bar. What SOP should I follow?');
                    }}
                    className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[11px] px-2.5 py-1 rounded"
                  >
                    E88 Pressure Loss (M202)
                  </button>
                </div>
              </div>

              {diagResult && (
                <div className="bg-white border border-[#DDE2DD] p-6 rounded shadow-sm space-y-5">
                  <div className="flex justify-between items-center border-b border-[#DDE2DD] pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide">Structured Diagnostic Troubleshooting Report</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#737D76]">Evidence Confidence:</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        diagResult.confidence_level === 'HIGH' ? 'bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]' : 'bg-[#FCF6EC] text-[#D69A36] border border-[#F2DDB8]'
                      }`}>
                        {diagResult.confidence_level}
                      </span>
                    </div>
                  </div>

                  <div className="border-l-4 border-[#315C49] bg-[#FAFBFA] p-4 rounded">
                    <div className="text-[11px] font-bold uppercase text-[#315C49] mb-1">Diagnostic Summary</div>
                    <p className="text-xs leading-relaxed text-[#202A25]">{diagResult.diagnostic_summary}</p>
                    <p className="text-[11px] text-[#737D76] mt-2 font-mono">{diagResult.confidence_rationale}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-[#DDE2DD] p-4 rounded">
                      <div className="text-[11px] font-bold uppercase text-[#D69A36] mb-2">Probable Causes</div>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        {diagResult.probable_causes.map((c: string, idx: number) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="border border-[#DDE2DD] p-4 rounded">
                      <div className="text-[11px] font-bold uppercase text-[#315C49] mb-2">Recommended Inspections</div>
                      <ul className="text-xs list-disc list-inside space-y-1">
                        {diagResult.recommended_inspections.map((i: string, idx: number) => (
                          <li key={idx}>{i}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border border-[#DDE2DD] p-4 rounded">
                    <div className="text-[11px] font-bold uppercase text-[#2E7D5A] mb-2">Step-by-Step SOP Troubleshooting</div>
                    <ol className="text-xs list-decimal list-inside space-y-1.5">
                      {diagResult.step_by_step_troubleshooting.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="border border-[#F5C6C1] bg-[#FBEFED] p-4 rounded">
                    <div className="text-[11px] font-bold uppercase text-[#B84C42] mb-1">Mandatory Safety Precautions (OSHA LOTO)</div>
                    <ul className="text-xs list-disc list-inside space-y-1 text-[#202A25]">
                      {diagResult.safety_precautions.map((p: string, idx: number) => (
                        <li key={idx}><strong>{p}</strong></li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase text-[#202A25] mb-2">Document Citations & Source Transparency</div>
                    <div className="space-y-2">
                      {diagResult.citations.map((cite: any, idx: number) => (
                        <div key={idx} className="bg-[#F9FAF9] border border-[#DDE2DD] p-3 rounded text-xs">
                          <div className="flex justify-between items-center font-semibold text-[#315C49] mb-1">
                            <span>[REF {idx + 1}] {cite.document_name} &bull; Page {cite.page_number}</span>
                            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 border border-[#DDE2DD] rounded">
                              Cosine Similarity: {(cite.similarity_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[#737D76] italic border-l-2 border-[#DDE2DD] pl-2 mt-1">{cite.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#DDE2DD] flex justify-between items-center">
                    <span className="font-mono text-[11px] text-[#737D76]">Provider: {diagResult.llm_provider}</span>
                    <button
                      onClick={() => {
                        setNewMaint({
                          ...newMaint,
                          machine_id: diagMachine,
                          error_code: 'E17',
                          reported_issue: diagResult.diagnostic_summary.slice(0, 80)
                        });
                        setShowMaintModal(true);
                      }}
                      className="bg-[#315C49] hover:bg-[#264A3A] text-white px-3 py-1.5 rounded text-xs font-bold"
                    >
                      Record Maintenance Action &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: KNOWLEDGE BASE */}
          {/* ============================================================ */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-5">
                <div className="flex justify-between items-center pb-3 border-b border-[#DDE2DD] mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Technical Document Ingestion & Vector Indexing</h3>
                  <span className="font-mono text-[11px] text-[#737D76]">PyMuPDF + FAISS</span>
                </div>

                <div className="border-2 border-dashed border-[#AAB2AA] rounded-lg p-8 text-center bg-[#FAFBFA]">
                  <UploadCloud className="w-10 h-10 text-[#737D76] mx-auto mb-2" />
                  <p className="font-semibold text-xs text-[#202A25]">Upload Technical Manuals, SOPs, or Error Code Documentation</p>
                  <p className="text-[11px] text-[#737D76] mt-1 mb-4">Supported formats: PDF, TXT, MD (Max 25MB)</p>
                  
                  <input
                    type="file"
                    id="kb-upload-input"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('kb-upload-input')?.click()}
                    disabled={docUploading}
                    className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-2 rounded text-xs font-bold"
                  >
                    {docUploading ? 'Processing Document...' : 'Select PDF Manual'}
                  </button>

                  {docUploadMsg && (
                    <div className="mt-3 font-mono text-xs text-[#315C49] bg-[#EBF3ED] p-2 rounded inline-block">
                      {docUploadMsg}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#DDE2DD] mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Indexed Technical Documentation Library</h3>
                  <button onClick={loadAllRecords} className="text-xs flex items-center gap-1.5 text-[#315C49] font-semibold hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Library
                  </button>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9F8] text-[#737D76] border-b border-[#DDE2DD] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Pages</th>
                      <th className="p-3">Vector Chunks</th>
                      <th className="p-3">File Size</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Indexed Timestamp</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE2DD]">
                    {documents.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-3 font-semibold text-[#202A25]">{d.filename}</td>
                        <td className="p-3 font-mono text-[#737D76]">{d.document_type}</td>
                        <td className="p-3 font-mono">{d.page_count}</td>
                        <td className="p-3 font-mono font-bold text-[#315C49]">{d.chunk_count} chunks</td>
                        <td className="p-3 font-mono text-[#737D76]">{(d.file_size / 1024).toFixed(1)} KB</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]">
                            {d.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#737D76]">{new Date(d.upload_timestamp).toLocaleDateString()}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteDoc(d.id)}
                            className="text-[#B84C42] hover:text-red-700 font-semibold text-[11px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-xs text-[#737D76]">
                          No technical documentation uploaded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: SENSOR ANALYTICS */}
          {/* ============================================================ */}
          {activeTab === 'sensors' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#DDE2DD] mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Real-Time Sensor Telemetry & Anomaly Analysis</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#737D76]">Target Machine:</span>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => {
                        setSelectedMachineId(e.target.value);
                        loadTelemetryData(e.target.value);
                      }}
                      className="border border-[#DDE2DD] rounded px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="M201">M201 - CNC Milling Machine</option>
                      <option value="M202">M202 - Hydraulic Press</option>
                      <option value="M203">M203 - Industrial Compressor</option>
                      <option value="M204">M204 - Conveyor Motor</option>
                      <option value="M205">M205 - Injection Moulding Machine</option>
                    </select>
                  </div>
                </div>

                {/* GAUGES */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                    <span className="text-[10px] font-bold text-[#737D76] uppercase">Temperature</span>
                    <div className="text-xl font-bold font-mono text-[#202A25] mt-1">
                      {latestSensor?.temperature ? `${latestSensor.temperature.toFixed(1)} °C` : '--'}
                    </div>
                    <span className="text-[10px] font-mono text-[#B84C42]">Max: 80.0 °C</span>
                  </div>
                  <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                    <span className="text-[10px] font-bold text-[#737D76] uppercase">Vibration (RMS)</span>
                    <div className="text-xl font-bold font-mono text-[#202A25] mt-1">
                      {latestSensor?.vibration ? `${latestSensor.vibration.toFixed(2)} mm/s` : '--'}
                    </div>
                    <span className="text-[10px] font-mono text-[#D69A36]">ISO: 4.2 mm/s</span>
                  </div>
                  <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                    <span className="text-[10px] font-bold text-[#737D76] uppercase">Pressure</span>
                    <div className="text-xl font-bold font-mono text-[#202A25] mt-1">
                      {latestSensor?.pressure ? `${latestSensor.pressure.toFixed(1)} bar` : '--'}
                    </div>
                    <span className="text-[10px] font-mono text-[#737D76]">2.0 - 4.5 bar</span>
                  </div>
                  <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                    <span className="text-[10px] font-bold text-[#737D76] uppercase">Motor Current</span>
                    <div className="text-xl font-bold font-mono text-[#202A25] mt-1">
                      {latestSensor?.current ? `${latestSensor.current.toFixed(1)} A` : '--'}
                    </div>
                    <span className="text-[10px] font-mono text-[#737D76]">Nominal: 28.5 A</span>
                  </div>
                  <div className="p-3 border border-[#DDE2DD] rounded bg-[#FAFBFA]">
                    <span className="text-[10px] font-bold text-[#737D76] uppercase">ML Isolation Forest</span>
                    <div className="text-sm font-bold font-mono mt-1">
                      {latestSensor?.is_anomaly ? (
                        <span className="text-[#B84C42] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> ANOMALY DETECTED
                        </span>
                      ) : (
                        <span className="text-[#2E7D5A] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> NOMINAL OPERATION
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#737D76]">Contamination 5%</span>
                  </div>
                </div>
              </div>

              {/* TELEMETRY CHARTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TechSensorChart
                  data={sensorHistory.map(h => h.temperature)}
                  unit="°C"
                  limitVal={80.0}
                  color="#315C49"
                  title={`${selectedMachineId} - Temperature Trendline (°C)`}
                />
                <TechSensorChart
                  data={sensorHistory.map(h => h.vibration)}
                  unit="mm/s"
                  limitVal={4.2}
                  color="#D69A36"
                  title={`${selectedMachineId} - Vibration Velocity Trend (mm/s RMS)`}
                />
                <TechSensorChart
                  data={sensorHistory.map(h => h.pressure)}
                  unit="bar"
                  limitVal={null}
                  color="#2E7D5A"
                  title={`${selectedMachineId} - Operating Pressure Trend (bar)`}
                />
                <TechSensorChart
                  data={sensorHistory.map(h => h.current)}
                  unit="A"
                  limitVal={35.0}
                  color="#17251F"
                  title={`${selectedMachineId} - Motor Load Current (Amperes)`}
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: MAINTENANCE LOGS */}
          {/* ============================================================ */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-[#DDE2DD] mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Maintenance Registry & Interventions</h3>
                  <button
                    onClick={() => setShowMaintModal(true)}
                    className="bg-[#315C49] hover:bg-[#264A3A] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Log Maintenance Activity</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#737D76]" />
                    <input
                      type="text"
                      value={maintSearch}
                      onChange={(e) => setMaintSearch(e.target.value)}
                      placeholder="Search Error Code (E17, E04) or Issue..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#DDE2DD] rounded"
                    />
                  </div>
                  <select
                    value={maintMachineFilter}
                    onChange={(e) => setMaintMachineFilter(e.target.value)}
                    className="text-xs border border-[#DDE2DD] rounded px-3 py-1.5"
                  >
                    <option value="">All Machines</option>
                    <option value="M201">M201 (CNC Milling)</option>
                    <option value="M202">M202 (Hydraulic Press)</option>
                    <option value="M203">M203 (Compressor)</option>
                    <option value="M204">M204 (Conveyor Motor)</option>
                    <option value="M205">M205 (Injection Moulding)</option>
                  </select>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9F8] text-[#737D76] border-b border-[#DDE2DD] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Machine ID</th>
                      <th className="p-3">Error Code</th>
                      <th className="p-3">Reported Failure Issue</th>
                      <th className="p-3">Root Cause</th>
                      <th className="p-3">Corrective Action</th>
                      <th className="p-3">Downtime</th>
                      <th className="p-3">Technician</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE2DD]">
                    {filteredMaint.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-3 font-mono text-[11px] text-[#737D76]">{new Date(r.maintenance_date).toLocaleDateString()}</td>
                        <td className="p-3 font-mono font-bold text-[#315C49]">{r.machine_id}</td>
                        <td className="p-3 font-mono font-bold text-[#B84C42]">{r.error_code}</td>
                        <td className="p-3 font-semibold">{r.reported_issue}</td>
                        <td className="p-3 text-[#737D76]">{r.root_cause}</td>
                        <td className="p-3 text-[#737D76]">{r.corrective_action}</td>
                        <td className="p-3 font-mono">{r.downtime_hours} hrs</td>
                        <td className="p-3 text-[#202A25]">{r.technician_name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]">
                            {r.resolution_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredMaint.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-xs text-[#737D76]">
                          No maintenance records match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 7: ALERT CENTER */}
          {/* ============================================================ */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-[#DDE2DD] mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">Centralized Industrial Alert Queue</h3>
                  <div className="flex gap-2">
                    <select
                      value={alertStatusFilter}
                      onChange={(e) => setAlertStatusFilter(e.target.value)}
                      className="text-xs border border-[#DDE2DD] rounded px-3 py-1.5"
                    >
                      <option value="">All Statuses</option>
                      <option value="NEW">NEW</option>
                      <option value="ACKNOWLEDGED">Acknowledged</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                    <select
                      value={alertSevFilter}
                      onChange={(e) => setAlertSevFilter(e.target.value)}
                      className="text-xs border border-[#DDE2DD] rounded px-3 py-1.5"
                    >
                      <option value="">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="WARNING">Warning</option>
                      <option value="INFO">Info</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9F8] text-[#737D76] border-b border-[#DDE2DD] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Alert Code</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Machine</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Condition Description</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE2DD]">
                    {filteredAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F9FAF9]">
                        <td className="p-3 font-mono font-bold text-[#B84C42]">{a.alert_code}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            a.severity === 'CRITICAL' ? 'bg-[#FBEFED] text-[#B84C42] border border-[#F5C6C1]' :
                            a.severity === 'WARNING' ? 'bg-[#FCF6EC] text-[#D69A36] border border-[#F2DDB8]' :
                            'bg-[#EBF3ED] text-[#315C49] border border-[#8DAA91]'
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[#315C49]">{a.machine_id}</td>
                        <td className="p-3 text-[#737D76]">{a.category}</td>
                        <td className="p-3 font-semibold">{a.description}</td>
                        <td className="p-3 font-mono text-[11px] text-[#737D76]">{new Date(a.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]">
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 flex items-center gap-2">
                          {a.status === 'NEW' && (
                            <button
                              onClick={() => handleUpdateAlert(a.id, 'ACKNOWLEDGED')}
                              className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[11px] px-2 py-1 rounded"
                            >
                              Ack
                            </button>
                          )}
                          {a.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateAlert(a.id, 'RESOLVED')}
                              className="bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD] hover:bg-[#DDF0E6] text-[11px] px-2 py-1 rounded"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => navigateToDiagnostics(a.machine_id, `Investigate active alert ${a.alert_code} on ${a.machine_id}: ${a.description}`)}
                            className="bg-[#315C49] text-white text-[11px] px-2 py-1 rounded font-semibold"
                          >
                            Diagnose
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAlerts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-xs text-[#737D76]">
                          No alerts match current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 8: SETTINGS & HEALTH */}
          {/* ============================================================ */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#DDE2DD]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">LLM Inference Provider Configuration</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDF7F2] text-[#2E7D5A] border border-[#B8E2CD]">
                    ACTIVE
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Diagnostic Model Provider</label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value)}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                  >
                    <option value="LOCAL_GROUNDED">Local OEM Rule Synthesizer (Zero Latency, High Determinism)</option>
                    <option value="GEMINI">Google Gemini API (gemini-1.5-flash)</option>
                    <option value="OPENAI">OpenAI API (gpt-3.5-turbo / gpt-4)</option>
                    <option value="HUGGINGFACE">Hugging Face Serverless Inference</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">API Key (Environment-secured, never logged)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key to enable cloud inference..."
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Target Model Identifier</label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs font-mono"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-2 rounded text-xs font-bold"
                >
                  Save & Update Provider
                </button>

                {settingsNotice && (
                  <p className="text-xs font-mono text-[#2E7D5A] mt-2">{settingsNotice}</p>
                )}
              </div>

              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm p-5 space-y-4">
                <div className="pb-3 border-b border-[#DDE2DD]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#202A25]">FAISS Vector Database & System Diagnostics</h3>
                </div>

                <div className="border border-[#DDE2DD] bg-[#FAFBFA] p-4 rounded text-xs space-y-2">
                  <p><strong>Vector Search Engine:</strong> <span className="font-mono text-[#315C49]">NumPy Flat Cosine Vector Store (FAISS L2 Norm)</span></p>
                  <p><strong>Vector Coordinate Dimension:</strong> <span className="font-mono">384 (all-MiniLM-L6-v2)</span></p>
                  <p><strong>Total Indexed Knowledge Chunks:</strong> <span className="font-mono text-[#2E7D5A] font-bold">{documents.reduce((acc, d) => acc + d.chunk_count, 0)} Chunks</span></p>
                  <p><strong>Database Storage:</strong> <span className="font-mono">SQLite 3 (WAL mode enabled, PostgreSQL-ready)</span></p>
                  <p><strong>ML Model:</strong> <span className="font-mono">Scikit-Learn IsolationForest (100 estimators, 5% contamination)</span></p>
                </div>

                <button
                  onClick={handleTestHealth}
                  className="bg-[#FAFBFA] border border-[#AAB2AA] hover:bg-[#E8ECE8] text-[#202A25] px-4 py-2 rounded text-xs font-bold flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Full System Health Check</span>
                </button>

                {healthInfo && (
                  <div className="bg-[#EDF7F2] border border-[#B8E2CD] p-3 rounded font-mono text-[11px] text-[#2E7D5A]">
                    ✓ Backend status: HEALTHY &bull; Database: CONNECTED &bull; Vector Engine: READY
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: ANOMALY INJECTOR */}
      {/* ============================================================ */}
      {showAnomalyModal && (
        <div className="fixed inset-0 bg-[#0F1713]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#DDE2DD] rounded shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-[#DDE2DD] flex justify-between items-center bg-[#FAFBFA]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#202A25]">IoT Sensor Simulator - Anomaly Injector</h3>
              <button onClick={() => setShowAnomalyModal(false)} className="text-[#737D76] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#737D76]">
                Inject simulated physical degradation signatures into equipment telemetry to evaluate Isolation Forest ML detection and automated RAG diagnostics in real time.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Target Machine</label>
                <select
                  value={simMachine}
                  onChange={(e) => setSimMachine(e.target.value)}
                  className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                >
                  <option value="M204">M204 - Conveyor Motor (Assembly Line 2)</option>
                  <option value="M201">M201 - CNC Milling Machine (Bay A)</option>
                  <option value="M202">M202 - Hydraulic Press (Forming)</option>
                  <option value="M203">M203 - Industrial Compressor</option>
                  <option value="M205">M205 - Injection Moulding Machine</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Anomaly Fault Pattern</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                >
                  <option value="THERMAL_OVERHEAT">Thermal Overheat (Simulates bearing galling or cooling failure)</option>
                  <option value="BEARING_VIBRATION">Bearing Vibration Harmonic Spike (ISO limit breach)</option>
                  <option value="PRESSURE_DROP">System Hydraulic/Pneumatic Pressure Drop (Seal failure)</option>
                  <option value="CURRENT_SPIKE">Phase Current Overload / Mechanical Binding</option>
                  <option value="RESET">Reset to Baseline Nominal Operation</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Severity Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="2.5"
                  value={simSev}
                  onChange={(e) => setSimSev(parseFloat(e.target.value) || 1.4)}
                  className="w-full border border-[#DDE2DD] rounded p-2 text-xs font-mono"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#DDE2DD] bg-[#FAFBFA] flex justify-end gap-2">
              <button
                onClick={() => setShowAnomalyModal(false)}
                className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[#202A25] px-3.5 py-1.5 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerAnomaly}
                className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-1.5 rounded text-xs font-bold"
              >
                Trigger Anomaly Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: LOG MAINTENANCE RECORD */}
      {/* ============================================================ */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-[#0F1713]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#DDE2DD] rounded shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-[#DDE2DD] flex justify-between items-center bg-[#FAFBFA]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#202A25]">Record Maintenance Activity</h3>
              <button onClick={() => setShowMaintModal(false)} className="text-[#737D76] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMaintenance}>
              <div className="p-5 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Target Machine ID</label>
                  <select
                    value={newMaint.machine_id}
                    onChange={(e) => setNewMaint({ ...newMaint, machine_id: e.target.value })}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                  >
                    <option value="M204">M204 - Conveyor Motor</option>
                    <option value="M201">M201 - CNC Milling Machine</option>
                    <option value="M202">M202 - Hydraulic Press</option>
                    <option value="M203">M203 - Industrial Compressor</option>
                    <option value="M205">M205 - Injection Moulding Machine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Error Code</label>
                  <input
                    type="text"
                    value={newMaint.error_code}
                    onChange={(e) => setNewMaint({ ...newMaint, error_code: e.target.value })}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs font-mono"
                    placeholder="e.g. E17, E04, E88"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Reported Failure Issue</label>
                  <input
                    type="text"
                    value={newMaint.reported_issue}
                    onChange={(e) => setNewMaint({ ...newMaint, reported_issue: e.target.value })}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                    placeholder="Brief summary of reported anomaly"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Verified Root Cause</label>
                  <input
                    type="text"
                    value={newMaint.root_cause}
                    onChange={(e) => setNewMaint({ ...newMaint, root_cause: e.target.value })}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                    placeholder="Identified root cause"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Corrective Action Taken</label>
                  <textarea
                    rows={2}
                    value={newMaint.corrective_action}
                    onChange={(e) => setNewMaint({ ...newMaint, corrective_action: e.target.value })}
                    className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                    placeholder="Detailed SOP corrective measures"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Downtime (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newMaint.downtime_hours}
                      onChange={(e) => setNewMaint({ ...newMaint, downtime_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-[#DDE2DD] rounded p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#737D76] uppercase mb-1">Technician</label>
                    <input
                      type="text"
                      value={newMaint.technician_name}
                      onChange={(e) => setNewMaint({ ...newMaint, technician_name: e.target.value })}
                      className="w-full border border-[#DDE2DD] rounded p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-[#DDE2DD] bg-[#FAFBFA] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  className="bg-[#FAFBFA] border border-[#DDE2DD] hover:bg-[#E8ECE8] text-[#202A25] px-3.5 py-1.5 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-1.5 rounded text-xs font-bold"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default App;
