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
  const activePresets: Record<number, { host: string; mac: string; ping: number; estado: 'OK' | 'Advertencia' | 'Caído' }> = {
    1: { host: 'Router / Gateway', mac: '2C:96:82:AF:E1:30', ping: 1, estado: 'OK' },
    38: { host: 'Smart-TV LAN', mac: '50:3E:AA:C4:F3:11', ping: 85, estado: 'Advertencia' },
    40: { host: 'Console-PS5', mac: 'FE:33:DE:82:31:0C', ping: 120, estado: 'Advertencia' },
    55: { host: 'DESKTOP-FS211HD (Este PC)', mac: '84:C8:A0:BB:AB:66', ping: 3, estado: 'OK' },
  };

  // Virtual templates if "Virtuales" is enabled
  const virtualPresets: Record<number, { host: string; mac: string; ping: number; estado: 'OK' | 'Advertencia' | 'Caído' }> = {
    10: { host: 'DATABASE-PROD (Docker)', mac: '02:42:AC:11:00:02', ping: 5, estado: 'OK' },
    11: { host: 'WEB-SERVER-01 (Docker)', mac: '02:42:AC:11:00:03', ping: 12, estado: 'OK' },
    15: { host: 'NAS-Backup', mac: '00:11:32:8F:A1:AC', ping: 95, estado: 'Advertencia' },
    22: { host: 'HP-LaserJet-MFP', mac: '3C:D9:2B:44:A8:12', ping: 45, estado: 'OK' },
    70: { host: 'Alexa-LivingRoom', mac: 'FC:A6:67:88:AC:3B', ping: 75, estado: 'OK' },
    102: { host: 'Hacienda-IOT-Hub', mac: 'EC:FA:BC:11:22:33', ping: 140, estado: 'Advertencia' },
    200: { host: 'VM-Ubuntu-Devel', mac: '08:00:27:8C:1D:64', ping: 8, estado: 'OK' }
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
