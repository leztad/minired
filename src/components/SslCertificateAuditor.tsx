import React, { useState, useEffect } from 'react';
import {
  Shield, Lock, AlertTriangle, CheckCircle2, Clock, RefreshCw, Plus,
  Trash2, ExternalLink, Globe, Key, ShieldAlert, Cpu
} from 'lucide-react';

export interface SslAuditResult {
  host: string;
  port: number;
  subjectCn: string;
  sans: string[];
  issuerOrg: string;
  issuerCn: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  isExpired: boolean;
  status: 'valid' | 'expiring_soon' | 'critical_expiring' | 'expired' | 'error';
  protocol: string;
  cipherName: string;
  serialNumber?: string;
  fingerprint256?: string;
  authorized: boolean;
  authorizationError?: string;
  checkedAt: string;
  error?: string;
}

export interface MonitoredSslSite {
  id: string;
  host: string;
  port: number;
  label: string;
  lastAudit?: SslAuditResult;
  lastChecked?: string;
}

export default function SslCertificateAuditor() {
  const [sites, setSites] = useState<MonitoredSslSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditingBatch, setIsAuditingBatch] = useState(false);

  // Quick test state
  const [testHost, setTestHost] = useState('');
  const [testPort, setTestPort] = useState('443');
  const [testResult, setTestResult] = useState<SslAuditResult | null>(null);
  const [isTestingSingle, setIsTestingSingle] = useState(false);

  // Add site form state
  const [newHost, setNewHost] = useState('');
  const [newPort, setNewPort] = useState('443');
  const [newLabel, setNewLabel] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchSites = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ssl/monitored');
      if (res.ok) {
        setSites(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleBatchAudit = async () => {
    setIsAuditingBatch(true);
    try {
      const res = await fetch('/api/ssl/batch-audit', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditingBatch(false);
    }
  };

  const handleTestSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testHost) return;
    setIsTestingSingle(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ssl/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: testHost.trim(), port: Number(testPort) || 443 })
      });
      if (res.ok) {
        setTestResult(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingSingle(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHost) return;
    try {
      const res = await fetch('/api/ssl/monitored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: newHost.trim(), port: Number(newPort) || 443, label: newLabel.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
        setNewHost('');
        setNewLabel('');
        setIsAddOpen(false);
        // Trigger audit on new site
        handleBatchAudit();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('¿Eliminar este host del monitoreo de certificados SSL?')) return;
    try {
      const res = await fetch(`/api/ssl/monitored/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status?: string, days = 0) => {
    switch (status) {
      case 'valid':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Válido ({days} días)
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Por Vencer ({days} días)
          </span>
        );
      case 'critical_expiring':
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status === 'expired' ? 'Expirado' : `Crítico (${days} días)`}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-400 border border-slate-600/40">
            Sin Auditar
          </span>
        );
    }
  };

  return (
    <div id="ssl-audit-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Auditor de Certificados SSL / TLS</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                TLS Criptográfico Nativo
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Supervisión de validez, emisor (CA), cadena de confianza, algoritmo de cifrado y caducidad anticipada de certificados HTTPS en portales y firewalls corporativos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="batch-audit-ssl-btn"
            onClick={handleBatchAudit}
            disabled={isAuditingBatch}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditingBatch ? 'animate-spin' : ''}`} />
            {isAuditingBatch ? 'Auditando...' : 'Auditar Todos'}
          </button>

          <button
            id="add-ssl-site-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Dominio
          </button>
        </div>
      </div>

      {/* Live Certificate Tester */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-emerald-400" />
          Auditoría Instantánea de Host o Dirección IP
        </h3>
        <form onSubmit={handleTestSingle} className="flex flex-col sm:flex-row gap-3">
          <input
            id="ssl-test-host-input"
            type="text"
            placeholder="Dominio o IP (ej. portal.empresa.lan o 192.168.1.254)"
            value={testHost}
            onChange={(e) => setTestHost(e.target.value)}
            required
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            id="ssl-test-port-input"
            type="number"
            placeholder="Puerto"
            value={testPort}
            onChange={(e) => setTestPort(e.target.value)}
            className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            id="ssl-run-single-test-btn"
            type="submit"
            disabled={isTestingSingle}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            {isTestingSingle ? 'Inspeccionando TLS...' : 'Inspeccionar Certificado'}
          </button>
        </form>

        {/* Live Test Result Box */}
        {testResult && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-200">{testResult.host}:{testResult.port}</span>
                {getStatusBadge(testResult.status, testResult.daysRemaining)}
              </div>
              <span className="text-xs font-mono text-slate-400">{testResult.protocol} • {testResult.cipherName}</span>
            </div>

            {testResult.error ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{testResult.error}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <div className="text-slate-500 text-[11px] mb-0.5">Nombre Común (CN)</div>
                  <div className="font-semibold text-slate-200 font-mono">{testResult.subjectCn}</div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <div className="text-slate-500 text-[11px] mb-0.5">Autoridad Emisora (CA)</div>
                  <div className="font-semibold text-slate-200">{testResult.issuerOrg}</div>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/60">
                  <div className="text-slate-500 text-[11px] mb-0.5">Caducidad (Vence)</div>
                  <div className="font-semibold text-slate-200 font-mono">
                    {new Date(testResult.validTo).toLocaleDateString()} ({testResult.daysRemaining} días restantes)
                  </div>
                </div>
                {testResult.sans && testResult.sans.length > 0 && (
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/60 md:col-span-2 lg:col-span-3">
                    <div className="text-slate-500 text-[11px] mb-1">Nombres Alternativos (SANs)</div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                      {testResult.sans.map((san, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {san}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monitored Sites List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Servicios & Sitios Web Monitoreados</h3>
          <span className="text-xs text-slate-400">{sites.length} servicios registrados</span>
        </div>

        <div className="divide-y divide-slate-800">
          {sites.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hay sitios registrados en la lista de auditoría SSL.
            </div>
          ) : (
            sites.map((site) => (
              <div
                key={site.id}
                id={`monitored-ssl-${site.id}`}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-200">{site.label}</span>
                    <span className="text-xs font-mono text-cyan-400">{site.host}:{site.port}</span>
                    {getStatusBadge(site.lastAudit?.status, site.lastAudit?.daysRemaining)}
                  </div>

                  {site.lastAudit && !site.lastAudit.error && (
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4 pt-1 font-mono">
                      <span>Emisor: {site.lastAudit.issuerOrg}</span>
                      <span>Protocolo: {site.lastAudit.protocol}</span>
                      <span>Vence: {new Date(site.lastAudit.validTo).toLocaleDateString()}</span>
                    </div>
                  )}

                  {site.lastAudit?.error && (
                    <div className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {site.lastAudit.error}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {site.lastChecked && (
                    <span className="text-[11px] text-slate-500">
                      Auditado: {new Date(site.lastChecked).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Eliminar del monitoreo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Site Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Añadir Servicio al Monitoreo SSL
            </h3>

            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre o Etiqueta</label>
                <input
                  type="text"
                  placeholder="Ej. Consola Firewall Fortinet"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Dominio o IP</label>
                  <input
                    type="text"
                    placeholder="vpn.empresa.lan"
                    value={newHost}
                    onChange={(e) => setNewHost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Puerto</label>
                  <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Guardar y Auditar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
