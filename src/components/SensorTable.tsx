import React, { useState, useMemo } from 'react';
import { Sensor } from '../types';
import { Search, Activity, Heart, ShieldAlert, Cpu } from 'lucide-react';

interface SensorTableProps {
  sensors: Sensor[];
  isScanning: boolean;
}

export default function SensorTable({ sensors, isScanning }: SensorTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | 'OK' | 'Advertencia' | 'Caído'>('Todos');

  const filteredSensors = useMemo(() => {
    return sensors.filter(s => {
      const matchesSearch =
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.dispositivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ip.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedStatus === 'Todos') return true;
      return s.estado === selectedStatus;
    });
  }, [sensors, searchTerm, selectedStatus]);

  if (sensors.length === 0) {
    return (
      <div className="bg-slate-900/50 p-12 rounded-md border border-slate-800 text-center flex flex-col items-center justify-center">
        <Activity className={`h-12 w-12 text-cyan-400 mb-3 ${isScanning ? 'animate-spin' : ''}`} />
        <h3 className="font-semibold text-slate-300 text-sm font-display">No hay sensores cargados</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Ejecute un escaneo para crear sensores Ping, HTTP y verificadores de estado activos en la LAN.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-md border border-slate-800 shadow-xs overflow-hidden">
      {/* Search Header */}
      <div className="p-3 bg-[#0B1120] border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase text-slate-400 font-display">
            Monitoreo de Sensores Activos ({filteredSensors.length})
          </h3>
        </div>

        {/* Dynamic Filters matches Mockup */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mockup filter buttons */}
          <div className="flex border border-slate-800 rounded-xs p-0.5 bg-slate-950 text-xs text-slate-400">
            {(['Todos', 'OK', 'Advertencia', 'Caído'] as const).map(f => (
              <button
                key={f}
                onClick={() => setSelectedStatus(f)}
                className={`px-2.5 py-0.5 rounded-sm font-medium transition-all cursor-pointer ${
                  selectedStatus === f
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar sensor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-800 rounded-sm focus:outline-hidden focus:ring-1 focus:ring-cyan-500 bg-slate-950 text-slate-200 w-44 font-sans placeholder-slate-600"
            />
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Sensor Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0F172A] text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-display">
              <th className="py-2.5 px-4">Sensor</th>
              <th className="py-2.5 px-3">Dispositivo</th>
              <th className="py-2.5 px-3 font-mono">Último valor</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3 text-center">Intervalo</th>
              <th className="py-2.5 px-3 text-right pr-4">Última comprobación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {filteredSensors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  Sin sensores en esta categoría.
                </td>
              </tr>
            ) : (
              filteredSensors.map(s => {
                let statusBadge = 'bg-slate-800 text-slate-500';
                if (s.estado === 'OK') statusBadge = 'bg-emerald-500/10 text-emerald-400 font-semibold';
                else if (s.estado === 'Advertencia') statusBadge = 'bg-amber-500/10 text-amber-400 font-semibold';
                else if (s.estado === 'Caído') statusBadge = 'bg-rose-500/15 text-rose-400 font-semibold';

                return (
                  <tr key={s.id} className="hover:bg-slate-800/10 cursor-pointer transition-colors border-b border-slate-800/30">
                    <td className="py-2.5 px-4 font-semibold text-cyan-400 font-mono">
                      {s.nombre}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-medium">
                      {s.dispositivo} <span className="text-[10px] bg-cyan-950/45 text-cyan-400 border border-cyan-800/40 px-1.5 py-0.5 rounded font-mono ml-1.5 font-semibold inline-flex items-center select-all">{s.ip}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                      {s.ultimoValor}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wide rounded-sm ${statusBadge}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {s.intervalo}
                    </td>
                    <td className="py-2.5 px-3 text-right pr-4 font-mono text-slate-500 text-[11px]">
                      {s.ultimaComprobacion}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
