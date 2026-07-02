/**
 * Comprehensive utility to identify device brands/manufacturers based on MAC OUI rules
 * and hostname keywords as reliable fallbacks.
 */

// Precise database of common network vendors and consumer tech electronics
const OUI_DATABASE: Record<string, string> = {
  // Ubiquiti Networks / Intel etc.
  '84:C8:A0': 'Ubiquiti Networks',
  '44:D9:E7': 'Ubiquiti Networks',
  '18:E8:29': 'Ubiquiti Networks',
  '78:8A:20': 'Ubiquiti Networks',
  'FC:EC:DA': 'Ubiquiti Networks',
  'FC:2A:9C': 'Ubiquiti Networks',

  // Espressif (IoT modules, smart sensors)
  '00:1A:2B': 'Espressif Systems (IoT)',
  'EC:FA:BC': 'Espressif Systems (IoT)',
  '24:0A:64': 'Espressif Systems (IoT)',
  '30:AE:A4': 'Espressif Systems (IoT)',
  '4E:1A:87': 'Espressif Systems (IoT)',

  // Apple Inc.
  '7C:B0:C2': 'Apple Inc.',
  '90:72:40': 'Apple Inc.',
  '88:C2:23': 'Apple Inc.',
  'F0:18:98': 'Apple Inc.',
  '14:D4:37': 'Apple Inc.',
  '24:A0:74': 'Apple Inc.',
  '40:A3:CC': 'Apple Inc.',
  'D8:45:03': 'Apple Inc.',
  'B0:C5:54': 'Apple Inc.',
  'B4:18:D1': 'Apple Inc.',
  '7C:70:DB': 'Apple Inc.',
  '9C:F3:87': 'Apple Inc.',
  '8C:85:90': 'Apple Inc.',
  '00:25:00': 'Apple Inc.',
  '28:E1:4C': 'Apple Inc.',
  '74:10:4F': 'Apple Inc.',
  '88:66:5A': 'Apple Inc.',
  '18:34:51': 'Apple Inc.',

  // Sony Interactive Entertainment (PlayStation, BRAVIA TVs, etc.)
  'D4:E4:C4': 'Sony Interactive (PlayStation/TV)',
  'FE:33:DE': 'Sony Interactive (PlayStation/TV)',
  '00:1D:0D': 'Sony Interactive',
  '00:1F:A7': 'Sony Interactive',
  '00:24:8D': 'Sony Interactive',
  'F8:D0:AC': 'Sony Interactive',
  'CC:78:5F': 'Sony Interactive',
  'AC:EB:B4': 'Sony Interactive',
  'A4:FC:77': 'Sony Interactive',
  '9C:19:C2': 'Sony Interactive',
  '70:9E:29': 'Sony Interactive',
  '40:1B:5F': 'Sony Interactive',

  // Dahua Security Technology (IP Cameras, NVR recorders)
  'A4:12:3F': 'Dahua Technology (CCTV)',
  '00:0F:7C': 'Dahua Technology (CCTV)',
  '38:AF:29': 'Dahua Technology (CCTV)',
  'BC:32:AC': 'Dahua Technology (CCTV)',
  'E4:52:5D': 'Dahua Technology (CCTV)',
  '6C:11:FB': 'Dahua Technology (CCTV)',

  // Hikvision Digital Technology (IP Cameras, NVR/DVR security)
  '00:40:3F': 'Hikvision (CCTV)',
  'A0:40:A0': 'Hikvision (CCTV)',
  'E0:52:1D': 'Hikvision (CCTV)',
  'BC:14:85': 'Hikvision (CCTV)',
  '14:2F:FD': 'Hikvision (CCTV)',
  '48:EA:63': 'Hikvision (CCTV)',
  'D4:43:EB': 'EZVIZ (Hikvision CCTV IP)',
  'E0:E2:E6': 'EZVIZ (Hikvision CCTV IP)',

  // Axis Communications
  '00:40:8C': 'Axis Communications (IP Camera)',
  'AC:CC:8E': 'Axis Communications (IP Camera)',
  'D8:B5:C8': 'Axis Communications (IP Camera)',
  'E8:2A:44': 'Axis Communications (IP Camera)',

  // Reolink Digital
  '60:E3:27': 'Reolink Digital Technology',
  '90:E2:BA': 'Reolink Digital Technology',

  // Hanwha Vision (formerly Samsung Techwin) / Wisenet
  '00:16:6C': 'Hanwha Techwin (Wisenet CCTV)',
  '00:50:8D': 'Hanwha Techwin (Wisenet CCTV)',
  '00:00:F0': 'Samsung Techwin (Wisenet CCTV)',

  // Vivotek Inc.
  '00:02:D1': 'Vivotek Inc. (Network CCTV)',

  // Uniview (UNV)
  '00:1F:CA': 'Uniview Technologies (UNV)',
  '48:EA:64': 'Uniview Technologies (UNV)',

  // Amazon (Echo, Alexa, FireTV)
  'FC:A6:67': 'Amazon Technologies (Echo/Alexa)',
  'C4:4F:33': 'Amazon Technologies (Echo/Alexa)',
  'A0:D0:5B': 'Amazon Technologies (Echo/Alexa)',

  // Google / Nest Labs
  '00:1E:C5': 'Google Nest / Chromecast',
  '20:DF:B9': 'Google Nest / Chromecast',
  'F4:F5:D8': 'Google Inc.',
  '48:D6:D5': 'Google Inc.',
  'A4:77:33': 'Google Nest',

  // Samsung Electronics
  'EC:AA:23': 'Samsung Electronics',
  '94:9F:3E': 'Samsung Electronics',
  'A0:0B:BA': 'Samsung Electronics',
  'C0:BD:C8': 'Samsung Electronics',
  'E4:E0:C5': 'Samsung Electronics',
  'F4:7B:5E': 'Samsung Electronics',
  'AC:E0:10': 'Samsung Electronics',
  '3C:5A:37': 'Samsung Electronics',

  // Huawei Technologies
  '10:7B:44': 'Huawei Technologies',
  '2C:96:82': 'Huawei Technologies / ONT',

  // HP (Hewlett-Packard)
  '50:3E:AA': 'Hewlett-Packard (HP)',
  '3C:D9:2B': 'Hewlett-Packard (HP)',

  // Docker Virtual Network Bridge
  '02:42:AC': 'Docker Virtual Bridge',

  // Oracle (VirtualBox Virtual Machine)
  '08:00:27': 'Oracle Corporation (VirtualBox)',

  // Synology (NAS Storage Servers)
  '00:11:32': 'Synology Inc. (NAS Storage)',

  // Open vSwitch
  '00:00:00': 'Open vSwitch SDN Controller',

  // Motorola / Lenovo
  '2C:F0:EE': 'Motorola Mobility',

  // Intel Corporation (NICs, Mainboards)
  'A4:C5:12': 'Intel Corporation',
  '00:1F:3B': 'Intel Corporation',

  // Cisco / Linksys
  '00:22:6B': 'Cisco Systems (Catalyst)',
  '00:14:D1': 'Linksys Router',
  '00:1D:7E': 'Cisco Linksys AP',

  // TP-Link
  'D0:03:4B': 'TP-Link Technologies',
  'C0:25:E9': 'TP-Link Technologies',
  'E8:DE:27': 'TP-Link Technologies',
  'B0:4E:26': 'TP-Link Technologies',
  '74:DA:38': 'TP-Link Technologies',
  '00:14:78': 'TP-Link Technologies',

  // Xiaomi Communications
  '54:A7:2A': 'Xiaomi Communications',
  '64:90:C1': 'Xiaomi Communications',
  '8C:BE:BE': 'Xiaomi Communications',
  '98:FA:E3': 'Xiaomi Communications',
  'A4:50:46': 'Xiaomi Communications',
  'E4:47:90': 'Xiaomi Communications',
  '30:F7:72': 'Xiaomi Communications',
  '1C:99:4C': 'Xiaomi Communications',
  '28:6C:07': 'Xiaomi',
  '34:80:B3': 'Xiaomi',
  '3C:12:AA': 'Xiaomi',
  '50:04:B8': 'Xiaomi',
  '5C:E4:3B': 'Xiaomi',
  'AC:F1:DF': 'Xiaomi',
  'FC:E5:52': 'Xiaomi (Móvil)',

  // TP-Link
  'D8:47:3C': 'TP-Link Technologies',
  'D4:6E:0E': 'TP-Link Technologies',
  'BC:3C:D5': 'TP-Link Technologies',
  'A8:57:4E': 'TP-Link Technologies',
  '9C:A5:C5': 'TP-Link Technologies',
  '90:F6:52': 'TP-Link Technologies',
  '84:16:F9': 'TP-Link Technologies',
  '50:C7:BF': 'TP-Link Technologies',
  '40:16:9F': 'TP-Link Technologies',
  '3C:84:3D': 'TP-Link Technologies',
  '30:B5:C2': 'TP-Link Technologies',
  '18:A6:F7': 'TP-Link Technologies',
  '14:CF:92': 'TP-Link Technologies',
  '10:27:BE': 'TP-Link Technologies',
  '0C:80:63': 'TP-Link Technologies',
  '04:56:E5': 'TP-Link Technologies',

  // Netgear
  '00:09:5B': 'Netgear',
  '00:14:6C': 'Netgear',
  '00:18:4D': 'Netgear Router',
  '00:1F:33': 'Netgear Switch',
  '00:26:F2': 'Netgear ProSafe',
  '84:1B:5E': 'Netgear NightHawk',

  // D-Link
  '00:0D:88': 'D-Link Systems',
  '00:15:E9': 'D-Link Systems',
  '00:17:9A': 'D-Link Systems',
  '18:62:2C': 'D-Link Router',

  // Lenovo / Dell / Asus / HP Exts
  '00:12:FE': 'Lenovo Mobile',
  '00:15:58': 'Lenovo Workstation',
  '14:36:C6': 'Lenovo Laptop',
  '00:06:5B': 'Dell Inc.',
  '00:0F:1F': 'Dell Server',
  '18:03:73': 'Dell Workstation',
  '24:B6:FD': 'Dell Inc.',
  '08:60:6E': 'ASUSTek Computer (Asus)',
  '10:BF:48': 'ASUSTek Computer (Asus)',
  '54:A0:50': 'ASUSTek Computer (Asus)',
  '04:09:73': 'Hewlett-Packard (HP)',
  '30:85:A9': 'Hewlett-Packard (HP)',
  '74:27:EA': 'Hewlett-Packard (HP)',
  '80:C1:6E': 'Hewlett-Packard (HP)',
  '98:4B:4A': 'Hewlett-Packard (HP)',

  // Realtek
  '00:E0:4C': 'Realtek Semiconductor',
  '52:54:00': 'QEMU Virtual / Realtek NIC',

  // LG Electronics
  '00:1C:62': 'LG Electronics (Smart TV)',
  '3C:BD:C5': 'LG Electronics',
  'D8:C0:A6': 'LG Electronics',

  // Nintendo (Consoles)
  '00:1F:32': 'Nintendo Co., Ltd.',
  '98:B6:E9': 'Nintendo Switch',

  // SDN Custom Sandbox Gateway
  '0A:B1:C2': 'SDN Gatekeeper Sandbox Controller'
};

// Stable pool of popular device manufacturers to ensure no device ever shows up as generic
const STABLE_FALLBACK_VENDORS = [
  'Apple Inc.',
  'Samsung Electronics',
  'Xiaomi Communications',
  'TP-Link Technologies',
  'Hikvision Digital Technology',
  'Dahua Technology (CCTV)',
  'Huawei Technologies',
  'Hewlett-Packard (HP)',
  'Intel Corporation',
  'Dell Inc.',
  'Lenovo',
  'LG Electronics',
  'Sony Interactive',
  'Ubiquiti Networks'
];

/**
 * Stable hash helper to consistently map any seed string to a specific vendor index
 */
export const getStableFallbackVendor = (seed: string): string => {
  let hash = 0;
  const cleanSeed = (seed || '').trim();
  if (!cleanSeed) return 'TP-Link Technologies';
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % STABLE_FALLBACK_VENDORS.length;
  return STABLE_FALLBACK_VENDORS[index];
};

/**
 * Resolves the manufacturer/vendor of a device based on its MAC address.
 * Optionally incorporates hostname and IP clues as intelligent fallbacks if the MAC is unassigned or generic.
 */
export const resolveVendorByMac = (mac?: string, hostname?: string, ip?: string): string => {
  // Normalize MAC to always be clean and normalized
  const cleanMac = (mac || '').replace(/[:-]/g, '').toUpperCase().trim();

  // 1. Try MAC OUI Database lookup first (using normalized 3-octet format: XX:XX:XX)
  if (cleanMac.length >= 6) {
    const prefix6 = `${cleanMac.slice(0, 2)}:${cleanMac.slice(2, 4)}:${cleanMac.slice(4, 6)}`;
    if (OUI_DATABASE[prefix6]) {
      return OUI_DATABASE[prefix6];
    }
  }

  // 2. Try keyword matching on hostname if present and valid
  if (hostname && hostname !== '—' && hostname.trim() !== '') {
    const hn = hostname.toLowerCase();
    if (hn.includes('iphone') || hn.includes('ipad') || hn.includes('macbook') || hn.includes('apple') || hn.includes('apple-device')) return 'Apple Inc.';
    if (hn.includes('samsung') || hn.includes('galaxy') || hn.includes('tv-sala') || hn.includes('smart tv') || hn.includes('smarttv')) return 'Samsung Electronics';
    if (hn.includes('playstation') || hn.includes('ps5') || hn.includes('sony')) return 'Sony Interactive';
    if (hn.includes('huawei') || hn.includes('ont')) return 'Huawei Technologies';
    if (hn.includes('impresora') || hn.includes('printer') || hn.includes('hp') || hn.includes('laserjet') || hn.includes('deskjet') || hn.includes('officejet')) return 'Hewlett-Packard (HP)';
    if (hn.includes('nas') || hn.includes('synology') || hn.includes('backup')) return 'Synology Inc.';
    if (hn.includes('router') || hn.includes('gateway') || hn.includes('modem') || hn.includes('wifi-ont')) return 'Gateway / Router Principal';
    if (hn.includes('docker') || hn.includes('contenedor') || hn.includes('backend') || hn.includes('redis') || hn.includes('postgres')) return 'Docker Virtual Bridge';
    if (hn.includes('ubiquiti') || hn.includes('unifi') || hn.includes('ap-pro')) return 'Ubiquiti Networks';
    if (hn.includes('alexa') || hn.includes('echo') || hn.includes('dot') || hn.includes('amazon')) return 'Amazon Technologies';
    if (hn.includes('iot') || hn.includes('espressif') || hn.includes('sensor') || hn.includes('nodemcu')) return 'Espressif Systems (IoT)';
    if (hn.includes('virtualbox') || hn.includes('oracle') || hn.includes('vm')) return 'Oracle (VirtualBox)';
    if (hn.includes('hikvision') || (hn.includes('cctv') && hn.includes('hik'))) return 'Hikvision (CCTV)';
    if (hn.includes('dahua') || (hn.includes('cctv') && hn.includes('dahua'))) return 'Dahua Technology (CCTV)';
    if (hn.includes('ezviz')) return 'EZVIZ (Hikvision CCTV IP)';
    if (hn.includes('reolink')) return 'Reolink Digital Technology';
    if (hn.includes('axis')) return 'Axis Communications (IP Camera)';
    if (hn.includes('uniview') || hn.includes('unv')) return 'Uniview Technologies (UNV)';
    if (hn.includes('wisenet') || hn.includes('hanwha')) return 'Hanwha Techwin (Wisenet CCTV)';
    if (hn.includes('cctv') || hn.includes('camara') || hn.includes('camera') || hn.includes('grabadora') || hn.includes('nvr') || hn.includes('dvr') || hn.includes('domo')) return 'Cámara IP / NVR (CCTV)';
    if (hn.includes('workstation') || hn.includes('portatil') || hn.includes('este pc') || hn.includes('desktop') || hn.includes('laptop')) return 'Intel Corporation / PC';
    if (hn.includes('dell')) return 'Dell Inc.';
    if (hn.includes('lenovo') || hn.includes('thinkpad')) return 'Lenovo';
    if (hn.includes('asus')) return 'ASUSTeK Computer';
    if (hn.includes('xiaomi') || hn.includes('redmi') || hn.includes('poco')) return 'Xiaomi Communications';
  }

  // 3. Fallback based on typical IP structure (Gateway addresses)
  if (ip) {
    if (ip.endsWith('.1') || ip.endsWith('.254')) {
      return 'Gateway / Router Principal';
    }
  }

  // 4. Genuine fallback: return "Dispositivo Genérico" instead of guessing popular brands incorrectly
  return 'Dispositivo Genérico';
};

/**
 * Resolves a highly descriptive name for the device based on its MAC address, vendor, and existing host/IP.
 */
export const resolveDeviceNameByMac = (mac?: string, hostname?: string, ip?: string): string => {
  let cleanHostname = (hostname || "").trim();
  let prefix = "";

  // Extract common prefix templates
  if (cleanHostname.startsWith("Este PC (") && cleanHostname.endsWith(")")) {
    prefix = "Este PC";
    cleanHostname = cleanHostname.slice("Este PC (".length, -1).trim();
  } else if (cleanHostname.startsWith("Gateway/Router (") && cleanHostname.endsWith(")")) {
    prefix = "Gateway/Router";
    cleanHostname = cleanHostname.slice("Gateway/Router (".length, -1).trim();
  } else if (cleanHostname.startsWith("Gateway (") && cleanHostname.endsWith(")")) {
    prefix = "Gateway";
    cleanHostname = cleanHostname.slice("Gateway (".length, -1).trim();
  } else if (cleanHostname.startsWith("Router (") && cleanHostname.endsWith(")")) {
    prefix = "Router";
    cleanHostname = cleanHostname.slice("Router (".length, -1).trim();
  } else if (cleanHostname.startsWith("Dispositivo (") && cleanHostname.endsWith(")")) {
    cleanHostname = cleanHostname.slice("Dispositivo (".length, -1).trim();
  }

  const norm = cleanHostname.toLowerCase();
  const isGeneric = 
    !cleanHostname || 
    cleanHostname === '—' || 
    norm.startsWith('dispositivo') || 
    norm.startsWith('equipo activo') || 
    norm.startsWith('sonda de red') || 
    norm.includes('genérico') || 
    norm.includes('generico') || 
    norm.includes('dispositivo lan');

  let resolvedCore = cleanHostname;

  if (isGeneric) {
    const vendor = resolveVendorByMac(mac, cleanHostname || undefined, ip);
    const vLower = vendor.toLowerCase();
  
    if (vLower.includes('apple')) {
      if (cleanHostname.toLowerCase().includes('macbook')) {
        resolvedCore = 'MacBook Pro / iMac';
      } else if (cleanHostname.toLowerCase().includes('ipad')) {
        resolvedCore = 'Apple iPad Tablet';
      } else {
        resolvedCore = 'iPhone / Dispositivo Apple';
      }
    } else if (vLower.includes('playstation') || vLower.includes('sony interactive')) {
      resolvedCore = 'Consola Sony PlayStation';
    } else if (vLower.includes('sony')) {
      resolvedCore = 'Sony Smart TV / Bravia';
    } else if (vLower.includes('samsung techwin') || vLower.includes('wisenet')) {
      resolvedCore = 'Cámara Domo Profesional (Wisenet)';
    } else if (vLower.includes('hikvision') || vLower.includes('ezviz')) {
      if (cleanHostname.toLowerCase().includes('nvr') || cleanHostname.toLowerCase().includes('grabador')) {
        resolvedCore = 'Soporte Grabador NVR (Hikvision)';
      } else {
        resolvedCore = 'Cámara Vigilancia IP CCTV (Hikvision)';
      }
    } else if (vLower.includes('dahua')) {
      if (cleanHostname.toLowerCase().includes('nvr') || cleanHostname.toLowerCase().includes('grabador')) {
        resolvedCore = 'Soporte Grabador NVR (Dahua)';
      } else {
        resolvedCore = 'Cámara IP Domo CCTV (Dahua)';
      }
    } else if (vLower.includes('axis')) {
      resolvedCore = 'Cámara IP Alta Gama (Axis CCTV)';
    } else if (vLower.includes('uniview') || vLower.includes('unv')) {
      resolvedCore = 'Cámara de Seguridad IP (Uniview)';
    } else if (vLower.includes('reolink')) {
      resolvedCore = 'Cámara WiFi Residencial (Reolink)';
    } else if (vLower.includes('vivotek')) {
      resolvedCore = 'Cámara Perimetral CCTV (Vivotek)';
    } else if (vLower.includes('espressif')) {
      resolvedCore = 'Sensor Domótico IoT (Espressif ESP32)';
    } else if (vLower.includes('amazon') || vLower.includes('echo')) {
      resolvedCore = 'Asistente de Voz Inteligente (Amazon Echo/Alexa)';
    } else if (vLower.includes('nest') || vLower.includes('google nest')) {
      resolvedCore = 'Termostato o Chromecast (Google Nest)';
    } else if (vLower.includes('google')) {
      resolvedCore = 'Dispositivo Cast / Google Pixel';
    } else if (vLower.includes('samsung')) {
      if (cleanHostname.toLowerCase().includes('tv') || cleanHostname.toLowerCase().includes('smarttv')) {
        resolvedCore = 'Samsung Smart TV 4K';
      } else {
        resolvedCore = 'Smartphone Samsung Galaxy';
      }
    } else if (cleanHostname.toLowerCase().includes('tv') || cleanHostname.toLowerCase().includes('smarttv')) {
      resolvedCore = 'Smart TV de Red';
    } else if (vLower.includes('hp') || vLower.includes('hewlett-packard')) {
      resolvedCore = 'Impresora Multifuncional (HP)';
    } else if (vLower.includes('docker')) {
      resolvedCore = 'Contenedor Virtual Interno (Docker)';
    } else if (vLower.includes('synology')) {
      resolvedCore = 'Servidor NAS Storage (Synology)';
    } else if (vLower.includes('ubiquiti')) {
      resolvedCore = 'Punto de Acceso WiFi (Ubiquiti UniFi AP)';
    } else if (vLower.includes('cisco')) {
      if (cleanHostname.toLowerCase().includes('switch')) {
        resolvedCore = 'Switch Administrable Giga L3 (Cisco)';
      } else {
        resolvedCore = 'Router Acceso Profesional (Cisco)';
      }
    } else if (vLower.includes('tp-link')) {
      resolvedCore = 'Switch L2 / Router Hogar (TP-Link)';
    } else if (vLower.includes('xiaomi')) {
      resolvedCore = 'Dispositivo Móvil o Domótica (Xiaomi)';
    } else if (vLower.includes('motorola')) {
      resolvedCore = 'Smartphone Android (Motorola)';
    } else if (vLower.includes('virtualbox') || vLower.includes('oracle')) {
      resolvedCore = 'Máquina Virtual de Servidor (Oracle VirtualBox)';
    } else if (vLower.includes('huawei')) {
      if (cleanHostname.toLowerCase().includes('ont') || cleanHostname.toLowerCase().includes('modem') || cleanHostname.toLowerCase().includes('router')) {
        resolvedCore = 'Módem Router Fibra Óptica (Huawei ONT)';
      } else {
        resolvedCore = 'Dispositivo / Móvil Huawei';
      }
    } else if (vLower.includes('dell')) {
      resolvedCore = 'Computadora de Escritorio (Dell PC)';
    } else if (vLower.includes('lenovo')) {
      resolvedCore = 'Laptop ThinkPad (Lenovo)';
    } else if (vLower.includes('lg electronics') || vLower.includes('lg')) {
      resolvedCore = 'LG Smart TV OLED';
    } else if (vLower.includes('nintendo')) {
      resolvedCore = 'Consola de Juegos Nintendo Switch';
    } else if (vLower.includes('realtek')) {
      resolvedCore = 'Adaptador de Red Realtek';
    } else if (vendor && vendor !== '—' && vendor !== 'Sonda de Red Genérica' && vendor !== 'Dispositivo de Red Activo') {
      resolvedCore = `Equipo Activo (${vendor})`;
    } else if (ip) {
      if (ip.endsWith('.1') || ip.endsWith('.254')) {
        resolvedCore = 'Gateway Router Principal';
      } else if (ip.endsWith('.55')) {
        resolvedCore = 'Computadora Principal (Este PC)';
      } else {
        resolvedCore = 'Dispositivo de Red Activo';
      }
    } else {
      resolvedCore = 'Dispositivo de Red Activo';
    }
  }

  if (prefix) {
    return `${prefix} (${resolvedCore})`;
  }
  return resolvedCore;
};
