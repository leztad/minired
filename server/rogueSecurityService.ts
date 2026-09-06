import fs from "fs";
import path from "path";
import os from "os";

export interface ApprovedDevice {
  mac: string;
  hostName: string;
  assignedIp?: string;
  department: string;
  owner: string;
  deviceType: string;
  authorizedAt: string;
  authorizedBy: string;
  notes?: string;
}

export interface RogueFinding {
  mac: string;
  ip: string;
  hostName: string;
  vendor?: string;
  firstSeen: string;
  status: 'unauthorized_rogue' | 'ip_conflict' | 'arp_spoof_suspect' | 'gateway_impersonator';
  severity: 'Critical' | 'Warning' | 'Info';
  details: string;
}

export interface ArpConflictAlert {
  ip: string;
  conflictingMacs: string[];
  hostNames: string[];
  detectedAt: string;
  isGatewayInvolved: boolean;
  actionTaken: string;
}

// Storage
let APPROVED_FILE = path.join(process.cwd(), "approved-devices.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  APPROVED_FILE = path.join(configDir, "approved-devices.json");
}

function loadApprovedDevices(): ApprovedDevice[] {
  if (!fs.existsSync(APPROVED_FILE)) {
    const defaults: ApprovedDevice[] = [
      {
        mac: "00:1A:2B:3C:4D:5E",
        hostName: "GATEWAY-ROUTER-CORE",
        assignedIp: "192.168.1.1",
        department: "Infraestructura TI",
        owner: "Admin Red",
        deviceType: "Router",
        authorizedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        authorizedBy: "Admin Sistema"
      },
      {
        mac: "70:81:05:AA:BB:CC",
        hostName: "SW-CISCO-CATALYST-2960",
        assignedIp: "192.168.1.2",
        department: "Datacenter",
        owner: "Comunicaciones",
        deviceType: "Switch",
        authorizedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
        authorizedBy: "Admin Sistema"
      },
      {
        mac: "B8:27:EB:11:22:33",
        hostName: "SRV-ACTIVE-DIRECTORY",
        assignedIp: "192.168.1.10",
        department: "Sistemas Centrales",
        owner: "SysAdmin",
        deviceType: "Server",
        authorizedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        authorizedBy: "Admin Sistema"
      }
    ];
    try {
      fs.writeFileSync(APPROVED_FILE, JSON.stringify(defaults, null, 2), "utf8");
    } catch {}
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(APPROVED_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveApprovedDevices(devices: ApprovedDevice[]): void {
  try {
    fs.writeFileSync(APPROVED_FILE, JSON.stringify(devices, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando approved-devices.json:", err);
  }
}

export function getApprovedDevices(): ApprovedDevice[] {
  return loadApprovedDevices();
}

export function addApprovedDevice(device: ApprovedDevice): ApprovedDevice[] {
  const devices = loadApprovedDevices();
  const normalizedMac = device.mac.trim().toUpperCase();
  const index = devices.findIndex(d => d.mac.toUpperCase() === normalizedMac);
  
  if (index >= 0) {
    devices[index] = { ...device, mac: normalizedMac };
  } else {
    devices.unshift({ ...device, mac: normalizedMac });
  }
  saveApprovedDevices(devices);
  return devices;
}

export function removeApprovedDevice(mac: string): ApprovedDevice[] {
  let devices = loadApprovedDevices();
  const normalizedMac = mac.trim().toUpperCase();
  devices = devices.filter(d => d.mac.toUpperCase() !== normalizedMac);
  saveApprovedDevices(devices);
  return devices;
}

/**
 * Scan active devices to find Rogues, IP/MAC conflicts and ARP anomalies
 */
export function analyzeRogueAndConflicts(
  activeDevices: Array<{ ip: string; mac: string; host: string; vendor?: string }>
): {
  rogueDevices: RogueFinding[];
  arpConflicts: ArpConflictAlert[];
  approvedCount: number;
  totalDevices: number;
} {
  const approvedList = loadApprovedDevices();
  const approvedMap = new Map<string, ApprovedDevice>();
  approvedList.forEach(a => approvedMap.set(a.mac.toUpperCase(), a));

  const rogueDevices: RogueFinding[] = [];
  const arpConflicts: ArpConflictAlert[] = [];

  // 1. Check rogue unauthorized devices
  activeDevices.forEach(d => {
    if (!d.mac || d.mac === '—' || d.mac === 'Desconocida') return;
    const cleanMac = d.mac.toUpperCase();

    if (!approvedMap.has(cleanMac)) {
      rogueDevices.push({
        mac: cleanMac,
        ip: d.ip,
        hostName: d.host !== '—' ? d.host : 'Host Desconocido',
        vendor: d.vendor,
        firstSeen: new Date().toISOString(),
        status: 'unauthorized_rogue',
        severity: 'Warning',
        details: `Dispositivo con dirección física ${cleanMac} detectado en el segmento LAN sin autorización en la Lista Blanca.`
      });
    }
  });

  // 2. Check IP Conflicts (same IP with multiple distinct MACs)
  const ipToMacs = new Map<string, Array<{ mac: string; host: string }>>();
  activeDevices.forEach(d => {
    if (!d.ip || !d.mac || d.mac === '—') return;
    const cleanMac = d.mac.toUpperCase();
    const existing = ipToMacs.get(d.ip) || [];
    if (!existing.some(e => e.mac === cleanMac)) {
      existing.push({ mac: cleanMac, host: d.host });
      ipToMacs.set(d.ip, existing);
    }
  });

  ipToMacs.forEach((macList, ip) => {
    if (macList.length > 1) {
      const isGateway = ip.endsWith('.1') || ip.endsWith('.254');
      arpConflicts.push({
        ip,
        conflictingMacs: macList.map(m => m.mac),
        hostNames: macList.map(m => m.host),
        detectedAt: new Date().toISOString(),
        isGatewayInvolved: isGateway,
        actionTaken: isGateway
          ? 'ALERTA CRÍTICA: Posible ataque Man-in-the-Middle o duplicación de IP de Gateway'
          : 'Alerta de conflicto de direccionamiento estático/DHCP'
      });
    }
  });

  return {
    rogueDevices,
    arpConflicts,
    approvedCount: approvedList.length,
    totalDevices: activeDevices.length
  };
}
