import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, Layers, Network, Zap, ShieldAlert, CheckCircle, 
  AlertTriangle, RefreshCw, Server, HelpCircle, Activity, 
  ArrowRight, Radio, HardDrive, Terminal, Play, Cpu, ShieldCheck
} from 'lucide-react';

// Subnet Helper Function
function calculateSubnetDetails(ipStr: string, cidr: number) {
  try {
    const ipParts = ipStr.trim().split('.').map(Number);
    if (ipParts.length !== 4 || ipParts.some(isNaN) || ipParts.some(p => p < 0 || p > 255)) {
      throw new Error("Dirección IP inválida. Debe tener formato X.Y.Z.W (0-255).");
    }
    const ipNum = ((ipParts[0] << 24) >>> 0) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    
    // Mask calculation
    const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const maskParts = [
      (maskNum >>> 24) & 255,
      (maskNum >>> 16) & 255,
      (maskNum >>> 8) & 255,
      maskNum & 255
    ];
    const maskStr = maskParts.join('.');
    
    // Wildcard
    const wildcardNum = ~maskNum >>> 0;
    const wildcardParts = [
      (wildcardNum >>> 24) & 255,
      (wildcardNum >>> 16) & 255,
      (wildcardNum >>> 8) & 255,
      wildcardNum & 255
    ];
    const wildcardStr = wildcardParts.join('.');
    
    // Network Address
    const netNum = (ipNum & maskNum) >>> 0;
    const netParts = [
      (netNum >>> 24) & 255,
      (netNum >>> 16) & 255,
      (netNum >>> 8) & 255,
      netNum & 255
    ];
    const netStr = netParts.join('.');
    
    // Broadcast Address
    const bcNum = (netNum | ~maskNum) >>> 0;
    const bcParts = [
      (bcNum >>> 24) & 255,
      (bcNum >>> 16) & 255,
      (bcNum >>> 8) & 255,
      bcNum & 255
    ];
    const bcStr = bcParts.join('.');
    
    // First Host & Last Host
    const firstHostNum = (netNum + 1) >>> 0;
    const firstHostStr = cidr >= 31 ? 'N/A' : [
      (firstHostNum >>> 24) & 255,
      (firstHostNum >>> 16) & 255,
      (firstHostNum >>> 8) & 255,
      firstHostNum & 255
    ].join('.');
    
    const lastHostNum = (bcNum - 1) >>> 0;
    const lastHostStr = cidr >= 31 ? 'N/A' : [
      (lastHostNum >>> 24) & 255,
      (lastHostNum >>> 16) & 255,
      (lastHostNum >>> 8) & 255,
      lastHostNum & 255
    ].join('.');
    
    const totalHosts = cidr >= 31 ? 0 : Math.pow(2, 32 - cidr) - 2;
    const usableHosts = totalHosts > 0 ? totalHosts : 0;
    
    // Binary string helper
    const toBinStr = (num: number) => {
      const s = (num >>> 0).toString(2).padStart(32, '0');
      return [s.slice(0, 8), s.slice(8, 16), s.slice(16, 24), s.slice(24, 32)].join('.');
    };
    
    return {
      success: true,
      netmask: maskStr,
      wildcard: wildcardStr,
      network: netStr,
      broadcast: bcStr,
      firstHost: firstHostStr,
      lastHost: lastHostStr,
      usableHosts,
      binaryIp: toBinStr(ipNum),
      binaryMask: toBinStr(maskNum),
      binaryNet: toBinStr(netNum),
      binaryBc: toBinStr(bcNum)
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Simulated VLAN Hosts
interface VlanHost {
  id: string;
  name: string;
  mac: string;
  ip: string;
  vlanId: number;
}

// Simulated Switch Port
interface SwitchPort {
  id: number;
  name: string;
  status: 'connected' | 'empty' | 'err-disable';
  speed: '10M' | '100M' | '1G' | '10G';
  poeEnabled: boolean;
  poeWattage: number; // in watts
  cableLength: number; // in meters
  crcErrors: number;
  noiseLevel: 'Low' | 'Medium' | 'High';
  portSecurity: boolean;
  assignedDevice?: string;
}

export default function NetworkEnterpriseTools() {
  const [activeTab, setActiveTab] = useState<'subnetting' | 'vlans' | 'switch_mapper' | 'tdr_cable'>('subnetting');

  // ----------------------------------------------------
  // TAB 4: HIGH-PRECISION TDR CABLE MEASUREMENT SUITE
  // ----------------------------------------------------
  const [cableType, setCableType] = useState<string>('cat6');
  const [nvpBase, setNvpBase] = useState<number>(0.68);
  const [loopResistanceBase, setLoopResistanceBase] = useState<number>(176);
  const [measurementMode, setMeasurementMode] = useState<'tdr' | 'resistance'>('tdr');
  const [roundtripTimeNs, setRoundtripTimeNs] = useState<number>(350);
  const [measuredOhms, setMeasuredOhms] = useState<number>(30.8);
  const [temperatureC, setTemperatureC] = useState<number>(25);
  const [clockJitterNs, setClockJitterNs] = useState<number>(0.1);
  const [terminationType, setTerminationType] = useState<'open' | 'short' | 'terminated'>('open');

  useEffect(() => {
    switch (cableType) {
      case 'cat5e':
        setNvpBase(0.65);
        setLoopResistanceBase(188);
        break;
      case 'cat6':
        setNvpBase(0.68);
        setLoopResistanceBase(176);
        break;
      case 'cat6a':
        setNvpBase(0.70);
        setLoopResistanceBase(165);
        break;
      case 'cat7':
        setNvpBase(0.74);
        setLoopResistanceBase(150);
        break;
      case 'coax':
        setNvpBase(0.82);
        setLoopResistanceBase(82);
        break;
      case 'sm_fiber':
        setNvpBase(0.67);
        setLoopResistanceBase(0);
        break;
      case 'mm_fiber':
        setNvpBase(0.66);
        setLoopResistanceBase(0);
        break;
      default:
        break;
    }
  }, [cableType]);

  const tdrCalculations = useMemo(() => {
    const SPEED_OF_LIGHT = 299792458; // m/s
    const SPEED_OF_LIGHT_M_NS = 0.299792458; // m/ns

    const isFiber = cableType.includes('fiber');
    const tempDriftCoeff = isFiber ? 0.00002 : 0.0002;
    const correctedNvp = nvpBase * (1 - tempDriftCoeff * (temperatureC - 20));

    const signalSpeedM_S = SPEED_OF_LIGHT * correctedNvp;
    const signalSpeedM_NS = SPEED_OF_LIGHT_M_NS * correctedNvp;
    const signalSpeedKm_S = signalSpeedM_S / 1000;

    let distanceMeters = 0;
    let marginOfErrorMeters = 0;
    let loopResistanceCalculated = 0;

    if (measurementMode === 'tdr') {
      distanceMeters = (signalSpeedM_NS * roundtripTimeNs) / 2;
      marginOfErrorMeters = (signalSpeedM_NS * clockJitterNs) / 2;
      if (loopResistanceBase > 0) {
        loopResistanceCalculated = (distanceMeters * 2 * (loopResistanceBase / 1000));
      }
    } else {
      if (loopResistanceBase > 0) {
        distanceMeters = (measuredOhms * 1000) / (2 * loopResistanceBase);
        marginOfErrorMeters = (0.05 * 1000) / (2 * loopResistanceBase);
        loopResistanceCalculated = measuredOhms;
      }
    }

    return {
      correctedNvp: parseFloat(correctedNvp.toFixed(4)),
      signalSpeedM_NS: parseFloat(signalSpeedM_NS.toFixed(6)),
      signalSpeedKm_S: Math.round(signalSpeedKm_S),
      distanceMeters: parseFloat(distanceMeters.toFixed(3)),
      marginOfErrorMeters: parseFloat(marginOfErrorMeters.toFixed(3)),
      loopResistanceCalculated: parseFloat(loopResistanceCalculated.toFixed(2)),
      roundtripNsCalculated: measurementMode === 'resistance' ? Math.round((distanceMeters * 2) / signalSpeedM_NS) : roundtripTimeNs
    };
  }, [cableType, nvpBase, loopResistanceBase, measurementMode, roundtripTimeNs, measuredOhms, temperatureC, clockJitterNs]);

  // ----------------------------------------------------
  // TAB 1: SUBNETTING STATES
  // ----------------------------------------------------
  const [subnetIp, setSubnetIp] = useState('192.168.1.0');
  const [subnetCidr, setSubnetCidr] = useState(24);
  const [subnetResults, setSubnetResults] = useState<any>(calculateSubnetDetails('192.168.1.0', 24));

  const handleSubnetCalculate = () => {
    const res = calculateSubnetDetails(subnetIp, subnetCidr);
    setSubnetResults(res);
  };

  // Recommended architecture segments preview
  const recommendedSubnets = [
    { name: "VLAN 10 - Gestión e Infraestructura", cidr: 27, purpose: "IPs para APs, switches y firewalls" },
    { name: "VLAN 20 - Empleados y Estaciones", cidr: 24, purpose: "Computadores de personal corporativo" },
    { name: "VLAN 30 - Servidores Críticos", cidr: 26, purpose: "Bases de datos, Almacenamiento NAS y Directorios" },
    { name: "VLAN 40 - Telefonía IP y Voz", cidr: 25, purpose: "Terminales VoIP con QoS de baja latencia" },
    { name: "VLAN 50 - Cámaras y IoT", cidr: 26, purpose: "CCTV, controles biométricos de acceso" },
    { name: "VLAN 90 - Invitados (Aislada)", cidr: 23, purpose: "Conexión a Internet externa sin acceso LAN" }
  ];

  // ----------------------------------------------------
  // TAB 2: VLAN SIMULATOR STATES
  // ----------------------------------------------------
  const [vlanHosts, setVlanHosts] = useState<VlanHost[]>([
    { id: '1', name: 'PC Contabilidad (VLAN 20)', mac: '00:1E:C9:AA:11:54', ip: '192.168.20.15', vlanId: 20 },
    { id: '2', name: 'Servidor Financiero (VLAN 30)', mac: '00:1E:C9:BB:22:90', ip: '192.168.30.5', vlanId: 30 },
    { id: '3', name: 'Teléfono VoIP Recepción (VLAN 40)', mac: '00:1E:C9:CC:33:41', ip: '192.168.40.21', vlanId: 40 },
    { id: '4', name: 'Cámara IoT Entrada (VLAN 50)', mac: '00:1E:C9:DD:44:82', ip: '192.168.50.8', vlanId: 50 },
    { id: '5', name: 'Laptop Gerente (VLAN 20)', mac: '00:1E:C9:EE:55:10', ip: '192.168.20.18', vlanId: 20 },
    { id: '6', name: 'Laptop Visita (VLAN 90)', mac: '00:1E:C9:FF:66:D1', ip: '192.168.90.101', vlanId: 90 }
  ]);

  const [enableInterVlan, setEnableInterVlan] = useState(false);
  const [pingSrc, setPingSrc] = useState('1');
  const [pingDest, setPingDest] = useState('2');
  const [pingStatus, setPingStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [pingLogs, setPingLogs] = useState<string[]>([]);

  const runVlanPing = () => {
    const srcHost = vlanHosts.find(h => h.id === pingSrc);
    const destHost = vlanHosts.find(h => h.id === pingDest);
    
    if (!srcHost || !destHost) return;

    setPingStatus('running');
    setPingLogs([
      `Iniciando ping interactivo de pruebas L2...`,
      `ORIGEN: ${srcHost.name} (IP: ${srcHost.ip}, MAC: ${srcHost.mac}, VLAN: ${srcHost.vlanId})`,
      `DESTINO: ${destHost.name} (IP: ${destHost.ip}, MAC: ${destHost.mac}, VLAN: ${destHost.vlanId})`,
      `Solicitud ARP de difusión para resolver la MAC de ${destHost.ip}...`
    ]);

    setTimeout(() => {
      const logs = [];
      const sameVlan = srcHost.vlanId === destHost.vlanId;
      
      if (sameVlan) {
        logs.push(`✔ ARP resuelto en la misma VLAN [VLAN ${srcHost.vlanId}]. Broadcast contenido dentro del dominio L2.`);
        logs.push(`Enviando trama ICMP Echo Request directamente a nivel de conmutador (Switch L2)...`);
        logs.push(`Respuesta de ${destHost.ip}: bytes=32 tiempo=1.2ms TTL=64`);
        logs.push(`Respuesta de ${destHost.ip}: bytes=32 tiempo=0.9ms TTL=64`);
        logs.push(`✔ PRUEBA COMPLETADA: Tráfico directo de capa 2 exitoso sin pasar por router de gateway.`);
        setPingLogs(prev => [...prev, ...logs]);
        setPingStatus('success');
      } else {
        logs.push(`⚠️ Alerta: Destino está en una red distinta (VLAN ${destHost.vlanId} vs VLAN ${srcHost.vlanId}).`);
        logs.push(`La trama de broadcast ARP de origen no puede atravesar el límite de la VLAN.`);
        logs.push(`Enviando trama al Gateway Predeterminado (Router de Borde)...`);
        
        if (enableInterVlan) {
          logs.push(`ℹ Enlace troncal 802.1Q activo en el Gateway. Inter-VLAN Routing (Router-on-a-Stick) está HABILITADO.`);
          logs.push(`Gateway desempaqueta etiqueta VLAN ${srcHost.vlanId}, rutea el paquete a la interfaz virtual de VLAN ${destHost.vlanId} y vuelve a etiquetar.`);
          logs.push(`Respuesta de ${destHost.ip}: bytes=32 tiempo=4.5ms (Enrutamiento L3 activo) TTL=63`);
          logs.push(`Respuesta de ${destHost.ip}: bytes=32 tiempo=4.1ms (Enrutamiento L3 activo) TTL=63`);
          logs.push(`✔ PRUEBA COMPLETADA: Enrutamiento inter-vlan exitoso a través de gateway L3.`);
          setPingLogs(prev => [...prev, ...logs]);
          setPingStatus('success');
        } else {
          logs.push(`❌ El Gateway rechaza o no conoce ruta inter-vlan para VLAN ${destHost.vlanId} (Inter-VLAN Routing DESACTIVADO).`);
          logs.push(`Trama descartada. Límite de seguridad estricto a nivel de Capa 2 intacto.`);
          logs.push(`Tiempo de espera agotado para la solicitud.`);
          logs.push(`❌ FALLO DE CONEXIÓN: Host de VLAN ${srcHost.vlanId} está aislado por seguridad de VLAN ${destHost.vlanId}.`);
          setPingLogs(prev => [...prev, ...logs]);
          setPingStatus('failed');
        }
      }
    }, 1500);
  };

  const updateHostVlan = (id: string, newVlan: number) => {
    setVlanHosts(prev => prev.map(host => {
      if (host.id === id) {
        // Automatically adjust IP dynamically for visual demonstration of subnet coherence
        const baseOctet = newVlan;
        const lastOctet = host.ip.split('.').pop();
        return {
          ...host,
          vlanId: newVlan,
          ip: `192.168.${baseOctet}.${lastOctet}`
        };
      }
      return host;
    }));
  };

  // ----------------------------------------------------
  // TAB 3: PHYS-L2 MANAGED SWITCH PORT MAPPER STATES
  // ----------------------------------------------------
  const [ports, setPorts] = useState<SwitchPort[]>([
    { id: 1, name: 'G0/1 (Enlace Troncal Router)', status: 'connected', speed: '10G', poeEnabled: false, poeWattage: 0, cableLength: 8, crcErrors: 0, noiseLevel: 'Low', portSecurity: false },
    { id: 2, name: 'Fa0/2 (Cámara Domo IoT)', status: 'connected', speed: '100M', poeEnabled: true, poeWattage: 12.4, cableLength: 74, crcErrors: 2, noiseLevel: 'Low', portSecurity: true, assignedDevice: 'Cámara CCTV' },
    { id: 3, name: 'Fa0/3 (PC Recepción)', status: 'connected', speed: '1G', poeEnabled: false, poeWattage: 0, cableLength: 22, crcErrors: 0, noiseLevel: 'Low', portSecurity: false, assignedDevice: 'Recepción PC' },
    { id: 4, name: 'Fa0/4 (Puerto Pasillo Expuesto)', status: 'err-disable', speed: '100M', poeEnabled: false, poeWattage: 0, cableLength: 50, crcErrors: 0, noiseLevel: 'Medium', portSecurity: true, assignedDevice: 'Intruso Bloqueado' },
    { id: 5, name: 'Fa0/5 (Servidor NAS)', status: 'connected', speed: '10G', poeEnabled: false, poeWattage: 0, cableLength: 3, crcErrors: 0, noiseLevel: 'Low', portSecurity: true, assignedDevice: 'NAS Almacenamiento' },
    { id: 6, name: 'Fa0/6 (Teléfono IP Voz)', status: 'connected', speed: '100M', poeEnabled: true, poeWattage: 6.8, cableLength: 41, crcErrors: 1, noiseLevel: 'Low', portSecurity: false, assignedDevice: 'Teléfono VoIP' },
    { id: 7, name: 'Fa0/7 (Punto de Acceso Wifi)', status: 'connected', speed: '1G', poeEnabled: true, poeWattage: 15.2, cableLength: 85, crcErrors: 14, noiseLevel: 'High', portSecurity: false, assignedDevice: 'AP Techo Central' },
    { id: 8, name: 'Fa0/8 (Puerto Libre Vacío)', status: 'empty', speed: '1G', poeEnabled: false, poeWattage: 0, cableLength: 0, crcErrors: 0, noiseLevel: 'Low', portSecurity: false },
    { id: 9, name: 'Fa0/9 (PC Contabilidad)', status: 'connected', speed: '1G', poeEnabled: false, poeWattage: 0, cableLength: 35, crcErrors: 0, noiseLevel: 'Low', portSecurity: false, assignedDevice: 'Contabilidad' },
    { id: 10, name: 'Fa0/10 (Puerto Libre Vacío)', status: 'empty', speed: '1G', poeEnabled: false, poeWattage: 0, cableLength: 0, crcErrors: 0, noiseLevel: 'Low', portSecurity: false },
    { id: 11, name: 'Fa0/11 (Cámara Domo Estacionamiento)', status: 'connected', speed: '100M', poeEnabled: true, poeWattage: 11.5, cableLength: 120, crcErrors: 45, noiseLevel: 'High', portSecurity: true, assignedDevice: 'CCTV Parking' },
    { id: 12, name: 'Fa0/12 (Puerto Libre Vacío)', status: 'empty', speed: '1G', poeEnabled: false, poeWattage: 0, cableLength: 0, crcErrors: 0, noiseLevel: 'Low', portSecurity: false }
  ]);

  const [selectedPortId, setSelectedPortId] = useState<number | null>(2);

  const selectedPort = useMemo(() => {
    return ports.find(p => p.id === selectedPortId);
  }, [ports, selectedPortId]);

  // PoE calculation values
  const currentPoETotal = useMemo(() => {
    return Number(ports.reduce((acc, p) => acc + (p.status === 'connected' ? p.poeWattage : 0), 0).toFixed(1));
  }, [ports]);

  const poeBudgetLimit = 120; // 120 Watts PoE Switch budget

  const handleTogglePoE = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        const nextEnabled = !p.poeEnabled;
        return {
          ...p,
          poeEnabled: nextEnabled,
          poeWattage: nextEnabled ? parseFloat((8 + Math.random() * 8).toFixed(1)) : 0
        };
      }
      return p;
    }));
  };

  const handleTogglePortSecurity = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        return {
          ...p,
          portSecurity: !p.portSecurity
        };
      }
      return p;
    }));
  };

  const handlePowerCyclePoE = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        return { ...p, poeWattage: 0 };
      }
      return p;
    }));
    setTimeout(() => {
      setPorts(prev => prev.map(p => {
        if (p.id === portId && p.poeEnabled) {
          return { ...p, poeWattage: parseFloat((8 + Math.random() * 8).toFixed(1)), crcErrors: 0 };
        }
        return p;
      }));
    }, 1200);
  };

  const handleInduceCrcError = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        return {
          ...p,
          crcErrors: p.crcErrors + 15,
          noiseLevel: 'High'
        };
      }
      return p;
    }));
  };

  const handleResetErrDisable = (portId: number) => {
    setPorts(prev => prev.map(p => {
      if (p.id === portId) {
        return {
          ...p,
          status: 'connected',
          crcErrors: 0
        };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6 animate-slide-up" id="network-enterprise-tools-suite">
      
      {/* HEADER HERO */}
      <div className="bg-slate-950/40 border border-slate-800/80 backdrop-blur-md p-6 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/25 text-cyan-400 shadow-md">
              <Layers className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                Herramientas Avanzadas e Infraestructura L2/L3
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Planifica subredes corporativas, simula políticas de conmutación de VLANs y monitorea la salud física de puertos gestionados.
              </p>
            </div>
          </div>
          
          {/* TAB SELECT BUTTONS */}
          <div className="flex bg-slate-950/80 border border-slate-900/80 p-1 rounded-lg text-xs font-mono self-start xl:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('subnetting')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer font-bold flex items-center gap-1.5 duration-300 ${
                activeTab === 'subnetting' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Subnetting CIDR
            </button>
            <button
              onClick={() => setActiveTab('vlans')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer font-bold flex items-center gap-1.5 duration-300 ${
                activeTab === 'vlans' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              Simulador VLAN
            </button>
            <button
              onClick={() => setActiveTab('switch_mapper')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer font-bold flex items-center gap-1.5 duration-300 ${
                activeTab === 'switch_mapper' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              Switch PoE & L2 Ports
            </button>
            <button
              onClick={() => setActiveTab('tdr_cable')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer font-bold flex items-center gap-1.5 duration-300 ${
                activeTab === 'tdr_cable' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
              }`}
            >
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
              Cables y TDR de Precisión
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SUBNETTING CIDR CALCULATOR & ARCHITECTURE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'subnetting' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="subnetting-tab-area">
          {/* CONTROL BOX */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-5 rounded-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Calculadora de Red
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Analiza instantáneamente cualquier segmento IPv4 para obtener información de enrutamiento.
                </p>
              </div>

              {/* INPUTS */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase font-mono mb-1.5">IP de Red o Host</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-sm py-2 px-3 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500"
                    value={subnetIp}
                    onChange={(e) => setSubnetIp(e.target.value)}
                    placeholder="ej: 192.168.1.0"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Máscara CIDR (/{subnetCidr})</label>
                    <span className="text-xs font-bold text-cyan-400">/{subnetCidr}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="32"
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    value={subnetCidr}
                    onChange={(e) => setSubnetCidr(parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                    <span>/1 (WAN)</span>
                    <span>/24 (LAN)</span>
                    <span>/32 (Host)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubnetCalculate}
                className="w-full bg-cyan-500 text-slate-950 py-2 rounded-xs font-semibold hover:bg-cyan-400 transition-colors text-xs font-sans cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Calcular Parámetros de Red</span>
              </button>
            </div>

            {/* QUICK PRESET BLOCKS */}
            <div className="mt-6 border-t border-slate-800 pt-4">
              <h4 className="text-[10px] font-bold font-mono uppercase text-slate-400 tracking-wider mb-2">Plantillas de Segmentación Útiles</h4>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <button 
                  onClick={() => { setSubnetIp('192.168.1.0'); setSubnetCidr(24); setTimeout(handleSubnetCalculate, 50); }}
                  className="bg-slate-950 border border-slate-800 text-slate-300 py-1 rounded-sm hover:border-cyan-500 cursor-pointer"
                >
                  C-Class /24
                </button>
                <button 
                  onClick={() => { setSubnetIp('10.0.0.0'); setSubnetCidr(16); setTimeout(handleSubnetCalculate, 50); }}
                  className="bg-slate-950 border border-slate-800 text-slate-300 py-1 rounded-sm hover:border-cyan-500 cursor-pointer"
                >
                  B-Class /16
                </button>
                <button 
                  onClick={() => { setSubnetIp('172.16.0.0'); setSubnetCidr(22); setTimeout(handleSubnetCalculate, 50); }}
                  className="bg-slate-950 border border-slate-800 text-slate-300 py-1 rounded-sm hover:border-cyan-500 cursor-pointer"
                >
                  Inter-VLAN /22
                </button>
              </div>
            </div>
          </div>

          {/* RESULTS BOX */}
          <div className="lg:col-span-2 space-y-6">
            {!subnetResults || !subnetResults.success ? (
              <div className="bg-red-950/15 border border-red-900/30 p-6 rounded-xs text-center text-red-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <h4 className="font-bold text-sm">Error en Cálculo</h4>
                <p className="text-xs mt-1">{subnetResults?.error || 'IP o CIDR inválido'}</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xs overflow-hidden">
                {/* HEAD DETAILS */}
                <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                      <HardDrive className="h-4 w-4 text-cyan-400" /> Parámetros IPv4 para {subnetIp}/{subnetCidr}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Resultado del parser de direccionamiento CIDR.</p>
                  </div>
                  <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/35 font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm">
                    {subnetResults.usableHosts.toLocaleString()} Hosts Útiles
                  </span>
                </div>

                {/* MATRIX OF STATS */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LEFT */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">IP Base Calculada:</span>
                      <span className="text-slate-200 font-semibold">{subnetIp}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Dirección de Red:</span>
                      <span className="text-cyan-400 font-semibold">{subnetResults.network}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Máscara de Red (Netmask):</span>
                      <span className="text-slate-200 font-semibold">{subnetResults.netmask}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Máscara Wildcard (Inversa):</span>
                      <span className="text-slate-400 italic">{subnetResults.wildcard}</span>
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Dirección de Broadcast:</span>
                      <span className="text-amber-400 font-semibold">{subnetResults.broadcast}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Primer IP de Host Útil:</span>
                      <span className="text-emerald-400 font-semibold">{subnetResults.firstHost}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Último IP de Host Útil:</span>
                      <span className="text-emerald-400 font-semibold">{subnetResults.lastHost}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-400">Capacidad Total de Subred:</span>
                      <span className="text-slate-300 font-bold">{subnetResults.usableHosts + 2} direcciones</span>
                    </div>
                  </div>
                </div>

                {/* BINARY MAP */}
                <div className="p-5 bg-slate-950/60 border-t border-slate-800 space-y-3 font-mono text-[10px]">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Representación Binaria Octal</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Dirección IP ({subnetIp})</span>
                        <span className="text-slate-500">32-bit Array</span>
                      </div>
                      <p className="bg-[#05070f] p-2 rounded-sm text-cyan-400 border border-slate-800/40 font-bold select-all overflow-x-auto whitespace-nowrap">
                        {subnetResults.binaryIp}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Máscara de Subred ({subnetResults.netmask})</span>
                        <span className="text-slate-500">Bits Activos (/{subnetCidr})</span>
                      </div>
                      <p className="bg-[#05070f] p-2 rounded-sm text-slate-300 border border-slate-800/40 font-bold select-all overflow-x-auto whitespace-nowrap">
                        {subnetResults.binaryMask}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>Segmento de Red resultante ({subnetResults.network})</span>
                        <span className="text-slate-500">Porción de Red fijada</span>
                      </div>
                      <p className="bg-[#05070f] p-2 rounded-sm text-emerald-400 border border-slate-800/40 font-bold select-all overflow-x-auto whitespace-nowrap">
                        {subnetResults.binaryNet}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECOMMENDED STRUCTURE (BENTO EXPANSION) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xs">
              <h3 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider mb-3">
                Diseño Arquitectónico Recomendado (Enterprise)
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Para redes profesionales de alto desempeño, se recomienda dividir un direccionamiento de clase C o B usando las siguientes plantillas de CIDR para minimizar el tráfico de broadcast en dominios aislados L2:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {recommendedSubnets.map((sub, i) => (
                  <div key={i} className="p-3 bg-slate-950 border border-slate-800/50 rounded-xs flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/20 px-1.5 py-0.2 rounded-sm border border-cyan-500/10">/{sub.cidr}</span>
                      <h4 className="font-bold text-slate-200 mt-1.5 font-sans">{sub.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 italic">{sub.purpose}</p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-400 flex justify-between">
                      <span>Hosts útiles: {Math.pow(2, 32 - sub.cidr) - 2} IPs</span>
                      <span className="text-emerald-400">Perfecto para L3 Switch</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: INTERACTIVE VLAN SIMULATOR (L2 ISOLATION) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'vlans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="vlans-tab-area">
          
          {/* CONTROL SWITCHBOARD */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Configuración de VLANs
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cambia las VLANs físicas de los hosts simulados para observar cómo se comportan los dominios de broadcast en L2.
                </p>
              </div>

              {/* LIST OF HOSTS & INTERACTIVE CHANGE */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Dispositivos en el Conmutador</h4>
                
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {vlanHosts.map(host => {
                    let vlanColor = "border-blue-500/30 text-blue-400 bg-blue-950/25";
                    if (host.vlanId === 30) vlanColor = "border-purple-500/30 text-purple-400 bg-purple-950/25";
                    if (host.vlanId === 40) vlanColor = "border-yellow-500/30 text-yellow-400 bg-yellow-950/25";
                    if (host.vlanId === 50) vlanColor = "border-red-500/30 text-red-400 bg-red-950/25";
                    if (host.vlanId === 90) vlanColor = "border-slate-500/30 text-slate-400 bg-slate-950/25";

                    return (
                      <div key={host.id} className="p-2.5 bg-slate-950 border border-slate-800/50 rounded-xs flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300 truncate block max-w-[170px]">{host.name}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm border font-bold ${vlanColor}`}>
                            VLAN {host.vlanId}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>IP: {host.ip}</span>
                          <span>MAC: {host.mac}</span>
                        </div>
                        
                        {/* CHANGE VLAN */}
                        <div className="flex items-center gap-1.5 mt-1 border-t border-slate-900 pt-1.5">
                          <span className="text-[9px] text-slate-500 font-mono">Cambiar VLAN:</span>
                          <div className="flex gap-1 flex-1 justify-end">
                            {[20, 30, 40, 50, 90].map(vid => (
                              <button
                                key={vid}
                                onClick={() => updateHostVlan(host.id, vid)}
                                className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono cursor-pointer transition-all ${
                                  host.vlanId === vid 
                                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                                }`}
                              >
                                {vid}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* INTER-VLAN ROUTING SWITCH */}
            <div className="mt-5 border-t border-slate-800 pt-4 space-y-3">
              <div className="flex justify-between items-center bg-slate-950 border border-slate-800/50 p-3 rounded-xs">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                    <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Inter-VLAN Routing
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">Enrutador de Borde (Router-on-a-stick) activo.</p>
                </div>
                <button
                  onClick={() => setEnableInterVlan(!enableInterVlan)}
                  className={`px-3 py-1 rounded-sm text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    enableInterVlan 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {enableInterVlan ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>
            </div>
          </div>

          {/* SIMULATION CONSOLE & PING DIAGRAM */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xs overflow-hidden flex flex-col justify-between">
            {/* TOP BAR */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Radio className="h-4 w-4 text-cyan-400 animate-pulse" /> Consola de Pruebas L2 ARP & ICMP
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Verifica si dos dispositivos pueden comunicarse según su VLAN.</p>
              </div>
            </div>

            {/* INTERACTIVE PING CONTROLS */}
            <div className="p-5 border-b border-slate-800/50 bg-slate-950/40 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1.5">Dispositivo Origen</label>
                <select
                  value={pingSrc}
                  onChange={(e) => setPingSrc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm p-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {vlanHosts.map(h => (
                    <option key={h.id} value={h.id}>{h.name} (VLAN {h.vlanId})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center py-2 md:py-0">
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-full text-slate-400 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 hidden md:block" />
                  <span className="text-[10px] font-mono md:hidden">Hacia</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1.5">Dispositivo Destino</label>
                <select
                  value={pingDest}
                  onChange={(e) => setPingDest(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm p-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {vlanHosts.map(h => (
                    <option key={h.id} value={h.id}>{h.name} (VLAN {h.vlanId})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <button
                  onClick={runVlanPing}
                  disabled={pingStatus === 'running'}
                  className="w-full bg-cyan-500 text-slate-950 font-semibold py-2.5 rounded-xs hover:bg-cyan-400 disabled:opacity-50 transition-colors cursor-pointer text-xs font-mono flex items-center justify-center gap-2"
                >
                  <Play className="h-3.5 w-3.5 fill-slate-950" />
                  <span>EJECUTAR PING INTERACTIVO DE RED</span>
                </button>
              </div>
            </div>

            {/* SCREEN CONSOLE LOGS */}
            <div className="p-5 flex-1 bg-slate-950 min-h-[220px] font-mono text-xs text-slate-300 flex flex-col justify-between">
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {pingLogs.length === 0 ? (
                  <div className="text-center py-16 text-slate-600 italic space-y-2">
                    <Terminal className="h-8 w-8 mx-auto text-slate-700" />
                    <p>Esperando ejecución de ping...</p>
                    <p className="text-[10px] text-slate-700 font-normal">Prueba a seleccionar dos equipos de diferentes VLANs para comprobar el aislamiento o enrutamiento.</p>
                  </div>
                ) : (
                  pingLogs.map((log, i) => {
                    let color = "text-slate-350";
                    if (log.startsWith('✔')) color = "text-emerald-400 font-bold";
                    if (log.startsWith('❌')) color = "text-red-400 font-bold";
                    if (log.startsWith('⚠️')) color = "text-amber-400";
                    if (log.startsWith('ℹ')) color = "text-cyan-400";
                    return (
                      <div key={i} className={`py-1 border-b border-slate-900/35 leading-relaxed ${color}`}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>

              {/* CONSOLE STATUS BLOCK */}
              <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between text-[10px] text-slate-500 items-center">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${pingStatus === 'running' ? 'bg-amber-500 animate-pulse' : pingStatus === 'success' ? 'bg-emerald-500' : pingStatus === 'failed' ? 'bg-red-500' : 'bg-slate-700'}`} />
                  Estado Terminal: {pingStatus.toUpperCase()}
                </span>
                <span>IEEE 802.1Q Frame Simulator</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: PHYS-L2 MANAGED SWITCH PORT MAPPER (PoE & CRC) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'switch_mapper' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="switch-mapper-tab-area">
          
          {/* THE PHYSICAL SWITCH COMPONENT */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Server className="h-4 w-4 text-cyan-400" /> Switch Gestionable PoE L2 (16 Puertos)
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Intercambiador administrable de tramas físicos. Selecciona un puerto para inspeccionarlo.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800/50 px-3 py-1 rounded-sm text-xs font-mono">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-slate-400">PoE Consumido:</span>
                <span className="text-white font-bold">{currentPoETotal}W</span>
                <span className="text-slate-600">/ {poeBudgetLimit}W Max</span>
              </div>
            </div>

            {/* PHYSICAL SWITCH FACEPLATE */}
            <div className="bg-gradient-to-b from-[#1e293b] to-slate-950 p-4 border-2 border-slate-800 rounded-sm shadow-inner relative">
              {/* BRANDING */}
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-3">
                <span className="font-bold text-slate-400">REDMONITOR MULTIGIGABIT PoE SWITCH</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  STP Root Bridge • Active
                </span>
              </div>

              {/* PORTS GRID LAYOUT */}
              <div className="grid grid-cols-6 gap-3.5">
                {ports.map(p => {
                  const isSelected = p.id === selectedPortId;
                  
                  let portBg = "bg-slate-950 border-slate-800 text-slate-600";
                  if (p.status === 'connected') {
                    portBg = p.poeWattage > 0 
                      ? "bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-sm" 
                      : "bg-emerald-950/20 border-emerald-500/40 text-emerald-300";
                  } else if (p.status === 'err-disable') {
                    portBg = "bg-red-950/20 border-red-500/40 text-red-300 animate-pulse";
                  }

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPortId(p.id)}
                      className={`h-16 rounded-xs border-2 flex flex-col justify-between p-1.5 transition-all cursor-pointer relative ${portBg} ${
                        isSelected ? 'ring-2 ring-cyan-400 scale-[1.03] z-10' : 'hover:border-slate-500'
                      }`}
                    >
                      {/* Port LED Indicator */}
                      <div className="flex justify-between items-center w-full">
                        <span className={`w-2 h-2 rounded-full ${
                          p.status === 'connected' 
                            ? (p.poeWattage > 0 ? 'bg-amber-400 shadow-md shadow-amber-500' : 'bg-emerald-400 shadow-md shadow-emerald-500') 
                            : p.status === 'err-disable' 
                              ? 'bg-red-500 animate-ping' 
                              : 'bg-slate-850'
                        }`} />
                        <span className="text-[8px] font-bold text-slate-400 font-mono">#{p.id}</span>
                      </div>

                      {/* Port Label */}
                      <span className="text-[9px] font-mono font-bold leading-none select-none text-left truncate w-full">
                        {p.status === 'connected' ? p.speed : p.status === 'err-disable' ? 'SEC' : 'EMPTY'}
                      </span>

                      {/* PoE icon on port face */}
                      {p.poeEnabled && p.status === 'connected' && (
                        <Zap className="h-3 w-3 text-amber-400 absolute right-1.5 bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* BEZEL CORNERS */}
              <div className="flex justify-between mt-4 text-[8px] font-mono text-slate-600">
                <span>Console Port (RJ45-Serial)</span>
                <span>Power Supply: 120W Max Inline Bypass</span>
              </div>
            </div>

            {/* SWITCH STATS & POE BAR PROGRESS */}
            <div className="p-4 bg-slate-950 rounded-xs border border-slate-800/50 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Presupuesto PoE Asignado ({currentPoETotal}W)</span>
                <span>Límite del Switch: {poeBudgetLimit}W</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (currentPoETotal / poeBudgetLimit) > 0.85 
                      ? 'bg-red-500' 
                      : (currentPoETotal / poeBudgetLimit) > 0.6 
                        ? 'bg-amber-500' 
                        : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min((currentPoETotal / poeBudgetLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Modulación PoE Clase 3 / Clase 4 Soportado</span>
                <span>{(poeBudgetLimit - currentPoETotal).toFixed(1)}W Remanente</span>
              </div>
            </div>
          </div>

          {/* REAL-TIME PORT DETAIL & DIAGNOSTIC CARD */}
          <div className="lg:col-span-4 space-y-6">
            {!selectedPort ? (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xs text-center text-slate-500">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Selecciona un puerto físico del switch para ver su telemetría en tiempo real.</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xs overflow-hidden flex flex-col justify-between h-full">
                {/* HEADER DETAILS */}
                <div className="bg-slate-950 px-5 py-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                    <Terminal className="h-4 w-4 text-cyan-400" /> Detalle de Interfaz {selectedPort.name.split(' ')[0]}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{selectedPort.name}</p>
                </div>

                {/* STATS */}
                <div className="p-5 space-y-3.5 font-mono text-xs flex-1">
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Estado de Enlace:</span>
                    <span className={`font-bold ${
                      selectedPort.status === 'connected' 
                        ? 'text-emerald-400' 
                        : selectedPort.status === 'err-disable' 
                          ? 'text-red-400 animate-pulse' 
                          : 'text-slate-500'
                    }`}>
                      {selectedPort.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Velocidad Negociada:</span>
                    <span className="text-slate-200 font-semibold">{selectedPort.status === 'connected' ? selectedPort.speed : 'N/A'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">PoE Remoto (Wattage):</span>
                    <span className="text-amber-400 font-semibold">{selectedPort.poeEnabled ? `${selectedPort.poeWattage}W` : 'DESACTIVADO'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Longitud de Cable (TDR):</span>
                    <span className="text-slate-200">{selectedPort.status === 'connected' ? `${selectedPort.cableLength} metros` : '0 metros'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Errores CRC de Trama:</span>
                    <span className={`font-semibold ${selectedPort.crcErrors > 10 ? 'text-red-400' : 'text-slate-300'}`}>
                      {selectedPort.crcErrors} errores
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Filtro Port Security:</span>
                    <span className={`font-bold ${selectedPort.portSecurity ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {selectedPort.portSecurity ? 'ACTIVO (Secure)' : 'INACTIVO'}
                    </span>
                  </div>

                  {selectedPort.assignedDevice && (
                    <div className="p-2.5 bg-slate-950 rounded border border-slate-800/50 mt-3">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Dispositivo Detectado (LLDP)</span>
                      <span className="text-xs text-cyan-400 font-bold block mt-0.5">{selectedPort.assignedDevice}</span>
                    </div>
                  )}
                </div>

                {/* OPERATIONS BUTTONS PANEL */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                    {/* Toggle PoE */}
                    <button
                      onClick={() => handleTogglePoE(selectedPort.id)}
                      className="px-2 py-1.5 rounded-sm bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium transition-all text-center cursor-pointer"
                    >
                      {selectedPort.poeEnabled ? 'Apagar PoE' : 'Encender PoE'}
                    </button>

                    {/* Port Security Toggle */}
                    <button
                      onClick={() => handleTogglePortSecurity(selectedPort.id)}
                      className="px-2 py-1.5 rounded-sm bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium transition-all text-center cursor-pointer"
                    >
                      {selectedPort.portSecurity ? 'Desactivar Security' : 'Activar Security'}
                    </button>
                  </div>

                  {/* Power cycle PoE */}
                  {selectedPort.poeEnabled && (
                    <button
                      onClick={() => handlePowerCyclePoE(selectedPort.id)}
                      className="w-full px-2 py-1.5 rounded-sm bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all text-center cursor-pointer font-sans"
                    >
                      Reiniciar Potencia PoE (Power Cycle)
                    </button>
                  )}

                  {/* Induce CRC Flood Error for physical testing demonstration */}
                  {selectedPort.status === 'connected' && (
                    <button
                      onClick={() => handleInduceCrcError(selectedPort.id)}
                      className="w-full px-2 py-1.5 rounded-sm bg-red-950/20 border border-red-900/35 hover:bg-red-950/45 text-red-400 font-medium transition-all text-center cursor-pointer font-sans"
                    >
                      Inundar con Errores CRC (Falla física)
                    </button>
                  )}

                  {/* Reset err-disable */}
                  {selectedPort.status === 'err-disable' && (
                    <button
                      onClick={() => handleResetErrDisable(selectedPort.id)}
                      className="w-full px-2 py-2 rounded-sm bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-450 transition-all text-center cursor-pointer font-sans"
                    >
                      Restablecer Puerto (err-disable reset)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: HIGH-PRECISION TDR CABLE MEASUREMENT SUITE  */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'tdr_cable' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up" id="tdr-tab-area">
          {/* COL 1: CONFIGURATION */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Configuración de Medición TDR
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Establece las constantes físicas del cable para obtener una distancia con precisión milimétrica basada en reflectometría de tiempo o resistencia eléctrica de bucle.
                </p>
              </div>

              {/* CABLE TYPE SELECTOR */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase font-mono">Tipo de Medio / Estándar</label>
                <select
                  value={cableType}
                  onChange={(e) => setCableType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm p-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
                >
                  <option value="cat5e">Categoría 5e UTP/FTP (Cobre • NVP ~0.65)</option>
                  <option value="cat6">Categoría 6 UTP (Cobre Puro • NVP ~0.68)</option>
                  <option value="cat6a">Categoría 6A F/UTP (Blindado • NVP ~0.70)</option>
                  <option value="cat7">Categoría 7 S/FTP (Super Blindado • NVP ~0.74)</option>
                  <option value="coax">Coaxial RG-6 Dual Shield (NVP ~0.82)</option>
                  <option value="sm_fiber">Fibra Óptica Monomodo G.652 (NVP ~0.67)</option>
                  <option value="mm_fiber">Fibra Óptica Multimodo OM3 (NVP ~0.66)</option>
                </select>
              </div>

              {/* MEASUREMENT MODE SELECTOR */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase font-mono">Método de Diagnóstico</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    onClick={() => setMeasurementMode('tdr')}
                    className={`py-1.5 rounded-sm border text-center font-bold cursor-pointer transition-all ${
                      measurementMode === 'tdr'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    TDR (Tiempo de Vuelo)
                  </button>
                  <button
                    onClick={() => setMeasurementMode('resistance')}
                    disabled={cableType.includes('fiber')}
                    className={`py-1.5 rounded-sm border text-center font-bold cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      measurementMode === 'resistance'
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Resistencia de Bucle
                  </button>
                </div>
                {cableType.includes('fiber') && (
                  <p className="text-[9px] text-amber-500/80 italic font-mono">
                    * La fibra óptica no conduce electricidad; el modo resistencia de bucle está inhabilitado.
                  </p>
                )}
              </div>

              {/* DYNAMIC PARAMETER ACCORDING TO MODE */}
              {measurementMode === 'tdr' ? (
                <div className="space-y-4 pt-2">
                  {/* ROUNDTRIP TIME */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Tiempo de Retorno (Ida y Vuelta)</label>
                      <span className="text-xs font-bold text-cyan-400 font-mono">{roundtripTimeNs} ns</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      step="5"
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      value={roundtripTimeNs}
                      onChange={(e) => setRoundtripTimeNs(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>10 ns (~1m)</span>
                      <span>1000 ns (~100m)</span>
                      <span>2000 ns (~200m)</span>
                    </div>
                  </div>

                  {/* CLOCK JITTER / MEASUREMENT RESOLUTION */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Resolución de Reloj TDR</label>
                      <span className="text-xs font-bold text-slate-300 font-mono">±{clockJitterNs} ns</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                      value={clockJitterNs}
                      onChange={(e) => setClockJitterNs(parseFloat(e.target.value))}
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>±0.05 ns (Laboratorio)</span>
                      <span>±0.2 ns (Certificador Fluke)</span>
                      <span>±1.0 ns (Estándar)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* MEASURED RESISTANCE */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Resistencia de Bucle Medida</label>
                      <span className="text-xs font-bold text-cyan-400 font-mono">{measuredOhms} Ω</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="300"
                      step="0.5"
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      value={measuredOhms}
                      onChange={(e) => setMeasuredOhms(parseFloat(e.target.value))}
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>1 Ω (~3m)</span>
                      <span>150 Ω (~420m)</span>
                      <span>300 Ω (~850m)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ENVIRONMENTAL TEMPERATURE */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Temperatura de Operación</label>
                  <span className="text-xs font-bold text-amber-400 font-mono">{temperatureC}°C</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="80"
                  step="1"
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>-20°C (Frío Extremo)</span>
                  <span>20°C (Estándar IEC)</span>
                  <span>80°C (Pleno Sol / Ducto)</span>
                </div>
              </div>

              {/* TERMINATION STATE */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase font-mono">Estado de Terminación (Fin de Línea)</label>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setTerminationType('open')}
                    className={`py-1.5 rounded-sm border text-center font-bold cursor-pointer transition-all ${
                      terminationType === 'open'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Abierto / Corte
                  </button>
                  <button
                    onClick={() => setTerminationType('short')}
                    className={`py-1.5 rounded-sm border text-center font-bold cursor-pointer transition-all ${
                      terminationType === 'short'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Cortocircuito
                  </button>
                  <button
                    onClick={() => setTerminationType('terminated')}
                    className={`py-1.5 rounded-sm border text-center font-bold cursor-pointer transition-all ${
                      terminationType === 'terminated'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Acoplado (Ok)
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK FORMULA CARD */}
            <div className="mt-5 border-t border-slate-800 pt-4 text-[10px] font-mono text-slate-400 space-y-2">
              <span className="text-cyan-400 font-bold block uppercase tracking-wider text-[9px]">Fórmulas de Precisión Utilizadas:</span>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/40 space-y-1.5">
                <p>
                  <span className="text-slate-300 font-semibold">TDR:</span> <code className="text-yellow-400">D = (c × NVP × t) / 2</code>
                </p>
                <p>
                  <span className="text-slate-300 font-semibold">Deriva Térmica NVP:</span> <code className="text-yellow-400">NVP_corr = NVP_20C × (1 - α × (T - 20))</code>
                </p>
                <p>
                  <span className="text-slate-300 font-semibold">Resistencia:</span> <code className="text-yellow-400">D = (R_medida × 1000) / (2 × R_km)</code>
                </p>
              </div>
            </div>
          </div>

          {/* COL 2: HIGH-PRECISION RESULTS & OSCILLOSCOPE VISUALIZER */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xs overflow-hidden flex flex-col justify-between">
            {/* OSCILLOSCOPE MONITOR SCREEN */}
            <div className="bg-[#040810] border-b border-slate-800 p-5 flex flex-col justify-between h-full space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                    <Activity className="h-4 w-4 text-emerald-400 animate-pulse" /> Ecograma TDR de Alta Resolución
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Analizador físico de pulso en dominio de tiempo y fase.</p>
                </div>
                <div className="flex gap-2 text-[9px] font-mono">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-sm">
                    {measurementMode === 'tdr' ? 'MODO: TIEMPO' : 'MODO: RESISTENCIA'}
                  </span>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-sm">
                    TERMINACIÓN: {terminationType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* MONITOR SVG */}
              <div className="relative bg-[#02050a] border border-emerald-500/20 rounded-xs overflow-hidden py-2 shadow-inner">
                {/* GRID LINES BACKGROUND */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-6 pointer-events-none opacity-[0.03]">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className="border border-emerald-400" />
                  ))}
                </div>

                {/* SVG PLOTTING */}
                <svg
                  viewBox="0 0 500 130"
                  className="w-full h-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  fill="none"
                >
                  {/* Center Line (Scope baseline) */}
                  <line x1="0" y1="65" x2="500" y2="65" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,5" opacity="0.4" />

                  {/* Calculated X position of reflection based on distance or time */}
                  {(() => {
                    const mappedTime = Math.min(2000, tdrCalculations.roundtripNsCalculated);
                    const xEcho = 80 + (mappedTime / 2000) * 350;

                    // Build path
                    // Tx pulse: start at (0, 65) -> Flat to 15 -> rise to 30 -> drop to 65 at 45.
                    let pathD = `M 0 65 L 15 65 L 20 25 L 30 25 L 35 65 L ${xEcho - 10} 65`;

                    if (terminationType === 'open') {
                      // Positive reflection eco
                      pathD += ` L ${xEcho - 5} 65 L ${xEcho} 25 L ${xEcho + 10} 25 L ${xEcho + 15} 65 L 500 65`;
                    } else if (terminationType === 'short') {
                      // Negative reflection eco
                      pathD += ` L ${xEcho - 5} 65 L ${xEcho} 105 L ${xEcho + 10} 105 L ${xEcho + 15} 65 L 500 65`;
                    } else {
                      // Terminated properly, flat line to end
                      pathD += ` L 500 65`;
                    }

                    return (
                      <>
                        {/* Scope Signal Path */}
                        <path
                          d={pathD}
                          stroke={terminationType === 'short' ? '#f43f5e' : terminationType === 'terminated' ? '#3b82f6' : '#10b981'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Tx Label */}
                        <text x="25" y="115" fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                          Tx (Pulso)
                        </text>
                        <line x1="25" y1="65" x2="25" y2="102" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />

                        {/* Rx / Reflection Eco Label */}
                        {terminationType !== 'terminated' && (
                          <>
                            <text x={xEcho + 5} y={terminationType === 'short' ? 22 : 115} fill={terminationType === 'short' ? '#f43f5e' : '#10b981'} fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                              Rx (Eco)
                            </text>
                            <line x1={xEcho + 5} y1="65" x2={xEcho + 5} y2={terminationType === 'short' ? 30 : 102} stroke={terminationType === 'short' ? '#f43f5e' : '#10b981'} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                            {/* Dotted Vertical Cursor at reflection point */}
                            <line x1={xEcho + 5} y1="5" x2={xEcho + 5} y2="125" stroke="#eab308" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                            <text x={xEcho + 10} y="15" fill="#eab308" fontSize="8" fontFamily="monospace" opacity="0.9">
                              {tdrCalculations.distanceMeters} m
                            </text>
                          </>
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Scope UI status indicators */}
                <div className="flex justify-between px-3 mt-1.5 text-[8.5px] font-mono text-emerald-500/80 uppercase">
                  <span>CH1: 2.5V/div</span>
                  <span>TIMEBASE: {(tdrCalculations.roundtripNsCalculated / 10).toFixed(1)} ns/div</span>
                  <span>NVP COMP: {tdrCalculations.correctedNvp}</span>
                </div>
              </div>
            </div>

            {/* PRECISE DATA TILES SHEET */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 border-t border-slate-800/80">
              {/* DISTANCE METERS */}
              <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-sm">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Longitud Real</span>
                <span className="text-xl font-bold font-mono text-white block mt-1 tracking-tight">
                  {tdrCalculations.distanceMeters.toLocaleString()} m
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                  ~{(tdrCalculations.distanceMeters * 3.28084).toFixed(2)} ft (Pies)
                </span>
              </div>

              {/* SYSTEM UNCERTAINTY */}
              <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-sm">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Incertidumbre</span>
                <span className="text-xl font-bold font-mono text-cyan-400 block mt-1 tracking-tight">
                  ±{tdrCalculations.marginOfErrorMeters} m
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                  Precisión: {(100 - (tdrCalculations.marginOfErrorMeters / Math.max(1, tdrCalculations.distanceMeters)) * 100).toFixed(3)}%
                </span>
              </div>

              {/* PROPAGATION VELOCITY */}
              <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-sm">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Velocidad (V)</span>
                <span className="text-xl font-bold font-mono text-amber-400 block mt-1 tracking-tight">
                  {tdrCalculations.signalSpeedKm_S.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                  km/s • ({tdrCalculations.signalSpeedM_NS.toFixed(4)} m/ns)
                </span>
              </div>

              {/* LOOP RESISTANCE OR TRAVEL TIME */}
              <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-sm">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Resist. Estimada</span>
                <span className="text-xl font-bold font-mono text-slate-200 block mt-1 tracking-tight">
                  {tdrCalculations.loopResistanceCalculated > 0 ? `${tdrCalculations.loopResistanceCalculated} Ω` : 'N/A'}
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                  Tiempo total: {tdrCalculations.roundtripNsCalculated} ns
                </span>
              </div>
            </div>

            {/* TECHNICAL EDUCATION ACCORDION / EXPLANATION */}
            <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">¿Cómo lograr una precisión extrema al medir cables?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para conseguir una precisión centimétrica en la medición de cableado estructurado, fibra u coaxial, se deben aplicar tres factores esenciales:
              </p>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-slate-200">Ajustar el NVP exacto del fabricante:</strong> Cada cable tiene un <span className="italic text-cyan-400">Nominal Velocity of Propagation</span> único (por ejemplo, Cat6 sólido tiene ~0.68, multifilar ~0.65). Errar en un 1% de NVP provoca un error de 1 metro por cada 100 metros de cable.
                </li>
                <li>
                  <strong className="text-slate-200">Compensar la deriva por temperatura:</strong> A mayor temperatura, la velocidad de los electrones decrece. Los certificadores calibran el factor con un ajuste de <span className="text-amber-400">0.2% por cada 10°C</span> de desviación estándar (20°C).
                </li>
                <li>
                  <strong className="text-slate-200">Reducir el jitter del reloj físico:</strong> Un reloj interno del instrumento con resolución de <span className="text-slate-200">100 picosegundos (0.1 ns)</span> ofrece un límite teórico de incertidumbre física de solo <span className="text-cyan-400">±1.0 centímetros</span>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
