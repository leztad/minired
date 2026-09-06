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

export type VulnerabilitySeverity = 'critica' | 'alta' | 'media' | 'baja' | 'informativa';
export type VulnerabilityCategory = 'seguridad' | 'protocolos' | 'topologia' | 'rendimiento' | 'cifrado' | 'resiliencia';

export interface VulnerabilityItem {
  id: string;
  titulo: string;
  severidad: VulnerabilitySeverity;
  categoria: VulnerabilityCategory;
  dispositivoAfectado: string;
  ipAfectada: string;
  puertoProtocolo?: string;
  descripcion: string;
  vectorAtaqueRiesgo: string;
  impactoEstimado: string;
  remediacionSugerida: string;
  cvssScore?: number;
  estado?: 'abierta' | 'en_progreso' | 'mitigada' | 'aceptada';
}

export interface OptimizationStep {
  id: string;
  fase: 'fase1_inmediata' | 'fase2_optimizacion' | 'fase3_arquitectura';
  titulo: string;
  descripcion: string;
  prioridad: 'urgente' | 'alta' | 'media';
  esfuerzo: 'bajo' | 'medio' | 'alto';
  impacto: 'critico' | 'alto' | 'medio';
  categoria: string;
  completado: boolean;
  fechaCompletado?: string;
  comandoSugerido?: string;
}

export interface NetworkRecommendation {
  id: string;
  area: 'Seguridad L2/L3' | 'Microsegmentación' | 'Hardening' | 'QoS & Tráfico' | 'Alta Disponibilidad' | 'Cifrado & Certificados';
  titulo: string;
  descripcion: string;
  beneficioClave: string;
  normaEstandar?: string;
  dificultad: 'Fácil' | 'Moderada' | 'Avanzada';
  ejemploConfiguracion?: string;
}

export interface DetailedNetworkReport {
  id: string;
  fechaGeneracion: string;
  titulo: string;
  organizacion: string;
  ubicacion: string;
  auditor: string;
  alcance: 'integral' | 'ciberseguridad' | 'rendimiento';
  segmentoFiltro: string;
  resumenEjecutivo: string;
  scoreSaludRed: number;
  rangoSalud: 'Excelente' | 'Bueno' | 'En Riesgo' | 'Crítico';
  totalDispositivos: number;
  dispositivosOk: number;
  dispositivosAdvertencia: number;
  dispositivosCaidos: number;
  latenciaPromedio: number;
  latenciaMaxima: number;
  jitterEstimado: number;
  puertosInsegurosDetectados: number;
  dispositivosRogueDetectados: number;
  vulnerabilidades: VulnerabilityItem[];
  recomendaciones: NetworkRecommendation[];
  planOptimizacion: OptimizationStep[];
  inventarioResumen: {
    routers: number;
    switches: number;
    servidores: number;
    workstations: number;
    iotCctv: number;
    otros: number;
  };
  conclusiones: string[];
}
