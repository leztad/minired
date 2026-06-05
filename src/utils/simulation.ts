import { Device, Sensor } from '../types';

export interface PresetDefinition {
  host: string;
  mac: string;
  ping: number;
  estado: 'OK' | 'Advertencia' | 'Caído';
  consumoDownload: number;
  consumoUpload: number;
  totalConsumido: number;
  sensorHttp?: boolean;
}

export interface NetworkInterfaceConfig {
  name: string;
  type: 'LAN' | 'Wi-Fi' | 'Virtual';
  segments: string[];
}

export const INTERFACES_CONFIG: NetworkInterfaceConfig[] = [
  {
    name: "Realtek PCIe GbE Family Controller",
    type: "LAN",
    segments: ["192.168.1.0/24", "192.168.20.0/24"]
  },
  {
    name: "Intel Wi-Fi 6E AX211 @ 802.11ax",
    type: "Wi-Fi",
    segments: ["192.168.1.0/24", "192.168.0.0/24", "192.168.100.0/24", "10.0.0.0/24"]
  },
  {
    name: "Microsoft Loopback Virtual Adapter",
    type: "Virtual",
    segments: ["172.17.0.0/16", "10.10.10.0/24"]
  }
];

// Helper to generate MAC addresses
export function generateRandomMAC(ipSuffix: number): string {
  const parts = ['00', '1A', '2B', '3C', 'D4', ipSuffix.toString(16).padStart(2, '0').toUpperCase()];
  return parts.join(':');
}

// Preset configurations for distinct segments to simulate rich diverse components
const SUBNET_PRESETS: Record<string, {
  active: Record<number, PresetDefinition>;
  virtual: Record<number, PresetDefinition>;
}> = {
  // 192.168.1.0/24 - Corporate Admin LAN
  '192.168.1': {
    active: {
      1: { host: 'Router Gateway LAN', mac: '2C:96:82:AF:E1:30', ping: 1, estado: 'OK', consumoDownload: 1.2, consumoUpload: 0.4, totalConsumido: 254.2 },
      38: { host: 'Dispositivo LAN (DHCP .38)', mac: '50:3E:AA:C4:F3:11', ping: 85, estado: 'Advertencia', consumoDownload: 18.5, consumoUpload: 1.2, totalConsumido: 1245.8 },
      40: { host: 'Dispositivo LAN (DHCP .40)', mac: 'FE:33:DE:82:31:0C', ping: 120, estado: 'Advertencia', consumoDownload: 42.8, consumoUpload: 3.5, totalConsumido: 5410.0 },
      55: { host: 'Estación de Trabajo (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 3, estado: 'OK', consumoDownload: 5.6, consumoUpload: 0.9, totalConsumido: 843.5 },
    },
    virtual: {
      10: { host: 'Base de Datos (Docker DB)', mac: '02:42:AC:11:00:02', ping: 5, estado: 'OK', consumoDownload: 0.1, consumoUpload: 0.2, totalConsumido: 124.0, sensorHttp: true },
      11: { host: 'Servidor Web (Docker)', mac: '02:42:AC:11:00:03', ping: 12, estado: 'OK', consumoDownload: 2.1, consumoUpload: 3.4, totalConsumido: 984.7, sensorHttp: true },
      15: { host: 'Almacenamiento de Red (NAS)', mac: '00:11:32:8F:A1:AC', ping: 95, estado: 'Advertencia', consumoDownload: 0.8, consumoUpload: 45.3, totalConsumido: 11450.2 },
      22: { host: 'Impresora de Red', mac: '3C:D9:2B:44:A8:12', ping: 45, estado: 'OK', consumoDownload: 0, consumoUpload: 0, totalConsumido: 4.8 },
      70: { host: 'Dispositivo IoT (DHCP .70)', mac: 'FC:A6:67:88:AC:3B', ping: 75, estado: 'OK', consumoDownload: 0.2, consumoUpload: 0.1, totalConsumido: 55.4 },
      102: { host: 'Módulo IoT (DHCP .102)', mac: 'EC:FA:BC:11:22:33', ping: 140, estado: 'Advertencia', consumoDownload: 0.05, consumoUpload: 0.05, totalConsumido: 12.3 },
      200: { host: 'Máquina Virtual (VM Ubuntu)', mac: '08:00:27:8C:1D:64', ping: 8, estado: 'OK', consumoDownload: 1.4, consumoUpload: 0.3, totalConsumido: 341.1 }
    }
  },
  // 192.168.20.0/24 - CCTV and IoT security VLAN
  '192.168.20': {
    active: {
      1: { host: 'Router Switch L3 Giga (VLAN 20)', mac: '2C:96:82:AF:20:CC', ping: 1, estado: 'OK', consumoDownload: 0.5, consumoUpload: 0.1, totalConsumido: 104.5 },
      10: { host: 'Grabadora NVR CCTV (Dahua)', mac: 'A4:12:3F:82:B1:01', ping: 4, estado: 'OK', consumoDownload: 2.2, consumoUpload: 65.4, totalConsumido: 18451.2, sensorHttp: true },
      21: { host: 'Cámara Domo IP Frontal', mac: '00:0F:7C:1E:51:AA', ping: 8, estado: 'OK', consumoDownload: 0.1, consumoUpload: 4.5, totalConsumido: 1240.5 },
      22: { host: 'Cámara Varifocal Bodega Norte', mac: '00:0F:7C:1E:51:AB', ping: 9, estado: 'OK', consumoDownload: 0.1, consumoUpload: 4.5, totalConsumido: 1235.4 },
      23: { host: 'Cámara Exterior Acceso', mac: '00:0F:7C:1E:51:AC', ping: 11, estado: 'OK', consumoDownload: 0.1, consumoUpload: 4.5, totalConsumido: 1242.0 },
      55: { host: 'Estación LAN Bridge (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 2, estado: 'OK', consumoDownload: 4.1, consumoUpload: 1.1, totalConsumido: 624.0 },
    },
    virtual: {
      100: { host: 'Lector Biométrico Puertas', mac: '00:1A:2B:AC:45:90', ping: 24, estado: 'OK', consumoDownload: 0.01, consumoUpload: 0.01, totalConsumido: 2.4 },
      101: { host: 'Sensor Humedad IoT (Estante 1)', mac: '4E:1A:87:CC:01:A2', ping: 98, estado: 'Advertencia', consumoDownload: 0.01, consumoUpload: 0.01, totalConsumido: 4.1 },
      180: { host: 'VM Syslog Server (VLAN Stack)', mac: '08:00:27:8C:DD:22', ping: 5, estado: 'OK', consumoDownload: 0.3, consumoUpload: 0.8, totalConsumido: 184.2 }
    }
  },
  // 192.168.100.0/24 - Wi-Fi Principal
  '192.168.100': {
    active: {
      1: { host: 'AP Principal (UniFi AP-PRO)', mac: '44:D9:E7:F4:01:BC', ping: 1, estado: 'OK', consumoDownload: 42.1, consumoUpload: 10.4, totalConsumido: 8412.5 },
      15: { host: 'Almacenamiento LAN (NAS Multimedia)', mac: '00:11:32:8F:A1:BC', ping: 65, estado: 'OK', consumoDownload: 1.2, consumoUpload: 18.2, totalConsumido: 5214.0 },
      38: { host: 'Smart TV 65" LivingRoom', mac: 'D4:E4:C4:F3:11:80', ping: 85, estado: 'Advertencia', consumoDownload: 18.5, consumoUpload: 1.2, totalConsumido: 1245.8 },
      40: { host: 'Consola PS5 (Gaming-Wifi)', mac: 'FE:33:DE:82:11:1C', ping: 120, estado: 'Advertencia', consumoDownload: 42.8, consumoUpload: 3.5, totalConsumido: 5410.0 },
      55: { host: 'Laptop de Trabajo (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 4, estado: 'OK', consumoDownload: 8.5, consumoUpload: 2.1, totalConsumido: 1120.0 },
    },
    virtual: {
      12: { host: 'Apple iPad Air (Tablet)', mac: '7C:B0:C2:DE:FA:01', ping: 18, estado: 'OK', consumoDownload: 1.1, consumoUpload: 0.1, totalConsumido: 98.4 },
      70: { host: 'Asistente Alexa Echo Dot', mac: 'FC:A6:67:88:AC:3B', ping: 25, estado: 'OK', consumoDownload: 0.05, consumoUpload: 0.01, totalConsumido: 22.4 },
      72: { host: 'Bombilla Inteligente Living', mac: 'C4:4F:33:8A:23:44', ping: 142, estado: 'Advertencia', consumoDownload: 0.01, consumoUpload: 0.01, totalConsumido: 1.2 },
      73: { host: 'Termostato Inteligente Nest', mac: '00:1E:C5:DD:12:F1', ping: 44, estado: 'OK', consumoDownload: 0.01, consumoUpload: 0.01, totalConsumido: 0.8 },
      102: { host: 'Cerradura Inteligente Yale', mac: 'EC:FA:BC:11:22:33', ping: 95, estado: 'Advertencia', consumoDownload: 0.01, consumoUpload: 0.01, totalConsumido: 0.2 },
    }
  },
  // 10.0.0.0/24 - Wi-Fi Invitados
  '10.0.0': {
    active: {
      1: { host: 'Gateway Cautivo Invitados', mac: '50:3E:AA:C4:00:01', ping: 1, estado: 'OK', consumoDownload: 8.2, consumoUpload: 2.4, totalConsumido: 1450.5 },
      12: { host: 'Smartphone Android (Invitado)', mac: '2C:F0:EE:D4:44:A2', ping: 45, estado: 'OK', consumoDownload: 1.4, consumoUpload: 0.2, totalConsumido: 184.5 },
      13: { host: 'iPhone de Visita 1', mac: '88:C2:23:DF:FB:56', ping: 55, estado: 'OK', consumoDownload: 0.8, consumoUpload: 0.1, totalConsumido: 98.2 },
      45: { host: 'MacBook Pro Freelancer', mac: 'F0:18:98:AA:BC:C1', ping: 15, estado: 'OK', consumoDownload: 12.4, consumoUpload: 4.1, totalConsumido: 1945.0 },
      55: { host: 'Laptop Invitada (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 5, estado: 'OK', consumoDownload: 6.2, consumoUpload: 1.2, totalConsumido: 541.2 },
    },
    virtual: {
      100: { host: 'Smart TV Habitación Invitados', mac: 'EC:AA:23:FF:DE:89', ping: 72, estado: 'OK', consumoDownload: 4.5, consumoUpload: 0.4, totalConsumido: 345.0 },
      210: { host: 'Dispositivo Escaneado WiFi', mac: 'A4:C5:12:33:DE:FF', ping: 135, estado: 'Advertencia', consumoDownload: 0.1, consumoUpload: 0.05, totalConsumido: 15.0 }
    }
  },
  // 172.17.0.0/16 - Docker Bridge
  '172.17': {
    active: {
      1: { host: 'Interfaz Docker0 (Bridge)', mac: '02:42:C0:A8:01:01', ping: 1, estado: 'OK', consumoDownload: 0.1, consumoUpload: 0.1, totalConsumido: 5.2 },
      2: { host: 'Contenedor Backend (Node.js Express)', mac: '02:42:AC:11:00:02', ping: 2, estado: 'OK', consumoDownload: 12.5, consumoUpload: 8.4, totalConsumido: 5412.0, sensorHttp: true },
      3: { host: 'Contenedor Redis (Session Store)', mac: '02:42:AC:11:00:03', ping: 1, estado: 'OK', consumoDownload: 4.1, consumoUpload: 4.2, totalConsumido: 1120.5 },
      4: { host: 'Contenedor PostgreSQL (DB)', mac: '02:42:AC:11:00:04', ping: 3, estado: 'OK', consumoDownload: 1.8, consumoUpload: 14.5, totalConsumido: 8452.4, sensorHttp: true },
      55: { host: 'Nodo Docker Host (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 1, estado: 'OK', consumoDownload: 18.5, consumoUpload: 27.2, totalConsumido: 15124.0 }
    },
    virtual: {
      10: { host: 'Contenedor InfluxDB (Métricas)', mac: '02:42:AC:11:00:0A', ping: 4, estado: 'OK', consumoDownload: 0.8, consumoUpload: 0.9, totalConsumido: 254.0 },
      11: { host: 'Contenedor Grafana Panel', mac: '02:42:AC:11:00:0B', ping: 5, estado: 'OK', consumoDownload: 1.4, consumoUpload: 0.2, totalConsumido: 185.0, sensorHttp: true },
      12: { host: 'Contenedor RabbitMQ Eventos', mac: '02:42:AC:11:00:0C', ping: 8, estado: 'OK', consumoDownload: 0.2, consumoUpload: 0.2, totalConsumido: 112.5 }
    }
  },
  // 10.10.10.0/24 - SDN OpenFlow Sandbox
  '10.10.10': {
    active: {
      1: { host: 'Gatekeeper Controller SDN v4', mac: '0A:B1:C2:D3:E4:01', ping: 2, estado: 'OK', consumoDownload: 0.1, consumoUpload: 0.1, totalConsumido: 10.2 },
      10: { host: 'Controlador Ryu OpenFlow', mac: '0A:B1:C2:D3:E4:0A', ping: 3, estado: 'OK', consumoDownload: 0.2, consumoUpload: 0.2, totalConsumido: 45.3 },
      55: { host: 'Workstation Mininet (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 1, estado: 'OK', consumoDownload: 5.6, consumoUpload: 0.9, totalConsumido: 843.5 },
    },
    virtual: {
      20: { host: 'Switch Virtual Open vSwitch s1', mac: '00:00:00:00:00:01', ping: 2, estado: 'OK', consumoDownload: 4.8, consumoUpload: 4.8, totalConsumido: 1890.4 },
      21: { host: 'Switch Virtual Open vSwitch s2', mac: '00:00:00:00:00:02', ping: 2, estado: 'OK', consumoDownload: 2.1, consumoUpload: 2.1, totalConsumido: 980.5 },
      101: { host: 'SDN Virtual Host h1', mac: '00:00:00:00:01:01', ping: 8, estado: 'OK', consumoDownload: 1.0, consumoUpload: 0.5, totalConsumido: 124.5 },
      102: { host: 'SDN Virtual Host h2', mac: '00:00:00:00:01:02', ping: 145, estado: 'Advertencia', consumoDownload: 0.05, consumoUpload: 0.05, totalConsumido: 12.3 }
    }
  }
};

// Generate the full pool of 254 devices for a single segment
export function generateFullSubnet(subnetBase: string, includeVirtuals: boolean, interfaceName?: string, isDemoMode: boolean = true): Device[] {
  const devices: Device[] = [];
  const base = subnetBase.replace(/\.0\/24$/, '').replace(/\.0\/16$/, '');

  // Look for predefined presets for this subnet base
  const presetKey = SUBNET_PRESETS[base] ? base : '192.168.1';
  const subnetPresetGroup = SUBNET_PRESETS[presetKey];

  const activePresets = !isDemoMode 
    ? {
        1: { host: 'Gateway de Red (Router)', mac: '10:7B:44:A2:99:11', ping: 2, estado: 'OK' as const, sensorHttp: true, consumoDownload: 1.5, consumoUpload: 0.5, totalConsumido: 450 },
        55: { host: 'Laptop de Trabajo (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 1, estado: 'OK' as const, sensorHttp: true, consumoDownload: 8.5, consumoUpload: 2.1, totalConsumido: 1120 }
      }
    : subnetPresetGroup.active;

  const virtualPresets = isDemoMode ? subnetPresetGroup.virtual : {};

  for (let i = 1; i <= 254; i++) {
    const ip = `${base}.${i}`;
    const id = `host-${base.replace(/\./g, '_')}-${i}`;
    
    if (activePresets[i]) {
      const preset = activePresets[i];
      devices.push({
        id,
        ip,
        host: preset.host,
        mac: preset.mac,
        ping: preset.ping,
        estado: preset.estado,
        lastChecked: null,
        sensorPing: true,
        sensorHttp: preset.sensorHttp || i === 1,
        consumoDownload: preset.consumoDownload,
        consumoUpload: preset.consumoUpload,
        totalConsumido: preset.totalConsumido,
        interfaz: interfaceName,
        segmento: subnetBase,
      });
    } else if (includeVirtuals && virtualPresets[i]) {
      const preset = virtualPresets[i];
      devices.push({
        id,
        ip,
        host: preset.host,
        mac: preset.mac,
        ping: preset.ping,
        estado: preset.estado,
        lastChecked: null,
        sensorPing: true,
        sensorHttp: preset.sensorHttp || false,
        consumoDownload: preset.consumoDownload,
        consumoUpload: preset.consumoUpload,
        totalConsumido: preset.totalConsumido,
        interfaz: interfaceName,
        segmento: subnetBase,
      });
    } else {
      // Offline/Down host
      devices.push({
        id,
        ip,
        host: '—',
        mac: '—',
        ping: null,
        estado: 'Caído',
        lastChecked: null,
        sensorPing: false,
        consumoDownload: 0,
        consumoUpload: 0,
        totalConsumido: 0,
        interfaz: interfaceName,
        segmento: subnetBase,
      });
    }
  }

  return devices;
}

export function generateSensorsForDevices(devices: Device[]): Sensor[] {
  const sensors: Sensor[] = [];
  const activeDevices = devices.filter(d => d.estado !== 'Caído' && d.estado !== 'No_Escaneado');

  activeDevices.forEach(d => {
    // Add ping sensor
    sensors.push({
      id: `sensor-ping-${d.ip}`,
      nombre: `Ping ${d.ip}`,
      dispositivo: d.host,
      ip: d.ip,
      ultimoValor: d.ping !== null ? `${d.ping} ms` : '—',
      estado: d.estado === 'Advertencia' ? 'Advertencia' : d.estado === 'Caído' ? 'Caído' : 'OK',
      intervalo: '1 minuto',
      ultimaComprobacion: new Date().toLocaleTimeString()
    });

    // Add HTTP sensor if applicable
    if (d.sensorHttp) {
      const isOk = d.estado === 'OK';
      sensors.push({
        id: `sensor-http-${d.ip}`,
        nombre: `HTTP status check`,
        dispositivo: d.host,
        ip: d.ip,
        ultimoValor: isOk ? '200 OK (0.24s)' : 'Sin respuesta',
        estado: isOk ? 'OK' : 'Advertencia',
        intervalo: '1 minuto',
        ultimaComprobacion: new Date().toLocaleTimeString()
      });
    }
  });

  return sensors;
}
