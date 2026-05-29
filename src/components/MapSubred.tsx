import React, { useState, useMemo } from 'react';
import { Device } from '../types';
import { 
  Monitor, Server, Router as RouterIcon, Activity, 
  HelpCircle, Cloud, Wifi, Database, HardDrive, Printer, 
  Tv, Gamepad2, Layers, Network, Radio, HelpCircle as Question, CheckCircle2, AlertTriangle, XCircle, Grid, Cpu
} from 'lucide-react';

interface MapSubredProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
}

interface TopologyNode {
  id: string; // matches device.id or virtual ID
  label: string;
  ip?: string;
  type: 'router' | 'switch' | 'ap' | 'desktop' | 'server' | 'tv' | 'gaming' | 'nas' | 'printer' | 'iot' | 'cloud';
  x: number;
  y: number;
  parent?: string; // id of parent node for wire draw
  linkType?: 'ethernet' | 'fiber' | 'wifi' | 'virtual';
  interfaceName?: string;
}

export default function MapSubred({ devices, onSelectDevice }: MapSubredProps) {
  // Toggle between 'topology' and 'grid'
  const [viewMode, setViewMode] = useState<'topology' | 'grid'>('topology');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredGridId, setHoveredGridId] = useState<string | null>(null);

  // Find current subnet base (e.g. "192.168.1" or "10.0.0")
  const currentSubnetBase = useMemo(() => {
    const sampleDevice = devices.find(d => d.ip && d.ip !== '—');
    if (sampleDevice) {
      const parts = sampleDevice.ip.split('.');
      if (parts.length >= 3) {
        return parts.slice(0, 3).join('.');
      }
    }
    return '192.168.1';
  }, [devices]);

  // Define static coordinates for symmetrical hierarchical tree
  // Width: 920, Height: 410. Symmetrical pivot points.
  const topologyNodes: TopologyNode[] = useMemo(() => {
    const base = currentSubnetBase;
    return [
      // Layer 0: Public Connection
      { id: 'wan', label: 'Internet Público (WAN)', type: 'cloud', x: 430, y: 35 },
      // Layer 1: Core Router
      { 
        id: `${base}.1`, 
        label: 'Router Gateway', 
        ip: `${base}.1`, 
        type: 'router', 
        x: 430, 
        y: 100, 
        parent: 'wan', 
        linkType: 'fiber', 
        interfaceName: 'WAN SFP+ GPON' 
      },
      
      // Layer 2: Distributors / Access Points
      { 
        id: 'ap', 
        label: 'WiFi AP Central', 
        type: 'ap', 
        x: 190, 
        y: 195, 
        parent: `${base}.1`, 
        linkType: 'ethernet', 
        interfaceName: 'ETH Port 2 (PoE)' 
      },
      { 
        id: 'switch', 
        label: 'Switch Principal LAN', 
        type: 'switch', 
        x: 430, 
        y: 195, 
        parent: `${base}.1`, 
        linkType: 'ethernet', 
        interfaceName: 'ETH Port 1 (10G)' 
      },
      { 
        id: `${base}.55`, 
        label: 'DESKTOP-FS211HD (Este PC)', 
        ip: `${base}.55`, 
        type: 'desktop', 
        x: 710, 
        y: 195, 
        parent: 'switch', 
        linkType: 'ethernet', 
        interfaceName: 'Port LAN 4' 
      },

      // Layer 3: Endpoints
      // WiFi clients connected via central AP (centered around AP: 190)
      { 
        id: `${base}.70`, 
        label: 'Alexa-LivingRoom', 
        ip: `${base}.70`, 
        type: 'iot', 
        x: 110, 
        y: 330, 
        parent: 'ap', 
        linkType: 'wifi', 
        interfaceName: 'WLAN Living 5G' 
      },
      { 
        id: `${base}.102`, 
        label: 'Hacienda-IOT-Hub', 
        ip: `${base}.102`, 
        type: 'iot', 
        x: 230, 
        y: 330, 
        parent: 'ap', 
        linkType: 'wifi', 
        interfaceName: 'WLAN IOT 2.4G' 
      },

      // Physical LAN devices connected to Switch (symmetrical centered around Switch: 430)
      { 
        id: `${base}.38`, 
        label: 'Smart-TV LAN', 
        ip: `${base}.38`, 
        type: 'tv', 
        x: 310, 
        y: 330, 
        parent: 'switch', 
        linkType: 'ethernet', 
        interfaceName: 'Port LAN 3' 
      },
      { 
        id: `${base}.40`, 
        label: 'Console-PS5', 
        ip: `${base}.40`, 
        type: 'gaming', 
        x: 395, 
        y: 330, 
        parent: 'switch', 
        linkType: 'ethernet', 
        interfaceName: 'Port LAN 5' 
      },
      { 
        id: `${base}.15`, 
        label: 'NAS-Backup', 
        ip: `${base}.15`, 
        type: 'nas', 
        x: 480, 
        y: 330, 
        parent: 'switch', 
        linkType: 'ethernet', 
        interfaceName: 'Port LAN 6' 
      },
      { 
        id: `${base}.22`, 
        label: 'HP-LaserJet-MFP', 
        ip: `${base}.22`, 
        type: 'printer', 
        x: 565, 
        y: 330, 
        parent: 'switch', 
        linkType: 'ethernet', 
        interfaceName: 'Port LAN 8' 
      },

      // Virtual services hosts inside Desktop PC (symmetrical centered around Desktop: 710)
      { 
        id: `${base}.10`, 
        label: 'DATABASE-PROD (Docker)', 
        ip: `${base}.10`, 
        type: 'server', 
        x: 650, 
        y: 330, 
        parent: `${base}.55`, 
        linkType: 'virtual', 
        interfaceName: 'docker-veth0' 
      },
      { 
        id: `${base}.11`, 
        label: 'WEB-SERVER-01 (Docker)', 
        ip: `${base}.11`, 
        type: 'server', 
        x: 730, 
        y: 330, 
        parent: `${base}.55`, 
        linkType: 'virtual', 
        interfaceName: 'docker-veth1' 
      },
      { 
        id: `${base}.200`, 
        label: 'VM-Ubuntu-Devel', 
        ip: `${base}.200`, 
        type: 'server', 
        x: 810, 
        y: 330, 
        parent: `${base}.55`, 
        linkType: 'virtual', 
        interfaceName: 'vboxnet0' 
      }
    ];
  }, [currentSubnetBase]);

  // Compute upstream diagnostic path to highlight route to server
  const activeUpstreamPath = useMemo(() => {
    if (!hoveredNodeId) return [];
    
    const path: string[] = [];
    let currentId: string | undefined = hoveredNodeId;
    
    while (currentId) {
      path.push(currentId);
      if (currentId === 'wan') break;
      const node = topologyNodes.find(n => n.id === currentId);
      currentId = node?.parent;
    }
    
    return path;
  }, [hoveredNodeId, topologyNodes]);

  // Match node with real physical simulator state
  const getDeviceForNode = (ip?: string) => {
    if (!ip) return null;
    return devices.find(d => d.ip === ip) || null;
  };

  // Render appropriate vector icon
  const renderNodeIcon = (type: string, isDown: boolean, isWarning: boolean) => {
    const iconClass = `h-4.5 w-4.5 ${
      isDown ? 'text-rose-400' : isWarning ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
    }`;
    switch (type) {
      case 'cloud': return <Cloud className="h-5.5 w-5.5 text-sky-400" />;
      case 'router': return <RouterIcon className={iconClass} />;
      case 'switch': return <Layers className={iconClass} />;
      case 'ap': return <Wifi className={iconClass} />;
      case 'desktop': return <Monitor className={iconClass} />;
      case 'server': return <Server className={iconClass} />;
      case 'tv': return <Tv className={iconClass} />;
      case 'gaming': return <Gamepad2 className={iconClass} />;
      case 'nas': return <HardDrive className={iconClass} />;
      case 'printer': return <Printer className={iconClass} />;
      case 'iot': return <Radio className={iconClass} />;
      default: return <Activity className={iconClass} />;
    }
  };

  // Grid generic icon helper
  const getGridIconForHost = (host: string) => {
    const name = host.toLowerCase();
    if (name.includes('router') || name.includes('gateway')) return <RouterIcon className="h-3 w-3" />;
    if (name.includes('server') || name.includes('database')) return <Server className="h-3 w-3" />;
    if (name.includes('desktop') || name.includes('pc')) return <Monitor className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md text-slate-300">
      
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1.5 border-b border-slate-800 pb-2.5">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
            <Network className="h-4 w-4 text-cyan-400" />
            Mapa de Infraestructura y Topología LAN
          </h3>
          <p className="text-[10px] text-slate-500 font-sans hidden sm:block">
            Mapeo interactivo de hosts, enlaces intermedios, switches de distribución y balance físico.
          </p>
        </div>

        {/* CONTROLS TOGGLE */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono hidden md:inline">Vista de Red:</span>
          <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 leading-none text-[11px]">
            <button
              onClick={() => setViewMode('topology')}
              className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                viewMode === 'topology' 
                  ? 'bg-cyan-500 text-slate-950 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Topología Interactiva</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                viewMode === 'grid' 
                  ? 'bg-cyan-500 text-slate-950 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Grilla Subred IP</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEWPORT BOX */}
      {viewMode === 'grid' ? (
        // RENDER: CLASSIC 254 SUB-NET DOT GRID
        <div className="space-y-3">
          <div className="flex gap-2 text-[9.5px] items-center text-slate-500 font-mono flex-wrap justify-end">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> Activo (OK)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span> Advertencia
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span> Alarma / Caído
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-700 inline-block"></span> Hosts Libres
            </span>
          </div>

          <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-18 xl:grid-cols-20 gap-1 overflow-y-auto pr-1">
            {devices.map((device, idx) => {
              const ipIndex = idx + 1;
              let bgColor = 'bg-slate-950/40 text-slate-600 hover:bg-slate-800/80 hover:text-slate-400';
              let borderColor = 'border-slate-800/80';

              if (device.estado === 'OK') {
                bgColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/80 hover:bg-emerald-500/20';
                borderColor = 'border-emerald-500/40';
              } else if (device.estado === 'Advertencia') {
                bgColor = 'bg-amber-500/10 text-amber-400 border-amber-500/80 hover:bg-amber-500/20';
                borderColor = 'border-amber-500/40';
              } else if (device.estado === 'Caído' && device.lastChecked !== null) {
                bgColor = 'bg-rose-500/15 text-rose-400 border-rose-500/80 hover:bg-rose-500/25';
                borderColor = 'border-rose-500/40';
              }

              const isGridHovered = hoveredGridId === device.id;

              return (
                <div
                  key={device.id}
                  className="relative"
                  onMouseEnter={() => setHoveredGridId(device.id)}
                  onMouseLeave={() => setHoveredGridId(null)}
                >
                  <button
                    onClick={() => {
                      if (device.estado !== 'No_Escaneado') onSelectDevice(device);
                    }}
                    className={`w-full aspect-square text-[9px] font-mono font-medium border ${borderColor} ${bgColor} flex flex-col items-center justify-center rounded-xs transition-all duration-150 shadow-xs hover:scale-105 active:scale-95 cursor-pointer`}
                    title={`${device.ip} - ${device.host}`}
                  >
                    <span>.{ipIndex}</span>
                  </button>

                  {/* Tooltip on Hover */}
                  {isGridHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-55 w-48 bg-[#0B1120] text-slate-200 text-[11px] p-2 rounded-sm shadow-xl border border-slate-800 pointer-events-none text-left font-sans">
                      <div className="font-semibold text-cyan-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>IP: {device.ip}</span>
                        {device.host !== '—' && getGridIconForHost(device.host)}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div><span className="text-slate-500">Host:</span> {device.host}</div>
                        {device.mac !== '—' && (
                          <div className="font-mono text-[9.5px]"><span className="text-slate-500 font-sans text-[11px]">MAC:</span> {device.mac}</div>
                        )}
                        <div>
                          <span className="text-slate-500">Estado:</span>{' '}
                          <span className={
                            device.estado === 'OK' ? 'text-emerald-400 font-bold' :
                            device.estado === 'Advertencia' ? 'text-amber-400 font-bold' :
                            device.estado === 'Caído' ? 'text-rose-400 font-bold' : 'text-slate-500 text-[9.5px]'
                          }>
                            {device.estado === 'No_Escaneado' ? 'Libre / Inactivo' : device.estado}
                          </span>
                        </div>
                        {device.ping !== null && (
                          <div className="font-mono text-[10px]"><span className="text-slate-500 font-sans text-[11px]">Latencia:</span> {device.ping} ms</div>
                        )}
                        {device.consumoDownload !== undefined && device.estado !== 'No_Escaneado' && (
                          <div className="text-[10px] font-mono border-t border-slate-850/60 mt-1 pt-1 flex justify-between text-slate-400">
                            <span className="text-cyan-400">↓ {device.consumoDownload} Mb</span>
                            <span className="text-amber-500">↑ {device.consumoUpload} Mb</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0B1120]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // RENDER: GRAPHICAL TOPOLOGY LINK CHART MAP
        <div className="relative border border-slate-850/60 bg-slate-950/20 rounded-md overflow-hidden p-1.5">
          
          {/* Custom style inject tag to run moving light line-dash keyframes */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes linkDashMove {
              to {
                stroke-dashoffset: -40;
              }
            }
            @keyframes alarmFlashGlow {
              0%, 100% {
                transform: scale(1);
                opacity: 0.15;
              }
              50% {
                transform: scale(1.35);
                opacity: 0.55;
              }
            }
            .wire-dash {
              animation: linkDashMove 2s linear infinite;
            }
            .wire-dash-fast {
              animation: linkDashMove 0.75s linear infinite;
            }
            .signal-wave {
              transform-origin: center;
              animation: alarmFlashGlow 2.5s ease-in-out infinite;
            }
          `}} />

          {/* BACKGROUND CHART GRID MESH */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none scale-105 bg-[linear-gradient(rgba(14,165,233,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.15)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

          {/* LIVE NET LEGEND OVERLAY */}
          <div className="absolute top-2 left-2 pointer-events-none hidden md:flex flex-col bg-slate-950/80 border border-slate-850 p-2 rounded text-[9px] font-sans text-slate-450 space-y-1 z-30 select-none">
            <span className="font-bold text-slate-300 border-b border-slate-850 pb-0.75 uppercase">Estándar de Enlaces</span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-sky-200/50 inline-block"></span>
              Fibra Óptica GPON (SFP)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-cyan-500/50 inline-block"></span>
              Cable de Red Cobre (Ethernet)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Inalámbrico (Wi-Fi 2.4/5GHz)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-purple-500/50 inline-block"></span>
              Bridging Virtual Docker / Hypervisor
            </span>
          </div>

          <div className="w-full h-auto overflow-x-auto overflow-y-hidden select-none touch-pan-x">
            {/* SVG STAGE */}
            <svg 
              className="w-full min-w-[860px]" 
              viewBox="0 0 920 410" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              
              {/* === SECTION A: WIRE CONNECTIONS & FLOW LINE TRANSMISSIONS === */}
              {topologyNodes.map(node => {
                if (!node.parent) return null;
                
                const parentNode = topologyNodes.find(n => n.id === node.parent);
                if (!parentNode) return null;

                // Grab dynamic state of target endpoint device
                const device = getDeviceForNode(node.ip);
                const isDown = device ? device.estado === 'Caído' : false;
                const isNoScan = device ? device.estado === 'No_Escaneado' : false;
                const isWarning = device ? device.estado === 'Advertencia' : false;

                // Live speeds mapping
                const dLoad = device ? device.consumoDownload || 0 : 0;
                const uLoad = device ? device.consumoUpload || 0 : 0;
                const heavyTraffic = dLoad > 15 || uLoad > 12;

                // Path highlight check
                const isPathActive = activeUpstreamPath.includes(node.id) && activeUpstreamPath.includes(node.parent);

                // Line Color decision
                let linkColor = 'stroke-slate-800/80';
                let linkThickness = '1.5';
                let isDashed = node.linkType === 'wifi';

                if (isPathActive) {
                  // Focused highlight path on hover
                  linkColor = isWarning ? 'stroke-amber-400' : isDown ? 'stroke-rose-500' : 'stroke-cyan-400';
                  linkThickness = '2.5';
                } else if (!isNoScan && !isDown) {
                  // Default online colors based on wires standard
                  if (node.linkType === 'fiber') {
                    linkColor = 'stroke-sky-300/40';
                    linkThickness = '2';
                  } else if (node.linkType === 'wifi') {
                    linkColor = 'stroke-amber-500/30';
                  } else if (node.linkType === 'virtual') {
                    linkColor = 'stroke-purple-550/30 stroke-purple-500/30';
                    linkThickness = '1.2';
                  } else {
                    linkColor = 'stroke-cyan-600/30';
                  }
                } else if (isDown) {
                  linkColor = 'stroke-rose-950/40';
                } else {
                  linkColor = 'stroke-slate-900';
                }

                return (
                  <g key={`wire-${node.id}`}>
                    {/* Raw connection wire backplane (behind glow) */}
                    <path
                      d={`M ${parentNode.x} ${parentNode.y} L ${node.x} ${node.y}`}
                      className="transition-all duration-300"
                      fill="none"
                      strokeWidth={linkThickness}
                      stroke={
                        isPathActive 
                          ? (isWarning ? '#f59e0b' : isDown ? '#f43f5e' : '#06b6d4')
                          : (node.linkType === 'fiber' ? '#bae6fd' : node.linkType === 'wifi' ? '#f59e0b' : node.linkType === 'virtual' ? '#a855f7' : '#0891b2')
                      }
                      strokeOpacity={isPathActive ? '1.0' : (isNoScan || isDown) ? '0.08' : '0.22'}
                      strokeDasharray={isDashed ? '4,4' : undefined}
                    />

                    {/* INTERACTIVE DATA TRANSACTION GLOW - MOVING PULSES FOR HIGH CONSUMERS */}
                    {(dLoad > 0.05 || uLoad > 0.05) && !isDown && !isNoScan && (
                      <path
                        d={
                          // Flow direction: Upload moves Child -> Parent; Download moves Parent -> Child
                          uLoad > dLoad 
                            ? `M ${node.x} ${node.y} L ${parentNode.x} ${parentNode.y}` 
                            : `M ${parentNode.x} ${parentNode.y} L ${node.x} ${node.y}`
                        }
                        fill="none"
                        stroke={heavyTraffic ? '#e11d48' : isWarning ? '#eab308' : '#22d3ee'}
                        strokeWidth={heavyTraffic ? '3' : '1.8'}
                        strokeOpacity="0.85"
                        strokeDasharray={heavyTraffic ? '10,7' : '6,12'}
                        className={heavyTraffic ? 'wire-dash-fast' : 'wire-dash'}
                      />
                    )}

                    {/* Speed metric tags inside path (hidden unless hovered, or active bandwidth testing) */}
                    {(isPathActive || heavyTraffic) && dLoad > 0.1 && (
                      <foreignObject 
                        x={(node.x + parentNode.x) / 2 - 25} 
                        y={(node.y + parentNode.y) / 2 - 10} 
                        width="50" 
                        height="20"
                        className="overflow-visible select-none pointer-events-none"
                      >
                        <div className={`p-0.5 rounded text-[8px] font-mono leading-none border text-center shadow-md ${
                          heavyTraffic 
                            ? 'bg-rose-950/95 text-rose-300 border-rose-800' 
                            : 'bg-slate-950/95 text-cyan-300 border-slate-800'
                        }`}>
                          ↓{dLoad.toFixed(1)}M
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* === SECTION B: NODES RENDERING == */}
              {topologyNodes.map(node => {
                const device = getDeviceForNode(node.ip);
                
                // Defaults for structural distribution nodes
                let isNoScan = false;
                let isDown = false;
                let isWarning = false;
                let pingVal: number | null = null;

                if (device) {
                  isNoScan = device.estado === 'No_Escaneado';
                  isDown = device.estado === 'Caído';
                  isWarning = device.estado === 'Advertencia';
                  pingVal = device.ping;
                }

                // Check matches for interactive highlights
                const isHovered = hoveredNodeId === node.id;
                const isNodeActive = !isNoScan && !isDown;

                // Color themes for nodes rings
                let ringColor = 'stroke-slate-700';
                let fillColor = 'fill-slate-950';
                let circleBorderClass = 'stroke-[1.5]';

                if (isNodeActive) {
                  ringColor = isWarning ? 'stroke-amber-500' : 'stroke-emerald-500';
                  circleBorderClass = 'stroke-[2]';
                } else if (isDown) {
                  ringColor = 'stroke-rose-600';
                  fillColor = 'fill-[#1c0c10]';
                } else {
                  // Not scanned / offline tree placeholder
                  ringColor = 'stroke-slate-800';
                  circleBorderClass = 'stroke-dashed stroke-[1.5]';
                }

                // Double accent glow for selected or hovered targets
                if (isHovered) {
                  circleBorderClass += ' stroke-[3.5]';
                }

                return (
                  <g 
                    key={`node-${node.id}`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      if (device && !isNoScan) onSelectDevice(device);
                    }}
                    className="cursor-pointer"
                  >
                    {/* INVISIBLE STABLE HOVER TARGET AREA */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="28"
                      fill="transparent"
                      className="cursor-pointer pointer-events-auto"
                    />
                    
                    {/* Pulse glow background circle for warnings/active alarms */}
                    {(isWarning || isHovered) && isNodeActive && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="25"
                        fill="none"
                        stroke={isWarning ? '#f59e0b' : '#06b6d4'}
                        className="signal-wave"
                      />
                    )}

                    {/* Nodes Backplate Card container */}
                    <circle 
                      cx={node.x} 
                      cy={node.y} 
                      r="16" 
                      className={`${circleBorderClass} ${fillColor} ${ringColor} transition-all duration-200`} 
                    />

                    {/* Node Core Vector Icons loaded inside foreign object */}
                    <foreignObject 
                      x={node.x - 9} 
                      y={node.y - 9} 
                      width="18" 
                      height="18"
                      className="pointer-events-none select-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {renderNodeIcon(node.type, isDown, isWarning)}
                      </div>
                    </foreignObject>

                    {/* Offline / Down Crimson Cross overlay */}
                    {isDown && (
                      <path 
                        d={`M ${node.x - 4} ${node.y - 4} L ${node.x + 4} ${node.y + 4} M ${node.x + 4} ${node.y - 4} L ${node.x - 4} ${node.y + 4}`} 
                        stroke="#f43f5e" 
                        strokeWidth="1.8" 
                        strokeLinecap="round" 
                      />
                    )}

                    {/* Host Friendly Name Header Label text block */}
                    <text
                      x={node.x}
                      y={node.y + 27}
                      textAnchor="middle"
                      className={`font-sans font-medium select-none pointer-events-none text-[10px] transition-colors duration-200 ${
                        isHovered ? 'fill-cyan-400 font-semibold' : 'fill-slate-300'
                      }`}
                    >
                      {device && device.host !== '—' 
                        ? device.host 
                        : (isDown 
                            ? 'Segmento Inactivo' 
                            : node.label
                          )
                      }
                    </text>

                    {/* Host Sub-metric or IP details centered below label */}
                    <text
                      x={node.x}
                      y={node.y + 37}
                      textAnchor="middle"
                      className="font-mono text-[8px] fill-slate-500 font-normal select-none pointer-events-none transition-colors"
                    >
                      {device 
                        ? (isNoScan ? 'No Escaneado' : `${device.ip}`)
                        : (node.id === 'wan' ? 'Red WAN' : node.interfaceName || 'Router Local')
                      }
                    </text>

                    {/* Dynamic state pills overlays (small bullet count) */}
                    {isNodeActive && device && device.consumoDownload !== undefined && (device.consumoDownload > 0 || device.consumoUpload > 0) && (
                      <g className="pointer-events-none select-none transition-all duration-200">
                        <circle cx={node.x + 11} cy={node.y - 11} r="5.5" fill="#0891b2" />
                        <text x={node.x + 11} y={node.y - 9} textAnchor="middle" className="fill-[#020617] font-mono text-[7px] font-bold">
                          {device.consumoDownload > 10 ? '!' : 't'}
                        </text>
                      </g>
                    )}

                  </g>
                );
              })}

              {/* === SECTION C: HOVERED NODE TOOLTIP (RENDERED ON TOP) === */}
              {hoveredNodeId && (() => {
                const node = topologyNodes.find(n => n.id === hoveredNodeId);
                if (!node) return null;
                
                const device = getDeviceForNode(node.ip);
                let isNoScan = false;
                let isDown = false;
                let isWarning = false;
                let pingVal: number | null = null;

                if (device) {
                  isNoScan = device.estado === 'No_Escaneado';
                  isDown = device.estado === 'Caído';
                  isWarning = device.estado === 'Advertencia';
                  pingVal = device.ping;
                }

                const isNodeActive = !isNoScan && !isDown;

                return (
                  <foreignObject
                    x={node.x + 22 > 700 ? node.x - 200 : node.x + 22}
                    y={node.y - 45}
                    width="180"
                    height="138"
                    className="overflow-visible select-none pointer-events-none z-50 transition-all"
                  >
                    <div className="bg-[#0B1120] border border-slate-600 text-slate-200 text-[10.5px] p-2 rounded shadow-2xl font-sans text-left space-y-1 select-none pointer-events-none">
                      <div className="font-semibold text-cyan-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span className="truncate max-w-[125px] font-sans">
                          {device && device.host !== '—' 
                            ? device.host 
                            : (isDown 
                                ? 'Segmento Inactivo' 
                                : node.label
                              )
                          }
                        </span>
                        <span className="text-[8.5px] bg-[#1e293b] px-1 rounded text-slate-400 font-mono">
                          {device ? `IPv4` : 'INFRA'}
                        </span>
                      </div>

                      <div className="space-y-0.75 leading-tight">
                        {/* Connection Link Port Info */}
                        {node.interfaceName && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Conexión:</span>{' '}
                            <span className="text-slate-300 font-mono text-[9px]">{node.interfaceName}</span>
                          </div>
                        )}

                        {/* Standard link interfaces */}
                        {node.linkType && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Tecnología:</span>{' '}
                            <span className="text-slate-400 uppercase text-[9px] font-semibold font-sans">
                              {node.linkType === 'fiber' ? '✦ Fibra SFP+' : 
                               node.linkType === 'wifi' ? '📶 WIFI Wireless' : 
                               node.linkType === 'virtual' ? '⚡ Veth Bridge' : '🖧 ethernet RJ45'}
                            </span>
                          </div>
                        )}

                        {/* IP address if device */}
                        {device && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">IP Local:</span>{' '}
                            <span className="text-cyan-400 font-mono font-medium">{device.ip}</span>
                          </div>
                        )}

                        {/* Physical MAC ID */}
                        {device && device.mac !== '—' && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Dirección MAC:</span>{' '}
                            <span className="text-slate-400 font-mono text-[8.5px]">{device.mac}</span>
                          </div>
                        )}

                        {/* Latency Rating */}
                        <div>
                          <span className="text-slate-500 font-medium font-sans">Estado:</span>{' '}
                          <span className={`font-bold font-sans ${
                            isNoScan ? 'text-slate-550' :
                            isDown ? 'text-rose-500' :
                            isWarning ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {isNoScan ? 'No Escaneado' : isDown ? 'ALTA CAÍDA' : isWarning ? 'Advertencia' : 'Operativo (OK)'}
                          </span>
                        </div>

                        {/* Diagnostics Ping Info */}
                        {pingVal !== null && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Latencia:</span>{' '}
                            <span className="text-slate-300 font-mono">{pingVal} ms</span>
                          </div>
                        )}

                        {/* Flow traffic stats */}
                        {device && isNodeActive && device.consumoDownload !== undefined && (
                          <div className="pt-1 border-t border-slate-850 flex justify-between font-mono text-[8.5px] mt-1 text-slate-400">
                            <span className="text-cyan-400 font-sans">Baj:</span> <span className="text-cyan-400 font-mono">{device.consumoDownload} Mbps</span>
                            <span className="text-amber-500 font-sans">Sub:</span> <span className="text-amber-500 font-mono">{device.consumoUpload} Mbps</span>
                          </div>
                        )}
                      </div>
                      
                      {device && isNodeActive && (
                        <div className="text-[8.5px] italic text-[#38bdf8] border-t border-slate-850/60 pt-1 mt-0.5 text-center font-sans">
                          * Haz clic para Diagnóstico Físico & Puertos
                        </div>
                      )}
                    </div>
                  </foreignObject>
                );
              })()}

            </svg>
          </div>
          
          {/* USER INSTRUCTIONS FOOTER */}
          <div className="bg-[#0B1120] border-t border-slate-850/60 p-2.5 flex items-center justify-between text-[10px] text-slate-500 font-sans mt-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
              <span>Posa el cursor sobre un nodo para ver la <strong>ruta de flujo lógico</strong> y estadísticas de enlace.</span>
            </span>
            <span className="italic select-none hidden md:inline">Visual Utility LAN Mapper (BETA)</span>
          </div>

        </div>
      )}

      {/* GLOBAL FOOTER CAPTION */}
      <p className="text-[9.5px] text-slate-500 mt-2 italic font-sans flex items-center gap-1">
        <span>*</span>
        <span>El software grafica interconexiones reales basadas en el protocolo de enlace físico del controlador y el sistema virtual Docker.</span>
      </p>

    </div>
  );
}
