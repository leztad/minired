import React, { useState, useMemo } from 'react';
import { Device } from '../types';
import { 
  ArrowDownCircle, ArrowUpCircle, HardDrive, Activity, 
  Zap, Play, Trash2, ShieldAlert, Wifi, Info, Monitor, Cpu
} from 'lucide-react';

interface BandwidthMonitorProps {
  devices: Device[];
  isScanning: boolean;
  onSelectDevice: (device: Device) => void;
  // Trigger a heavy simulated download or load profile from parent
  onTriggerTraffic: (ip: string, profile: string) => void;
  onResetTraffic: () => void;
  trafficGeneratorActive: { ip: string; profileName: string; durationLeft: number } | null;
  bandwidthHistory: { timeLabels: string; downTotal: number; upTotal: number }[];
}

export default function BandwidthMonitor({
  devices,
  isScanning,
  onSelectDevice,
  onTriggerTraffic,
  onResetTraffic,
  trafficGeneratorActive,
  bandwidthHistory
}: BandwidthMonitorProps) {
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<string>('streaming_4k');
  const [sortBy, setSortBy] = useState<'download' | 'upload' | 'total'>('download');

  const activeDevices = useMemo(() => {
    return devices.filter(d => d.estado !== 'Caído' && d.estado !== 'No_Escaneado');
  }, [devices]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    let totalDown = 0;
    let totalUp = 0;
    let totalMB = 0;
    let highConsumersCount = 0;

    activeDevices.forEach(d => {
      const down = d.consumoDownload || 0;
      const up = d.consumoUpload || 0;
      totalDown += down;
      totalUp += up;
      totalMB += d.totalConsumido || 0;
      if (down > 5 || up > 5) {
        highConsumersCount++;
      }
    });

    return {
      totalDown: Number(totalDown.toFixed(1)),
      totalUp: Number(totalUp.toFixed(1)),
      totalMB: Math.round(totalMB),
      highConsumers: highConsumersCount
    };
  }, [activeDevices]);

  // Sort active devices
  const sortedActiveDevices = useMemo(() => {
    const list = [...activeDevices];
    return list.sort((a, b) => {
      if (sortBy === 'download') {
        return (b.consumoDownload || 0) - (a.consumoDownload || 0);
      } else if (sortBy === 'upload') {
        return (b.consumoUpload || 0) - (a.consumoUpload || 0);
      } else {
        return (b.totalConsumido || 0) - (a.totalConsumido || 0);
      }
    });
  }, [activeDevices, sortBy]);

  // Set default device if none selected
  React.useEffect(() => {
    if (activeDevices.length > 0 && !selectedDeviceIp) {
      // Prefer desktop or PS5 if available
      const found = activeDevices.find(d => d.ip.endsWith('.55')) || activeDevices.find(d => d.ip.endsWith('.40')) || activeDevices[0];
      setSelectedDeviceIp(found.ip);
    }
  }, [activeDevices, selectedDeviceIp]);

  // Profiles metadata for explanation
  const profiles = [
    { id: 'streaming_4k', name: 'Streaming Video 4K UltraHD', down: 25.0, up: 1.5, latency: 15, desc: 'Simula consumo continuo de video comprimido de alta definición (Netflix, YouTube).' },
    { id: 'game_download', name: 'Descarga Masiva (Juego / Steam)', down: 88.0, up: 4.2, latency: 85, desc: 'Satura la velocidad de bajada. Incrementa la latencia (ping) local debido al ancho de banda copado.' },
    { id: 'nas_backup', name: 'Copia de Seguridad Cloud / NAS', down: 1.5, up: 45.0, latency: 40, desc: 'Genera tráfico pesado de subida al servidor local o almacenamiento en la nube.' },
    { id: 'ddos_test', name: 'Prueba Stress / Simulación Ataque', down: 120.0, up: 110.0, latency: 280, desc: 'Sobrecarga simultánea bidireccional. Empuja el equipo e IP a Advertencia extrema.' }
  ];

  const currentProfileInfo = profiles.find(p => p.id === selectedProfile);

  // SVG Chart Dimensions
  const width = 600;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // SVG Chart Mapping
  const maxTrafficVal = useMemo(() => {
    if (bandwidthHistory.length === 0) return 100;
    const maxVal = Math.max(...bandwidthHistory.map(h => Math.max(h.downTotal, h.upTotal)));
    return Math.max(maxVal * 1.2, 50); // padding headspace
  }, [bandwidthHistory]);

  const chartPoints = useMemo(() => {
    if (bandwidthHistory.length === 0) return { downPoints: [], upPoints: [] };
    
    const downPoints = bandwidthHistory.map((h, i) => {
      const x = paddingX + (i / (bandwidthHistory.length - 1 || 1)) * chartWidth;
      const ratioY = h.downTotal / maxTrafficVal;
      const y = height - paddingY - ratioY * chartHeight;
      return { x, y, val: h.downTotal, time: h.timeLabels };
    });

    const upPoints = bandwidthHistory.map((h, i) => {
      const x = paddingX + (i / (bandwidthHistory.length - 1 || 1)) * chartWidth;
      const ratioY = h.upTotal / maxTrafficVal;
      const y = height - paddingY - ratioY * chartHeight;
      return { x, y, val: h.upTotal, time: h.timeLabels };
    });

    return { downPoints, upPoints };
  }, [bandwidthHistory, maxTrafficVal, chartWidth, chartHeight]);

  const downPath = chartPoints.downPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const downArea = chartPoints.downPoints.length > 0 
    ? `${downPath} L ${chartPoints.downPoints[chartPoints.downPoints.length - 1].x} ${height - paddingY} L ${chartPoints.downPoints[0].x} ${height - paddingY} Z`
    : '';

  const upPath = chartPoints.upPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const upArea = chartPoints.upPoints.length > 0 
    ? `${upPath} L ${chartPoints.upPoints[chartPoints.upPoints.length - 1].x} ${height - paddingY} L ${chartPoints.upPoints[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="space-y-4 animate-fade-in text-slate-300">
      
      {/* 1. ROW OF HIGH LEVEL METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* DOWNLOAD CARD */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Descarga Total LAN</span>
            <div className="text-xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
              {aggregateStats.totalDown}
              <span className="text-[10px] text-slate-500 font-sans font-normal">Mbps</span>
            </div>
            <p className="text-[9px] text-slate-500 font-sans">Ancho de banda entrante actual</p>
          </div>
          <ArrowDownCircle className="h-8 w-8 text-cyan-500/30" />
        </div>

        {/* UPLOAD CARD */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Subida Total LAN</span>
            <div className="text-xl font-bold font-mono text-amber-500 flex items-baseline gap-1">
              {aggregateStats.totalUp}
              <span className="text-[10px] text-slate-500 font-sans font-normal">Mbps</span>
            </div>
            <p className="text-[9px] text-slate-500 font-sans">Ancho de banda saliente actual</p>
          </div>
          <ArrowUpCircle className="h-8 w-8 text-amber-500/30" />
        </div>

        {/* TOTAL DATA CARD */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Consumo Acumulado</span>
            <div className="text-xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
              {aggregateStats.totalMB >= 1024 
                ? `${(aggregateStats.totalMB / 1024).toFixed(2)} GB`
                : `${aggregateStats.totalMB} MB`}
            </div>
            <p className="text-[9px] text-slate-500 font-sans">Registrado en la sesión actual</p>
          </div>
          <HardDrive className="h-8 w-8 text-emerald-500/30" />
        </div>

        {/* ACTIVE DEVICES WITH TRAFFIC */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Consumidores Activos</span>
            <div className="text-xl font-bold font-mono text-purple-400 flex items-baseline gap-1">
              {aggregateStats.highConsumers}
              <span className="text-[10px] text-slate-500 font-sans font-normal">hosts</span>
            </div>
            <p className="text-[9px] text-slate-500 font-sans">{`Superan los 5.0 Mbps de tráfico`}</p>
          </div>
          <Activity className="h-8 w-8 text-purple-500/30" />
        </div>
      </div>

      {/* 2. REAL-TIME BANDWIDTH CHART & CONTROLLER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* CHART LAN TRADING */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 p-4 rounded-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                Flujo de Tráfico LAN en Tiempo Real (Mbps)
              </h3>
              <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-850 font-mono text-slate-500">
                LÍMITES: 0 - {Math.round(maxTrafficVal)} Mbps
              </span>
            </div>

            {bandwidthHistory.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-500">
                Esperando datos de tráfico. Por favor inicialice un escaneo.
              </div>
            ) : (
              <div className="relative w-full">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0, 0.5, 1].map((ratio, idx) => {
                    const h = height - paddingY - ratio * chartHeight;
                    const value = Math.round(ratio * maxTrafficVal);
                    return (
                      <g key={idx}>
                        <line x1={paddingX} y1={h} x2={width - paddingX} y2={h} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3,3" />
                        <text x={paddingX - 10} y={h + 3} textAnchor="end" className="fill-slate-500 text-[8px] font-mono">{value} Mbps</text>
                      </g>
                    );
                  })}

                  {/* Time Labels */}
                  {bandwidthHistory.map((h, idx) => {
                    if (idx === 0 || idx === bandwidthHistory.length - 1 || idx === Math.floor(bandwidthHistory.length / 2)) {
                      const x = paddingX + (idx / (bandwidthHistory.length - 1 || 1)) * chartWidth;
                      return (
                        <text key={idx} x={x} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[8px] font-mono">{h.timeLabels}</text>
                      );
                    }
                    return null;
                  })}

                  {/* Areas */}
                  {downArea && <path d={downArea} fill="url(#downGrad)" />}
                  {upArea && <path d={upArea} fill="url(#upGrad)" />}

                  {/* Lines */}
                  {downPath && <path d={downPath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                  {upPath && <path d={upPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
              </div>
            )}
          </div>

          <div className="flex gap-4 items-center justify-center mt-3 text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>
              Descarga Global ({aggregateStats.totalDown} Mbps)
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              Subida Global ({aggregateStats.totalUp} Mbps)
            </span>
          </div>
        </div>

        {/* INTERACTIVE TRAFFIC GENERATOR */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 p-4 rounded-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-3 border-b border-slate-850 pb-2 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-cyan-400" />
              Generador de Tráfico LAN de Prueba
            </h3>

            {activeDevices.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">
                Debe realizar un escaneo en red para detectar hosts activos antes de inyectar tráfico de prueba.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Select Host */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Dispositivo Target</label>
                  <select 
                    value={selectedDeviceIp}
                    onChange={(e) => setSelectedDeviceIp(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-850 rounded-xs p-1.5 text-xs font-mono"
                    disabled={!!trafficGeneratorActive}
                  >
                    {activeDevices.map(d => (
                      <option key={d.ip} value={d.ip}>
                        {d.host !== '—' ? `${d.host} (${d.ip})` : d.ip}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profiles Grid */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Perfil de Consumo</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProfile(p.id)}
                        className={`p-2 rounded-xs border text-left cursor-pointer transition-all ${
                          selectedProfile === p.id 
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50' 
                            : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800'
                        } ${trafficGeneratorActive ? 'opacity-40 pointer-events-none' : ''}`}
                      >
                        <div className="font-bold text-[10px] truncate">{p.name}</div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                          <span>↓ {p.down} M</span>
                          <span>↑ {p.up} M</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile Description */}
                {currentProfileInfo && (
                  <div className="bg-slate-950/50 p-2.5 rounded border border-slate-850 text-[10px] text-slate-400 font-sans">
                    <span className="font-bold text-slate-300 block mb-0.5">{currentProfileInfo.name}</span>
                    <p className="leading-tight text-slate-505 text-[10.5px]">{currentProfileInfo.desc}</p>
                    <div className="mt-1.5 font-mono text-[9px] text-amber-550 text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 inline text-amber-400" />
                      <span>Impacto Directo: Latencia aumenta +{currentProfileInfo.latency} ms</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-850 flex gap-2">
            {trafficGeneratorActive ? (
              <div className="w-full bg-[#111c30] p-2.5 rounded border border-cyan-800/40 text-slate-200">
                <div className="flex justify-between text-xs items-center font-bold text-cyan-400">
                  <span className="animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-ping"></span>
                    SIMULANDO INYECCIÓN...
                  </span>
                  <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[10px] border border-cyan-900/40">{trafficGeneratorActive.durationLeft}s</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Emitiendo flujo para <span className="text-white font-mono font-bold">{trafficGeneratorActive.ip}</span> con el perfil <span className="text-white font-semibold">{trafficGeneratorActive.profileName}</span>.
                </div>
                <button
                  onClick={onResetTraffic}
                  className="w-full mt-2.5 bg-rose-950/40 border border-rose-900 text-rose-400 hover:bg-rose-900/20 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Detener Simulación y Limpiar Red
                </button>
              </div>
            ) : (
              <button
                disabled={activeDevices.length === 0}
                onClick={() => onTriggerTraffic(selectedDeviceIp, selectedProfile)}
                className={`w-full py-2 px-3 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeDevices.length === 0
                    ? 'bg-slate-800 text-slate-600 border border-slate-850 opacity-40 cursor-not-allowed'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 uppercase font-display tracking-wide'
                }`}
              >
                <Play className="h-4 w-4" />
                Inyectar Carga de Consumo
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. LEADERBOARD LIST - DETAILED BANDWIDTH DEVICES */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-md overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase text-slate-400 font-display">
              Consumo Detallado de Dispositivos Conectados
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Ordenar por:</span>
            <div className="flex bg-slate-950 rounded border border-slate-800 p-0.5 font-sans leading-none text-[11px]">
              {(['download', 'upload', 'total'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortBy(mode)}
                  className={`px-2 py-1 rounded-sm cursor-pointer transition-colors ${
                    sortBy === mode 
                      ? 'bg-cyan-500 text-slate-950 font-bold' 
                      : 'hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {mode === 'download' ? 'Descarga' : mode === 'upload' ? 'Subida' : 'Total'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0F172A] text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider font-display">
                <th className="py-2.5 px-4">Dispositivo</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Consumo Descarga (↓)</th>
                <th className="py-2.5 px-3">Consumo Subida (↑)</th>
                <th className="py-2.5 px-4 text-right">Datos Totales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {sortedActiveDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No hay dispositivos activos cargados en red. Realice un escaneo.
                  </td>
                </tr>
              ) : (
                sortedActiveDevices.map(d => {
                  const down = d.consumoDownload || 0;
                  const up = d.consumoUpload || 0;
                  
                  // Progress percentage calculations for bars
                  const maxRefVal = sortBy === 'upload' ? 50 : 100;
                  const downPct = Math.min(100, (down / maxRefVal) * 100);
                  const upPct = Math.min(100, (up / maxRefVal) * 100);

                  return (
                    <tr 
                      key={d.id}
                      onClick={() => onSelectDevice(d)}
                      className="hover:bg-slate-800/20 cursor-pointer transition-colors border-b border-slate-800/30"
                    >
                      {/* Name / Icon */}
                      <td className="py-2.5 px-4 font-semibold text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            d.estado === 'OK' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className="truncate max-w-[150px]">{d.host}</span>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="py-2.5 px-3 font-mono text-cyan-400 font-medium">
                        {d.ip}
                      </td>

                      {/* Download meters */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-bold text-cyan-400 text-right">{down.toFixed(1)} Mbps</span>
                          <div className="w-24 bg-slate-950 rounded-xs h-1 px-0.5 flex items-center overflow-hidden border border-slate-850">
                            <div 
                              className={`h-0.75 rounded-xs transition-all duration-300 ${
                                down > 50 ? 'bg-rose-500' : down > 15 ? 'bg-amber-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${downPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Upload meters */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-bold text-amber-500 text-right">{up.toFixed(1)} Mbps</span>
                          <div className="w-24 bg-slate-950 rounded-xs h-1 px-0.5 flex items-center overflow-hidden border border-slate-850">
                            <div 
                              className={`h-0.75 rounded-xs transition-all duration-300 ${
                                up > 30 ? 'bg-rose-500' : up > 10 ? 'bg-amber-400' : 'bg-amber-500'
                              }`}
                              style={{ width: `${upPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total MB Accumulated */}
                      <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-300">
                        {d.totalConsumido !== undefined ? (
                          d.totalConsumido >= 1024
                            ? `${(d.totalConsumido / 1024).toFixed(1)} GB`
                            : `${Math.round(d.totalConsumido)} MB`
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
