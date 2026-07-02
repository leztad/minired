import React, { useState, useMemo } from 'react';
import { 
  Terminal, ShieldAlert, AlertTriangle, CheckCircle, Info, Search, Trash2, 
  Download, Play, Pause, AlertCircle, FileSpreadsheet, Server, RefreshCw, Cpu, Database
} from 'lucide-react';

export interface LogEvent {
  id: string;
  time: string;
  msg: string;
  type: 'success' | 'warning' | 'error' | 'info';
  category?: string;
  code?: string;
}

interface EventLoggerProps {
  logs: LogEvent[];
  onAddLog: (msg: string, type: 'success' | 'warning' | 'error' | 'info', category?: string, code?: string) => void;
  onClearLogs: () => void;
}

export default function EventLogger({ logs, onAddLog, onClearLogs }: EventLoggerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'success' | 'warning' | 'error' | 'info'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);

  // Categories extracted from logs or hardcoded with fallbacks
  const categories = useMemo(() => {
    const list = new Set<string>();
    logs.forEach(log => {
      if (log.category) list.add(log.category);
    });
    return ['all', ...Array.from(list)];
  }, [logs]);

  // Enhanced search and filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.msg.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (log.code && log.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === 'all' || log.type === selectedType;
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [logs, searchTerm, selectedType, selectedCategory]);

  // Stats calculation
  const stats = useMemo(() => {
    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let infoCount = 0;
    let securityCount = 0;

    logs.forEach(log => {
      if (log.type === 'success') successCount++;
      if (log.type === 'warning') warningCount++;
      if (log.type === 'error') errorCount++;
      if (log.type === 'info') infoCount++;
      if (log.category?.toLowerCase().includes('seguridad') || log.msg.toLowerCase().includes('seguridad') || log.msg.toLowerCase().includes('intruso') || log.msg.toLowerCase().includes('spoofing')) {
        securityCount++;
      }
    });

    return {
      total: logs.length,
      success: successCount,
      warning: warningCount,
      error: errorCount,
      info: infoCount,
      security: securityCount
    };
  }, [logs]);

  // Enterprise events ready for simulation
  const testScenarios = [
    {
      msg: "⚠️ CONFLICTO IP DETECTADO: Host en puerto 4 intenta reclamar la IP del Gateway principal (.1). Posible ataque de envenenamiento ARP.",
      type: "error" as const,
      category: "Seguridad",
      code: "SEC-301"
    },
    {
      msg: "🔒 Port Security Activo: Puerto del switch G0/5 bloqueado temporalmente (err-disable). MAC no registrada intentó acceso.",
      type: "warning" as const,
      category: "Seguridad",
      code: "SEC-305"
    },
    {
      msg: "🔄 RSTP Convergencia completa: Nuevo puente raíz (Root Bridge) asignado con prioridad 4096. Ruta redundante bloqueada con éxito.",
      type: "success" as const,
      category: "Capa Enlace",
      code: "LNK-201"
    },
    {
      msg: "🔌 Límite PoE rebasado: Interfaz Fa0/8 reporta consumo de 16.4W (Presupuesto máximo excedido). Puerto suspendido térmicamente.",
      type: "warning" as const,
      category: "Capa Física",
      code: "PHY-104"
    },
    {
      msg: "⚡ Ciclo de Potencia PoE: Reinicio automático del puerto Fa0/2 (Cámara Domo IP) tras fallo de latido ICMP secuencial.",
      type: "info" as const,
      category: "Sonda Real",
      code: "SND-405"
    },
    {
      msg: "🚨 Inundación de Broadcast detectada: Switch reporta 2,400 tramas/seg en VLAN 20. Limitador de tormentas (Storm Control) activado.",
      type: "error" as const,
      category: "Capa Enlace",
      code: "LNK-203"
    }
  ];

  const handleInjectTestLog = () => {
    const randomScenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];
    onAddLog(randomScenario.msg, randomScenario.type, randomScenario.category, randomScenario.code);
  };

  const downloadJsonLogs = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `RedMonitor_Syslog_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLogTypeBadge = (type: LogEvent['type']) => {
    switch (type) {
      case 'success':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm">SUCCESS</span>;
      case 'warning':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm">WARNING</span>;
      case 'error':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm">ERROR</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm">INFO</span>;
    }
  };

  return (
    <div className="bg-[#0B1120] text-slate-100 rounded-xs border border-slate-800 shadow-2xl overflow-hidden" id="syslog-logger-container">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30 text-emerald-400">
            <Terminal className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Consola Syslog y Registro de Eventos L2
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Consola unificada de registros de switches, auditorías físicas, seguridad ARP y telemetría en tiempo real.
            </p>
          </div>
        </div>

        {/* FEED CONTROL BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-350'
            }`}
          >
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <Pause className="h-3.5 w-3.5" />
                <span>Streaming Activo</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Pausado</span>
              </>
            )}
          </button>

          <button
            onClick={downloadJsonLogs}
            className="px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 cursor-pointer transition-all"
            title="Exportar logs a formato JSON estandarizado"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 bg-red-950/10 border border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer transition-all"
            title="Vaciar consola de eventos actual"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW BENTO BOXES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 border-b border-slate-800/50 bg-slate-950/40 p-4 gap-3">
        <div className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-xs flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Total Logs</span>
          <span className="text-xl font-bold font-mono text-white mt-1">{stats.total}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-xs flex flex-col justify-between">
          <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider font-bold">Success</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.success}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-xs flex flex-col justify-between">
          <span className="text-[10px] font-mono text-amber-500 uppercase tracking-wider font-bold">Warnings</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-1">{stats.warning}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-xs flex flex-col justify-between">
          <span className="text-[10px] font-mono text-red-500 uppercase tracking-wider font-bold">Errores L2</span>
          <span className="text-xl font-bold font-mono text-red-400 mt-1">{stats.error}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/50 p-3 rounded-xs flex flex-col justify-between">
          <span className="text-[10px] font-mono text-blue-500 uppercase tracking-wider font-bold">Información</span>
          <span className="text-xl font-bold font-mono text-blue-450 mt-1">{stats.info}</span>
        </div>
        <div className="bg-slate-900/40 border border-red-950/40 p-3 rounded-xs flex flex-col justify-between bg-red-950/5">
          <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-bold flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 animate-pulse" /> Seguridad
          </span>
          <span className="text-xl font-bold font-mono text-red-400 mt-1">{stats.security}</span>
        </div>
      </div>

      {/* FILTER & INTERACTIVE TOOLS BAR */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/60 flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* SEARCH BAR */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-sm py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-sans"
            placeholder="Filtrar por código (SEC-301, SND-401), mensaje o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* CONTROLS GRID */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* TYPE FILTER SELECT */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Todas las severidades</option>
            <option value="info">INFO (Información)</option>
            <option value="success">SUCCESS (Éxito)</option>
            <option value="warning">WARNING (Advertencia)</option>
            <option value="error">ERROR (Crítico / Falla)</option>
          </select>

          {/* CATEGORY FILTER SELECT */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-sm px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* INJECT ALARM BUTTON */}
          <button
            onClick={handleInjectTestLog}
            className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:shadow-md cursor-pointer transition-all flex items-center gap-1"
            title="Simular e inyectar un evento de syslog de nivel empresarial"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Inyectar Evento Syslog</span>
          </button>
        </div>
      </div>

      {/* CORE TERMINAL VIEW AREA */}
      <div className="p-4 bg-slate-950">
        <div className="bg-[#05070f] border border-slate-800/50 rounded-xs font-mono text-xs overflow-hidden flex flex-col">
          {/* TERMINAL BAR HEADER */}
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="ml-2 text-slate-400 font-bold uppercase tracking-wider text-[9px]">Syslog Terminal Console • RedMonitor L2</span>
            </div>
            <div>
              <span>Feed: {isLive ? 'ONLINE' : 'PAUSED'}</span>
            </div>
          </div>

          {/* TERMINAL CONTENT CONTAINER */}
          <div className="p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-2.5 scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-24 text-slate-600 italic">
                <AlertCircle className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                <p>Ningún registro coincide con los filtros aplicados en esta sesión.</p>
                <p className="text-[10px] text-slate-700 mt-1 font-mono">Prueba a limpiar el buscador o pulsa "Inyectar Evento Syslog".</p>
              </div>
            ) : (
              (isLive ? filteredLogs : filteredLogs).map((log, index) => {
                const isError = log.type === 'error';
                const isWarning = log.type === 'warning';
                const isSuccess = log.type === 'success';

                let textCol = 'text-slate-350';
                if (isError) textCol = 'text-red-400';
                else if (isWarning) textCol = 'text-amber-300';
                else if (isSuccess) textCol = 'text-emerald-400';

                return (
                  <div 
                    key={log.id || index} 
                    className="p-2 bg-slate-900/30 border border-slate-800/50/45 hover:bg-slate-900/60 transition-colors duration-100 flex items-start md:items-center gap-3.5"
                  >
                    {/* TIMESTAMP */}
                    <span className="text-[10px] text-slate-500 select-none font-semibold shrink-0 pt-0.5 md:pt-0">
                      [{log.time}]
                    </span>

                    {/* EVENT CODE BADGE */}
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded-xs font-bold font-mono shrink-0 select-all leading-none">
                      {log.code || 'SYS-001'}
                    </span>

                    {/* TYPE BADGE */}
                    <div className="shrink-0 hidden sm:block">
                      {getLogTypeBadge(log.type)}
                    </div>

                    {/* CATEGORY */}
                    <span className="text-[10px] font-mono tracking-wide text-cyan-400 border border-cyan-950/40 bg-cyan-950/10 px-1.5 py-0.2 rounded-xs shrink-0 hidden md:block">
                      {log.category || 'General'}
                    </span>

                    {/* CORE LOG MESSAGE */}
                    <p className={`text-xs leading-relaxed font-mono flex-1 text-left ${textCol}`}>
                      {log.msg}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* COMPLIANCE GUIDELINE CORNER */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-500 shrink-0" />
          <span className="text-[10px] text-slate-400 font-mono">
            <strong>Modo persistente:</strong> Los logs de eventos se registran localmente en memoria volátil de sesión para protección de privacidad de tramas LAN.
          </span>
        </div>
        <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Syslog L2 montado en loop virtual local.</span>
        </div>
      </div>
    </div>
  );
}
