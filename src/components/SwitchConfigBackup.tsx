import React, { useState, useEffect } from 'react';
import {
  Server, GitCompare, History, FileText, Download, Plus, Trash2,
  RefreshCw, CheckCircle2, ShieldCheck, ArrowRight, Copy, Check, Upload
} from 'lucide-react';

export interface ConfigRevision {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  sha256: string;
  lineCount: number;
  configText: string;
  changeSummary: string;
}

export interface SwitchBackupDevice {
  id: string;
  name: string;
  ip: string;
  vendor: 'Cisco' | 'MikroTik' | 'Ubiquiti' | 'Aruba' | 'Fortinet' | 'Generic';
  model: string;
  location: string;
  lastBackupDate: string;
  revisions: ConfigRevision[];
}

export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface ConfigDiffResult {
  deviceA: string;
  revisionA: string;
  revisionB: string;
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  identical: boolean;
}

export default function SwitchConfigBackup() {
  const [switches, setSwitches] = useState<SwitchBackupDevice[]>([]);
  const [selectedSwitchId, setSelectedSwitchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'revisions' | 'diff' | 'raw'>('revisions');
  const [isLoading, setIsLoading] = useState(false);

  // Diff selection
  const [revOldId, setRevOldId] = useState<string>('');
  const [revNewId, setRevNewId] = useState<string>('');
  const [diffResult, setDiffResult] = useState<ConfigDiffResult | null>(null);
  const [isDiffLoading, setIsDiffLoading] = useState(false);

  // New revision form
  const [isNewRevModalOpen, setIsNewRevModalOpen] = useState(false);
  const [newRevText, setNewRevText] = useState('');
  const [newRevAuthor, setNewRevAuthor] = useState('Asneider Zapata');
  const [newRevSummary, setNewRevSummary] = useState('');
  const [newRevLabel, setNewRevLabel] = useState('');

  // New device form
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState(false);
  const [newDeviceData, setNewDeviceData] = useState({
    name: '',
    ip: '',
    vendor: 'Cisco' as SwitchBackupDevice['vendor'],
    model: '',
    location: 'Datacenter Principal',
    initialConfig: ''
  });

  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const fetchSwitches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/configs/switches');
      if (res.ok) {
        const data: SwitchBackupDevice[] = await res.json();
        setSwitches(data);
        if (data.length > 0 && !selectedSwitchId) {
          setSelectedSwitchId(data[0].id);
          if (data[0].revisions.length >= 2) {
            setRevOldId(data[0].revisions[1].id);
            setRevNewId(data[0].revisions[0].id);
          } else if (data[0].revisions.length === 1) {
            setRevOldId(data[0].revisions[0].id);
            setRevNewId(data[0].revisions[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSwitches();
  }, []);

  const selectedSwitch = switches.find(s => s.id === selectedSwitchId);

  // When selected switch changes, adjust diff dropdown defaults
  useEffect(() => {
    if (selectedSwitch && selectedSwitch.revisions.length > 0) {
      if (selectedSwitch.revisions.length >= 2) {
        setRevOldId(selectedSwitch.revisions[1].id);
        setRevNewId(selectedSwitch.revisions[0].id);
      } else {
        setRevOldId(selectedSwitch.revisions[0].id);
        setRevNewId(selectedSwitch.revisions[0].id);
      }
    }
  }, [selectedSwitchId]);

  const handleComputeDiff = async () => {
    if (!selectedSwitch) return;
    const oldRev = selectedSwitch.revisions.find(r => r.id === revOldId);
    const newRev = selectedSwitch.revisions.find(r => r.id === revNewId);
    if (!oldRev || !newRev) return;

    setIsDiffLoading(true);
    try {
      const res = await fetch('/api/configs/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldText: oldRev.configText,
          newText: newRev.configText
        })
      });
      if (res.ok) {
        const result = await res.json();
        setDiffResult(result);
        setActiveTab('diff');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiffLoading(false);
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwitchId || !newRevText) return;
    try {
      const res = await fetch('/api/configs/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedSwitchId,
          configText: newRevText,
          author: newRevAuthor,
          changeSummary: newRevSummary,
          versionLabel: newRevLabel || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSwitches(data.devices || []);
        setIsNewRevModalOpen(false);
        setNewRevText('');
        setNewRevSummary('');
        setNewRevLabel('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceData.name || !newDeviceData.ip) return;
    try {
      const res = await fetch('/api/configs/switches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: {
            id: `switch-${Date.now()}`,
            name: newDeviceData.name,
            ip: newDeviceData.ip,
            vendor: newDeviceData.vendor,
            model: newDeviceData.model || `${newDeviceData.vendor} Switch`,
            location: newDeviceData.location
          },
          initialConfig: newDeviceData.initialConfig || `! Configuracion inicial ${newDeviceData.name}\nhostname ${newDeviceData.name}\n`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSwitches(data.devices || []);
        setIsNewDeviceModalOpen(false);
        setNewDeviceData({
          name: '',
          ip: '',
          vendor: 'Cisco',
          model: '',
          location: 'Datacenter Principal',
          initialConfig: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const handleDownloadConfig = (rev: ConfigRevision) => {
    const blob = new Blob([rev.configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSwitch?.name || 'switch'}_${rev.version.replace(/\s+/g, '_')}.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="switch-config-backup-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Respaldos de Configuración de Switches & Diff</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Control de Versiones & SHA-256
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Repositorio de archivos running-config (Cisco, MikroTik, Ubiquiti, Fortinet, Aruba), auditoría de cambios y comparador visual de diferencias (*Diff*).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-switch-configs-btn"
            onClick={fetchSwitches}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            Actualizar
          </button>

          <button
            id="register-new-switch-btn"
            onClick={() => setIsNewDeviceModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar Switch
          </button>

          <button
            id="new-backup-revision-btn"
            onClick={() => setIsNewRevModalOpen(true)}
            disabled={!selectedSwitch}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-sm disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Guardar Respaldo
          </button>
        </div>
      </div>

      {/* Switch Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">Conmutador Activo:</span>
          <select
            id="switch-selector"
            value={selectedSwitchId}
            onChange={(e) => setSelectedSwitchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
          >
            {switches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ip}) — {s.vendor}
              </option>
            ))}
          </select>
        </div>

        {selectedSwitch && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
            <span>Modelo: <strong className="text-slate-200">{selectedSwitch.model}</strong></span>
            <span>Ubicación: <strong className="text-slate-200">{selectedSwitch.location}</strong></span>
            <span>Revisiones: <strong className="text-purple-400">{selectedSwitch.revisions.length}</strong></span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          id="tab-revisions"
          onClick={() => setActiveTab('revisions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'revisions'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Versiones
        </button>

        <button
          id="tab-diff"
          onClick={() => {
            setActiveTab('diff');
            if (!diffResult) handleComputeDiff();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'diff'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          Comparador Visual (Diff)
        </button>

        <button
          id="tab-raw"
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'raw'
              ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ver Configuración Cruda
        </button>
      </div>

      {/* Tab 1: Revisions History */}
      {activeTab === 'revisions' && selectedSwitch && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Revisiones Respaldadas de {selectedSwitch.name}</h3>
            <span className="text-xs text-slate-400">Total: {selectedSwitch.revisions.length} respaldos</span>
          </div>

          <div className="divide-y divide-slate-800">
            {selectedSwitch.revisions.map((rev, index) => (
              <div
                key={rev.id}
                id={`revision-item-${rev.id}`}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-200 font-mono">{rev.version}</span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        VERSIÓN ACTIVA
                      </span>
                    )}
                    <span className="text-slate-500">{new Date(rev.timestamp).toLocaleString()}</span>
                  </div>

                  <p className="text-slate-300">{rev.changeSummary}</p>

                  <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono text-[11px] pt-1">
                    <span>Autor: <strong className="text-slate-300">{rev.author}</strong></span>
                    <span>Líneas: {rev.lineCount}</span>
                    <span className="flex items-center gap-1.5">
                      SHA-256: {rev.sha256.slice(0, 16)}...
                      <button
                        onClick={() => handleCopySha(rev.sha256)}
                        className="hover:text-cyan-400 transition"
                        title="Copiar hash completo"
                      >
                        {copiedSha === rev.sha256 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleDownloadConfig(rev)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .cfg
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Visual Diff */}
      {activeTab === 'diff' && selectedSwitch && (
        <div className="space-y-4">
          {/* Diff Selector Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">Comparar:</span>
              <select
                id="diff-old-rev"
                value={revOldId}
                onChange={(e) => setRevOldId(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {selectedSwitch.revisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.version} ({new Date(r.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>

              <ArrowRight className="w-4 h-4 text-slate-500" />

              <select
                id="diff-new-rev"
                value={revNewId}
                onChange={(e) => setRevNewId(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {selectedSwitch.revisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.version} ({new Date(r.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>

              <button
                id="run-diff-btn"
                onClick={handleComputeDiff}
                disabled={isDiffLoading}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition"
              >
                {isDiffLoading ? 'Calculando...' : 'Comparar'}
              </button>
            </div>

            {diffResult && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400 font-bold">+{diffResult.addedCount} añadidos</span>
                <span className="text-rose-400 font-bold">-{diffResult.removedCount} eliminados</span>
              </div>
            )}
          </div>

          {/* Diff Output Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs max-h-[600px] overflow-y-auto">
            {diffResult && diffResult.lines.length > 0 ? (
              <div className="divide-y divide-slate-900">
                {diffResult.lines.map((line, idx) => {
                  let bg = 'hover:bg-slate-900/50 text-slate-300';
                  let symbol = ' ';
                  if (line.type === 'added') {
                    bg = 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/40';
                    symbol = '+';
                  } else if (line.type === 'removed') {
                    bg = 'bg-rose-950/30 text-rose-300 hover:bg-rose-950/40';
                    symbol = '-';
                  }

                  return (
                    <div key={idx} className={`p-1.5 px-3 flex items-start gap-4 ${bg}`}>
                      <div className="w-12 text-slate-600 select-none text-[11px] text-right flex-shrink-0">
                        {line.type === 'added' ? line.newLineNumber : line.oldLineNumber}
                      </div>
                      <div className="w-4 select-none font-bold text-center flex-shrink-0">
                        {symbol}
                      </div>
                      <div className="flex-1 whitespace-pre-wrap break-all">
                        {line.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Selecciona dos revisiones y haz clic en "Comparar" para ver los cambios.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Raw Text */}
      {activeTab === 'raw' && selectedSwitch && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-[600px] overflow-y-auto whitespace-pre-wrap">
          {selectedSwitch.revisions[0]?.configText || 'Sin configuración disponible.'}
        </div>
      )}

      {/* Modal New Revision */}
      {isNewRevModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Guardar Nueva Revisión de Running-Config
            </h3>

            <form onSubmit={handleCreateRevision} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Autor</label>
                  <input
                    type="text"
                    value={newRevAuthor}
                    onChange={(e) => setNewRevAuthor(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Etiqueta de Versión (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. v1.2 (Post-mantenimiento)"
                    value={newRevLabel}
                    onChange={(e) => setNewRevLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Resumen del Cambio / Motivo</label>
                <input
                  type="text"
                  placeholder="Ej. Creación de VLAN 50 y asignación de puertos PoE"
                  value={newRevSummary}
                  onChange={(e) => setNewRevSummary(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Texto de la Configuración (Pegar o Editar)</label>
                <textarea
                  rows={10}
                  value={newRevText}
                  onChange={(e) => setNewRevText(e.target.value)}
                  placeholder="Pegar la salida de 'show running-config' o exportación .cfg aquí..."
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRevModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold"
                >
                  Almacenar Respaldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal New Device */}
      {isNewDeviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Registrar Nuevo Switch en el Repositorio
            </h3>

            <form onSubmit={handleRegisterDevice} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre de Switch</label>
                  <input
                    type="text"
                    placeholder="SW-DIST-PISO3"
                    value={newDeviceData.name}
                    onChange={(e) => setNewDeviceData({ ...newDeviceData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dirección IP</label>
                  <input
                    type="text"
                    placeholder="192.168.1.3"
                    value={newDeviceData.ip}
                    onChange={(e) => setNewDeviceData({ ...newDeviceData, ip: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fabricante</label>
                  <select
                    value={newDeviceData.vendor}
                    onChange={(e: any) => setNewDeviceData({ ...newDeviceData, vendor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Cisco">Cisco IOS</option>
                    <option value="MikroTik">MikroTik RouterOS</option>
                    <option value="Ubiquiti">Ubiquiti Edge/UniFi</option>
                    <option value="Aruba">HP Aruba</option>
                    <option value="Fortinet">Fortinet FortiGate</option>
                    <option value="Generic">Genérico / Linux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Catalyst 2960X"
                    value={newDeviceData.model}
                    onChange={(e) => setNewDeviceData({ ...newDeviceData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ubicación Física</label>
                <input
                  type="text"
                  value={newDeviceData.location}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold"
                >
                  Registrar Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
