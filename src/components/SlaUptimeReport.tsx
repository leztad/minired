import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, XCircle, Download, Printer,
  RefreshCw, TrendingUp, Clock, ShieldCheck, Activity, Award
} from 'lucide-react';
import { Device } from '../types';

export interface ServiceSlaItem {
  id: string;
  name: string;
  ip: string;
  type: string;
  targetSlaPercent: number;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  downtimeMinutes30d: number;
  mttrMinutes: number;
  mtbfHours: number;
  outagesCount30d: number;
  status: 'compliant' | 'at_risk' | 'breached';
  lastIncident?: string;
}

export interface ExecutiveSlaReport {
  generatedAt: string;
  reportPeriod: string;
  organizationName: string;
  auditorName: string;
  overallUptimePercent: number;
  totalServicesMonitored: number;
  compliantCount: number;
  atRiskCount: number;
  breachedCount: number;
  totalOutages: number;
  totalDowntimeMinutes: number;
  services: ServiceSlaItem[];
  executiveSummary: string;
}

interface SlaReportProps {
  devices: Device[];
}

export default function SlaUptimeReport({ devices }: SlaReportProps) {
  const [report, setReport] = useState<ExecutiveSlaReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState('Red Corporativa TI');
  const [auditor, setAuditor] = useState('Asneider Zapata (Admin Red)');

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sla/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices: devices.map(d => ({
            ip: d.ip,
            host: d.host,
            tipo: d.tipo,
            estado: d.estado,
            ping: d.ping
          })),
          organizationName: orgName,
          auditorName: auditor
        })
      });

      if (res.ok) {
        setReport(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [devices.length]);

  const handlePrint = () => {
    window.print();
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = ['Equipo', 'Dirección IP', 'Tipo', 'SLA Objetivo %', 'Uptime 24h %', 'Uptime 7d %', 'Uptime 30d %', 'Minutos Caída (30d)', 'MTTR (min)', 'MTBF (hrs)', 'Estado'];
    const rows = report.services.map(s => [
      `"${s.name}"`,
      s.ip,
      `"${s.type}"`,
      `${s.targetSlaPercent}%`,
      `${s.uptime24h}%`,
      `${s.uptime7d}%`,
      `${s.uptime30d}%`,
      s.downtimeMinutes30d,
      s.mttrMinutes,
      s.mtbfHours,
      s.status.toUpperCase()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_sla_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: 'compliant' | 'at_risk' | 'breached') => {
    switch (status) {
      case 'compliant':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Cumple SLA
          </span>
        );
      case 'at_risk':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" />
            En Riesgo
          </span>
        );
      case 'breached':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" />
            Penalizado
          </span>
        );
    }
  };

  return (
    <div id="sla-report-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">Informes de Cumplimiento de SLA & Disponibilidad</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Auditoría ISO / ITIL Ready
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Cálculo de métricas contractuales de nivel de servicio (99.9% Uptime, MTTR tiempo de recuperación, MTBF tiempo medio entre fallos) y exportación para gerencia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-sla-report-btn"
            onClick={fetchReport}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            Recalcular
          </button>

          <button
            id="export-sla-csv-btn"
            onClick={exportCsv}
            disabled={!report}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar CSV
          </button>

          <button
            id="print-sla-report-btn"
            onClick={handlePrint}
            disabled={!report}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Informe
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Disponibilidad Global (30d)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {report.overallUptimePercent}%
              </div>
              <div className="text-[11px] text-emerald-400">
                Objetivo contratado: 99.90%
              </div>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Equipos en Cumplimiento</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {report.compliantCount} <span className="text-xs font-normal text-slate-400">/ {report.totalServicesMonitored}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {report.atRiskCount} en riesgo • {report.breachedCount} penalizados
              </div>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Tiempo Total Indisponible</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {report.totalDowntimeMinutes} <span className="text-xs font-normal text-slate-400">min</span>
              </div>
              <div className="text-[11px] text-slate-400">
                En {report.totalOutages} eventos de caída acumulados
              </div>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Período Auditado</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-base font-bold text-slate-200 mt-1">
                Últimos 30 Días
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Generado: {new Date(report.generatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Executive Summary Card */}
          <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Dictamen Ejecutivo de la Auditoría
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {report.executiveSummary}
            </p>
          </div>

          {/* Detailed Service Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Desglose de Nivel de Servicio por Equipo</h3>
              <span className="text-xs text-slate-400">{report.services.length} equipos evaluados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-semibold">
                    <th className="p-3.5">EQUIPO / SERVICIO</th>
                    <th className="p-3.5">IP</th>
                    <th className="p-3.5">UPTIME 24H</th>
                    <th className="p-3.5">UPTIME 7D</th>
                    <th className="p-3.5">UPTIME 30D</th>
                    <th className="p-3.5">MTTR RECUP.</th>
                    <th className="p-3.5">MTBF FALLO</th>
                    <th className="p-3.5">ESTADO SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-sans font-semibold text-slate-200">
                        {s.name}
                        <div className="text-[11px] text-slate-500 font-normal">{s.type}</div>
                      </td>
                      <td className="p-3.5 text-cyan-400">{s.ip}</td>
                      <td className="p-3.5 text-slate-300">{s.uptime24h}%</td>
                      <td className="p-3.5 text-slate-300">{s.uptime7d}%</td>
                      <td className="p-3.5 font-bold text-slate-100">{s.uptime30d}%</td>
                      <td className="p-3.5 text-slate-400 font-sans">{s.mttrMinutes} min</td>
                      <td className="p-3.5 text-slate-400 font-sans">{s.mtbfHours} hrs</td>
                      <td className="p-3.5 font-sans">
                        {getStatusBadge(s.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
