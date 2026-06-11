import React, { useState, useMemo } from 'react';
import { Device } from '../types';
import { Search, ChevronLeft, ChevronRight, Sliders, Monitor, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { resolveVendorByMac, resolveDeviceNameByMac } from '../utils/macUtils';

interface DeviceTableProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
}

export default function DeviceTable({ devices, onSelectDevice }: DeviceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'Todos' | 'OK' | 'Advertencia' | 'Caído'>('Todos');
  const [hideUnused, setHideUnused] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter logic
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      // If hiding unoccupied / unused IP spaces
      if (hideUnused && d.estado === 'Caído' && (d.host === '—' || d.host === '')) {
        return false;
      }

      // Metric match
      const brandName = d.vendor && d.vendor !== '—' && !d.vendor.toLowerCase().includes('genérico') && !d.vendor.toLowerCase().includes('generico') && d.vendor !== 'Dispositivo de Red Activo'
        ? d.vendor
        : resolveVendorByMac(d.mac, d.host, d.ip);
      const deviceName = resolveDeviceNameByMac(d.mac, d.host, d.ip);
      const matchesSearch = 
        d.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.mac.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedFilter === 'Todos') return true;
      return d.estado === selectedFilter;
    });
  }, [devices, searchTerm, selectedFilter, hideUnused]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / itemsPerPage));
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDevices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDevices, currentPage]);

  // Maintain page safety when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, hideUnused]);

  return (
    <div className="bg-slate-900/50 rounded-md border border-slate-800 shadow-xs overflow-hidden">
      {/* Table Headers & Controls */}
      <div className="p-3 border-b border-slate-800 bg-[#0B1120] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase text-slate-400 font-display">
            Dispositivos Registrados ({filteredDevices.length})
          </h3>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Checkbox to hide unoccupied/unused IP spaces */}
          <label className="flex items-center gap-1.5 text-xs text-slate-450 cursor-pointer select-none border border-slate-800 bg-slate-950 px-2 py-1 rounded hover:text-slate-250 transition-colors">
            <input
              type="checkbox"
              checked={hideUnused}
              onChange={e => setHideUnused(e.target.checked)}
              className="rounded-xs border-slate-800 text-cyan-500 focus:ring-cyan-500 h-3 w-3 bg-slate-950 cursor-pointer accent-cyan-500"
            />
            <span className="text-[11px] font-medium font-sans">Ocultar IPs Libres (Solo Activos)</span>
          </label>

          {/* Tabs resembling mockup buttons */}
          <div className="flex rounded-xs border border-slate-800 p-0.5 bg-slate-950 text-xs text-slate-400">
            {(['Todos', 'OK', 'Advertencia', 'Caído'] as const).map(f => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-2 py-0.5 rounded-sm font-medium transition-all cursor-pointer ${
                  selectedFilter === f
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar IP o host..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-800 rounded-sm focus:outline-hidden focus:ring-1 focus:ring-cyan-500 bg-slate-950 text-slate-200 w-44 font-sans placeholder-slate-600"
            />
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0F172A] text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-display">
              <th className="py-2.5 px-4 w-12"></th>
              <th className="py-2.5 px-3">Host</th>
              <th className="py-2.5 px-3">IP</th>
              <th className="py-2.5 px-3">Fabricante</th>
              <th className="py-2.5 px-3">MAC</th>
              <th className="py-2.5 px-3">Ping</th>
              <th className="py-2.5 px-3 text-right pr-6">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {paginatedDevices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Sin dispositivos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedDevices.map(d => {
                let badgeStyle = 'bg-slate-800 text-slate-500';
                let indicatorColor = 'bg-slate-800 border border-slate-700';
                let pingText = '—';
                let pingColor = 'text-slate-500';

                if (d.estado === 'OK') {
                  badgeStyle = 'bg-emerald-500/10 text-emerald-400 font-semibold';
                  indicatorColor = 'bg-emerald-500/40 border border-emerald-500';
                  pingText = `${d.ping} ms`;
                  pingColor = 'text-emerald-400';
                } else if (d.estado === 'Advertencia') {
                   badgeStyle = 'bg-amber-500/10 text-amber-400 font-semibold';
                   indicatorColor = 'bg-amber-500/40 border border-amber-500';
                   pingText = `${d.ping} ms`;
                   pingColor = 'text-amber-500 font-medium';
                } else if (d.estado === 'Caído' && d.lastChecked !== null) {
                   badgeStyle = 'bg-rose-500/15 text-rose-400 font-semibold';
                   indicatorColor = 'bg-rose-500/40 border border-rose-500';
                   pingText = '—';
                }

                const brandName = d.vendor && d.vendor !== '—' && !d.vendor.toLowerCase().includes('genérico') && !d.vendor.toLowerCase().includes('generico') && d.vendor !== 'Dispositivo de Red Activo' ? d.vendor : resolveVendorByMac(d.mac, d.host, d.ip);

                let brandStyle = 'text-slate-400';
                if (brandName.includes('Hikvision')) brandStyle = 'text-orange-400 font-bold';
                else if (brandName.includes('Dahua')) brandStyle = 'text-yellow-500 font-bold';
                else if (brandName.includes('EZVIZ')) brandStyle = 'text-amber-400 font-bold';
                else if (brandName.includes('Axis')) brandStyle = 'text-emerald-400 font-bold';
                else if (brandName.includes('CCTV') || brandName.includes('Cámara') || brandName.includes('NVR') || brandName.includes('UNV')) brandStyle = 'text-rose-400 font-semibold';
                else if (brandName.includes('Apple')) brandStyle = 'text-sky-400 font-semibold';
                else if (brandName.includes('Samsung')) brandStyle = 'text-blue-400 font-semibold';
                else if (brandName.includes('Sony')) brandStyle = 'text-indigo-400 font-semibold';
                else if (brandName.includes('HP') || brandName.includes('Hewlett')) brandStyle = 'text-rose-400 font-semibold';
                else if (brandName.includes('Huawei')) brandStyle = 'text-red-400 font-semibold';
                else if (brandName.includes('Ubiquiti')) brandStyle = 'text-amber-500 font-semibold';
                else if (brandName.includes('Docker')) brandStyle = 'text-cyan-400 font-semibold';
                else if (brandName.includes('Espressif')) brandStyle = 'text-emerald-400 font-semibold';
                else if (brandName.includes('Synology')) brandStyle = 'text-sky-500 font-semibold';
                else if (brandName.includes('Cisco')) brandStyle = 'text-emerald-400 font-semibold';

                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDevice(d)}
                    className="hover:bg-slate-800/10 cursor-pointer transition-colors border-b border-slate-800/30"
                  >
                    <td className="py-2 px-4">
                      <span className={`w-3.5 h-3.5 rounded-xs ${indicatorColor} inline-block`} />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-300 font-sans max-w-xs truncate">
                      {resolveDeviceNameByMac(d.mac, d.host, d.ip)}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-cyan-400">
                      {d.ip}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`${brandStyle} text-[11px]`}>
                        {brandName}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {d.mac}
                    </td>
                    <td className={`py-2 px-3 font-mono font-semibold ${pingColor}`}>
                      {pingText}
                    </td>
                    <td className="py-2 px-3 text-right pr-6">
                      <span className={`px-2 py-0.5 text-[10px] rounded-sm uppercase tracking-wide inline-block ${badgeStyle}`}>
                        {d.estado === 'No_Escaneado' ? 'Inactivo' : d.estado}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-[#0B1120] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Mostrando <span className="font-semibold text-slate-400">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
            <span className="font-semibold text-slate-400">
              {Math.min(currentPage * itemsPerPage, filteredDevices.length)}
            </span>{' '}
            de <span className="font-semibold text-slate-400">{filteredDevices.length}</span> dispositivos
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-900 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-900 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
