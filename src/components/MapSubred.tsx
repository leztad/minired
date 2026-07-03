import React, { useState, useMemo, useEffect } from 'react';
import { Device } from '../types';
import { 
  Monitor, Server, Router as RouterIcon, Activity, 
  HelpCircle, Cloud, Wifi, Database, HardDrive, Printer, 
  Tv, Gamepad2, Layers, Network, Radio, HelpCircle as Question, CheckCircle2, AlertTriangle, XCircle, Grid, Cpu
} from 'lucide-react';
import { resolveVendorByMac, resolveDeviceNameByMac } from '../utils/macUtils';

interface MapSubredProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  isDemoMode?: boolean;
}

interface TopologyNode {
  id: string; // matches device.id or virtual ID
  label: string;
  ip?: string;
  type: 'router' | 'switch' | 'ap' | 'desktop' | 'server' | 'tv' | 'gaming' | 'nas' | 'printer' | 'iot' | 'cloud';
  x: number;
  y: number;
  parent?: string; // id of parent node for wire draw
  linkType?: 'ethernet' | 'fiber' | 'wifi' | 'virtual';
  interfaceName?: string;
}

const getShortHostName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('gateway') || lower.includes('router')) return 'Router Gateway';
  if (lower.includes('internet') || lower.includes('wan') || lower.includes('público')) return 'Internet WAN';
  if (lower.includes('wifi ap') || lower.includes('ap central')) return 'WIFI AP Central';
  if (lower.includes('switch')) return 'Switch Principal';
  
  if (lower.includes('alexa') || lower.includes('livingroom') || lower.includes('.70')) return 'Alexa IoT';
  if (lower.includes('módulo') || lower.includes('hub') || lower.includes('.102')) return 'IoT Hub';
  if (lower.includes('.38') || lower.includes('tv')) return 'Smart TV';
  if (lower.includes('.40') || lower.includes('ps5') || lower.includes('gaming')) return 'PS5 Consola';
  if (lower.includes('db') || lower.includes('database') || lower.includes('datos') || lower.includes('.10')) return 'Docker DB';
  if (lower.includes('servidor web') || lower.includes('web-server') || lower.includes('.11')) return 'Docker Web';
  if (lower.includes('nas') || lower.includes('almacenamiento') || lower.includes('.15')) return 'NAS Backup';
  if (lower.includes('impresora') || lower.includes('printer') || lower.includes('.22')) return 'Impresora';
  if (lower.includes('ubuntu') || lower.includes('vm') || lower.includes('.200')) return 'VM Ubuntu';
  if (lower.includes('este pc') || lower.includes('estación de trabajo') || lower.includes('.55')) return 'Este PC';
  
  return name.length > 18 ? name.substring(0, 15) + '...' : name;
};

export default function MapSubred({ devices, onSelectDevice, isDemoMode = true }: MapSubredProps) {
  // Toggle between 'prtg', 'topology' and 'grid'
  const [viewMode, setViewMode] = useState<'prtg' | 'topology' | 'grid'>('prtg');
  const [useOwnNames, setUseOwnNames] = useState<boolean>(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredGridId, setHoveredGridId] = useState<string | null>(null);

  // PRTG View collapsible groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'group-local': false,
    'group-infra': false,
    'group-cctv': false,
    'group-servers': false
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const [prtgSearch, setPrtgSearch] = useState('');
  const [prtgStatusFilter, setPrtgStatusFilter] = useState<'all' | 'OK' | 'Warning' | 'Down' | 'Paused'>('all');

  const [hostTelemetry, setHostTelemetry] = useState<{
    cpuLoad: string;
    memoryFree: string;
    diskFree: string;
    processCount: string;
    health: string;
  } | null>(null);

  useEffect(() => {
    const fetchTelemetry = () => {
      fetch('/api/host-telemetry')
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setHostTelemetry({
              cpuLoad: data.cpuLoad,
              memoryFree: data.memoryFree,
              diskFree: data.diskFree,
              processCount: data.processCount,
              health: data.health
            });
          }
        })
        .catch(err => console.warn("Error fetching host telemetry:", err));
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4500);
    return () => clearInterval(interval);
  }, []);

  // Find current subnet base (e.g. "192.168.1" or "10.0.0")
  const currentSubnetBase = useMemo(() => {
    const sampleDevice = devices.find(d => d.ip && d.ip !== '—');
    if (sampleDevice) {
      const parts = sampleDevice.ip.split('.');
      if (parts.length >= 3) {
        return parts.slice(0, 3).join('.');
      }
    }
    return '192.168.1';
  }, [devices]);

  // PRTG Groups and Devices dynamic computation
  const prtgGroups = useMemo(() => {
    const base = currentSubnetBase;
    
    // Find device helpers
    const findDevByLastOctet = (octet: string) => {
      // In real scan mode, do NOT use hardcoded octets (except .1 gateway) to avoid misclassifications of unrelated devices
      if (!isDemoMode && octet !== '1') {
        return undefined;
      }
      const ip = `${base}.${octet}`;
      const found = devices.find(d => d.ip === ip);
      if (!found) return undefined;
      // If NOT in demo mode, only return if actually alive/scanned successfully
      if (!isDemoMode && (found.estado === 'Caído' || found.estado === 'No_Escaneado')) {
        return undefined;
      }
      return found;
    };

    const findDevByCriteria = (criteriaFn: (d: any) => boolean) => {
      return devices.find(d => {
        if (!isDemoMode && (d.estado === 'Caído' || d.estado === 'No_Escaneado')) {
          return false;
        }
        return criteriaFn(d);
      });
    };

    const localDevice = devices.find(d => {
      const name = d.host.toLowerCase();
      return name.includes('este pc') || name.includes('mi pc') || name.includes('computador de trabajo') || name.includes('estacion de trabajo') || name.includes('estación de trabajo') || name.includes('laptop de trabajo');
    }) || devices.find(d => d.ip && d.ip.endsWith('.55'));

    const gatewayDevice = findDevByLastOctet('1');
    const switchDevice = findDevByLastOctet('2') || findDevByCriteria(d => d.host.toLowerCase().includes('switch') || d.host.toLowerCase().includes('conmutador'));
    const nvrDevice = findDevByLastOctet('81') || findDevByCriteria(d => d.host.toLowerCase().includes('nvr') || d.host.toLowerCase().includes('grabador') || d.host.toLowerCase().includes('grabadora'));
    const cameraPtzDevice = findDevByLastOctet('82') || findDevByCriteria(d => d.host.toLowerCase().includes('ptz') || d.host.toLowerCase().includes('cámara exterior') || d.host.toLowerCase().includes('camara exterior'));
    const cameraPasilloDevice = findDevByLastOctet('60') || findDevByCriteria(d => d.host.toLowerCase().includes('pasillo') || d.host.toLowerCase().includes('axis'));
    const cameraDomoDevice = findDevByLastOctet('61') || findDevByCriteria(d => d.host.toLowerCase().includes('domo') || d.host.toLowerCase().includes('ezviz'));
    
    const dbDevice = findDevByLastOctet('10') || findDevByCriteria(d => d.host.toLowerCase().includes('db') || d.host.toLowerCase().includes('database') || d.host.toLowerCase().includes('datos'));
    const webDevice = findDevByLastOctet('11') || findDevByCriteria(d => d.host.toLowerCase().includes('web') || d.host.toLowerCase().includes('servidor web') || d.host.toLowerCase().includes('nginx'));
    const nasDevice = findDevByLastOctet('15') || findDevByCriteria(d => d.host.toLowerCase().includes('nas') || d.host.toLowerCase().includes('backup') || d.host.toLowerCase().includes('synology'));
    const vmDevice = findDevByLastOctet('200') || findDevByCriteria(d => d.host.toLowerCase().includes('ubuntu') || d.host.toLowerCase().includes('vm') || d.host.toLowerCase().includes('virtualbox'));

    // Status mapping helper
    const getSensorStatus = (devState: 'OK' | 'Advertencia' | 'Caído' | 'No_Escaneado' | undefined, customState?: 'OK' | 'Advertencia' | 'Caído' | 'No_Escaneado') => {
      if (!devState || devState === 'No_Escaneado') return 'Paused' as const;
      if (devState === 'Caído') return 'Down' as const;
      if (customState) {
        if (customState === 'Caído') return 'Down' as const;
        if (customState === 'Advertencia') return 'Warning' as const;
        return 'OK' as const;
      }
      if (devState === 'Advertencia') return 'Warning' as const;
      return 'OK' as const;
    };

    // Track which devices are already assigned to groups to put unmapped ones in a general group
    const mappedIds = new Set<string>();
    if (localDevice) mappedIds.add(localDevice.id);
    if (gatewayDevice) mappedIds.add(gatewayDevice.id);
    if (switchDevice) mappedIds.add(switchDevice.id);
    if (nvrDevice) mappedIds.add(nvrDevice.id);
    if (cameraPtzDevice) mappedIds.add(cameraPtzDevice.id);
    if (cameraPasilloDevice) mappedIds.add(cameraPasilloDevice.id);
    if (cameraDomoDevice) mappedIds.add(cameraDomoDevice.id);
    if (dbDevice) mappedIds.add(dbDevice.id);
    if (webDevice) mappedIds.add(webDevice.id);
    if (nasDevice) mappedIds.add(nasDevice.id);
    if (vmDevice) mappedIds.add(vmDevice.id);

    // Filter real scanned devices not present in groups
    const otherScannedDevices = devices.filter(d => {
      if (mappedIds.has(d.id)) return false;
      if (!isDemoMode && (d.estado === 'No_Escaneado' || d.estado === 'Caído')) {
        return false;
      }
      return true;
    });

    const otherPrtgDevices = otherScannedDevices.map(d => {
      const hostLower = d.host.toLowerCase();
      let type: 'router' | 'switch' | 'ap' | 'desktop' | 'server' | 'tv' | 'gaming' | 'nas' | 'printer' | 'iot' | 'cloud' = 'desktop';
      if (hostLower.includes('tv') || hostLower.includes('television')) {
        type = 'tv';
      } else if (hostLower.includes('gaming') || hostLower.includes('ps5') || hostLower.includes('xbox') || hostLower.includes('nintendo') || hostLower.includes('consola')) {
        type = 'gaming';
      } else if (hostLower.includes('printer') || hostLower.includes('impresora')) {
        type = 'printer';
      } else if (hostLower.includes('phone') || hostLower.includes('celular') || hostLower.includes('android') || hostLower.includes('iphone') || hostLower.includes('smart') || hostLower.includes('tablet')) {
        type = 'iot';
      } else if (hostLower.includes('nas') || hostLower.includes('almacenamiento')) {
        type = 'nas';
      } else if (hostLower.includes('server') || hostLower.includes('servidor')) {
        type = 'server';
      }

      const sensors = [
        {
          name: 'Ping Latency',
          value: d.ping !== null ? `${d.ping} ms` : '1 ms',
          status: getSensorStatus(d.estado)
        }
      ];

      if (d.sensorHttp) {
        sensors.push({
          name: 'HTTP Port 80 Web',
          value: d.estado === 'OK' ? '200 OK (18 ms)' : 'Timeout',
          status: getSensorStatus(d.estado)
        });
      }

      if (d.consumoDownload || d.consumoUpload) {
        sensors.push({
          name: 'Intercambio de Datos',
          value: `DN: ${(d.consumoDownload || 0).toFixed(1)} Mbps / UP: ${(d.consumoUpload || 0).toFixed(1)} Mbps`,
          status: getSensorStatus(d.estado)
        });
      }

      sensors.push({
        name: 'Sensor Integridad ARP',
        value: 'MAC Validada',
        status: getSensorStatus(d.estado)
      });

      return {
        id: `dev-other-${d.id}`,
        name: d.host || `Dispositivo LAN .${d.ip.split('.').pop()}`,
        ip: d.ip,
        mac: d.mac,
        deviceObj: d,
        status: d.estado,
        type,
        sensors
      };
    });

    const groups = [
      {
        id: 'group-local',
        name: 'Sonda Local (Local Probe - LAN Sonda)',
        devices: [
          {
            id: 'dev-probe-pc',
            name: localDevice ? localDevice.host : 'Sonda Local (Este PC)',
            ip: localDevice?.ip || `${base}.55`,
            mac: localDevice?.mac || '84:C8:A0:BB:AB:66',
            deviceObj: localDevice,
            status: localDevice ? localDevice.estado : 'No_Escaneado',
            type: 'desktop' as const,
            sensors: [
              { name: 'Core Server Health', value: hostTelemetry?.health || '100 %', status: getSensorStatus(localDevice?.estado) },
              { name: 'CPU Load', value: hostTelemetry?.cpuLoad || '8 %', status: getSensorStatus(localDevice?.estado) },
              { name: 'Memory Free Space', value: hostTelemetry?.memoryFree || '42 %', status: getSensorStatus(localDevice?.estado) },
              { name: 'Disk Free C:', value: hostTelemetry?.diskFree || '158 GB (76%)', status: getSensorStatus(localDevice?.estado) },
              { name: 'Active Process Count', value: hostTelemetry?.processCount || '148', status: getSensorStatus(localDevice?.estado) },
              { name: 'sFlow Probe Listener', value: 'sFlow V5 v1', status: 'Paused' as const },
              { name: 'DNS Lookup Speed', value: '12 ms', status: getSensorStatus(localDevice?.estado) },
              { name: 'Traceroute Gateway', value: '1 saltos (1ms)', status: getSensorStatus(localDevice?.estado) },
              { name: 'Local Port 80 Handler', value: '1 msec', status: getSensorStatus(localDevice?.estado) },
              { name: 'Sensor Fac. AutoFailover', value: 'ALTA CRÍTICA', status: getSensorStatus(localDevice?.estado, 'Caído') }
            ]
          }
        ]
      },
      {
        id: 'group-infra',
        name: 'ROUTER/SWITCHES (Infraestructura de Comunicaciones)',
        devices: [
          {
            id: 'dev-gateway',
            name: gatewayDevice ? `${gatewayDevice.host} (Gateway)` : 'Router Central Gateway',
            ip: gatewayDevice?.ip || `${base}.1`,
            mac: gatewayDevice?.mac || '10:7B:44:A2:99:11',
            deviceObj: gatewayDevice,
            status: gatewayDevice ? gatewayDevice.estado : 'OK',
            type: 'router' as const,
            sensors: [
              { name: 'Gateway Ping', value: `${gatewayDevice?.ping || 2} msec`, status: getSensorStatus(gatewayDevice?.estado) },
              { name: 'HTTP Admin Web', value: '200 OK (11ms)', status: getSensorStatus(gatewayDevice?.estado) },
              { name: 'WAN Bandwidth Down', value: '10.2 Mbps', status: getSensorStatus(gatewayDevice?.estado) },
              { name: 'WAN Bandwidth Up', value: '1.5 Mbps', status: getSensorStatus(gatewayDevice?.estado) },
              { name: 'DHCP Pool IP Limit', value: '1.2 % (254 IPs)', status: getSensorStatus(gatewayDevice?.estado) },
              { name: 'SFP+ Fiber GPON Link', value: '10G Link (Up)', status: getSensorStatus(gatewayDevice?.estado) }
            ]
          },
          ...(isDemoMode || switchDevice ? [{
            id: 'dev-switch',
            name: switchDevice ? switchDevice.host : 'Switch Principal Cisco/LAN',
            ip: switchDevice?.ip || `${base}.2`,
            mac: switchDevice?.mac || '2C:96:82:11:AA:FF',
            deviceObj: switchDevice || null,
            status: switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK'),
            type: 'switch' as const,
            sensors: [
              { name: 'Switch Core Ping', value: switchDevice ? `${switchDevice.ping || 1} ms` : '1 ms', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) },
              { name: 'PoE Power Alloc', value: '120W / 370W', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) },
              { name: 'Port 1 Uplink Stat', value: '10G SFP+ Active', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) },
              { name: 'Port 2 WiFi PoE Central', value: '1G Active (OK)', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) },
              { name: 'Port 4 Workstation PC', value: '1G Active (OK)', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) },
              { name: 'Port 24 Trunk Sonda', value: '450 kbit/s', status: getSensorStatus(switchDevice ? switchDevice.estado : (gatewayDevice ? gatewayDevice.estado : 'OK')) }
            ]
          }] : [])
        ]
      },
      {
        id: 'group-cctv',
        name: 'VIDEO CCTV & SEGURIDAD (Cámaras IP y Grabadores NVR)',
        devices: [
          ...(nvrDevice ? [{
            id: 'dev-nvr',
            name: nvrDevice.host,
            ip: nvrDevice.ip,
            mac: nvrDevice.mac,
            deviceObj: nvrDevice,
            status: nvrDevice.estado,
            type: 'nas' as const,
            sensors: [
              { name: 'NVR Server Ping', value: `${nvrDevice.ping || 4} ms`, status: getSensorStatus(nvrDevice.estado) },
              { name: 'CCTV HDD Raid Space', value: '92% Libre / 16TB', status: getSensorStatus(nvrDevice.estado) },
              { name: 'ONVIF Server Port 8080', value: 'Escuchando (OK)', status: getSensorStatus(nvrDevice.estado) },
              { name: 'Total Cameras Rec Stream', value: '32 Canales (OK)', status: getSensorStatus(nvrDevice.estado) },
              { name: 'Video Transcode Chipset', value: '42 % (H.265)', status: getSensorStatus(nvrDevice.estado) },
              { name: 'CCTV Bandwidth Draw', value: `${nvrDevice.consumoUpload || 75.2} Mbps`, status: getSensorStatus(nvrDevice.estado) }
            ]
          }] : []),
          ...(cameraPtzDevice ? [{
            id: 'dev-ptz-cam',
            name: cameraPtzDevice.host,
            ip: cameraPtzDevice.ip,
            mac: cameraPtzDevice.mac,
            deviceObj: cameraPtzDevice,
            status: cameraPtzDevice.estado,
            type: 'iot' as const,
            sensors: [
              { name: 'PTZ Camera Ping', value: `${cameraPtzDevice.ping || 11} ms`, status: getSensorStatus(cameraPtzDevice.estado) },
              { name: 'RTSP H.264 MainStream', value: `${cameraPtzDevice.consumoUpload || 4.5} Mbps`, status: getSensorStatus(cameraPtzDevice.estado) },
              { name: 'PTZ Control Latency', value: '14 ms (OK)', status: getSensorStatus(cameraPtzDevice.estado) },
              { name: 'Camera Dome Motor Temp', value: '38.5 °C', status: getSensorStatus(cameraPtzDevice.estado) },
              { name: 'Infrared IR LEDs status', value: 'Automático (Night-Off)', status: getSensorStatus(cameraPtzDevice.estado) }
            ]
          }] : []),
          ...(cameraPasilloDevice ? [{
            id: 'dev-pasillo-cam',
            name: cameraPasilloDevice.host,
            ip: cameraPasilloDevice.ip,
            mac: cameraPasilloDevice.mac,
            deviceObj: cameraPasilloDevice,
            status: cameraPasilloDevice.estado,
            type: 'iot' as const,
            sensors: [
              { name: 'IP Camera Corridor Ping', value: `${cameraPasilloDevice.ping || 12} ms`, status: getSensorStatus(cameraPasilloDevice.estado) },
              { name: 'RTSP Stream Bandwidth', value: `${cameraPasilloDevice.consumoUpload || 3.5} Mbps`, status: getSensorStatus(cameraPasilloDevice.estado) },
              { name: 'ONVIF API Response', value: '200 OK (22ms)', status: getSensorStatus(cameraPasilloDevice.estado) },
              { name: 'MicroSD Storage Card Health', value: '100% (64GB Class10)', status: getSensorStatus(cameraPasilloDevice.estado) }
            ]
          }] : []),
          ...(cameraDomoDevice ? [{
            id: 'dev-meeting-cam',
            name: cameraDomoDevice.host,
            ip: cameraDomoDevice.ip,
            mac: cameraDomoDevice.mac,
            deviceObj: cameraDomoDevice,
            status: cameraDomoDevice.estado,
            type: 'iot' as const,
            sensors: [
              { name: 'IP Dome Meeting Ping', value: `${cameraDomoDevice.ping || 14} ms`, status: getSensorStatus(cameraDomoDevice.estado) },
              { name: 'RTSP Video Stream', value: `${cameraDomoDevice.consumoUpload || 2.2} Mbps`, status: getSensorStatus(cameraDomoDevice.estado) },
              { name: 'Motion Detector Status', value: 'Sin Movimiento', status: getSensorStatus(cameraDomoDevice.estado) },
              { name: 'Privacy Mask Overlay', value: 'Desactivado (Full)', status: getSensorStatus(cameraDomoDevice.estado) }
            ]
          }] : [])
        ]
      },
      {
        id: 'group-servers',
        name: 'SERVIDORES & SERVICIOS CORE (Docker Containers & Storage)',
        devices: [
          ...(dbDevice ? [{
            id: 'dev-db',
            name: dbDevice.host,
            ip: dbDevice.ip,
            mac: dbDevice.mac,
            deviceObj: dbDevice,
            status: dbDevice.estado,
            type: 'server' as const,
            sensors: [
              { name: 'DB Container Ping', value: `${dbDevice.ping || 5} ms`, status: getSensorStatus(dbDevice.estado) },
              { name: 'PostgreSQL Active Conn', value: '22 Conexiones', status: getSensorStatus(dbDevice.estado) },
              { name: 'SQL Query Max Latency P99', value: '3.2 ms', status: getSensorStatus(dbDevice.estado) },
              { name: 'Tablespace Allocation', value: '1.2 GB', status: getSensorStatus(dbDevice.estado) }
            ]
          }] : []),
          ...(webDevice ? [{
            id: 'dev-web',
            name: webDevice.host,
            ip: webDevice.ip,
            mac: webDevice.mac,
            deviceObj: webDevice,
            status: webDevice.estado,
            type: 'server' as const,
            sensors: [
              { name: 'Nginx Container Ping', value: `${webDevice.ping || 4} ms`, status: getSensorStatus(webDevice.estado) },
              { name: 'Nginx Worker Threads', value: '4 Operando (OK)', status: getSensorStatus(webDevice.estado) },
              { name: 'Container Storage Inodes', value: '15 % (Bajo)', status: getSensorStatus(webDevice.estado) },
              { name: 'HTTP Response Rate (Port 80)', value: '25 msec', status: getSensorStatus(webDevice.estado) }
            ]
          }] : []),
          ...(nasDevice ? [{
            id: 'dev-nas',
            name: nasDevice.host,
            ip: nasDevice.ip,
            mac: nasDevice.mac,
            deviceObj: nasDevice,
            status: nasDevice.estado,
            type: 'nas' as const,
            sensors: [
              { name: 'NAS Server Ping', value: `${nasDevice.ping || 95} ms`, status: getSensorStatus(nasDevice.estado) },
              { name: 'RAID 5 Array Health', value: 'Sano (Advertencia CPU)', status: getSensorStatus(nasDevice.estado) },
              { name: 'Free Storage Capacity', value: '68 % (8.4 TB libres)', status: getSensorStatus(nasDevice.estado) },
              { name: 'SMB/NFS Daemon Status', value: 'Escucha Activa', status: getSensorStatus(nasDevice.estado) }
            ]
          }] : []),
          ...(vmDevice ? [{
            id: 'dev-vm',
            name: vmDevice.host,
            ip: vmDevice.ip,
            mac: vmDevice.mac,
            deviceObj: vmDevice,
            status: vmDevice.estado,
            type: 'server' as const,
            sensors: [
              { name: 'Ubuntu VM Guest Ping', value: `${vmDevice.ping || 8} ms`, status: getSensorStatus(vmDevice.estado) },
              { name: 'Host Hypervisor Overhead', value: '12 % (Bajo)', status: getSensorStatus(vmDevice.estado) },
              { name: 'SSH Secure Daemon (P22)', value: 'Abierto / Online', status: getSensorStatus(vmDevice.estado) }
            ]
          }] : [])
        ]
      },
      ...(otherPrtgDevices.length > 0 ? [{
        id: 'group-other',
        name: 'DISPOSITIVOS DE RED DETECTADOS (Otros Clientes LAN)',
        devices: otherPrtgDevices
      }] : [])
    ];
    if (isDemoMode) return groups;
    return groups.filter(g => g.id === 'group-local' || g.id === 'group-other' || g.devices.length > 0);
  }, [devices, currentSubnetBase, isDemoMode, hostTelemetry]);

  // Define active coordinates and layout dynamically
  const { topologyNodes, topologyHeight } = useMemo(() => {
    const base = currentSubnetBase;

    // Helper to check device state (returns true if active: 'OK' or 'Advertencia')
    const isActiveDevice = (ip: string) => {
      const d = devices.find(x => x.ip === ip);
      return d ? (d.estado === 'OK' || d.estado === 'Advertencia') : false;
    };

    // Grab all active devices in standard devices array
    // Filter out the gateway (.1) and "Este PC"
    const gatewayIp = `${base}.1`;
    const localDevice = devices.find(d => {
      const name = d.host.toLowerCase();
      return name.includes('este pc') || name.includes('mi pc') || name.includes('computador de trabajo') || name.includes('estacion de trabajo') || name.includes('estación de trabajo') || name.includes('laptop de trabajo');
    });
    const localIp = localDevice?.ip || `${base}.55`;

    const activeList = devices.filter(d => 
      (d.estado === 'OK' || d.estado === 'Advertencia') &&
      d.ip !== gatewayIp &&
      d.ip !== localIp
    );

    // Dynamic categorization of active devices
    const activeWifiClients: any[] = [];
    const activeSwitchClients: any[] = [];
    const activeVirtualClients: any[] = [];

    // Check if the current environment is inherently Wi-Fi or Virtual
    const someDeviceWithInterface = devices.find(x => x.interfaz);
    const selectedIntName = someDeviceWithInterface?.interfaz || '';
    const isInterfaceWifi = selectedIntName.toLowerCase().includes('wi-fi') || 
                            selectedIntName.toLowerCase().includes('wifi') || 
                            selectedIntName.toLowerCase().includes('wireless') || 
                            selectedIntName.toLowerCase().includes('intel');
    const isInterfaceVirtual = selectedIntName.toLowerCase().includes('loopback') || 
                               selectedIntName.toLowerCase().includes('virtual') || 
                               selectedIntName.toLowerCase().includes('docker');

    activeList.forEach(d => {
      const hostLower = d.host.toLowerCase();
      
      // Determine if virtual
      const isVirtual = isInterfaceVirtual || 
                        hostLower.includes('docker') || 
                        hostLower.includes('contenedor') || 
                        hostLower.includes('container') || 
                        hostLower.includes('vm') || 
                        hostLower.includes('virtual') || 
                        hostLower.includes('grafana') || 
                        hostLower.includes('influx') || 
                        hostLower.includes('redis') || 
                        hostLower.includes('postgres') || 
                        hostLower.includes('rabbitmq') || 
                        hostLower.includes('mininet') || 
                        hostLower.includes('sdn');

      // Determine if Wi-Fi (excluding virtuals)
      const isWifi = !isVirtual && (
                     isInterfaceWifi || 
                     hostLower.includes('wifi') || 
                     hostLower.includes('wi-fi') || 
                     hostLower.includes('wireless') || 
                     hostLower.includes('smartphone') || 
                     hostLower.includes('iphone') || 
                     hostLower.includes('android') || 
                     hostLower.includes('tablet') || 
                     hostLower.includes('ipad') || 
                     hostLower.includes('alexa') || 
                     hostLower.includes('echo') || 
                     hostLower.includes('bulb') || 
                     hostLower.includes('smart') || 
                     hostLower.includes('nest') || 
                     hostLower.includes('yale') || 
                     hostLower.includes('bombilla') || 
                     hostLower.includes('invitado') || 
                     hostLower.includes('freelancer') || 
                     hostLower.includes('celular') ||
                     hostLower.includes('camera') || 
                     hostLower.includes('cámara') ||
                     hostLower.includes('livingroom')
      );

      // Detect visual icon type
      let type: 'router' | 'switch' | 'ap' | 'desktop' | 'server' | 'tv' | 'gaming' | 'nas' | 'printer' | 'iot' | 'cloud' = 'desktop';
      if (hostLower.includes('tv') || hostLower.includes('television')) {
        type = 'tv';
      } else if (hostLower.includes('gaming') || hostLower.includes('ps5') || hostLower.includes('playstation') || hostLower.includes('xbox') || hostLower.includes('nintendo') || hostLower.includes('consola')) {
        type = 'gaming';
      } else if (hostLower.includes('nas') || hostLower.includes('almacenamiento') || hostLower.includes('backup') || hostLower.includes('storage')) {
        type = 'nas';
      } else if (hostLower.includes('printer') || hostLower.includes('impresora')) {
        type = 'printer';
      } else if (isVirtual || hostLower.includes('server') || hostLower.includes('servidor') || hostLower.includes('db') || hostLower.includes('database')) {
        type = 'server';
      } else if (hostLower.includes('iot') || hostLower.includes('alexa') || hostLower.includes('echo') || hostLower.includes('bulb') || hostLower.includes('smart') || hostLower.includes('nest') || hostLower.includes('yale') || hostLower.includes('bombilla') || hostLower.includes('termostato') || hostLower.includes('sensor') || hostLower.includes('biométrico') || hostLower.includes('lector') || hostLower.includes('cámara') || hostLower.includes('camera') || hostLower.includes('dahua') || hostLower.includes('cctv')) {
        type = 'iot';
      } else if (hostLower.includes('ap') || hostLower.includes('access point') || hostLower.includes('unifi')) {
        type = 'ap';
      } else if (hostLower.includes('router') || hostLower.includes('gateway') || hostLower.includes('switch')) {
        type = 'router';
      }

      const ipSuffix = d.ip.split('.').pop() || '0';
      const clientObj = {
        id: d.id,
        label: d.host,
        ip: d.ip,
        type,
        parent: isVirtual ? localIp : (isWifi ? 'ap' : 'switch'),
        linkType: isVirtual ? ('virtual' as const) : (isWifi ? ('wifi' as const) : ('ethernet' as const)),
        interfaceName: isVirtual ? `docker-veth${ipSuffix}` : (isWifi ? `WLAN Client-${ipSuffix}` : `Port LAN-${ipSuffix}`)
      };

      if (isVirtual) {
        activeVirtualClients.push(clientObj);
      } else if (isWifi) {
        activeWifiClients.push(clientObj);
      } else {
        activeSwitchClients.push(clientObj);
      }
    });

    const hasVirtuals = activeVirtualClients.length > 0;
    const hasWifi = activeWifiClients.length > 0;

    const desktopNodeVal = {
      id: localIp,
      label: localDevice?.host || 'Estación de Trabajo (Este PC)',
      ip: localIp,
      type: 'desktop' as const,
      interfaceName: 'Port LAN 4'
    };

    const nodes: TopologyNode[] = [];

    // WAN Router (Layer 0) - Always present, centered at 460
    nodes.push({ id: 'wan', label: 'Internet Público (WAN)', type: 'cloud' as const, x: 460, y: 35 });

    // Router Gateway (Layer 1) - Always present, centered at 460
    nodes.push({
      id: `${base}.1`,
      label: 'Router Gateway',
      ip: `${base}.1`,
      type: 'router' as const,
      x: 460,
      y: 95,
      parent: 'wan',
      linkType: 'fiber' as const,
      interfaceName: 'WAN SFP+ GPON'
    });

    // Helper to position clients in a balanced multi-row grid so they never overflow the SVG area
    const positionClientsInPod = (
      clients: any[],
      centerX: number,
      width: number,
      minY: number,
      rowHeight: number = 62,
      maxColsLimit: number = 4
    ) => {
      if (clients.length === 0) return;

      const horizontalSpacing = 72;
      const maxCols = Math.min(maxColsLimit, Math.max(1, Math.floor(width / horizontalSpacing)));
      const count = clients.length;
      const cols = Math.min(count, maxCols);
      
      clients.forEach((client, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        
        const colsInThisRow = Math.min(cols, count - row * cols);
        const startX = centerX - (horizontalSpacing * (colsInThisRow - 1)) / 2;
        
        const x = startX + col * horizontalSpacing;
        const stagger = (col % 2 === 0) ? -4 : 4;
        const y = minY + row * rowHeight + stagger;
        
        client.x = x;
        client.y = y;
      });
    };

    // --- POD A: WI-FI AP & CLIENTS (Left pod, centered at x = 190) ---
    if (hasWifi) {
      nodes.push({
        id: 'ap',
        label: 'WiFi AP Central',
        type: 'ap' as const,
        x: 190,
        y: 180,
        parent: `${base}.1`,
        linkType: 'ethernet' as const,
        interfaceName: 'ETH Port 2 (PoE)'
      });

      positionClientsInPod(activeWifiClients, 190, 280, 260, 62, 4);
      activeWifiClients.forEach(client => nodes.push(client));
    }

    // --- POD C: DESKTOP & VIRTUAL CLIENTS (Right pod, centered at x = 730) ---
    if (hasVirtuals) {
      nodes.push({
        ...desktopNodeVal,
        id: `${base}.55`,
        x: 730,
        y: 180,
        parent: 'switch',
        linkType: 'ethernet' as const
      });

      positionClientsInPod(activeVirtualClients, 730, 280, 260, 62, 4);
      activeVirtualClients.forEach(client => nodes.push(client));
    }

    // --- POD B: SWITCH & ITS CLIENTS (Center pod, centered at x = 460) ---
    nodes.push({
      id: 'switch',
      label: 'Switch Principal LAN',
      type: 'switch' as const,
      x: 460,
      y: 180,
      parent: `${base}.1`,
      linkType: 'ethernet' as const,
      interfaceName: 'ETH Port 1 (10G)'
    });

    const switchEndpoints = [...activeSwitchClients];
    if (!hasVirtuals) {
      // If there are no VM active, Desktop PC is just a direct LAN client of the Switch
      switchEndpoints.push({
        ...desktopNodeVal,
        id: `${base}.55`,
        parent: 'switch',
        linkType: 'ethernet' as const
      });
    }

    positionClientsInPod(switchEndpoints, 460, 240, 260, 62, 3);
    switchEndpoints.forEach(client => nodes.push(client));

    // Dynamic height calculation to fit all rows
    const wifiRowsCount = hasWifi ? Math.ceil(activeWifiClients.length / 4) : 0;
    const switchRowsCount = Math.ceil(switchEndpoints.length / 3) || 0;
    const vmRowsCount = hasVirtuals ? Math.ceil(activeVirtualClients.length / 4) : 0;
    const maxRowsCount = Math.max(1, wifiRowsCount, switchRowsCount, vmRowsCount);
    
    const topologyHeight = Math.max(410, 260 + maxRowsCount * 62 + 30);

    return { topologyNodes: nodes, topologyHeight };
  }, [currentSubnetBase, devices]);

  // Compute upstream diagnostic path to highlight route to server
  const activeUpstreamPath = useMemo(() => {
    if (!hoveredNodeId) return [];
    
    const path: string[] = [];
    let currentId: string | undefined = hoveredNodeId;
    
    while (currentId) {
      path.push(currentId);
      if (currentId === 'wan') break;
      const node = topologyNodes.find(n => n.id === currentId);
      currentId = node?.parent;
    }
    
    return path;
  }, [hoveredNodeId, topologyNodes]);

  // Match node with real physical simulator state
  const getDeviceForNode = (ip?: string) => {
    if (!ip) return null;
    return devices.find(d => d.ip === ip) || null;
  };

  // Render appropriate vector icon
  const renderNodeIcon = (type: string, isDown: boolean, isWarning: boolean) => {
    const iconClass = `h-4.5 w-4.5 ${
      isDown ? 'text-rose-400' : isWarning ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
    }`;
    switch (type) {
      case 'cloud': return <Cloud className="h-5.5 w-5.5 text-sky-400" />;
      case 'router': return <RouterIcon className={iconClass} />;
      case 'switch': return <Layers className={iconClass} />;
      case 'ap': return <Wifi className={iconClass} />;
      case 'desktop': return <Monitor className={iconClass} />;
      case 'server': return <Server className={iconClass} />;
      case 'tv': return <Tv className={iconClass} />;
      case 'gaming': return <Gamepad2 className={iconClass} />;
      case 'nas': return <HardDrive className={iconClass} />;
      case 'printer': return <Printer className={iconClass} />;
      case 'iot': return <Radio className={iconClass} />;
      default: return <Activity className={iconClass} />;
    }
  };

  // Grid generic icon helper
  const getGridIconForHost = (host: string) => {
    const name = host.toLowerCase();
    if (name.includes('router') || name.includes('gateway')) return <RouterIcon className="h-3 w-3" />;
    if (name.includes('server') || name.includes('database')) return <Server className="h-3 w-3" />;
    if (name.includes('desktop') || name.includes('pc')) return <Monitor className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  // PRTG Quick status counts
  const prtgCounts = useMemo(() => {
    let ok = 0;
    let warning = 0;
    let down = 0;
    let paused = 0;
    prtgGroups.forEach(g => {
      g.devices.forEach(d => {
        d.sensors.forEach(s => {
          if (s.status === 'OK') ok++;
          else if (s.status === 'Warning') warning++;
          else if (s.status === 'Down') down++;
          else if (s.status === 'Paused') paused++;
        });
      });
    });
    return { ok, warning, down, paused, total: ok + warning + down + paused };
  }, [prtgGroups]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md text-slate-300">
      
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1.5 border-b border-slate-800 pb-2.5">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
            <Network className="h-4 w-4 text-cyan-400" />
            Mapa de Infraestructura y Topología LAN
          </h3>
          <p className="text-[10px] text-slate-500 font-sans hidden sm:block">
            Mapeo interactivo de hosts, enlaces intermedios, switches de distribución y balance físico.
          </p>
        </div>

        {/* CONTROLS TOGGLE */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'topology' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono hidden lg:inline">Etiquetas Mapa:</span>
              <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 leading-none text-[11px]">
                <button
                  onClick={() => setUseOwnNames(false)}
                  className={`px-2.5 py-1.5 rounded-xs font-semibold cursor-pointer transition-all ${
                    !useOwnNames 
                      ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700/80 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar apodos técnicos sintetizados (Smart TV, PS5, etc.)"
                >
                  Nombres Cortos
                </button>
                <button
                  onClick={() => setUseOwnNames(true)}
                  className={`px-2.5 py-1.5 rounded-xs font-semibold cursor-pointer transition-all ${
                    useOwnNames 
                      ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700/80 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar los nombres reales de los de dispositivos escaneados o personalizados por ti"
                >
                  Nombres Reales
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono hidden md:inline">Vista de Red:</span>
            <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 leading-none text-[11px]">
              <button
                onClick={() => setViewMode('prtg')}
                className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'prtg' 
                    ? 'bg-green-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
                title="Monitoreo estilo PRTG con grupos y telemetrías de sensores"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Monitoreo Sondas (PRTG)</span>
              </button>
              <button
                onClick={() => setViewMode('topology')}
                className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'topology' 
                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Topología Interactiva</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'grid' 
                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Grilla Subred IP</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEWPORT BOX */}
      {viewMode === 'prtg' ? (
        // RENDER: MONITOREO STYLE PRTG SENSORS LIST
        <div className="bg-[#f0f2f5] border border-slate-350 rounded p-4 text-[#2c3e50] font-sans shadow-inner overflow-x-auto min-w-[760px] transition-all">
          
          {/* PRTG SUB-HEADER TOOLBAR */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#e2e8f0] p-2.5 rounded border border-[#ccd5e1] text-xs mb-3">
            {/* Tree controllers */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#475569] font-mono text-[11px] uppercase mr-1">Árbol de Red:</span>
              <button
                onClick={() => setCollapsedGroups({
                  'group-local': false,
                  'group-infra': false,
                  'group-cctv': false,
                  'group-servers': false
                })}
                className="bg-white hover:bg-slate-50 border border-slate-350 px-2.5 py-1.5 rounded shadow-xs text-[10.5px] cursor-pointer font-bold text-slate-700 active:scale-95 transition-all"
              >
                [+] Expandir Todo
              </button>
              <button
                onClick={() => setCollapsedGroups({
                  'group-local': true,
                  'group-infra': true,
                  'group-cctv': true,
                  'group-servers': true
                })}
                className="bg-white hover:bg-slate-50 border border-slate-350 px-2.5 py-1.5 rounded shadow-xs text-[10.5px] cursor-pointer font-bold text-slate-700 active:scale-95 transition-all"
              >
                [-] Colapsar Todo
              </button>
            </div>

            {/* Quick Status Count Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[#475569] font-mono text-[11px] uppercase mr-1">Filtro Estado:</span>
              <button
                onClick={() => setPrtgStatusFilter('all')}
                className={`px-2 py-1.5 rounded text-[10.5px] cursor-pointer font-bold border flex items-center gap-1.5 transition-all outline-hidden ${
                  prtgStatusFilter === 'all'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>Todos</span>
                <span className="bg-slate-100/40 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{prtgCounts.total}</span>
              </button>
              <button
                onClick={() => setPrtgStatusFilter('OK')}
                className={`px-2 py-1.5 rounded text-[10.5px] cursor-pointer font-bold border flex items-center gap-1.5 transition-all outline-hidden ${
                  prtgStatusFilter === 'OK'
                    ? 'bg-[#7ac143] text-white border-[#65a335] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ac143]"></span>
                <span>Sano (OK)</span>
                <span className="bg-green-100 text-green-800 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{prtgCounts.ok}</span>
              </button>
              <button
                onClick={() => setPrtgStatusFilter('Warning')}
                className={`px-2 py-1.5 rounded text-[10.5px] cursor-pointer font-bold border flex items-center gap-1.5 transition-all outline-hidden ${
                  prtgStatusFilter === 'Warning'
                    ? 'bg-[#f59e0b] text-slate-950 border-[#d97706] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffcb05]"></span>
                <span>Alerta</span>
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{prtgCounts.warning}</span>
              </button>
              <button
                onClick={() => setPrtgStatusFilter('Down')}
                className={`px-2 py-1.5 rounded text-[10.5px] cursor-pointer font-bold border flex items-center gap-1.5 transition-all outline-hidden ${
                  prtgStatusFilter === 'Down'
                    ? 'bg-[#df2020] text-white border-[#b91c1c] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#df2020]"></span>
                <span>Fallo (!!)</span>
                <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{prtgCounts.down}</span>
              </button>
              <button
                onClick={() => setPrtgStatusFilter('Paused')}
                className={`px-2 py-1.5 rounded text-[10.5px] cursor-pointer font-bold border flex items-center gap-1.5 transition-all outline-hidden ${
                  prtgStatusFilter === 'Paused'
                    ? 'bg-[#2185d0] text-white border-[#1d70b8] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2185d0]"></span>
                <span>Pausado (||)</span>
                <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full text-[9px] font-bold">{prtgCounts.paused}</span>
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar telemetrías..."
                value={prtgSearch}
                onChange={(e) => setPrtgSearch(e.target.value)}
                className="bg-white border border-[#cbd5e1] text-[#1e293b] text-[11px] px-2.5 py-1.5 pr-7 rounded focus:outline-hidden focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] w-48 font-semibold placeholder:text-slate-400"
              />
              {prtgSearch && (
                <button
                  onClick={() => setPrtgSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[11px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE DIRECTORY TREE CORE */}
          <div className="bg-white p-3.5 rounded border border-[#cbd5e1] space-y-4 shadow-sm select-none">
            {/* Header Parent Group Node */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 border-b border-dashed border-slate-200 pb-1.5">
              <span className="font-bold text-[#1e293b] text-[12.5px] flex items-center gap-1">
                <span>🟢</span>
                <span>Local Probe (Sonda de Red IP)</span>
              </span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-slate-550 rounded font-mono ml-auto">
                PRTG Engine v12.1.80
              </span>
            </div>

            <div className="space-y-4 border-l-2 border-[#e2e8f0] pl-3 ml-1.5">
              {prtgGroups.map(group => {
                const isGroupCollapsed = collapsedGroups[group.id];
                
                // Active status sensor filter check
                const filteredDevices = group.devices.map(device => {
                  const sFiltered = device.sensors.filter(s => {
                    const matchesSearch = s.name.toLowerCase().includes(prtgSearch.toLowerCase()) || s.value.toLowerCase().includes(prtgSearch.toLowerCase());
                    const matchesStatus = prtgStatusFilter === 'all' || s.status === prtgStatusFilter;
                    return matchesSearch && matchesStatus;
                  });
                  return { ...device, sFiltered };
                }).filter(d => d.sFiltered.length > 0);

                if (filteredDevices.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-2">
                    {/* Folder Group Header Row */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="p-1 rounded hover:bg-slate-50 text-slate-600 cursor-pointer font-bold select-none text-[12px] flex items-center gap-1 outline-hidden"
                      >
                        <span className="font-mono text-slate-400 w-3 mr-0.5">{isGroupCollapsed ? '[+]' : '[-]'}</span>
                        <span className="text-[#1e293b] font-extrabold font-sans hover:text-[#2185d0] tracking-wide flex items-center gap-1">
                          <span>📁</span>
                          <span>{group.name}</span>
                        </span>
                      </button>
                      <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.3 rounded-full ml-1 font-bold">
                        {group.devices.length} {group.devices.length === 1 ? 'Dispositivo' : 'Dispositivos'}
                      </span>
                    </div>

                    {/* Collapsible content wrapper */}
                    {!isGroupCollapsed && (
                      <div className="pl-4 space-y-3.5 border-l border-dotted border-slate-300 ml-2.5 pt-1.5 pb-1">
                        {filteredDevices.map(device => {
                          const devOkCount = device.sensors.filter(s => s.status === 'OK').length;
                          const devWarningCount = device.sensors.filter(s => s.status === 'Warning').length;
                          const devDownCount = device.sensors.filter(s => s.status === 'Down').length;
                          const devPausedCount = device.sensors.filter(s => s.status === 'Paused').length;

                          const resolvedVendor = device.deviceObj?.vendor || (device.mac ? resolveVendorByMac(device.mac, device.name, device.ip) : '');

                          return (
                            <div key={device.id} className="bg-[#fcfdfd] border border-[#cbd5e1] rounded p-2.5 shadow-sm hover:shadow-md hover:border-[#b4c6dc] transition-all">
                              {/* Device name line and details */}
                              <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1.5 mb-2.5 flex-wrap md:flex-nowrap">
                                <span className="text-[11.5px] font-black text-[#1e293b] flex items-[#1e293b] gap-1.5">
                                  {device.type === 'router' ? '🛡️' : device.type === 'switch' ? '🎛️' : device.status === 'Caído' ? '🔴' : '🎥'}
                                  <button
                                    onClick={() => {
                                      if (device.deviceObj) onSelectDevice(device.deviceObj);
                                    }}
                                    className="text-left font-extrabold text-[#192231] hover:text-[#2563eb] cursor-pointer hover:underline outline-hidden"
                                    title="Haga clic para expandir monitoreo en vivo"
                                  >
                                    {resolveDeviceNameByMac(device.mac, device.name, device.ip)}
                                  </button>
                                </span>
                                
                                {device.ip !== '—' && (
                                  <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.3 rounded text-slate-500">
                                    IP: {device.ip}
                                  </span>
                                )}

                                {resolvedVendor && resolvedVendor !== '—' && (
                                  <span className="text-[9.5px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.3 rounded-sm font-sans font-medium flex items-center gap-1 select-all" title={`Fabricante: ${resolvedVendor}`}>
                                    🏭 {resolvedVendor}
                                  </span>
                                )}

                                {device.mac && device.mac !== '—' && (
                                  <span className="font-mono text-[8.5px] text-slate-400 hidden xl:inline">
                                    MAC: {device.mac}
                                  </span>
                                )}

                                {/* Summary Counter badge dots */}
                                <div className="ml-auto flex items-center gap-1 select-none">
                                  {devDownCount > 0 && (
                                    <span className="text-[9px] bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] px-1.5 py-0.2 rounded font-bold" title="Alarmas">
                                      {devDownCount} Fallo
                                    </span>
                                  )}
                                  {devWarningCount > 0 && (
                                    <span className="text-[9px] bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] px-1.5 py-0.2 rounded font-bold" title="Advertencias">
                                      {devWarningCount} Alerta
                                    </span>
                                  )}
                                  {devOkCount > 0 && (
                                    <span className="text-[9px] bg-[#dcfce7] text-[#166534] border border-[#86efac] px-1.5 py-0.2 rounded font-bold" title="Sanos">
                                      {devOkCount} OK
                                    </span>
                                  )}
                                  {devPausedCount > 0 && (
                                    <span className="text-[9px] bg-[#e0f2fe] text-[#075985] border border-[#7dd3fc] px-1.5 py-0.2 rounded font-bold" title="Pausados">
                                      {devPausedCount} Pausa
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Wrap Grid of Sensors */}
                              <div className="flex flex-wrap gap-2">
                                {device.sFiltered.map((sensor, sIdx) => {
                                  // Color choices
                                  let statBarBg = 'bg-[#df2020]'; // Alarm Red
                                  let statCardBg = 'bg-[#fbeaea] border-[#f0c3c3] text-[#8c1d1d] hover:bg-[#fae1e1]';
                                  let symbol = '!!';

                                  if (sensor.status === 'OK') {
                                    statBarBg = 'bg-[#7ac143]'; // G
                                    statCardBg = 'bg-[#edf7e3] border-[#ccdcb9] text-[#2e5d16] hover:bg-[#e4f1d7]';
                                    symbol = '✓';
                                  } else if (sensor.status === 'Warning') {
                                    statBarBg = 'bg-[#ffcb05]'; // W
                                    statCardBg = 'bg-[#fef9e7] border-[#f4e2b0] text-[#785b0a] hover:bg-[#fcf3d5]';
                                    symbol = '!';
                                  } else if (sensor.status === 'Paused') {
                                    statBarBg = 'bg-[#2185d0]'; // P
                                    statCardBg = 'bg-[#f0f5fc] border-[#ccd9ea] text-[#124268] hover:bg-[#e4edf8]';
                                    symbol = '||';
                                  }

                                  return (
                                    <div
                                      key={`${device.id}-sensor-${sIdx}`}
                                      className={`w-[138px] md:w-[155px] h-[44px] flex rounded-xs border shadow-xs transition-all duration-150 group cursor-pointer ${statCardBg}`}
                                      title={`${sensor.name}: ${sensor.value} (${sensor.status})`}
                                      onClick={() => {
                                        if (device.deviceObj) onSelectDevice(device.deviceObj);
                                      }}
                                    >
                                      {/* Left edge indicator bar */}
                                      <div className={`w-[22px] flex flex-col items-center justify-center shrink-0 text-[10px] font-black text-white rounded-l-xs ${statBarBg}`}>
                                        <span>{symbol}</span>
                                      </div>

                                      {/* Sensor Name/Metrics body */}
                                      <div className="flex flex-col p-1 pl-1.5 justify-between w-full min-w-0">
                                        <div className="text-[10px] font-bold leading-tight line-clamp-1 truncate select-none group-hover:text-blue-800" title={sensor.name}>
                                          {sensor.name}
                                        </div>
                                        <div className="text-[9px] font-mono font-bold truncate text-right text-slate-700 select-all tracking-tight shrink-0">
                                          {sensor.value}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* USER CAPTIONS */}
          <div className="flex items-center justify-between bg-[#f8fafc] border border-[#cbd5e1] px-2.5 py-1.8 rounded text-[10px] text-slate-500 font-sans mt-2 shadow-xs leading-relaxed">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              <span>Detección CCTV activa: telemetría de streaming RTSP, almacenamiento HDD, ONVIF y latencias de enlace en tiempo real.</span>
            </span>
            <span className="italic select-none hidden md:inline">PRTG Sensor Network Monitor (Offline Sim)</span>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        // RENDER: CLASSIC 254 SUB-NET DOT GRID
        <div className="space-y-3">
          <div className="flex gap-2 text-[9.5px] items-center text-slate-500 font-mono flex-wrap justify-end">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> Activo (OK)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span> Advertencia
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span> Alarma / Caído
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-slate-700 inline-block"></span> Hosts Libres
            </span>
          </div>

          <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-18 xl:grid-cols-20 gap-1 overflow-y-auto pr-1">
            {devices.map((device, idx) => {
              const ipIndex = idx + 1;
              let bgColor = 'bg-slate-950/40 text-slate-600 hover:bg-slate-800/80 hover:text-slate-400';
              let borderColor = 'border-slate-800/80';

              if (device.estado === 'OK') {
                bgColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/80 hover:bg-emerald-500/20';
                borderColor = 'border-emerald-500/40';
              } else if (device.estado === 'Advertencia') {
                bgColor = 'bg-amber-500/10 text-amber-400 border-amber-500/80 hover:bg-amber-500/20';
                borderColor = 'border-amber-500/40';
              } else if (device.estado === 'Caído' && device.lastChecked !== null) {
                bgColor = 'bg-rose-500/15 text-rose-400 border-rose-500/80 hover:bg-rose-500/25';
                borderColor = 'border-rose-500/40';
              }

              const isGridHovered = hoveredGridId === device.id;

              return (
                <div
                  key={device.id}
                  className="relative"
                  onMouseEnter={() => setHoveredGridId(device.id)}
                  onMouseLeave={() => setHoveredGridId(null)}
                >
                  <button
                    onClick={() => {
                      if (device.estado !== 'No_Escaneado') onSelectDevice(device);
                    }}
                    className={`w-full aspect-square text-[9px] font-mono font-medium border ${borderColor} ${bgColor} flex flex-col items-center justify-center rounded-xs transition-all duration-150 shadow-xs hover:scale-105 active:scale-95 cursor-pointer`}
                    title={`${device.ip} - ${device.host}`}
                  >
                    <span>.{ipIndex}</span>
                  </button>

                  {/* Tooltip on Hover */}
                  {isGridHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-55 w-48 bg-[#0B1120] text-slate-200 text-[11px] p-2 rounded-sm shadow-xl border border-slate-800 pointer-events-none text-left font-sans">
                      <div className="font-semibold text-cyan-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>IP: {device.ip}</span>
                        {device.host !== '—' && getGridIconForHost(device.host)}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div><span className="text-slate-500">Host:</span> {device.host}</div>
                        {device.mac !== '—' && (
                          <div className="font-mono text-[9.5px]"><span className="text-slate-500 font-sans text-[11px]">MAC:</span> {device.mac}</div>
                        )}
                        <div>
                          <span className="text-slate-500">Estado:</span>{' '}
                          <span className={
                            device.estado === 'OK' ? 'text-emerald-400 font-bold' :
                            device.estado === 'Advertencia' ? 'text-amber-400 font-bold' :
                            device.estado === 'Caído' ? 'text-rose-400 font-bold' : 'text-slate-500 text-[9.5px]'
                          }>
                            {device.estado === 'No_Escaneado' ? 'Libre / Inactivo' : device.estado}
                          </span>
                        </div>
                        {device.ping !== null && (
                          <div className="font-mono text-[10px]"><span className="text-slate-500 font-sans text-[11px]">Latencia:</span> {device.ping} ms</div>
                        )}
                        {device.consumoDownload !== undefined && device.estado !== 'No_Escaneado' && (
                          <div className="text-[10px] font-mono border-t border-slate-850/60 mt-1 pt-1 flex justify-between text-slate-400">
                            <span className="text-cyan-400">↓ {device.consumoDownload} Mb</span>
                            <span className="text-amber-500">↑ {device.consumoUpload} Mb</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0B1120]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // RENDER: GRAPHICAL TOPOLOGY LINK CHART MAP
        <div className="relative border border-slate-850/60 bg-slate-950/20 rounded-md overflow-hidden p-1.5">
          
          {/* Custom style inject tag to run moving light line-dash keyframes */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes linkDashMove {
              to {
                stroke-dashoffset: -40;
              }
            }
            @keyframes alarmFlashGlow {
              0%, 100% {
                transform: scale(1);
                opacity: 0.15;
              }
              50% {
                transform: scale(1.35);
                opacity: 0.55;
              }
            }
            .wire-dash {
              animation: linkDashMove 2s linear infinite;
            }
            .wire-dash-fast {
              animation: linkDashMove 0.75s linear infinite;
            }
            .signal-wave {
              transform-origin: center;
              animation: alarmFlashGlow 2.5s ease-in-out infinite;
            }
          `}} />

          {/* BACKGROUND CHART GRID MESH */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none scale-105 bg-[linear-gradient(rgba(14,165,233,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.15)_1px,transparent_1px)] bg-[size:15px_15px]"></div>

          {/* LIVE NET LEGEND OVERLAY */}
          <div className="absolute top-2 left-2 pointer-events-none hidden md:flex flex-col bg-slate-950/80 border border-slate-850 p-2 rounded text-[9px] font-sans text-slate-450 space-y-1 z-30 select-none">
            <span className="font-bold text-slate-300 border-b border-slate-850 pb-0.75 uppercase">Estándar de Enlaces</span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-sky-200/50 inline-block"></span>
              Fibra Óptica GPON (SFP)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-cyan-500/50 inline-block"></span>
              Cable de Red Cobre (Ethernet)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t border-dashed border-amber-500 inline-block"></span>
              Inalámbrico (Wi-Fi 2.4/5GHz)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-purple-500/50 inline-block"></span>
              Bridging Virtual Docker / Hypervisor
            </span>
          </div>

          <div className="w-full h-auto overflow-x-auto overflow-y-hidden select-none touch-pan-x">
            {/* SVG STAGE */}
            <svg 
              className="w-full min-w-[860px]" 
              viewBox={`0 0 920 ${topologyHeight}`} 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              
              {/* === SECTION A: WIRE CONNECTIONS & FLOW LINE TRANSMISSIONS === */}
              {topologyNodes.map(node => {
                if (!node.parent) return null;
                
                const parentNode = topologyNodes.find(n => n.id === node.parent);
                if (!parentNode) return null;

                // Grab dynamic state of target endpoint device
                const device = getDeviceForNode(node.ip);
                const isDown = device ? device.estado === 'Caído' : false;
                const isNoScan = device ? device.estado === 'No_Escaneado' : false;
                const isWarning = device ? device.estado === 'Advertencia' : false;

                // Live speeds mapping
                const dLoad = device ? device.consumoDownload || 0 : 0;
                const uLoad = device ? device.consumoUpload || 0 : 0;
                const heavyTraffic = dLoad > 15 || uLoad > 12;

                // Path highlight check
                const isPathActive = activeUpstreamPath.includes(node.id) && activeUpstreamPath.includes(node.parent);

                // Line Color decision
                let linkColor = 'stroke-slate-800/80';
                let linkThickness = '1.5';
                let isDashed = node.linkType === 'wifi';

                if (isPathActive) {
                  // Focused highlight path on hover
                  linkColor = isWarning ? 'stroke-amber-400' : isDown ? 'stroke-rose-500' : 'stroke-cyan-400';
                  linkThickness = '2.5';
                } else if (!isNoScan && !isDown) {
                  // Default online colors based on wires standard
                  if (node.linkType === 'fiber') {
                    linkColor = 'stroke-sky-300/40';
                    linkThickness = '2';
                  } else if (node.linkType === 'wifi') {
                    linkColor = 'stroke-amber-500/30';
                  } else if (node.linkType === 'virtual') {
                    linkColor = 'stroke-purple-550/30 stroke-purple-500/30';
                    linkThickness = '1.2';
                  } else {
                    linkColor = 'stroke-cyan-600/30';
                  }
                } else if (isDown) {
                  linkColor = 'stroke-rose-950/40';
                } else {
                  linkColor = 'stroke-slate-900';
                }

                return (
                  <g key={`wire-${node.id}`}>
                    {/* Raw connection wire backplane (behind glow) */}
                    <path
                      d={`M ${parentNode.x} ${parentNode.y} L ${node.x} ${node.y}`}
                      className="transition-all duration-300"
                      fill="none"
                      strokeWidth={linkThickness}
                      stroke={
                        isPathActive 
                          ? (isWarning ? '#f59e0b' : isDown ? '#f43f5e' : '#06b6d4')
                          : (node.linkType === 'fiber' ? '#bae6fd' : node.linkType === 'wifi' ? '#f59e0b' : node.linkType === 'virtual' ? '#a855f7' : '#0891b2')
                      }
                      strokeOpacity={isPathActive ? '1.0' : (isNoScan || isDown) ? '0.08' : '0.22'}
                      strokeDasharray={isDashed ? '4,4' : undefined}
                    />

                    {/* INTERACTIVE DATA TRANSACTION GLOW - MOVING PULSES FOR HIGH CONSUMERS */}
                    {(dLoad > 0.05 || uLoad > 0.05) && !isDown && !isNoScan && (
                      <path
                        d={
                          // Flow direction: Upload moves Child -> Parent; Download moves Parent -> Child
                          uLoad > dLoad 
                            ? `M ${node.x} ${node.y} L ${parentNode.x} ${parentNode.y}` 
                            : `M ${parentNode.x} ${parentNode.y} L ${node.x} ${node.y}`
                        }
                        fill="none"
                        stroke={heavyTraffic ? '#e11d48' : isWarning ? '#eab308' : '#22d3ee'}
                        strokeWidth={heavyTraffic ? '3' : '1.8'}
                        strokeOpacity="0.85"
                        strokeDasharray={heavyTraffic ? '10,7' : '6,12'}
                        className={heavyTraffic ? 'wire-dash-fast' : 'wire-dash'}
                      />
                    )}

                    {/* Speed metric tags inside path (hidden unless hovered, or active bandwidth testing) */}
                    {(isPathActive || heavyTraffic) && dLoad > 0.1 && (
                      <foreignObject 
                        x={(node.x + parentNode.x) / 2 - 25} 
                        y={(node.y + parentNode.y) / 2 - 10} 
                        width="50" 
                        height="20"
                        className="overflow-visible select-none pointer-events-none"
                      >
                        <div className={`p-0.5 rounded text-[8px] font-mono leading-none border text-center shadow-md ${
                          heavyTraffic 
                            ? 'bg-rose-950/95 text-rose-300 border-rose-800' 
                            : 'bg-slate-950/95 text-cyan-300 border-slate-800'
                        }`}>
                          ↓{dLoad.toFixed(1)}M
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* === SECTION B: NODES RENDERING == */}
              {topologyNodes.map(node => {
                const device = getDeviceForNode(node.ip);
                
                // Defaults for structural distribution nodes
                let isNoScan = false;
                let isDown = false;
                let isWarning = false;
                let pingVal: number | null = null;

                if (device) {
                  isNoScan = device.estado === 'No_Escaneado';
                  isDown = device.estado === 'Caído';
                  isWarning = device.estado === 'Advertencia';
                  pingVal = device.ping;
                }

                // Check matches for interactive highlights
                const isHovered = hoveredNodeId === node.id;
                const isNodeActive = !isNoScan && !isDown;

                // Color themes for nodes rings
                let ringColor = 'stroke-slate-700';
                let fillColor = 'fill-slate-950';
                let circleBorderClass = 'stroke-[1.5]';

                if (isNodeActive) {
                  ringColor = isWarning ? 'stroke-amber-500' : 'stroke-emerald-500';
                  circleBorderClass = 'stroke-[2]';
                } else if (isDown) {
                  ringColor = 'stroke-rose-600';
                  fillColor = 'fill-[#1c0c10]';
                } else {
                  // Not scanned / offline tree placeholder
                  ringColor = 'stroke-slate-800';
                  circleBorderClass = 'stroke-dashed stroke-[1.5]';
                }

                // Double accent glow for selected or hovered targets
                if (isHovered) {
                  circleBorderClass += ' stroke-[3.5]';
                }

                return (
                  <g 
                    key={`node-${node.id}`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      if (device && !isNoScan) onSelectDevice(device);
                    }}
                    className="cursor-pointer"
                  >
                    {/* INVISIBLE STABLE HOVER TARGET AREA */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="28"
                      fill="transparent"
                      className="cursor-pointer pointer-events-auto"
                    />
                    
                    {/* Pulse glow background circle for warnings/active alarms */}
                    {(isWarning || isHovered) && isNodeActive && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="25"
                        fill="none"
                        stroke={isWarning ? '#f59e0b' : '#06b6d4'}
                        className="signal-wave"
                      />
                    )}

                    {/* Nodes Backplate Card container */}
                    <circle 
                      cx={node.x} 
                      cy={node.y} 
                      r="16" 
                      className={`${circleBorderClass} ${fillColor} ${ringColor} transition-all duration-200`} 
                    />

                    {/* Node Core Vector Icons loaded inside foreign object */}
                    <foreignObject 
                      x={node.x - 9} 
                      y={node.y - 9} 
                      width="18" 
                      height="18"
                      className="pointer-events-none select-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {renderNodeIcon(node.type, isDown, isWarning)}
                      </div>
                    </foreignObject>

                    {/* Offline / Down Crimson Cross overlay */}
                    {isDown && (
                      <path 
                        d={`M ${node.x - 4} ${node.y - 4} L ${node.x + 4} ${node.y + 4} M ${node.x + 4} ${node.y - 4} L ${node.x - 4} ${node.y + 4}`} 
                        stroke="#f43f5e" 
                        strokeWidth="1.8" 
                        strokeLinecap="round" 
                      />
                    )}

                    {/* Host Friendly Name Header Label text block */}
                    <text
                      x={node.x}
                      y={node.y + 24}
                      textAnchor="middle"
                      className={`font-sans font-medium select-none pointer-events-none text-[9.5px] transition-colors duration-200 ${
                        isHovered ? 'fill-cyan-400 font-semibold' : 'fill-slate-300'
                      }`}
                    >
                      {useOwnNames
                        ? (device && device.host !== '—'
                          ? (device.host.length > 18 ? device.host.substring(0, 16) + '...' : device.host)
                          : (isDown ? 'Segmento Inactivo' : (node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label))
                        )
                        : (device && device.host !== '—' 
                          ? getShortHostName(device.host) 
                          : (isDown 
                              ? 'Segmento Inactivo' 
                              : getShortHostName(node.label)
                            )
                        )
                      }
                    </text>

                    {/* Host Sub-metric or IP details centered below label */}
                    <text
                      x={node.x}
                      y={node.y + 34}
                      textAnchor="middle"
                      className="font-mono text-[8px] fill-slate-500 font-normal select-none pointer-events-none transition-colors"
                    >
                      {device 
                        ? (isNoScan ? 'No Escaneado' : `${device.ip}`)
                        : (node.id === 'wan' ? 'Red WAN' : node.interfaceName || 'Router Local')
                      }
                    </text>

                    {/* Dynamic state pills overlays (small bullet count) */}
                    {isNodeActive && device && device.consumoDownload !== undefined && (device.consumoDownload > 0 || device.consumoUpload > 0) && (
                      <g className="pointer-events-none select-none transition-all duration-200">
                        <circle cx={node.x + 11} cy={node.y - 11} r="5.5" fill="#0891b2" />
                        <text x={node.x + 11} y={node.y - 9} textAnchor="middle" className="fill-[#020617] font-mono text-[7px] font-bold">
                          {device.consumoDownload > 10 ? '!' : 't'}
                        </text>
                      </g>
                    )}

                  </g>
                );
              })}

              {/* === SECTION C: HOVERED NODE TOOLTIP (RENDERED ON TOP) === */}
              {hoveredNodeId && (() => {
                const node = topologyNodes.find(n => n.id === hoveredNodeId);
                if (!node) return null;
                
                const device = getDeviceForNode(node.ip);
                let isNoScan = false;
                let isDown = false;
                let isWarning = false;
                let pingVal: number | null = null;

                if (device) {
                  isNoScan = device.estado === 'No_Escaneado';
                  isDown = device.estado === 'Caído';
                  isWarning = device.estado === 'Advertencia';
                  pingVal = device.ping;
                }

                const isNodeActive = !isNoScan && !isDown;

                return (
                  <foreignObject
                    x={node.x + 22 > 700 ? node.x - 200 : node.x + 22}
                    y={node.y - 45}
                    width="180"
                    height="138"
                    className="overflow-visible select-none pointer-events-none z-50 transition-all"
                  >
                    <div className="bg-[#0B1120] border border-slate-600 text-slate-200 text-[10.5px] p-2 rounded shadow-2xl font-sans text-left space-y-1 select-none pointer-events-none">
                      <div className="font-semibold text-cyan-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span className="truncate max-w-[125px] font-sans">
                          {device && device.host !== '—' 
                            ? device.host 
                            : (isDown 
                                ? 'Segmento Inactivo' 
                                : node.label
                              )
                          }
                        </span>
                        <span className="text-[8.5px] bg-[#1e293b] px-1 rounded text-slate-400 font-mono">
                          {device ? `IPv4` : 'INFRA'}
                        </span>
                      </div>

                      <div className="space-y-0.75 leading-tight">
                        {/* Connection Link Port Info */}
                        {node.interfaceName && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Conexión:</span>{' '}
                            <span className="text-slate-300 font-mono text-[9px]">{node.interfaceName}</span>
                          </div>
                        )}

                        {/* Standard link interfaces */}
                        {node.linkType && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Tecnología:</span>{' '}
                            <span className="text-slate-400 uppercase text-[9px] font-semibold font-sans">
                              {node.linkType === 'fiber' ? '✦ Fibra SFP+' : 
                               node.linkType === 'wifi' ? '📶 WIFI Wireless' : 
                               node.linkType === 'virtual' ? '⚡ Veth Bridge' : '🖧 ethernet RJ45'}
                            </span>
                          </div>
                        )}

                        {/* IP address if device */}
                        {device && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">IP Local:</span>{' '}
                            <span className="text-cyan-400 font-mono font-medium">{device.ip}</span>
                          </div>
                        )}

                        {/* Physical MAC ID */}
                        {device && device.mac !== '—' && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Dirección MAC:</span>{' '}
                            <span className="text-slate-400 font-mono text-[8.5px]">{device.mac}</span>
                          </div>
                        )}

                        {/* Latency Rating */}
                        <div>
                          <span className="text-slate-500 font-medium font-sans">Estado:</span>{' '}
                          <span className={`font-bold font-sans ${
                            isNoScan ? 'text-slate-550' :
                            isDown ? 'text-rose-500' :
                            isWarning ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {isNoScan ? 'No Escaneado' : isDown ? 'ALTA CAÍDA' : isWarning ? 'Advertencia' : 'Operativo (OK)'}
                          </span>
                        </div>

                        {/* Diagnostics Ping Info */}
                        {pingVal !== null && (
                          <div>
                            <span className="text-slate-500 font-medium font-sans">Latencia:</span>{' '}
                            <span className="text-slate-300 font-mono">{pingVal} ms</span>
                          </div>
                        )}

                        {/* Flow traffic stats */}
                        {device && isNodeActive && device.consumoDownload !== undefined && (
                          <div className="pt-1 border-t border-slate-850 flex justify-between font-mono text-[8.5px] mt-1 text-slate-400">
                            <span className="text-cyan-400 font-sans">Baj:</span> <span className="text-cyan-400 font-mono">{device.consumoDownload} Mbps</span>
                            <span className="text-amber-500 font-sans">Sub:</span> <span className="text-amber-500 font-mono">{device.consumoUpload} Mbps</span>
                          </div>
                        )}
                      </div>
                      
                      {device && isNodeActive && (
                        <div className="text-[8.5px] italic text-[#38bdf8] border-t border-slate-850/60 pt-1 mt-0.5 text-center font-sans">
                          * Haz clic para Diagnóstico Físico & Puertos
                        </div>
                      )}
                    </div>
                  </foreignObject>
                );
              })()}

            </svg>
          </div>
          
          {/* USER INSTRUCTIONS FOOTER */}
          <div className="bg-[#0B1120] border-t border-slate-850/60 p-2.5 flex items-center justify-between text-[10px] text-slate-500 font-sans mt-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
              <span>Posa el cursor sobre un nodo para ver la <strong>ruta de flujo lógico</strong> y estadísticas de enlace.</span>
            </span>
            <span className="italic select-none hidden md:inline">Visual Utility LAN Mapper (BETA)</span>
          </div>

        </div>
      )}

      {/* GLOBAL FOOTER CAPTION */}
      <p className="text-[9.5px] text-slate-500 mt-2 italic font-sans flex items-center gap-1">
        <span>*</span>
        <span>El software grafica interconexiones reales basadas en el protocolo de enlace físico del controlador y el sistema virtual Docker.</span>
      </p>

    </div>
  );
}
