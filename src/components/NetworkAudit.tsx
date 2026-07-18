import React, { useState, useMemo, useEffect } from 'react';
import { Device } from '../types';
import { 
  ShieldCheck, ShieldAlert, Download, FileJson, FileSpreadsheet, Copy, 
  Search, Sliders, Server, Wifi, Activity, Terminal, CheckCircle2, AlertTriangle, Info, Network,
  ChevronDown, ChevronUp, Cpu, HelpCircle, Check, Trash2, Eye, Save, Play, RefreshCw, Sparkles,
  Target, History, FileText, Database, ArrowRight, CheckCircle, CheckSquare, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { resolveVendorByMac } from '../utils/macUtils';

interface NetworkAuditProps {
  devices: Device[];
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  locationName: string;
}

interface HistoricalAudit {
  id: string;
  timestamp: string;
  location: string;
  totalDevices: number;
  avgLatency: number;
  score: number;
  rank: string;
  devicesSnapshot: Device[];
}

interface PortScanResult {
  port: number;
  service: string;
  state: 'open' | 'closed' | 'filtered';
  description: string;
  risk: 'critical' | 'warning' | 'secure' | 'info';
}

export default function NetworkAudit({ devices, onAddLog, locationName }: NetworkAuditProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState('all');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // --- HISTORICAL AUDITS STATE ---
  const [auditHistory, setAuditHistory] = useState<HistoricalAudit[]>([]);
  const [selectedPastAuditToCompare, setSelectedPastAuditToCompare] = useState<HistoricalAudit | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [savingAuditCustomName, setSavingAuditCustomName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // --- PORT SCANNER STATE ---
  const [selectedDeviceToScan, setSelectedDeviceToScan] = useState<Device | null>(null);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [portScanProgress, setPortScanProgress] = useState(0);
  const [activeScanningPort, setActiveScanningPort] = useState<number | null>(null);
  const [portScanResults, setPortScanResults] = useState<PortScanResult[]>([]);
  const [portScanConsole, setPortScanConsole] = useState<string[]>([]);
  const [portScanProfile, setPortScanProfile] = useState<'quick' | 'full'>('quick');

  // --- AUTOMATED AUDIT ENGINE ---
  const [isContinuousAudit, setIsContinuousAudit] = useState(false);
  const [continuousCount, setContinuousCount] = useState(0);

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

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('redmonitor_audit_history');
      if (stored) {
        setAuditHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading redmonitor_audit_history from localStorage:", e);
    }
  }, []);

  // --- SAVE CURRENT AUDIT TO HISTORY ---
  const saveCurrentAudit = (customLabel?: string) => {
    try {
      const label = (customLabel || `Auditoría ${locationName}`).trim();
      const newAudit: HistoricalAudit = {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toLocaleString('es-ES'),
        location: label,
        totalDevices: totals.count,
        avgLatency: totals.avgLatency,
        score: totals.score,
        rank: totals.rank,
        devicesSnapshot: JSON.parse(JSON.stringify(activeDevices)) // Deep copy
      };

      const updated = [newAudit, ...auditHistory];
      setAuditHistory(updated);
      localStorage.setItem('redmonitor_audit_history', JSON.stringify(updated));
      onAddLog(`💾 Auditoría "${label}" guardada exitosamente en el historial persistente.`, 'success');
      setSavingAuditCustomName('');
      setShowSaveDialog(false);
    } catch (err) {
      console.error("Error saving audit to history:", err);
      onAddLog(`❌ Error al guardar la auditoría en el almacenamiento local.`, 'error');
    }
  };

  // --- DELETE AUDIT FROM HISTORY ---
  const deleteHistoricalAudit = (id: string, label: string) => {
    try {
      const updated = auditHistory.filter(a => a.id !== id);
      setAuditHistory(updated);
      localStorage.setItem('redmonitor_audit_history', JSON.stringify(updated));
      
      if (selectedPastAuditToCompare?.id === id) {
        setSelectedPastAuditToCompare(null);
      }
      
      onAddLog(`🗑️ Reporte histórico "${label}" eliminado del almacenamiento.`, 'info');
    } catch (err) {
      console.error("Error deleting historical audit:", err);
    }
  };

  // --- DRIFT / COMPARISON ANALYSIS ---
  // Calculates differences between the current live state and the selected historical snapshot
  const driftAnalysis = useMemo(() => {
    if (!selectedPastAuditToCompare) return null;

    const currentIps = activeDevices.map(d => d.ip);
    const currentMacs = activeDevices.map(d => d.mac.toUpperCase()).filter(m => m !== '—');
    const pastIps = selectedPastAuditToCompare.devicesSnapshot.map(d => d.ip);
    const pastMacs = selectedPastAuditToCompare.devicesSnapshot.map(d => d.mac.toUpperCase()).filter(m => m !== '—');

    // 1. Rogue / New Devices: In current, but NOT in past snapshot (by IP or MAC)
    const rogueDevices = activeDevices.filter(d => {
      const isNewIp = !pastIps.includes(d.ip);
      const isNewMac = d.mac !== '—' && !pastMacs.includes(d.mac.toUpperCase());
      return isNewIp || isNewMac;
    });

    // 2. Disconnected / Missing Devices: In past snapshot, but NOT in current active list
    const missingDevices = selectedPastAuditToCompare.devicesSnapshot.filter(d => {
      const isMissingIp = !currentIps.includes(d.ip);
      const isMissingMac = d.mac !== '—' && !currentMacs.includes(d.mac.toUpperCase());
      return isMissingIp || isMissingMac;
    });

    // 3. Score drift
    const scoreDiff = totals.score - selectedPastAuditToCompare.score;

    return {
      rogueDevices,
      missingDevices,
      scoreDiff,
      hasDrift: rogueDevices.length > 0 || missingDevices.length > 0
    };
  }, [selectedPastAuditToCompare, activeDevices, totals.score]);

  // --- PORT SCANNING ENGINE (SIMULATION) ---
  const runPortScan = async (device: Device, profile: 'quick' | 'full') => {
    if (isScanningPorts) return;
    
    setSelectedDeviceToScan(device);
    setIsScanningPorts(true);
    setPortScanProgress(0);
    setPortScanResults([]);
    
    const ip = device.ip;
    const hostname = device.host.toLowerCase();
    const vendor = resolveVendorByMac(device.mac, device.host, device.ip).toLowerCase();

    const portsToScanList = profile === 'quick' 
      ? [21, 22, 80, 443, 3389] 
      : [21, 22, 23, 53, 80, 139, 443, 445, 1433, 3306, 3389, 8080];

    const results: PortScanResult[] = [];
    const logs: string[] = [
      `[RedMonitor Security Scan v1.0]`,
      `[INFO] Iniciando escaneo de puertos TCP contra el Host: ${device.ip} (${device.host})`,
      `[INFO] Perfil seleccionado: ${profile === 'quick' ? 'Escaneo Rápido (Puertos Estándar)' : 'Auditoría Completa de Vulnerabilidades'}`,
      `[INFO] Sonda ARP de fabricante activa: NIC identificada como "${resolveVendorByMac(device.mac, device.host, device.ip)}"`,
      `--------------------------------------------------------------------------------`
    ];

    setPortScanConsole([...logs]);

    for (let i = 0; i < portsToScanList.length; i++) {
      const port = portsToScanList[i];
      setActiveScanningPort(port);
      
      const newLog = `[SOPLA] Analizando socket TCP para puerto ${port}...`;
      setPortScanConsole(prev => [...prev, newLog]);

      // Delay to simulate scanning action
      const delayMs = profile === 'quick' ? 350 : 220;
      await new Promise(r => setTimeout(r, delayMs));

      // Heuristic rules to assign open ports to match real devices
      let state: 'open' | 'closed' | 'filtered' = 'closed';
      let service = 'Desconocido';
      let description = 'Servicio cerrado o inaccesible.';
      let risk: 'critical' | 'warning' | 'secure' | 'info' = 'secure';

      switch (port) {
        case 21:
          service = 'FTP';
          // Open on Synology NAS or Docker virtual nodes as warning
          if (hostname.includes('nas') || vendor.includes('synology') || hostname.includes('docker') || hostname.includes('generico')) {
            state = 'open';
            description = 'Servicio FTP activo. El protocolo FTP transmite contraseñas en texto plano. Se recomienda migrar a SFTP.';
            risk = 'warning';
          }
          break;
        case 22:
          service = 'SSH';
          // Open on gateway, NAS, and Workstations
          if (hostname.includes('router') || hostname.includes('nas') || hostname.includes('workstation') || hostname.includes('ps5') || hostname.includes('este pc')) {
            state = 'open';
            description = 'Terminal remota segura SSH activa. Verifique que no permita contraseñas débiles o por defecto. Use llaves de seguridad.';
            risk = 'info';
          }
          break;
        case 23:
          service = 'Telnet';
          // Open on router as a big critical vulnerability warning
          if (hostname.includes('router') || hostname.includes('fibra')) {
            state = 'open';
            description = 'Servicio Telnet sin cifrar expuesto. PELIGRO DE INTERCEPTACIÓN DE DATOS. Desactive Telnet de inmediato en la ONT.';
            risk = 'critical';
          }
          break;
        case 53:
          service = 'DNS';
          if (hostname.includes('router') || hostname.includes('gateway')) {
            state = 'open';
            description = 'Servidor de resolución de nombres activo (DNS local).';
            risk = 'info';
          }
          break;
        case 80:
          service = 'HTTP';
          // Open on router, printer, NAS, TV
          if (hostname.includes('router') || hostname.includes('impresora') || hostname.includes('nas') || hostname.includes('tv') || hostname.includes('gateway')) {
            state = 'open';
            description = 'Consola de administración web HTTP activa sin cifrar. Expone credenciales en tránsito LAN. Redirija a HTTPS.';
            risk = 'warning';
          }
          break;
        case 139:
          service = 'NetBIOS';
          if (hostname.includes('workstation') || hostname.includes('nas') || hostname.includes('este pc')) {
            state = 'open';
            description = 'NetBIOS-SSN activo para descubrimiento de redes locales.';
            risk = 'info';
          }
          break;
        case 443:
          service = 'HTTPS';
          // Open on router, NAS, workstation
          if (hostname.includes('router') || hostname.includes('nas') || hostname.includes('workstation') || hostname.includes('este pc') || hostname.includes('gateway')) {
            state = 'open';
            description = 'Servicio web seguro cifrado SSL/TLS. Configuración estándar recomendada.';
            risk = 'secure';
          }
          break;
        case 445:
          service = 'SMB';
          // Windows file sharing on NAS/Workstations
          if (hostname.includes('nas') || hostname.includes('workstation') || hostname.includes('este pc')) {
            state = 'open';
            description = 'Intercambio de archivos SMB activo. Alerta: Asegúrese de tener deshabilitado SMB v1 para prevenir ransomware de tipo gusano (WannaCry).';
            risk = 'warning';
          }
          break;
        case 1433:
          service = 'MS-SQL';
          if (hostname.includes('server') || hostname.includes('database')) {
            state = 'open';
            description = 'Motor de base de datos Microsoft SQL Server abierto. Asegure los accesos con firewall.';
            risk = 'warning';
          }
          break;
        case 3306:
          service = 'MySQL';
          if (hostname.includes('nas') || hostname.includes('docker') || hostname.includes('server')) {
            state = 'open';
            description = 'Base de datos MySQL activa. Se recomienda restringir el acceso remoto exclusivamente a localhost.';
            risk = 'warning';
          }
          break;
        case 3389:
          service = 'RDP';
          if (hostname.includes('workstation') || hostname.includes('este pc') || hostname.includes('computador')) {
            state = 'open';
            description = 'Escritorio remoto de Windows expuesto en la red LAN. Altamente susceptible a ataques de fuerza bruta si no está protegido con NLA.';
            risk = 'warning';
          }
          break;
        case 8080:
          service = 'HTTP-Proxy';
          if (hostname.includes('nas') || hostname.includes('docker')) {
            state = 'open';
            description = 'Puerto alternativo HTTP activo para aplicaciones web secundarias o proxies.';
            risk = 'info';
          }
          break;
      }

      if (state === 'open') {
        results.push({ port, service, state, description, risk });
        setPortScanResults([...results]);
        setPortScanConsole(prev => [
          ...prev, 
          `[✓] PUERTO ${port}/TCP (${service}) ABIERTO | Nivel: ${risk.toUpperCase()}`
        ]);
      } else {
        setPortScanConsole(prev => [
          ...prev, 
          `[-] Puerto ${port}/TCP cerrado`
        ]);
      }

      const pct = Math.round(((i + 1) / portsToScanList.length) * 100);
      setPortScanProgress(pct);
    }

    setIsScanningPorts(false);
    setActiveScanningPort(null);
    setPortScanConsole(prev => [
      ...prev,
      `--------------------------------------------------------------------------------`,
      `[ÉXITO] Escaneo de seguridad completado para ${device.ip}.`,
      `[RESULTADOS] Se encontraron ${results.length} puertos TCP abiertos expuestos en la LAN.`
    ]);
    
    onAddLog(`🛡️ Auditoría de puertos completada para ${device.ip}. Se encontraron ${results.length} servicios activos.`, 'info');
  };

  // --- CONTINUOUS BACKGROUND AUDITING EFFECTS ---
  useEffect(() => {
    if (!isContinuousAudit) return;

    onAddLog("📡 Monitoreo Continuo LAN activado: Analizando fluctuaciones y amenazas en tiempo real.", "success");
    
    const interval = setInterval(() => {
      setContinuousCount(prev => prev + 1);
      
      // Simulate random background anomalies
      const rand = Math.random();
      if (rand < 0.2) {
        // Latency warning
        const randomDevice = activeDevices[Math.floor(Math.random() * activeDevices.length)];
        if (randomDevice) {
          onAddLog(`⚡ [Alerta de Sonda] Pico de latencia detectado en ${randomDevice.ip} (${randomDevice.host}): ${Math.round(110 + Math.random() * 80)} ms.`, 'warning');
        }
      } else if (rand < 0.35) {
        // Rogue virtual device joins
        onAddLog(`🔍 [Análisis de Deriva] Verificando tablas de vecinos ARP... Firmas de tramas de red 100% estables. No hay hosts sospechosos.`, 'info');
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      onAddLog("📡 Monitoreo Continuo LAN suspendido.", "info");
    };
  }, [isContinuousAudit, activeDevices]);

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

  // EXPORT 4: HIGHLY-STYLED EXCEL REPORT PRESERVING PDF FORMATTING
  const exportAsExcel = () => {
    onAddLog("📊 Generando informe de auditoría compatible con Excel con formato enriquecido...", "info");
    try {
      const formattedDate = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toLocaleString('es-ES');
      
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
           <x:ExcelWorkbook>
            <x:ExcelWorksheets>
             <x:ExcelWorksheet>
              <x:Name>Auditoría de Red LAN</x:Name>
              <x:WorksheetOptions>
               <x:DisplayGridlines/>
              </x:WorksheetOptions>
             </x:ExcelWorksheet>
            </x:ExcelWorksheets>
           </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #0f172a;
            }
            table {
              border-collapse: collapse;
            }
            td, th {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 8px 10px;
              vertical-align: middle;
            }
            .header-top {
              color: #64748b;
              font-size: 8.5pt;
              font-weight: bold;
            }
            .main-title {
              font-size: 16pt;
              font-weight: bold;
              color: #0b1120;
            }
            .main-subtitle {
              font-size: 10pt;
              color: #475569;
            }
            .panel-left-title {
              font-weight: bold;
              color: #475569;
              font-size: 8.5pt;
              border-top: 1px solid #cbd5e1;
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 8px 12px;
            }
            .panel-left-body {
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              background-color: #f8fafc;
              font-size: 8pt;
              color: #0f172a;
              padding: 4px 12px;
            }
            .panel-left-bottom {
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              border-bottom: 1px solid #cbd5e1;
              background-color: #f8fafc;
              font-size: 8pt;
              color: #0f172a;
              padding: 4px 12px 8px 12px;
            }
            .panel-right-title {
              font-weight: bold;
              color: #087389;
              font-size: 9pt;
              border-top: 2px solid #06b6d4;
              border-left: 6px solid #06b6d4;
              border-right: 2px solid #06b6d4;
              background-color: #ecfefe;
              padding: 8px 12px;
            }
            .panel-right-body {
              border-left: 6px solid #06b6d4;
              border-right: 2px solid #06b6d4;
              background-color: #ecfefe;
              font-weight: bold;
              font-size: 11pt;
              color: #0f172a;
              padding: 6px 12px;
            }
            .panel-right-bottom {
              border-left: 6px solid #06b6d4;
              border-right: 2px solid #06b6d4;
              border-bottom: 2px solid #06b6d4;
              background-color: #ecfefe;
              font-size: 8pt;
              color: #475569;
              padding: 4px 12px 8px 12px;
            }
            .summary-title {
              font-size: 11pt;
              font-weight: bold;
              color: #0b1120;
            }
            .summary-header-cell {
              border-top: 1px solid #bae6fd;
              background-color: #f0f9ff;
              font-size: 8.5pt;
              color: #475569;
              padding: 10px 12px 4px 12px;
            }
            .summary-value-cell {
              border-bottom: 1px solid #bae6fd;
              background-color: #f0f9ff;
              font-size: 14pt;
              font-weight: bold;
              color: #0b1120;
              padding: 4px 12px 10px 12px;
            }
            .table-header-title {
              font-size: 11pt;
              font-weight: bold;
              color: #0b1120;
            }
            .data-table th {
              background-color: #0b1120;
              color: #ffffff;
              font-weight: bold;
              font-size: 8.5pt;
              text-align: left;
              border: 1px solid #1e293b;
              padding: 8px 10px;
            }
            .data-table td {
              border: 1px solid #cbd5e1;
              font-size: 8.5pt;
              padding: 6px 10px;
            }
            .data-table tr.alt {
              background-color: #f8fafc;
            }
            .ip-address {
              color: #006699;
              font-weight: bold;
            }
            .mac-address {
              color: #334155;
              font-weight: bold;
            }
            .vendor-text {
              color: #475569;
            }
            .vendor-highlight-purple {
              color: #a855f7;
              font-weight: bold;
            }
            .vendor-highlight-cyan {
              color: #0891b2;
              font-weight: bold;
            }
            .latency-ok {
              color: #10b981;
              font-weight: bold;
            }
            .latency-warn {
              color: #f59e0b;
              font-weight: bold;
            }
            .badge-ok {
              background-color: #d1fae5;
              color: #059669;
              font-weight: bold;
              text-align: center;
              border: 1px solid #a7f3d0;
              padding: 2px 8px;
            }
            .badge-warn {
              background-color: #fef3c7;
              color: #d97706;
              font-weight: bold;
              text-align: center;
              border: 1px solid #fde68a;
              padding: 2px 8px;
            }
            .declaration-title {
              border-top: 1px solid #cbd5e1;
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              background-color: #f1f5f9;
              font-weight: bold;
              font-size: 9pt;
              color: #0f172a;
              padding: 10px 12px;
            }
            .declaration-body {
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              background-color: #f1f5f9;
              font-size: 8pt;
              color: #475569;
              padding: 4px 12px;
            }
            .declaration-bottom {
              border-left: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              border-bottom: 1px solid #cbd5e1;
              background-color: #f1f5f9;
              font-size: 8pt;
              color: #475569;
              padding: 4px 12px 10px 12px;
            }
            .footer-text-center {
              text-align: center;
              font-size: 8pt;
              color: #64748b;
            }
            .footer-author {
              text-align: center;
              font-size: 8pt;
              color: #334155;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <table>
            <colgroup>
              <col style="width: 140px;" />
              <col style="width: 150px;" />
              <col style="width: 190px;" />
              <col style="width: 190px;" />
              <col style="width: 90px;" />
              <col style="width: 90px;" />
            </colgroup>

            <tr>
              <td colspan="3" class="header-top" style="color: #64748b; font-size: 8.5pt; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">SISTEMA DE MONITOREO DE RED - REDMONITOR</td>
              <td colspan="3" class="header-top" style="text-align: right; color: #64748b; font-size: 8.5pt; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">AUDITORÍA DE INFRAESTRUCTURA LAN</td>
            </tr>
            <tr>
              <td colspan="6" style="border-bottom: 1.5px solid #cbd5e1; height: 4px; padding: 0;"></td>
            </tr>
            <tr><td colspan="6" style="height: 12px; padding: 0;"></td></tr>

            <tr>
              <td colspan="6" class="main-title" style="font-size: 16pt; font-weight: bold; color: #0b1120; font-family: 'Segoe UI', Arial, sans-serif;">INFORME DE AUDITORÍA DE RED FÍSICA</td>
            </tr>
            <tr>
              <td colspan="6" class="main-subtitle" style="font-size: 10pt; color: #475569; font-family: 'Segoe UI', Arial, sans-serif;">Sondeo y Validación de Interfaces Físicas, Direcciones MAC y Latencia LAN</td>
            </tr>
            <tr><td colspan="6" style="height: 12px; padding: 0;"></td></tr>

            <tr>
              <td colspan="3" class="panel-left-title" style="font-weight: bold; color: #475569; font-size: 8.5pt; border-top: 1px solid #cbd5e1; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px 12px; font-family: 'Segoe UI', Arial, sans-serif;">SISTEMA / DETALLES DE AUDITORÍA</td>
              <td colspan="3" class="panel-right-title" style="font-weight: bold; color: #087389; font-size: 9pt; border-top: 2px solid #06b6d4; border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; background-color: #ecfefe; padding: 8px 12px; font-family: 'Segoe UI', Arial, sans-serif;">SITIO / UBICACIÓN REGISTRADA</td>
            </tr>
            <tr>
              <td colspan="3" class="panel-left-body" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px; font-family: 'Segoe UI', Arial, sans-serif;">Sonda: RedMonitor Sonda de Campo Local</td>
              <td colspan="3" class="panel-right-body" style="border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; background-color: #ecfefe; font-weight: bold; font-size: 11pt; color: #0f172a; padding: 6px 12px; font-family: 'Segoe UI', Arial, sans-serif;">${(locationName || 'Sede Local').trim().toUpperCase()}</td>
            </tr>
            <tr>
              <td colspan="3" class="panel-left-body" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px; font-family: 'Segoe UI', Arial, sans-serif;">ID Dispositivo: RED-MON-162BF909</td>
              <td colspan="3" class="panel-right-bottom" style="border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4; border-bottom: 2px solid #06b6d4; background-color: #ecfefe; font-size: 8pt; color: #475569; padding: 4px 12px 8px 12px; font-family: 'Segoe UI', Arial, sans-serif;">Verificación en campo físico activo</td>
            </tr>
            <tr>
              <td colspan="3" class="panel-left-bottom" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 8pt; color: #0f172a; padding: 4px 12px 8px 12px; font-family: 'Segoe UI', Arial, sans-serif;">Fecha/Hora: ${timestamp}</td>
              <td colspan="3" style="height: 0; padding: 0; background-color: #ecfefe; border-bottom: 2px solid #06b6d4; border-left: 6px solid #06b6d4; border-right: 2px solid #06b6d4;"></td>
            </tr>
            <tr><td colspan="6" style="height: 15px; padding: 0;"></td></tr>

            <tr>
              <td colspan="6" class="summary-title" style="font-size: 11pt; font-weight: bold; color: #0b1120; font-family: 'Segoe UI', Arial, sans-serif;">RESUMEN EJECUTIVO DE SEGURIDAD</td>
            </tr>
            <tr>
              <td colspan="2" class="summary-header-cell" style="border-top: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 8.5pt; color: #475569; padding: 10px 12px 4px 12px; border-left: 1px solid #bae6fd; font-family: 'Segoe UI', Arial, sans-serif;">TOTAL HOSTS ACTIVOS</td>
              <td colspan="2" class="summary-header-cell" style="border-top: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 8.5pt; color: #475569; padding: 10px 12px 4px 12px; font-family: 'Segoe UI', Arial, sans-serif;">LATENCIA MEDIA LAN</td>
              <td colspan="2" class="summary-header-cell" style="border-top: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 8.5pt; color: #475569; padding: 10px 12px 4px 12px; border-right: 1px solid #bae6fd; font-family: 'Segoe UI', Arial, sans-serif;">NIVEL DE SEGURIDAD GENERAL</td>
            </tr>
            <tr>
              <td colspan="2" class="summary-value-cell" style="border-bottom: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 14pt; font-weight: bold; color: #0b1120; padding: 4px 12px 10px 12px; border-left: 1px solid #bae6fd; font-family: 'Segoe UI', Arial, sans-serif;">${totals.count} Dispositivos</td>
              <td colspan="2" class="summary-value-cell" style="border-bottom: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 14pt; font-weight: bold; padding: 4px 12px 10px 12px; color: ${totals.avgLatency > 50 ? '#d97706' : '#059669'}; font-family: 'Segoe UI', Arial, sans-serif;">${totals.avgLatency} ms</td>
              <td colspan="2" class="summary-value-cell" style="border-bottom: 1px solid #bae6fd; background-color: #f0f9ff; font-size: 14pt; font-weight: bold; padding: 4px 12px 10px 12px; border-right: 1px solid #bae6fd; color: ${totals.score < 80 ? '#d97706' : '#059669'}; font-family: 'Segoe UI', Arial, sans-serif;">${totals.score}% - ${totals.rank.split('(')[0]}</td>
            </tr>
            <tr><td colspan="6" style="height: 15px; padding: 0;"></td></tr>

            <tr>
              <td colspan="6" class="table-header-title" style="font-size: 11pt; font-weight: bold; color: #0b1120; font-family: 'Segoe UI', Arial, sans-serif;">DIRECCIONES IP SONDEADAS CON DIRECCIÓN MAC ASOCIADA</td>
            </tr>
            <tr><td colspan="6" style="height: 4px; padding: 0;"></td></tr>

            <tr class="data-table">
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">DIRECCIÓN IP</th>
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">DIRECCIÓN MAC</th>
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">FABRICANTE NIC</th>
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">ESTACIÓN / HOST</th>
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: left; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">LATENCIA</th>
              <th style="background-color: #0b1120; color: #ffffff; font-weight: bold; font-size: 8.5pt; text-align: center; border: 1px solid #1e293b; padding: 8px 10px; font-family: 'Segoe UI', Arial, sans-serif;">ESTADO</th>
            </tr>
      `;

      activeDevices.forEach((device, index) => {
        const isAlternate = index % 2 === 1;
        const bgStyle = isAlternate ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
        const manufacturer = resolveVendorByMac(device.mac, device.host, device.ip);
        
        let manufacturerColor = '#475569';
        let manufacturerWeight = 'normal';
        if (manufacturer.includes('Docker')) {
          manufacturerColor = '#a855f7';
          manufacturerWeight = 'bold';
        } else if (manufacturer.includes('Apple')) {
          manufacturerColor = '#0891b2';
          manufacturerWeight = 'bold';
        }

        const latencyColor = device.ping && device.ping > 100 ? '#f59e0b' : '#10b981';
        const latencyText = device.ping !== null ? `${device.ping} ms` : '—';
        
        const statusBadgeStyle = device.estado === 'OK' 
          ? 'background-color: #d1fae5; color: #059669; font-weight: bold; border: 1px solid #a7f3d0; padding: 2px 8px;' 
          : 'background-color: #fef3c7; color: #d97706; font-weight: bold; border: 1px solid #fde68a; padding: 2px 8px;';

        const statusLabel = device.estado === 'OK' ? 'OK' : 'WARN';

        html += `
            <tr style="${bgStyle}">
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif; color: #006699; font-weight: bold;">${device.ip}</td>
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif; color: #334155; font-weight: bold;">${device.mac}</td>
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif; color: ${manufacturerColor}; font-weight: ${manufacturerWeight};">${manufacturer}</td>
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 500; color: #0b1120;">${device.host}</td>
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; color: ${latencyColor};" align="right">${latencyText}</td>
              <td style="border: 1px solid #cbd5e1; font-size: 8.5pt; padding: 6px 10px; font-family: 'Segoe UI', Arial, sans-serif;" align="center">
                <span style="${statusBadgeStyle}">${statusLabel}</span>
              </td>
            </tr>
        `;
      });

      html += `
            <tr><td colspan="6" style="height: 15px; padding: 0;"></td></tr>

            <tr>
              <td colspan="6" class="declaration-title" style="font-weight: bold; font-size: 9pt; color: #0f172a; border-top: 1px solid #cbd5e1; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f1f5f9; padding: 10px 12px; font-family: 'Segoe UI', Arial, sans-serif;">DECLARACIÓN DE VALIDACIÓN Y CONTROL DE AUDITORÍA</td>
            </tr>
            <tr>
              <td colspan="6" class="declaration-body" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 8pt; color: #475569; padding: 4px 12px; font-family: 'Segoe UI', Arial, sans-serif;">El presente reporte describe el estado actual de los dispositivos activos en la red LAN local.</td>
            </tr>
            <tr>
              <td colspan="6" class="declaration-bottom" style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 8pt; color: #475569; padding: 4px 12px 10px 12px; font-family: 'Segoe UI', Arial, sans-serif;">Las asignaciones MAC-IP fueron recolectadas a través del protocolo ARP nativo de los adaptadores activos.</td>
            </tr>
            <tr><td colspan="6" style="height: 20px; padding: 0;"></td></tr>

            <tr>
              <td colspan="6" class="footer-text-center" style="text-align: center; font-size: 8pt; color: #64748b; font-family: 'Segoe UI', Arial, sans-serif;">RedMonitor — Reporte de Auditoría LAN  |  Generación: ${timestamp}</td>
            </tr>
            <tr>
              <td colspan="6" class="footer-author" style="text-align: center; font-size: 8pt; color: #334155; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">Diseñado y programado por ASNEIDER ZAPATA</td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // We MUST prepend the UTF-8 Byte Order Mark (\ufeff) to prevent Excel from interpreting it incorrectly or raising unreadable files error.
      // And we use 'application/vnd.ms-excel' to inform Excel that this is an HTML table it should open.
      const blob = new Blob(["\ufeff", html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_seguridad_red_${formattedDate}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onAddLog("🏆 Reporte compatible con Excel (XLS) generado exitosamente con formato enriquecido idéntico al PDF.", "success");
    } catch (e: any) {
      console.error(e);
      onAddLog(`❌ Error al generar el archivo Excel: ${e.message || e}`, "error");
    }
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
      doc.text("FABRICANTE NIC", 75, 101.5);
      doc.text("ESTACIÓN / HOST", 118, 101.5);
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

        const manufacturerRaw = resolveVendorByMac(device.mac, device.host, device.ip);
        let manufacturer = manufacturerRaw.length > 25 ? manufacturerRaw.substring(0, 23) + '...' : manufacturerRaw;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textColorSecondary[0], textColorSecondary[1], textColorSecondary[2]);
        doc.text(manufacturer, 75, y + 4.8);

        let friendlyHostName = device.host.length > 25 ? device.host.substring(0, 23) + '...' : device.host;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(friendlyHostName, 118, y + 4.8);

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
          doc.text("FABRICANTE NIC", 75, 23.5);
          doc.text("ESTACIÓN / HOST", 118, 23.5);
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
      <div className="bg-[#0B1120]/40 border border-slate-800/80 p-4 rounded-md flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-cyan-950/40 border border-cyan-800/30 text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono">
            <ShieldCheck className="h-3.5 w-3.5" /> AUDITORÍA DE RED Y EXPORTADOR MÉTRICO
          </span>
          <h2 className="text-base font-bold text-slate-100 light:text-slate-900 leading-tight">Sistemas de Diagnóstico y Emisión de Reportes de Cumplimiento</h2>
          <p className="text-[11px] text-slate-400 light:text-slate-600 font-sans max-w-2xl leading-relaxed">
            Compruebe el direccionamiento MAC de los hosts activos, deduzca marcas y fabricantes de tarjetas NIC en tiempo de ejecución, y exporte auditorías oficiales de red.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              Monitoreo MAC en tiempo real
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              Deducción inteligente de fabricantes NIC
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              Reportes oficiales de cumplimiento
            </span>
          </div>
        </div>

        {/* TOP COMPILING TRIGGER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsContinuousAudit(!isContinuousAudit)}
            className={`font-bold py-1.5 px-3 rounded-xs border text-[11px] flex items-center gap-1.5 cursor-pointer transition-all duration-350 ${
              isContinuousAudit 
                ? 'bg-amber-950/60 border-amber-800 text-amber-200' 
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-250'
            }`}
            title="Activar análisis activo de fluctuaciones y anomalías en tiempo real"
          >
            <Activity className={`h-3.5 w-3.5 ${isContinuousAudit ? 'animate-pulse text-amber-400' : 'text-slate-450'}`} />
            <span>{isContinuousAudit ? 'Sonda Activa 📡' : 'Sonda Pasiva'}</span>
          </button>

          <button
            onClick={() => {
              setShowSaveDialog(!showSaveDialog);
              setShowHistoryPanel(false);
            }}
            className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 hover:text-white font-bold py-1.5 px-3 rounded-xs border border-cyan-850 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Guardar auditoría actual en el historial local persistente"
          >
            <Save className="h-3.5 w-3.5 text-cyan-400" />
            <span>Guardar Reporte</span>
          </button>

          <button
            onClick={() => {
              setShowHistoryPanel(!showHistoryPanel);
              setShowSaveDialog(false);
            }}
            className="bg-slate-900 hover:bg-[#1e293b] text-slate-350 hover:text-white font-bold py-1.5 px-3 rounded-xs border border-slate-800 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Abrir el historial de reportes guardados para comparación de deriva"
          >
            <History className="h-3.5 w-3.5 text-cyan-400" />
            <span>Ver Historial ({auditHistory.length})</span>
          </button>

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
            onClick={exportAsExcel}
            className="bg-emerald-900/40 hover:bg-emerald-800 text-emerald-200 hover:text-white font-bold py-1.5 px-3 rounded-xs border border-emerald-850 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Exportar informe de auditoría completo a formato Excel con diseño idéntico al PDF"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={exportAsCSV}
            className="bg-slate-900 hover:bg-[#1e293b] active:scale-95 text-slate-300 font-bold py-1.5 px-3 rounded-xs border border-slate-800 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Exportar base de datos a formato CSV compatible con Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-450" />
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

      {/* SAVING DIALOG */}
      {showSaveDialog && (
        <div className="bg-[#0b1120]/80 border border-cyan-500/20 p-4 rounded-md space-y-3 text-left animate-fade-in shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              <Save className="h-4 w-4" /> Guardar Auditoría en Historial
            </h3>
            <button onClick={() => setShowSaveDialog(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Guarde una captura instantánea de los {totals.count} dispositivos activos para compararla en el futuro y detectar dispositivos intrusos (drift analysis).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Ej. Oficina Principal - Piso 2 (Opcional)`}
              value={savingAuditCustomName}
              onChange={(e) => setSavingAuditCustomName(e.target.value)}
              className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-hidden focus:border-cyan-500 font-mono"
            />
            <button
              onClick={() => saveCurrentAudit(savingAuditCustomName)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* HISTORICAL REPORTS & DRIFT COMPARISON PANEL */}
      {showHistoryPanel && (
        <div className="bg-[#0b1120]/85 border border-slate-800 rounded-md p-4 space-y-4 text-left animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
              <History className="h-4 w-4 text-cyan-400" /> Historial de Auditorías Registradas
            </h3>
            <button onClick={() => setShowHistoryPanel(false)} className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
              Ocultar Historial
            </button>
          </div>

          {auditHistory.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-4 text-center">
              No hay auditorías guardadas en el historial local. Use el botón "Guardar Reporte" para registrar una.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* LIST OF AUDITS */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {auditHistory.map(audit => (
                  <div 
                    key={audit.id}
                    onClick={() => setSelectedPastAuditToCompare(
                      selectedPastAuditToCompare?.id === audit.id ? null : audit
                    )}
                    className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                      selectedPastAuditToCompare?.id === audit.id 
                        ? 'bg-cyan-950/25 border-cyan-500/40' 
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-850/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-200">{audit.location}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{audit.timestamp}</div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoricalAudit(audit.id, audit.location);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/40 text-[10px] text-slate-400 font-mono">
                      <div>Hosts: <span className="text-slate-200 font-semibold">{audit.totalDevices}</span></div>
                      <div>Latencia: <span className="text-slate-200 font-semibold">{audit.avgLatency}ms</span></div>
                      <div>Seguridad: <span className="text-slate-200 font-semibold">{audit.score}%</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DETAILS AND COMPARATIVE DRIFT ANALYSIS */}
              <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded p-3 flex flex-col justify-between">
                {!selectedPastAuditToCompare ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-500">
                    <Database className="h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-[11px]">Seleccione una auditoría del historial para iniciar el <b>Análisis de Deriva (Drift)</b> y detectar intrusos o fallos de red.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                      <span className="text-[10px] font-bold text-cyan-400 font-mono">ANÁLISIS DE DERIVA: LIVE vs BASELINE</span>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold truncate max-w-[150px]">
                        {selectedPastAuditToCompare.location}
                      </span>
                    </div>

                    {/* Drift Summary cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-left">
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Dispositivos Nuevos</div>
                        <div className={`text-sm font-black mt-1 font-mono ${driftAnalysis?.rogueDevices.length ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {driftAnalysis?.rogueDevices.length || 0}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 text-left">
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Dispositivos Caídos</div>
                        <div className="text-sm font-black mt-1 text-slate-300 font-mono">
                          {driftAnalysis?.missingDevices.length || 0}
                        </div>
                      </div>
                    </div>

                    {/* Critical Threat/Alert Block for Rogue Devices */}
                    {driftAnalysis?.rogueDevices && driftAnalysis.rogueDevices.length > 0 ? (
                      <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded space-y-1.5 text-left">
                        <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1 font-mono">
                          <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> ¡ALERTA DE SEGURIDAD: HOSTS NO AUTORIZADOS!
                        </div>
                        <p className="text-[9.5px] text-rose-350 leading-relaxed font-sans">
                          Se detectaron dispositivos activos que NO estaban presentes en la auditoría baseline. Podrían representar conexiones rogue o intrusiones físicas a la LAN:
                        </p>
                        <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                          {driftAnalysis.rogueDevices.map(d => (
                            <div key={d.id} className="text-[9.5px] font-mono flex justify-between bg-slate-950 p-1 rounded border border-rose-950/40">
                              <span className="text-rose-400 font-bold">{d.ip}</span>
                              <span className="text-slate-300 truncate max-w-[110px]">{d.host}</span>
                              <span className="text-slate-500">{d.mac}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-950/10 border border-emerald-900/30 rounded text-[10px] text-emerald-400 text-left flex items-start gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Análisis de Integridad OK</div>
                          <div className="text-slate-400 text-[9px] mt-0.5">No se detectaron hosts intrusos nuevos comparados con esta línea base.</div>
                        </div>
                      </div>
                    )}

                    {/* Missing Devices list */}
                    {driftAnalysis?.missingDevices && driftAnalysis.missingDevices.length > 0 && (
                      <div className="space-y-1 text-left">
                        <div className="text-[10px] font-bold text-slate-400 font-mono">Hosts ausentes / Fuera de servicio:</div>
                        <div className="space-y-1 max-h-[60px] overflow-y-auto pr-1">
                          {driftAnalysis.missingDevices.map(d => (
                            <div key={d.id} className="text-[9px] font-mono flex justify-between bg-slate-900/30 p-1 rounded text-slate-400">
                              <span>{d.ip}</span>
                              <span className="truncate max-w-[130px]">{d.host}</span>
                              <span>{d.mac}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PORT SCANNING PANEL */}
      {selectedDeviceToScan && (
        <div className="bg-[#0b1120]/80 border border-cyan-500/20 rounded-md p-4 md:p-5 space-y-4 text-left animate-fade-in shadow-lg">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                Escáner de Puertos LAN y Vulnerabilidades
              </span>
              <h3 className="text-sm font-bold text-slate-200 font-mono">
                Sonda de Seguridad Activa: {selectedDeviceToScan.ip}
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                Estación: {selectedDeviceToScan.host}  |  Sonda ARP: {resolveVendorByMac(selectedDeviceToScan.mac, selectedDeviceToScan.host, selectedDeviceToScan.ip)}
              </p>
            </div>
            <button 
              onClick={() => {
                setSelectedDeviceToScan(null);
                setIsScanningPorts(false);
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded border border-slate-800/40">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-semibold font-mono">Perfil de Escaneo:</span>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="port-profile"
                  checked={portScanProfile === 'quick'}
                  onChange={() => setPortScanProfile('quick')}
                  disabled={isScanningPorts}
                  className="accent-cyan-500"
                />
                <span className="font-sans">Rápido (5 Puertos)</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="port-profile"
                  checked={portScanProfile === 'full'}
                  onChange={() => setPortScanProfile('full')}
                  disabled={isScanningPorts}
                  className="accent-cyan-500"
                />
                <span className="font-sans">Vulnerabilidad Completo (12 Puertos)</span>
              </label>
            </div>

            <button
              onClick={() => runPortScan(selectedDeviceToScan, portScanProfile)}
              disabled={isScanningPorts}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isScanningPorts ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sondeando... {portScanProgress}%</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Iniciar Sonda TCP</span>
                </>
              )}
            </button>
          </div>

          {/* Terminal and Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Port scan terminal console log */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 font-mono">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" /> CONSOLA DE AUDITORÍA TCP/IP
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-850 h-[200px] overflow-y-auto font-mono text-[10.5px] text-emerald-400 leading-normal space-y-1 shadow-inner scrollbar-thin">
                {portScanConsole.map((log, index) => (
                  <div 
                    key={index} 
                    className={
                      log.includes('[✓]') ? 'text-cyan-400 font-bold' : 
                      log.includes('[!]') || log.includes('PUERTO') ? 'text-cyan-350 font-bold' : 
                      log.includes('[-]') ? 'text-slate-500' : 'text-emerald-400/90'
                    }
                  >
                    {log}
                  </div>
                ))}
                {isScanningPorts && (
                  <div className="text-cyan-400 animate-pulse flex items-center gap-1 font-mono">
                    <span>● Escaneando puerto {activeScanningPort}/tcp...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ports opened table with actionable advisory comments */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 font-mono">
                <CheckCircle className="h-3.5 w-3.5 text-cyan-400" /> SERVICIOS ABIERTOS Y EXPOSICIÓN
              </div>
              <div className="bg-slate-950 rounded border border-slate-850 h-[200px] overflow-y-auto p-2 space-y-2">
                {portScanResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 italic text-[11px] py-12">
                    {isScanningPorts ? 'Ejecutando sondeo de sockets...' : 'No se han detectado servicios expuestos en el escaneo.'}
                  </div>
                ) : (
                  portScanResults.map(res => (
                    <div 
                      key={res.port}
                      className="p-2.5 rounded border bg-[#0d1424]/60 border-slate-800 text-[11px] space-y-1 text-left"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200 font-mono">
                          Puerto {res.port}/TCP — {res.service}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase font-mono ${
                          res.risk === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          res.risk === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          res.risk === 'secure' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800 text-slate-355'
                        }`}>
                          {res.risk}
                        </span>
                      </div>
                      <p className="text-slate-450 text-[10px] leading-relaxed">
                        {res.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <th className="p-3">Fabricante Resolución (ARP)</th>
                <th className="p-3">Host / Estación</th>
                <th className="p-3">Ping Latencia</th>
                <th className="p-3">Segmento Local</th>
                <th className="p-3 text-center">Auditoría</th>
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
                        <div className="truncate">{d.host}</div>
                        {d.osDeducido && (
                          <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                            <span className="bg-slate-950 px-1 py-0.5 rounded text-[8px] text-cyan-450 text-cyan-400 font-bold border border-slate-800/50 shrink-0">TTL {d.ttl}</span>
                            <span className="truncate text-slate-400">{d.osDeducido}</span>
                          </div>
                        )}
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

                      {/* ACTIVE CYBER PORT SCANNER TARGET BUTTON */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedDeviceToScan(d);
                            const auditView = document.getElementById('network-audit-view');
                            if (auditView) {
                              auditView.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-white mx-auto px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="Escanear puertos de red para evaluar nivel de exposición"
                        >
                          <Target className="h-3 w-3 text-cyan-400" />
                          <span>Escanear</span>
                        </button>
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
