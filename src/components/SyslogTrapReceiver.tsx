import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal, ShieldAlert, AlertTriangle, Info, Search, Trash2,
  Download, Play, Pause, RefreshCw, Radio, Zap, Filter, CheckCircle2,
  Server, ArrowUpDown, ChevronRight, ChevronDown
} from 'lucide-react';

export interface SyslogEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  hostname: string;
  facility: string;
  facilityCode: number;
  severity: 'Emergency' | 'Alert' | 'Critical' | 'Error' | 'Warning' | 'Notice' | 'Informational' | 'Debug';
  severityCode: number;
  tag: string;
  message: string;
  raw: string;
}

export interface SnmpTrapEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  trapType: 'linkDown' | 'linkUp' | 'coldStart' | 'warmStart' | 'authenticationFailure' | 'enterpriseSpecific';
  enterpriseOid?: string;
  uptime?: string;
  varbinds: Array<{ oid: string; type: string; value: string }>;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
}

export interface SyslogTrapReceiverProps {
  onAddLog?: (msg: string, type?: 'warning' | 'info' | 'success' | 'error') => void;
}

export default function SyslogTrapReceiver({ onAddLog }: SyslogTrapReceiverProps = {}) {
  const [activeTab, setActiveTab] = useState<'syslog' | 'traps'>('syslog');
  const [syslogEvents, setSyslogEvents] = useState<SyslogEvent[]>([]);
  const [trapEvents, setTrapEvents] = useState<SnmpTrapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchEvents = async () => {
    try {
      const [resSyslog, resTraps] = await Promise.all([
        fetch('/api/syslog'),
        fetch('/api/traps')
      ]);
      if (resSyslog.ok) {
        const data = await resSyslog.json();
        setSyslogEvents(Array.isArray(data) ? data : []);
      }
      if (resTraps.ok) {
        const data = await resTraps.json();
        setTrapEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching syslog/traps:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    if (!isLiveAutoRefresh) return;
    const interval = setInterval(fetchEvents, 3500);
    return () => clearInterval(interval);
  }, [isLiveAutoRefresh]);

  const handleClearSyslog = async () => {
    if (!confirm('¿Deseas vaciar todos los eventos Syslog registrados?')) return;
    await fetch('/api/syslog/clear', { method: 'POST' });
    setSyslogEvents([]);
  };

  const handleClearTraps = async () => {
    if (!confirm('¿Deseas vaciar todas las trampas SNMP recibidas?')) return;
    await fetch('/api/traps/clear', { method: 'POST' });
    setTrapEvents([]);
  };

  const handleSimulateSyslog = async (type: 'linkDown' | 'firewall' | 'smart') => {
    setIsSimulating(true);
    let payload = {
      message: "Interface GigabitEthernet1/0/24 changed state to down",
      severity: "Critical",
      facility: "local7",
      hostname: "SW-CORE-01",
      sourceIp: "192.168.1.2"
    };

    if (type === 'firewall') {
      payload = {
        message: "Intrusion prevention signature triggered: PortScan detected from external probe 203.0.113.44",
        severity: "Alert",
        facility: "security",
        hostname: "FW-PERIMETRO-FORTI",
        sourceIp: "192.168.1.254"
      };
    } else if (type === 'smart') {
      payload = {
        message: "Drive /dev/nvme0n1 SMART failure impending: Uncorrectable Error Count threshold exceeded",
        severity: "Emergency",
        facility: "daemon",
        hostname: "SRV-CLUSTER-01",
        sourceIp: "192.168.1.10"
      };
    }

    try {
      await fetch('/api/syslog/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateTrap = async () => {
    setIsSimulating(true);
    try {
      await fetch('/api/traps/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIp: "192.168.1.2",
          trapType: "linkDown",
          severity: "Critical",
          description: "Trap linkDown: El switch core reportó corte de enlace en GigabitEthernet1/0/12 hacia Rack Servidores"
        })
      });
      await fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const exportData = () => {
    const data = activeTab === 'syslog' ? syslogEvents : trapEvents;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redmonitor-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Syslog
  const filteredSyslog = useMemo(() => {
    return syslogEvents.filter(e => {
      const matchesSearch = e.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.sourceIp.includes(searchTerm) ||
                            e.tag.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSev = severityFilter === 'all' || e.severity === severityFilter;
      return matchesSearch && matchesSev;
    });
  }, [syslogEvents, searchTerm, severityFilter]);

  // Filtered Traps
  const filteredTraps = useMemo(() => {
    return trapEvents.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.sourceIp.includes(searchTerm) ||
                            t.trapType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSev = severityFilter === 'all' || t.severity === severityFilter;
      return matchesSearch && matchesSev;
    });
  }, [trapEvents, searchTerm, severityFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Emergency':
      case 'Alert':
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Error':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Notice':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <div id="syslog-traps-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Receptor de Syslog & SNMP Traps</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Socket UDP Activo
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Escucha pasiva en tiempo real para eventos de red RFC 5424/3164 (Puerto UDP 10514) y trampas SNMP (Puerto UDP 10162).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="toggle-live-refresh"
            onClick={() => setIsLiveAutoRefresh(!isLiveAutoRefresh)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 border transition ${
              isLiveAutoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {isLiveAutoRefresh ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isLiveAutoRefresh ? 'En Vivo (3.5s)' : 'En Pausa'}
          </button>

          <button
            id="manual-refresh-events"
            onClick={fetchEvents}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            Actualizar
          </button>

          <button
            id="export-events-json"
            onClick={exportData}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar JSON
          </button>

          <button
            id="clear-events-buffer"
            onClick={activeTab === 'syslog' ? handleClearSyslog : handleClearTraps}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar Búfer
          </button>
        </div>
      </div>

      {/* Tabs & Simulators */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            id="tab-syslog"
            onClick={() => setActiveTab('syslog')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'syslog'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Syslog RFC 5424/3164
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-cyan-400 font-mono">
              {syslogEvents.length}
            </span>
          </button>

          <button
            id="tab-traps"
            onClick={() => setActiveTab('traps')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'traps'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            SNMP Traps & Informs
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400 font-mono">
              {trapEvents.length}
            </span>
          </button>
        </div>

        {/* Test Simulator Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Inyectar Prueba:</span>
          {activeTab === 'syslog' ? (
            <>
              <button
                id="sim-syslog-linkdown"
                onClick={() => handleSimulateSyslog('linkDown')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
              >
                Caída Enlace
              </button>
              <button
                id="sim-syslog-firewall"
                onClick={() => handleSimulateSyslog('firewall')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition"
              >
                Intrusión FW
              </button>
              <button
                id="sim-syslog-smart"
                onClick={() => handleSimulateSyslog('smart')}
                disabled={isSimulating}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition"
              >
                Fallo SMART
              </button>
            </>
          ) : (
            <button
              id="sim-trap-linkdown"
              onClick={handleSimulateTrap}
              disabled={isSimulating}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
            >
              Trap linkDown
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="events-search-input"
            type="text"
            placeholder="Buscar por mensaje, host, IP de origen o identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="events-severity-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas las severidades</option>
            <option value="Emergency">Emergency</option>
            <option value="Alert">Alert</option>
            <option value="Critical">Critical</option>
            <option value="Error">Error</option>
            <option value="Warning">Warning</option>
            <option value="Notice">Notice</option>
            <option value="Informational">Informational</option>
            <option value="Debug">Debug</option>
          </select>
        </div>
      </div>

      {/* Content Feed */}
      {activeTab === 'syslog' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-4">
              <span>TIMESTAMP</span>
              <span>ORIGEN</span>
              <span>SEVERIDAD</span>
            </div>
            <span>MENSAJE & PROCESO</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[550px] overflow-y-auto font-mono text-xs">
            {filteredSyslog.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay eventos Syslog que coincidan con los filtros actuales.
              </div>
            ) : (
              filteredSyslog.map((event) => (
                <div
                  key={event.id}
                  id={`syslog-row-${event.id}`}
                  onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                  className="p-3 hover:bg-slate-800/40 transition cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-cyan-400 font-semibold">{event.hostname}</span>
                      <span className="text-slate-500 text-[11px]">({event.sourceIp})</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${getSeverityBadge(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-slate-400 text-[11px]">[{event.facility}]</span>
                    </div>
                    <span className="text-amber-400/90 font-semibold">{event.tag}</span>
                  </div>

                  <p className="text-slate-200 font-sans text-xs pl-1 break-words">
                    {event.message}
                  </p>

                  {/* Expanded Raw Details */}
                  {selectedEventId === event.id && (
                    <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-[11px] space-y-1">
                      <div><strong className="text-slate-300">Mensaje Crudo:</strong> {event.raw}</div>
                      <div><strong className="text-slate-300">PRI Decimal:</strong> {event.facilityCode * 8 + event.severityCode} (Facility: {event.facilityCode}, Severity: {event.severityCode})</div>
                      <div><strong className="text-slate-300">Timestamp ISO:</strong> {event.timestamp}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Traps Tab */
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-4">
              <span>TIMESTAMP</span>
              <span>AGENTE SNMP</span>
              <span>TIPO DE TRAMPA</span>
            </div>
            <span>DETALLES Y VARBINDS</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[550px] overflow-y-auto text-xs">
            {filteredTraps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono">
                No hay trampas SNMP registradas actualmente.
              </div>
            ) : (
              filteredTraps.map((trap) => (
                <div
                  key={trap.id}
                  id={`trap-row-${trap.id}`}
                  onClick={() => setSelectedEventId(selectedEventId === trap.id ? null : trap.id)}
                  className="p-4 hover:bg-slate-800/40 transition cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {new Date(trap.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-amber-400 font-semibold">{trap.sourceIp}</span>
                      <span className="px-2 py-0.5 rounded border text-[10px] font-semibold bg-amber-500/20 text-amber-300 border-amber-500/30">
                        {trap.trapType}
                      </span>
                      {trap.uptime && (
                        <span className="text-slate-400 text-[11px]">Uptime: {trap.uptime}</span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">{trap.enterpriseOid || 'RFC-Standard'}</span>
                  </div>

                  <p className="text-slate-200 text-xs pl-1">
                    {trap.description}
                  </p>

                  {/* Varbinds expandable */}
                  {trap.varbinds && trap.varbinds.length > 0 && (
                    <div className="mt-1 p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1 font-mono text-[11px]">
                      <div className="text-slate-400 font-semibold mb-1">Variables Vinculadas (Varbinds):</div>
                      {trap.varbinds.map((vb, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-300">
                          <span className="text-cyan-400">{vb.oid}</span>
                          <span className="text-slate-500">[{vb.type}]</span>
                          <span className="text-emerald-300 font-medium">{vb.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
