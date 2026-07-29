import { Device } from '../types';

/**
 * Determines whether a device has a Web Configuration Interface (HTTP/HTTPS)
 * and returns its Web Admin URL (e.g., "http://192.168.1.1").
 */
export function isWebConfigurableDevice(device: Partial<Device>): boolean {
  if (!device || !device.ip || device.ip === '—') return false;

  const ipSuffix = device.ip.split('.').pop();
  if (ipSuffix === '1' || ipSuffix === '254') return true;

  const hostLower = (device.host || '').toLowerCase();
  const vendorLower = (device.vendor || '').toLowerCase();

  const webKeywords = [
    'router', 'gateway', 'modem', 'ont', 'openwrt', 'luci',
    'hikvision', 'dahua', 'ezviz', 'axis', 'nvr', 'cctv', 'camara', 'cámara',
    'synology', 'nas', 'backup', 'hp', 'laserjet', 'printer', 'impresora',
    'pi-hole', 'pihole', 'home assistant', 'hass', 'octoprint', 'node-red',
    'docker', 'nginx', 'apache', 'web', 'grafana', 'ubiquiti', 'unifi',
    'zyxel', 'espressif', 'esp32', 'smart tv', 'tv'
  ];

  if (webKeywords.some(kw => hostLower.includes(kw) || vendorLower.includes(kw))) {
    return true;
  }

  if (device.sensorHttp || (device as any).portsScanned?.some((p: any) => p.port === 80 || p.port === 443 || p.port === 8080 || p.port === 8443)) {
    return true;
  }

  // General heuristic: IPs .10, .11, .15, .38, .40, .55, .81, .82, .102, .200 in standard subnets
  if (['10', '11', '12', '13', '15', '38', '40', '55', '60', '61', '81', '82', '102', '200'].includes(ipSuffix || '')) {
    return true;
  }

  return false;
}

export function getWebConfigUrl(ip: string, isHttps = false): string {
  const cleanIp = ip.trim();
  return isHttps ? `https://${cleanIp}` : `http://${cleanIp}`;
}

export function openDeviceWebInterface(ip: string, isHttps = false) {
  const url = getWebConfigUrl(ip, isHttps);
  window.open(url, '_blank', 'noopener,noreferrer');
}
