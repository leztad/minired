import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, Database, Save, Download, Upload, Trash2, Eye, Play, Check, Plus, 
  Search, Share2, FileText, Layers, Activity, Cpu, Server, Globe, Clock, 
  ArrowLeft, AlertTriangle, CheckCircle2, Info, FileCode, CheckSquare, PlusCircle, HelpCircle, Key, ChevronRight,
  Filter, FileSpreadsheet, FileJson, Copy, RefreshCw, X, ShieldCheck, Printer, CheckCheck
} from 'lucide-react';
import { Device, LocationProfile } from '../types';
import { resolveDeviceNameByMac, resolveVendorByMac } from '../utils/macUtils';
import { 
  calculateLocationTotals, 
  exportOfflineLocationPDF, 
  exportOfflineLocationExcel, 
  exportOfflineLocationCSV, 
  exportOfflineLocationJSON, 
  generateOfflineLocationMarkdown, 
  exportConsolidatedOfflinePDF, 
  exportConsolidatedOfflineExcel, 
  exportConsolidatedOfflineCSV 
} from '../utils/offlineReportGenerator';
import { generateFormalPdfReport } from '../utils/pdfReportExport';

export type { LocationProfile };

interface OfflineLocationsManagerProps {
  currentLocationName: string;
  currentSubnet: string;
  currentInterface: string;
  activeDevices: Device[];
  onLoadProfile: (profile: LocationProfile) => void;
  onAddLog: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  onAddAlert: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  activeProfileId: string | null;
  onUnloadProfile: () => void;
  onNavigateToAudit?: () => void;
  onNavigateToDetailedReport?: () => void;
}

export default function OfflineLocationsManager({
  currentLocationName,
  currentSubnet,
  currentInterface,
  activeDevices,
  onLoadProfile,
  onAddLog,
  onAddAlert,
  activeProfileId,
  onUnloadProfile,
  onNavigateToAudit,
  onNavigateToDetailedReport
}: OfflineLocationsManagerProps) {
  // Local state for profiles list loaded from localStorage
  const [profiles, setProfiles] = useState<LocationProfile[]>(() => {
    try {
      const cached = localStorage.getItem('netmonitor_saved_locations');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Error loading location profiles:", e);
    }
    // Preload with a realistic sample branch if empty
    return [
      {
        id: 'loc-preset-hq',
        name: 'Sede Principal - Corporativo',
        subnet: '192.168.1.0/24',
        interfaceName: 'Intel Ethernet Connection I219-LM',
        gateway: '192.168.1.1',
        dns: '1.1.1.1',
        description: 'Servidores de producción locales, conmutador core Catalyst 3850 y access points corporativos.',
        department: 'TI / Operaciones',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleString(),
        contactName: 'Ing. Carlos Mendoza (Ext 405)',
        contactPhone: '+57 310 456 7890',
        securityNotes: 'Acceso restringido al rack mediante tarjeta magnética. Aire acondicionado activo a 18°C.',
        devices: [
          { id: 'hq-1', ip: '192.168.1.1', host: 'Gateway-Catalyst', mac: '00:AD:24:FF:88:11', ping: 1, estado: 'OK', lastChecked: '2026-07-10', sensorPing: true, vendor: 'Cisco Systems', segmento: '192.168.1.0/24' },
          { id: 'hq-2', ip: '192.168.1.10', host: 'Active-Directory-DC1', mac: '00:50:56:AB:CD:01', ping: 3, estado: 'OK', lastChecked: '2026-07-10', sensorPing: true, vendor: 'VMware, Inc.', segmento: '192.168.1.0/24' },
          { id: 'hq-3', ip: '192.168.1.25', host: 'NAS-Backup-Vault', mac: '00:11:32:CC:DD:EE', ping: 12, estado: 'OK', lastChecked: '2026-07-10', sensorPing: true, vendor: 'Synology Incorporated', segmento: '192.168.1.0/24' },
          { id: 'hq-4', ip: '192.168.1.50', host: 'PRN-Admin-Floor3', mac: '00:26:55:99:FF:CC', ping: 8, estado: 'OK', lastChecked: '2026-07-10', sensorPing: true, vendor: 'Hewlett Packard', segmento: '192.168.1.0/24' },
          { id: 'hq-5', ip: '192.168.1.105', host: 'PC-Contabilidad', mac: '44:37:E6:11:22:33', ping: null, estado: 'Caído', lastChecked: '2026-07-10', sensorPing: true, vendor: 'Dell Inc.', segmento: '192.168.1.0/24' }
        ]
      }
    ];
  });

  const saveToStorage = (newProfiles: LocationProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('netmonitor_saved_locations', JSON.stringify(newProfiles));
  };

  // State for search and active view
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // Topology layout type (hierarchical by default for simple top-down understanding)
  const [layoutType, setLayoutType] = useState<'hierarchical' | 'radial' | 'grid'>(() => {
    return (localStorage.getItem('redmonitor_topo_layout') as 'hierarchical' | 'radial' | 'grid') || 'hierarchical';
  });

  const [showIPs, setShowIPs] = useState<boolean>(() => {
    return localStorage.getItem('redmonitor_topo_show_ips') !== 'false';
  });

  const [showLabels, setShowLabels] = useState<boolean>(() => {
    return localStorage.getItem('redmonitor_topo_show_labels') !== 'false';
  });

  const [spacingMultiplier, setSpacingMultiplier] = useState<number>(() => {
    const val = localStorage.getItem('redmonitor_topo_spacing');
    return val ? parseFloat(val) : 1.4;
  });

  // State filters for offline devices list and map
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pingFilter, setPingFilter] = useState<string>('all');
  
  // Create / Edit location form states
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSubnet, setFormSubnet] = useState('');
  const [formInterface, setFormInterface] = useState('');
  const [formGateway, setFormGateway] = useState('');
  const [formDns, setFormDns] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formSecurityNotes, setFormSecurityNotes] = useState('');
  const [captureCurrentDevices, setCaptureCurrentDevices] = useState(true);

  // Filtered profiles for listing
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subnet.includes(searchQuery) ||
      (p.department && p.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [profiles, searchQuery]);

  // Selected profile details
  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  // Reset filters when switching profiles
  useEffect(() => {
    setStatusFilter('all');
    setPingFilter('all');
  }, [selectedProfileId]);

  // Handler to open create form (prefilling with active network settings if requested)
  const handleOpenCreate = () => {
    setFormName(currentLocationName || 'Sede Local Escaneada');
    setFormSubnet(currentSubnet || '192.168.1.0/24');
    setFormInterface(currentInterface || 'Intel Ethernet adapter');
    
    // Suggest gateway based on subnet
    const ipBase = currentSubnet.split('/')[0];
    const ipParts = ipBase.split('.');
    if (ipParts.length === 4) {
      setFormGateway(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.1`);
    } else {
      setFormGateway('192.168.1.1');
    }
    setFormDns('1.1.1.1');
    setFormDescription('Perfil de red guardado de las pruebas físicas.');
    setFormDepartment('TI / Soporte');
    setFormContactName('');
    setFormContactPhone('');
    setFormSecurityNotes('');
    setCaptureCurrentDevices(true);
    setIsCreating(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSubnet.trim()) {
      onAddAlert('Complete los campos obligatorios: Nombre y Segmento Subred.', 'warning');
      return;
    }

    const devicesToSave = captureCurrentDevices ? [...activeDevices] : [];

    const newProfile: LocationProfile = {
      id: 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
      name: formName.trim(),
      subnet: formSubnet.trim(),
      interfaceName: formInterface.trim(),
      gateway: formGateway.trim() || '—',
      dns: formDns.trim() || '—',
      description: formDescription.trim(),
      department: formDepartment.trim() || undefined,
      contactName: formContactName.trim() || undefined,
      contactPhone: formContactPhone.trim() || undefined,
      securityNotes: formSecurityNotes.trim() || undefined,
      createdAt: new Date().toLocaleString(),
      devices: devicesToSave
    };

    const updated = [newProfile, ...profiles];
    saveToStorage(updated);
    setIsCreating(false);
    onAddAlert(`💾 Perfil "${newProfile.name}" guardado correctamente con ${devicesToSave.length} dispositivos para visualización offline.`, 'success');
    onAddLog(`📍 Ubicación corporativa agregada al catálogo offline: ${newProfile.name}`, 'success');
  };

  const handleDeleteProfile = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Está seguro de que desea eliminar el perfil de ubicación "${name}"? Esta acción no se puede deshacer.`)) {
      const updated = profiles.filter(p => p.id !== id);
      saveToStorage(updated);
      
      if (selectedProfileId === id) {
        setSelectedProfileId(null);
      }
      if (activeProfileId === id) {
        onUnloadProfile();
      }

      onAddAlert(`🗑️ Ubicación "${name}" eliminada del inventario offline.`, 'info');
      onAddLog(`🗑️ Perfil de ubicación eliminado: ${name}`, 'warning');
    }
  };

  // Export profile to JSON file
  const handleExportProfile = (profile: LocationProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `RedMonitor_Ubicacion_${profile.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onAddAlert(`📥 Perfil "${profile.name}" exportado exitosamente como JSON.`, 'success');
    } catch (err: any) {
      onAddAlert('Fallo al exportar el archivo de configuración.', 'error');
    }
  };

  // Import profile from JSON file
  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (!importedData.name || !importedData.subnet || !Array.isArray(importedData.devices)) {
          throw new Error('Estructura de archivo de ubicación no válida. Faltan campos clave.');
        }

        const newProfile: LocationProfile = {
          ...importedData,
          id: 'loc-imported-' + Date.now().toString(36),
          createdAt: importedData.createdAt || new Date().toLocaleString()
        };

        const updated = [newProfile, ...profiles];
        saveToStorage(updated);
        onAddAlert(`🔌 Ubicación importada correctamente: "${newProfile.name}" con ${newProfile.devices.length} dispositivos.`, 'success');
        onAddLog(`📁 Perfil importado desde archivo externo: ${newProfile.name}`, 'info');
      } catch (err: any) {
        onAddAlert(`Error al importar archivo JSON: ${err.message}`, 'error');
      }
    };
    fileReader.readAsText(files[0]);
    e.target.value = ''; // Reset file input
  };

  // --- OFFLINE AUDIT REPORT STATES & HANDLERS ---
  const [profileForReportModal, setProfileForReportModal] = useState<LocationProfile | null>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | 'formal-pdf' | 'csv' | 'json' | 'consolidated-pdf' | 'consolidated-excel' | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);

  const handleExportPDF = async (profile: LocationProfile) => {
    setIsExporting('pdf');
    onAddLog(`📄 Compilando reporte de auditoría en PDF para sede "${profile.name}"...`, 'info');
    await new Promise(r => setTimeout(r, 50));
    try {
      await exportOfflineLocationPDF(profile);
      onAddAlert(`🏆 Reporte PDF de la sede "${profile.name}" descargado exitosamente.`, 'success');
      onAddLog(`📄 Reporte PDF oficial generado: Sede ${profile.name}`, 'success');
    } catch (e: any) {
      console.error(e);
      onAddAlert(`Error al generar reporte PDF: ${e.message || e}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async (profile: LocationProfile) => {
    setIsExporting('excel');
    onAddLog(`📊 Generando informe de auditoría en Excel para sede "${profile.name}"...`, 'info');
    await new Promise(r => setTimeout(r, 50));
    try {
      await exportOfflineLocationExcel(profile);
      onAddAlert(`📊 Hoja Excel de la sede "${profile.name}" generada con diseño enriquecido idéntico al PDF.`, 'success');
      onAddLog(`📊 Reporte Excel descargado: Sede ${profile.name}`, 'success');
    } catch (e: any) {
      console.error(e);
      onAddAlert(`Error al generar reporte Excel: ${e.message || e}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportFormalPDF = async (profile: LocationProfile) => {
    setIsExporting('formal-pdf');
    onAddLog(`📑 Generando informe técnico integral formal (ciberseguridad y optimización) para sede "${profile.name}"...`, 'info');
    await new Promise(r => setTimeout(r, 60));
    try {
      await generateFormalPdfReport({
        devices: profile.devices,
        title: `Informe Técnico y Auditoría Integral de Red — Sede ${profile.name}`,
        organization: profile.department || 'Infraestructura de Red y Telecomunicaciones',
        locationName: profile.name,
        auditorName: profile.contactName || 'Auditor Técnico RedMonitor'
      });
      onAddAlert(`📑 Reporte Formal Completo en PDF generado exitosamente.`, 'success');
      onAddLog(`📑 Informe Técnico Integral descargado: Sede ${profile.name}`, 'success');
    } catch (e: any) {
      console.error(e);
      onAddAlert(`Error al generar informe formal: ${e.message || e}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCSV = (profile: LocationProfile) => {
    try {
      exportOfflineLocationCSV(profile);
      onAddAlert(`📋 Tabla CSV de la sede "${profile.name}" exportada correctamente.`, 'success');
      onAddLog(`📋 Tabla CSV exportada: Sede ${profile.name}`, 'info');
    } catch (e: any) {
      onAddAlert(`Error al exportar CSV: ${e.message || e}`, 'error');
    }
  };

  const handleExportJSON = (profile: LocationProfile) => {
    try {
      exportOfflineLocationJSON(profile);
      onAddAlert(`📦 Reporte técnico JSON de la sede "${profile.name}" descargado.`, 'success');
      onAddLog(`📦 Archivo JSON de auditoría descargado: Sede ${profile.name}`, 'info');
    } catch (e: any) {
      onAddAlert(`Error al exportar JSON: ${e.message || e}`, 'error');
    }
  };

  const handleCopyMarkdown = (profile: LocationProfile) => {
    try {
      const md = generateOfflineLocationMarkdown(profile);
      navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
      onAddAlert(`📋 Reporte estructurado en Markdown copiado al portapapeles.`, 'info');
      onAddLog(`📋 Reporte de auditoría Markdown copiado: Sede ${profile.name}`, 'info');
    } catch (e: any) {
      onAddAlert(`Error al copiar Markdown: ${e.message || e}`, 'error');
    }
  };

  const handleExportConsolidatedPDF = async () => {
    if (profiles.length === 0) {
      onAddAlert('No hay sedes registradas para generar el informe consolidado.', 'warning');
      return;
    }
    setIsExporting('consolidated-pdf');
    onAddLog(`📄 Compilando reporte consolidado multi-sede en PDF (${profiles.length} sedes)...`, 'info');
    await new Promise(r => setTimeout(r, 60));
    try {
      await exportConsolidatedOfflinePDF(profiles);
      onAddAlert(`🏆 Reporte consolidado de todas las sedes (${profiles.length}) generado en PDF.`, 'success');
      onAddLog(`🏆 Reporte consolidado multi-sede en PDF descargado`, 'success');
    } catch (e: any) {
      console.error(e);
      onAddAlert(`Error al generar reporte consolidado: ${e.message || e}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportConsolidatedExcel = async () => {
    if (profiles.length === 0) {
      onAddAlert('No hay sedes registradas para exportar Excel.', 'warning');
      return;
    }
    setIsExporting('consolidated-excel');
    onAddLog(`📊 Generando hoja Excel consolidada multi-sede (${profiles.length} sedes)...`, 'info');
    await new Promise(r => setTimeout(r, 60));
    try {
      await exportConsolidatedOfflineExcel(profiles);
      onAddAlert(`📊 Archivo Excel consolidado generado correctamente.`, 'success');
      onAddLog(`📊 Reporte Excel multi-sede descargado`, 'success');
    } catch (e: any) {
      console.error(e);
      onAddAlert(`Error al exportar Excel consolidado: ${e.message || e}`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportConsolidatedCSV = () => {
    if (profiles.length === 0) {
      onAddAlert('No hay sedes registradas para exportar CSV.', 'warning');
      return;
    }
    try {
      exportConsolidatedOfflineCSV(profiles);
      onAddAlert(`📋 Archivo CSV consolidado de todas las sedes descargado.`, 'success');
      onAddLog(`📋 CSV consolidado multi-sede descargado`, 'info');
    } catch (e: any) {
      onAddAlert(`Error al exportar CSV consolidado: ${e.message || e}`, 'error');
    }
  };

  // Filter devices based on state and ping filters
  const filteredDevices = useMemo(() => {
    if (!selectedProfile) return [];
    
    return selectedProfile.devices.filter(d => {
      // 1. Status Filter
      if (statusFilter !== 'all' && d.estado !== statusFilter) {
        return false;
      }
      
      // 2. Ping Filter
      if (pingFilter !== 'all') {
        const pingVal = d.ping;
        if (pingFilter === 'fast') {
          return pingVal !== null && pingVal > 0 && pingVal < 10;
        } else if (pingFilter === 'medium') {
          return pingVal !== null && pingVal >= 10 && pingVal <= 50;
        } else if (pingFilter === 'slow') {
          return pingVal !== null && pingVal > 50;
        } else if (pingFilter === 'offline') {
          return pingVal === null || d.estado === 'Caído';
        }
      }
      
      return true;
    });
  }, [selectedProfile, statusFilter, pingFilter]);

  // SVG Topology coordinates calculation with Layout customization (Jerárquico default)
  const topologyNodes = useMemo(() => {
    if (!selectedProfile) return [];
    
    const nodes: Array<{
      id: string;
      label: string;
      ip: string;
      role: 'gateway' | 'server' | 'client' | 'printer' | 'other';
      x: number;
      y: number;
      state: 'OK' | 'Advertencia' | 'Caído' | 'No_Escaneado';
      device: Device;
    }> = [];

    // Detect devices and group
    const gatewayDevice = selectedProfile.devices.find(d => 
      d.host.toLowerCase().includes('gateway') || 
      d.host.toLowerCase().includes('router') ||
      d.ip.endsWith('.1')
    );

    const otherDevices = filteredDevices.filter(d => d.id !== gatewayDevice?.id);

    // Grouping helper to identify device roles
    const getDeviceRoleAndLabel = (d: Device): { role: 'server' | 'client' | 'printer' | 'other', label: string } => {
      let role: 'server' | 'client' | 'printer' | 'other' = 'client';
      const hostLower = d.host.toLowerCase();
      const vendorLower = d.vendor?.toLowerCase() || '';

      if (hostLower.includes('srv') || hostLower.includes('server') || hostLower.includes('dc') || hostLower.includes('active-directory') || hostLower.includes('nas')) {
        role = 'server';
      } else if (hostLower.includes('prn') || hostLower.includes('print') || hostLower.includes('printer') || vendorLower.includes('epson') || vendorLower.includes('hp') || vendorLower.includes('lexmark')) {
        role = 'printer';
      }

      const label = d.host === '—' ? (d.vendor || 'Dispositivo') : d.host;
      return { role, label };
    };

    // Keep nodes within visible bounds
    const constrainX = (val: number) => Math.max(70, Math.min(880, val));
    const constrainY = (val: number) => Math.max(55, Math.min(495, val));

    if (layoutType === 'radial') {
      const centerX = 475;
      const centerY = 265;

      // Add central Gateway / Router node
      if (gatewayDevice) {
        nodes.push({
          id: gatewayDevice.id,
          label: gatewayDevice.host === '—' ? 'Gateway' : gatewayDevice.host,
          ip: gatewayDevice.ip,
          role: 'gateway',
          x: centerX,
          y: centerY,
          state: gatewayDevice.estado,
          device: gatewayDevice
        });
      } else {
        nodes.push({
          id: 'virtual-backbone',
          label: 'Red Backbone L3',
          ip: selectedProfile.gateway,
          role: 'gateway',
          x: centerX,
          y: centerY,
          state: 'OK',
          device: { id: 'v-core', ip: selectedProfile.gateway, host: 'Core Backbone', mac: '—', ping: 1, estado: 'OK', lastChecked: '', sensorPing: false }
        });
      }

      // Distribute on concentric ring with safety margin
      const radius = 175 * spacingMultiplier;
      otherDevices.forEach((d, index) => {
        const angle = (index * 2 * Math.PI) / otherDevices.length;
        const x = constrainX(centerX + radius * Math.cos(angle));
        const y = constrainY(centerY + radius * Math.sin(angle));
        const { role, label } = getDeviceRoleAndLabel(d);

        nodes.push({
          id: d.id,
          label,
          ip: d.ip,
          role,
          x,
          y,
          state: d.estado,
          device: d
        });
      });

    } else if (layoutType === 'hierarchical') {
      // Top-Down simplified layout: 3 horizontal levels (perfect for tree topology)
      // Level 1: Gateway/Router at Top center (X=475, Y=65)
      // Level 2: Servers in middle (X spaced, Y=190 * spacing)
      // Level 3: Printers and clients at bottom (X spaced, Y=330 * spacing)
      
      const gatewayX = 475;
      const gatewayY = 65;

      if (gatewayDevice) {
        nodes.push({
          id: gatewayDevice.id,
          label: gatewayDevice.host === '—' ? 'Gateway' : gatewayDevice.host,
          ip: gatewayDevice.ip,
          role: 'gateway',
          x: gatewayX,
          y: gatewayY,
          state: gatewayDevice.estado,
          device: gatewayDevice
        });
      } else {
        nodes.push({
          id: 'virtual-backbone',
          label: 'Red Backbone L3',
          ip: selectedProfile.gateway,
          role: 'gateway',
          x: gatewayX,
          y: gatewayY,
          state: 'OK',
          device: { id: 'v-core', ip: selectedProfile.gateway, host: 'Core Backbone', mac: '—', ping: 1, estado: 'OK', lastChecked: '', sensorPing: false }
        });
      }

      // Prepare other devices
      const typedOtherDevices = otherDevices.map(d => {
        const { role, label } = getDeviceRoleAndLabel(d);
        return { device: d, role, label };
      });

      const servers = typedOtherDevices.filter(item => item.role === 'server');
      const endpoints = typedOtherDevices.filter(item => item.role !== 'server');

      // Lay out servers (Level 2)
      const serversY = constrainY(65 + 125 * spacingMultiplier);
      const serverCount = servers.length;
      servers.forEach((item, index) => {
        let x = 475;
        if (serverCount > 1) {
          const span = Math.min(750, 420 * spacingMultiplier); // Dynamic span width
          const step = span / (serverCount - 1);
          x = constrainX(475 - span / 2 + index * step);
        }
        nodes.push({
          id: item.device.id,
          label: item.label,
          ip: item.device.ip,
          role: item.role,
          x,
          y: serversY,
          state: item.device.estado,
          device: item.device
        });
      });

      // Lay out endpoints (Level 3 - Printers and clients)
      const endpointCount = endpoints.length;
      
      if (endpointCount > 0) {
        // If there are many endpoints, split them into two sub-rows to prevent horizontal overlapping
        const splitRows = endpointCount > 5;
        const row1Count = splitRows ? Math.ceil(endpointCount / 2) : endpointCount;
        const row2Count = endpointCount - row1Count;

        endpoints.forEach((item, index) => {
          let x = 475;
          let y = constrainY(65 + 260 * spacingMultiplier);

          if (splitRows) {
            const isRow1 = index < row1Count;
            const rowIndex = isRow1 ? index : index - row1Count;
            const currentRowCount = isRow1 ? row1Count : row2Count;
            
            // Draw row 1 slightly higher and row 2 slightly lower
            y = constrainY(isRow1 ? (65 + 235 * spacingMultiplier) : (65 + 325 * spacingMultiplier));

            const span = Math.min(820, 580 * spacingMultiplier);
            if (currentRowCount > 1) {
              const step = span / (currentRowCount - 1);
              x = constrainX(475 - span / 2 + rowIndex * step);
            } else {
              x = 475;
            }
          } else {
            y = constrainY(65 + 260 * spacingMultiplier);
            const span = Math.min(820, 580 * spacingMultiplier);
            if (endpointCount > 1) {
              const step = span / (endpointCount - 1);
              x = constrainX(475 - span / 2 + index * step);
            } else {
              x = 475;
            }
          }

          nodes.push({
            id: item.device.id,
            label: item.label,
            ip: item.device.ip,
            role: item.role,
            x,
            y,
            state: item.device.estado,
            device: item.device
          });
        });
      }

    } else if (layoutType === 'grid') {
      // Columns Grid layout (Bento block style), extremely clean & spacious
      const cols = 4;
      const colWidth = Math.min(220, 150 * spacingMultiplier);
      const rowHeight = Math.min(150, 100 * spacingMultiplier);
      const startX = 475 - ((cols - 1) * colWidth) / 2;
      const startY = 85;

      const allDevices = [...(gatewayDevice ? [gatewayDevice] : []), ...otherDevices];
      
      allDevices.forEach((d, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = constrainX(startX + col * colWidth);
        const y = constrainY(startY + row * rowHeight);

        let role: 'gateway' | 'server' | 'client' | 'printer' | 'other' = 'client';
        let label = d.host === '—' ? (d.vendor || 'Dispositivo') : d.host;

        if (d.id === gatewayDevice?.id) {
          role = 'gateway';
          label = d.host === '—' ? 'Gateway' : d.host;
        } else {
          const res = getDeviceRoleAndLabel(d);
          role = res.role;
          label = res.label;
        }

        nodes.push({
          id: d.id,
          label,
          ip: d.ip,
          role,
          x,
          y,
          state: d.estado,
          device: d
        });
      });
    }

    return nodes;
  }, [selectedProfile, filteredDevices, layoutType, spacingMultiplier]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0f1d] border border-slate-850 p-5 rounded-lg">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-cyan-400" /> Catalogador de Ubicaciones Offline
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-normal">
            Guarde instantáneas de las subredes y dispositivos escaneados en cada sede u oficina física. Esto le permite visualizar inventarios, topologías e información de auditoría sin estar físicamente conectado a esas redes.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowConsolidatedModal(true)}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-bold py-2 px-3.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Generar informe consolidado de todas las sedes offline registradas"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-400" />
            <span>Informe Consolidado Multi-Sede</span>
          </button>

          <label className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>Importar JSON</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportProfile} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleOpenCreate}
            className="bg-cyan-500 hover:bg-cyan-600 text-[#020617] text-xs font-bold py-2 px-4 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Guardar Sede Actual</span>
          </button>
        </div>
      </div>

      {/* BANNER FOR ACTIVE OFFLINE SIMULATION */}
      {activeProfileId && (
        <div className="bg-cyan-950/20 border border-cyan-500/35 p-3.5 rounded-lg flex items-center justify-between gap-4 text-xs animate-pulse">
          <div className="flex items-center gap-2 text-cyan-400">
            <Layers className="h-4 w-4 animate-spin" />
            <div>
              <span className="font-bold">MODO OFFLINE ACTIVO:</span> Cargado el inventario de la sede {" "}
              <span className="underline font-bold text-white">
                {profiles.find(p => p.id === activeProfileId)?.name || 'Cargada'}
              </span>
            </div>
          </div>
          <button
            onClick={onUnloadProfile}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-3 py-1 rounded text-[10px] uppercase tracking-wider cursor-pointer"
          >
            Volver a Simulación Activa
          </button>
        </div>
      )}

      {/* BACK TO LIST BUTTON */}
      {selectedProfileId && (
        <button
          onClick={() => setSelectedProfileId(null)}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo de ubicaciones
        </button>
      )}

      {/* MAIN CONTENT AREA */}
      {!selectedProfileId ? (
        /* ================== LIST & CREATE VIEW ================== */
        <div className="space-y-6">
          
          {/* SEARCH BAR & GENERAL STATS */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-550" />
              <input
                type="text"
                placeholder="Filtrar sedes por nombre, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded pl-9 pr-4 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div className="text-[10px] text-slate-500 font-mono">
              Total Ubicaciones Registradas: <span className="text-cyan-400 font-bold">{profiles.length}</span>
            </div>
          </div>

          {/* CREATE FORM INLINE MODAL */}
          {isCreating && (
            <form onSubmit={handleSaveProfile} className="bg-[#0b0f19] border border-cyan-500/35 p-5 rounded-lg space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Save className="h-4 w-4" /> Registrar Nueva Sede Física en Caché
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)} 
                  className="text-slate-550 hover:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Sede / Sitio *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Oficina Sucursal Sur"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Segmento de Red (CIDR) *</label>
                  <input
                    type="text"
                    required
                    value={formSubnet}
                    onChange={(e) => setFormSubnet(e.target.value)}
                    placeholder="Ej. 192.168.10.0/24"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departamento / Área Responsable</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Ej. TI / Infraestructura"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interfaz de Red</label>
                  <input
                    type="text"
                    value={formInterface}
                    onChange={(e) => setFormInterface(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puerta de Enlace (Gateway)</label>
                  <input
                    type="text"
                    value={formGateway}
                    onChange={(e) => setFormGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Servidor DNS Primario</label>
                  <input
                    type="text"
                    value={formDns}
                    onChange={(e) => setFormDns(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contacto On-Site</label>
                  <input
                    type="text"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="Nombre del encargado"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción del Entorno de Red</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detalles sobre switches, redundancia L2, VPN..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500 leading-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas de Seguridad Física o Acceso</label>
                  <textarea
                    rows={2}
                    value={formSecurityNotes}
                    onChange={(e) => setFormSecurityNotes(e.target.value)}
                    placeholder="Ubicación física de racks, aire acondicionado, controles biométricos..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500 leading-normal"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded border border-slate-850 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <input
                    id="chk-capture"
                    type="checkbox"
                    checked={captureCurrentDevices}
                    onChange={(e) => setCaptureCurrentDevices(e.target.checked)}
                    className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-850 rounded"
                  />
                  <label htmlFor="chk-capture" className="font-semibold text-slate-300 cursor-pointer">
                    Capturar instantánea actual del escáner ({activeDevices.length} hosts detectados)
                  </label>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  Guarda la IP, MAC y latencia de cada host de forma persistente.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold py-2 px-4 rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold py-2 px-5 rounded transition-colors cursor-pointer"
                >
                  Registrar Ubicación
                </button>
              </div>
            </form>
          )}

          {/* GRID OF SAVED LOCATIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProfiles.length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-slate-850 rounded-lg">
                <Activity className="h-8 w-8 text-slate-600 mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No se encontraron sedes guardadas</p>
                <p className="text-[11px] text-slate-500 mt-1">Haga clic en "Guardar Sede Actual" para registrar su ubicación actual.</p>
              </div>
            ) : (
              filteredProfiles.map(p => {
                const isActive = activeProfileId === p.id;
                const okCount = p.devices.filter(d => d.estado === 'OK').length;
                const downCount = p.devices.filter(d => d.estado === 'Caído').length;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`bg-[#0a0f1d] border rounded-lg overflow-hidden group hover:border-cyan-500/40 transition-all duration-350 cursor-pointer flex flex-col ${
                      isActive ? 'ring-1 ring-cyan-500 border-cyan-500/50' : 'border-slate-850'
                    }`}
                  >
                    {/* Header bar styled for Enterprise feel */}
                    <div className="bg-[#0e1629] p-4 border-b border-slate-850/60 flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[8px] bg-cyan-900/40 text-cyan-400 border border-cyan-800/20 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider uppercase">
                          {p.department || 'GENERAL'}
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors pt-1">
                          {p.name}
                        </h4>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileForReportModal(p);
                          }}
                          title="Generar informes de auditoría (PDF, Excel, CSV, Markdown)"
                          className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleExportProfile(p, e)}
                          title="Exportar archivo de configuración JSON"
                          className="p-1 text-slate-550 hover:text-cyan-400 hover:bg-slate-900 rounded transition-colors"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProfile(p.id, p.name, e)}
                          title="Eliminar perfil"
                          className="p-1 text-slate-550 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta info of network */}
                    <div className="p-4 flex-1 space-y-3 text-[11px]">
                      
                      <div className="grid grid-cols-2 gap-2 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-850/60">
                        <div>
                          <span className="text-[9px] text-slate-550 block uppercase font-bold">Subred CIDR:</span>
                          <span className="text-slate-300 font-bold">{p.subnet}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-550 block uppercase font-bold">Hosts Totales:</span>
                          <span className="text-cyan-400 font-bold">{p.devices.length} IPs</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed">
                        {p.description || 'Sin descripción detallada del entorno.'}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono pt-1">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{okCount} OK</span>
                        </div>
                        {downCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>{downCount} Caídos</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3 text-slate-550" />
                          <span>{p.createdAt.split(',')[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-3 bg-slate-950/50 border-t border-slate-850/60 flex items-center justify-between text-[11px] gap-2">
                      <span className="text-cyan-400 font-bold flex items-center gap-1 hover:underline">
                        Ver Mapa & Auditoría <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileForReportModal(p);
                          }}
                          className="px-2 py-1.5 rounded text-[10px] font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Abrir generador de informes de auditoría de esta sede"
                        >
                          <FileText className="h-3 w-3 text-cyan-400" />
                          <span>Informes</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isActive) {
                              onUnloadProfile();
                            } else {
                              onLoadProfile(p);
                            }
                          }}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${
                            isActive 
                              ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20'
                              : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'
                          }`}
                        >
                          {isActive ? (
                            <> Desconectar </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-current" /> Cargar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ================== DETAILED SINGLE PROFILE VIEW ================== */
        <div className="space-y-6">
          {/* HEADER CARD OF THE SELECTED LOCATION */}
          <div className="bg-[#0a0f1d] border border-slate-850 p-5 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-sm font-mono font-bold tracking-wider uppercase">
                  {selectedProfile.department || 'Sede Local'}
                </span>
                <span className="text-slate-500 text-xs font-mono">Último Guardado: {selectedProfile.createdAt}</span>
              </div>
              <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                <Globe className="h-5 w-5 text-cyan-400" /> {selectedProfile.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {selectedProfile.description || 'Este perfil no cuenta con descripción detallada escrita por auditores de red.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setProfileForReportModal(selectedProfile)}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold py-2 px-3.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Abrir generador de informes de auditoría para esta sede"
              >
                <FileText className="h-4 w-4 text-cyan-400" />
                <span>Generar Informe de Auditoría</span>
              </button>

              <button
                onClick={() => handleExportPDF(selectedProfile)}
                disabled={isExporting !== null}
                className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-xs font-bold py-2 px-3 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Exportar informe oficial en PDF"
              >
                {isExporting === 'pdf' ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" /> : <Download className="h-3.5 w-3.5 text-rose-400" />}
                <span>PDF</span>
              </button>

              <button
                onClick={() => handleExportExcel(selectedProfile)}
                disabled={isExporting !== null}
                className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-200 text-xs font-bold py-2 px-3 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Exportar informe formateado en Excel"
              >
                {isExporting === 'excel' ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />}
                <span>Excel</span>
              </button>

              <button
                onClick={(e) => handleExportProfile(selectedProfile, e)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold py-2 px-3 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Exportar configuración en formato JSON"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => {
                  if (activeProfileId === selectedProfile.id) {
                    onUnloadProfile();
                  } else {
                    onLoadProfile(selectedProfile);
                  }
                }}
                className={`text-xs font-bold py-2 px-4 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeProfileId === selectedProfile.id
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-[#020617]'
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {activeProfileId === selectedProfile.id ? 'Cerrar Modo Offline' : 'Cargar en Monitor'}
              </button>
            </div>
          </div>

          {/* CONTROL PANEL FOR FILTERS */}
          <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-cyan-400" /> Filtros de Inspección de Red (Offline)
              </h4>
              
              {(statusFilter !== 'all' || pingFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPingFilter('all');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                >
                  ✕ Limpiar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* STATUS FILTER GROUP */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Filtrar por Estado de Conexión:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todos', colorClass: 'border-slate-850 text-slate-400 hover:text-slate-200' },
                    { id: 'OK', label: '🟢 Conectado (OK)', colorClass: 'border-emerald-950/40 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10' },
                    { id: 'Advertencia', label: '🟡 Alerta', colorClass: 'border-amber-950/40 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10' },
                    { id: 'Caído', label: '🔴 Caído (Offline)', colorClass: 'border-rose-950/40 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setStatusFilter(btn.id)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        statusFilter === btn.id
                          ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20'
                          : btn.colorClass
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PING FILTER GROUP */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Filtrar por Latencia de Ping:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todos', colorClass: 'border-slate-850 text-slate-400 hover:text-slate-200' },
                    { id: 'fast', label: '⚡ Rápido (<10 ms)', colorClass: 'border-cyan-950/40 text-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10' },
                    { id: 'medium', label: '⏳ Medio (10-50 ms)', colorClass: 'border-blue-950/40 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10' },
                    { id: 'slow', label: '🐢 Lento (>50 ms)', colorClass: 'border-orange-950/40 text-orange-500 bg-orange-500/5 hover:bg-orange-500/10' },
                    { id: 'offline', label: '❌ Inalcanzable', colorClass: 'border-rose-950/40 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10' }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => setPingFilter(btn.id)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        pingFilter === btn.id
                          ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20'
                          : btn.colorClass
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID FOR DETAILED STATS & MAP */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: NETWORK AND RACK SPECIFICATIONS (Left Panel) */}
            <div className="space-y-5 lg:col-span-1">
              
              {/* NETWORK ARCHITECTURE CARD */}
              <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-cyan-400" /> Especificaciones de Subred
                </h4>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-900 font-mono">
                    <span className="text-slate-500">Dirección Subred:</span>
                    <span className="text-slate-200 font-bold">{selectedProfile.subnet}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 font-mono">
                    <span className="text-slate-500">Gateway:</span>
                    <span className="text-slate-200 font-bold">{selectedProfile.gateway}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 font-mono">
                    <span className="text-slate-500">Servidor DNS:</span>
                    <span className="text-slate-200 font-bold">{selectedProfile.dns}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 font-mono">
                    <span className="text-slate-500">Adaptador Local:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[150px]" title={selectedProfile.interfaceName}>
                      {selectedProfile.interfaceName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900 font-mono">
                    <span className="text-slate-500">IPs de Host:</span>
                    <span className="text-cyan-400 font-bold">{selectedProfile.devices.length} hosts en caché</span>
                  </div>
                </div>
              </div>

              {/* AUDIT CONTACTS CARD */}
              {(selectedProfile.contactName || selectedProfile.contactPhone) && (
                <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-cyan-400" /> Enlace Técnico On-Site
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {selectedProfile.contactName && (
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-550 block">Encargado Local / Enlace</span>
                        <span className="text-slate-200 font-medium">{selectedProfile.contactName}</span>
                      </div>
                    )}
                    {selectedProfile.contactPhone && (
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-550 block">Teléfono / Extensiones</span>
                        <span className="text-slate-200 font-mono">{selectedProfile.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RACK PHYSICAL SECURITY NOTES */}
              {selectedProfile.securityNotes && (
                <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Seguridad Física y Racks
                  </h4>
                  <div className="p-3 bg-amber-500/5 rounded border border-amber-500/10 text-xs text-amber-300 leading-normal">
                    <span className="font-bold block text-[10px] uppercase font-mono tracking-wider mb-1 text-amber-400">Instrucciones de Auditor:</span>
                    {selectedProfile.securityNotes}
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: INTERACTIVE SVG TOPOLOGY MAP (Right Panel - Takes 2 spans) */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-4">
                <div className="border-b border-slate-850 pb-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-cyan-400" /> Mapa Topológico Offline (Instantánea)
                    </h4>
                    
                    {/* Model Graphics / Distribution Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800 shrink-0">
                      <span className="text-[9px] font-mono text-slate-500 uppercase px-1 hidden md:inline">Estructura:</span>
                      <button
                        onClick={() => {
                          setLayoutType('hierarchical');
                          localStorage.setItem('redmonitor_topo_layout', 'hierarchical');
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                          layoutType === 'hierarchical'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                        title="Modelo jerárquico simplificado (Árbol LAN)"
                      >
                        🌳 Árbol LAN
                      </button>
                      <button
                        onClick={() => {
                          setLayoutType('radial');
                          localStorage.setItem('redmonitor_topo_layout', 'radial');
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                          layoutType === 'radial'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                        title="Anillo / Estrella clásico"
                      >
                        ⭕ Anillo
                      </button>
                      <button
                        onClick={() => {
                          setLayoutType('grid');
                          localStorage.setItem('redmonitor_topo_layout', 'grid');
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                          layoutType === 'grid'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                        title="Cuadrícula bento alineada"
                      >
                        ⊞ Bento Grid
                      </button>
                    </div>
                  </div>

                  {/* Visual controls: spacing and toggles */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-slate-900/60">
                    <div className="flex items-center gap-3.5 text-[10px] text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={showLabels}
                          onChange={(e) => {
                            setShowLabels(e.target.checked);
                            localStorage.setItem('redmonitor_topo_show_labels', String(e.target.checked));
                          }}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                        />
                        <span>Mostrar Nombres</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={showIPs}
                          onChange={(e) => {
                            setShowIPs(e.target.checked);
                            localStorage.setItem('redmonitor_topo_show_ips', String(e.target.checked));
                          }}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                        />
                        <span>Mostrar IPs</span>
                      </label>
                    </div>

                    {/* Spacing multiplier slider */}
                    <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-900/60 text-[10px] text-slate-400 w-full sm:w-auto">
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-500">Separación:</span>
                      <input
                        type="range"
                        min="1.0"
                        max="2.2"
                        step="0.1"
                        value={spacingMultiplier}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSpacingMultiplier(val);
                          localStorage.setItem('redmonitor_topo_spacing', String(val));
                        }}
                        className="h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500 w-24 focus:outline-none"
                      />
                      <span className="font-mono text-cyan-400 font-bold shrink-0 min-w-[28px] text-right">{spacingMultiplier.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>

                {/* SVG TOPOLOGY RENDERING */}
                <div className="relative bg-slate-950/80 border border-slate-900 rounded-md p-3 overflow-hidden flex items-center justify-center min-h-[420px]">
                  {selectedProfile.devices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Layers className="h-8 w-8 text-slate-700 mx-auto mb-2 animate-bounce" />
                      <span>No hay dispositivos guardados en esta instantánea para mapear.</span>
                    </div>
                  ) : (
                    <svg 
                      viewBox="0 0 950 550" 
                      className="w-full h-auto text-white select-none font-sans"
                    >
                      {/* CONNECTIVITY LINES (Background lines first) */}
                      {topologyNodes.map(node => {
                        if (node.role === 'gateway') return null;
                        
                        // Find the gateway coordinates
                        const gateway = topologyNodes.find(n => n.role === 'gateway') || { x: 475, y: 265 };
                        
                        // Set stroke color based on node state
                        let strokeColor = 'rgba(6, 182, 212, 0.25)'; // Default cyan
                        let isDashed = false;
                        if (node.state === 'Caído') {
                          strokeColor = 'rgba(239, 68, 68, 0.2)';
                          isDashed = true;
                        } else if (node.state === 'Advertencia') {
                          strokeColor = 'rgba(245, 158, 11, 0.35)';
                        }

                        return (
                          <line
                            key={`line-${node.id}`}
                            x1={gateway.x}
                            y1={gateway.y}
                            x2={node.x}
                            y2={node.y}
                            stroke={strokeColor}
                            strokeWidth={activeProfileId === selectedProfile?.id ? "2" : "1.5"}
                            strokeDasharray={isDashed ? "4,4" : "0"}
                          />
                        );
                      })}

                      {/* SVG INTERACTIVE NODES */}
                      {topologyNodes.map(node => {
                        let nodeColor = 'fill-[#0f172a] stroke-cyan-500';
                        let labelColor = 'text-cyan-400';
                        let size = 18;
                        let iconChar = '💻'; // default client PC

                        if (node.role === 'gateway') {
                          nodeColor = 'fill-[#0f172a] stroke-amber-500';
                          labelColor = 'text-amber-400';
                          size = 24;
                          iconChar = '🎛️'; // router switch
                        } else if (node.role === 'server') {
                          nodeColor = 'fill-[#0f172a] stroke-purple-500';
                          labelColor = 'text-purple-400';
                          size = 20;
                          iconChar = '🗄️'; // rack server
                        } else if (node.role === 'printer') {
                          nodeColor = 'fill-[#0f172a] stroke-emerald-500';
                          labelColor = 'text-emerald-400';
                          size = 17;
                          iconChar = '🖨️'; // printer
                        }

                        // Apply red border if node is down
                        if (node.state === 'Caído') {
                          nodeColor = 'fill-[#1e1014] stroke-rose-600';
                        }

                        // Short label to prevent overlapping
                        const shortLabel = node.label.length > 15 ? node.label.substring(0, 13) + '...' : node.label;

                        return (
                          <g key={`node-${node.id}`} className="cursor-help transition-transform hover:scale-105">
                            {/* Native SVG tooltip */}
                            <title>{`Dispositivo: ${node.label}\nIP: ${node.ip}\nMAC: ${node.device.mac || '—'}\nFabricante: ${node.device.vendor || 'Desconocido'}\nEstado: ${node.state === 'OK' ? 'Conectado (OK)' : node.state === 'Caído' ? 'Fuera de línea (Caído)' : 'Alerta'}`}</title>
                            
                            {/* Circle Base */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={size}
                              className={`${nodeColor} transition-all`}
                              strokeWidth="2.5"
                            />
                            
                            {/* Emoji Icon overlay */}
                            <text
                              x={node.x}
                              y={node.y + 5}
                              textAnchor="middle"
                              style={{ fontSize: size - 3 }}
                            >
                              {iconChar}
                            </text>

                            {/* Node Hostname Label */}
                            {showLabels && (
                              <text
                                x={node.x}
                                y={node.y - size - 5}
                                textAnchor="middle"
                                className="font-bold text-[9px] fill-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                              >
                                {shortLabel}
                              </text>
                            )}

                            {/* Node IP Address Label */}
                            {showIPs && (
                              <text
                                x={node.x}
                                y={node.y + size + 11}
                                textAnchor="middle"
                                className="font-mono text-[8px] fill-cyan-400/90 font-medium drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                              >
                                {node.ip}
                              </text>
                            )}

                            {/* Mini Status Dot */}
                            <circle
                              cx={node.x + size - 3}
                              cy={node.y - size + 3}
                              r="3.5"
                              className={
                                node.state === 'OK' ? 'fill-emerald-400 animate-pulse' :
                                node.state === 'Advertencia' ? 'fill-amber-400' :
                                'fill-rose-500'
                              }
                            />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                  
                  {/* FLOATING LEGEND */}
                  <div className="absolute bottom-2.5 right-2.5 bg-[#070b13]/90 border border-slate-850 px-3 py-2 rounded flex gap-4 text-[8px] font-mono uppercase tracking-wider text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OK
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Alerta
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Caído
                    </div>
                  </div>
                </div>

                <div className="text-[11px] leading-normal text-slate-400 bg-[#070b13] border border-slate-850 p-3 rounded flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>
                    <strong>Exploración Topológica Offline:</strong> Este mapa recrea el tendido de red registrado en el momento del escaneo físico. Puede inspeccionar las conexiones con total seguridad.
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* SECTION 3: TABULAR DEVICE INVENTARY (Bottom Full Width) */}
          <div className="bg-[#0a0f1d] border border-slate-850 p-4 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-cyan-400" /> Inventario de Dispositivos Registrados
                </h4>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                  Mostrando <strong className="text-cyan-400">{filteredDevices.length}</strong> de <strong className="text-slate-300">{selectedProfile.devices.length}</strong> hosts
                </span>
              </div>

              {/* Quick Report Actions for this Table */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleCopyMarkdown(selectedProfile)}
                  className="text-[10px] text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Copiar tabla en formato Markdown"
                >
                  <Copy className="h-3 w-3 text-cyan-400" />
                  <span>{copiedMarkdown ? '¡Copiado!' : 'Markdown'}</span>
                </button>
                <button
                  onClick={() => handleExportCSV(selectedProfile)}
                  className="text-[10px] text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Exportar tabla a formato CSV"
                >
                  <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExportExcel(selectedProfile)}
                  disabled={isExporting !== null}
                  className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-950/70 px-2.5 py-1 rounded border border-emerald-800/50 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Exportar a Excel (.xls) con formato enriquecido"
                >
                  <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => handleExportPDF(selectedProfile)}
                  disabled={isExporting !== null}
                  className="text-[10px] text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/70 px-2.5 py-1 rounded border border-rose-850/50 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Exportar a PDF oficial"
                >
                  <Download className="h-3 w-3 text-rose-400" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Hostname</th>
                    <th className="py-2.5 px-3">MAC Address</th>
                    <th className="py-2.5 px-3">Fabricante</th>
                    <th className="py-2.5 px-3 text-center">Último Ping</th>
                    <th className="py-2.5 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono text-[11px]">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 bg-slate-950/20">
                        <p className="font-sans text-slate-400">Ningún dispositivo coincide con los filtros activos.</p>
                        <button
                          onClick={() => {
                            setStatusFilter('all');
                            setPingFilter('all');
                          }}
                          className="mt-2 text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
                        >
                          Restablecer Filtros
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map(d => {
                      const hostName = resolveDeviceNameByMac(d.mac, d.host, d.ip);
                      const vendorName = d.vendor && d.vendor !== 'Desconocido' && d.vendor !== 'Dispositivo de Red Activo' ? d.vendor : resolveVendorByMac(d.mac, d.host, d.ip);
                      return (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-bold text-slate-200">{d.ip}</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-semibold font-sans">{hostName}</td>
                          <td className="py-2.5 px-3 text-slate-400">{d.mac}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{vendorName}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">
                            {d.ping !== null ? `${d.ping} ms` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                            d.estado === 'OK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            d.estado === 'Advertencia' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {d.estado}
                          </span>
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
      )}

      {/* ================= MODAL 1: REPORTE DE AUDITORÍA DE SEDE OFFLINE ================= */}
      {profileForReportModal && (() => {
        const reportTotals = calculateLocationTotals(profileForReportModal);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[#0b1120] border border-cyan-500/30 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="bg-[#0e1629] p-4 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                      Auditoría Sede Offline
                    </span>
                    <span className="text-slate-400 text-xs font-mono">{profileForReportModal.subnet}</span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    Informe de Auditoría: {profileForReportModal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Genere y descargue informes oficiales con el mismo formato, diseño y rigurosidad técnica de las auditorías de red en vivo.
                  </p>
                </div>
                <button
                  onClick={() => setProfileForReportModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Metric Summary Card */}
                <div className="bg-[#080d19] border border-cyan-500/20 rounded-lg p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Total Hosts</span>
                    <span className="text-base font-bold text-white">{reportTotals.totalHosts}</span>
                    <span className="text-[9px] text-emerald-400 block font-mono">({reportTotals.okHosts} OK)</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Latencia Media</span>
                    <span className="text-base font-bold text-cyan-400">{reportTotals.avgLatency} ms</span>
                    <span className="text-[9px] text-slate-500 block font-mono">LAN Local</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Seguridad LAN</span>
                    <span className="text-base font-bold text-emerald-400">{reportTotals.safetyScore}%</span>
                    <span className="text-[9px] text-slate-400 block truncate font-mono">{reportTotals.rank.split('(')[0]}</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Gateway / DNS</span>
                    <span className="text-[11px] font-mono font-bold text-slate-300 block truncate" title={profileForReportModal.gateway}>
                      {profileForReportModal.gateway || '192.168.1.1'}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">{profileForReportModal.dns || '1.1.1.1'}</span>
                  </div>
                </div>

                {/* Export Format Cards */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Seleccione el formato del informe:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* PDF Ejecutivo */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                          <Download className="h-4 w-4" /> Informe Ejecutivo PDF
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Documento formal imprimible con encabezados corporativos, métricas, score de seguridad y tabla completa de interfaces y direcciones MAC.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportPDF(profileForReportModal)}
                        disabled={isExporting !== null}
                        className="mt-3 w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isExporting === 'pdf' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        <span>{isExporting === 'pdf' ? 'Generando...' : 'Descargar Informe PDF'}</span>
                      </button>
                    </div>

                    {/* Excel Formateado */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <FileSpreadsheet className="h-4 w-4" /> Informe Formateado Excel (.xls)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Hoja de cálculo estructurada con la tipografía, banners y paleta de colores idéntica al PDF, ideal para análisis y tabulación en Microsoft Excel.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportExcel(profileForReportModal)}
                        disabled={isExporting !== null}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isExporting === 'excel' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        <span>{isExporting === 'excel' ? 'Generando...' : 'Descargar Informe Excel'}</span>
                      </button>
                    </div>

                    {/* PDF Formal Exhaustivo */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                          <ShieldCheck className="h-4 w-4" /> Auditoría Formal ISO & Plan de Optimización
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Reporte técnico multi-página exhaustivo con categorización de vulnerabilidades CVSS, segmentación L2/L3 y plan de mitigación paso a paso.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportFormalPDF(profileForReportModal)}
                        disabled={isExporting !== null}
                        className="mt-3 w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isExporting === 'formal-pdf' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        <span>{isExporting === 'formal-pdf' ? 'Generando...' : 'Generar PDF Formal Completo'}</span>
                      </button>
                    </div>

                    {/* Copiar Markdown */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                          <Copy className="h-4 w-4 text-cyan-400" /> Copiar al Portapapeles (Markdown)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Texto formateado con tablas y viñetas listo para enviar por correo electrónico, agregar a wikis internas, tickets de Jira o documentación técnica.
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyMarkdown(profileForReportModal)}
                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedMarkdown ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
                        <span>{copiedMarkdown ? '¡Markdown Copiado!' : 'Copiar Texto Markdown'}</span>
                      </button>
                    </div>

                    {/* CSV */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Tabla CSV (Datos Puros)
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Archivo delimitado por comas con todos los hosts, interfaces y latencias para importar en bases de datos relacionales o Power BI.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportCSV(profileForReportModal)}
                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Exportar Archivo CSV</span>
                      </button>
                    </div>

                    {/* JSON */}
                    <div className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-lg flex flex-col justify-between transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                          <FileJson className="h-4 w-4 text-cyan-400" /> Metadatos Técnicos JSON
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Esquema estructurado compatible con auditorías de red y respaldos automatizados de RedMonitor.
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportJSON(profileForReportModal)}
                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Exportar Archivo JSON</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Action: Open in Live Audit */}
                {onNavigateToAudit && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      ¿Desea explorar los {reportTotals.totalHosts} hosts en el radar de escaneo y auditoría en tiempo real?
                    </span>
                    <button
                      onClick={() => {
                        onLoadProfile(profileForReportModal);
                        setProfileForReportModal(null);
                        onNavigateToAudit();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Cargar y Abrir en Auditoría de Red</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-[#0e1629] p-3.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  RedMonitor Sonda Offline • Diseñado por Asneider Zapata
                </span>
                <button
                  onClick={() => setProfileForReportModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-4 rounded text-xs cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL 2: INFORME CONSOLIDADO MULTI-SEDE ================= */}
      {showConsolidatedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-cyan-500/30 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#0e1629] p-4 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                  Consolidado Corporativo
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
                  Informe Consolidado Multi-Sede ({profiles.length} Sedes)
                </h3>
                <p className="text-xs text-slate-400">
                  Agrupe y consolide el inventario de todas las sedes y sucursales físicas en un único informe ejecutivo y de telecomunicaciones.
                </p>
              </div>
              <button
                onClick={() => setShowConsolidatedModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Global Statistics */}
              <div className="bg-[#080d19] border border-cyan-500/20 rounded-lg p-3.5 grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Total Sedes</span>
                  <span className="text-base font-bold text-cyan-400">{profiles.length}</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Dispositivos Globales</span>
                  <span className="text-base font-bold text-white">
                    {profiles.reduce((acc, p) => acc + (p.devices?.length || 0), 0)}
                  </span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800/60">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Estado General</span>
                  <span className="text-base font-bold text-emerald-400">Sincronizado</span>
                </div>
              </div>

              {/* Format Options */}
              <div className="space-y-3">
                <button
                  onClick={handleExportConsolidatedPDF}
                  disabled={isExporting !== null}
                  className="w-full bg-rose-900/40 hover:bg-rose-800/70 border border-rose-850 text-rose-200 hover:text-white p-3.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 text-left">
                    <Download className="h-5 w-5 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Descargar PDF Consolidado Multi-Sede</div>
                      <div className="text-[11px] text-slate-400">Reporte imprimible con tabla comparativa de sedes y desglose de hosts.</div>
                    </div>
                  </div>
                  {isExporting === 'consolidated-pdf' ? <RefreshCw className="h-4 w-4 animate-spin text-rose-400" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                </button>

                <button
                  onClick={handleExportConsolidatedExcel}
                  disabled={isExporting !== null}
                  className="w-full bg-emerald-900/40 hover:bg-emerald-800/70 border border-emerald-850 text-emerald-200 hover:text-white p-3.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 text-left">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Descargar Excel Consolidado Multi-Sede (.xls)</div>
                      <div className="text-[11px] text-slate-400">Hoja de cálculo formateada con resumen de sucursales e inventario general.</div>
                    </div>
                  </div>
                  {isExporting === 'consolidated-excel' ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                </button>

                <button
                  onClick={handleExportConsolidatedCSV}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white p-3.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-left">
                    <FileSpreadsheet className="h-5 w-5 text-slate-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Exportar CSV Consolidado Global</div>
                      <div className="text-[11px] text-slate-400">Listado plano delimitado por comas con todas las sedes y hosts.</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="bg-[#0e1629] p-3.5 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowConsolidatedModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-4 rounded text-xs cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
