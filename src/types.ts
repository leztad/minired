export interface Device {
  id: string;
  ip: string;
  host: string;
  mac: string;
  ping: number | null; // latency in ms or null if down
  estado: 'OK' | 'Advertencia' | 'Caído' | 'No_Escaneado';
  lastChecked: string | null;
  sensorPing: boolean;
  sensorHttp?: boolean;
  consumoDownload?: number; // Speed in Mbps
  consumoUpload?: number;   // Speed in Mbps
  totalConsumido?: number;   // Accumulated data in MB
  interfaz?: string;        // Active interface name
  segmento?: string;        // Connected subnet segment
  vendor?: string;          // Brand/Manufacturer name
  serialNumber?: string;    // Real or hardware-derived serial number
  ttl?: number;             // TTL (Time To Live) signature value
  ttlOs?: string;           // Operating system family suggested by TTL
  httpServer?: string;      // Simulated HTTP Response Server header
  userAgent?: string;       // Simulated intercepted HTTP User-Agent
  osDeducido?: string;      // Fully consolidated operating system / device type
  tipo?: string;            // Categorized device type (e.g. switch, router, ap, pc, etc.)
  ubicacion?: string;       // Physical location of the device (e.g. "Rack A", "Piso 2", "Oficina 101", etc.)
}

export interface Sensor {
  id: string;
  nombre: string;
  dispositivo: string;
  ip: string;
  ultimoValor: string;
  estado: 'OK' | 'Advertencia' | 'Caído';
  intervalo: string;
  ultimaComprobacion: string;
}

export interface ScanStats {
  ok: number;
  advertencia: number;
  caido: number;
  total: number;
  lastScanTime: string | null;
  scanDuration: number | null; // in seconds
}

export interface HistoryPoint {
  timeLabels: string;
  hostsActivos: number;
  latenciaMedia: number;
}
