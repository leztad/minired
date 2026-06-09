/**
 * Utility to identify device brands/manufacturers based on MAC OUI rules.
 */
export const resolveVendorByMac = (mac: string): string => {
  if (!mac || mac === '—') return '—';
  const prefix = mac.toUpperCase().substring(0, 8);
  
  if (prefix.startsWith('00:1A:2B') || prefix.startsWith('EC:FA:BC')) return 'Espressif Systems (IoT)';
  if (prefix.startsWith('02:42:AC')) return 'Docker Virtual Bridge';
  if (prefix.startsWith('84:C8:A0') || prefix.startsWith('44:D9:E7')) return 'Ubiquiti Networks / Intel';
  if (prefix.startsWith('D4:E4:C4') || prefix.startsWith('FE:33:DE')) return 'Sony Interactive (Console/TV)';
  if (prefix.startsWith('A4:12:3F') || prefix.startsWith('00:0F:7C')) return 'Dahua Security Technology';
  if (prefix.startsWith('7C:B0:C2') || prefix.startsWith('90:72:40')) return 'Apple Inc.';
  if (prefix.startsWith('FC:A6:67') || prefix.startsWith('C4:4F:33')) return 'Amazon Technologies (Echo/Alexa)';
  if (prefix.startsWith('08:00:27')) return 'Oracle Corporation (VirtualBox)';
  if (prefix.startsWith('50:3E:AA')) return 'Hewlett-Packard (HP)';
  if (prefix.startsWith('10:7B:44')) return 'Huawei Technologies';
  if (prefix.startsWith('00:11:32')) return 'Synology Inc. (NAS)';
  if (prefix.startsWith('00:00:00')) return 'Open vSwitch SDN Controller';
  
  return 'Sonda de Red Genérica';
};
