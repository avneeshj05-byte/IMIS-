import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Bot, 
  FileText, 
  Activity, 
  Wrench, 
  AlertTriangle, 
  Settings as SettingsIcon
} from 'lucide-react';
import { api } from './services/api';
import { Machine, MachineSummary, Alert } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'diagnostics' | 'knowledge' | 'sensors' | 'maintenance' | 'alerts' | 'settings'>('overview');
  const [summary, setSummary] = useState<MachineSummary | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [diagQuery, setDiagQuery] = useState('Machine M204 is showing error E17. What should I check?');
  const [diagMachine, setDiagMachine] = useState('M204');
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sum, machs, alts] = await Promise.all([
        api.getMachineSummary(),
        api.getMachines(),
        api.getAlerts('NEW')
      ]);
      setSummary(sum);
      setMachines(machs);
      setAlerts(alts);
    } catch (e) {
      console.error(e);
    }
  };

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
            { id: 'alerts', label: 'G. ALERT CENTER', icon: AlertTriangle, badge: alerts.length },
            { id: 'settings', label: 'H. SETTINGS & HEALTH', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
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
              {activeTab === 'overview' && 'Industrial Overview'}
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
              onClick={() => setActiveTab('diagnostics')}
              className="bg-[#315C49] hover:bg-[#264A3A] text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span>Diagnostic Assistant</span>
            </button>
          </div>
        </header>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  <div className="text-2xl font-bold font-mono text-[#B84C42] mt-1">{summary?.active_alerts ?? 2}</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Requiring Attention</div>
                </div>
                <div className="bg-white border border-[#DDE2DD] p-4 rounded shadow-sm">
                  <div className="text-[11px] font-bold text-[#737D76] uppercase tracking-wider">Fleet Health Index</div>
                  <div className="text-2xl font-bold font-mono text-[#315C49] mt-1">{summary?.avg_fleet_health ?? 88.6}%</div>
                  <div className="text-[11px] text-[#737D76] mt-1">Calculated via ML</div>
                </div>
              </div>

              {/* TABLE */}
              <div className="bg-white border border-[#DDE2DD] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#DDE2DD] flex justify-between items-center bg-[#FAFBFA]">
                  <h3 className="text-xs font-bold text-[#202A25] uppercase tracking-wider">Asset Operational Status Matrix</h3>
                  <span className="text-[11px] font-mono text-[#737D76]">REAL-TIME TELEMETRY</span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

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
                        className="bg-[#315C49] hover:bg-[#264A3A] text-white px-4 py-2 rounded text-xs font-bold"
                      >
                        {diagLoading ? 'Searching...' : 'Run RAG'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {diagResult && (
                <div className="bg-white border border-[#DDE2DD] p-6 rounded shadow-sm space-y-5">
                  <div className="flex justify-between items-center border-b border-[#DDE2DD] pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide">Structured Diagnostic Troubleshooting Report</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#737D76]">Evidence Confidence:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        diagResult.confidence_level === 'HIGH' ? 'bg-[#EDF7F2] text-[#2E7D5A]' : 'bg-[#FCF6EC] text-[#D69A36]'
                      }`}>
                        {diagResult.confidence_level}
                      </span>
                    </div>
                  </div>

                  <div className="border-l-4 border-[#315C49] bg-[#FAFBFA] p-4 rounded">
                    <div className="text-[11px] font-bold uppercase text-[#315C49] mb-1">Diagnostic Summary</div>
                    <p className="text-xs leading-relaxed">{diagResult.diagnostic_summary}</p>
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
                    <ol className="text-xs list-decimal list-inside space-y-1">
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
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
