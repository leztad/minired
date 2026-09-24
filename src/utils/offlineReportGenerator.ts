import { jsPDF } from 'jspdf';
import { Device, LocationProfile } from '../types';
import { resolveVendorByMac, resolveDeviceNameByMac } from './macUtils';

export interface LocationReportTotals {
  totalHosts: number;
  okHosts: number;
  warnHosts: number;
  downHosts: number;
  avgLatency: number;
  safetyScore: number;
  rank: string;
  rankColor: string;
}

/**
 * Calculates executive safety and health metrics for an offline location profile.
 */
export function calculateLocationTotals(profile: LocationProfile): LocationReportTotals {
  const devices = profile.devices || [];
  const totalHosts = devices.length;
  let okHosts = 0;
  let warnHosts = 0;
  let downHosts = 0;
  let totalLatency = 0;
  let latencySamples = 0;
  let hasUnrecognizedMac = false;
  let highLatencyCount = 0;

  for (let i = 0; i < totalHosts; i++) {
    const d = devices[i];
    if (d.estado === 'OK') okHosts++;
    else if (d.estado === 'Advertencia') warnHosts++;
    else downHosts++;

    if (typeof d.ping === 'number' && d.ping > 0) {
      totalLatency += d.ping;
      latencySamples++;
      if (d.ping > 100) highLatencyCount++;
    }

    if (!hasUnrecognizedMac && (!d.mac || d.mac === '—' || d.mac === '00:00:00:00:00:00')) {
      hasUnrecognizedMac = true;
    }
  }

  const avgLatency = latencySamples > 0 ? Math.round(totalLatency / latencySamples) : 0;

  let safetyScore = 100;
  safetyScore -= warnHosts * 10;
  safetyScore -= downHosts * 12;
  if (hasUnrecognizedMac) safetyScore -= 10;
  safetyScore -= highLatencyCount * 5;

  let rank = 'CONFIABLE (EXCELENTE)';
  let rankColor = 'text-emerald-400';

  if (safetyScore < 60) {
    rank = 'RIESGO CRÍTICO DETECTADO / ACCIONES PENDIENTES';
    rankColor = 'text-rose-500';
  } else if (safetyScore < 85) {
    rank = 'SITUACIÓN CONTROLADA / REQUIERE ATENCIÓN';
    rankColor = 'text-amber-400';
  }

  return {
    totalHosts,
    okHosts,
    warnHosts,
    downHosts,
    avgLatency,
    safetyScore: Math.max(safetyScore, 10),
    rank,
    rankColor
  };
}

/**
 * Generates an executive audit PDF for an offline location profile,
 * reproducing the exact corporate formatting of NetworkAudit.
 */
export async function exportOfflineLocationPDF(profile: LocationProfile): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totals = calculateLocationTotals(profile);
  const primaryColor = [11, 17, 32]; 
  const accentColor = [6, 182, 212];  
  const successColor = [16, 185, 129]; 
  const warningColor = [245, 158, 11]; 
  const roseColor = [225, 29, 72];
  const textColorSecondary = [71, 85, 105]; 
  const lightBg = [248, 250, 252]; 

  const drawHeader = (pageNo: number) => {
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); 
    doc.text("SISTEMA DE MONITOREO DE RED - REDMONITOR", 10, 10);
    doc.text("AUDITORÍA DE INFRAESTRUCTURA - SEDE OFFLINE", 200, 10, { align: 'right' });

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.3);
    doc.line(10, 12, 200, 12);
  };

  const drawFooter = (pageNo: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(10, 281, 200, 281);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); 
    doc.text("RedMonitor — Reporte de Auditoría LAN (Sede Offline)", 10, 285.5);
    doc.text(`Generación: ${new Date().toLocaleString('es-ES')}`, 10, 289);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); 
    doc.text("Diseñado y programado por ASNEIDER ZAPATA", 105, 287, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); 
    doc.text(`Página ${pageNo}`, 200, 287, { align: 'right' });
  };

  let pageCount = 1;
  drawHeader(pageCount);

  // Main Title & Subtitle
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("INFORME DE AUDITORÍA DE RED FÍSICA", 10, 22);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("Sondeo y Validación de Interfaces Físicas, Direcciones MAC, Ubicación y Latencia LAN", 10, 27);

  // Dual-Panel Metadata Section
  // Panel 1: Sonda & Technical Details (Left)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(10, 31, 92, 23, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.rect(10, 31, 92, 23, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("SISTEMA / DETALLES DE AUDITORÍA", 14, 36);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Sonda: RedMonitor Sonda de Campo Local (Offline)`, 14, 41);
  doc.text(`ID Sede: ${profile.id}`, 14, 45);
  doc.text(`Subred: ${profile.subnet}  |  Gateway: ${profile.gateway || '192.168.1.1'}`, 14, 49);
  doc.text(`Fecha Registro: ${profile.createdAt || new Date().toLocaleString('es-ES')}`, 14, 53);

  // Panel 2: UBICACIÓN Y SEDE DE REGISTRO (Right) - Prominent with cyan accent
  doc.setFillColor(236, 254, 255); // cyan-50
  doc.rect(106, 31, 94, 23, 'F');
  doc.setDrawColor(6, 182, 212); // cyan-500
  doc.setLineWidth(0.5);
  doc.rect(106, 31, 94, 23, 'S');

  // Decorative cyan bar
  doc.setFillColor(6, 182, 212);
  doc.rect(106, 31, 2.5, 23, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(8, 115, 137);
  doc.text("SITIO / UBICACIÓN REGISTRADA (OFFLINE)", 111, 36.5);

  const displayLoc = profile.name.trim().toUpperCase();
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(displayLoc.length > 34 ? displayLoc.substring(0, 32) + '...' : displayLoc, 111, 44);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const deptStr = profile.department ? `Área: ${profile.department}` : 'Infraestructura General LAN';
  const contactStr = profile.contactName ? `Enlace: ${profile.contactName} ${profile.contactPhone ? `(${profile.contactPhone})` : ''}` : 'Auditoría e inventario en caché';
  doc.text(deptStr.length > 40 ? deptStr.substring(0, 38) + '...' : deptStr, 111, 48.5);
  doc.text(contactStr.length > 40 ? contactStr.substring(0, 38) + '...' : contactStr, 111, 52.5);

  // EXECUTIVE SUMMARY
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RESUMEN EJECUTIVO DE SEGURIDAD", 10, 59);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(186, 230, 253); 
  doc.setLineWidth(0.3);
  doc.rect(10, 62, 190, 22, 'F');
  doc.rect(10, 62, 190, 22, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("TOTAL HOSTS REGISTRADOS", 15, 68);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${totals.totalHosts} Hosts (${totals.okHosts} OK, ${totals.downHosts} Caídos)`, 15, 76.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("LATENCIA MEDIA LAN", 85, 68);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(
    totals.avgLatency > 50 ? warningColor[0] : successColor[0],
    totals.avgLatency > 50 ? warningColor[1] : successColor[1],
    totals.avgLatency > 50 ? warningColor[2] : successColor[2]
  );
  doc.text(`${totals.avgLatency} ms`, 85, 76.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("NIVEL DE SEGURIDAD GENERAL", 140, 68);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(
    totals.safetyScore < 80 ? warningColor[0] : successColor[0],
    totals.safetyScore < 80 ? warningColor[1] : successColor[1],
    totals.safetyScore < 80 ? warningColor[2] : successColor[2]
  );
  doc.text(`${totals.safetyScore}% - ${totals.rank.split('(')[0]}`, 140, 76.5);

  let startTableY = 89;

  // Optional Security Notes / Description Box
  if (profile.securityNotes || profile.description) {
    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(251, 191, 36);  // amber-400
    doc.setLineWidth(0.2);
    doc.rect(10, 86, 190, 10, 'F');
    doc.rect(10, 86, 190, 10, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text("NOTAS DE SEGURIDAD FÍSICA Y ENTORNO:", 14, 90.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 63, 18);
    const noteText = profile.securityNotes || profile.description;
    doc.text(noteText.length > 105 ? noteText.substring(0, 102) + '...' : noteText, 14, 94);

    startTableY = 100;
  }

  // Device Table Header Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("DIRECCIONES IP SONDEADAS CON DIRECCIÓN MAC ASOCIADA", 10, startTableY);

  // Table header bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, startTableY + 4, 190, 8, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("DIRECCIÓN IP", 12, startTableY + 9.5);
  doc.text("DIRECCIÓN MAC", 35, startTableY + 9.5);
  doc.text("UBICACIÓN FÍSICA", 68, startTableY + 9.5);
  doc.text("FABRICANTE NIC", 105, startTableY + 9.5);
  doc.text("ESTACIÓN / HOST", 142, startTableY + 9.5);
  doc.text("LATENCIA", 168, startTableY + 9.5);
  doc.text("ESTADO", 184, startTableY + 9.5);

  let y = startTableY + 12;
  const devices = profile.devices || [];

  if (devices.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("No se registraron hosts para este perfil de sede física.", 105, y + 10, { align: 'center' });
    y += 20;
  } else {
    devices.forEach((device, index) => {
      const isAlternate = index % 2 === 1;
      if (isAlternate) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(10, y, 190, 7.5, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
      }

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(10, y + 7.5, 200, y + 7.5);

      // IP
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 102, 153); 
      doc.text(device.ip || '—', 12, y + 4.8);

      // MAC
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); 
      doc.text(device.mac || '—', 35, y + 4.8);

      // Location
      const rawLoc = device.ubicacion || profile.name || 'Sede Offline';
      const deviceLoc = rawLoc.length > 20 ? rawLoc.substring(0, 18) + '...' : rawLoc;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(217, 119, 6);
      doc.text(deviceLoc, 68, y + 4.8);

      // Manufacturer / Vendor
      const manufacturerRaw = device.vendor && device.vendor !== 'Desconocido'
        ? device.vendor
        : resolveVendorByMac(device.mac, device.host, device.ip);
      const manufacturer = manufacturerRaw.length > 20 ? manufacturerRaw.substring(0, 18) + '...' : manufacturerRaw;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      doc.text(manufacturer, 105, y + 4.8);

      // Friendly Hostname
      const resolvedHost = resolveDeviceNameByMac(device.mac, device.host, device.ip);
      const friendlyHostName = resolvedHost.length > 18 ? resolvedHost.substring(0, 16) + '...' : resolvedHost;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(friendlyHostName, 142, y + 4.8);

      // Latency Ping
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      const pingVal = device.ping;
      doc.setTextColor(
        pingVal && pingVal > 100 ? warningColor[0] : (pingVal !== null ? successColor[0] : roseColor[0]),
        pingVal && pingVal > 100 ? warningColor[1] : (pingVal !== null ? successColor[1] : roseColor[1]),
        pingVal && pingVal > 100 ? warningColor[2] : (pingVal !== null ? successColor[2] : roseColor[2])
      );
      const pingLabel = pingVal !== null ? `${pingVal} ms` : '—';
      doc.text(pingLabel, 168, y + 4.8);

      // Status Badge
      if (device.estado === 'OK') {
        doc.setFillColor(209, 250, 229); 
        doc.rect(182, y + 1.5, 12, 4.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(5, 150, 105); 
        doc.text("OK", 188, y + 4.7, { align: 'center' });
      } else if (device.estado === 'Advertencia') {
        doc.setFillColor(254, 243, 199); 
        doc.rect(182, y + 1.5, 12, 4.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(217, 119, 6); 
        doc.text("WARN", 188, y + 4.7, { align: 'center' });
      } else {
        doc.setFillColor(255, 228, 230); 
        doc.rect(182, y + 1.5, 12, 4.5, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(225, 29, 72); 
        doc.text("DOWN", 188, y + 4.7, { align: 'center' });
      }

      y += 7.5;

      // Handle page breaking
      if (y > 265) {
        drawFooter(pageCount);
        doc.addPage();
        pageCount += 1;
        drawHeader(pageCount);

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, 18, 190, 8, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("DIRECCIÓN IP", 12, 23.5);
        doc.text("DIRECCIÓN MAC", 35, 23.5);
        doc.text("UBICACIÓN FÍSICA", 68, 23.5);
        doc.text("FABRICANTE NIC", 105, 23.5);
        doc.text("ESTACIÓN / HOST", 142, 23.5);
        doc.text("LATENCIA", 168, 23.5);
        doc.text("ESTADO", 184, 23.5);

        y = 26; 
      }
    });
  }

  // Final Audit Seal / Declaration Box
  if (y > 245) {
    drawFooter(pageCount);
    doc.addPage();
    pageCount += 1;
    drawHeader(pageCount);
    y = 18;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(10, y + 6, 190, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, y + 6, 190, 22, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("DECLARACIÓN DE VALIDACIÓN Y CONTROL DE AUDITORÍA OFFLINE", 14, y + 12);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text(`El presente reporte certifica el estado y trazabilidad de la sede física "${profile.name}".`, 14, y + 17);
  doc.text("Las asignaciones MAC-IP y métricas corresponden a la instantánea registrada y preservada en caché.", 14, y + 21);

  drawFooter(pageCount);

  const formattedDate = new Date().toISOString().split('T')[0];
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  doc.save(`auditoria_offline_${safeName}_${formattedDate}.pdf`);
}

/**
 * Generates a richly styled Excel (.xls) file with identical layout,
 * colors and fonts as the PDF report.
 */
export async function exportOfflineLocationExcel(profile: LocationProfile): Promise<void> {
  const totals = calculateLocationTotals(profile);
  const formattedDate = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString('es-ES');
  const displayLoc = profile.name.trim().toUpperCase();
  const devices = profile.devices || [];

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
       <x:ExcelWorkbook>
        <x:ExcelWorksheets>
         <x:ExcelWorksheet>
          <x:Name>${profile.name.substring(0, 30)}</x:Name>
          <x:WorksheetOptions>
           <x:DisplayGridlines/>
          </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; background-color: #ffffff; }
        table { border-collapse: collapse; width: 100%; }
        td, th { font-family: Helvetica, Arial, sans-serif; padding: 8px 10px; vertical-align: middle; }
        .accent-top-bar { background-color: #06b6d4; height: 5px; padding: 0; }
        .header-top { color: #64748b; font-size: 8pt; font-weight: bold; font-family: Helvetica, Arial, sans-serif; }
        .main-title { font-size: 18pt; font-weight: bold; color: #0b1120; padding-top: 10px; font-family: Helvetica, Arial, sans-serif; }
        .main-subtitle { font-size: 10pt; color: #475569; padding-bottom: 10px; font-family: Helvetica, Arial, sans-serif; }
        .summary-title { font-size: 11pt; font-weight: bold; color: #0b1120; padding-top: 10px; padding-bottom: 4px; font-family: Helvetica, Arial, sans-serif; }
        .table-header-title { font-size: 11pt; font-weight: bold; color: #0b1120; padding-top: 12px; padding-bottom: 4px; font-family: Helvetica, Arial, sans-serif; }
      </style>
    </head>
    <body>
      <table>
        <colgroup>
          <col style="width: 120px;" />
          <col style="width: 140px;" />
          <col style="width: 150px;" />
          <col style="width: 170px;" />
          <col style="width: 170px;" />
          <col style="width: 90px;" />
          <col style="width: 80px;" />
        </colgroup>

        <!-- TOP CYAN ACCENT LINE -->
        <tr>
          <td colspan="7" class="accent-top-bar" bgcolor="#06b6d4" style="background-color: #06b6d4; height: 5px; padding: 0;"></td>
        </tr>

        <!-- HEADER BAR -->
        <tr>
          <td colspan="4" class="header-top" style="color: #64748b; font-size: 8pt; font-weight: bold;">SISTEMA DE MONITOREO DE RED - REDMONITOR</td>
          <td colspan="3" class="header-top" align="right" style="text-align: right; color: #64748b; font-size: 8pt; font-weight: bold;">AUDITORÍA DE SEDE OFFLINE</td>
        </tr>
        <tr>
          <td colspan="7" style="border-bottom: 1.5px solid #cbd5e1; height: 2px; padding: 0;"></td>
        </tr>
        <tr><td colspan="7" style="height: 10px; padding: 0;"></td></tr>

        <!-- MAIN TITLE & SUBTITLE -->
        <tr>
          <td colspan="7" class="main-title" style="font-size: 18pt; font-weight: bold; color: #0b1120;">INFORME DE AUDITORÍA DE RED FÍSICA</td>
        </tr>
        <tr>
          <td colspan="7" class="main-subtitle" style="font-size: 10pt; color: #475569;">Sondeo y Validación de Interfaces Físicas, Direcciones MAC, Ubicación y Latencia LAN</td>
        </tr>
        <tr><td colspan="7" style="height: 12px; padding: 0;"></td></tr>

        <!-- DUAL PANEL METADATA SECTION -->
        <tr>
          <td colspan="4" style="font-weight: bold; color: #475569; font-size: 8.5pt; border-top: 1px solid #cbd5e1; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px 12px;">SISTEMA / DETALLES DE AUDITORÍA</td>
          <td colspan="3" style="font-weight: bold; color: #087389; font-size: 9pt; border-top: 2px solid #06b6d4; border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; background-color: #ecfefe; padding: 8px 12px;">SITIO / UBICACIÓN REGISTRADA (OFFLINE)</td>
        </tr>
        <tr>
          <td colspan="4" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px;">Sonda: RedMonitor Sonda de Campo Local (Offline)</td>
          <td colspan="3" style="border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; background-color: #ecfefe; font-weight: bold; font-size: 11pt; color: #0f172a; padding: 6px 12px;">${displayLoc}</td>
        </tr>
        <tr>
          <td colspan="4" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px;">ID Sede: ${profile.id}  |  Subred: ${profile.subnet}</td>
          <td colspan="3" style="border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; background-color: #ecfefe; font-size: 8pt; color: #475569; padding: 4px 12px;">${profile.department || 'Infraestructura General LAN'}</td>
        </tr>
        <tr>
          <td colspan="4" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px 8px 12px;">Gateway: ${profile.gateway || '192.168.1.1'}  |  DNS: ${profile.dns || '—'}  |  Fecha: ${profile.createdAt}</td>
          <td colspan="3" style="border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; border-bottom: 2px solid #06b6d4; background-color: #ecfefe; font-size: 8pt; color: #475569; padding: 4px 12px 8px 12px;">${profile.contactName ? `Enlace: ${profile.contactName} (${profile.contactPhone || ''})` : 'Instantánea en caché'}</td>
        </tr>
        <tr><td colspan="7" style="height: 14px; padding: 0;"></td></tr>

        <!-- EXECUTIVE SUMMARY CARDS -->
        <tr>
          <td colspan="7" class="summary-title">RESUMEN EJECUTIVO DE SEGURIDAD</td>
        </tr>
        <tr>
          <td colspan="2" align="center" style="border-top: 1px solid #bae6fd; border-left: 1px solid #bae6fd; background-color: #ffffff; font-size: 8pt; color: #64748b; padding: 10px 12px 4px 12px; text-align: center;">TOTAL HOSTS REGISTRADOS</td>
          <td colspan="2" align="center" style="border-top: 1px solid #bae6fd; background-color: #ffffff; font-size: 8pt; color: #64748b; padding: 10px 12px 4px 12px; text-align: center;">LATENCIA MEDIA LAN</td>
          <td colspan="3" align="center" style="border-top: 1px solid #bae6fd; border-right: 1px solid #bae6fd; background-color: #ffffff; font-size: 8pt; color: #64748b; padding: 10px 12px 4px 12px; text-align: center;">NIVEL DE SEGURIDAD GENERAL</td>
        </tr>
        <tr>
          <td colspan="2" align="center" style="border-bottom: 1px solid #bae6fd; border-left: 1px solid #bae6fd; background-color: #ffffff; font-size: 15pt; font-weight: bold; color: #0b1120; padding: 4px 12px 10px 12px; text-align: center;">${totals.totalHosts} Dispositivos</td>
          <td colspan="2" align="center" style="border-bottom: 1px solid #bae6fd; background-color: #ffffff; font-size: 15pt; font-weight: bold; padding: 4px 12px 10px 12px; color: ${totals.avgLatency > 50 ? '#d97706' : '#059669'}; text-align: center;">${totals.avgLatency} ms</td>
          <td colspan="3" align="center" style="border-bottom: 1px solid #bae6fd; border-right: 1px solid #bae6fd; background-color: #ffffff; font-size: 14pt; font-weight: bold; padding: 4px 12px 10px 12px; color: ${totals.safetyScore < 80 ? '#d97706' : '#059669'}; text-align: center;">${totals.safetyScore}% - ${totals.rank.split('(')[0]}</td>
        </tr>
        <tr><td colspan="7" style="height: 14px; padding: 0;"></td></tr>

        <!-- DATA TABLE SECTION TITLE -->
        <tr>
          <td colspan="7" class="table-header-title">DIRECCIONES IP SONDEADAS CON DIRECCIÓN MAC Y UBICACIÓN ASOCIADA</td>
        </tr>
        <tr><td colspan="7" style="height: 4px; padding: 0;"></td></tr>

        <!-- DATA TABLE HEADERS -->
        <tr>
          <th align="left" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px;">DIRECCIÓN IP</th>
          <th align="left" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px;">DIRECCIÓN MAC</th>
          <th align="left" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px;">UBICACIÓN FÍSICA</th>
          <th align="left" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px;">FABRICANTE NIC</th>
          <th align="left" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px;">ESTACIÓN / HOST</th>
          <th align="center" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #1e293b; padding: 8px 10px;">LATENCIA</th>
          <th align="center" bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8pt; text-align: center; border: 1px solid #1e293b; padding: 8px 10px;">ESTADO</th>
        </tr>
        ${devices.map((d, index) => {
          const isAlternate = index % 2 === 1;
          const rowBg = isAlternate ? '#f8fafc' : '#ffffff';
          const manufacturer = d.vendor && d.vendor !== 'Desconocido' ? d.vendor : resolveVendorByMac(d.mac, d.host, d.ip);
          const friendlyHost = resolveDeviceNameByMac(d.mac, d.host, d.ip);
          const statusBg = d.estado === 'OK' ? '#d1fae5' : d.estado === 'Advertencia' ? '#fef3c7' : '#ffe4e6';
          const statusColor = d.estado === 'OK' ? '#059669' : d.estado === 'Advertencia' ? '#d97706' : '#e11d48';

          return `
            <tr style="background-color: ${rowBg};">
              <td style="border: 1px solid #e2e8f0; font-weight: bold; color: #006699; font-size: 8pt;">${d.ip}</td>
              <td style="border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #334155; font-size: 8pt;">${d.mac || '—'}</td>
              <td style="border: 1px solid #e2e8f0; color: #d97706; font-weight: bold; font-size: 7.5pt;">${d.ubicacion || profile.name}</td>
              <td style="border: 1px solid #e2e8f0; color: #475569; font-size: 7.5pt;">${manufacturer}</td>
              <td style="border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; font-size: 7.5pt;">${friendlyHost}</td>
              <td align="center" style="border: 1px solid #e2e8f0; font-weight: bold; font-size: 8pt; text-align: center; color: ${d.ping && d.ping > 100 ? '#d97706' : '#059669'};">${d.ping !== null ? `${d.ping} ms` : '—'}</td>
              <td align="center" style="border: 1px solid #e2e8f0; font-weight: bold; font-size: 7.5pt; text-align: center;">
                <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 3px; font-weight: bold;">
                  ${d.estado || 'Caído'}
                </span>
              </td>
            </tr>
          `;
        }).join('')}

        <tr><td colspan="7" style="height: 14px; padding: 0;"></td></tr>

        <!-- DECLARATION -->
        <tr>
          <td colspan="7" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 8pt; color: #475569; padding: 10px 12px;">
            <strong>DECLARACIÓN DE VALIDACIÓN Y AUDITORÍA OFFLINE:</strong> El presente reporte describe el inventario registrado en la sede "${profile.name}". Las asignaciones fueron compiladas mediante escaneo y preservadas en caché.
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td colspan="7" align="center" style="text-align: center; font-size: 8pt; color: #64748b; padding-top: 14px;">
            RedMonitor — Reporte de Auditoría LAN (Sede Offline) | Generación: ${timestamp}
          </td>
        </tr>
        <tr>
          <td colspan="7" align="center" style="text-align: center; font-size: 8pt; color: #334155; font-weight: bold; padding-bottom: 10px;">
            Diseñado y programado por ASNEIDER ZAPATA
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  link.download = `auditoria_offline_${safeName}_${formattedDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports offline profile devices to CSV.
 */
export function exportOfflineLocationCSV(profile: LocationProfile): void {
  let csv = "data:text/csv;charset=utf-8,";
  csv += "IP_Address,HostName,Physical_Location_Ubicacion,MAC_Address,Manufacturer_Vendor,Ping_Latency_ms,Status,Physical_Segment,Interface,Gateway,DNS\r\n";

  const devices = profile.devices || [];
  devices.forEach(d => {
    const row = [
      d.ip,
      `"${resolveDeviceNameByMac(d.mac, d.host, d.ip).replace(/"/g, '""')}"`,
      `"${(d.ubicacion || profile.name).replace(/"/g, '""')}"`,
      d.mac || '—',
      `"${(d.vendor || resolveVendorByMac(d.mac, d.host, d.ip)).replace(/"/g, '""')}"`,
      d.ping !== null ? d.ping : "—",
      d.estado || 'Caído',
      profile.subnet || "—",
      `"${(profile.interfaceName || "—").replace(/"/g, '""')}"`,
      profile.gateway || "—",
      profile.dns || "—"
    ].join(",");
    csv += row + "\r\n";
  });

  const encodedUri = encodeURI(csv);
  const link = document.createElement('a');
  link.setAttribute("href", encodedUri);
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  link.setAttribute("download", `tabla_dispositivos_offline_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports structured technical JSON audit report matching NetworkAudit format.
 */
export function exportOfflineLocationJSON(profile: LocationProfile): void {
  const totals = calculateLocationTotals(profile);
  const devices = profile.devices || [];

  const reportData = {
    titulo: `Auditoría de Infraestructura y Dispositivos de Red - Sede Offline: ${profile.name}`,
    fecha: new Date().toLocaleString('es-ES'),
    auditor: "Consola Administrativa RedMonitor v1.0",
    perfilSede: {
      id: profile.id,
      nombre: profile.name,
      departamento: profile.department || 'General',
      subredCIDR: profile.subnet,
      gateway: profile.gateway,
      dns: profile.dns,
      interfazLocal: profile.interfaceName,
      contactoOnSite: profile.contactName,
      telefonoContacto: profile.contactPhone,
      notasSeguridad: profile.securityNotes,
      fechaCaptura: profile.createdAt
    },
    resumenMetrico: {
      totalDispositivosRegistrados: totals.totalHosts,
      dispositivosConectadosOk: totals.okHosts,
      dispositivosAdvertencia: totals.warnHosts,
      dispositivosCaidos: totals.downHosts,
      latenciaPromedioMs: totals.avgLatency,
      nivelSeguridadLAN: `${totals.safetyScore}%`,
      rangoSeguridad: totals.rank
    },
    dispositivosMapeados: devices.map(d => ({
      id: d.id,
      ip: d.ip,
      host: resolveDeviceNameByMac(d.mac, d.host, d.ip),
      ubicacionFisica: d.ubicacion || profile.name,
      mac: d.mac,
      fabricanteResolucion: d.vendor || resolveVendorByMac(d.mac, d.host, d.ip),
      pingMs: d.ping,
      estadoRed: d.estado,
      interfazAsignada: profile.interfaceName || '—',
      segmentoFisico: profile.subnet || '—'
    }))
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  link.download = `auditoria_offline_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds formatted Markdown audit report for clipboard copy.
 */
export function generateOfflineLocationMarkdown(profile: LocationProfile): string {
  const totals = calculateLocationTotals(profile);
  const devices = profile.devices || [];

  let md = `# REPORTE DE AUDITORÍA DE RED LAN — SEDE OFFLINE: ${profile.name.toUpperCase()}\n`;
  md += `Generado por: **RedMonitor Admin Sonda**  \n`;
  md += `Fecha de Emisión: \`${new Date().toLocaleString('es-ES')}\`  \n`;
  md += `Subred CIDR: \`${profile.subnet}\` | Gateway: \`${profile.gateway || '—'}\` | DNS: \`${profile.dns || '—'}\`  \n`;
  if (profile.department) md += `Departamento: **${profile.department}**  \n`;
  if (profile.contactName) md += `Contacto On-Site: **${profile.contactName}** (${profile.contactPhone || 'Sin teléfono'})\n`;
  md += `\n---\n\n`;

  md += `## 📊 RESUMEN EJECUTIVO DE SEGURIDAD\n`;
  md += `- **Total Hosts Registrados**: ${totals.totalHosts} dispositivos mapeados.\n`;
  md += `- **Dispositivos Conectados (OK)**: ${totals.okHosts}\n`;
  md += `- **Alertas / Advertencias**: ${totals.warnHosts} hosts con latencias anómalas.\n`;
  md += `- **Fuera de Línea (Caídos)**: ${totals.downHosts} dispositivos.\n`;
  md += `- **Latencia Local Media**: ${totals.avgLatency} ms\n`;
  md += `- **Nivel de Seguridad de Red**: **[ ${totals.safetyScore}% ]** - *${totals.rank}*\n\n`;

  if (profile.securityNotes) {
    md += `> 🔒 **Notas de Seguridad Física y Acceso:**\n> ${profile.securityNotes}\n\n`;
  }

  md += `--- \n\n`;
  md += `## 🖥️ INVENTARIO DE HOSTS Y ADAPTADORES DE HARDWARE\n\n`;
  md += `| Dirección IP | Nombre de Host | Ubicación | Dirección MAC | Fabricante (ARP) | Latencia | Estado |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  devices.forEach(d => {
    const hostName = resolveDeviceNameByMac(d.mac, d.host, d.ip);
    const vendor = d.vendor && d.vendor !== 'Desconocido' ? d.vendor : resolveVendorByMac(d.mac, d.host, d.ip);
    md += `| ${d.ip} | ${hostName} | ${d.ubicacion || profile.name} | \`${d.mac || '—'}\` | ${vendor} | ${d.ping !== null ? `${d.ping} ms` : '—'} | ${d.estado || 'Caído'} |\n`;
  });

  md += `\n*Nota: Reporte compilado a partir de la instantánea física preservada en almacenamiento local RedMonitor.*`;
  return md;
}

/**
 * Generates a consolidated multi-branch audit report in PDF for all offline locations.
 */
export async function exportConsolidatedOfflinePDF(profiles: LocationProfile[]): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [11, 17, 32];
  const accentColor = [6, 182, 212];
  const successColor = [16, 185, 129];
  const warningColor = [245, 158, 11];
  const lightBg = [248, 250, 252];
  const textColorSecondary = [71, 85, 105];

  // Aggregated totals
  let totalHostsAll = 0;
  let totalOkAll = 0;
  let totalWarnAll = 0;
  let totalDownAll = 0;
  let sumLatency = 0;
  let countLatency = 0;

  profiles.forEach(p => {
    const t = calculateLocationTotals(p);
    totalHostsAll += t.totalHosts;
    totalOkAll += t.okHosts;
    totalWarnAll += t.warnHosts;
    totalDownAll += t.downHosts;
    if (t.avgLatency > 0) {
      sumLatency += t.avgLatency;
      countLatency++;
    }
  });

  const globalAvgLatency = countLatency > 0 ? Math.round(sumLatency / countLatency) : 0;
  const globalSafety = Math.max(10, 100 - (totalWarnAll * 5) - (totalDownAll * 8));

  const drawHeader = (pageNo: number) => {
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); 
    doc.text("SISTEMA DE MONITOREO DE RED - REDMONITOR", 10, 10);
    doc.text("INFORME CONSOLIDADO MULTI-SEDE (OFFLINE)", 200, 10, { align: 'right' });

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.3);
    doc.line(10, 12, 200, 12);
  };

  const drawFooter = (pageNo: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(10, 281, 200, 281);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); 
    doc.text("RedMonitor — Auditoría Consolidada de Sedes Offline", 10, 285.5);
    doc.text(`Generación: ${new Date().toLocaleString('es-ES')}`, 10, 289);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); 
    doc.text("Diseñado y programado por ASNEIDER ZAPATA", 105, 287, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); 
    doc.text(`Página ${pageNo}`, 200, 287, { align: 'right' });
  };

  let pageCount = 1;
  drawHeader(pageCount);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("AUDITORÍA CONSOLIDADA MULTI-SEDE LAN", 10, 22);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text(`Consolidado Ejecutivo de ${profiles.length} Sedes Offline Registradas e Infraestructura Global`, 10, 27);

  // Global Cards
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(0.3);
  doc.rect(10, 31, 190, 22, 'F');
  doc.rect(10, 31, 190, 22, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("SEDES REGISTRADAS", 15, 37);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${profiles.length} Sucursales`, 15, 46);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("TOTAL DISPOSITIVOS L2/L3", 65, 37);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${totalHostsAll} Hosts (${totalOkAll} OK)`, 65, 46);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("LATENCIA MEDIA GLOBAL", 125, 37);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(globalAvgLatency > 50 ? warningColor[0] : successColor[0], globalAvgLatency > 50 ? warningColor[1] : successColor[1], globalAvgLatency > 50 ? warningColor[2] : successColor[2]);
  doc.text(`${globalAvgLatency} ms`, 125, 46);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
  doc.text("SALUD DE RED GLOBAL", 168, 37);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(globalSafety < 80 ? warningColor[0] : successColor[0], globalSafety < 80 ? warningColor[1] : successColor[1], globalSafety < 80 ? warningColor[2] : successColor[2]);
  doc.text(`${globalSafety}%`, 168, 46);

  // Table of Branches
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("DESGLOSE GENERAL POR SEDE FÍSICA", 10, 60);

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(10, 64, 190, 8, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("SEDE / NOMBRE", 12, 69.5);
  doc.text("SUBRED CIDR", 60, 69.5);
  doc.text("DEPARTAMENTO", 95, 69.5);
  doc.text("TOTAL HOSTS", 132, 69.5);
  doc.text("LATENCIA", 160, 69.5);
  doc.text("SCORE", 182, 69.5);

  let y = 72;
  profiles.forEach((p, idx) => {
    const t = calculateLocationTotals(p);
    const isAlt = idx % 2 === 1;

    if (isAlt) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(10, y, 190, 7.5, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(10, y + 7.5, 200, y + 7.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 102, 153);
    const pName = p.name.length > 25 ? p.name.substring(0, 23) + '...' : p.name;
    doc.text(pName, 12, y + 4.8);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(p.subnet || '—', 60, y + 4.8);

    const dept = p.department || 'General';
    doc.text(dept.length > 18 ? dept.substring(0, 16) + '...' : dept, 95, y + 4.8);

    doc.setFont('Helvetica', 'bold');
    doc.text(`${t.totalHosts} (${t.okHosts} OK)`, 132, y + 4.8);

    doc.text(`${t.avgLatency} ms`, 160, y + 4.8);

    doc.setTextColor(t.safetyScore < 80 ? warningColor[0] : successColor[0], t.safetyScore < 80 ? warningColor[1] : successColor[1], t.safetyScore < 80 ? warningColor[2] : successColor[2]);
    doc.text(`${t.safetyScore}%`, 182, y + 4.8);

    y += 7.5;
  });

  drawFooter(pageCount);

  const formattedDate = new Date().toISOString().split('T')[0];
  doc.save(`auditoria_consolidada_multi_sede_${formattedDate}.pdf`);
}

/**
 * Exports consolidated multi-branch audit spreadsheet in Excel (.xls).
 */
export async function exportConsolidatedOfflineExcel(profiles: LocationProfile[]): Promise<void> {
  const formattedDate = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString('es-ES');

  let totalHostsAll = 0;
  let totalOkAll = 0;
  let totalWarnAll = 0;
  let totalDownAll = 0;

  profiles.forEach(p => {
    const t = calculateLocationTotals(p);
    totalHostsAll += t.totalHosts;
    totalOkAll += t.okHosts;
    totalWarnAll += t.warnHosts;
    totalDownAll += t.downHosts;
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Helvetica, Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 8px 10px; font-size: 8.5pt; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="7" bgcolor="#06b6d4" style="background-color: #06b6d4; height: 5px;"></td>
        </tr>
        <tr>
          <td colspan="7" style="font-size: 16pt; font-weight: bold; color: #0b1120;">REPORTE CONSOLIDADO MULTI-SEDE OFFLINE</td>
        </tr>
        <tr>
          <td colspan="7" style="color: #64748b; font-size: 8.5pt;">Total Sedes: ${profiles.length} | Hosts Totales: ${totalHostsAll} (${totalOkAll} OK, ${totalDownAll} Caídos) | Fecha: ${timestamp}</td>
        </tr>
        <tr><td colspan="7" style="height: 10px;"></td></tr>

        <tr bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold;">
          <th>Sede / Ubicación</th>
          <th>Subred CIDR</th>
          <th>Gateway</th>
          <th>Departamento</th>
          <th>Hosts Registrados</th>
          <th>Latencia Media</th>
          <th>Puntaje Seguridad</th>
        </tr>

        ${profiles.map((p, idx) => {
          const t = calculateLocationTotals(p);
          const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
          return `
            <tr bgcolor="${bg}">
              <td style="font-weight: bold; color: #006699;">${p.name}</td>
              <td style="font-family: monospace;">${p.subnet}</td>
              <td style="font-family: monospace;">${p.gateway || '—'}</td>
              <td>${p.department || 'General'}</td>
              <td style="font-weight: bold;">${t.totalHosts} (${t.okHosts} OK, ${t.downHosts} Caídos)</td>
              <td>${t.avgLatency} ms</td>
              <td style="font-weight: bold; color: ${t.safetyScore < 80 ? '#d97706' : '#059669'};">${t.safetyScore}% - ${t.rank.split('(')[0]}</td>
            </tr>
          `;
        }).join('')}

        <tr><td colspan="7" style="height: 20px;"></td></tr>
        <tr>
          <td colspan="7" style="font-size: 13pt; font-weight: bold; color: #0b1120;">INVENTARIO DETALLADO DE HOSTS POR SEDE</td>
        </tr>
        <tr bgcolor="#0b1120" style="background-color: #0b1120; color: #ffffff; font-weight: bold;">
          <th>Sede</th>
          <th>Dirección IP</th>
          <th>Dirección MAC</th>
          <th>Fabricante</th>
          <th>Host / Estación</th>
          <th>Latencia</th>
          <th>Estado</th>
        </tr>

        ${profiles.flatMap(p => (p.devices || []).map(d => `
          <tr>
            <td style="color: #d97706; font-weight: bold;">${p.name}</td>
            <td style="font-weight: bold; color: #006699;">${d.ip}</td>
            <td style="font-family: monospace;">${d.mac || '—'}</td>
            <td>${d.vendor || resolveVendorByMac(d.mac, d.host, d.ip)}</td>
            <td style="font-weight: bold;">${resolveDeviceNameByMac(d.mac, d.host, d.ip)}</td>
            <td>${d.ping !== null ? `${d.ping} ms` : '—'}</td>
            <td style="font-weight: bold; color: ${d.estado === 'OK' ? '#059669' : '#d97706'};">${d.estado || 'Caído'}</td>
          </tr>
        `)).join('')}

        <tr><td colspan="7" style="height: 14px;"></td></tr>
        <tr>
          <td colspan="7" align="center" style="text-align: center; font-size: 8pt; color: #334155; font-weight: bold;">
            Diseñado y programado por ASNEIDER ZAPATA — RedMonitor Enterprise
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `auditoria_consolidada_multi_sede_${formattedDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports consolidated multi-branch CSV.
 */
export function exportConsolidatedOfflineCSV(profiles: LocationProfile[]): void {
  let csv = "data:text/csv;charset=utf-8,";
  csv += "Sede_Ubicacion,Departamento,Subred_CIDR,IP_Address,HostName,MAC_Address,Manufacturer_Vendor,Ping_Latency_ms,Status\r\n";

  profiles.forEach(p => {
    (p.devices || []).forEach(d => {
      const row = [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.department || 'General').replace(/"/g, '""')}"`,
        p.subnet || '—',
        d.ip,
        `"${resolveDeviceNameByMac(d.mac, d.host, d.ip).replace(/"/g, '""')}"`,
        d.mac || '—',
        `"${(d.vendor || resolveVendorByMac(d.mac, d.host, d.ip)).replace(/"/g, '""')}"`,
        d.ping !== null ? d.ping : "—",
        d.estado || 'Caído'
      ].join(",");
      csv += row + "\r\n";
    });
  });

  const encodedUri = encodeURI(csv);
  const link = document.createElement('a');
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `auditoria_consolidada_multi_sede_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
