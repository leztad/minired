import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ShieldAlert, CheckCircle2, AlertTriangle, Download, 
  Copy, RefreshCw, Sliders, Server, Cpu, Activity, 
  CheckSquare, ArrowRight, Sparkles, Brain, Lock, Terminal, 
  Layers, ChevronRight, ChevronDown, Award, Trash2,
  Calendar, Check, ShieldCheck, HelpCircle, HardDrive
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Device, DetailedNetworkReport, VulnerabilityItem, OptimizationStep, NetworkRecommendation, VulnerabilitySeverity } from '../types';
import { generateDetailedNetworkReport } from '../utils/reportGenerator';
import { asyncGetItem, asyncSetItem } from '../utils/storageUtils';

interface NetworkDetailedReportsProps {
  devices: Device[];
  locationName: string;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  currentUser?: { username: string; fullName: string; role: string } | null;
}

export default function NetworkDetailedReports({
  devices,
  locationName,
  onAddLog,
  currentUser
}: NetworkDetailedReportsProps) {
  // Navigation tabs inside the reports module
  const [activeTab, setActiveTab] = useState<'resumen' | 'vulnerabilidades' | 'recomendaciones' | 'plan' | 'historial'>('resumen');

  // Report configuration options
  const [reportTitle, setReportTitle] = useState('Informe Integral de Estado, Vulnerabilidades y Optimización de Red');
  const [organization, setOrganization] = useState('Corporación & Telecomunicaciones');
  const [location, setLocation] = useState(locationName || 'Sede Principal LAN');
  const [auditorName, setAuditorName] = useState(currentUser?.fullName || 'Auditor Técnico de Red');
  const [scope, setScope] = useState<'integral' | 'ciberseguridad' | 'rendimiento'>('integral');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Active Report State
  const [currentReport, setCurrentReport] = useState<DetailedNetworkReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiEnriching, setIsAiEnriching] = useState(false);
  const [aiNotes, setAiNotes] = useState<string>('');
  const [copiedMd, setCopiedMd] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'csv' | 'json' | null>(null);

  // Vulnerabilities Filter
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [expandedVulnId, setExpandedVulnId] = useState<string | null>(null);

  // Historical Reports
  const [savedReports, setSavedReports] = useState<DetailedNetworkReport[]>([]);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<DetailedNetworkReport | null>(null);

  // Action Plan Checklist (persisted IDs of completed steps)
  const [completedStepIds, setCompletedStepIds] = useState<Record<string, boolean>>({});

  // Unique segments from active devices
  const availableSegments = useMemo(() => {
    const set = new Set<string>();
    devices.forEach(d => {
      if (d.segmento) set.add(d.segmento);
    });
    return Array.from(set);
  }, [devices]);

  // Load saved reports and completed steps on mount
  useEffect(() => {
    asyncGetItem<DetailedNetworkReport[]>('redmonitor_detailed_reports', []).then(stored => {
      if (stored && Array.isArray(stored)) {
        setSavedReports(stored);
      }
    }).catch(err => console.error("Error reading stored reports:", err));

    asyncGetItem<Record<string, boolean>>('redmonitor_optimization_steps', {}).then(steps => {
      if (steps) {
        setCompletedStepIds(steps);
      }
    }).catch(err => console.error("Error reading stored steps:", err));
  }, []);

  // Generate initial report on first render or when devices update if no report exists
  useEffect(() => {
    if (!currentReport && devices.length > 0) {
      handleGenerateReport();
    }
  }, [devices]);

  // Core generator function
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 250)); // smooth visual feedback

    const rep = generateDetailedNetworkReport(devices, {
      title: reportTitle,
      organization,
      location: location || locationName,
      auditor: auditorName,
      scope,
      segmentFilter: selectedSegment
    });

    // Merge completed state from persistent memory
    rep.planOptimizacion = rep.planOptimizacion.map(step => ({
      ...step,
      completado: !!completedStepIds[step.id]
    }));

    setCurrentReport(rep);
    setIsGenerating(false);
    onAddLog(`📋 Nuevo informe técnico de red compilado exitosamente (${rep.vulnerabilidades.length} vulnerabilidades, Score: ${rep.scoreSaludRed}%).`, 'info');
  };

  // Toggle optimization step
  const toggleStepCompletion = async (stepId: string) => {
    const updated = {
      ...completedStepIds,
      [stepId]: !completedStepIds[stepId]
    };
    setCompletedStepIds(updated);
    await asyncSetItem('redmonitor_optimization_steps', updated);

    if (currentReport) {
      setCurrentReport({
        ...currentReport,
        planOptimizacion: currentReport.planOptimizacion.map(s => 
          s.id === stepId ? { ...s, completado: !s.completado } : s
        )
      });
    }

    onAddLog(`✅ Paso de optimización ${stepId} marcado como ${updated[stepId] ? 'COMPLETADO' : 'PENDIENTE'}.`, 'success');
  };

  // Save current report to persistent history
  const handleSaveReportToHistory = async () => {
    if (!currentReport) return;
    try {
      const updated = [currentReport, ...savedReports.filter(r => r.id !== currentReport.id)];
      setSavedReports(updated);
      await asyncSetItem('redmonitor_detailed_reports', updated);
      onAddLog(`💾 Informe "${currentReport.titulo}" guardado en el archivo histórico persistente.`, 'success');
    } catch (e) {
      console.error(e);
      onAddLog(`❌ Error al guardar el informe en memoria local.`, 'error');
    }
  };

  // Delete from history
  const handleDeleteReport = async (id: string) => {
    try {
      const updated = savedReports.filter(r => r.id !== id);
      setSavedReports(updated);
      await asyncSetItem('redmonitor_detailed_reports', updated);
      if (selectedHistoryReport?.id === id) {
        setSelectedHistoryReport(null);
      }
      onAddLog(`🗑️ Informe histórico eliminado.`, 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // AI enrichment via backend /api/diagnose
  const handleEnrichWithAI = async () => {
    if (isAiEnriching || !currentReport) return;
    setIsAiEnriching(true);
    onAddLog("🧠 Solicitando análisis heurístico/AI en profundidad para el informe...", "info");

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices: devices.slice(0, 30),
          activeAnomaly: 'none',
          subnet: selectedSegment !== 'all' ? selectedSegment : '192.168.1.0/24',
          useLocalHeuristics: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setAiNotes(data.report);
          onAddLog("✨ Análisis de IA incorporado exitosamente al informe actual.", "success");
        }
      } else {
        onAddLog("⚠️ No fue posible consultar el servicio de IA. Se preserva el diagnóstico heurístico estándar.", "warning");
      }
    } catch (err) {
      console.error("AI enrichment error:", err);
      onAddLog("⚠️ Fallo en conexión con el motor de IA. Se mantiene el análisis local.", "warning");
    } finally {
      setIsAiEnriching(false);
    }
  };

  // Progress of optimization plan
  const planProgress = useMemo(() => {
    if (!currentReport || currentReport.planOptimizacion.length === 0) return 0;
    const completed = currentReport.planOptimizacion.filter(s => s.completado).length;
    return Math.round((completed / currentReport.planOptimizacion.length) * 100);
  }, [currentReport]);

  // Filtered vulnerabilities
  const filteredVulnerabilities = useMemo(() => {
    if (!currentReport) return [];
    if (selectedSeverityFilter === 'all') return currentReport.vulnerabilidades;
    return currentReport.vulnerabilidades.filter(v => v.severidad === selectedSeverityFilter);
  }, [currentReport, selectedSeverityFilter]);

  // Export 1: Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!currentReport) return;

    let md = `# ${currentReport.titulo}
**Fecha:** ${currentReport.fechaGeneracion}  
**Organización:** ${currentReport.organizacion} | **Ubicación:** ${currentReport.ubicacion}  
**Auditor:** ${currentReport.auditor} | **Alcance:** ${currentReport.alcance.toUpperCase()}  

---

## 1. RESUMEN EJECUTIVO & KPIs
- **Puntuación de Salud de Red:** **${currentReport.scoreSaludRed}/100** (*${currentReport.rangoSalud.toUpperCase()}*)
- **Total de Dispositivos:** ${currentReport.totalDispositivos} (Óptimos: ${currentReport.dispositivosOk} | Advertencias: ${currentReport.dispositivosAdvertencia} | Caídos: ${currentReport.dispositivosCaidos})
- **Latencia Promedio:** ${currentReport.latenciaPromedio} ms (Máxima: ${currentReport.latenciaMaxima} ms | Jitter: ${currentReport.jitterEstimado} ms)
- **Vulnerabilidades Identificadas:** ${currentReport.vulnerabilidades.length} hallazgos

${currentReport.resumenEjecutivo}

---

## 2. MATRIZ DE VULNERABILIDADES DETECTADAS
| ID | Severidad | Categoría | Afectado | Descripción | Remediación Sugerida |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

    currentReport.vulnerabilidades.forEach(v => {
      md += `| \`${v.id}\` | **${v.severidad.toUpperCase()}** | ${v.categoria} | \`${v.ipAfectada}\` (${v.dispositivoAfectado}) | ${v.descripcion.replace(/\n/g, ' ')} | ${v.remediacionSugerida.replace(/\n/g, ' ')} |\n`;
    });

    md += `\n---

## 3. RECOMENDACIONES DE OPTIMIZACIÓN Y HARDENING
`;
    currentReport.recomendaciones.forEach(r => {
      md += `### [${r.area}] ${r.titulo}
- **Descripción:** ${r.descripcion}
- **Beneficio Clave:** ${r.beneficioClave}
- **Dificultad:** ${r.dificultad} ${r.normaEstandar ? `| **Estándar:** ${r.normaEstandar}` : ''}
${r.ejemploConfiguracion ? `\`\`\`bash\n${r.ejemploConfiguracion}\n\`\`\`\n` : ''}\n`;
    });

    md += `---

## 4. PLAN DE ACCIÓN Y PASOS A SEGUIR
`;
    currentReport.planOptimizacion.forEach(step => {
      md += `- [${step.completado ? 'x' : ' '}] **(${step.fase.replace('_', ' ').toUpperCase()}) ${step.titulo}**
  - Prioridad: ${step.prioridad.toUpperCase()} | Impacto: ${step.impacto.toUpperCase()} | Esfuerzo: ${step.esfuerzo.toUpperCase()}
  - ${step.descripcion}
  ${step.comandoSugerido ? `  - Comando: \`${step.comandoSugerido}\`` : ''}\n`;
    });

    md += `\n---
## 5. CONCLUSIONES
`;
    currentReport.conclusiones.forEach(c => {
      md += `- ${c}\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2200);
    onAddLog("📋 Informe en formato Markdown copiado al portapapeles del sistema.", "success");
  };

  // Export 2: CSV Data
  const handleExportCSV = () => {
    if (!currentReport) return;
    setIsExporting('csv');

    let csv = "data:text/csv;charset=utf-8,";
    csv += "Tipo_Registro,ID,Titulo_Nombre,Severidad_Prioridad,Categoria_Area,Afectado,Descripcion_Detalle,Accion_Remediacion\r\n";

    // Add vulnerabilities
    currentReport.vulnerabilidades.forEach(v => {
      csv += `"VULNERABILIDAD","${v.id}","${v.titulo.replace(/"/g, '""')}","${v.severidad.toUpperCase()}","${v.categoria}","${v.ipAfectada} (${v.dispositivoAfectado.replace(/"/g, '""')})","${v.descripcion.replace(/"/g, '""')}","${v.remediacionSugerida.replace(/"/g, '""')}"\r\n`;
    });

    // Add recommendations
    currentReport.recomendaciones.forEach(r => {
      csv += `"RECOMENDACION","${r.id}","${r.titulo.replace(/"/g, '""')}","Dificultad: ${r.dificultad}","${r.area}","Infraestructura General","${r.descripcion.replace(/"/g, '""')}","${r.beneficioClave.replace(/"/g, '""')}"\r\n`;
    });

    // Add plan steps
    currentReport.planOptimizacion.forEach(p => {
      csv += `"PLAN_PASO","${p.id}","${p.titulo.replace(/"/g, '""')}","${p.prioridad.toUpperCase()}","${p.fase}","Estado: ${p.completado ? 'COMPLETADO' : 'PENDIENTE'}","${p.descripcion.replace(/"/g, '""')}","${(p.comandoSugerido || '').replace(/"/g, '""')}"\r\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `informe_red_${currentReport.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(null);
    onAddLog("📊 Matriz de informe y optimización exportada a CSV.", "success");
  };

  // Export 3: JSON
  const handleExportJSON = () => {
    if (!currentReport) return;
    const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_red_${currentReport.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onAddLog("🗄️ Informe completo exportado en formato JSON.", "success");
  };

  // Export 4: PDF High-Quality Document
  const handleExportPDF = async () => {
    if (!currentReport) return;
    setIsExporting('pdf');
    onAddLog("📄 Compilando Informe Ejecutivo y Técnico en formato PDF oficial...", "info");
    await new Promise(r => setTimeout(r, 60));

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 14;

      // Colors
      const darkColor = [11, 17, 32];
      const cyanColor = [6, 182, 212];
      const redColor = [225, 29, 72];
      const amberColor = [217, 119, 6];
      const greenColor = [16, 185, 129];
      const slateColor = [71, 85, 105];

      // Top decorative bar
      doc.setFillColor(cyanColor[0], cyanColor[1], cyanColor[2]);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(currentReport.titulo, 14, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
      doc.text(`AUDITORÍA Y REPORTE DE RED LAN | FECHA: ${currentReport.fechaGeneracion} | ID: ${currentReport.id}`, 14, y + 12);

      // Header Meta Box
      y += 18;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, pageWidth - 28, 18, 'FD');

      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text("Organización:", 18, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(currentReport.organizacion, 42, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.text("Ubicación / Sede:", 18, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(currentReport.ubicacion, 48, y + 13);

      doc.setFont('helvetica', 'bold');
      doc.text("Auditor:", 115, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(currentReport.auditor, 130, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.text("Score de Salud:", 115, y + 13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        currentReport.scoreSaludRed >= 80 ? greenColor[0] : currentReport.scoreSaludRed >= 60 ? amberColor[0] : redColor[0],
        currentReport.scoreSaludRed >= 80 ? greenColor[1] : currentReport.scoreSaludRed >= 60 ? amberColor[1] : redColor[1],
        currentReport.scoreSaludRed >= 80 ? greenColor[2] : currentReport.scoreSaludRed >= 60 ? amberColor[2] : redColor[2]
      );
      doc.text(`${currentReport.scoreSaludRed}/100 (${currentReport.rangoSalud.toUpperCase()})`, 144, y + 13);

      // Section: Resumen Ejecutivo
      y += 24;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("1. Resumen Ejecutivo y Métricas de Infraestructura", 14, y);

      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const splitSummary = doc.splitTextToSize(currentReport.resumenEjecutivo, pageWidth - 28);
      doc.text(splitSummary, 14, y);
      y += splitSummary.length * 3.8 + 4;

      // KPIs Box Grid (4 boxes)
      const boxW = (pageWidth - 28 - 9) / 4;
      const kpis = [
        { label: "DISPOSITIVOS ACTIVOS", val: `${currentReport.totalDispositivos}`, sub: `${currentReport.dispositivosOk} OK / ${currentReport.dispositivosCaidos} Caídos` },
        { label: "LATENCIA MEDIA", val: `${currentReport.latenciaPromedio} ms`, sub: `Máx: ${currentReport.latenciaMaxima} ms | Jitter: ${currentReport.jitterEstimado} ms` },
        { label: "VULNERABILIDADES", val: `${currentReport.vulnerabilidades.length}`, sub: `${currentReport.vulnerabilidades.filter(v => v.severidad === 'critica').length} Críticas | ${currentReport.vulnerabilidades.filter(v => v.severidad === 'alta').length} Altas` },
        { label: "PROGRESO PLAN", val: `${planProgress}%`, sub: `${currentReport.planOptimizacion.filter(s => s.completado).length} de ${currentReport.planOptimizacion.length} Pasos` }
      ];

      kpis.forEach((kpi, idx) => {
        const bx = 14 + idx * (boxW + 3);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(bx, y, boxW, 16, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text(kpi.label, bx + 3, y + 4.5);

        doc.setFontSize(11);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(kpi.val, bx + 3, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text(kpi.sub, bx + 3, y + 14);
      });

      y += 22;

      // Section 2: Vulnerabilities Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("2. Matriz de Vulnerabilidades y Riesgos Identificados", 14, y);

      y += 5;
      // Table Header
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("ID", 17, y + 4.5);
      doc.text("SEVERIDAD", 35, y + 4.5);
      doc.text("AFECTADO / IP", 60, y + 4.5);
      doc.text("HALLAZGO & VECTOR DE RIESGO", 100, y + 4.5);
      doc.text("ACCIÓN CORRECTIVA", 155, y + 4.5);

      y += 6.5;

      currentReport.vulnerabilidades.slice(0, 6).forEach((v, index) => {
        // Page break if needed
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 15;
        }

        const bg = index % 2 === 0 ? 255 : 248;
        doc.setFillColor(bg, bg, bg);
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, y, pageWidth - 28, 12, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(v.id, 17, y + 5);

        // Severity tag
        const sevColor = v.severidad === 'critica' ? redColor : v.severidad === 'alta' ? [234, 88, 12] : amberColor;
        doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
        doc.text(v.severidad.toUpperCase(), 35, y + 5);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(v.ipAfectada, 60, y + 5);
        doc.setFontSize(5.5);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text((v.dispositivoAfectado || '').substring(0, 22), 60, y + 9);

        // Description
        doc.setFontSize(6);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        const shortDesc = doc.splitTextToSize(v.titulo, 52);
        doc.text(shortDesc, 100, y + 4.5);

        // Remediation
        doc.setFontSize(5.5);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        const shortRem = doc.splitTextToSize(v.remediacionSugerida, 38);
        doc.text(shortRem.slice(0, 2), 155, y + 4.5);

        y += 12;
      });

      // Section 3: Strategic Recommendations
      y += 8;
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("3. Recomendaciones Técnicas de Hardening y Arquitectura", 14, y);

      y += 5;
      currentReport.recomendaciones.slice(0, 4).forEach((r) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 15;
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, y, pageWidth - 28, 14, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(cyanColor[0], cyanColor[1], cyanColor[2]);
        doc.text(`[${r.area.toUpperCase()}]`, 18, y + 5);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(r.titulo, 55, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        const splitDesc = doc.splitTextToSize(r.descripcion, pageWidth - 36);
        doc.text(splitDesc.slice(0, 2), 18, y + 9);

        y += 16;
      });

      // Section 4: Optimization Plan (Next page)
      doc.addPage();
      y = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("4. Plan de Acción y Hoja de Ruta para Optimización", 14, y);

      y += 5;
      currentReport.planOptimizacion.forEach((step) => {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 15;
        }

        doc.setFillColor(step.completado ? 240 : 255, step.completado ? 253 : 255, step.completado ? 244 : 255);
        doc.setDrawColor(step.completado ? 187 : 226, step.completado ? 247 : 232, step.completado ? 208 : 240);
        doc.rect(14, y, pageWidth - 28, 13, 'FD');

        // Checkbox representation
        doc.setDrawColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.rect(18, y + 4, 4, 4);
        if (step.completado) {
          doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.rect(19, y + 5, 2, 2, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(`${step.id} - ${step.titulo}`, 26, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text(`Fase: ${step.fase.replace('_', ' ').toUpperCase()} | Prioridad: ${step.prioridad.toUpperCase()} | Impacto: ${step.impacto.toUpperCase()}`, 26, y + 10);

        y += 15;
      });

      // Footer stamp on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`RedMonitor L2 Enterprise | Página ${i} de ${totalPages} | Documento Oficial Confidencial`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }

      doc.save(`informe_red_${currentReport.id}.pdf`);
      onAddLog("📄 Archivo PDF generado y descargado correctamente.", "success");
    } catch (err) {
      console.error(err);
      onAddLog("❌ Error durante la generación del PDF.", "error");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER BAR */}
      <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-md">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide font-display flex items-center gap-2">
                Informes Detallados & Plan de Optimización
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  DIAGNÓSTICO INTEGRAL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría en profundidad del estado actual de la infraestructura, inventario L2/L3, matriz de vulnerabilidades y hoja de ruta de optimización.
              </p>
            </div>
          </div>
        </div>

        {/* TOP CONTROLS & EXPORT ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            <span>Configurar Informe</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Analizando...' : 'Generar en Vivo'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting === 'pdf'}
            className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-rose-400" />
            <span>{isExporting === 'pdf' ? 'Generando...' : 'Descargar PDF'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900/60 p-1 border border-slate-800 rounded">
            <button
              type="button"
              onClick={handleExportCSV}
              title="Exportar a CSV / Excel"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              title="Copiar en formato Markdown"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-colors cursor-pointer"
            >
              {copiedMd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              title="Exportar a JSON"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
            >
              <HardDrive className="h-3.5 w-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-semibold overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('resumen')}
          className={`px-4 py-2 rounded-t-md flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'resumen' 
              ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Diagnóstico Actual & KPIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vulnerabilidades')}
          className={`px-4 py-2 rounded-t-md flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'vulnerabilidades' 
              ? 'border-rose-500 text-rose-400 bg-slate-900/60 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Vulnerabilidades ({currentReport?.vulnerabilidades.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recomendaciones')}
          className={`px-4 py-2 rounded-t-md flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'recomendaciones' 
              ? 'border-amber-500 text-amber-400 bg-slate-900/60 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Recomendaciones & Hardening</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-t-md flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'plan' 
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Plan de Optimización ({planProgress}%)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 rounded-t-md flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'historial' 
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/60 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Historial & Archivo ({savedReports.length})</span>
        </button>

        <div className="ml-auto flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={handleSaveReportToHistory}
            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <HardDrive className="h-3 w-3" />
            <span>Guardar Instantánea</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DIAGNÓSTICO ACTUAL & KPIS */}
      {activeTab === 'resumen' && currentReport && (
        <div className="space-y-4">
          {/* TOP SCORE & STATUS HERO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* SCORE CARD */}
            <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-lg relative overflow-hidden">
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Índice de Salud de Red
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-extrabold font-mono ${
                    currentReport.scoreSaludRed >= 80 ? 'text-emerald-400' :
                    currentReport.scoreSaludRed >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {currentReport.scoreSaludRed}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block mt-1 ${
                  currentReport.scoreSaludRed >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  currentReport.scoreSaludRed >= 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {currentReport.rangoSalud}
                </span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
                <Award className={`h-8 w-8 ${
                  currentReport.scoreSaludRed >= 80 ? 'text-emerald-400' :
                  currentReport.scoreSaludRed >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`} />
              </div>
            </div>

            {/* DISPOSITIVOS CARD */}
            <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Inventario en Línea
                </span>
                <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
                  {currentReport.totalDispositivos}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{currentReport.dispositivosOk} OK</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{currentReport.dispositivosAdvertencia} Advert.</span>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{currentReport.dispositivosCaidos} Caídos</span>
                </div>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
                <Server className="h-8 w-8 text-cyan-400" />
              </div>
            </div>

            {/* LATENCIA Y CALIDAD */}
            <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Latencia & Jitter
                </span>
                <div className="text-3xl font-extrabold font-mono text-indigo-400 mt-1">
                  {currentReport.latenciaPromedio} <span className="text-sm font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Máxima: <span className="text-slate-200 font-bold">{currentReport.latenciaMaxima} ms</span> | Jitter: <span className="text-cyan-400 font-bold">{currentReport.jitterEstimado} ms</span>
                </div>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
                <Activity className="h-8 w-8 text-indigo-400" />
              </div>
            </div>

            {/* VULNERABILIDADES COUNT */}
            <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  Vulnerabilidades Detectadas
                </span>
                <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">
                  {currentReport.vulnerabilidades.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-rose-400 font-bold">{currentReport.vulnerabilidades.filter(v => v.severidad === 'critica').length} Críticas</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{currentReport.vulnerabilidades.filter(v => v.severidad === 'alta').length} Altas</span>
                </div>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
                <ShieldAlert className="h-8 w-8 text-rose-400" />
              </div>
            </div>
          </div>

          {/* SÍNTESIS EJECUTIVA & ACCIONES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* TEXT SÍNTESIS */}
            <div className="lg:col-span-2 bg-[#0B0F19] border border-slate-800 p-5 rounded-lg shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span>Síntesis Ejecutiva del Estado de la Red</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentReport.fechaGeneracion}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {currentReport.resumenEjecutivo}
              </p>

              {/* CONCLUSIONES RÁPIDAS */}
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                  Conclusiones de la Evaluación Técnica:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {currentReport.conclusiones.map((concl, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-800/50">
                      <ChevronRight className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{concl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI ENRICHED SECTION IF PRESENT */}
              {aiNotes && (
                <div className="mt-4 p-4 bg-purple-950/20 border border-purple-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
                    <span>Diagnóstico de Inteligencia Aumentada (Gemini Copilot)</span>
                  </div>
                  <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {aiNotes}
                  </div>
                </div>
              )}
            </div>

            {/* DISTRIBUTION INVENTORY & ENRICH ACTION */}
            <div className="bg-[#0B0F19] border border-slate-800 p-5 rounded-lg shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white font-display border-b border-slate-800/80 pb-2.5 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>Distribución de Equipos Censados</span>
                </h3>

                <div className="space-y-2.5 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">Routers / Gateways:</span>
                    <span className="font-bold font-mono text-cyan-400">{currentReport.inventarioResumen.routers}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">Switches de Acceso / Core:</span>
                    <span className="font-bold font-mono text-indigo-400">{currentReport.inventarioResumen.switches}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">Servidores / NAS:</span>
                    <span className="font-bold font-mono text-emerald-400">{currentReport.inventarioResumen.servidores}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">Puestos de Trabajo (PCs):</span>
                    <span className="font-bold font-mono text-amber-400">{currentReport.inventarioResumen.workstations}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">CCTV & Dispositivos IoT:</span>
                    <span className="font-bold font-mono text-rose-400">{currentReport.inventarioResumen.iotCctv}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-slate-400">Otros / No clasificados:</span>
                    <span className="font-bold font-mono text-slate-300">{currentReport.inventarioResumen.otros}</span>
                  </div>
                </div>
              </div>

              {/* AI COPILOT BUTTON */}
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">Enriquecimiento con IA</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Analiza patrones de latencia y anomalías de paquetes para generar recomendaciones estratégicas adicionales.
                </p>
                <button
                  type="button"
                  onClick={handleEnrichWithAI}
                  disabled={isAiEnriching}
                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Brain className={`h-3.5 w-3.5 ${isAiEnriching ? 'animate-spin' : ''}`} />
                  <span>{isAiEnriching ? 'Analizando con Gemini...' : 'Enriquecer Informe con IA'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ DE VULNERABILIDADES */}
      {activeTab === 'vulnerabilidades' && currentReport && (
        <div className="space-y-4">
          {/* FILTER TOOLBAR */}
          <div className="bg-[#0B0F19] border border-slate-800 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold font-mono uppercase text-[11px]">Filtrar Severidad:</span>
              {(['all', 'critica', 'alta', 'media', 'baja'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                    selectedSeverityFilter === sev
                      ? sev === 'critica' ? 'bg-rose-500 text-white'
                        : sev === 'alta' ? 'bg-amber-500 text-slate-950'
                        : sev === 'media' ? 'bg-yellow-500 text-slate-950'
                        : sev === 'baja' ? 'bg-blue-500 text-white'
                        : 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {sev === 'all' ? `Todas (${currentReport.vulnerabilidades.length})` : sev}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Mostrando {filteredVulnerabilities.length} de {currentReport.vulnerabilidades.length} hallazgos
            </span>
          </div>

          {/* VULNERABILITY CARDS */}
          <div className="space-y-3">
            {filteredVulnerabilities.map(vuln => {
              const isExpanded = expandedVulnId === vuln.id;
              const sevBadge = 
                vuln.severidad === 'critica' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                vuln.severidad === 'alta' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                vuln.severidad === 'media' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                'bg-blue-500/20 text-blue-400 border-blue-500/40';

              return (
                <div 
                  key={vuln.id}
                  className={`bg-[#0B0F19] border rounded-lg overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'border-cyan-500/60 shadow-lg' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedVulnId(isExpanded ? null : vuln.id)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/30 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border shrink-0 ${sevBadge}`}>
                        {vuln.severidad}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wide truncate">{vuln.titulo}</span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">({vuln.id})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-cyan-400">{vuln.ipAfectada}</span>
                          <span>•</span>
                          <span>{vuln.dispositivoAfectado}</span>
                          {vuln.puertoProtocolo && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300 font-mono">{vuln.puertoProtocolo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {vuln.cvssScore && (
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">CVSS</span>
                          <span className="text-xs font-bold font-mono text-amber-400">{vuln.cvssScore}</span>
                        </div>
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-cyan-400" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950/70 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in duration-150">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                          Descripción Técnica del Hallazgo:
                        </span>
                        <p className="text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded border border-slate-800/60">
                          {vuln.descripcion}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1 font-mono">
                            Vector de Ataque & Riesgo:
                          </span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {vuln.vectorAtaqueRiesgo}
                          </p>
                        </div>

                        <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 font-mono">
                            Impacto Estimado en Negocio:
                          </span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {vuln.impactoEstimado}
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Remediación y Pasos de Mitigación Sugeridos:
                        </span>
                        <p className="text-slate-200 text-xs leading-relaxed font-sans">
                          {vuln.remediacionSugerida}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RECOMENDACIONES & HARDENING */}
      {activeTab === 'recomendaciones' && currentReport && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs text-slate-400 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>
              Estas recomendaciones técnicas se fundamentan en marcos de ciberseguridad industrial y buenas prácticas (CIS Benchmarks v8, NIST SP 800-115, ISO 27001).
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentReport.recomendaciones.map((rec) => (
              <div key={rec.id} className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg shadow-lg flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {rec.area}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      rec.dificultad === 'Fácil' ? 'bg-emerald-500/10 text-emerald-400' :
                      rec.dificultad === 'Moderada' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      Dificultad: {rec.dificultad}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {rec.titulo}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rec.descripcion}
                  </p>

                  <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded text-[11px] text-emerald-300">
                    <span className="font-bold">Beneficio Directo: </span>
                    {rec.beneficioClave}
                  </div>

                  {rec.normaEstandar && (
                    <div className="text-[10px] font-mono text-slate-500">
                      Estándar: {rec.normaEstandar}
                    </div>
                  )}
                </div>

                {rec.ejemploConfiguracion && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1 flex items-center gap-1">
                      <Terminal className="h-3 w-3 text-cyan-400" />
                      Comandos de Aplicación Sugeridos:
                    </span>
                    <pre className="bg-slate-950 p-2 rounded text-[10.5px] font-mono text-cyan-300 overflow-x-auto border border-slate-800/80">
                      {rec.ejemploConfiguracion}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PLAN DE ACCIÓN & CHECKLIST INTERACTIVO */}
      {activeTab === 'plan' && currentReport && (
        <div className="space-y-4">
          {/* PROGRESS BAR BANNER */}
          <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Avance Global de la Optimización de Red
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {planProgress}%
                </span>
                <span className="text-xs text-slate-400">
                  ({currentReport.planOptimizacion.filter(s => s.completado).length} de {currentReport.planOptimizacion.length} tareas completadas)
                </span>
              </div>
            </div>

            <div className="w-full md:w-64 bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-sm shadow-emerald-500/40"
                style={{ width: `${planProgress}%` }}
              />
            </div>
          </div>

          {/* FASES */}
          {(['fase1_inmediata', 'fase2_optimizacion', 'fase3_arquitectura'] as const).map(phase => {
            const stepsInPhase = currentReport.planOptimizacion.filter(s => s.fase === phase);
            const phaseTitle = 
              phase === 'fase1_inmediata' ? '🚀 Fase 1: Mitigación Inmediata de Emergencia (0 - 48 Horas)' :
              phase === 'fase2_optimizacion' ? '🛠️ Fase 2: Optimización de Rendimiento & Hardening (3 - 14 Días)' :
              '🏗️ Fase 3: Modernización Arquitectónica & Resiliencia (15 - 45 Días)';

            return (
              <div key={phase} className="bg-[#0B0F19] border border-slate-800 rounded-lg overflow-hidden shadow-md">
                <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-display">
                    {phaseTitle}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {stepsInPhase.filter(s => s.completado).length} / {stepsInPhase.length} Listos
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60 p-2">
                  {stepsInPhase.map(step => (
                    <div 
                      key={step.id} 
                      className={`p-3 rounded transition-colors flex items-start gap-3 ${
                        step.completado ? 'bg-emerald-950/10 opacity-80' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStepCompletion(step.id)}
                        className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                          step.completado 
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                            : 'border-slate-600 bg-slate-900 hover:border-cyan-400'
                        }`}
                      >
                        {step.completado && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-bold ${step.completado ? 'line-through text-slate-400' : 'text-white'}`}>
                            {step.titulo}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            step.prioridad === 'urgente' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            step.prioridad === 'alta' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {step.prioridad}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            Impacto: {step.impacto.toUpperCase()} | Esfuerzo: {step.esfuerzo.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed">
                          {step.descripcion}
                        </p>

                        {step.comandoSugerido && (
                          <div className="mt-2 flex items-center gap-2 bg-slate-950/80 p-1.5 rounded border border-slate-800 text-[10.5px] font-mono text-cyan-300">
                            <Terminal className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="select-all">{step.comandoSugerido}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: HISTORIAL & ARCHIVO */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Archivo Histórico de Auditorías</h3>
              <p className="text-xs text-slate-400">Compara cómo ha evolucionado el Score de Salud de la red antes y después de aplicar optimizaciones.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveReportToHistory}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>Guardar Estado Actual</span>
            </button>
          </div>

          {savedReports.length === 0 ? (
            <div className="bg-[#0B0F19] border border-slate-800 p-8 rounded-lg text-center space-y-2">
              <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No hay informes archivados aún</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Guarda una instantánea de la red para registrar el punto de partida y medir el impacto de las mejoras en el tiempo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedReports.map(rep => (
                <div key={rep.id} className="bg-[#0B0F19] border border-slate-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{rep.titulo}</span>
                      <span className="text-[10px] font-mono text-slate-500">{rep.fechaGeneracion}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Sede: <strong className="text-slate-200">{rep.ubicacion}</strong></span>
                      <span>•</span>
                      <span>Hosts: <strong className="text-cyan-400">{rep.totalDispositivos}</strong></span>
                      <span>•</span>
                      <span>Vulnerabilidades: <strong className="text-rose-400">{rep.vulnerabilidades.length}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block font-mono uppercase">Salud</span>
                      <span className={`text-base font-bold font-mono ${
                        rep.scoreSaludRed >= 80 ? 'text-emerald-400' : rep.scoreSaludRed >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {rep.scoreSaludRed}/100
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentReport(rep);
                        setActiveTab('resumen');
                        onAddLog(`📂 Informe histórico "${rep.titulo}" cargado en vista activa.`, 'info');
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      Cargar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReport(rep.id)}
                      className="p-1 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Eliminar del historial"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <span>Configurar Parámetros del Informe</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Título del Informe:</label>
                <input 
                  type="text" 
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Organización / Empresa:</label>
                <input 
                  type="text" 
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Ubicación / Sede Evaluada:</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Auditor Responsable:</label>
                <input 
                  type="text" 
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Alcance / Perfil:</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="integral">Integral (Todo)</option>
                    <option value="ciberseguridad">Ciberseguridad</option>
                    <option value="rendimiento">Rendimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Segmento:</label>
                  <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="all">Todos los segmentos</option>
                    {availableSegments.map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false);
                  handleGenerateReport();
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs cursor-pointer"
              >
                Aplicar y Regenerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
