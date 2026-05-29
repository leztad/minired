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
