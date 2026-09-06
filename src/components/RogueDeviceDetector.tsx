import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, UserCheck, Plus,
  Trash2, RefreshCw, Radio, Search, Laptop, Server, Smartphone, HelpCircle
} from 'lucide-react';
import { Device } from '../types';

export interface ApprovedDevice {
  mac: string;
  hostName: string;
  assignedIp?: string;
  department: string;
  owner: string;
  deviceType: string;
  authorizedAt: string;
  authorizedBy: string;
  notes?: string;
}

export interface RogueFinding {
  mac: string;
  ip: string;
  hostName: string;
  vendor?: string;
  firstSeen: string;
  status: 'unauthorized_rogue' | 'ip_conflict' | 'arp_spoof_suspect' | 'gateway_impersonator';
  severity: 'Critical' | 'Warning' | 'Info';
  details: string;
}

export interface ArpConflictAlert {
  ip: string;
  conflictingMacs: string[];
  hostNames: string[];
  detectedAt: string;
  isGatewayInvolved: boolean;
  actionTaken: string;
}

interface RogueDetectorProps {
  devices: Device[];
}

export default function RogueDeviceDetector({ devices }: RogueDetectorProps) {
  const [activeTab, setActiveTab] = useState<'rogues' | 'conflicts' | 'whitelist'>('rogues');
  const [approvedDevices, setApprovedDevices] = useState<ApprovedDevice[]>([]);
  const [rogueFindings, setRogueFindings] = useState<RogueFinding[]>([]);
  const [arpConflicts, setArpConflicts] = useState<ArpConflictAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Manual Add Whitelist modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    mac: '',
    hostName: '',
    assignedIp: '',
    department: 'Infraestructura TI',
    owner: 'Admin Sistema',
    deviceType: 'Router'
  });

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch approved list
      const resApproved = await fetch('/api/security/approved');
      if (resApproved.ok) {
        const approvedData = await resApproved.json();
        setApprovedDevices(approvedData);
      }

      // 2. Post active devices for security analysis
      const resAnalyze = await fetch('/api/security/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices })
      });

      if (resAnalyze.ok) {
        const analysisData = await resAnalyze.json();
        setRogueFindings(analysisData.rogueDevices || []);
        setArpConflicts(analysisData.arpConflicts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [devices.length]);

  const handleAuthorizeRogue = async (rogue: RogueFinding) => {
    setIsAuthorizing(true);
    try {
      const payload: ApprovedDevice = {
        mac: rogue.mac,
        hostName: rogue.hostName || `Equipo-${rogue.ip}`,
        assignedIp: rogue.ip,
        department: "Dispositivos Autorizados",
        owner: "Operador RedMonitor",
        deviceType: "Host",
        authorizedAt: new Date().toISOString(),
        authorizedBy: "Operador de Red",
        notes: `Autorizado desde panel de detección Rogue (${rogue.vendor || 'Genérico'})`
      };

      const res = await fetch('/api/security/approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await runAnalysis();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleAddManualApproved = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.mac) return;
    try {
      const res = await fetch('/api/security/approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDevice,
          authorizedAt: new Date().toISOString(),
          authorizedBy: "Admin de Red"
        })
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewDevice({
          mac: '',
          hostName: '',
          assignedIp: '',
          department: 'Infraestructura TI',
          owner: 'Admin Sistema',
          deviceType: 'Router'
        });
        await runAnalysis();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveApproved = async (mac: string) => {
    if (!confirm(`¿Eliminar la MAC ${mac} de la Lista Blanca de equipos autorizados?`)) return;
    try {
      const res = await fetch(`/api/security/approved/${encodeURIComponent(mac)}`, { method: 'DELETE' });
      if (res.ok) {
        await runAnalysis();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="rogue-detector-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Seguridad LAN: Detección Rogue & Conflictos ARP</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                Control de Acceso MAC Whitelist
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Identifica dispositivos no autorizados conectados a la infraestructura cableada o WiFi y alerta sobre suplantación de gateway o duplicación de IP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-rogue-analysis-btn"
            onClick={runAnalysis}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
            Re-analizar
          </button>

          <button
            id="open-whitelist-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Autorizar MAC
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          id="tab-rogues"
          onClick={() => setActiveTab('rogues')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'rogues'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Dispositivos Rogue No Autorizados
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-red-400 font-mono">
            {rogueFindings.length}
          </span>
        </button>

        <button
          id="tab-conflicts"
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'conflicts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Conflictos IP / ARP Spoofing
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400 font-mono">
            {arpConflicts.length}
          </span>
        </button>

        <button
          id="tab-whitelist"
          onClick={() => setActiveTab('whitelist')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'whitelist'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Lista Blanca Aprobada (Whitelist)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-emerald-400 font-mono">
            {approvedDevices.length}
          </span>
        </button>
      </div>

      {/* Rogues View */}
      {activeTab === 'rogues' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Equipos Conectados Fuera de la Lista Blanca</h3>
            <span className="text-xs text-slate-400">Total detectados: {rogueFindings.length}</span>
          </div>

          <div className="divide-y divide-slate-800">
            {rogueFindings.length === 0 ? (
              <div className="p-8 text-center text-emerald-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="font-semibold text-sm">¡Perímetro Seguro! No se detectan dispositivos no autorizados.</p>
                <p className="text-xs text-slate-400">Todos los equipos activos en la red corresponden a direcciones MAC aprobadas.</p>
              </div>
            ) : (
              rogueFindings.map((rogue) => (
                <div
                  key={rogue.mac}
                  id={`rogue-row-${rogue.mac.replace(/:/g, '-')}`}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-200">{rogue.hostName}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 font-bold">
                        {rogue.mac}
                      </span>
                      <span className="text-xs font-mono text-cyan-400">{rogue.ip}</span>
                      {rogue.vendor && (
                        <span className="text-xs text-slate-400">({rogue.vendor})</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{rogue.details}</p>
                  </div>

                  <button
                    onClick={() => handleAuthorizeRogue(rogue)}
                    disabled={isAuthorizing}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition self-end md:self-center"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Aprobar en Lista Blanca
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ARP Conflicts View */}
      {activeTab === 'conflicts' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Conflictos de IP y Sospechas de Envenenamiento ARP</h3>
            <span className="text-xs text-slate-400">Total conflictos: {arpConflicts.length}</span>
          </div>

          <div className="divide-y divide-slate-800">
            {arpConflicts.length === 0 ? (
              <div className="p-8 text-center text-emerald-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="font-semibold text-sm">Sin colisiones de IP ni anomalías de tabla ARP.</p>
                <p className="text-xs text-slate-400">No se registran dos direcciones físicas reclamando el mismo direccionamiento lógico.</p>
              </div>
            ) : (
              arpConflicts.map((conflict, idx) => (
                <div key={idx} className="p-5 space-y-2 hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-300">Conflicto en IP: {conflict.ip}</span>
                    {conflict.isGatewayInvolved && (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                        ¡GATEWAY COMPROMETIDO!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{conflict.actionTaken}</p>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 font-mono text-xs">
                    <div className="text-slate-400 text-[11px]">MACs en Colisión:</div>
                    {conflict.conflictingMacs.map((mac, i) => (
                      <div key={i} className="text-slate-300 flex items-center gap-2">
                        <span className="text-amber-400 font-bold">{mac}</span>
                        <span className="text-slate-500">— {conflict.hostNames[i] || 'Desconocido'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Whitelist View */}
      {activeTab === 'whitelist' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Inventario de Direcciones MAC Autorizadas</h3>
            <span className="text-xs text-slate-400">{approvedDevices.length} registrados</span>
          </div>

          <div className="divide-y divide-slate-800">
            {approvedDevices.map((dev) => (
              <div
                key={dev.mac}
                id={`whitelist-item-${dev.mac.replace(/:/g, '-')}`}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-200">{dev.hostName}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{dev.mac}</span>
                    {dev.assignedIp && <span className="font-mono text-slate-400">({dev.assignedIp})</span>}
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {dev.deviceType}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                    <span>Dpto: {dev.department}</span>
                    <span>Responsable: {dev.owner}</span>
                    <span>Autorizado por: {dev.authorizedBy}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveApproved(dev.mac)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition self-end md:self-center"
                  title="Eliminar de la lista blanca"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Manual Whitelist Add */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Autorizar Dispositivo en Lista Blanca
            </h3>

            <form onSubmit={handleAddManualApproved} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dirección MAC</label>
                <input
                  type="text"
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={newDevice.mac}
                  onChange={(e) => setNewDevice({ ...newDevice, mac: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre de Equipo / Hostname</label>
                <input
                  type="text"
                  placeholder="SW-PISO2-HP-2530"
                  value={newDevice.hostName}
                  onChange={(e) => setNewDevice({ ...newDevice, hostName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">IP Asignada (Opcional)</label>
                  <input
                    type="text"
                    placeholder="192.168.1.50"
                    value={newDevice.assignedIp}
                    onChange={(e) => setNewDevice({ ...newDevice, assignedIp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Equipo</label>
                  <select
                    value={newDevice.deviceType}
                    onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Router">Router / Gateway</option>
                    <option value="Switch">Switch Gestionable</option>
                    <option value="Server">Servidor Central</option>
                    <option value="Workstation">Estación de Trabajo</option>
                    <option value="Printer">Impresora de Red</option>
                    <option value="AccessPoint">Punto de Acceso WiFi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Departamento</label>
                  <input
                    type="text"
                    value={newDevice.department}
                    onChange={(e) => setNewDevice({ ...newDevice, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Responsable / Dueño</label>
                  <input
                    type="text"
                    value={newDevice.owner}
                    onChange={(e) => setNewDevice({ ...newDevice, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Guardar en Lista Blanca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
