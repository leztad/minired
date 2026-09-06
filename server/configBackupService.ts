import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

export interface ConfigRevision {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  sha256: string;
  lineCount: number;
  configText: string;
  changeSummary: string;
}

export interface SwitchBackupDevice {
  id: string;
  name: string;
  ip: string;
  vendor: 'Cisco' | 'MikroTik' | 'Ubiquiti' | 'Aruba' | 'Fortinet' | 'Generic';
  model: string;
  location: string;
  lastBackupDate: string;
  revisions: ConfigRevision[];
}

export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface ConfigDiffResult {
  deviceA: string;
  revisionA: string;
  revisionB: string;
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  identical: boolean;
}

// Storage
let CONFIGS_FILE = path.join(process.cwd(), "switch-configs.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  CONFIGS_FILE = path.join(configDir, "switch-configs.json");
}

function calculateSha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function loadBackupDevices(): SwitchBackupDevice[] {
  if (!fs.existsSync(CONFIGS_FILE)) {
    const sampleCiscoConfigV1 = `! Current Configuration -- Cisco IOS Software, C2960X
! Last configuration change at 10:14:02 UTC Mon Aug 25 2026 by admin
version 15.2
no service pad
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname SW-CORE-CATALYST-01
!
boot-start-marker
boot-end-marker
!
enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
username netadmin privilege 15 secret 5 $1$d75g$9V.uX983K.rL1Z59p6L8X/
!
vlan 10
 name SERVIDORES_DATACENTER
!
vlan 20
 name USUARIOS_LAN_PISO1
!
vlan 30
 name TELEFONIA_VOIP
!
vlan 99
 name GESTION_ADMINISTRATIVA
!
interface GigabitEthernet1/0/1
 description UPLINK-HACIA-FIREWALL-FORTINET
 switchport trunk allowed vlan 10,20,30,99
 switchport mode trunk
!
interface GigabitEthernet1/0/2
 description ENLACE-SERVIDOR-AD-01
 switchport access vlan 10
 switchport mode access
 spanning-tree portfast
!
interface GigabitEthernet1/0/3
 description IMPRESORA-CENTRAL-RED
 switchport access vlan 20
 switchport mode access
!
interface Vlan99
 ip address 192.168.1.2 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.1.1
!
snmp-server community public RO
snmp-server community private RW
snmp-server location Datacenter-Rack-A
snmp-server contact admin@empresa.lan
!
end`;

    const sampleCiscoConfigV2 = `! Current Configuration -- Cisco IOS Software, C2960X
! Last configuration change at 14:22:18 UTC Fri Sep 05 2026 by azapata
version 15.2
no service pad
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname SW-CORE-CATALYST-01
!
boot-start-marker
boot-end-marker
!
enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
username netadmin privilege 15 secret 5 $1$d75g$9V.uX983K.rL1Z59p6L8X/
username auditor privilege 5 secret 5 $1$z78q$1B.sY342M.kK2W88q7M9Y/
!
vlan 10
 name SERVIDORES_DATACENTER
!
vlan 20
 name USUARIOS_LAN_PISO1
!
vlan 30
 name TELEFONIA_VOIP
!
vlan 40
 name CAMARAS_CCTV_SEGURIDAD
!
vlan 99
 name GESTION_ADMINISTRATIVA
!
interface GigabitEthernet1/0/1
 description UPLINK-HACIA-FIREWALL-FORTINET
 switchport trunk allowed vlan 10,20,30,40,99
 switchport mode trunk
!
interface GigabitEthernet1/0/2
 description ENLACE-SERVIDOR-AD-01
 switchport access vlan 10
 switchport mode access
 spanning-tree portfast
!
interface GigabitEthernet1/0/3
 description CAMARA-DOMO-ACCESO-PRINCIPAL
 switchport access vlan 40
 switchport mode access
 power inline auto
!
interface Vlan99
 ip address 192.168.1.2 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.1.1
!
snmp-server group SECGROUP v3 priv
snmp-server user secadmin SECGROUP v3 auth sha MyAuthPass123 priv aes 128 MyPrivPass123
snmp-server location Datacenter-Rack-A
snmp-server contact admin@empresa.lan
!
end`;

    const defaults: SwitchBackupDevice[] = [
      {
        id: "switch-cisco-core",
        name: "SW-CORE-CATALYST-01",
        ip: "192.168.1.2",
        vendor: "Cisco",
        model: "Catalyst WS-C2960X-48TD-L",
        location: "Rack Principal - Datacenter",
        lastBackupDate: new Date(Date.now() - 86400000).toISOString(),
        revisions: [
          {
            id: "rev-cisco-v2",
            version: "v1.1 (Actual)",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            author: "Asneider Zapata (Admin TI)",
            sha256: calculateSha256(sampleCiscoConfigV2),
            lineCount: sampleCiscoConfigV2.split('\n').length,
            configText: sampleCiscoConfigV2,
            changeSummary: "Adición de VLAN 40 (CCTV), configuración de puerto PoE y activación de SNMPv3 AuthPriv seguro."
          },
          {
            id: "rev-cisco-v1",
            version: "v1.0 (Línea Base)",
            timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
            author: "Instalador de Fábrica",
            sha256: calculateSha256(sampleCiscoConfigV1),
            lineCount: sampleCiscoConfigV1.split('\n').length,
            configText: sampleCiscoConfigV1,
            changeSummary: "Configuración inicial de puesta en marcha del switch de núcleo."
          }
        ]
      }
    ];

    try {
      fs.writeFileSync(CONFIGS_FILE, JSON.stringify(defaults, null, 2), "utf8");
    } catch {}
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveBackupDevices(devices: SwitchBackupDevice[]): void {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(devices, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando switch-configs.json:", err);
  }
}

export function getSwitchBackupDevices(): SwitchBackupDevice[] {
  return loadBackupDevices();
}

export function addConfigRevision(
  deviceId: string,
  configText: string,
  author: string,
  changeSummary: string,
  versionLabel?: string
): SwitchBackupDevice[] {
  const devices = loadBackupDevices();
  const device = devices.find(d => d.id === deviceId);
  if (!device) {
    throw new Error(`Dispositivo con ID ${deviceId} no encontrado.`);
  }

  const lines = configText.trim().split('\n');
  const sha = calculateSha256(configText);
  const revCount = device.revisions.length + 1;
  const version = versionLabel || `v1.${revCount - 1}`;

  const newRev: ConfigRevision = {
    id: `rev-${Date.now()}`,
    version,
    timestamp: new Date().toISOString(),
    author: author || "Admin RedMonitor",
    sha256: sha,
    lineCount: lines.length,
    configText,
    changeSummary: changeSummary || "Respaldo periódico manual de running-config"
  };

  device.revisions.unshift(newRev);
  device.lastBackupDate = newRev.timestamp;
  saveBackupDevices(devices);
  return devices;
}

export function registerSwitchDevice(device: Omit<SwitchBackupDevice, 'revisions' | 'lastBackupDate'>, initialConfig?: string): SwitchBackupDevice[] {
  const devices = loadBackupDevices();
  const existingIndex = devices.findIndex(d => d.id === device.id || d.ip === device.ip);

  const initialRev: ConfigRevision = {
    id: `rev-init-${Date.now()}`,
    version: "v1.0 (Inicial)",
    timestamp: new Date().toISOString(),
    author: "Admin RedMonitor",
    sha256: calculateSha256(initialConfig || `# Backup ${device.name}\n`),
    lineCount: (initialConfig || "").split('\n').length,
    configText: initialConfig || `# Running-config para ${device.name}\n# IP: ${device.ip}\n`,
    changeSummary: "Registro inicial en el repositorio de respaldos"
  };

  const newDevice: SwitchBackupDevice = {
    ...device,
    lastBackupDate: initialRev.timestamp,
    revisions: [initialRev]
  };

  if (existingIndex >= 0) {
    devices[existingIndex] = { ...devices[existingIndex], ...device };
  } else {
    devices.push(newDevice);
  }
  saveBackupDevices(devices);
  return devices;
}

/**
 * Compare two text configurations line by line (LCS Diff)
 */
export function computeConfigDiff(oldText: string, newText: string): ConfigDiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diffLines: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];

    if (oldIdx < oldLines.length && newIdx < newLines.length && oldLine === newLine) {
      diffLines.push({
        type: 'same',
        oldLineNumber: oldIdx + 1,
        newLineNumber: newIdx + 1,
        content: oldLine
      });
      oldIdx++;
      newIdx++;
    } else if (newIdx < newLines.length && !oldLines.slice(oldIdx, oldIdx + 5).includes(newLine)) {
      // Line added in new version
      diffLines.push({
        type: 'added',
        newLineNumber: newIdx + 1,
        content: newLine
      });
      addedCount++;
      newIdx++;
    } else if (oldIdx < oldLines.length && !newLines.slice(newIdx, newIdx + 5).includes(oldLine)) {
      // Line removed in old version
      diffLines.push({
        type: 'removed',
        oldLineNumber: oldIdx + 1,
        content: oldLine
      });
      removedCount++;
      oldIdx++;
    } else {
      // Small variation or mismatch
      if (oldIdx < oldLines.length) {
        diffLines.push({
          type: 'removed',
          oldLineNumber: oldIdx + 1,
          content: oldLines[oldIdx]
        });
        removedCount++;
        oldIdx++;
      }
      if (newIdx < newLines.length) {
        diffLines.push({
          type: 'added',
          newLineNumber: newIdx + 1,
          content: newLines[newIdx]
        });
        addedCount++;
        newIdx++;
      }
    }
  }

  return {
    deviceA: "Versión Base",
    revisionA: "Versión Anterior",
    revisionB: "Versión Nueva",
    lines: diffLines,
    addedCount,
    removedCount,
    identical: addedCount === 0 && removedCount === 0
  };
}
