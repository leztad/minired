import dgram from "dgram";
import fs from "fs";
import path from "path";
import os from "os";
import { isDeviceSilenced } from "./maintenanceService";

export interface SyslogEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  hostname: string;
  facility: string;
  facilityCode: number;
  severity: 'Emergency' | 'Alert' | 'Critical' | 'Error' | 'Warning' | 'Notice' | 'Informational' | 'Debug';
  severityCode: number;
  tag: string;
  message: string;
  raw: string;
}

export interface SnmpTrapEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  trapType: 'linkDown' | 'linkUp' | 'coldStart' | 'warmStart' | 'authenticationFailure' | 'enterpriseSpecific';
  enterpriseOid?: string;
  genericTrapCode?: number;
  specificTrapCode?: number;
  uptime?: string;
  varbinds: Array<{ oid: string; type: string; value: string }>;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
}

const FACILITY_NAMES = [
  'kernel', 'user', 'mail', 'daemon', 'auth', 'syslog', 'lpr', 'news',
  'uucp', 'cron', 'authpriv', 'ftp', 'ntp', 'security', 'console', 'solaris-cron',
  'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'
];

const SEVERITY_NAMES: Array<SyslogEvent['severity']> = [
  'Emergency', 'Alert', 'Critical', 'Error', 'Warning', 'Notice', 'Informational', 'Debug'
];

// File storage
let EVENTS_FILE = path.join(process.cwd(), "syslog-events.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  EVENTS_FILE = path.join(configDir, "syslog-events.json");
}

let syslogBuffer: SyslogEvent[] = [];
let trapBuffer: SnmpTrapEvent[] = [];

function loadStoredEvents(): void {
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
      syslogBuffer = Array.isArray(data.syslog) ? data.syslog : [];
      trapBuffer = Array.isArray(data.traps) ? data.traps : [];
    } catch {
      seedDemoEvents();
    }
  } else {
    seedDemoEvents();
  }
}

function saveEvents(): void {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({
      syslog: syslogBuffer.slice(0, 300),
      traps: trapBuffer.slice(0, 150)
    }, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando syslog-events.json:", err);
  }
}

function seedDemoEvents() {
  const now = Date.now();
  syslogBuffer = [
    {
      id: "syslog-seed-1",
      timestamp: new Date(now - 120000).toISOString(),
      sourceIp: "192.168.1.1",
      hostname: "SW-CORE-01",
      facility: "local7",
      facilityCode: 23,
      severity: "Warning",
      severityCode: 4,
      tag: "%LINK-4-ERROR",
      message: "Interface GigabitEthernet1/0/24 changed state to down (Link lost on port to AP-WIFI-PISO2)",
      raw: "<188>Sep 6 12:30:10 SW-CORE-01 %LINK-4-ERROR: Interface GigabitEthernet1/0/24 changed state to down"
    },
    {
      id: "syslog-seed-2",
      timestamp: new Date(now - 80000).toISOString(),
      sourceIp: "192.168.1.254",
      hostname: "FW-PERIMETRO-FORTI",
      facility: "authpriv",
      facilityCode: 10,
      severity: "Alert",
      severityCode: 1,
      tag: "%SEC-1-INTRUSION",
      message: "Multiple failed SSH admin authentication attempts from 192.168.1.187 (Possible Brute-Force)",
      raw: "<81>Sep 6 12:31:05 FW-PERIMETRO-FORTI %SEC-1-INTRUSION: Multiple failed SSH admin authentication attempts"
    },
    {
      id: "syslog-seed-3",
      timestamp: new Date(now - 30000).toISOString(),
      sourceIp: "192.168.1.5",
      hostname: "SRV-STORAGE-SAN",
      facility: "daemon",
      facilityCode: 3,
      severity: "Notice",
      severityCode: 5,
      tag: "smartd",
      message: "Device: /dev/sdb [SAT], SMART Prefailure Attribute: 5 Reallocated_Sector_Ct changed to 12",
      raw: "<29>Sep 6 12:32:00 SRV-STORAGE-SAN smartd: Device /dev/sdb SMART Attribute 5 changed"
    }
  ];

  trapBuffer = [
    {
      id: "trap-seed-1",
      timestamp: new Date(now - 140000).toISOString(),
      sourceIp: "192.168.1.1",
      trapType: "linkDown",
      enterpriseOid: "1.3.6.1.6.3.1.1.5.3",
      uptime: "45 days, 03:22:15",
      varbinds: [
        { oid: "1.3.6.1.2.1.2.2.1.1.24", type: "Integer", value: "24" },
        { oid: "1.3.6.1.2.1.2.2.1.2.24", type: "OctetString", value: "GigabitEthernet1/0/24" },
        { oid: "1.3.6.1.2.1.2.2.1.7.24", type: "Integer", value: "1 (up)" },
        { oid: "1.3.6.1.2.1.2.2.1.8.24", type: "Integer", value: "2 (down)" }
      ],
      severity: "Critical",
      description: "Trap linkDown: El puerto GigabitEthernet1/0/24 del switch core ha perdido señal de portadora óptica/eléctrica"
    },
    {
      id: "trap-seed-2",
      timestamp: new Date(now - 60000).toISOString(),
      sourceIp: "192.168.1.10",
      trapType: "coldStart",
      enterpriseOid: "1.3.6.1.6.3.1.1.5.1",
      uptime: "00:00:12",
      varbinds: [
        { oid: "1.3.6.1.2.1.1.1.0", type: "OctetString", value: "Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M)" }
      ],
      severity: "Warning",
      description: "Trap coldStart: El conmutador 192.168.1.10 ha completado un reinicio en frío por corte de energía o comando reload"
    }
  ];
  saveEvents();
}

loadStoredEvents();

/**
 * Parses RFC 3164 and RFC 5424 Syslog strings
 */
export function parseSyslogMessage(rawText: string, remoteIp: string): SyslogEvent {
  let pri = 13; // default user.notice
  let content = rawText.trim();

  // Extract <PRI>
  const priMatch = content.match(/^<(\d{1,3})>/);
  if (priMatch) {
    pri = parseInt(priMatch[1], 10);
    content = content.substring(priMatch[0].length).trim();
  }

  const facilityCode = Math.floor(pri / 8);
  const severityCode = pri % 8;
  const facility = FACILITY_NAMES[facilityCode] || `local${facilityCode}`;
  const severity = SEVERITY_NAMES[severityCode] || 'Notice';

  // Parse tag/process and message
  let tag = 'system';
  let message = content;
  let hostname = remoteIp;

  const rfc3164Match = content.match(/^([A-Za-z]{3}\s+\d+\s+[\d:]+)\s+([^\s:]+)\s+([^:]+):\s+(.*)$/);
  if (rfc3164Match) {
    hostname = rfc3164Match[2];
    tag = rfc3164Match[3];
    message = rfc3164Match[4];
  } else {
    // Basic tag split
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30) {
      tag = content.substring(0, colonIdx).trim();
      message = content.substring(colonIdx + 1).trim();
    }
  }

  const event: SyslogEvent = {
    id: `syslog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    sourceIp: remoteIp,
    hostname,
    facility,
    facilityCode,
    severity,
    severityCode,
    tag,
    message,
    raw: rawText
  };

  syslogBuffer.unshift(event);
  if (syslogBuffer.length > 500) syslogBuffer.pop();
  saveEvents();
  return event;
}

export function recordTrapEvent(trap: Omit<SnmpTrapEvent, 'id' | 'timestamp'>): SnmpTrapEvent {
  const fullTrap: SnmpTrapEvent = {
    ...trap,
    id: `trap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };

  trapBuffer.unshift(fullTrap);
  if (trapBuffer.length > 300) trapBuffer.pop();
  saveEvents();
  return fullTrap;
}

export function getSyslogEvents(): SyslogEvent[] {
  return syslogBuffer;
}

export function getTrapEvents(): SnmpTrapEvent[] {
  return trapBuffer;
}

export function clearSyslogEvents(): void {
  syslogBuffer = [];
  saveEvents();
}

export function clearTrapEvents(): void {
  trapBuffer = [];
  saveEvents();
}

// UDP Socket listener for Syslog (Port 10514 or configurable)
let syslogSocket: dgram.Socket | null = null;
let trapSocket: dgram.Socket | null = null;

export function startSyslogServer(port = 10514): Promise<boolean> {
  return new Promise((resolve) => {
    if (syslogSocket) {
      return resolve(true);
    }
    try {
      const server = dgram.createSocket('udp4');
      server.on('error', (err) => {
        console.warn(`Syslog UDP socket en puerto ${port} reportó:`, err.message);
        try { server.close(); } catch {}
        syslogSocket = null;
        resolve(false);
      });

      server.on('message', (msg, rinfo) => {
        const raw = msg.toString('utf8');
        parseSyslogMessage(raw, rinfo.address);
      });

      server.bind(port, '0.0.0.0', () => {
        console.log(`📡 Receptor Syslog UDP activo escuchando en 0.0.0.0:${port}`);
        syslogSocket = server;
        resolve(true);
      });
    } catch (err: any) {
      console.warn("No se pudo iniciar socket UDP Syslog:", err.message);
      resolve(false);
    }
  });
}

export function startTrapServer(port = 10162): Promise<boolean> {
  return new Promise((resolve) => {
    if (trapSocket) {
      return resolve(true);
    }
    try {
      const server = dgram.createSocket('udp4');
      server.on('error', (err) => {
        console.warn(`SNMP Trap UDP socket en puerto ${port} reportó:`, err.message);
        try { server.close(); } catch {}
        trapSocket = null;
        resolve(false);
      });

      server.on('message', (msg, rinfo) => {
        // Basic notification packet recorded
        recordTrapEvent({
          sourceIp: rinfo.address,
          trapType: 'enterpriseSpecific',
          enterpriseOid: '1.3.6.1.4.1.9.9',
          uptime: 'In-Service',
          varbinds: [{ oid: 'raw.packet.size', type: 'bytes', value: `${msg.length} octets` }],
          severity: 'Warning',
          description: `Paquete SNMP Trap UDP recibido (${msg.length} bytes) desde ${rinfo.address}`
        });
      });

      server.bind(port, '0.0.0.0', () => {
        console.log(`📡 Receptor SNMP Traps UDP activo escuchando en 0.0.0.0:${port}`);
        trapSocket = server;
        resolve(true);
      });
    } catch (err: any) {
      console.warn("No se pudo iniciar socket UDP Traps:", err.message);
      resolve(false);
    }
  });
}
