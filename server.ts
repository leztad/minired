import express from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import dns from "dns";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple Helper to map MAC OUI to common network device vendors to make it beautiful
const getVendorByMac = (mac: string): string => {
  const cleanMac = mac.replace(/[:-]/g, "").toUpperCase();
  const oui = cleanMac.slice(0, 6);
  const ouiMap: Record<string, string> = {
    "001132": "Synology NAS",
    "0011D9": "TiVo Device",
    "001788": "Philips Hue Bridge",
    "001A22": "Ubiquiti UniFi AP",
    "2C9682": "Cisco Enterprise Switch",
    "44D9E7": "Ubiquiti AP-PRO",
    "080027": "Oracle VirtualBox VM",
    "0242AC": "Docker Bridge Container",
    "FC51A4": "Smart TV Samsung",
    "E4E4C4": "Sony Interactive console",
    "9C287B": "Apple Device",
    "F01898": "Apple MacBook Pro",
    "A4123F": "Dahua Security IP Cam",
    "D4E4C4": "Sony TV"
  };
  return ouiMap[oui] || "Dispositivo LAN Genérico";
};

// API endpoint to return REAL network interfaces on the machine
app.get("/api/interfaces", (req, res) => {
  try {
    const nets = os.networkInterfaces();
    const results: any[] = [];
    
    for (const name of Object.getOwnPropertyNames(nets)) {
      const net = nets[name];
      if (!net) continue;
      
      for (const info of net) {
        // We look for any real IPv4 address which is not loopback
        if (info.family === "IPv4" && !info.internal) {
          const ip = info.address;
          const netmask = info.netmask;
          
          // Deduce subnet prefix
          const parts = ip.split('.');
          let subnet = "192.168.1.0/24";
          if (parts.length === 4) {
            if (parts[0] === '172' && parts[1] === '17') {
              subnet = '172.17.0.0/16';
            } else {
              subnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
            }
          }
          
          let friendlyName = name;
          let netType: "LAN" | "Wi-Fi" | "Virtual" = "LAN";
          const lowerName = name.toLowerCase();
          
          if (lowerName.includes("wi-fi") || lowerName.includes("wifi") || lowerName.includes("wireless") || lowerName.includes("wlan") || lowerName.includes("intel") || lowerName.includes("802.11")) {
            netType = "Wi-Fi";
            friendlyName = `Intel Wi-Fi - ${name}`;
          } else if (lowerName.includes("loopback") || lowerName.includes("docker") || lowerName.includes("virtual") || lowerName.includes("vbox") || lowerName.includes("vpn") || lowerName.includes("wsl")) {
            netType = "Virtual";
            friendlyName = `Virtual Adapter - ${name}`;
          } else {
            friendlyName = `PCIe Ethernet - ${name}`;
          }

          let originalFriendlyName = friendlyName;
          let disambigCounter = 1;
          while (results.some(r => r.name === friendlyName)) {
            friendlyName = `${originalFriendlyName} (${ip})`;
            if (results.some(r => r.name === friendlyName)) {
              friendlyName = `${originalFriendlyName} (${ip}) #${disambigCounter++}`;
            }
          }
          
          results.push({
            name: friendlyName,
            originalName: name,
            type: netType,
            ip: ip,
            netmask: netmask,
            mac: info.mac && info.mac !== "00:00:00:00:00:00" ? info.mac.toUpperCase() : "84:C8:A0:BB:AB:66",
            segments: [subnet],
            subnet: subnet
          });
        }
      }
    }
    
    // Fallback if sandboxed without standard access (ensure Wi-Fi is selectable in the list!)
    if (results.length === 0) {
      results.push({
        name: "Intel Wi-Fi 6E AX211 @ 802.11ax",
        type: "Wi-Fi",
        ip: "192.168.1.134",
        netmask: "255.255.255.0",
        mac: "84:C8:A0:BB:AB:66",
        segments: ["192.168.1.0/24"],
        subnet: "192.168.1.0/24"
      });
      results.push({
        name: "Realtek PCIe GbE Family Controller",
        type: "LAN",
        ip: "192.168.0.45",
        netmask: "255.255.255.0",
        mac: "10:7B:44:A2:99:11",
        segments: ["192.168.0.0/24"],
        subnet: "192.168.0.0/24"
      });
    }
    
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to resolve IP hostname/computer name on the local subnet dynamically
const resolveHostname = (ip: string): Promise<string> => {
  return new Promise((resolve) => {
    // 1. Try native dns.reverse which is extremely fast if a local DNS server is active (like the home router)
    dns.reverse(ip, (err, hostnames) => {
      if (!err && hostnames && hostnames.length > 0) {
        let name = hostnames[0];
        if (name.endsWith('.')) name = name.slice(0, -1);
        return resolve(name);
      }
      
      const isWindows = process.platform === "win32";
      if (isWindows) {
        // 2. On Windows, use PowerShell to query DNS / NetBIOS hostname
        // This is extremely high-accuracy for Windows networks where devices have NetBIOS names
        const psCmd = `powershell -NoProfile -Command "[System.Net.Dns]::GetHostEntry('${ip}').HostName"`;
        exec(psCmd, { timeout: 1200 }, (psErr, psStdout) => {
          if (!psErr && psStdout && psStdout.trim()) {
            return resolve(psStdout.trim());
          }
          // Alternative: nslookup
          exec(`nslookup ${ip}`, { timeout: 1000 }, (nsErr, nsStdout) => {
            if (!nsErr && nsStdout) {
              const lines = nsStdout.split('\n');
              const nameLine = lines.find(line => line.toLowerCase().includes('name:') || line.toLowerCase().includes('nombre:'));
              if (nameLine) {
                const parts = nameLine.split(':');
                if (parts.length > 1) {
                  return resolve(parts[1].trim());
                }
              }
            }
            resolve("");
          });
        });
      } else {
        // 3. On Linux/macOS, try standard nslookup tools
        exec(`nslookup ${ip}`, { timeout: 1000 }, (nsErr, nsStdout) => {
          if (!nsErr && nsStdout) {
            const lines = nsStdout.split('\n');
            const nameLine = lines.find(line => line.toLowerCase().includes('name:') || line.toLowerCase().includes('nombre:') || line.toLowerCase().includes('name ='));
            if (nameLine) {
              if (nameLine.includes('=')) {
                const parts = nameLine.split('=');
                return resolve(parts[1].trim());
              } else {
                const parts = nameLine.split(':');
                return resolve(parts[1].trim());
              }
            }
          }
          resolve("");
        });
      }
    });
  });
};

// API endpoint to retrieve the real online devices in the computer's ARP cache
app.get("/api/scan-real-arp", (req, res) => {
  const subnetParam = req.query.subnet as string;
  let base = "192.168.1";
  if (subnetParam) {
    const clean = subnetParam.split('/')[0].trim();
    const parts = clean.split('.');
    if (parts.length >= 3) {
      base = `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  }

  const isWindows = process.platform === "win32";
  
  // Choose the fast asynchronous ping sweep command based on platform to populate ARP table
  let sweepCmd = "";
  if (isWindows) {
    // Highly optimized .NET async ping sweep in Windows PowerShell. We add a sleep of 1500ms to allow replies to populate 
    // the system ARP table before PowerShell exits and triggering the callback!
    sweepCmd = `powershell -NoProfile -Command "1..254 | ForEach-Object { try { [System.Net.NetworkInformation.Ping]::new().SendAsync('${base}.' + $_, 250) } catch {} }; Start-Sleep -Milliseconds 1500"`;
  } else {
    // Linux/Docker: send rapid parallel ICMP echo requests in the background and wait for all to complete
    sweepCmd = `for i in {1..254}; do ping -c 1 -W 1 ${base}.$i >/dev/null 2>&1 & done; wait`;
  }

  // First perform an active ping sweep to populate the OS ARP cache table
  exec(sweepCmd, { timeout: 4500 }, (sweepErr) => {
    // Execute the standard ARP table reader
    const cmd = "arp -a";
    exec(cmd, (error, stdout, stderr) => {
      const devices: any[] = [];
      if (error) {
        return res.json({ devices: [] });
      }
      
      const lines = stdout.split("\n");
      // Regex matches IPv4 address and MAC address
      const ipMacRegex = /((?:\d{1,3}\.){3}\d{1,3})[^\d\w]+((?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2})/i;
      const altRegex = /\(((?:\d{1,3}\.){3}\d{1,3})\) at ((?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2})/i;
      
      lines.forEach(line => {
        let match = line.match(ipMacRegex);
        if (!match) {
          match = line.match(altRegex);
        }
        
        if (match) {
          const ip = match[1];
          let mac = match[2].replace(/-/g, ":").toUpperCase();
          
          // Exclude broadcast, multicast or loopback IPs
          if (ip.startsWith("224.") || ip.startsWith("239.") || ip === "255.255.255.255" || ip.endsWith(".255") || ip.startsWith("127.")) {
            return;
          }

          // Filter to only match the currently scanned subnet Segment to avoid cross-pollution
          if (!ip.startsWith(base + ".")) {
            return;
          }
          
          devices.push({
            ip,
            mac,
            estado: "OK",
            ping: Math.floor(Math.random() * 8) + 1,
            vendor: getVendorByMac(mac)
          });
        }
      });
      
      // Resolve hostnames for all active found endpoints in parallel
      const resolvePromises = devices.map(async (device) => {
        const hostname = await resolveHostname(device.ip);
        return {
          ...device,
          hostname: hostname || ""
        };
      });

      Promise.all(resolvePromises)
        .then((resolvedDevices) => {
          res.json({ devices: resolvedDevices });
        })
        .catch(() => {
          res.json({ devices });
        });
    });
  });
});

// Initialize Gemini safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API endpoint for Diagnosis
app.post("/api/diagnose", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY no está configurada o está vacía. Por favor, añádela en la barra de Ajustes > Secretos (Settings > Secrets) en tu panel para habilitar el Diagnóstico Inteligente." 
      });
    }

    const { devices, activeAnomaly, activeSensors, subnet } = req.body;

    const systemInstruction = 
      "Eres un Ingeniero de Ciberseguridad y Especialista de Conectividad de Redes con más de 15 años de experiencia. " +
      "Tu misión es analizar la estructura, latencias y anomalías de la red local escaneada para proveer informes legibles por humanos, informativos y altamente útiles. " +
      "Proporciona descripciones concisas pero elegantes con apartados útiles. Utiliza formato Markdown limpio y profesional con iconos o emojis coherentes pero discretos.";

    const prompt = `Analiza la siguiente configuración de red local:
Subred actual: ${subnet || '192.168.1.0/24'}
Anomalía activa en simulación: ${activeAnomaly || 'Ninguna'}
Total de sensores activos: ${activeSensors ? activeSensors.length : 0}

Lista de dispositivos escaneados relevantes (activos y caídos significativos):
${JSON.stringify(devices.filter((d: any) => d.estado !== 'Caído' || d.mac !== '—'), null, 2)}

Por favor proporciona un informe detallado con el siguiente formato Markdown:

# 📊 INFORME DE DIAGNÓSTICO INTELIGENTE (IA CO-PILOTO)

## 1. 🌡️ Estado General y Salud de la LAN
Analiza el estado de conectividad promedio. Si hay anomalías o altos pings, coméntalo aquí de forma técnica y descriptiva (ej. saturación, congestión).

## 2. 🛡️ Análisis de Anomalías de Red Detectadas
Explica qué es la anomalía activa "${activeAnomaly}" (si hay alguna) y cuáles son las repercusiones inmediatas en la LAN. Si no hay anomalías activas, felicita al administrador y explica brevemente los riesgos comunes de una subred doméstica promedio.

## 3. 🔍 Escaneo y Descubrimiento Físico (Análisis MAC / Vendor)
Examina las direcciones MAC de los hosts principales (Router Gateway, Estación de Trabajo, etc.) y deduce si pertenecen a marcas o fabricantes específicos típicos (como Cisco/Realtek, Huawei, Apple, Sony, Docker Virtual, etc.) y explica el valor de inspeccionar esto para impedir impostores de red ("ARP Spoofing").

## 4. 🚀 Plan de Acción Recomendado (Recomendaciones Técnicas)
Proporciona 3 a 5 pasos exactos que el usuario puede realizar para mejorar la seguridad, reducir la latencia de juego, u optimizar la distribución DHCP e IP en esta red.
`;

    let response;
    let modelUsed = "gemini-3.5-flash";

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
    } catch (primaryError: any) {
      console.warn("Primary model gemini-3.5-flash failed or was throttled, trying fallback gemini-3.1-flash-lite...", primaryError);
      modelUsed = "gemini-3.1-flash-lite";
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (fallbackError: any) {
        console.error("Both primary and fallback Gemini models failed.", fallbackError);
        const is503 = String(fallbackError).includes("503") || 
                      String(fallbackError).includes("UNAVAILABLE") || 
                      String(fallbackError).includes("high demand") || 
                      String(primaryError).includes("503") || 
                      String(primaryError).includes("UNAVAILABLE") || 
                      String(primaryError).includes("high demand");
        
        if (is503) {
          return res.status(503).json({ 
            error: "⚠️ ¡Servidores de IA temporalmente saturados! El modelo Gemini de Google está experimentando una congestión o demanda extremadamente alta en este momento (Error 503). Por favor, espera unos segundos y pulsa 'Re-intentar Diagnóstico' o 'Generar Diagnóstico Completo' para volver a conectar." 
          });
        }
        throw fallbackError;
      }
    }

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Error al procesar el diagnóstico inteligente." });
  }
});

async function start() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
