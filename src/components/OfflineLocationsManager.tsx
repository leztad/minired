import React, { useState, useMemo } from 'react';
import { 
  MapPin, Database, Save, Download, Upload, Trash2, Eye, Play, Check, Plus, 
  Search, Share2, FileText, Layers, Activity, Cpu, Server, Globe, Clock, 
  ArrowLeft, AlertTriangle, CheckCircle2, Info, FileCode, CheckSquare, PlusCircle, HelpCircle, Key, ChevronRight
} from 'lucide-react';
import { Device } from '../types';

export interface LocationProfile {
  id: string;
  name: string;
  subnet: string;
  interfaceName: string;
  gateway: string;
  dns: string;
  description: string;
  department?: string;
  createdAt: string;
  devices: Device[];
  contactName?: string;
  contactPhone?: string;
  securityNotes?: string;
}

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
  onUnloadProfile
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

  // SVG Topology coordinates calculation
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

    const centerX = 300;
    const centerY = 200;

    // Detect devices and group
    const gatewayDevice = selectedProfile.devices.find(d => 
      d.host.toLowerCase().includes('gateway') || 
      d.host.toLowerCase().includes('router') ||
      d.ip.endsWith('.1')
    );

    const otherDevices = selectedProfile.devices.filter(d => d.id !== gatewayDevice?.id);

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
      // Create virtual core node representing the subnet backbone
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

    // Distribute other devices in concentric rings
    const radius = 130;
    otherDevices.forEach((d, index) => {
      const angle = (index * 2 * Math.PI) / otherDevices.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      let role: 'server' | 'client' | 'printer' | 'other' = 'client';
      const hostLower = d.host.toLowerCase();
      const vendorLower = d.vendor?.toLowerCase() || '';

      if (hostLower.includes('srv') || hostLower.includes('server') || hostLower.includes('dc') || hostLower.includes('active-directory') || hostLower.includes('nas')) {
        role = 'server';
      } else if (hostLower.includes('prn') || hostLower.includes('print') || hostLower.includes('printer') || vendorLower.includes('epson') || vendorLower.includes('hp') || vendorLower.includes('lexmark')) {
        role = 'printer';
      }

      nodes.push({
        id: d.id,
        label: d.host === '—' ? (d.vendor || 'Dispositivo') : d.host,
        ip: d.ip,
        role,
        x,
        y,
        state: d.estado,
        device: d
      });
    });

    return nodes;
  }, [selectedProfile]);

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
                    <div className="p-3 bg-slate-950/50 border-t border-slate-850/60 flex items-center justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold flex items-center gap-1 hover:underline">
                        Ver Mapa & Auditoría <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                      
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
                            <Play className="h-3 w-3 fill-current" /> Cargar offline
                          </>
                        )}
                      </button>
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

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={(e) => handleExportProfile(selectedProfile, e)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" /> Exportar JSON
              </button>

              <button
                onClick={() => {
                  if (activeProfileId === selectedProfile.id) {
                    onUnloadProfile();
                  } else {
                    onLoadProfile(selectedProfile);
                  }
                }}
                className={`text-xs font-bold py-2 px-5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeProfileId === selectedProfile.id
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-[#020617]'
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {activeProfileId === selectedProfile.id ? 'Cerrar Modo Offline' : 'Cargar en Monitor Activo'}
              </button>
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
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-cyan-400" /> Mapa Topológico Offline (Instantánea)
                  </h4>
                  <span className="text-[9.5px] text-slate-550 font-mono">Estructura de Estrella LAN</span>
                </div>

                {/* SVG TOPOLOGY RENDERING */}
                <div className="relative bg-slate-950/80 border border-slate-900 rounded-md p-2 overflow-hidden flex items-center justify-center min-h-[380px]">
                  {selectedProfile.devices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Layers className="h-8 w-8 text-slate-700 mx-auto mb-2 animate-bounce" />
                      <span>No hay dispositivos guardados en esta instantánea para mapear.</span>
                    </div>
                  ) : (
                    <svg 
                      viewBox="0 0 600 400" 
                      className="w-full max-w-[600px] h-auto text-white select-none font-sans"
                    >
                      {/* CONNECTIVITY LINES (Background lines first) */}
                      {topologyNodes.map(node => {
                        if (node.role === 'gateway') return null;
                        
                        // Find the gateway coordinates
                        const gateway = topologyNodes.find(n => n.role === 'gateway') || { x: 300, y: 200 };
                        
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
                        let size = 16;
                        let iconChar = '💻'; // default client PC

                        if (node.role === 'gateway') {
                          nodeColor = 'fill-[#0f172a] stroke-amber-500';
                          labelColor = 'text-amber-400';
                          size = 22;
                          iconChar = '🎛️'; // router switch
                        } else if (node.role === 'server') {
                          nodeColor = 'fill-[#0f172a] stroke-purple-500';
                          labelColor = 'text-purple-400';
                          size = 18;
                          iconChar = '🗄️'; // rack server
                        } else if (node.role === 'printer') {
                          nodeColor = 'fill-[#0f172a] stroke-emerald-500';
                          labelColor = 'text-emerald-400';
                          size = 15;
                          iconChar = '🖨️'; // printer
                        }

                        // Apply red border if node is down
                        if (node.state === 'Caído') {
                          nodeColor = 'fill-[#1e1014] stroke-rose-600';
                        }

                        return (
                          <g key={`node-${node.id}`} className="cursor-help transition-transform hover:scale-110">
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
                              y={node.y + 4}
                              textAnchor="middle"
                              style={{ fontSize: size - 4 }}
                            >
                              {iconChar}
                            </text>

                            {/* Node Hostname Label */}
                            <text
                              x={node.x}
                              y={node.y - size - 4}
                              textAnchor="middle"
                              className="font-bold text-[8.5px] fill-slate-300"
                            >
                              {node.label}
                            </text>

                            {/* Node IP Address Label */}
                            <text
                              x={node.x}
                              y={node.y + size + 11}
                              textAnchor="middle"
                              className="font-mono text-[8.5px] fill-cyan-400 font-medium"
                            >
                              {node.ip}
                            </text>

                            {/* Mini Status Dot */}
                            <circle
                              cx={node.x + size - 3}
                              cy={node.y - size + 3}
                              r="3.5"
                              className={
                                node.state === 'OK' ? 'fill-emerald-400' :
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
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-cyan-400" /> Inventario de Dispositivos Registrados ({selectedProfile.devices.length} Hosts)
            </h4>

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
                  {selectedProfile.devices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-650">
                        No hay dispositivos registrados en esta sede física.
                      </td>
                    </tr>
                  ) : (
                    selectedProfile.devices.map(d => (
                      <tr key={d.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-bold text-slate-200">{d.ip}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">{d.host === '—' ? '—' : d.host}</td>
                        <td className="py-2.5 px-3 text-slate-400">{d.mac}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{d.vendor || 'Desconocido'}</td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
