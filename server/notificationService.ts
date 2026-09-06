import fs from "fs";
import path from "path";
import os from "os";
import { isDeviceSilenced } from "./maintenanceService";

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'telegram' | 'discord' | 'slack' | 'teams' | 'webhook';
  enabled: boolean;
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  customHeaders?: Record<string, string>;
  triggers: {
    onDeviceDown: boolean;
    onDeviceRecovered: boolean;
    onHighLatency: boolean;
    onNewDevice: boolean;
    onSnmpThreshold: boolean;
  };
}

export interface AlertPayload {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  eventType?: 'device_down' | 'device_up' | 'high_latency' | 'new_device' | 'snmp_alert' | 'syslog_alert' | 'trap_alert' | 'ssl_alert' | 'rogue_alert' | 'test';
  deviceIp?: string;
  deviceHost?: string;
  metric?: string;
  value?: string | number;
  location?: string;
  timestamp?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  channelId: string;
  channelName: string;
  channelType: string;
  title: string;
  severity: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

// Locate storage file
let NOTIFICATIONS_FILE = path.join(process.cwd(), "notifications-config.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  NOTIFICATIONS_FILE = path.join(configDir, "notifications-config.json");
}

let deliveryHistory: NotificationDeliveryLog[] = [];
const cooldownMap = new Map<string, number>();

/**
 * Load configured channels from disk
 */
export function getNotificationChannels(): NotificationChannel[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading notification channels:", e);
  }

  // Initial sample channel (disabled by default until user configures token/webhook)
  const defaultChannels: NotificationChannel[] = [
    {
      id: "chan-telegram-default",
      name: "Bot Telegram NOC",
      type: "telegram",
      enabled: false,
      telegramBotToken: "",
      telegramChatId: "",
      triggers: {
        onDeviceDown: true,
        onDeviceRecovered: true,
        onHighLatency: true,
        onNewDevice: true,
        onSnmpThreshold: true
      }
    },
    {
      id: "chan-discord-default",
      name: "Discord Webhook Alertas",
      type: "discord",
      enabled: false,
      webhookUrl: "",
      triggers: {
        onDeviceDown: true,
        onDeviceRecovered: true,
        onHighLatency: false,
        onNewDevice: true,
        onSnmpThreshold: true
      }
    },
    {
      id: "chan-webhook-default",
      name: "Webhook REST Empresarial",
      type: "webhook",
      enabled: false,
      webhookUrl: "",
      triggers: {
        onDeviceDown: true,
        onDeviceRecovered: true,
        onHighLatency: true,
        onNewDevice: true,
        onSnmpThreshold: true
      }
    }
  ];

  saveNotificationChannels(defaultChannels);
  return defaultChannels;
}

/**
 * Persist channels to disk
 */
export function saveNotificationChannels(channels: NotificationChannel[]): void {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(channels, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving notification channels:", e);
  }
}

/**
 * Get in-memory delivery log
 */
export function getDeliveryHistory(): NotificationDeliveryLog[] {
  return deliveryHistory.slice(0, 50);
}

/**
 * Clear delivery log
 */
export function clearDeliveryHistory(): void {
  deliveryHistory = [];
}

/**
 * Format message for Telegram with Markdown
 */
function formatTelegramMessage(alert: AlertPayload): string {
  const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : alert.severity === 'success' ? '🟢' : 'ℹ️';
  const time = alert.timestamp || new Date().toLocaleTimeString('es-ES');
  
  let msg = `${icon} *RedMonitor PRO | ${alert.title}*\n\n`;
  msg += `📝 *Detalle:* ${alert.message}\n`;
  if (alert.deviceIp) msg += `🌐 *IP:* \`${alert.deviceIp}\`\n`;
  if (alert.deviceHost && alert.deviceHost !== '—') msg += `💻 *Host:* ${alert.deviceHost}\n`;
  if (alert.metric && alert.value !== undefined) msg += `📊 *${alert.metric}:* ${alert.value}\n`;
  if (alert.location) msg += `📍 *Ubicación:* ${alert.location}\n`;
  msg += `⏱ *Hora:* ${time}\n`;
  msg += `\n_Alerta automática emitida por RedMonitor Engine._`;
  return msg;
}

/**
 * Send alert payload to a specific channel
 */
export async function sendToChannel(channel: NotificationChannel, alert: AlertPayload): Promise<NotificationDeliveryLog> {
  const logEntry: NotificationDeliveryLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type,
    title: alert.title,
    severity: alert.severity,
    success: false,
    timestamp: new Date().toISOString()
  };

  try {
    if (channel.type === 'telegram') {
      if (!channel.telegramBotToken || !channel.telegramChatId) {
        throw new Error("Falta configurar el Token del Bot o el Chat ID de Telegram.");
      }
      const text = formatTelegramMessage(alert);
      const url = `https://api.telegram.org/bot${channel.telegramBotToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel.telegramChatId,
          text,
          parse_mode: "Markdown"
        })
      });

      const resData = await response.json() as any;
      logEntry.statusCode = response.status;
      if (!response.ok || !resData.ok) {
        throw new Error(resData?.description || `Error HTTP ${response.status}`);
      }
      logEntry.success = true;

    } else if (channel.type === 'discord') {
      if (!channel.webhookUrl) {
        throw new Error("Falta la URL del Webhook de Discord.");
      }
      const color = alert.severity === 'critical' ? 0xef4444 : alert.severity === 'warning' ? 0xf59e0b : alert.severity === 'success' ? 0x10b981 : 0x06b6d4;
      
      const fields = [];
      if (alert.deviceIp) fields.push({ name: "Dirección IP", value: alert.deviceIp, inline: true });
      if (alert.deviceHost) fields.push({ name: "Host / Equipo", value: alert.deviceHost, inline: true });
      if (alert.metric && alert.value !== undefined) fields.push({ name: alert.metric, value: String(alert.value), inline: true });
      if (alert.location) fields.push({ name: "Sede / Ubicación", value: alert.location, inline: true });

      const body = {
        username: "RedMonitor PRO",
        avatar_url: "https://img.icons8.com/color/512/broadcasting.png",
        embeds: [
          {
            title: `🔔 ${alert.title}`,
            description: alert.message,
            color,
            fields,
            footer: { text: "RedMonitor Network Telemetry & Security" },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      logEntry.statusCode = response.status;
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} en Discord Webhook`);
      }
      logEntry.success = true;

    } else if (channel.type === 'slack') {
      if (!channel.webhookUrl) {
        throw new Error("Falta la URL del Webhook de Slack.");
      }
      const color = alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#10b981';
      const body = {
        text: `*RedMonitor PRO:* ${alert.title}\n${alert.message}`,
        attachments: [
          {
            color,
            fields: [
              alert.deviceIp ? { title: "IP", value: alert.deviceIp, short: true } : null,
              alert.deviceHost ? { title: "Host", value: alert.deviceHost, short: true } : null,
              alert.metric ? { title: alert.metric, value: String(alert.value), short: true } : null
            ].filter(Boolean)
          }
        ]
      };

      const response = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      logEntry.statusCode = response.status;
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} en Slack`);
      }
      logEntry.success = true;

    } else if (channel.type === 'teams') {
      if (!channel.webhookUrl) {
        throw new Error("Falta la URL del Webhook de Microsoft Teams.");
      }
      const themeColor = alert.severity === 'critical' ? 'EF4444' : alert.severity === 'warning' ? 'F59E0B' : '10B981';
      const body = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": themeColor,
        "summary": alert.title,
        "sections": [{
          "activityTitle": `RedMonitor: ${alert.title}`,
          "activitySubtitle": alert.message,
          "facts": [
            { "name": "IP", "value": alert.deviceIp || "N/A" },
            { "name": "Host", "value": alert.deviceHost || "N/A" },
            { "name": "Severidad", "value": alert.severity.toUpperCase() },
            { "name": "Fecha", "value": new Date().toLocaleString('es-ES') }
          ],
          "markdown": true
        }]
      };

      const response = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      logEntry.statusCode = response.status;
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} en Teams`);
      }
      logEntry.success = true;

    } else if (channel.type === 'webhook') {
      if (!channel.webhookUrl) {
        throw new Error("Falta la URL del Webhook HTTP.");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "RedMonitor-Notifier/1.0",
        ...(channel.customHeaders || {})
      };

      const response = await fetch(channel.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          app: "RedMonitor PRO",
          event: alert.eventType || "alert",
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          data: {
            ip: alert.deviceIp,
            host: alert.deviceHost,
            metric: alert.metric,
            value: alert.value,
            location: alert.location
          },
          timestamp: new Date().toISOString()
        })
      });

      logEntry.statusCode = response.status;
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status} en Webhook`);
      }
      logEntry.success = true;
    }
  } catch (err: any) {
    logEntry.success = false;
    logEntry.error = err.message || String(err);
  }

  // Prepend to history
  deliveryHistory.unshift(logEntry);
  if (deliveryHistory.length > 60) deliveryHistory.pop();

  return logEntry;
}

/**
 * Dispatch alert to all matching active channels with anti-flood cooldown
 */
export async function dispatchAlertToAllChannels(alert: AlertPayload): Promise<NotificationDeliveryLog[]> {
  // Check maintenance windows and quick mute suppression (except for manual test events)
  if (alert.eventType !== 'test' && alert.deviceIp) {
    const silenceCheck = isDeviceSilenced(alert.deviceIp);
    if (silenceCheck.silenced) {
      console.log(`🔕 Alerta para ${alert.deviceIp} suprimida por mantenimiento: ${silenceCheck.source} (${silenceCheck.reason})`);
      return [];
    }
  }

  // Anti-flood: key based on IP + eventType
  if (alert.deviceIp && alert.eventType) {
    const key = `${alert.deviceIp}:${alert.eventType}`;
    const now = Date.now();
    const lastSent = cooldownMap.get(key) || 0;
    if (now - lastSent < 45000) {
      // Within 45 seconds cooldown window for same host + event
      return [];
    }
    cooldownMap.set(key, now);
  }

  const channels = getNotificationChannels().filter(c => c.enabled);
  const results: NotificationDeliveryLog[] = [];

  for (const channel of channels) {
    // Check triggers
    let shouldSend = false;
    if (alert.eventType === 'test') shouldSend = true;
    else if (alert.eventType === 'device_down' && channel.triggers.onDeviceDown) shouldSend = true;
    else if (alert.eventType === 'device_up' && channel.triggers.onDeviceRecovered) shouldSend = true;
    else if (alert.eventType === 'high_latency' && channel.triggers.onHighLatency) shouldSend = true;
    else if (alert.eventType === 'new_device' && channel.triggers.onNewDevice) shouldSend = true;
    else if (alert.eventType === 'snmp_alert' && channel.triggers.onSnmpThreshold) shouldSend = true;
    else if (alert.eventType === 'syslog_alert' || alert.eventType === 'trap_alert' || alert.eventType === 'ssl_alert' || alert.eventType === 'rogue_alert') {
      shouldSend = alert.severity === 'critical';
    }

    if (shouldSend) {
      const log = await sendToChannel(channel, alert);
      results.push(log);
    }
  }

  return results;
}
