import fs from "fs";
import path from "path";
import os from "os";

export interface MaintenanceWindow {
  id: string;
  name: string;
  targetType: 'global' | 'device' | 'subnet';
  targetValue: string; // IP, Subnet (e.g. '192.168.1.0/24') or '*'
  startTime: string;   // ISO String
  endTime: string;     // ISO String
  active: boolean;
  reason: string;
  createdBy: string;
  suppressNotifications: boolean;
}

export interface QuickMute {
  ip: string;
  hostName?: string;
  mutedUntil: string; // ISO String
  reason: string;
}

// Storage setup
let MAINTENANCE_FILE = path.join(process.cwd(), "maintenance-windows.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  MAINTENANCE_FILE = path.join(configDir, "maintenance-windows.json");
}

interface MaintenanceData {
  windows: MaintenanceWindow[];
  quickMutes: QuickMute[];
}

function loadData(): MaintenanceData {
  if (!fs.existsSync(MAINTENANCE_FILE)) {
    const defaultData: MaintenanceData = {
      windows: [
        {
          id: "win-demo-01",
          name: "Mantenimiento Programado Semanal Core Switches",
          targetType: "subnet",
          targetValue: "192.168.1.0/24",
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
          active: false,
          reason: "Actualización de firmware de conmutadores de distribución y reinicio de fuentes redundantes",
          createdBy: "Admin RedMonitor",
          suppressNotifications: true
        }
      ],
      quickMutes: []
    };
    try {
      fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    } catch {}
    return defaultData;
  }
  try {
    const content = fs.readFileSync(MAINTENANCE_FILE, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error leyendo maintenance-windows.json:", err);
    return { windows: [], quickMutes: [] };
  }
}

function saveData(data: MaintenanceData): void {
  try {
    fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando maintenance-windows.json:", err);
  }
}

export function getMaintenanceWindows(): MaintenanceWindow[] {
  return loadData().windows;
}

export function saveMaintenanceWindow(win: MaintenanceWindow): MaintenanceWindow[] {
  const data = loadData();
  const index = data.windows.findIndex(w => w.id === win.id);
  if (index >= 0) {
    data.windows[index] = win;
  } else {
    data.windows.unshift(win);
  }
  saveData(data);
  return data.windows;
}

export function deleteMaintenanceWindow(id: string): MaintenanceWindow[] {
  const data = loadData();
  data.windows = data.windows.filter(w => w.id !== id);
  saveData(data);
  return data.windows;
}

export function getQuickMutes(): QuickMute[] {
  const data = loadData();
  const now = Date.now();
  // Filter expired mutes
  const activeMutes = data.quickMutes.filter(m => new Date(m.mutedUntil).getTime() > now);
  if (activeMutes.length !== data.quickMutes.length) {
    data.quickMutes = activeMutes;
    saveData(data);
  }
  return activeMutes;
}

export function setQuickMute(ip: string, durationMinutes: number, reason: string, hostName?: string): QuickMute[] {
  const data = loadData();
  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  
  data.quickMutes = data.quickMutes.filter(m => m.ip !== ip);
  if (durationMinutes > 0) {
    data.quickMutes.push({
      ip,
      hostName,
      mutedUntil,
      reason: reason || "Silenciamiento temporal rápido por operador"
    });
  }
  saveData(data);
  return data.quickMutes;
}

export function removeQuickMute(ip: string): QuickMute[] {
  const data = loadData();
  data.quickMutes = data.quickMutes.filter(m => m.ip !== ip);
  saveData(data);
  return data.quickMutes;
}

/**
 * Checks if a device is currently suppressed from receiving alerts
 */
export function isDeviceSilenced(deviceIp?: string): { silenced: boolean; reason?: string; source?: string } {
  if (!deviceIp) return { silenced: false };
  const now = new Date();
  const nowTime = now.getTime();

  // 1. Check quick mute
  const mutes = getQuickMutes();
  const matchedMute = mutes.find(m => m.ip === deviceIp);
  if (matchedMute && new Date(matchedMute.mutedUntil).getTime() > nowTime) {
    return {
      silenced: true,
      reason: matchedMute.reason,
      source: `Silenciado rápido hasta ${new Date(matchedMute.mutedUntil).toLocaleTimeString()}`
    };
  }

  // 2. Check active maintenance windows
  const windows = getMaintenanceWindows().filter(w => w.active && w.suppressNotifications);
  for (const win of windows) {
    const start = new Date(win.startTime).getTime();
    const end = new Date(win.endTime).getTime();
    if (nowTime >= start && nowTime <= end) {
      if (win.targetType === 'global' || win.targetValue === '*') {
        return { silenced: true, reason: win.reason, source: `Ventana Global: ${win.name}` };
      }
      if (win.targetType === 'device' && win.targetValue === deviceIp) {
        return { silenced: true, reason: win.reason, source: `Ventana de Equipo: ${win.name}` };
      }
      if (win.targetType === 'subnet') {
        const prefix = win.targetValue.split('/')[0].split('.').slice(0, 3).join('.');
        if (deviceIp.startsWith(prefix)) {
          return { silenced: true, reason: win.reason, source: `Ventana de Subred: ${win.name}` };
        }
      }
    }
  }

  return { silenced: false };
}
