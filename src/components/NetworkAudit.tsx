import React, { useState, useMemo } from 'react';
import { Device } from '../types';
import { 
  ShieldCheck, ShieldAlert, Download, FileJson, FileSpreadsheet, Copy, 
  Search, Sliders, Server, Wifi, Activity, Terminal, CheckCircle2, AlertTriangle, Info, Network
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { resolveVendorByMac } from '../utils/macUtils';

interface NetworkAuditProps {
  devices: Device[];
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  locationName: string;
}

export default function NetworkAudit({ devices, onAddLog, locationName }: NetworkAuditProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState('all');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Consider only active devices or warning devices
  const activeDevices = useMemo(() => {
    return devices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia');
  }, [devices]);

  // Compute distinct list of segments among active devices
  const activeSegments = useMemo(() => {
    const list = new Set<string>();
    devices.forEach(d => {
      if (d.segmento) list.add(d.segmento);
    });
    return Array.from(list);
  }, [devices]);

  // Filters
  const filteredDevices = useMemo(() => {
    return activeDevices.filter(d => {
      const matchSearch = d.host.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.ip.includes(searchTerm) || 
                          d.mac.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSegment = filterSegment === 'all' || d.segmento === filterSegment;
      return matchSearch && matchSegment;
    });
  }, [activeDevices, searchTerm, filterSegment]);

  // Calculations for Audit Report Card
  const totals = useMemo(() => {
    const count = activeDevices.length;
    const warnings = activeDevices.filter(d => d.estado === 'Advertencia').length;
    const latencyList = activeDevices.map(d => d.ping || 0).filter(p => p > 0);
    const avgLatency = latencyList.length > 0 
      ? Math.round(latencyList.reduce((acc, current) => acc + current, 0) / latencyList.length) 
      : 0;

    let safetyScore = 100;
    let rank = 'CONFIABLE (EXCELENTE)';
    let rankColor = 'text-emerald-400';

    // Deduce safety points
    safetyScore -= warnings * 10;
    const hasUnrecognizedMac = activeDevices.some(d => d.mac === '—' || d.mac === '00:00:00:00:00:00');
    if (hasUnrecognizedMac) safetyScore -= 15;

    const highlatencyCount = activeDevices.filter(d => (d.ping || 0) > 100).length;
    safetyScore -= highlatencyCount * 5;

    if (safetyScore < 60) {
      rank = 'RIESGO CRÍTICO DETECTADO / ACCIONES PENDIENTES';
      rankColor = 'text-rose-500';
    } else if (safetyScore < 85) {
      rank = 'SITUACIÓN CONTROLADA / REQUIERE ATENCIÓN';
      rankColor = 'text-amber-400';
    }

    return {
      count,
      warnings,
      avgLatency,
      score: Math.max(safetyScore, 10),
      rank,
      rankColor
    };
  }, [activeDevices]);

  // EXPORT 1: JSON REPORT
  const exportAsJSON = () => {
    const reportData = {
      titulo: "Auditoría de Infraestructura y Dispositivos de Red",
      fecha: new Date().toLocaleString('es-ES'),
      auditor: "Consola Administrativa RedMonitor v1.0",
      resumenMetrico: {
        totalDispositivosActivos: totals.count,
        dispositivosAdvertencia: totals.warnings,
        latenciaPromedioMs: totals.avgLatency,
        nivelSeguridadLAN: `${totals.score}%`,
        rangoSeguridad: totals.rank
      },
      dispositivosMapeados: activeDevices.map(d => ({
        id: d.id,
        ip: d.ip,
        host: d.host,
        mac: d.mac,
        fabricanteResolucion: resolveVendorByMac(d.mac, d.host, d.ip),
        pingMs: d.ping,
        estadoRed: d.estado,
        interfazAsignada: d.interfaz || '—',
        segmentoFisico: d.segmento || '—',
        consumoBajadaMbps: d.consumoDownload,
        consumoSubidaMbps: d.consumoUpload
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_red_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddLog(`📋 Reporte de auditoría de red exportado exitosamente en formato JSON.`, 'success');
  };

  // EXPORT 2: CSV TABLE EXPORT
  const exportAsCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "IP_Address,HostName,MAC_Address,Manufacturer_Vendor,Ping_Latency_ms,Status,Physical_Segment,Interface\r\n";

    activeDevices.forEach(d => {
      const row = [
        d.ip,
        `"${d.host.replace(/"/g, '""')}"`,
        d.mac,
        `"${resolveVendorByMac(d.mac, d.host, d.ip).replace(/"/g, '""')}"`,
        d.ping !== null ? d.ping : "—",
        d.estado,
        d.segmento || "—",
        `"${(d.interfaz || "—").replace(/"/g, '""')}"`
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tabla_dispositivos_lan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog(`📋 Tabla técnica de auditoría de red exportada exitosamente en formato CSV (Excel).`, 'success');
  };

  // EXPORT 3: MARKDOWN COPY TO CLIPBOARD
  const copyAsMarkdown = () => {
    let md = `# REPORTE DE SEGURIDAD Y AUDITORÍA DE RED LAN
Generado por: **RedMonitor Admin Sonda**  
Fecha: \`${new Date().toLocaleString('es-ES')}\`  

---

## 📊 RESUMEN EJECUTIVO
- **Total Hosts Activos**: ${totals.count} dispositivos con dirección IP asociada.
- **Alertas / Advertencias**: ${totals.warnings} hosts con latencias anómalas o sobreconsumo.
- **Latencia Local Media**: ${totals.avgLatency} ms  
- **Resultado General**: **Nivel de seguridad de red: [ ${totals.score}% ]** - *${totals.rank}*

---

## 🖥️ DETALLE DE HOSTS ACTIVOS ENCONTRADOS (CON DIRECCIÓN MAC)

| Dirección IP | Nombre de Host / Estación | Dirección MAC | Fabricante (Filtro ARP) | Latencia | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

    activeDevices.forEach(d => {
      md += `| ${d.ip} | ${d.host} | \`${d.mac}\` | ${resolveVendorByMac(d.mac, d.host, d.ip)} | ${d.ping !== null ? `${d.ping} ms` : '—'} | ${d.estado} |\n`;
    });

    md += `\n*Nota: Reporte compilado en base a barrido de tramas ARP en Loopback de adaptadores de red de hardware disponibles.*`;

    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);

    onAddLog(`📋 Reporte de auditoría estructurado en Markdown copiado al portapapeles del sistema.`, 'info');
  };

  const exportAsPDF = () => {
    onAddLog("📄 Compilando reporte de auditoría en formato PDF...", "info");
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [11, 17, 32]; 
      const accentColor = [6, 182, 212];  
      const successColor = [16, 185, 129]; 
      const warningColor = [245, 158, 11]; 
      const textColorPrimary = [15, 23, 42]; 
      const textColorSecondary = [71, 85, 105]; 
      const lightBg = [248, 250, 252]; 
      const borderLineColor = [226, 232, 240]; 

      const drawHeader = (pageNo: number) => {
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, 210, 4, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); 
        doc.text("SISTEMA DE MONITOREO DE RED - REDMONITOR", 10, 10);
        doc.text("AUDITORÍA DE INFRAESTRUCTURA LAN", 200, 10, { align: 'right' });

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
        doc.text("RedMonitor — Reporte de Auditoría LAN", 10, 285.5);
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

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("INFORME DE AUDITORÍA DE RED FÍSICA", 10, 22);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      doc.text("Sondeo y Validación de Interfaces Físicas, Direcciones MAC y Latencia LAN", 10, 27);

      // Redesigned Dual-Panel Metadata Section for maximum visibility and zero encoding issues
      // Panel 1: Sonda & Technical Details (Left)
      doc.setFillColor(248, 250, 252); // soft slate background
      doc.rect(10, 31, 92, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.rect(10, 31, 92, 22, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("SISTEMA / DETALLES DE AUDITORÍA", 14, 36);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Sonda: RedMonitor Sonda de Campo Local`, 14, 41.5);
      doc.text(`ID Dispositivo: RED-MON-162BF909`, 14, 45.5);
      doc.text(`Fecha/Hora: ${new Date().toLocaleString('es-ES')}`, 14, 49.5);

      // Panel 2: UBICACIÓN Y SEDE DE REGISTRO (Right) - Highly prominent with cyan accent
      doc.setFillColor(236, 254, 255); // very light cyan background (cyan-50)
      doc.rect(106, 31, 94, 22, 'F');
      doc.setDrawColor(6, 182, 212); // cyan-500 accent color border
      doc.setLineWidth(0.5); // thicker border for accent
      doc.rect(106, 31, 94, 22, 'S');

      // Decorative cyan side bar
      doc.setFillColor(6, 182, 212);
      doc.rect(106, 31, 2.5, 22, 'F'); // draw a nice left vertical line accent

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(8, 115, 137); // deep cyan/teal for text label
      doc.text("SITIO / UBICACIÓN REGISTRADA", 111, 36.5);

      // Render the locationName prominently in uppercase
      const displayLoc = (locationName || 'Sede Local / No Registrada').trim().toUpperCase();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // deep dark text for ultimate contrast
      doc.text(displayLoc, 111, 44);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Verificación en campo físico activo", 111, 48.5);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("RESUMEN EJECUTIVO DE SEGURIDAD", 10, 56);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(186, 230, 253); 
      doc.setLineWidth(0.3);
      doc.rect(10, 59, 190, 24, 'F');
      doc.rect(10, 59, 190, 24, 'S');

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      doc.text("TOTAL HOSTS ACTIVOS", 15, 66);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${totals.count} Dispositivos`, 15, 75);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      doc.text("LATENCIA MEDIA LAN", 80, 66);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(totals.avgLatency > 50 ? warningColor[0] : successColor[0], totals.avgLatency > 50 ? warningColor[1] : successColor[1], totals.avgLatency > 50 ? warningColor[2] : successColor[2]);
      doc.text(`${totals.avgLatency} ms`, 80, 75);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      doc.text("NIVEL DE SEGURIDAD GENERAL", 135, 66);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(totals.score < 80 ? warningColor[0] : successColor[0], totals.score < 80 ? warningColor[1] : successColor[1], totals.score < 80 ? warningColor[2] : successColor[2]);
      doc.text(`${totals.score}% - ${totals.rank.split('(')[0]}`, 135, 75);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("DIRECCIONES IP SONDEADAS CON DIRECCIÓN MAC ASOCIADA", 10, 92);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, 96, 190, 8, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("DIRECCIÓN IP", 12, 101.5);
      doc.text("DIRECCIÓN MAC", 35, 101.5);
      doc.text("Nº SERIE HARDWARE", 68, 101.5);
      doc.text("FABRICANTE NIC", 98, 101.5);
      doc.text("ESTACIÓN / HOST", 128, 101.5);
      doc.text("LATENCIA", 165, 101.5);
      doc.text("ESTADO", 182, 101.5);

      let y = 104;
      activeDevices.forEach((device, index) => {
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

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 102, 153); 
        doc.text(device.ip, 12, y + 4.8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85); 
        doc.text(device.mac, 35, y + 4.8);

        // Nº Serie (High visibility!)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9); // amber-700 color for nice contrast
        doc.text(device.serialNumber || 'SN-UNKNOWN', 68, y + 4.8);

        const manufacturerRaw = resolveVendorByMac(device.mac, device.host, device.ip);
        let manufacturer = manufacturerRaw.length > 18 ? manufacturerRaw.substring(0, 16) + '...' : manufacturerRaw;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
        doc.text(manufacturer, 98, y + 4.8);

        let friendlyHostName = device.host.length > 20 ? device.host.substring(0, 18) + '...' : device.host;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(friendlyHostName, 128, y + 4.8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(device.ping && device.ping > 100 ? warningColor[0] : successColor[0], device.ping && device.ping > 100 ? warningColor[1] : successColor[1], device.ping && device.ping > 100 ? warningColor[2] : successColor[2]);
        const pingLabel = device.ping !== null ? `${device.ping} ms` : '—';
        doc.text(pingLabel, 165, y + 4.8);

        if (device.estado === 'OK') {
          doc.setFillColor(209, 250, 229); 
          doc.rect(180, y + 1.5, 12, 4.5, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(5, 150, 105); 
          doc.text("OK", 186, y + 4.7, { align: 'center' });
        } else {
          doc.setFillColor(254, 243, 199); 
          doc.rect(180, y + 1.5, 12, 4.5, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(217, 119, 6); 
          doc.text("WARN", 186, y + 4.7, { align: 'center' });
        }

        y += 7.5;

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
          doc.text("Nº SERIE HARDWARE", 68, 23.5);
          doc.text("FABRICANTE NIC", 98, 23.5);
          doc.text("ESTACIÓN / HOST", 128, 23.5);
          doc.text("LATENCIA", 165, 23.5);
          doc.text("ESTADO", 182, 23.5);

          y = 26; 
        }
      });

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
      doc.text("DECLARACIÓN DE VALIDACIÓN Y CONTROL DE AUDITORÍA", 14, y + 12);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
      const note1 = "El presente reporte describe el estado actual de los dispositivos activos en la red LAN local.";
      const note2 = "Las asignaciones MAC-IP fueron recolectadas a través del protocolo ARP nativo de los adaptadores activos.";
      doc.text(note1, 14, y + 17);
      doc.text(note2, 14, y + 21);

      drawFooter(pageCount);

      const formattedDate = new Date().toISOString().split('T')[0];
      doc.save(`auditoria_seguridad_red_${formattedDate}.pdf`);

      onAddLog("🏆 Reporte en PDF compilado y descargado exitosamente. Sello oficial de RedMonitor asignado.", "success");
    } catch (e: any) {
      console.error(e);
      onAddLog(`❌ Error al generar el PDF: ${e.message || e}`, "error");
    }
  };

  return (
    <div className="space-y-4" id="network-audit-view">
      
      {/* LOCALIZACIÓN DE LA AUDITORÍA */}
      <div className="bg-[#0f172a]/90 border border-cyan-500/10 p-3.5 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/20">
            <span className="text-base text-cyan-400">📍</span>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-wider">Ubicación Registrada de Pruebas</div>
            <div className="text-xs font-bold text-slate-200">
              {locationName ? locationName : "No registrada / Local"}
            </div>
          </div>
        </div>
      </div>

      {/* HEADER CARD */}
      <div className="bg-[#0B1120]/40 border border-slate-800/80 p-3.5 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#22d3ee] font-mono flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> AUDITORÍA DE RED Y EXPORTADOR MÉTRICO
          </span>
          <h2 className="text-sm font-bold text-slate-200">Sistemas de Diagnóstico y Emisión de Reportes de Cumplimiento</h2>
          <p className="text-[11px] text-slate-500 font-sans">
            Compruebe el direccionamiento MAC de los hosts activos, deduzca marcas y fabricantes de tarjetas NIC en tiempo de ejecución, y exporte auditorías oficiales de red.
          </p>
        </div>

        {/* TOP COMPILING TRIGGER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={copyAsMarkdown}
            className="bg-slate-900 hover:bg-slate-800/60 active:scale-95 text-slate-300 font-semibold py-1.5 px-3 rounded-xs border border-slate-800 text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Copiar reporte Markdown completo para email o documentación"
          >
            <Copy className="h-3.5 w-3.5 text-cyan-400" />
            <span>{copiedMarkdown ? '¡Markdown Copiado!' : 'Copiar Markdown'}</span>
          </button>

          <button
            onClick={exportAsPDF}
            className="bg-rose-900/40 hover:bg-rose-800 text-rose-200 hover:text-white font-bold py-1.5 px-3 rounded-xs border border-rose-850 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Exportar base de datos a un reporte PDF impreso formal"
          >
            <Download className="h-3.5 w-3.5 text-rose-450" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={exportAsCSV}
            className="bg-slate-900 hover:bg-[#1e293b] active:scale-95 text-slate-300 font-bold py-1.5 px-3 rounded-xs border border-slate-800 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Exportar base de datos a formato CSV compatible con Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={exportAsJSON}
            className="bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold py-1.5 px-3 rounded-xs text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Guardar archivo JSON con metadatos estructurados"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* CORE SUMMARY STATS WIDGET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Nivel de Seguridad Shield */}
        <div className="bg-slate-900/50 p-4 border border-slate-800 hover:border-slate-800/30 rounded-md flex items-center gap-4 transition-all">
          <div className="p-3 bg-cyan-950/20 text-cyan-405 border border-cyan-800/20 text-cyan-400 rounded-sm shrink-0">
            {totals.score > 80 ? (
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-7 w-7" />
            )}
          </div>
          <div className="text-left leading-tight">
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold leading-none mb-1">Índice de Seguridad LAN</span>
            <div className="text-xl font-black text-slate-100 font-mono">
              {totals.score} %
            </div>
            <span className={`text-[9px] font-semibold uppercase ${totals.rankColor}`}>
              {totals.rank}
            </span>
          </div>
        </div>

        {/* Total Direcciones MAC resolubles */}
        <div className="bg-slate-900/50 p-4 border border-slate-800 hover:border-slate-800/30 rounded-md flex items-center gap-4 transition-all">
          <div className="p-3 bg-amber-955/20 text-amber-500/20 text-amber-400 border border-amber-950 rounded-sm shrink-0">
            <Terminal className="h-7 w-7" />
          </div>
          <div className="text-left leading-tight">
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold leading-none mb-1">Direcciones MAC de IPs Conectadas</span>
            <div className="text-xl font-black text-slate-200 font-mono">
              {activeDevices.filter(d => d.mac !== '—' && d.mac !== '00:00:00:00:00:00').length} / {totals.count} Resolubles
            </div>
            <span className="text-[9.5px] text-slate-400 font-sans">
              Asociación mediante tabla ARP local del kernel.
            </span>
          </div>
        </div>

        {/* Sonda General */}
        <div className="bg-slate-900/50 p-4 border border-slate-800 hover:border-slate-800/30 rounded-md flex items-center gap-4 transition-all">
          <div className="p-3 bg-purple-950/20 text-purple-400 border border-purple-900 rounded-sm shrink-0">
            <Network className="h-7 w-7" />
          </div>
          <div className="text-left leading-tight">
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold leading-none mb-1">Segmentos Activos Barridos</span>
            <div className="text-xl font-black text-slate-200 font-mono">
              {activeSegments.length} Subredes
            </div>
            <span className="text-[9.5px] text-slate-400 font-sans">
              Gateway preestablecido mapeando respuestas.
            </span>
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-slate-900/30 p-3 rounded-md border border-slate-800/50 flex flex-col sm:flex-row items-center gap-3 justify-between">
        
        {/* Search Field */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por IP, MAC o Host..."
            className="w-full bg-slate-950 text-slate-200 border border-slate-800/50 rounded pl-8 pr-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-cyan-500 font-sans"
          />
        </div>

        {/* Subnet Segment Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Sliders className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Filtro de Segmento:</span>
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="bg-slate-950 border border-slate-800/50 text-slate-350 rounded px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:border-cyan-500"
          >
            <option value="all">Ver Todos los Segmentos</option>
            {activeSegments.map(seg => (
              <option key={seg} value={seg}>{seg}</option>
            ))}
          </select>
        </div>

      </div>

      {/* DETAILED ACTIVE DEVICES COMPILING LIST */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B1120] text-slate-400 text-[10px] font-mono border-b border-slate-800/50 uppercase select-none">
                <th className="p-3">Estado</th>
                <th className="p-3">Dirección IP</th>
                <th className="p-3">Dirección MAC</th>
                <th className="p-3">Número de Serie</th>
                <th className="p-3">Fabricante Resolución (ARP)</th>
                <th className="p-3">Host / Estación</th>
                <th className="p-3">Ping Latencia</th>
                <th className="p-3">Segmento Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 font-sans text-xs text-slate-300">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 italic max-w-sm">
                    No se encontraron dispositivos activos que coincidan con la búsqueda. Intente realizar un escáner de red para poblar la tabla.
                  </td>
                </tr>
              ) : (
                filteredDevices.map(d => {
                  const manufacturer = resolveVendorByMac(d.mac, d.host, d.ip);
                  return (
                    <tr 
                      key={d.id} 
                      className="hover:bg-slate-800/30 transition-colors duration-150 leading-relaxed"
                    >
                      {/* STATUS PILL */}
                      <td className="p-3 select-none">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          d.estado === 'OK' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            d.estado === 'OK' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                          }`} />
                          {d.estado}
                        </span>
                      </td>

                      {/* IP ADDRESS */}
                      <td className="p-3 font-mono text-cyan-400 font-semibold select-all">
                        {d.ip}
                      </td>

                      {/* MAC ADDRESS CLIENT HIGHLIGHTED */}
                      <td className="p-3 font-mono font-semibold tracking-wide text-slate-200 select-all border-l border-slate-800/50 bg-slate-950/20">
                        {d.mac}
                      </td>

                      {/* SERIAL NUMBER */}
                      <td className="p-3 font-mono font-bold tracking-wide text-amber-400 select-all border-l border-slate-800/50 bg-slate-950/20" title="Número de Serie de Hardware">
                        {d.serialNumber || '—'}
                      </td>

                      {/* VENDOR RESOLVED PRESTINE NAME */}
                      <td className="p-3">
                        <span className={`text-[11.5px] font-semibold block ${
                          manufacturer.includes('Docker') ? 'text-purple-400' :
                          manufacturer.includes('Apple') ? 'text-sky-305 text-cyan-400' :
                          manufacturer.includes('Genérica') ? 'text-slate-500' : 'text-slate-300'
                        }`}>
                          {manufacturer}
                        </span>
                      </td>

                      {/* FRIENDLY HOSTNAME */}
                      <td className="p-3 font-medium text-slate-200 font-sans truncate max-w-[170px]" title={d.host}>
                        {d.host}
                      </td>

                      {/* LATENCY */}
                      <td className="p-3 font-mono font-bold">
                        {d.ping !== null ? (
                          <span className={d.ping > 100 ? 'text-amber-500' : 'text-emerald-400'}>
                            {d.ping} ms
                          </span>
                        ) : '—'}
                      </td>

                      {/* SEGMENT SUBNET */}
                      <td className="p-3 font-mono text-[10.5px] text-slate-500 truncate" title={d.segmento}>
                        {d.segmento || '—'}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
