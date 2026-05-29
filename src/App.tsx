import React, { useState, useEffect, useMemo } from 'react';
import { 
  Network, Activity, Cpu, Server, Search, RefreshCw, Sliders, Globe, Clock, 
  Settings, Layers, Wifi, AlertTriangle, XCircle, CheckCircle2, ChevronRight, 
  ChevronDown, Monitor, Copy, Plus, Play, Pause, ExternalLink, HelpCircle, 
  ShieldCheck, Info, Radio
} from 'lucide-react';

import { Device, Sensor, ScanStats, HistoryPoint } from './types';
import { generateFullSubnet, generateSensorsForDevices } from './utils/simulation';
import MapSubred from './components/MapSubred';
import HistorialHosts from './components/HistorialHosts';
import DeviceTable from './components/DeviceTable';
import SensorTable from './components/SensorTable';
import TestingCenter from './components/TestingCenter';
import BandwidthMonitor from './components/BandwidthMonitor';

export default function App() {
  // General simulator state
  const [includeVirtuals, setIncludeVirtuals] = useState<boolean>(false);
  const [subnetSegment, setSubnetSegment] = useState<string>('192.168.1.0/24');
  const [selectedInterface, setSelectedInterface] = useState<string>('Realtek PCIe GbE Family Controller');
  const [selectedInterval, setSelectedInterval] = useState<string>('1 minuto');
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Navigation
  const [activeView, setActiveView] = useState<'vista_general' | 'sensores' | 'dispositivos' | 'ancho_banda' | 'testeo'>('vista_general');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [isLanTreeOpen, setIsLanTreeOpen] = useState<boolean>(true);

  // Scan states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scannedIndex, setScannedIndex] = useState<number>(0);
  const [lastScanDone, setLastScanDone] = useState<boolean>(false);
  const [lastScanTimeStr, setLastScanTimeStr] = useState<string | null>(null);
  const [scanDurationSec, setScanDurationSec] = useState<number | null>(null);

  // Data pools
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  
  // History point database (preload with realistic past records)
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([
    { timeLabels: '09:20:00', hostsActivos: 4, latenciaMedia: 48 },
    { timeLabels: '09:25:00', hostsActivos: 4, latenciaMedia: 52 },
    { timeLabels: '09:30:00', hostsActivos: 4, latenciaMedia: 51 },
    { timeLabels: '09:35:00', hostsActivos: 4, latenciaMedia: 55 },
  ]);

  // Bandwidth simulation states & initial history records
  const [trafficGeneratorActive, setTrafficGeneratorActive] = useState<{ ip: string; profileName: string; durationLeft: number } | null>(null);
  const [bandwidthHistory, setBandwidthHistory] = useState<{ timeLabels: string; downTotal: number; upTotal: number }[]>([
    { timeLabels: '16:01:00', downTotal: 65.2, upTotal: 15.4 },
    { timeLabels: '16:02:00', downTotal: 68.1, upTotal: 16.2 },
    { timeLabels: '16:03:00', downTotal: 72.4, upTotal: 14.8 },
    { timeLabels: '16:04:00', downTotal: 66.0, upTotal: 50.8 },
    { timeLabels: '16:05:00', downTotal: 68.3, upTotal: 51.2 },
  ]);

  // Selected device for modal diagnostic popup
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');

  // Synchronize renaming fields on selecting a device or state change
  useEffect(() => {
    if (!selectedDevice) {
      setIsEditingName(false);
      setTempName('');
    } else {
      const activeDevice = devices.find(d => d.id === selectedDevice.id);
      if (activeDevice) {
        setTempName(activeDevice.host !== '—' ? activeDevice.host : '');
      }
    }
  }, [selectedDevice, devices]);

  const handleRenameDevice = (id: string, newName: string) => {
    const finalName = newName.trim() || '—';
    setDevices(prev => {
      const targetDevice = prev.find(d => d.id === id);
      if (targetDevice) {
        setSensors(sPrev => sPrev.map(s => {
          if (s.ip === targetDevice.ip) {
            return { ...s, dispositivo: finalName };
          }
          return s;
        }));
      }
      return prev.map(d => d.id === id ? { ...d, host: finalName } : d);
    });
  };

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize empty subnet on startup (unscanned state - matching Image 1)
  useEffect(() => {
    // Generates a clean, entirely offline/unscanned list of 254 devices
    const base = subnetSegment.replace(/\.0\/24$/, '');
    const initialPool: Device[] = Array.from({ length: 254 }, (_, idx) => {
      const i = idx + 1;
      return {
        id: `host-${i}`,
        ip: `${base}.${i}`,
        host: '—',
        mac: '—',
        ping: null,
        estado: 'No_Escaneado',
        lastChecked: null,
        sensorPing: false,
      };
    });
    setDevices(initialPool);
    setSensors([]);
    setLastScanDone(false);
    setLastScanTimeStr(null);
    setScanDurationSec(null);
  }, [subnetSegment]);

  // Handle active states if Virtuales changes, ask to scan again
  const handleVirtualsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeVirtuals(e.target.checked);
  };

  // Bandwidth Traffic Simulation and Fluctuation loop
  useEffect(() => {
    // Only fluctuate traffic if a scan has been completed
    if (!lastScanDone || isScanning) return;

    const interval = setInterval(() => {
      // 1. Decrement simulation countdown if active
      let activeSim = trafficGeneratorActive;
      if (activeSim) {
        if (activeSim.durationLeft <= 1) {
          activeSim = null;
          setTrafficGeneratorActive(null);
        } else {
          activeSim = {
            ...activeSim,
            durationLeft: activeSim.durationLeft - 4
          };
          setTrafficGeneratorActive(activeSim);
        }
      }

      // Profiles metadata
      const profileData: Record<string, { down: number; up: number; latency: number; name: string }> = {
        streaming_4k: { down: 25.0, up: 1.5, latency: 15, name: 'Streaming 4K' },
        game_download: { down: 88.0, up: 4.2, latency: 85, name: 'Descarga Masiva' },
        nas_backup: { down: 1.5, up: 45.0, latency: 40, name: 'Copia Certificada/NAS' },
        ddos_test: { down: 120.0, up: 110.0, latency: 280, name: 'Stress DDoS' }
      };

      // 2. Fluctuate devices traffic
      let totalDown = 0;
      let totalUp = 0;

      setDevices(prevDevices => {
        return prevDevices.map(d => {
          if (d.estado === 'Caído' || d.estado === 'No_Escaneado') {
            return d;
          }

          let down = d.consumoDownload || 0;
          let up = d.consumoUpload || 0;
          let ping = d.ping;
          let estado = d.estado;

          // Check if this device is being targeted by active speed/stress test
          if (activeSim && d.ip === activeSim.ip) {
            const prof = profileData[activeSim.profileName];
            if (prof) {
              // Simulated values with tiny fluctuation
              down = Number((prof.down * (0.95 + Math.random() * 0.1)).toFixed(1));
              up = Number((prof.up * (0.95 + Math.random() * 0.1)).toFixed(1));
              
              // Heavy traffic affects ping latency and can trigger warnings!
              ping = Math.round(prof.latency + Math.random() * 8);
              
              if (down > 50 || up > 30) {
                estado = 'Advertencia';
              } else {
                estado = 'OK';
              }
            }
          } else {
            // Normal fluctuation
            const baseDown = d.host.includes('PS5') ? 42.8 : 
                             d.host.includes('Smart-TV') ? 18.5 :
                             d.host.includes('Este PC') ? 5.6 : 
                             d.host.includes('Docker') ? 2.1 :
                             d.host.includes('NAS') ? 0.8 : 0.5;

            const baseUp = d.host.includes('NAS') ? 45.3 :
                           d.host.includes('Docker') ? 3.4 : 0.4;

            // Fluctuate download/upload slightly around bases
            down = Number((baseDown * (0.85 + Math.random() * 0.3)).toFixed(1));
            up = Number((baseUp * (0.85 + Math.random() * 0.3)).toFixed(1));

            // Small floor
            if (down < 0.1) down = 0.1;
            if (up < 0.05) up = 0.05;

            // Restore original presets' status
            if (d.host.includes('PS5')) {
              ping = 120;
              estado = 'Advertencia';
            } else if (d.host.includes('Smart-TV')) {
              ping = 85;
              estado = 'Advertencia';
            } else if (d.host.includes('NAS-Backup')) {
              ping = 95;
              estado = 'Advertencia';
            } else {
              ping = d.host.includes('Router') ? 1 : Math.round(3 + Math.random() * 8);
              estado = 'OK';
            }
          }

          // Accumulate consumed MB in real-time
          const megabits = (down + up) * 4; 
          const megabytes = megabits / 8;
          const currentTotal = d.totalConsumido || 0;
          const newTotal = Number((currentTotal + megabytes).toFixed(1));

          totalDown += down;
          totalUp += up;

          return {
            ...d,
            ping,
            estado,
            consumoDownload: down,
            consumoUpload: up,
            totalConsumido: newTotal
          };
        });
      });

      // 3. Update bandwidth history line chart
      setBandwidthHistory(prevHist => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const newPoint = {
          timeLabels: timeStr,
          downTotal: Number(totalDown.toFixed(1)),
          upTotal: Number(totalUp.toFixed(1))
        };
        return [...prevHist, newPoint].slice(-16); // keep last 16 points
      });

    }, 4000);

    return () => clearInterval(interval);
  }, [lastScanDone, isScanning, trafficGeneratorActive]);

  const handleTriggerTraffic = (ip: string, profile: string) => {
    setTrafficGeneratorActive({
      ip,
      profileName: profile,
      durationLeft: 20
    });
  };

  const handleResetTraffic = () => {
    setTrafficGeneratorActive(null);
    setDevices(prev => prev.map(d => {
      if (d.estado === 'Caído' || d.estado === 'No_Escaneado') return d;
      const isTv = d.ip.endsWith('.38');
      const isPs = d.ip.endsWith('.40');
      const isNas = d.ip.endsWith('.15') || d.host.includes('NAS-Backup');
      return {
        ...d,
        consumoDownload: isPs ? 42.8 : isTv ? 18.5 : 2.5,
        consumoUpload: isPs ? 3.5 : isTv ? 1.2 : isNas ? 45.3 : 0.5,
        estado: (isPs || isTv || isNas) ? 'Advertencia' : 'OK',
        ping: isPs ? 120 : isTv ? 85 : isNas ? 95 : 5
      };
    }));
  };

  // Perform Network Scan Simulation (taking 3.5 seconds to sweep the grid)
  const handleStartScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScannedIndex(0);

    const fullTargetPool = generateFullSubnet(subnetSegment, includeVirtuals);
    
    // Create animated progress sweep
    let currentPercent = 0;
    const intervalStep = 120; // total duration: ~3.6s
    const totalSteps = 25; 
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      currentPercent = Math.min(100, Math.round((stepCount / totalSteps) * 100));
      setScanProgress(currentPercent);

      const itemsScannedCount = Math.min(254, Math.round((stepCount / totalSteps) * 254));
      setScannedIndex(itemsScannedCount);

      // Mutate part of the pool in real-time to show incremental scan in grid!
      setDevices(prev => {
        const nextPool = [...prev];
        for (let i = 0; i < itemsScannedCount; i++) {
          nextPool[i] = {
            ...fullTargetPool[i],
            lastChecked: new Date().toLocaleTimeString(),
          };
        }
        return nextPool;
      });

      if (stepCount >= totalSteps) {
        clearInterval(timer);
        
        // Setup final details
        const finalDevicesState = fullTargetPool.map(d => ({
          ...d,
          lastChecked: new Date().toLocaleTimeString(),
        }));
        setDevices(finalDevicesState);

        // Generate sensors
        const generatedSensors = generateSensorsForDevices(finalDevicesState);
        setSensors(generatedSensors);

        // Scan meta
        const now = new Date();
        const scanTimeStr = now.toLocaleString('es-ES', { 
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
        const duration = Number((1.2 + Math.random() * 2).toFixed(1)); // e.g. 1.8s
        
        setLastScanTimeStr(scanTimeStr);
        setScanDurationSec(duration);
        setLastScanDone(true);
        setIsScanning(false);

        // Append to history graph
        const liveHostsCount = finalDevicesState.filter(d => d.estado === 'OK' || d.estado === 'Advertencia').length;
        const validPings = finalDevicesState.filter(d => d.ping !== null).map(d => d.ping as number);
        const avgPing = validPings.length > 0 ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;

        setHistoryData(prev => [
          ...prev, 
          { 
            timeLabels: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
            hostsActivos: liveHostsCount,
            latenciaMedia: avgPing
          }
        ].slice(-8)); // keep last 8 scans
      }
    }, intervalStep);
  };

  // Preset Segment scan autofills
  const handleAutoSegment = () => {
    setSubnetSegment('192.168.1.0/24');
  };

  // Helper values
  const counts = useMemo<ScanStats>(() => {
    if (!lastScanDone && !isScanning) {
      return { ok: 0, advertencia: 0, caido: 0, total: 0, lastScanTime: null, scanDuration: null };
    }
    const ok = devices.filter(d => d.estado === 'OK').length;
    const advertencia = devices.filter(d => d.estado === 'Advertencia').length;
    const caido = devices.filter(d => d.estado === 'Caído').length;
    const total = devices.length;

    return { ok, advertencia, caido, total, lastScanTime: lastScanTimeStr, scanDuration: scanDurationSec };
  }, [devices, lastScanDone, isScanning, lastScanTimeStr, scanDurationSec]);

  // Overall availability % calculation
  const statsAvailability = useMemo(() => {
    if (!lastScanDone && !isScanning) return '0%';
    const totalActive = counts.ok + counts.advertencia;
    if (counts.total === 0) return '0%';
    const pct = ((totalActive / counts.total) * 100).toFixed(2);
    return `${pct}%`;
  }, [counts, lastScanDone, isScanning]);

  // Average active latency calculation
  const statsAvgLatency = useMemo(() => {
    if (!lastScanDone && !isScanning) return '—';
    const activeWithPing = devices.filter(d => d.ping !== null);
    if (activeWithPing.length === 0) return '—';
    const sum = activeWithPing.reduce((acc, curr) => acc + (curr.ping || 0), 0);
    return `${Math.round(sum / activeWithPing.length)} ms`;
  }, [devices, lastScanDone, isScanning]);

  // Filter devices list for sidebar tree view
  const sidebarFilteredDevices = useMemo(() => {
    const list = devices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia');
    if (!sidebarSearch) return list;
    return list.filter(d => 
      d.ip.includes(sidebarSearch) || 
      d.host.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [devices, sidebarSearch]);

  const copyCellUrl = () => {
    navigator.clipboard.writeText('http://192.168.1.55:8080');
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0F172A] font-sans text-xs text-slate-300">
      {/* HEADER BAR (Geometric Balance Theme) */}
      <header className="bg-[#0B1120] text-slate-300 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md z-40">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f172a]/80 text-white px-2.5 py-1.5 rounded-xs font-semibold flex items-center gap-2.5 border border-slate-850 shadow-inner">
            <div className="w-6 h-6 bg-cyan-500 rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 border border-slate-900 bg-[#0F172A]" />
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-bold font-display tracking-wider text-white">Net-Core V4.0</div>
              <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">RedMonitor System</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-3">
            <Radio className={`h-4 w-4 ${isScanning ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-[10px] text-slate-500 font-mono">Simulador de LAN integrado</span>
          </div>
        </div>

        {/* Dynamic Controls Header Group */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] ml-auto">
          {/* Interfaz Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Interfaz</span>
            <select 
              value={selectedInterface}
              onChange={(e) => setSelectedInterface(e.target.value)}
              className="bg-slate-950 text-slate-300 border border-slate-850 rounded-xs px-2 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-sans"
            >
              <option value="Realtek PCIe GbE Family Controller">Realtek PCIe GbE Family Controller</option>
              <option value="Intel Wi-Fi 6E AX211 @ 802.11ax">Intel Wi-Fi 6E AX211 @ 802.11ax</option>
              <option value="Microsoft Loopback Virtual Adapter">Microsoft Loopback Virtual Adapter</option>
            </select>
          </div>

          {/* CHECKBOX Virtuales */}
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeVirtuals}
              onChange={handleVirtualsChange}
              className="rounded-xs border-slate-850 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer accent-cyan-500"
            />
            <span className="select-none text-[11px] font-medium">Virtuales</span>
          </label>

          {/* Segmento IP Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Segmento IP</span>
            <div className="flex">
              <input 
                type="text" 
                value={subnetSegment}
                onChange={(e) => setSubnetSegment(e.target.value)}
                placeholder="192.168.1.0/24"
                className="bg-slate-950 text-slate-200 text-center border border-slate-850 rounded-l-xs w-32 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-mono font-medium"
              />
              <button 
                onClick={handleAutoSegment}
                className="bg-slate-800 hover:bg-slate-755 text-cyan-400 font-semibold text-[10px] px-2 rounded-r-xs py-1 border-t border-r border-b border-slate-800 cursor-pointer transition-colors"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Intervalo Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Intervalo</span>
            <select 
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="bg-slate-950 text-slate-300 border border-slate-850 rounded-xs px-2 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-sans"
            >
              <option value="30 segundos">30 segundos</option>
              <option value="1 minuto">1 minuto</option>
              <option value="5 minutos">5 minutos</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* ESCANEAR AHORA BUTTON (Highlight Accent cyan) */}
          <button 
            disabled={isScanning}
            onClick={handleStartScan}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-bold transition-all shadow-xs pr-4 ${
              isScanning 
                ? 'bg-slate-800 text-cyan-500/50 opacity-60 cursor-not-allowed' 
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:text-black active:scale-95 cursor-pointer'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? `Escaneando... (${scanProgress}%)` : 'Escanear ahora'}
          </button>

          {/* CLOCK */}
          <div className="border-l border-slate-850 pl-3 font-mono font-bold text-[13px] tracking-wider text-cyan-400 drop-shadow-sm w-20 text-right">
            {currentTime || '9:34:52'}
          </div>
        </div>
      </header>

      {/* BREADCRUMBS SECONDARY ROW */}
      <nav className="bg-[#0B1120] text-[11px] text-slate-400 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between select-none shadow-xs font-medium">
        <ul className="flex items-center gap-1.5 flex-wrap">
          <li className="text-slate-500 font-semibold hover:text-slate-300 cursor-pointer" onClick={() => setActiveView('vista_general')}>Raíz</li>
          <li className="text-slate-600">›</li>
          <li className="text-cyan-500/80 font-semibold hover:text-cyan-400 cursor-pointer" onClick={() => setActiveView('vista_general')}>
            LAN {subnetSegment}
          </li>
          <li className="text-slate-600">›</li>
          <li className="bg-slate-800 px-2 py-0.5 rounded-sm text-slate-300 font-bold leading-none text-[10px] uppercase">
            {activeView === 'vista_general' ? 'Vista general' : activeView === 'sensores' ? 'Sensores' : activeView === 'dispositivos' ? 'Dispositivos' : activeView === 'ancho_banda' ? 'Ancho de Banda' : 'Pruebas y Diagnóstico'}
          </li>
        </ul>

        {isScanning && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-cyan-400 font-mono">BARRIDA IP: {scannedIndex} / 254 IP</span>
            <div className="w-24 bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
            </div>
          </div>
        )}
      </nav>

      {/* COLOR COUNTERS (Sleek Geometric Balance cards) */}
      <section className="bg-[#0F172A] p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-855 shadow-xs">
        {/* GREEN (OK) */}
        <div className="bg-slate-900/40 border border-emerald-800/40 text-emerald-400 py-2.5 px-4 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.ok}</div>
            <div className="text-[9px] tracking-wider font-semibold opacity-70 mt-1 font-display uppercase text-slate-400">OK</div>
          </div>
          <CheckCircle2 className="h-5 w-5 opacity-50 text-emerald-500" />
        </div>

        {/* YELLOW (Advertencia) */}
        <div className="bg-slate-900/40 border border-amber-800/40 text-amber-500 py-2.5 px-4 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.advertencia}</div>
            <div className="text-[9px] tracking-wider font-semibold opacity-70 mt-1 font-display uppercase text-slate-400">Advertencia</div>
          </div>
          <AlertTriangle className="h-5 w-5 opacity-50 text-amber-500" />
        </div>

        {/* RED (Caído) */}
        <div className="bg-slate-900/40 border border-rose-800/40 text-rose-500 py-2.5 px-4 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.caido}</div>
            <div className="text-[9px] tracking-wider font-semibold opacity-70 mt-1 font-display uppercase text-slate-400">Caído</div>
          </div>
          <XCircle className="h-5 w-5 opacity-50 text-rose-500" />
        </div>

        {/* BLUE (Total) */}
        <div className="bg-slate-900/40 border border-slate-800 text-cyan-400 py-2.5 px-4 rounded-xs flex items-center justify-between shadow-xs">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.total}</div>
            <div className="text-[9px] tracking-wider font-semibold opacity-70 mt-1 font-display uppercase text-slate-400">Total</div>
          </div>
          <Layers className="h-5 w-5 opacity-50 text-cyan-500" />
        </div>
      </section>

      {/* THREE VIEW SPLIT CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* LEFT SIDEBAR NAVBAR */}
        <aside className="w-full md:w-64 bg-[#0B1120] text-slate-300 p-3.5 border-r border-slate-850 flex flex-col gap-4 select-none flex-shrink-0">
          
          {/* SENSOR SEARCH BOX */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filtrar dispositivos..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 rounded-sm border border-slate-850 text-xs focus:outline-hidden focus:ring-1 focus:ring-cyan-500 font-sans"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </div>

          {/* NAVIGATION TREE NODES */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1 font-display">Navegación</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <button 
                  onClick={() => setActiveView('vista_general')}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'vista_general' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Vista general</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('sensores')}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'sensores' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Sensores</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('dispositivos')}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'dispositivos' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>Dispositivos</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('ancho_banda')}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'ancho_banda' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Ancho de Banda</span>
                  <span className="ml-auto bg-emerald-500/10 text-emerald-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-emerald-500/20">VIVO</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('testeo')}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'testeo' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Consola de Pruebas</span>
                  <span className="ml-auto bg-cyan-500/10 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">TEST</span>
                </button>
              </li>

              {/* Collapsible Subnet Folder Entry */}
              <li className="pt-2">
                <div 
                  onClick={() => setIsLanTreeOpen(!isLanTreeOpen)}
                  className="w-full text-left py-1.5 px-1 hover:bg-slate-900/30 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer select-none rounded-xs"
                >
                  {isLanTreeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="flex-1 truncate">LAN {subnetSegment}</span>
                  <span className="bg-slate-950 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded-xs border border-slate-850">
                    {sidebarFilteredDevices.length}
                  </span>
                </div>

                {/* Subnet hosts tree details (only showing active ones matching image 4 context!) */}
                {isLanTreeOpen && (
                  <ul className="pl-4 mt-0.5 border-l border-slate-800 list-none space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    {sidebarFilteredDevices.length === 0 ? (
                      <li className="text-[10px] text-slate-600 py-1 italic px-1">Sin hosts cargados.</li>
                    ) : (
                      sidebarFilteredDevices.map(d => {
                        let dotColor = 'bg-slate-700';
                        if (d.estado === 'OK') dotColor = 'bg-emerald-500';
                        else if (d.estado === 'Advertencia') dotColor = 'bg-amber-500';
                        else if (d.estado === 'Caído') dotColor = 'bg-rose-500';

                        return (
                          <li key={d.id}>
                            <button
                              onClick={() => setSelectedDevice(d)}
                              className="w-full text-left py-1 px-1.5 hover:bg-slate-900/30 rounded-xs text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-2 truncate"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <span className="truncate">{d.host !== '—' ? `${d.host} (${d.ip})` : d.ip}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            </ul>
          </div>

          {/* ACCESO DESDE CELULAR (From mockup details, bottom left sidebar) */}
          <div className="bg-slate-950 p-3 rounded-md border border-slate-850 mt-auto shadow-inner text-slate-300">
            <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] font-display">
              <Monitor className="h-3.5 w-3.5 text-cyan-400" />
              Acceso desde celular
            </h5>
            <p className="text-[10px] text-slate-500 mt-1">Misma red Wi-Fi que este PC (servidor)</p>
            <div className="mt-2 text-cyan-400 font-mono font-medium truncate select-all">
              http://192.168.1.55:8080
            </div>
            <button 
              onClick={copyCellUrl}
              className="w-full mt-2 bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-300 font-semibold py-1 px-2 rounded-xs border border-slate-800 text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copiedSuccess ? '¡Enlace copiado!' : 'Copiar enlace'}
            </button>
          </div>

          {/* TECHNICAL META PARAMETERS GRID */}
          <div className="border-t border-slate-850 pt-3 text-[10px] space-y-1 text-slate-500 font-mono">
            <div className="flex justify-between">
              <span>Modo:</span>
              <span className="text-slate-400">Servidor (este PC)</span>
            </div>
            <div className="flex justify-between">
              <span>IP local:</span>
              <span className="text-slate-400">192.168.1.55</span>
            </div>
            <div className="flex justify-between">
              <span>Subred:</span>
              <span className="text-slate-400">192.168.1.0/24</span>
            </div>
            <div className="flex justify-between">
              <span>Gateway:</span>
              <span className="text-slate-400">192.168.1.1</span>
            </div>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-4 bg-[#0F172A]">
          
          {/* RENDER CHOSEN COMPONENT PATH */}
          {activeView === 'vista_general' && (
            <div className="space-y-4">
              
              {/* TOP CIRCULAR GAUGES ROW (Matches image 1) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Availability circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    {/* Ring background */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={100 - parseFloat(statsAvailability)}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-100">
                      {statsAvailability === '0%' ? '0%' : statsAvailability.split('.')[0] + '%'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {statsAvailability}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Disponibilidad
                    </div>
                  </div>
                </div>

                {/* Active hosts circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#06b6d4" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={lastScanDone ? 80 : 100}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-100">
                      {counts.ok + counts.advertencia}
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {counts.ok + counts.advertencia}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Hosts Activos
                    </div>
                  </div>
                </div>

                {/* Average latency circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#f59e0b" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={lastScanDone ? 75 : 100}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                      ms
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {statsAvgLatency}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Latencia Media
                    </div>
                  </div>
                </div>

              </div>

              {/* CENTRAL AREA: HISTORICAL CHART AND DETAILS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <HistorialHosts historyData={historyData} />
                </div>
                
                {/* LATEST STATUS PANEL */}
                <div className="lg:col-span-4 bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex flex-col justify-between rounded-md">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display border-b border-slate-850 pb-2 mb-2 flex items-center gap-1.5">
                      <Settings className="h-4 w-4 text-cyan-404 text-cyan-400" />
                      Último Diagnóstico
                    </h3>
                    <div className="space-y-2 mt-2">
                       <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Último escaneo:</span>
                        <span className="font-mono font-medium text-slate-300">
                          {counts.lastScanTime || 'No realizado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Duración:</span>
                        <span className="font-mono font-medium text-slate-300">
                          {counts.scanDuration !== null ? `${counts.scanDuration} segundos` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Frecuencia:</span>
                        <span className="font-mono font-medium text-cyan-400">{selectedInterval}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Estado general:</span>
                        <span className={`px-1.5 py-0.5 rounded-sm font-semibold uppercase font-display text-[9px] ${
                          lastScanDone 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {lastScanDone ? 'Monitoreando' : 'Requiere escaneo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-850 flex items-center gap-2">
                    <div className="p-1 px-1.5 bg-cyan-500/10 text-cyan-400 rounded-sm font-mono text-[9px] border border-cyan-800/30 uppercase tracking-widest font-bold">
                      INFO
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-tight">
                      El escaneo de red simula la latencia local de los hosts usando subprocesos optimizados.
                    </p>
                  </div>
                </div>
              </div>

              {/* BOTTOM BENTO GRID: MAPS & TOP LATENCY TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* TOP LATENCIA */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-3 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-550 text-amber-500" />
                      Top Latencias Activas
                    </h3>
                    <ul className="space-y-2">
                      {devices.filter(d => d.ping !== null).length === 0 ? (
                        <li className="text-center py-6 text-slate-500 text-xs">
                          Inicie un escaneo rápido para ordenar latencias.
                        </li>
                      ) : (
                        devices
                          .filter(d => d.ping !== null)
                          .sort((a, b) => (b.ping || 0) - (a.ping || 0))
                          .slice(0, 4)
                          .map((d, index) => (
                            <li 
                              key={d.id} 
                              onClick={() => setSelectedDevice(d)}
                              className="flex items-center justify-between p-2 rounded-xs bg-slate-950/40 border border-slate-855 hover:border-cyan-500/30 hover:bg-slate-900/50 cursor-pointer text-xs transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-600">#{index+1}</span>
                                <div>
                                  <div className="font-semibold text-slate-300 truncate max-w-[120px]">{d.host}</div>
                                  <div className="font-mono text-[10px] text-cyan-400">{d.ip}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-amber-500">{d.ping} ms</div>
                                <span className="text-[9px] text-amber-600 font-sans">Alto</span>
                              </div>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* DISPOSITIVOS RECIENTES */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-3 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                      <Server className="h-4 w-4 text-cyan-400" />
                      Servidores & Host Encontrados
                    </h3>
                    <ul className="space-y-2">
                      {devices.filter(d => d.estado === 'OK').length === 0 ? (
                        <li className="text-center py-6 text-slate-500 text-xs">
                          Ejecute el escáner para mapear equipos sanos.
                        </li>
                      ) : (
                        devices
                          .filter(d => d.estado === 'OK')
                          .slice(0, 4)
                          .map(d => (
                            <li 
                              key={d.id} 
                              onClick={() => setSelectedDevice(d)}
                              className="flex items-center justify-between p-2 rounded-xs bg-emerald-500/5 border border-emerald-950/20 hover:border-emerald-500/30 hover:bg-[#0F172A] cursor-pointer text-xs transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                                <div>
                                  <div className="font-semibold text-slate-300 truncate max-w-[120px]">{d.host}</div>
                                  <div className="font-mono text-[10px] text-slate-500">{d.ip}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-emerald-400">{d.ping} ms</div>
                                <span className="text-[9px] text-emerald-500 uppercase font-mono tracking-wider font-semibold">Saludable</span>
                              </div>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* SIMULACION MANUAL SETTINGS HELP */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-2 border-b border-slate-850 pb-2 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-slate-500" />
                      Información de Conectividad
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      RedMonitor escanea simultáneamente múltiples sockets utilizando subprocesos ICMP. Para inspeccionar en detalle el estado de cualquier sistema, haz clic en el mapa de subred o navega a la sección de sensores individuales.
                    </p>
                    <div className="bg-[#0B1120] p-2.5 border border-slate-850 rounded-xs mt-3 font-mono text-[10px] leading-tight space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Peticiones:</span>
                        <span className="text-slate-350">Ping ICMP ECHO</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Rango:</span>
                        <span className="text-slate-350">{subnetSegment}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* MAPA DE SUBRED GRID */}
              <div className="w-full">
                <MapSubred devices={devices} onSelectDevice={setSelectedDevice} />
              </div>

            </div>
          )}

          {activeView === 'sensores' && (
            <SensorTable sensors={sensors} isScanning={isScanning} />
          )}

          {activeView === 'dispositivos' && (
            <DeviceTable devices={devices} onSelectDevice={setSelectedDevice} />
          )}

          {activeView === 'ancho_banda' && (
            <BandwidthMonitor 
              devices={devices}
              isScanning={isScanning}
              onSelectDevice={setSelectedDevice}
              onTriggerTraffic={handleTriggerTraffic}
              onResetTraffic={handleResetTraffic}
              trafficGeneratorActive={trafficGeneratorActive}
              bandwidthHistory={bandwidthHistory}
            />
          )}

          {activeView === 'testeo' && (
            <TestingCenter 
              devices={devices} 
              sensors={sensors}
              setDevices={setDevices}
              setSensors={setSensors}
              setHistoryData={setHistoryData}
              subnetSegment={subnetSegment}
              includeVirtuals={includeVirtuals}
            />
          )}

        </main>
      </div>

      {/* FOOTER BAR CHROME (Correct inspired credit line) */}
      <footer className="bg-[#0B1120] border-t border-slate-850 px-4 py-2.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between select-none font-mono z-30">
        <div>
          {isScanning ? (
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin inline" />
              Escaner en curso, barriendo subred... {scanProgress}% completado
            </span>
          ) : lastScanDone ? (
            <span>
              Escaneo completado — <strong className="text-emerald-400">{counts.ok} OK</strong>, <strong className="text-amber-500">{counts.advertencia} Advertencia</strong>, <strong className="text-red-500">{counts.caido} caídos</strong> • Próximo escaneo en: {selectedInterval}
            </span>
          ) : (
            <span>Listo — Esperando primer escaneo de la subred {subnetSegment}...</span>
          )}
        </div>
        <div className="font-sans text-slate-600">
          RedMonitor v1.0 • Inspirado en **PRTG Network Monitor**
        </div>
      </footer>

      {/* FLOAT MODE DIAGNOSTIC MODAL */}
      {selectedDevice && (() => {
        const activeDiagDevice = devices.find(d => d.id === selectedDevice.id) || selectedDevice;
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#0F172A] rounded-xs border border-slate-800 w-full max-w-sm shadow-2xl overflow-hidden font-sans">
              <div className="bg-[#0B1120] text-slate-100 border-b border-slate-850 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wide font-display text-cyan-400 text-left">
                    Diagnóstico de IP: {activeDiagDevice.ip}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="text-slate-500 hover:text-white font-bold text-base cursor-pointer px-1 py-0.5 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                
                {/* Core header of the device state */}
                <div className="bg-slate-950/40 p-3 rounded-xs border border-slate-850/80 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activeDiagDevice.estado === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                    activeDiagDevice.estado === 'Advertencia' ? 'bg-amber-500/10 text-amber-500' :
                    activeDiagDevice.estado === 'Caído' && activeDiagDevice.lastChecked !== null ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-200 text-xs text-left">
                      {activeDiagDevice.host !== '—' ? activeDiagDevice.host : 'Host Inactivo'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono text-left">{activeDiagDevice.ip}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm ${
                      activeDiagDevice.estado === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                      activeDiagDevice.estado === 'Advertencia' ? 'bg-amber-500/10 text-amber-500' :
                      activeDiagDevice.estado === 'Caído' && activeDiagDevice.lastChecked !== null ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {activeDiagDevice.estado === 'No_Escaneado' ? 'Inactivo' : activeDiagDevice.estado}
                    </span>
                  </div>
                </div>

                {/* Diagnostic Parameters Grid */}
                <div className="space-y-2 text-xs">
                  <h5 className="font-semibold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                    PARÁMETROS DEL HOST
                  </h5>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xs border border-slate-850/50 font-mono text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[9px] text-left">MAC ADDRESS</span>
                      <span className="text-slate-200 font-medium font-mono text-left block">{activeDiagDevice.mac}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] text-left">PING LATENCIA</span>
                      <span className={`font-semibold text-left block ${activeDiagDevice.ping ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {activeDiagDevice.ping !== null ? `${activeDiagDevice.ping} ms` : '—'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-500 block text-[9px] text-left">BAJADA/SUBIDA</span>
                      <span className="text-slate-200 block text-left font-semibold">
                        <span className="text-cyan-400">↓{(activeDiagDevice.consumoDownload || 0).toFixed(1)}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-amber-500">↑{(activeDiagDevice.consumoUpload || 0).toFixed(1)}</span>
                        <span className="text-slate-500 text-[9px] ml-1 font-normal font-sans">Mbps</span>
                      </span>
                    </div>
                    <div className="mt-2">
                       <span className="text-slate-500 block text-[9px] text-left">DATO TOTAL</span>
                       <span className="text-emerald-400 font-semibold block text-left">
                         {activeDiagDevice.totalConsumido !== undefined ? `${Math.round(activeDiagDevice.totalConsumido)} MB` : '0 MB'}
                       </span>
                    </div>
                  </div>
                </div>

                {/* Simulated active checkers/sensors list inside diagnostic popup */}
                <div className="space-y-2 text-xs text-slate-300">
                  <h5 className="font-semibold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                    SENSORES INTEGRADOS ({activeDiagDevice.estado === 'No_Escaneado' ? 0 : activeDiagDevice.sensorHttp ? 2 : 1})
                  </h5>
                  {activeDiagDevice.estado === 'No_Escaneado' ? (
                    <p className="text-slate-500 text-[11px] italic font-sans text-left">(Mapeador sin escanear. Inicie un escaneo para activar sensores).</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Ping Sensor row */}
                      <div className="flex items-center justify-between p-2 rounded-xs bg-slate-950/25 border border-slate-850/60 text-slate-300">
                        <div className="text-left">
                          <div className="font-medium text-slate-300 text-left">Sensor Ping ICMP</div>
                          <span className="text-[10px] text-slate-500 font-mono text-left block">Verifica respuesta de eco</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-slate-200">{activeDiagDevice.ping !== null ? `${activeDiagDevice.ping} ms` : 'Falla'}</span>
                          <div className={`text-[9px] uppercase font-bold ${activeDiagDevice.ping !== null ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {activeDiagDevice.ping !== null ? 'Responde' : 'Fuera de red'}
                          </div>
                        </div>
                      </div>

                      {/* HTTP Sensor row if applicable */}
                      {activeDiagDevice.sensorHttp && (
                        <div className="flex items-center justify-between p-2 rounded-xs bg-slate-950/25 border border-slate-855/60 text-slate-300">
                          <div className="text-left">
                            <div className="font-medium text-slate-300 text-left">Sensor Puerto TCP HTTP</div>
                            <span className="text-[10px] text-slate-500 font-mono text-left block">Verifica código 200 en puerto 80</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-semibold text-slate-200">
                              {activeDiagDevice.estado === 'OK' ? '200 OK' : 'No responde'}
                            </span>
                            <div className={`text-[9px] uppercase font-bold ${activeDiagDevice.estado === 'OK' ? 'text-emerald-400' : 'text-amber-550'}`}>
                              {activeDiagDevice.estado === 'OK' ? 'Activo' : 'Advertencia'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal action Buttons footer */}
              <div className="bg-slate-900 px-4 py-3 border-t border-slate-850 flex justify-end gap-2">
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold font-sans py-1.5 px-6 rounded-xs cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
