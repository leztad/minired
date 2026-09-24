import { describe, it, expect } from 'vitest';
import { LocationProfile } from '../types';
import { 
  calculateLocationTotals, 
  generateOfflineLocationMarkdown 
} from './offlineReportGenerator';

describe('offlineReportGenerator tests', () => {
  const mockProfile: LocationProfile = {
    id: 'loc-test-1',
    name: 'Sede Remota Norte',
    subnet: '192.168.50.0/24',
    interfaceName: 'Realtek PCIe GbE Family Controller',
    gateway: '192.168.50.1',
    dns: '8.8.8.8',
    description: 'Servidores locales de contingencia y sucursal de ventas.',
    department: 'Operaciones Comerciales',
    createdAt: '2026-09-24 10:00:00',
    contactName: 'Laura Ramos',
    contactPhone: '+57 300 123 4567',
    securityNotes: 'Acceso con tarjeta inteligente al cuarto de racks.',
    devices: [
      {
        id: 'dev-1',
        ip: '192.168.50.1',
        host: 'Gateway-Cisco-50',
        mac: '00:00:0C:9F:F0:01',
        ping: 2,
        estado: 'OK',
        lastChecked: '2026-09-24',
        sensorPing: true,
        vendor: 'Cisco Systems'
      },
      {
        id: 'dev-2',
        ip: '192.168.50.10',
        host: 'Server-DB-Local',
        mac: '00:50:56:AA:BB:CC',
        ping: 5,
        estado: 'OK',
        lastChecked: '2026-09-24',
        sensorPing: true,
        vendor: 'VMware, Inc.'
      },
      {
        id: 'dev-3',
        ip: '192.168.50.25',
        host: 'Switch-Piso-2',
        mac: '00:1E:13:44:55:66',
        ping: 110,
        estado: 'Advertencia',
        lastChecked: '2026-09-24',
        sensorPing: true,
        vendor: 'D-Link Corporation'
      },
      {
        id: 'dev-4',
        ip: '192.168.50.80',
        host: 'Impresora-Contabilidad',
        mac: '00:1B:78:11:22:33',
        ping: null,
        estado: 'Caído',
        lastChecked: '2026-09-24',
        sensorPing: true,
        vendor: 'Hewlett Packard'
      }
    ]
  };

  it('calculateLocationTotals should correctly compute totals, latency, and safety score', () => {
    const totals = calculateLocationTotals(mockProfile);

    expect(totals.totalHosts).toBe(4);
    expect(totals.okHosts).toBe(2);
    expect(totals.warnHosts).toBe(1);
    expect(totals.downHosts).toBe(1);
    expect(totals.avgLatency).toBeGreaterThan(0);
    expect(totals.safetyScore).toBeLessThanOrEqual(100);
    expect(totals.safetyScore).toBeGreaterThanOrEqual(10);
    expect(totals.rank).toBeDefined();
  });

  it('generateOfflineLocationMarkdown should generate rich Markdown with summary and device table', () => {
    const md = generateOfflineLocationMarkdown(mockProfile);

    expect(md).toContain('# REPORTE DE AUDITORÍA DE RED LAN — SEDE OFFLINE: SEDE REMOTA NORTE');
    expect(md).toContain('192.168.50.0/24');
    expect(md).toContain('Laura Ramos');
    expect(md).toContain('Acceso con tarjeta inteligente al cuarto de racks');
    expect(md).toContain('Gateway-Cisco-50');
    expect(md).toContain('192.168.50.1');
    expect(md).toContain('00:00:0C:9F:F0:01');
    expect(md).toContain('Server-DB-Local');
    expect(md).toContain('Caído');
  });
});
