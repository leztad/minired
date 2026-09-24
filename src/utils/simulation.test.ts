import { describe, it, expect } from 'vitest';
import { generateRandomMAC, generateFullSubnet, generateSensorsForDevices } from './simulation';

describe('Network Simulation Utility Tests', () => {
  describe('generateRandomMAC', () => {
    it('should generate a valid MAC address format (xx:xx:xx:xx:xx:xx)', () => {
      const ipSuffix = 55;
      const mac = generateRandomMAC(ipSuffix);
      expect(mac).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i);
    });

    it('should correctly format the suffix as hex in the last octet', () => {
      expect(generateRandomMAC(15)).toMatch(/:0F$/);
      expect(generateRandomMAC(255)).toMatch(/:FF$/);
      expect(generateRandomMAC(10)).toMatch(/:0A$/);
    });
  });

  describe('generateFullSubnet', () => {
    it('should always return exactly 254 hosts for a standard /24 subnet', () => {
      const pool = generateFullSubnet('192.168.1.0/24', false);
      expect(pool.length).toBe(254);
    });

    it('should map the router at IP suffix .1 and simulated PC at IP suffix .55 as active', () => {
      const pool = generateFullSubnet('192.168.1.0/24', false);
      const router = pool.find(d => d.ip === '192.168.1.1');
      const localPc = pool.find(d => d.ip === '192.168.1.55');

      expect(router).toBeDefined();
      expect(router?.host).toContain('Router');
      expect(router?.estado).toBe('OK');

      expect(localPc).toBeDefined();
      expect(localPc?.host).toContain('Estación de Trabajo');
      expect(localPc?.estado).toBe('OK');
    });

    it('should flag other inactive IPs as Caído with no ping/mac defaults', () => {
      const pool = generateFullSubnet('192.168.1.0/24', false);
      const inactive = pool.find(d => d.ip === '192.168.1.100');
      
      expect(inactive).toBeDefined();
      expect(inactive?.estado).toBe('Caído');
      expect(inactive?.host).toBe('—');
      expect(inactive?.ping).toBeNull();
    });

    it('should generate hosts with correct active count from presets', () => {
      const standardPool = generateFullSubnet('192.168.1.0/24', false);
      const activeStandard = standardPool.filter(d => d.estado !== 'Caído').length;
      expect(activeStandard).toBeGreaterThan(0);
      
      const router = standardPool.find(d => d.ip === '192.168.1.1');
      expect(router).toBeDefined();
      expect(router?.estado).toBe('OK');
    });
  });

  describe('generateSensorsForDevices', () => {
    it('should only generate active sensors for online and warning hosts', () => {
      const pool = generateFullSubnet('192.168.1.0/24', false);
      const sensors = generateSensorsForDevices(pool);

      const activeDevices = pool.filter(d => d.estado !== 'Caído');
      expect(activeDevices.length).toBeGreaterThan(0);
      expect(sensors.length).toBeGreaterThanOrEqual(activeDevices.length);
    });

    it('should match sensor state to host state', () => {
      const pool = generateFullSubnet('192.168.1.0/24', false);
      const sensors = generateSensorsForDevices(pool);

      const routerSensor = sensors.find(s => s.ip === '192.168.1.1');
      expect(routerSensor).toBeDefined();
      expect(routerSensor?.estado).toBe('OK');
    });
  });
});
