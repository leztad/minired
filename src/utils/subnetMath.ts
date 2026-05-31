export function calculateSubnetDetails(ipStr: string, cidr: number) {
  // Validate basic IPv4 format
  const parts = ipStr.split('.').map(s => parseInt(s.trim(), 10));
  if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0 || p > 255)) {
    return null;
  }

  // Calculate binary representation of IP and netmask
  const ipNum = ((parts[0] & 255) << 24) >>> 0;
  const ipNum2 = ((parts[1] & 255) << 16) >>> 0;
  const ipNum3 = ((parts[2] & 255) << 8) >>> 0;
  const ipNum4 = (parts[3] & 255) >>> 0;
  const combinedIp = (ipNum | ipNum2 | ipNum3 | ipNum4) >>> 0;

  // Create netmask from CIDR
  let maskNum = 0;
  if (cidr > 0) {
    maskNum = (0xFFFFFFFF << (32 - cidr)) >>> 0;
  }

  const netNum = (combinedIp & maskNum) >>> 0;
  const broadNum = (netNum | (~maskNum)) >>> 0;

  const toIpStr = (num: number) => {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');
  };

  const netMask = toIpStr(maskNum);
  const wildcard = toIpStr(~maskNum);
  const netAddr = toIpStr(netNum);
  const broadAddr = toIpStr(broadNum);
  
  const minHostNum = (netNum + 1) >>> 0;
  const maxHostNum = cidr >= 31 ? broadNum : (broadNum - 1) >>> 0;
  const usableRange = cidr >= 31 
    ? 'N/D (Punto a Punto)' 
    : `${toIpStr(minHostNum)} - ${toIpStr(maxHostNum)}`;
  
  const totalAddresses = Math.pow(2, 32 - cidr);
  const usableCount = cidr >= 31 ? 0 : totalAddresses - 2;

  // Binary representations for visual aid
  const getBinaryStr = (num: number) => {
    const raw = (num >>> 0).toString(2).padStart(32, '0');
    return [
      raw.slice(0, 8),
      raw.slice(8, 16),
      raw.slice(16, 24),
      raw.slice(24, 32)
    ].join('.');
  };

  return {
    netMask,
    wildcard,
    netAddr,
    broadAddr,
    usableRange,
    usableCount: usableCount < 0 ? 0 : usableCount,
    binaryIp: getBinaryStr(combinedIp),
    binaryMask: getBinaryStr(maskNum),
    binaryNet: getBinaryStr(netNum),
  };
}
