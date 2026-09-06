import tls from "tls";
import fs from "fs";
import path from "path";
import os from "os";

export interface SslAuditResult {
  host: string;
  port: number;
  subjectCn: string;
  sans: string[];
  issuerOrg: string;
  issuerCn: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  isExpired: boolean;
  status: 'valid' | 'expiring_soon' | 'critical_expiring' | 'expired' | 'error';
  protocol: string;
  cipherName: string;
  serialNumber?: string;
  fingerprint256?: string;
  authorized: boolean;
  authorizationError?: string;
  checkedAt: string;
  error?: string;
}

export interface MonitoredSslSite {
  id: string;
  host: string;
  port: number;
  label: string;
  lastAudit?: SslAuditResult;
  lastChecked?: string;
}

// Storage setup
let SSL_FILE = path.join(process.cwd(), "ssl-monitored.json");
try {
  fs.accessSync(process.cwd(), fs.constants.W_OK);
} catch {
  const configDir = path.join(os.homedir(), ".redmonitor");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  SSL_FILE = path.join(configDir, "ssl-monitored.json");
}

function loadMonitoredSites(): MonitoredSslSite[] {
  if (!fs.existsSync(SSL_FILE)) {
    const defaults: MonitoredSslSite[] = [
      {
        id: "ssl-site-1",
        host: "google.com",
        port: 443,
        label: "Portal Gateway Google"
      },
      {
        id: "ssl-site-2",
        host: "cloudflare.com",
        port: 443,
        label: "DNS & Edge Cloudflare"
      },
      {
        id: "ssl-site-3",
        host: "github.com",
        port: 443,
        label: "Repositorios GitHub Enterprise"
      }
    ];
    try {
      fs.writeFileSync(SSL_FILE, JSON.stringify(defaults, null, 2), "utf8");
    } catch {}
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(SSL_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveMonitoredSites(sites: MonitoredSslSite[]): void {
  try {
    fs.writeFileSync(SSL_FILE, JSON.stringify(sites, null, 2), "utf8");
  } catch (err) {
    console.error("Error guardando ssl-monitored.json:", err);
  }
}

/**
 * Audit live TLS certificate of target host/port
 */
export function auditCertificate(host: string, port = 443, timeoutMs = 6000): Promise<SslAuditResult> {
  return new Promise((resolve) => {
    const cleanHost = host.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
    const checkedAt = new Date().toISOString();

    let resolved = false;
    const finish = (result: SslAuditResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish({
        host: cleanHost,
        port,
        subjectCn: "Timeout",
        sans: [],
        issuerOrg: "—",
        issuerCn: "—",
        validFrom: "—",
        validTo: "—",
        daysRemaining: 0,
        isExpired: false,
        status: 'error',
        protocol: "—",
        cipherName: "—",
        authorized: false,
        authorizationError: "Tiempo de espera agotado al conectar al puerto SSL",
        checkedAt,
        error: `Conexión TLS agotó el tiempo de espera de ${timeoutMs / 1000}s`
      });
    }, timeoutMs);

    try {
      const socket = tls.connect(
        {
          host: cleanHost,
          port,
          servername: cleanHost,
          rejectUnauthorized: false // To inspect self-signed certificates without crashing
        },
        () => {
          clearTimeout(timer);
          try {
            const cert: any = socket.getPeerCertificate(true);
            const cipher = socket.getCipher();
            const protocol = socket.getProtocol() || "TLSv1.2";
            const authorized = socket.authorized;
            const authError = socket.authorizationError ? String(socket.authorizationError) : undefined;

            socket.end();

            if (!cert || !cert.valid_to) {
              return finish({
                host: cleanHost,
                port,
                subjectCn: "No Certificate",
                sans: [],
                issuerOrg: "—",
                issuerCn: "—",
                validFrom: "—",
                validTo: "—",
                daysRemaining: 0,
                isExpired: false,
                status: 'error',
                protocol,
                cipherName: cipher?.name || "—",
                authorized: false,
                checkedAt,
                error: "El host no devolvió un certificado X.509 válido"
              });
            }

            const validFromDate = new Date(cert.valid_from);
            const validToDate = new Date(cert.valid_to);
            const now = Date.now();
            const diffMs = validToDate.getTime() - now;
            const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining <= 0;

            let status: SslAuditResult['status'] = 'valid';
            if (isExpired) {
              status = 'expired';
            } else if (daysRemaining <= 7) {
              status = 'critical_expiring';
            } else if (daysRemaining <= 30) {
              status = 'expiring_soon';
            }

            // Extract SANs (Subject Alternative Names)
            const sansList: string[] = [];
            if (cert.subjectaltname) {
              const parts = cert.subjectaltname.split(', ');
              parts.forEach((p: string) => {
                const clean = p.replace(/^DNS:/, '').trim();
                if (clean) sansList.push(clean);
              });
            }

            finish({
              host: cleanHost,
              port,
              subjectCn: cert.subject?.CN || cleanHost,
              sans: sansList.slice(0, 10),
              issuerOrg: cert.issuer?.O || cert.issuer?.CN || "Emisor no especificado",
              issuerCn: cert.issuer?.CN || "—",
              validFrom: validFromDate.toISOString(),
              validTo: validToDate.toISOString(),
              daysRemaining,
              isExpired,
              status,
              protocol,
              cipherName: cipher ? `${cipher.name} (${cipher.version})` : "Standard",
              serialNumber: cert.serialNumber,
              fingerprint256: cert.fingerprint256,
              authorized,
              authorizationError: authError,
              checkedAt
            });
          } catch (err: any) {
            finish({
              host: cleanHost,
              port,
              subjectCn: "Error",
              sans: [],
              issuerOrg: "—",
              issuerCn: "—",
              validFrom: "—",
              validTo: "—",
              daysRemaining: 0,
              isExpired: false,
              status: 'error',
              protocol: "—",
              cipherName: "—",
              authorized: false,
              checkedAt,
              error: err.message || "Error al extraer metadatos del certificado"
            });
          }
        }
      );

      socket.on('error', (err: any) => {
        clearTimeout(timer);
        finish({
          host: cleanHost,
          port,
          subjectCn: "Conexión Fallida",
          sans: [],
          issuerOrg: "—",
          issuerCn: "—",
          validFrom: "—",
          validTo: "—",
          daysRemaining: 0,
          isExpired: false,
          status: 'error',
          protocol: "—",
          cipherName: "—",
          authorized: false,
          checkedAt,
          error: `Fallo al abrir socket TLS en ${cleanHost}:${port} - ${err.message}`
        });
      });
    } catch (err: any) {
      clearTimeout(timer);
      finish({
        host: cleanHost,
        port,
        subjectCn: "Error Inicialización",
        sans: [],
        issuerOrg: "—",
        issuerCn: "—",
        validFrom: "—",
        validTo: "—",
        daysRemaining: 0,
        isExpired: false,
        status: 'error',
        protocol: "—",
        cipherName: "—",
        authorized: false,
        checkedAt,
        error: err.message
      });
    }
  });
}

export function getMonitoredSslSites(): MonitoredSslSite[] {
  return loadMonitoredSites();
}

export function addMonitoredSslSite(host: string, port = 443, label?: string): MonitoredSslSite[] {
  const sites = loadMonitoredSites();
  const cleanHost = host.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
  
  const existing = sites.find(s => s.host.toLowerCase() === cleanHost.toLowerCase() && s.port === port);
  if (!existing) {
    sites.push({
      id: `ssl-${Date.now()}`,
      host: cleanHost,
      port,
      label: label || `Servicio HTTPS ${cleanHost}`
    });
    saveMonitoredSites(sites);
  }
  return sites;
}

export function deleteMonitoredSslSite(id: string): MonitoredSslSite[] {
  let sites = loadMonitoredSites();
  sites = sites.filter(s => s.id !== id);
  saveMonitoredSites(sites);
  return sites;
}

export async function runBatchSslAudit(): Promise<MonitoredSslSite[]> {
  const sites = loadMonitoredSites();
  for (const site of sites) {
    try {
      site.lastAudit = await auditCertificate(site.host, site.port);
      site.lastChecked = new Date().toISOString();
    } catch {}
  }
  saveMonitoredSites(sites);
  return sites;
}
