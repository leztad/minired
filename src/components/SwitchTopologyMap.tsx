import React, { useState, useEffect } from 'react';
import { 
  Network, Radio, Server, Wifi, Video, Laptop, Cpu, Shield, 
  RefreshCw, Layers, CheckCircle2, AlertTriangle, ArrowRight, 
  ExternalLink, Download, Search, Info, Sliders, Zap, Lock, Eye
} from 'lucide-react';
import { Device } from '../types';

export interface LldpCdpNeighbor {
  localPortIndex: number;
  localPortName: string;
  protocol: 'LLDP' | 'CDP';
  remoteDeviceId: string;
  remoteDeviceName: string;
  remoteDeviceType: 'switch' | 'router' | 'ap' | 'cctv' | 'server' | 'workstation' | 'printer' | 'other';
  remotePort: string;
  remotePlatform: string;
  remoteIp: string;
  remoteMac?: string;
  capabilities: string[];
  vlanId?: number;
  speedMbps: number;
  duplex: 'Full' | 'Half';
  poeStatus?: 'Delivering' | 'Searching' | 'Disabled' | 'Fault';
  poeWatts?: number;
  mtu?: number;
  lastUpdated: string;
}

export interface SwitchPortDetail {
  portNumber: number;
  portName: string;
  portType: 'RJ45-1G' | 'RJ45-2.5G' | 'SFP-1G' | 'SFP+-10G';
  status: 'up' | 'down' | 'disabled';
  speedMbps: number;
  duplex: 'Full' | 'Half' | 'Auto';
  vlan: number;
  vlanName?: string;
  poeEnabled: boolean;
  poeWattsDelivered?: number;
  connectedNeighbor?: LldpCdpNeighbor;
  rxBytes: number;
  txBytes: number;
  errorsCount: number;
}

export interface SwitchTopologyMapResult {
  switchIp: string;
  switchName: string;
  switchModel: string;
  switchVendor: string;
  chassisId: string;
  totalPorts: number;
  activePortsCount: number;
  poeTotalWattsBudget: number;
  poeConsumedWatts: number;
  discoveryProtocol: 'LLDP + CDP' | 'LLDP' | 'CDP';
  isLiveDiscovery: boolean;
  snmpVersionUsed: string;
  neighbors: LldpCdpNeighbor[];
  ports: SwitchPortDetail[];
  discoveryTimeMs: number;
  sourceNote: string;
}

interface SwitchTopologyMapProps {
  devices: Device[];
  selectedDeviceIp?: string;
  onSelectDevice?: (device: Device) => void;
  onNavigateToSnmp?: (ip: string) => void;
  onAddLog?: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function SwitchTopologyMap({
  devices,
  selectedDeviceIp,
  onSelectDevice,
  onNavigateToSnmp,
  onAddLog
}: SwitchTopologyMapProps) {
  // Filter devices that could be switches or routers
  const switchCandidates = devices.filter(d => 
    d.tipo === 'switch' || 
    d.tipo === 'router' || 
    d.host.toLowerCase().includes('sw') || 
    d.host.toLowerCase().includes('switch') || 
    d.host.toLowerCase().includes('gw') || 
    d.host.toLowerCase().includes('router') ||
    d.vendor?.toLowerCase().includes('cisco') ||
    d.vendor?.toLowerCase().includes('mikrotik') ||
    d.vendor?.toLowerCase().includes('ubiquiti') ||
    d.ip.endsWith('.1') ||
    d.ip.endsWith('.2')
  );

  const defaultIp = selectedDeviceIp || (switchCandidates[0]?.ip || devices[0]?.ip || '192.168.1.2');
  const [switchIp, setSwitchIp] = useState<string>(defaultIp);
  const [community, setCommunity] = useState<string>('public');
  const [version, setVersion] = useState<'1' | '2c' | '3'>('2c');
  const [port, setPort] = useState<number>(161);

  // SNMPv3 configuration state
  const [v3User, setV3User] = useState<string>('snmpadmin');
  const [v3SecurityLevel, setV3SecurityLevel] = useState<'authPriv' | 'authNoPriv' | 'noAuthNoPriv'>('authPriv');
  const [v3AuthProtocol, setV3AuthProtocol] = useState<'sha256' | 'sha' | 'md5'>('sha256');
  const [v3AuthKey, setV3AuthKey] = useState<string>('AuthSecretKey123!');
  const [v3PrivProtocol, setV3PrivProtocol] = useState<'aes' | 'aes256b' | 'des'>('aes');
  const [v3PrivKey, setV3PrivKey] = useState<string>('PrivSecretPass123!');
  const [showV3Config, setShowV3Config] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [topologyData, setTopologyData] = useState<SwitchTopologyMapResult | null>(null);
  const [activeTab, setActiveTab] = useState<'panel_frontal' | 'grafo_topologia' | 'tabla_vecinos'>('panel_frontal');
  const [selectedPort, setSelectedPort] = useState<SwitchPortDetail | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | 'LLDP' | 'CDP'>('ALL');

  useEffect(() => {
    if (selectedDeviceIp && selectedDeviceIp !== switchIp) {
      setSwitchIp(selectedDeviceIp);
    }
  }, [selectedDeviceIp]);

  const discoverTopology = async (ipToQuery = switchIp) => {
    if (!ipToQuery) return;
    setIsLoading(true);

    const matchedDev = devices.find(d => d.ip === ipToQuery);
    const hostHint = matchedDev?.host || '';
    const vendorHint = matchedDev?.vendor || '';

    try {
      const payload: any = {
        switchIp: ipToQuery,
        community,
        version,
        port,
        hostHint,
        vendorHint,
        existingDevices: devices.map(d => ({ ip: d.ip, host: d.host, vendor: d.vendor, tipo: d.tipo }))
      };

      if (version === '3') {
        payload.v3Config = {
          user: v3User,
          securityLevel: v3SecurityLevel,
          authProtocol: v3AuthProtocol,
          authKey: v3AuthKey,
          privProtocol: v3PrivProtocol,
          privKey: v3PrivKey
        };
      }

      const res = await fetch('/api/topology/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
      }

      const data: SwitchTopologyMapResult = await res.json();
      setTopologyData(data);
      // Select port 1 or first connected port by default
      const firstConnected = data.ports.find(p => p.connectedNeighbor) || data.ports[0];
      setSelectedPort(firstConnected || null);

      if (onAddLog) {
        onAddLog(`Descubrimiento Capa 2 (${data.discoveryProtocol}) completado para switch ${data.switchIp} — ${data.neighbors.length} enlaces detectados`, 'success');
      }
    } catch (err: any) {
      console.error("Error discovering switch topology:", err);
      if (onAddLog) {
        onAddLog(`Fallo al descubrir topología LLDP/CDP en ${ipToQuery}: ${err.message}`, 'warning');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    discoverTopology(switchIp);
  }, [switchIp]);

  const handleExportJson = () => {
    if (!topologyData) return;
    const blob = new Blob([JSON.stringify(topologyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topologia_switch_${topologyData.switchIp}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onAddLog) {
      onAddLog(`Exportada topología Capa 2 para ${topologyData.switchIp}`, 'info');
    }
  };

  // Filter neighbors for table
  const filteredNeighbors = (topologyData?.neighbors || []).filter(n => {
    const matchesSearch = 
      n.remoteDeviceId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.remoteIp.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.remotePlatform.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.localPortName.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesProtocol = protocolFilter === 'ALL' || n.protocol === protocolFilter;
    return matchesSearch && matchesProtocol;
  });

  const getDeviceIcon = (tipo: string) => {
    switch (tipo) {
      case 'router': return <Radio className="h-3.5 w-3.5 text-amber-400" />;
      case 'switch': return <Network className="h-3.5 w-3.5 text-cyan-400" />;
      case 'ap': return <Wifi className="h-3.5 w-3.5 text-emerald-400" />;
      case 'cctv': return <Video className="h-3.5 w-3.5 text-purple-400" />;
      case 'server': return <Server className="h-3.5 w-3.5 text-blue-400" />;
      default: return <Laptop className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-100 font-display">
                    Mapeo de Topología de Switches Capa 2
                  </h1>
                  <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider">
                    LLDP & CDP
                  </span>
                  <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider">
                    SNMPv3 USM
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Descubrimiento automático de cableado físico puerto a puerto, paneles frontales de switches y tablas de adyacencia (IEEE 802.1AB & Cisco CDP).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => discoverTopology(switchIp)}
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-cyan-900/30"
              id="btn-discover-lldp"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Descubriendo Enlaces...' : 'Escanear Vecinos LLDP/CDP'}</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={!topologyData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* SWITCH QUERY CONTROLS */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Switch Objetivo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={switchIp}
                onChange={(e) => setSwitchIp(e.target.value)}
                placeholder="192.168.1.2"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setSwitchIp(e.target.value);
                  }
                }}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono max-w-[140px] truncate"
              >
                <option value="">Equipos...</option>
                {devices.map(d => (
                  <option key={d.ip} value={d.ip}>
                    {d.ip} ({d.host !== '—' ? d.host : d.tipo || d.vendor || 'Host'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Protocolo SNMP</label>
            <select
              value={version}
              onChange={(e) => {
                const v = e.target.value as any;
                setVersion(v);
                if (v === '3') setShowV3Config(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
            >
              <option value="2c">SNMP v2c (Community)</option>
              <option value="3">SNMP v3 (USM Cifrado)</option>
              <option value="1">SNMP v1 (Legacy)</option>
            </select>
          </div>

          {version !== '3' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Comunidad</label>
              <input
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="public"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Seguridad v3</label>
              <button
                type="button"
                onClick={() => setShowV3Config(!showV3Config)}
                className="w-full bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-mono flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-indigo-400" />
                  <span>{v3SecurityLevel}</span>
                </span>
                <span className="text-[10px] underline">Configurar</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Puerto UDP</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value) || 161)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            {onNavigateToSnmp && (
              <button
                onClick={() => onNavigateToSnmp(switchIp)}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Telemetría</span>
              </button>
            )}
          </div>
        </div>

        {/* SNMPv3 CONFIGURATION DRAWER (Shown when v3 is active) */}
        {version === '3' && showV3Config && (
          <div className="mt-3 p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Parámetros Criptográficos SNMPv3 (User Security Model - RFC 3414)</span>
              </div>
              <button 
                onClick={() => setShowV3Config(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                Ocultar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Usuario (SecurityName)</label>
                <input
                  type="text"
                  value={v3User}
                  onChange={(e) => setV3User(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Nivel de Seguridad</label>
                <select
                  value={v3SecurityLevel}
                  onChange={(e) => setV3SecurityLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                >
                  <option value="authPriv">authPriv (Autenticación + Cifrado)</option>
                  <option value="authNoPriv">authNoPriv (Solo Autenticación)</option>
                  <option value="noAuthNoPriv">noAuthNoPriv (Sin Auth ni Cifrado)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Protocolo Auth</label>
                <select
                  value={v3AuthProtocol}
                  onChange={(e) => setV3AuthProtocol(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                >
                  <option value="sha256">SHA-256 (Recomendado)</option>
                  <option value="sha">SHA-1</option>
                  <option value="md5">MD5</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Clave Auth</label>
                <input
                  type="password"
                  value={v3AuthKey}
                  onChange={(e) => setV3AuthKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Protocolo Privacy (Cifrado)</label>
                <select
                  value={v3PrivProtocol}
                  onChange={(e) => setV3PrivProtocol(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                >
                  <option value="aes">AES-128 (Estándar)</option>
                  <option value="aes256b">AES-256 (Blumenthal)</option>
                  <option value="des">DES (Legacy)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Clave Cifrado</label>
                <input
                  type="password"
                  value={v3PrivKey}
                  onChange={(e) => setV3PrivKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* SWITCH IDENTITY BANNER */}
        {topologyData && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{topologyData.switchName}</span>
                  <span className="text-slate-400 font-mono text-xs">({topologyData.switchIp})</span>
                  <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700">
                    {topologyData.switchModel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                  <span>Chassis ID: <strong className="text-slate-300">{topologyData.chassisId}</strong></span>
                  <span>•</span>
                  <span>Puertos: <strong className="text-emerald-400">{topologyData.activePortsCount}</strong> de {topologyData.totalPorts} UP</span>
                  <span>•</span>
                  <span>Presupuesto PoE: <strong className="text-amber-400">{topologyData.poeConsumedWatts}W</strong> / {topologyData.poeTotalWattsBudget}W</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                topologyData.isLiveDiscovery 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${topologyData.isLiveDiscovery ? 'bg-emerald-500 animate-ping' : 'bg-cyan-500'}`} />
                {topologyData.isLiveDiscovery ? `EN VIVO (${topologyData.discoveryProtocol})` : 'TOPOLOGÍA ASISTIDA MODELADA'}
              </span>

              {topologyData.snmpVersionUsed.includes('3') && (
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>SNMPv3 Cifrado</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('panel_frontal')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'panel_frontal' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Panel Frontal de Puertos</span>
        </button>

        <button
          onClick={() => setActiveTab('grafo_topologia')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'grafo_topologia' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="h-3.5 w-3.5" />
          <span>Grafo de Conexiones Capa 2</span>
        </button>

        <button
          onClick={() => setActiveTab('tabla_vecinos')}
          className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'tabla_vecinos' 
              ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Tabla de Adyacencias ({topologyData?.neighbors?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: PANEL FRONTAL DEL SWITCH (PATCH PANEL / FACEPLATE VIEW) */}
      {activeTab === 'panel_frontal' && topologyData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* SWITCH FACEPLATE (CHASSIS VISUALIZER) */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 font-display flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Matriz Frontal de Conmutación (24 Puertos RJ-45 + 4 SFP+)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Haga clic en cualquier puerto físico para inspeccionar el cableado y dispositivo adyacente descubierto por LLDP/CDP.
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Link UP
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> PoE Activo
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-600" /> Desconectado
                </span>
              </div>
            </div>

            {/* PHYSICAL SWITCH CHASSIS BOX */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded-lg p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 tracking-wider">MANAGED GIGABIT ETHERNET SWITCH</span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] border border-slate-800 text-cyan-400">PoE+ 802.3at</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">PWR</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-500">SYS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* PORTS GRID */}
              <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center">
                {/* 24 RJ-45 PORTS (TWO ROWS OF 12) */}
                <div className="flex-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/60">
                  <div className="grid grid-cols-12 gap-1.5">
                    {/* Top Row: Ports 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23 */}
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const portNum = (idx * 2) + 1;
                      const portData = topologyData.ports.find(p => p.portNumber === portNum);
                      const isSelected = selectedPort?.portNumber === portNum;
                      const hasNeighbor = Boolean(portData?.connectedNeighbor);
                      const isUp = portData?.status === 'up';

                      return (
                        <button
                          key={`port-${portNum}`}
                          onClick={() => portData && setSelectedPort(portData)}
                          className={`flex flex-col items-center p-1.5 rounded transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-md shadow-cyan-500/20 scale-105' 
                              : isUp 
                              ? 'bg-slate-800/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800' 
                              : 'bg-slate-900/40 border border-slate-800/40 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {portData?.poeWattsDelivered && portData.poeWattsDelivered > 0 ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            ) : null}
                          </div>

                          <div className="w-5 h-5 bg-slate-950 rounded border border-slate-700 flex items-center justify-center text-[9px] font-mono font-bold text-slate-300">
                            {hasNeighbor ? getDeviceIcon(portData!.connectedNeighbor!.remoteDeviceType) : portNum}
                          </div>
                          <span className="text-[8px] font-mono text-slate-400 mt-1">{portNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Row: Ports 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24 */}
                  <div className="grid grid-cols-12 gap-1.5 mt-2">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const portNum = (idx * 2) + 2;
                      const portData = topologyData.ports.find(p => p.portNumber === portNum);
                      const isSelected = selectedPort?.portNumber === portNum;
                      const hasNeighbor = Boolean(portData?.connectedNeighbor);
                      const isUp = portData?.status === 'up';

                      return (
                        <button
                          key={`port-${portNum}`}
                          onClick={() => portData && setSelectedPort(portData)}
                          className={`flex flex-col items-center p-1.5 rounded transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-md shadow-cyan-500/20 scale-105' 
                              : isUp 
                              ? 'bg-slate-800/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800' 
                              : 'bg-slate-900/40 border border-slate-800/40 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {portData?.poeWattsDelivered && portData.poeWattsDelivered > 0 ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            ) : null}
                          </div>

                          <div className="w-5 h-5 bg-slate-950 rounded border border-slate-700 flex items-center justify-center text-[9px] font-mono font-bold text-slate-300">
                            {hasNeighbor ? getDeviceIcon(portData!.connectedNeighbor!.remoteDeviceType) : portNum}
                          </div>
                          <span className="text-[8px] font-mono text-slate-400 mt-1">{portNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 SFP/SFP+ 10G UPLINK PORTS */}
                <div className="bg-slate-900/80 p-2.5 rounded border border-indigo-500/30 flex flex-col justify-between">
                  <div className="text-[8px] font-mono text-indigo-400 font-bold uppercase tracking-wider mb-1 text-center">
                    Uplink SFP+ 10G
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[25, 26, 27, 28].map(pNum => {
                      const portData = topologyData.ports.find(p => p.portNumber === pNum);
                      const isSelected = selectedPort?.portNumber === pNum;
                      const hasNeighbor = Boolean(portData?.connectedNeighbor);
                      const isUp = portData?.status === 'up';

                      return (
                        <button
                          key={`sfp-${pNum}`}
                          onClick={() => portData && setSelectedPort(portData)}
                          className={`flex flex-col items-center p-1.5 rounded transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-500/20 border-2 border-indigo-400 shadow-md shadow-indigo-500/20 scale-105' 
                              : isUp 
                              ? 'bg-slate-800 border border-indigo-500/40 hover:border-indigo-400' 
                              : 'bg-slate-900/40 border border-slate-800 opacity-60'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mb-1 ${isUp ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                          <div className="w-6 h-6 bg-slate-950 border border-indigo-500/50 rounded flex items-center justify-center text-[9px] font-mono font-bold text-indigo-300">
                            {hasNeighbor ? getDeviceIcon(portData!.connectedNeighbor!.remoteDeviceType) : `S${pNum - 24}`}
                          </div>
                          <span className="text-[8px] font-mono text-indigo-300 mt-1">10G</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK LEGEND */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-amber-400" /> Router / Gateway
                </span>
                <span className="flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-cyan-400" /> Switch / Bridge
                </span>
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" /> Access Point
                </span>
                <span className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-purple-400" /> Cámara IP / NVR
                </span>
                <span className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-blue-400" /> Servidor / NAS
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                Total Enlaces Físicos: <strong>{topologyData.neighbors.length}</strong>
              </span>
            </div>
          </div>

          {/* PORT INSPECTOR CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200 font-display">
                  Inspector de Puerto Físico
                </h3>
              </div>
              {selectedPort && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedPort.status === 'up' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {selectedPort.status.toUpperCase()}
                </span>
              )}
            </div>

            {selectedPort ? (
              <div className="space-y-4">
                {/* PORT HEADER */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">Nombre de Interfaz</span>
                      <h4 className="text-sm font-bold text-cyan-400 font-mono">{selectedPort.portName}</h4>
                    </div>
                    <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-800">
                      Puerto #{selectedPort.portNumber} ({selectedPort.portType})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Velocidad Negociada:</span>
                      <strong className="text-slate-200">{selectedPort.speedMbps} Mbps {selectedPort.duplex}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">VLAN Asignada:</span>
                      <strong className="text-cyan-300">VLAN {selectedPort.vlan} ({selectedPort.vlanName || 'ACCESS'})</strong>
                    </div>
                  </div>

                  {selectedPort.poeEnabled && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> PoE 802.3at Entregado:
                      </span>
                      <strong className="text-amber-300">{selectedPort.poeWattsDelivered || 0} Watts</strong>
                    </div>
                  )}
                </div>

                {/* CONNECTED NEIGHBOR DETAIL */}
                {selectedPort.connectedNeighbor ? (
                  <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider flex items-center gap-1.5">
                        <Radio className="h-3 w-3" />
                        Dispositivo Vecino (Anuncio {selectedPort.connectedNeighbor.protocol})
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        selectedPort.connectedNeighbor.protocol === 'LLDP'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {selectedPort.connectedNeighbor.protocol}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(selectedPort.connectedNeighbor.remoteDeviceType)}
                        <h4 className="text-sm font-bold text-slate-100 truncate">
                          {selectedPort.connectedNeighbor.remoteDeviceName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        IP: <strong className="text-slate-200">{selectedPort.connectedNeighbor.remoteIp}</strong>
                      </p>
                    </div>

                    <div className="space-y-1 text-xs font-mono text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Puerto Remoto:</span>
                        <strong className="text-slate-200">{selectedPort.connectedNeighbor.remotePort}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plataforma / Modelo:</span>
                        <span className="text-slate-300 text-right truncate max-w-[160px]">{selectedPort.connectedNeighbor.remotePlatform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capacidades:</span>
                        <span className="text-emerald-400 text-right">{selectedPort.connectedNeighbor.capabilities.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {onNavigateToSnmp && selectedPort.connectedNeighbor.remoteIp.includes('.') && (
                        <button
                          onClick={() => onNavigateToSnmp(selectedPort.connectedNeighbor!.remoteIp)}
                          className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Cpu className="h-3 w-3" />
                          <span>Ver Telemetría SNMP del Vecino</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-6 text-center space-y-2">
                    <Info className="h-6 w-6 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">
                      No se detectaron adyacencias LLDP ni CDP en este puerto.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      El puerto puede estar desconectado o el dispositivo final (PC, impresora) no tiene activo el protocolo LLDP/CDP.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Seleccione un puerto de la matriz frontal para ver sus propiedades.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GRAFO DE CONEXIONES CAPA 2 (VISUAL NETWORK WIRING) */}
      {activeTab === 'grafo_topologia' && topologyData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 font-display flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-400" />
                <span>Grafo de Cableado Físico Capa 2 (Centro de Conmutación)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualización de enlaces físicos ascendentes (Trunk/Uplink), puntos de acceso, servidores y terminales conectados al switch.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
              {topologyData.neighbors.length} Enlaces Mapeados
            </span>
          </div>

          {/* DIAGRAM CANVAS */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[380px] flex flex-col justify-between">
            {/* CENTRAL SWITCH NODE */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-xl p-4 text-center max-w-sm shadow-xl shadow-cyan-950/40 space-y-1 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Switch Central
                </div>
                <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold font-display text-sm mt-1">
                  <Network className="h-5 w-5" />
                  <span>{topologyData.switchName}</span>
                </div>
                <p className="text-xs font-mono text-slate-300">{topologyData.switchIp} • {topologyData.switchModel}</p>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800 flex justify-center gap-3">
                  <span>Chassis: {topologyData.chassisId}</span>
                  <span>{topologyData.activePortsCount} Puertos Activos</span>
                </div>
              </div>
            </div>

            {/* NEIGHBOR NODES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topologyData.neighbors.map((neighbor, idx) => (
                <div 
                  key={`wire-${idx}`}
                  className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-lg p-3 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800/60 pb-1.5">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {neighbor.localPortName}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-300">{neighbor.remotePort}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      {getDeviceIcon(neighbor.remoteDeviceType)}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{neighbor.remoteDeviceName}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{neighbor.remoteIp}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/40">
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">
                      {neighbor.protocol} • {neighbor.speedMbps >= 1000 ? `${neighbor.speedMbps / 1000}G` : `${neighbor.speedMbps}M`}
                    </span>
                    {neighbor.poeWatts && (
                      <span className="text-amber-400 font-bold">PoE {neighbor.poeWatts}W</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TABLA DE ADYACENCIAS LLDP / CDP */}
      {activeTab === 'tabla_vecinos' && topologyData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar vecino, puerto o IP..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 w-64"
                />
              </div>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                {(['ALL', 'LLDP', 'CDP'] as const).map(proto => (
                  <button
                    key={proto}
                    onClick={() => setProtocolFilter(proto)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      protocolFilter === proto 
                        ? 'bg-cyan-500 text-white font-bold' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {proto === 'ALL' ? 'Todos' : proto}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Mostrando <strong>{filteredNeighbors.length}</strong> de {topologyData.neighbors.length} adyacencias
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Puerto Local</th>
                  <th className="p-2.5">Protocolo</th>
                  <th className="p-2.5">Equipo Vecino</th>
                  <th className="p-2.5">IP de Gestión</th>
                  <th className="p-2.5">Puerto Remoto</th>
                  <th className="p-2.5">Plataforma / Modelo</th>
                  <th className="p-2.5">VLAN</th>
                  <th className="p-2.5">Velocidad / PoE</th>
                  <th className="p-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredNeighbors.map((neighbor, idx) => (
                  <tr key={`table-neighbor-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 font-bold text-cyan-400 whitespace-nowrap">
                      {neighbor.localPortName}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        neighbor.protocol === 'LLDP' 
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {neighbor.protocol}
                      </span>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(neighbor.remoteDeviceType)}
                        <span className="font-bold text-slate-200">{neighbor.remoteDeviceName}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-300 whitespace-nowrap">
                      {neighbor.remoteIp}
                    </td>
                    <td className="p-2.5 text-slate-300 whitespace-nowrap">
                      {neighbor.remotePort}
                    </td>
                    <td className="p-2.5 text-slate-400 truncate max-w-xs">
                      {neighbor.remotePlatform}
                    </td>
                    <td className="p-2.5 text-slate-300 whitespace-nowrap">
                      {neighbor.vlanId ? `VLAN ${neighbor.vlanId}` : '—'}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span>{neighbor.speedMbps >= 1000 ? `${neighbor.speedMbps / 1000} Gbps` : `${neighbor.speedMbps} Mbps`}</span>
                      {neighbor.poeWatts ? (
                        <span className="ml-2 text-amber-400 font-semibold">{neighbor.poeWatts}W</span>
                      ) : null}
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      {onNavigateToSnmp && neighbor.remoteIp.includes('.') && (
                        <button
                          onClick={() => onNavigateToSnmp(neighbor.remoteIp)}
                          className="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border border-cyan-500/30"
                        >
                          SNMP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
