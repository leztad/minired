import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, ShieldCheck, BellOff, Bell, Plus, Trash2,
  AlertCircle, CheckCircle2, RefreshCw, X, Play, ShieldAlert, Cpu
} from 'lucide-react';

export interface MaintenanceWindow {
  id: string;
  name: string;
  targetType: 'global' | 'device' | 'subnet';
  targetValue: string;
  startTime: string;
  endTime: string;
  active: boolean;
  reason: string;
  createdBy: string;
  suppressNotifications: boolean;
}

export interface QuickMute {
  ip: string;
  hostName?: string;
  mutedUntil: string;
  reason: string;
}

export default function MaintenanceWindows() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [quickMutes, setQuickMutes] = useState<QuickMute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick mute form state
  const [quickIp, setQuickIp] = useState('');
  const [quickHost, setQuickHost] = useState('');
  const [quickDuration, setQuickDuration] = useState('60'); // minutes
  const [quickReason, setQuickReason] = useState('Parcheo de seguridad programado');

  // Window form state
  const [formData, setFormData] = useState({
    name: '',
    targetType: 'subnet' as 'global' | 'device' | 'subnet',
    targetValue: '192.168.1.0/24',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    reason: '',
    suppressNotifications: true
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resWin, resMute] = await Promise.all([
        fetch('/api/maintenance/windows'),
        fetch('/api/maintenance/quick-mutes')
      ]);
      if (resWin.ok) setWindows(await resWin.json());
      if (resMute.ok) setQuickMutes(await resMute.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuickMute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIp) return;
    try {
      const res = await fetch('/api/maintenance/quick-mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: quickIp.trim(),
          durationMinutes: Number(quickDuration),
          reason: quickReason,
          hostName: quickHost.trim() || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQuickMutes(data.quickMutes || []);
        setQuickIp('');
        setQuickHost('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveQuickMute = async (ip: string) => {
    try {
      const res = await fetch(`/api/maintenance/quick-mute/${ip}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setQuickMutes(data.quickMutes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newWin: MaintenanceWindow = {
        id: `win-${Date.now()}`,
        name: formData.name,
        targetType: formData.targetType,
        targetValue: formData.targetType === 'global' ? '*' : formData.targetValue,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        active: true,
        reason: formData.reason,
        createdBy: 'Operador RedMonitor',
        suppressNotifications: formData.suppressNotifications
      };

      const res = await fetch('/api/maintenance/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWin)
      });

      if (res.ok) {
        const data = await res.json();
        setWindows(data.windows || []);
        setIsModalOpen(false);
        setFormData({
          name: '',
          targetType: 'subnet',
          targetValue: '192.168.1.0/24',
          startTime: new Date().toISOString().slice(0, 16),
          endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
          reason: '',
          suppressNotifications: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWindow = async (id: string) => {
    if (!confirm('¿Eliminar esta ventana de mantenimiento?')) return;
    try {
      const res = await fetch(`/api/maintenance/windows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setWindows(data.windows || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (win: MaintenanceWindow) => {
    try {
      const updated = { ...win, active: !win.active };
      const res = await fetch('/api/maintenance/windows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const data = await res.json();
        setWindows(data.windows || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="maintenance-windows-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <BellOff className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Ventanas de Mantenimiento & Silenciamiento</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Silenciamiento Inteligente
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Programa paradas de servicio y silencia temporalmente alertas a Telegram, Slack y Discord para evitar falsos positivos durante mantenimientos planificados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-maintenance-btn"
            onClick={fetchData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            Actualizar
          </button>

          <button
            id="open-create-window-btn"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Ventana Programada
          </button>
        </div>
      </div>

      {/* Quick Mute Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-400" />
          Silenciamiento Rápido Inmediato (Quick Mute)
        </h3>
        <form onSubmit={handleCreateQuickMute} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            id="quick-mute-ip"
            type="text"
            placeholder="Dirección IP (ej. 192.168.1.15)"
            value={quickIp}
            onChange={(e) => setQuickIp(e.target.value)}
            required
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <input
            id="quick-mute-host"
            type="text"
            placeholder="Nombre de equipo (Opcional)"
            value={quickHost}
            onChange={(e) => setQuickHost(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <select
            id="quick-mute-duration"
            value={quickDuration}
            onChange={(e) => setQuickDuration(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="30">30 Minutos</option>
            <option value="60">1 Hora</option>
            <option value="120">2 Horas</option>
            <option value="240">4 Horas</option>
            <option value="480">8 Horas</option>
            <option value="1440">24 Horas</option>
          </select>
          <input
            id="quick-mute-reason"
            type="text"
            placeholder="Motivo (ej. Reinicio de switch)"
            value={quickReason}
            onChange={(e) => setQuickReason(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            id="apply-quick-mute-btn"
            type="submit"
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition"
          >
            <BellOff className="w-3.5 h-3.5" />
            Silenciar IP
          </button>
        </form>

        {/* Active Quick Mutes Chips */}
        {quickMutes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Equipos Silenciados Ahora:</span>
            {quickMutes.map((mute) => (
              <span
                key={mute.ip}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300"
              >
                <span className="font-mono font-bold">{mute.ip}</span>
                {mute.hostName && <span className="text-slate-400">({mute.hostName})</span>}
                <span className="text-[11px] text-slate-500">hasta {new Date(mute.mutedUntil).toLocaleTimeString()}</span>
                <button
                  onClick={() => handleRemoveQuickMute(mute.ip)}
                  className="hover:text-rose-400 text-slate-400 transition"
                  title="Restaurar alertas de este equipo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Programmed Windows List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Ventanas de Mantenimiento Programadas</h3>
          </div>
          <span className="text-xs text-slate-400">{windows.length} ventanas registradas</span>
        </div>

        <div className="divide-y divide-slate-800">
          {windows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hay ventanas de mantenimiento configuradas. Haz clic en "Nueva Ventana Programada" para añadir una.
            </div>
          ) : (
            windows.map((win) => {
              const now = Date.now();
              const start = new Date(win.startTime).getTime();
              const end = new Date(win.endTime).getTime();
              const isCurrentlyRunning = win.active && now >= start && now <= end;

              return (
                <div
                  key={win.id}
                  id={`maintenance-window-${win.id}`}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    isCurrentlyRunning ? 'bg-amber-500/5' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-200">{win.name}</span>
                      {isCurrentlyRunning ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          EN CURSO AHORA
                        </span>
                      ) : win.active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Programada
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-400">
                          Desactivada
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {win.targetType.toUpperCase()}: {win.targetValue}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{win.reason || 'Sin justificación especificada.'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                      <span>Inicio: {new Date(win.startTime).toLocaleString()}</span>
                      <span>Fin: {new Date(win.endTime).toLocaleString()}</span>
                      <span className="text-slate-500">Por: {win.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleToggleActive(win)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        win.active
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {win.active ? 'Pausar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => handleDeleteWindow(win.id)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Eliminar ventana"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Nueva Ventana */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Crear Ventana de Mantenimiento
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWindow} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  placeholder="Ej. Parcheo Mensual Switches de Distribución"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Alcance / Objetivo</label>
                  <select
                    value={formData.targetType}
                    onChange={(e: any) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="subnet">Subred Específica</option>
                    <option value="device">Equipo Único (IP)</option>
                    <option value="global">Toda la Red (Global)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Objetivo</label>
                  <input
                    type="text"
                    disabled={formData.targetType === 'global'}
                    value={formData.targetType === 'global' ? '*' : formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="192.168.1.0/24 o 192.168.1.15"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha y Hora de Inicio</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha y Hora de Fin</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motivo / Tareas a Realizar</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Descripción de la intervención física o lógica..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="suppress-notif-check"
                  checked={formData.suppressNotifications}
                  onChange={(e) => setFormData({ ...formData, suppressNotifications: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <label htmlFor="suppress-notif-check" className="text-slate-300 font-medium">
                  Suprimir despachos a canales de notificación (Telegram, Slack, Discord, etc.)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Guardar Ventana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
