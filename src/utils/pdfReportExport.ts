import { jsPDF } from 'jspdf';
import { DetailedNetworkReport, Device } from '../types';
import { generateDetailedNetworkReport } from './reportGenerator';

interface ExportPdfOptions {
  report?: DetailedNetworkReport;
  devices?: Device[];
  organization?: string;
  locationName?: string;
  auditorName?: string;
  title?: string;
  completedStepIds?: Record<string, boolean>;
}

export const generateFormalPdfReport = async (options: ExportPdfOptions): Promise<void> => {
  // Obtain or generate report
  let report = options.report;
  if (!report && options.devices && options.devices.length > 0) {
    report = generateDetailedNetworkReport(options.devices, {
      title: options.title || 'Informe Formal de Estado, Vulnerabilidades y Optimización de Red LAN',
      organization: options.organization || 'Corporación & Infraestructura de Telecomunicaciones',
      location: options.locationName || 'Sede Principal LAN',
      auditor: options.auditorName || 'Auditor Técnico de Redes',
      scope: 'integral',
      segmentFilter: 'all'
    });
    if (options.completedStepIds) {
      report.planOptimizacion = report.planOptimizacion.map(step => ({
        ...step,
        completado: !!options.completedStepIds?.[step.id]
      }));
    }
  }

  if (!report) {
    throw new Error("No hay datos de reporte disponibles para exportar");
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2);

  // Corporate Color Palette
  const navyDark = [15, 23, 42];        // slate-900
  const cyanBrand = [6, 182, 212];      // cyan-500
  const slateText = [51, 65, 85];       // slate-700
  const mutedText = [100, 116, 139];    // slate-500
  const borderGrey = [226, 232, 240];   // slate-200
  const cardBg = [248, 250, 252];       // slate-50
  const greenHealth = [16, 185, 129];   // emerald-500
  const amberHealth = [217, 119, 6];    // amber-600
  const redCritical = [225, 29, 72];    // rose-600

  let y = 14;

  // Helper for page break check
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
      return true;
    }
    return false;
  };

  // Top Decorative Bar
  doc.setFillColor(cyanBrand[0], cyanBrand[1], cyanBrand[2]);
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  // Document Title & Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text(report.titulo || "Informe Técnico y Auditoría de Red LAN", marginX, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`FOLIO DE AUDITORÍA: ${report.id}  |  EMISIÓN OFICIAL: ${report.fechaGeneracion}  |  REDMONITOR ENTERPRISE`, marginX, y + 12);

  y += 18;

  // Header Metadata Card (Box)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(marginX, y, contentWidth, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);

  // Col 1
  doc.setFont('helvetica', 'bold');
  doc.text("Organización:", marginX + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(report.organizacion || 'Empresa Local', marginX + 28, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text("Sede / Ubicación:", marginX + 4, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(report.ubicacion || 'Sede Principal', marginX + 33, y + 14);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.text("Auditor Técnico:", marginX + 90, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(report.auditor || 'Auditor de Sistemas', marginX + 117, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text("Calificación Red:", marginX + 90, y + 14);

  const scoreColor = report.scoreSaludRed >= 80 ? greenHealth : report.scoreSaludRed >= 60 ? amberHealth : redCritical;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${report.scoreSaludRed} / 100  —  ${report.rangoSalud.toUpperCase()}`, marginX + 119, y + 14);

  y += 28;

  // 1. Resumen Ejecutivo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text("1. Resumen Ejecutivo de Infraestructura", marginX, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const splitSummary = doc.splitTextToSize(report.resumenEjecutivo, contentWidth);
  doc.text(splitSummary, marginX, y);
  y += splitSummary.length * 4.2 + 5;

  // 4 KPI Summary Cards
  const kpiCardWidth = (contentWidth - 9) / 4;
  const completedSteps = report.planOptimizacion.filter(s => s.completado).length;
  const planPct = report.planOptimizacion.length > 0 ? Math.round((completedSteps / report.planOptimizacion.length) * 100) : 0;

  const kpiData = [
    {
      title: "DISPOSITIVOS ACTIVOS",
      val: `${report.totalDispositivos}`,
      sub: `${report.dispositivosOk} OK | ${report.dispositivosCaidos} Caídos`
    },
    {
      title: "LATENCIA MEDIA",
      val: `${report.latenciaPromedio} ms`,
      sub: `Jitter: ${report.jitterEstimado} ms | Máx: ${report.latenciaMaxima} ms`
    },
    {
      title: "VULNERABILIDADES",
      val: `${report.vulnerabilidades.length}`,
      sub: `${report.vulnerabilidades.filter(v => v.severidad === 'critica').length} Críticas | ${report.vulnerabilidades.filter(v => v.severidad === 'alta').length} Altas`
    },
    {
      title: "PLAN ACCIÓN",
      val: `${planPct}%`,
      sub: `${completedSteps} de ${report.planOptimizacion.length} Pasos Realizados`
    }
  ];

  kpiData.forEach((kpi, idx) => {
    const kx = marginX + idx * (kpiCardWidth + 3);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(kx, y, kpiCardWidth, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(kpi.title, kx + 3.5, y + 5);

    doc.setFontSize(11);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(kpi.val, kx + 3.5, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(kpi.sub, kx + 3.5, y + 15.5);
  });

  y += 24;

  // 2. Matriz de Vulnerabilidades
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text("2. Matriz de Vulnerabilidades y Hallazgos de Seguridad", marginX, y);

  y += 5;
  // Table Header
  doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.rect(marginX, y, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("ID", marginX + 3, y + 4.5);
  doc.text("SEVERIDAD", marginX + 20, y + 4.5);
  doc.text("EQUIPO / IP", marginX + 44, y + 4.5);
  doc.text("HALLAZGO & VECTOR DE RIESGO", marginX + 85, y + 4.5);
  doc.text("REMEDIACIÓN RECOMENDADA", marginX + 140, y + 4.5);

  y += 6.5;

  if (report.vulnerabilidades.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.rect(marginX, y, contentWidth, 10, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(greenHealth[0], greenHealth[1], greenHealth[2]);
    doc.text("✓ No se identificaron vulnerabilidades críticas ni puertos inseguros en los dispositivos auditados.", marginX + 4, y + 6);
    y += 14;
  } else {
    report.vulnerabilidades.slice(0, 10).forEach((v, index) => {
      checkPageBreak(14);

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.rect(marginX, y, contentWidth, 13, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
      doc.text(v.id, marginX + 3, y + 5);

      // Severity Color
      const sevColor = v.severidad === 'critica' ? redCritical : v.severidad === 'alta' ? [234, 88, 12] : amberHealth;
      doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
      doc.text(v.severidad.toUpperCase(), marginX + 20, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
      doc.text(v.ipAfectada, marginX + 44, y + 5);

      doc.setFontSize(5.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      const hostShort = (v.dispositivoAfectado || '—').substring(0, 24);
      doc.text(hostShort, marginX + 44, y + 9);

      // Title/Desc
      doc.setFontSize(6);
      doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
      const splitTitle = doc.splitTextToSize(v.titulo, 50);
      doc.text(splitTitle.slice(0, 2), marginX + 85, y + 4.5);

      // Remediation
      doc.setFontSize(5.5);
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      const splitRem = doc.splitTextToSize(v.remediacionSugerida, 42);
      doc.text(splitRem.slice(0, 2), marginX + 140, y + 4.5);

      y += 13;
    });
  }

  y += 8;

  // 3. Inventario de Dispositivos Auditados (Sample table)
  const activeDevList = options.devices && options.devices.length > 0 
    ? options.devices.filter(d => d.estado !== 'No_Escaneado')
    : [];

  if (activeDevList.length > 0) {
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text("3. Inventario Físico y Direccionamiento LAN", marginX, y);

    y += 5;
    // Table Header
    doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.rect(marginX, y, contentWidth, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DIRECCIÓN IP", marginX + 3, y + 4.2);
    doc.text("DIRECCIÓN MAC", marginX + 35, y + 4.2);
    doc.text("NOMBRE DE HOST / APODO", marginX + 72, y + 4.2);
    doc.text("FABRICANTE / MODELO", marginX + 120, y + 4.2);
    doc.text("ESTADO / PING", marginX + 160, y + 4.2);

    y += 6;

    activeDevList.slice(0, 14).forEach((dev, index) => {
      checkPageBreak(8);

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.rect(marginX, y, contentWidth, 7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
      doc.text(dev.ip, marginX + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(dev.mac || '—', marginX + 35, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
      doc.text((dev.host || '—').substring(0, 26), marginX + 72, y + 4.5);

      doc.setFontSize(5.5);
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.text((dev.vendor || 'Genérico').substring(0, 24), marginX + 120, y + 4.5);

      const isOk = dev.estado === 'OK';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(isOk ? greenHealth[0] : amberHealth[0], isOk ? greenHealth[1] : amberHealth[1], isOk ? greenHealth[2] : amberHealth[2]);
      doc.text(`${dev.estado} (${dev.ping !== null ? `${dev.ping}ms` : '—'})`, marginX + 160, y + 4.5);

      y += 7;
    });

    y += 8;
  }

  // 4. Recomendaciones Técnicas de Hardening
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text("4. Recomendaciones de Hardening y Arquitectura", marginX, y);

  y += 5;
  report.recomendaciones.slice(0, 4).forEach((rec) => {
    checkPageBreak(16);

    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(marginX, y, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(cyanBrand[0], cyanBrand[1], cyanBrand[2]);
    doc.text(`[${rec.area.toUpperCase()}]`, marginX + 4, y + 5);

    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(rec.titulo, marginX + 32, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const splitDesc = doc.splitTextToSize(rec.descripcion, contentWidth - 8);
    doc.text(splitDesc.slice(0, 2), marginX + 4, y + 9.5);

    y += 16;
  });

  y += 8;

  // 5. Hoja de Ruta y Plan de Acción
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text("5. Plan de Acción y Hoja de Ruta para Optimización", marginX, y);

  y += 5;
  report.planOptimizacion.slice(0, 6).forEach((step) => {
    checkPageBreak(14);

    doc.setFillColor(step.completado ? 240 : 255, step.completado ? 253 : 255, step.completado ? 244 : 255);
    doc.setDrawColor(step.completado ? 187 : 226, step.completado ? 247 : 232, step.completado ? 208 : 240);
    doc.roundedRect(marginX, y, contentWidth, 12, 1.5, 1.5, 'FD');

    // Checkbox icon representation
    doc.setDrawColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.rect(marginX + 4, y + 3.5, 4, 4);
    if (step.completado) {
      doc.setFillColor(greenHealth[0], greenHealth[1], greenHealth[2]);
      doc.rect(marginX + 5, y + 4.5, 2, 2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    doc.text(`${step.id} — ${step.titulo}`, marginX + 12, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Fase: ${step.fase.replace('_', ' ').toUpperCase()}  |  Prioridad: ${step.prioridad.toUpperCase()}  |  Impacto: ${step.impacto.toUpperCase()}`, marginX + 12, y + 9.5);

    y += 14;
  });

  // 6. Signatures and Approval block
  checkPageBreak(30);
  y += 6;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(marginX, y, marginX + contentWidth, y);

  y += 12;
  const sigColWidth = contentWidth / 2;

  // Signature 1
  doc.line(marginX + 15, y + 10, marginX + sigColWidth - 15, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text(report.auditor || "Auditor Técnico de Redes", marginX + 15, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Responsable de Evaluación y Ciberseguridad", marginX + 15, y + 18);

  // Signature 2
  doc.line(marginX + sigColWidth + 15, y + 10, marginX + contentWidth - 15, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.text("Director / Administrador de TI", marginX + sigColWidth + 15, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text("Aprobación de Hoja de Ruta e Infraestructura", marginX + sigColWidth + 15, y + 18);

  // Running Header / Footer on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top subtle header line
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.line(marginX, 8, marginX + contentWidth, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`RedMonitor L2 Enterprise  •  ${report.organizacion}`, marginX, 7);
    doc.text(`ID: ${report.id}`, marginX + contentWidth, 7, { align: 'right' });

    // Bottom footer line
    doc.line(marginX, pageHeight - 10, marginX + contentWidth, pageHeight - 10);
    doc.text(`Documento Oficial Confidencial  •  Generado con RedMonitor`, marginX, pageHeight - 6.5);
    doc.text(`Página ${i} de ${totalPages}`, marginX + contentWidth, pageHeight - 6.5, { align: 'right' });
  }

  // Trigger download
  const cleanId = (report.id || 'auditoria').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Informe_Auditoria_Red_${cleanId}.pdf`);
};
