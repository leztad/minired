import { Device, Sensor } from '../types';

// Helper to generate MAC addresses
export function generateRandomMAC(ipSuffix: number): string {
  const parts = ['00', '1A', '2B', '3C', 'D4', ipSuffix.toString(16).padStart(2, '0').toUpperCase()];
  return parts.join(':');
}

// Generate the full pool of 254 devices
export function generateFullSubnet(subnetBase: string, includeVirtuals: boolean): Device[] {
  const devices: Device[] = [];
  // For standard e.g. 192.168.1.X
  const base = subnetBase.replace(/\.0\/24$/, '');

  // Define static active hosts to match the exact mockup
  // IP 192.168.1.1: Router
  // IP 192.168.1.38: IoT / SmartTV
  // IP 192.168.1.40: PS5 / Gaming
  // IP 192.168.1.55: The simulation local pc
  const activePresets: Record<number, { host: string; mac: string; ping: number; estado: 'OK' | 'Advertencia' | 'Caído'; consumoDownload: number; consumoUpload: number; totalConsumido: number }> = {
    1: { host: 'Router Gateway LAN', mac: '2C:96:82:AF:E1:30', ping: 1, estado: 'OK', consumoDownload: 1.2, consumoUpload: 0.4, totalConsumido: 254.2 },
    38: { host: 'Dispositivo LAN (DHCP .38)', mac: '50:3E:AA:C4:F3:11', ping: 85, estado: 'Advertencia', consumoDownload: 18.5, consumoUpload: 1.2, totalConsumido: 1245.8 },
    40: { host: 'Dispositivo LAN (DHCP .40)', mac: 'FE:33:DE:82:31:0C', ping: 120, estado: 'Advertencia', consumoDownload: 42.8, consumoUpload: 3.5, totalConsumido: 5410.0 },
    55: { host: 'Estación de Trabajo (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 3, estado: 'OK', consumoDownload: 5.6, consumoUpload: 0.9, totalConsumido: 843.5 },
  };

  // Virtual templates if "Virtuales" is enabled
  const virtualPresets: Record<number, { host: string; mac: string; ping: number; estado: 'OK' | 'Advertencia' | 'Caído'; consumoDownload: number; consumoUpload: number; totalConsumido: number }> = {
    10: { host: 'Base de Datos (Docker DB)', mac: '02:42:AC:11:00:02', ping: 5, estado: 'OK', consumoDownload: 0.1, consumoUpload: 0.2, totalConsumido: 124.0 },
    11: { host: 'Servidor Web (Docker)', mac: '02:42:AC:11:00:03', ping: 12, estado: 'OK', consumoDownload: 2.1, consumoUpload: 3.4, totalConsumido: 984.7 },
    15: { host: 'Almacenamiento de Red (NAS)', mac: '00:11:32:8F:A1:AC', ping: 95, estado: 'Advertencia', consumoDownload: 0.8, consumoUpload: 45.3, totalConsumido: 11450.2 },
    22: { host: 'Impresora de Red', mac: '3C:D9:2B:44:A8:12', ping: 45, estado: 'OK', consumoDownload: 0, consumoUpload: 0, totalConsumido: 4.8 },
    70: { host: 'Dispositivo IoT (DHCP .70)', mac: 'FC:A6:67:88:AC:3B', ping: 75, estado: 'OK', consumoDownload: 0.2, consumoUpload: 0.1, totalConsumido: 55.4 },
    102: { host: 'Módulo IoT (DHCP .102)', mac: 'EC:FA:BC:11:22:33', ping: 140, estado: 'Advertencia', consumoDownload: 0.05, consumoUpload: 0.05, totalConsumido: 12.3 },
    200: { host: 'Máquina Virtual (VM Ubuntu)', mac: '08:00:27:8C:1D:64', ping: 8, estado: 'OK', consumoDownload: 1.4, consumoUpload: 0.3, totalConsumido: 341.1 }
  };

  for (let i = 1; i <= 254; i++) {
    const ip = `${base}.${i}`;
    const id = `host-${i}`;
    
    // Check if it's an active preset
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
        sensorHttp: i === 55 || i === 1,
        consumoDownload: preset.consumoDownload,
        consumoUpload: preset.consumoUpload,
        totalConsumido: preset.totalConsumido,
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
        sensorHttp: i === 11 || i === 10,
        consumoDownload: preset.consumoDownload,
        consumoUpload: preset.consumoUpload,
        totalConsumido: preset.totalConsumido,
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
      });
    }
  }

  return devices;
}

export function generateSensorsForDevices(devices: Device[]): Sensor[] {
  const sensors: Sensor[] = [];
  const activeDevices = devices.filter(d => d.estado !== 'Caído');

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
