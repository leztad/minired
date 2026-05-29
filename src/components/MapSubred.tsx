import React, { useState } from 'react';
import { Device } from '../types';
import { Monitor, Server, Router, Activity, HelpCircle } from 'lucide-react';

interface MapSubredProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
}

export default function MapSubred({ devices, onSelectDevice }: MapSubredProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group devices or search them
  const getIconForHost = (host: string) => {
    const name = host.toLowerCase();
    if (name.includes('router') || name.includes('gateway')) return <Router className="h-3 w-3" />;
    if (name.includes('server') || name.includes('database')) return <Server className="h-3 w-3" />;
    if (name.includes('desktop') || name.includes('pc')) return <Monitor className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md text-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-cyan-400" />
          Mapa de Subred (254 Hosts)
        </h3>
        <div className="flex gap-2 text-[10px] items-center text-slate-500 font-mono flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span> Advertencia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span> Caído
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-700 inline-block"></span> Inactivo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-18 xl:grid-cols-20 gap-1 resize-y max-h-[280px] overflow-y-auto pr-1">
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

          const isHovered = hoveredId === device.id;

          return (
            <div
              key={device.id}
              className="relative"
              onMouseEnter={() => setHoveredId(device.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => onSelectDevice(device)}
                className={`w-full aspect-square text-[9px] font-mono font-medium border ${borderColor} ${bgColor} flex flex-col items-center justify-center rounded-xs transition-all duration-150 shadow-xs hover:scale-105 active:scale-95 cursor-pointer`}
                title={`${device.ip} - ${device.host}`}
              >
                <span>.{ipIndex}</span>
              </button>

              {/* Tooltip on Hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-55 w-44 bg-[#0B1120] text-slate-200 text-[11px] p-2 rounded-sm shadow-xl border border-slate-800 pointer-events-none">
                  <div className="font-semibold text-cyan-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>IP: {device.ip}</span>
                    {device.host !== '—' && getIconForHost(device.host)}
                  </div>
                  <div className="mt-1 space-y-0.5 font-sans">
                    <div><span className="text-slate-500">Host:</span> {device.host}</div>
                    {device.mac !== '—' && (
                      <div><span className="text-slate-500">MAC:</span> {device.mac}</div>
                    )}
                    <div>
                      <span className="text-slate-500">Estado:</span>{' '}
                      <span className={
                        device.estado === 'OK' ? 'text-emerald-400' :
                        device.estado === 'Advertencia' ? 'text-amber-400' :
                        'text-rose-400'
                      }>
                        {device.estado}
                      </span>
                    </div>
                    {device.ping !== null && (
                      <div><span className="text-slate-500">Ping:</span> {device.ping} ms</div>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0B1120]"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 mt-2 italic font-sans">
        * Haz clic en cualquier celda para inspeccionar los sensores locales y ver diagnósticos avanzados en tiempo real.
      </p>
    </div>
  );
}
