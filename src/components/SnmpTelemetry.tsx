import React, { useState, useEffect } from 'react';
import { 
  Radio, Cpu, HardDrive, Thermometer, Activity, RefreshCw, 
  CheckCircle2, AlertTriangle, XCircle, Search, Database, 
  Layers, Clock, Shield, Sliders, Play, Pause, ExternalLink,
  ChevronDown, ChevronRight, Copy, Check
} from 'lucide-react';
import { Device } from '../types';

export interface SnmpInterfaceData {
  index: number;
  name: string;
  type: string;
  speedMbps: number;
  mac: string;
  status: 'up' | 'down' | 'testing';
  inOctets: number;
  outOctets: number;
  inErrors?: number;
  outErrors?: number;
}

export interface SnmpTelemetryResult {
  ip: string;
  community: string;
  version: '1' | '2c' | '3';
  isLiveSnmp: boolean;
  responseTimeMs: number;
  sysName: string;
  sysDescr: string;
  sysUptime: string;
  sysUptimeSeconds: number;
  sysLocation: string;
  sysContact: string;
  cpuPercent: number;
  cpuCores?: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  memoryFreeMb: number;
  memoryPercent: number;
  temperatureC?: number;
  fanStatus?: 'OK' | 'Warning' | 'Error' | 'N/A';
  interfaces: SnmpInterfaceData[];
  sourceNote: string;
}

interface SnmpTelemetryProps {
  devices: Device[];
  selectedDeviceIp?: string;
  onSelectDevice?: (device: Device) => void;
  onAddLog?: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const COMMON_OIDS = [
  { oid: '1.3.6.1.2.1.1.1.0', label: 'sysDescr (Descripción y SO del Hardware)', desc: 'Sistema operativo, versión de firmware y modelo' },
  { oid: '1.3.6.1.2.1.1.3.0', label: 'sysUpTime (Tiempo de Operación)', desc: 'Tiempo transcurrido desde el último reinicio en centésimas de seg.' },
  { oid: '1.3.6.1.2.1.1.5.0', label: 'sysName (Nombre / Hostname del Equipo)', desc: 'Identificador del host configurado en el sistema' },
  { oid: '1.3.6.1.2.1.1.6.0', label: 'sysLocation (Ubicación Física)', desc: 'Rack, sala o ubicación registrada en el agente' },
  { oid: '1.3.6.1.2.1.25.2.2.0', label: 'hrMemorySize (Memoria RAM Total en KB)', desc: 'Host Resources MIB para tamaño de memoria física' },
  { oid: '1.3.6.1.2.1.25.3.3.1.2.1', label: 'hrProcessorLoad (Carga de CPU Núcleo 1 %)', desc: 'Porcentaje de procesamiento promedio en el último minuto' },
  { oid: '1.3.6.1.4.1.9.2.1.56.0', label: 'cpmCPUTotal5minRev (CPU Cisco 5 min %)', desc: 'OID específico empresarial para conmutadores y routers Cisco' }
];

export default function SnmpTelemetry({ devices, selectedDeviceIp, onSelectDevice, onAddLog }: SnmpTelemetryProps) {
  const [targetIp, setTargetIp] = useState<string>(selectedDeviceIp || (devices[0]?.ip || '192.168.1.1'));
  const [community, setCommunity] = useState<string>('public');
  const [version, setVersion] = useState<'1' | '2c'>('2c');
  const [port, setPort] = useState<number>(161);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<SnmpTelemetryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'interfaces' | 'oid_explorer'>('resumen');
  const [selectedOid, setSelectedOid] = useState<string>(COMMON_OIDS[0].oid);
  const [customOidInput, setCustomOidInput] = useState<string>('1.3.6.1.2.1.1.1.0');
  const [oidQueryResults, setOidQueryResults] = useState<any[]>([]);
  const [isQueryingOid, setIsQueryingOid] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync with selected device if changed from outside
  useEffect(() => {
    if (selectedDeviceIp && selectedDeviceIp !== targetIp) {
      setTargetIp(selectedDeviceIp);
    }
  }, [selectedDeviceIp]);

  const fetchTelemetry = async (ipToQuery = targetIp) => {
    if (!ipToQuery) return;
    setIsLoading(true);
    
    // Find device hints
    const matchedDev = devices.find(d => d.ip === ipToQuery);
    const hostHint = matchedDev?.host || '';
    const vendorHint = matchedDev?.vendor || '';

    try {
      const res = await fetch('/api/snmp/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ipToQuery,
          community,
          version,
          port,
          hostHint,
          vendorHint
        })
      });

      if (!res.ok) {
        throw new Error(`Error en servidor: ${res.statusText}`);
      }

      const data: SnmpTelemetryResult = await res.json();
      setTelemetry(data);
      if (onAddLog) {
        onAddLog(`Telemetría SNMP consultada para ${data.ip} (${data.sysName}) - CPU: ${data.cpuPercent}%`, 'info');
      }
    } catch (err: any) {
      console.error("Error fetching SNMP telemetry:", err);
      if (onAddLog) {
        onAddLog(`Fallo al consultar SNMP en ${ipToQuery}: ${err.message}`, 'warning');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTelemetry(targetIp);
  }, [targetIp]);

  // Auto-polling interval
  useEffect(() => {
    let intervalId: any = null;
    if (isAutoPolling) {
      intervalId = setInterval(() => {
        fetchTelemetry(targetIp);
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPolling, targetIp, community, version, port]);

  // Query specific OID
  const handleQueryOid = async (oidToQuery = customOidInput) => {
    if (!targetIp || !oidToQuery) return;
    setIsQueryingOid(true);

    try {
      const res = await fetch('/api/snmp/query-oid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: targetIp,
          community,
          version,
          port,
          oids: [oidToQuery]
        })
      });

      const data = await res.json();
      if (data.results) {
        setOidQueryResults(data.results);
      }
    } catch (e: any) {
      console.error("Error querying OID:", e);
    } finally {
      setIsQueryingOid(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeDevice = devices.find(d => d.ip === targetIp);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER & TARGET CONTROLS */}
      <div className="bg-[#070c1b]/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl shadow-inner">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display tracking-wide uppercase">
                  Telemetría Profunda SNMP & Hardware
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  RFC 1213 / IF-MIB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspección de métricas de bajo nivel en conmutadores, enrutadores, servidores y sistemas de almacenamiento vía UDP:161.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAutoPolling(!isAutoPolling)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isAutoPolling 
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAutoPolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isAutoPolling ? 'Sondeo Activo (5s)' : 'Sondeo Periódico'}</span>
            </button>

            <button
              onClick={() => fetchTelemetry(targetIp)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Consultando...' : 'Consultar Ahora'}</span>
            </button>
          </div>
        </div>

        {/* CONNECTION PARAMETERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* Target Host */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Host / IP Objetivo</label>
            <div className="relative">
              <input
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Community String */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Comunidad (Community)</label>
              <div className="flex gap-1">
                {['public', 'private'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCommunity(c)}
                    className={`text-[9px] font-mono px-1 rounded transition-colors ${
                      community === c ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              placeholder="public"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
            />
          </div>

          {/* SNMP Version & Port */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Versión</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
              >
                <option value="2c">SNMP v2c</option>
                <option value="1">SNMP v1</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Puerto UDP</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 161)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Device Quick Selector from current inventory */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Seleccionar del Inventario</label>
            <select
              value={targetIp}
              onChange={(e) => {
                setTargetIp(e.target.value);
                const dev = devices.find(d => d.ip === e.target.value);
                if (dev && onSelectDevice) onSelectDevice(dev);
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none truncate"
            >
              {devices.map(d => (
                <option key={d.id || d.ip} value={d.ip}>
                  {d.ip} — {d.host !== '—' ? d.host : d.vendor || 'Host'} ({d.estado})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source mode badge */}
        {telemetry && (
          <div className="mt-3 pt-3 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                telemetry.isLiveSnmp 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${telemetry.isLiveSnmp ? 'bg-emerald-500 animate-ping' : 'bg-cyan-500'}`} />
                {telemetry.isLiveSnmp ? 'AGENTE SNMP EN VIVO (UDP 161)' : 'PERFIL DE TELEMETRÍA ASISTIDO'}
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                Latencia de respuesta: <strong className="text-slate-200">{telemetry.responseTimeMs} ms</strong>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic max-w-xl truncate">
              {telemetry.sourceNote}
            </p>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'resumen' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Resumen de Hardware</span>
        </button>

        <button
          onClick={() => setActiveTab('interfaces')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'interfaces' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Interfaces de Red ({telemetry?.interfaces?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('oid_explorer')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'oid_explorer' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Explorador de OIDs / MIB</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {telemetry ? (
        <>
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              {/* SYSTEM BANNER */}
              <div className="bg-[#050914] border border-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                      sysName / Hostname
                    </span>
                    <h3 className="text-base font-bold text-white font-mono mt-0.5 flex items-center gap-2">
                      {telemetry.sysName}
                      <button
                        onClick={() => copyToClipboard(telemetry.sysName, 'sysname')}
                        className="text-slate-500 hover:text-cyan-400 transition-colors"
                        title="Copiar Hostname"
                      >
                        {copiedKey === 'sysname' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      <div>
                        <span className="text-[9px] block text-slate-500 uppercase font-mono">Uptime</span>
                        <span className="font-mono text-slate-200 font-bold">{telemetry.sysUptime}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                      <div>
                        <span className="text-[9px] block text-slate-500 uppercase font-mono">Temp. Chasis</span>
                        <span className="font-mono text-amber-300 font-bold">{telemetry.temperatureC ? `${telemetry.temperatureC} °C` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                        <span className="text-[9px] block text-slate-500 uppercase font-mono">Ventilación</span>
                        <span className="font-mono text-emerald-400 font-bold">{telemetry.fanStatus || 'OK'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">sysDescr (Firma de Hardware / SO)</span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 font-mono text-xs text-slate-300 mt-1 select-all break-all">
                    {telemetry.sysDescr}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Ubicación (sysLocation)</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2 rounded border border-slate-900 mt-0.5">
                      {telemetry.sysLocation || 'No configurado en el agente'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Contacto Técnico (sysContact)</span>
                    <p className="text-slate-300 font-mono bg-slate-950/60 p-2 rounded border border-slate-900 mt-0.5">
                      {telemetry.sysContact || 'No configurado en el agente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CORE METRICS: CPU & RAM GAUGES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPU GAUGES */}
                <div className="bg-[#070c1b] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase font-display">Carga de Procesamiento (CPU)</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {telemetry.cpuCores ? `${telemetry.cpuCores} Núcleos` : 'Multi-núcleo'}
                    </span>
                  </div>

                  <div className="my-6 text-center">
                    <div className="inline-flex items-baseline gap-1 font-mono font-bold">
                      <span className={`text-4xl ${
                        telemetry.cpuPercent > 85 ? 'text-rose-400' : telemetry.cpuPercent > 65 ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {telemetry.cpuPercent}
                      </span>
                      <span className="text-lg text-slate-500">%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Carga promedio instantánea en el nodo</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900 p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          telemetry.cpuPercent > 85 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' :
                          telemetry.cpuPercent > 65 ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, telemetry.cpuPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>0%</span>
                      <span>Umbral advertencia: 75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* MEMORY RAM GAUGES */}
                <div className="bg-[#070c1b] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white uppercase font-display">Memoria RAM Física</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Total: {(telemetry.memoryTotalMb / 1024).toFixed(1)} GB
                    </span>
                  </div>

                  <div className="my-6 text-center">
                    <div className="inline-flex items-baseline gap-1 font-mono font-bold">
                      <span className={`text-4xl ${
                        telemetry.memoryPercent > 90 ? 'text-rose-400' : telemetry.memoryPercent > 75 ? 'text-amber-400' : 'text-indigo-400'
                      }`}>
                        {telemetry.memoryPercent}
                      </span>
                      <span className="text-lg text-slate-500">%</span>
                    </div>
                    <div className="flex justify-center gap-4 text-[11px] font-mono mt-1 text-slate-400">
                      <span>En uso: <strong className="text-indigo-300">{telemetry.memoryUsedMb} MB</strong></span>
                      <span>Libre: <strong className="text-slate-300">{telemetry.memoryFreeMb} MB</strong></span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900 p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          telemetry.memoryPercent > 90 ? 'bg-rose-500' :
                          telemetry.memoryPercent > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(100, telemetry.memoryPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>0%</span>
                      <span>Crítico: 90%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interfaces' && (
            <div className="bg-[#070c1b] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-display">Tabla de Interfaces de Red (ifTable)</h3>
                  <p className="text-[11px] text-slate-400">Puertos físicos, interfaces VLAN y enlaces de datos monitoreados vía SNMP</p>
                </div>
                <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded border border-cyan-500/20 font-bold">
                  {telemetry.interfaces.filter(i => i.status === 'up').length} / {telemetry.interfaces.length} Activas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Idx</th>
                      <th className="py-2.5 px-3">Interfaz</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Velocidad</th>
                      <th className="py-2.5 px-3">Dirección MAC</th>
                      <th className="py-2.5 px-3 text-right">Tráfico Entrada</th>
                      <th className="py-2.5 px-3 text-right">Tráfico Salida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {telemetry.interfaces.map((iface) => (
                      <tr key={iface.index} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-3 text-slate-500">{iface.index}</td>
                        <td className="py-2 px-3 font-semibold text-slate-200 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${iface.status === 'up' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          {iface.name}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            iface.status === 'up' 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {iface.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {iface.speedMbps >= 1000 ? `${iface.speedMbps / 1000} Gbps` : `${iface.speedMbps} Mbps`}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{iface.mac}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          {(iface.inOctets / (1024 * 1024)).toFixed(1)} MB
                        </td>
                        <td className="py-2 px-3 text-right text-cyan-400">
                          {(iface.outOctets / (1024 * 1024)).toFixed(1)} MB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'oid_explorer' && (
            <div className="space-y-4">
              {/* OID INTERROGATOR */}
              <div className="bg-[#070c1b] border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white uppercase font-display mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  Interrogador de OID Personalizado
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Consulte cualquier OID puntual (ASN.1) para extraer valores numéricos, contadores o cadenas de texto directamente del agente SNMP remoto.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customOidInput}
                    onChange={(e) => setCustomOidInput(e.target.value)}
                    placeholder="1.3.6.1.2.1.1.1.0"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                  />
                  <button
                    onClick={() => handleQueryOid(customOidInput)}
                    disabled={isQueryingOid}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>{isQueryingOid ? 'Consultando...' : 'Consultar OID'}</span>
                  </button>
                </div>

                {/* Common OID Shortcuts */}
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block mb-2">
                    OIDs Estándar Comunes (Acceso Rápido)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {COMMON_OIDS.map(item => (
                      <button
                        key={item.oid}
                        onClick={() => {
                          setCustomOidInput(item.oid);
                          handleQueryOid(item.oid);
                        }}
                        className="text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 hover:bg-slate-900 hover:border-cyan-500/40 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono text-cyan-300 font-semibold group-hover:text-cyan-400">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.oid}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* OID Query Results */}
                {oidQueryResults.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                      Respuesta Recibida:
                    </span>
                    {oidQueryResults.map((res, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
                        <div className="flex justify-between text-slate-500 text-[10px] mb-1">
                          <span>OID: <strong className="text-slate-300">{res.oid}</strong></span>
                          <span>Tipo ASN.1: <strong className="text-indigo-400">{res.type}</strong></span>
                        </div>
                        <div className="p-2 bg-slate-900/60 rounded border border-slate-800/40 text-emerald-300 select-all break-all">
                          {res.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-12 text-center bg-[#070c1b] border border-slate-800 rounded-xl text-slate-400 space-y-3">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-sm">Interrogando agente SNMP en {targetIp}...</p>
        </div>
      )}
    </div>
  );
}
