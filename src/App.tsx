import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, Activity, Cpu, Server, Search, RefreshCw, Sliders, Globe, Clock, 
  Settings, Layers, Wifi, AlertTriangle, XCircle, CheckCircle2, ChevronRight, 
  ChevronDown, Monitor, Copy, Plus, Play, Pause, ExternalLink, HelpCircle, 
  ShieldCheck, Info, Radio, Terminal, Brain, Sparkles, ShieldAlert, Lock, Unlock, Cable,
  Gauge, Menu, X, Shield, MapPin
} from 'lucide-react';

import { Device, Sensor, ScanStats, HistoryPoint } from './types';
import { generateFullSubnet, generateSensorsForDevices, INTERFACES_CONFIG } from './utils/simulation';
import { calculateSubnetDetails } from './utils/subnetMath';
import { resolveVendorByMac, resolveDeviceNameByMac, fetchVendorFromApi, isGenericVendor } from './utils/macUtils';
import MapSubred from './components/MapSubred';
import HistorialHosts from './components/HistorialHosts';
import DeviceTable from './components/DeviceTable';
import SensorTable from './components/SensorTable';
import TestingCenter from './components/TestingCenter';
import BandwidthMonitor from './components/BandwidthMonitor';
import NetworkAICopilot from './components/NetworkAICopilot';
import SpeedTest from './components/SpeedTest';
import NetworkAudit from './components/NetworkAudit';
import NetworkWiki from './components/NetworkWiki';
import EventLogger from './components/EventLogger';
import NetworkEnterpriseTools from './components/NetworkEnterpriseTools';
import NetworkAuthGate from './components/NetworkAuthGate';
import UserManagement, { AVAILABLE_FEATURES } from './components/UserManagement';
import TauriInstallerGuide from './components/TauriInstallerGuide';
import ConfigurationPanel from './components/ConfigurationPanel';
import OfflineLocationsManager, { LocationProfile } from './components/OfflineLocationsManager';

const extractSubnetFromIp = (ip: string): string => {
  const parts = ip.trim().split('.');
  if (parts.length === 4) {
    if (parts[0] === '172' && parts[1] === '17') {
      return '172.17.0.0/16';
    }
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return '';
};

const detectWebRTCLocalIP = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve(null);
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      
      let resolved = false;
      const done = (ip: string | null) => {
        if (!resolved) {
          resolved = true;
          try {
            pc.close();
          } catch (e) {}
          resolve(ip);
        }
      };

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          done(null);
          return;
        }
        const candidate = e.candidate.candidate;
        const ipRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
        const match = ipRegex.exec(candidate);
        if (match) {
          const ip = match[1];
          if (ip !== '0.0.0.0' && !ip.startsWith('127.') && !ip.startsWith('169.254.')) {
            done(ip);
          }
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => done(null));

      // Quick timeout fallback as many browsers mask or disable it for privacy reasons
      setTimeout(() => done(null), 1200);
    } catch {
      resolve(null);
    }
  });
};

export default function App() {
  // Authentication & session variables
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('netmonitor_auth_token') || null;
  });
  const [currentUser, setCurrentUser] = useState<{ username: string; fullName: string; role: 'admin' | 'auditor' } | null>(() => {
    const stored = localStorage.getItem('netmonitor_auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    const verifySession = async () => {
      if (!authToken) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/status', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          // Session expired or invalid
          setAuthToken(null);
          setCurrentUser(null);
          localStorage.removeItem('netmonitor_auth_token');
          localStorage.removeItem('netmonitor_auth_user');
        }
      } catch (err) {
        console.error("Error al verificar la sesión con el backend:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifySession();
  }, [authToken]);

  const handleAuthenticated = (token: string, user: { username: string; fullName: string; role: 'admin' | 'auditor' }) => {
    setAuthToken(token);
    setCurrentUser(user);
    localStorage.setItem('netmonitor_auth_token', token);
    localStorage.setItem('netmonitor_auth_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (e) {
        console.warn("No se pudo invalidar la sesión del backend:", e);
      }
    }
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('netmonitor_auth_token');
    localStorage.removeItem('netmonitor_auth_user');
    addAlert("🔓 Sesión de usuario finalizada correctamente.", "info");
  };

  // User physical / manual laptop IP override setup
  const [deviceManualIp, setDeviceManualIp] = useState<string>(() => {
    return localStorage.getItem('netmonitor_manual_ip') || '';
  });
  const [tempIpVal, setTempIpVal] = useState<string>(() => {
    return localStorage.getItem('netmonitor_manual_ip') || '';
  });
  const [isEditingRealIp, setIsEditingRealIp] = useState<boolean>(false);

  // Real internet / hardware link network status and physical cable simulator toggle
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(navigator.onLine);
  const [isCablePhysicallyConnected, setIsCablePhysicallyConnected] = useState<boolean>(true);
  
  const isNetworkOffline = !isBrowserOnline || !isCablePhysicallyConnected;

  // Refs to store interval handlers for safe mid-scan interruptions on link down
  const scanTimerRef = useRef<any>(null);
  const portScanTimerRef = useRef<any>(null);

  // Synchronize on/off-line state of the client browser
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      addAlert("🔌 Enlace de red detectado: El adaptador local vuelve a estar ONLINE.", "success");
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      addAlert("🔌 ENLACE FÍSICO CAÍDO: Tu adaptador de red (Cable o Wi-Fi) se ha desconectado físicamente.", "error");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor offline state and trigger network shutdown if disconnected
  useEffect(() => {
    if (isNetworkOffline) {
      // Direct action: If scanning we abort immediately!
      setIsScanning(prev => {
        if (prev) {
          addAlert("⚠️ Barrido ICMP abortado: El adaptador de red seleccionado perdió el enlace físico.", "error");
        }
        return false;
      });

      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      // Interrupt Port Scanning if any
      setPortScanStatus(prev => {
        if (prev === 'scanning') {
          addAlert("⚠️ Escaneo de puertos TCP interrumpido: Se requiere enlace de hardware.", "error");
          return 'idle';
        }
        return prev;
      });

      if (portScanTimerRef.current) {
        clearInterval(portScanTimerRef.current);
        portScanTimerRef.current = null;
      }

      // Force offline/down status across all mapped nodes
      setDevices(prev => prev.map(d => ({
        ...d,
        estado: 'Caído' as const,
        ping: null,
        consumoDownload: 0,
        consumoUpload: 0
      })));
    }
  }, [isNetworkOffline]);

  // General simulator state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('netmonitor_demo_mode') !== 'false';
  });
  const [includeVirtuals, setIncludeVirtuals] = useState<boolean>(false);
  const [subnetSegment, setSubnetSegment] = useState<string>('192.168.1.0/24');
  const [selectedInterface, setSelectedInterface] = useState<string>('Intel Wi-Fi 6E AX211 @ 802.11ax');
  const [serverInterfaces, setServerInterfaces] = useState<any[]>([]);
  const [isHostedInCloud, setIsHostedInCloud] = useState<boolean>(false);
  const [mobileAccessTab, setMobileAccessTab] = useState<'cloud' | 'local'>('cloud');
  const [isLocalHelpModalOpen, setIsLocalHelpModalOpen] = useState<boolean>(false);

  // Location States for Laptop Mobility Report Traceability
  const [locationName, setLocationName] = useState<string>(() => {
    return localStorage.getItem('netmonitor_current_location') || '';
  });
  const [showLocationModal, setShowLocationModal] = useState<boolean>(true);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);

  // Probe UI States
  const [probeTab, setProbeTab] = useState<'arp' | 'manual' | 'local'>('arp');
  const [arpPasteText, setArpPasteText] = useState<string>('');
  const [manualDevIp, setManualDevIp] = useState<string>('');
  const [manualDevName, setManualDevName] = useState<string>('');
  const [manualDevMac, setManualDevMac] = useState<string>('');
  const [manualDevVendor, setManualDevVendor] = useState<string>('');
  const [manualDevicesList, setManualDevicesList] = useState<any[]>(() => {
    const cached = localStorage.getItem('netmonitor_manual_devices');
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCloud = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      setIsHostedInCloud(isCloud);
      setMobileAccessTab(isCloud ? 'cloud' : 'local');
    }
  }, []);

  // Dynamically populated interface config listing real hardware and falling back to virtual / presets
  const activeInterfacesList = useMemo(() => {
    // 1. Simulated physical network adapters representing typical laptop/desktop network cards
    const simulatedHardwareList = INTERFACES_CONFIG.map(i => {
      let ip = "192.168.1.55";
      if (i.name.includes("Wi-Fi") || i.type === "Wi-Fi") {
        ip = "192.168.100.55";
      } else if (i.name.includes("Loopback") || i.type === "Virtual") {
        ip = "172.17.0.55";
      }

      // Keep dynamic manual laptop IP inside the chosen physical interface context
      let segments = [...i.segments];
      if (deviceManualIp) {
        const trimmed = deviceManualIp.trim();
        const customSeg = extractSubnetFromIp(trimmed);
        
        if (customSeg && !segments.includes(customSeg)) {
          segments = [customSeg, ...segments];
        }
        
        // Match base segment or first segment
        const activeSeg = subnetSegment || segments[0];
        if (customSeg === activeSeg) {
          ip = trimmed;
        } else if (segments.includes(customSeg)) {
          ip = trimmed;
        }
      }

      return {
        name: i.name,
        type: i.type,
        segments: segments,
        ip,
        mac: "84:C8:A0:BB:AB:66",
        netmask: "255.255.255.0",
        subnet: segments[0] || "192.168.1.0/24"
      };
    });

    // 2. Real hosting server interfaces
    const cloudServerList = (serverInterfaces || []).map(i => ({
      name: i.name,
      type: i.type,
      segments: i.segments,
      ip: i.ip,
      mac: i.mac,
      netmask: i.netmask,
      subnet: i.subnet
    }));

    const combined = [...simulatedHardwareList, ...cloudServerList];
    const uniqueList: any[] = [];
    const seenNames = new Set<string>();

    for (const item of combined) {
      let uniqueName = item.name;
      let counter = 1;
      while (seenNames.has(uniqueName)) {
        uniqueName = `${item.name} (${item.ip || counter++})`;
      }
      seenNames.add(uniqueName);
      uniqueList.push({
        ...item,
        name: uniqueName
      });
    }

    return uniqueList;
  }, [serverInterfaces, deviceManualIp, subnetSegment]);

  useEffect(() => {
    const isCloud = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    if (isCloud) {
      detectWebRTCLocalIP().then(ip => {
        if (ip) {
          setDeviceManualIp(ip);
          setTempIpVal(ip);
          localStorage.setItem('netmonitor_manual_ip', ip);
          const detectedSegment = extractSubnetFromIp(ip);
          if (detectedSegment) {
            setSubnetSegment(detectedSegment);
          }
          addAlert(`🔒 Red privada: ¡IP real de tu portátil detectada vía WebRTC: ${ip}! Sincronizando segmento de red local a ${detectedSegment || 'Auto'}.`, 'success');
        } else {
          addAlert('Estás usando la versión en la Nube. Debido a políticas de privacidad, ingresa la IP de tu portátil manualmente en "Mi IP: Simulada" o corre RedMonitor localmente.', 'info');
        }
      });
    }

    fetch('/api/interfaces')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setServerInterfaces(data);
          
          if (!isCloud) {
            // Automática detección de segmento de red física activa (priorizando Wi-Fi y LAN)
            const physical = data.filter((i: any) => 
              i.type !== 'Virtual' && 
              i.ip && 
              !i.ip.startsWith('127.') && 
              !i.ip.startsWith('169.254.')
            );
            
            const best = physical.find((i: any) => i.type === 'Wi-Fi') || 
                         physical.find((i: any) => i.type === 'LAN') || 
                         physical[0] || 
                         data[0];
                         
            if (best) {
              setSelectedInterface(best.name);
              if (best.ip) {
                setDeviceManualIp(best.ip);
                setTempIpVal(best.ip);
                localStorage.setItem('netmonitor_manual_ip', best.ip);
              }
              if (best.subnet) {
                setSubnetSegment(best.subnet);
                addAlert(`Red detectada con éxito: Conectado a la interfaz "${best.originalName || best.name}" (IP de tu portátil: ${best.ip}), segmento de red: ${best.subnet}`, 'success');
              }
            }
          }
        }
      })
      .catch(err => {
        console.warn("Could not load dynamic interfaces, falling back to simulator defaults:", err);
      });
  }, []);

  const [scanAllSegments, setScanAllSegments] = useState<boolean>(true);
  const [viewedSegmentFilter, setViewedSegmentFilter] = useState<string>('all');
  const [currentScanningSegName, setCurrentScanningSegName] = useState<string>('');
  const [selectedInterval, setSelectedInterval] = useState<string>('1 minuto');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Subnet calculator state
  const [calcIp, setCalcIp] = useState<string>('192.168.1.0');
  const [calcCidr, setCalcCidr] = useState<number>(24);
  
  // Navigation
  const [activeView, setActiveView] = useState<'vista_general' | 'sensores' | 'dispositivos' | 'ancho_banda' | 'testeo' | 'ai_diagnostic' | 'speed_test' | 'auditorias_red' | 'wiki_soporte' | 'event_logger' | 'diseno_red' | 'instalador_desktop' | 'configuracion'>('vista_general');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('netmonitor_theme') as 'dark' | 'light') || 'dark';
  });

  const handleSetTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('netmonitor_theme', newTheme);
  };

  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [isLanTreeOpen, setIsLanTreeOpen] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Customizable features states
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('netmonitor_configured_features');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    return {
      sensores: true,
      dispositivos: true,
      ancho_banda: true,
      testeo: true,
      ai_diagnostic: true,
      speed_test: true,
      auditorias_red: true,
      diseno_red: true,
      event_logger: true,
      wiki_soporte: true,
    };
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('netmonitor_configured_features');
  });

  const handleUpdateFeatures = (newFeatures: Record<string, boolean>) => {
    setEnabledFeatures(newFeatures);
    localStorage.setItem('netmonitor_configured_features', JSON.stringify(newFeatures));
  };

  // Gemini & Diagnóstico Inteligente API states
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Live Alerts & Log center state
  const [liveAlerts, setLiveAlerts] = useState<{ id: string; time: string; msg: string; type: 'success' | 'warning' | 'error' | 'info'; category?: string; code?: string }[]>([
    { id: 'start', time: '09:30:10', msg: 'Monitor local asignado a interfaz Realtek PCIe Controller L2.', type: 'info', category: 'Sistema', code: 'SYS-100' },
    { id: 'ready', time: '09:30:55', msg: 'Socket Listener ICMP DHCP montado en puerto virtual. Esperando barrido inicial.', type: 'success', category: 'Capa Enlace', code: 'LNK-200' }
  ]);

  // Port Scanner States
  const [portScanStatus, setPortScanStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [portScanProgress, setPortScanProgress] = useState<number>(0);
  const [portScanResults, setPortScanResults] = useState<{ port: number; service: string; status: 'open' | 'closed'; risk: 'low' | 'medium' | 'high'; desc: string }[]>([]);
  const [activeScanningPort, setActiveScanningPort] = useState<number | null>(null);

  const addAlert = (
    msg: string, 
    type: 'success' | 'warning' | 'error' | 'info' = 'info', 
    category?: string, 
    code?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    // Auto-detect category & code if not provided
    let finalCategory = category;
    let finalCode = code;
    
    if (!finalCategory || !finalCode) {
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('sonda') || lowerMsg.includes('arp') || lowerMsg.includes('filtrado')) {
        finalCategory = finalCategory || 'Sonda Real';
        finalCode = finalCode || 'SND-401';
      } else if (lowerMsg.includes('puerto') || lowerMsg.includes('escan') || lowerMsg.includes('seguridad') || lowerMsg.includes('intruso') || lowerMsg.includes('conflicto') || lowerMsg.includes('spoofing')) {
        finalCategory = finalCategory || 'Seguridad';
        finalCode = finalCode || 'SEC-302';
      } else if (lowerMsg.includes('enlace') || lowerMsg.includes('cable') || lowerMsg.includes('física') || lowerMsg.includes('wifi') || lowerMsg.includes('desconectado') || lowerMsg.includes('poe')) {
        finalCategory = finalCategory || 'Capa Física';
        finalCode = finalCode || 'PHY-101';
      } else if (lowerMsg.includes('demo') || lowerMsg.includes('simula') || lowerMsg.includes('simulado')) {
        finalCategory = finalCategory || 'Simulación';
        finalCode = finalCode || 'SIM-202';
      } else if (lowerMsg.includes('icmp') || lowerMsg.includes('barrido') || lowerMsg.includes('ping')) {
        finalCategory = finalCategory || 'Capa Red';
        finalCode = finalCode || 'NET-201';
      } else if (lowerMsg.includes('rstp') || lowerMsg.includes('convergencia') || lowerMsg.includes('tráfico') || lowerMsg.includes('switch') || lowerMsg.includes('puente')) {
        finalCategory = finalCategory || 'Capa Enlace';
        finalCode = finalCode || 'LNK-201';
      } else {
        finalCategory = finalCategory || 'Sistema';
        finalCode = finalCode || 'SYS-101';
      }
    }

    setLiveAlerts(prev => [
      { id: Math.random().toString(36).substring(2, 9), time: timestamp, msg, type, category: finalCategory, code: finalCode },
      ...prev
    ].slice(0, 50)); // hold last 50 logs
  };

  // Scan states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scannedIndex, setScannedIndex] = useState<number>(0);
  const [lastScanDone, setLastScanDone] = useState<boolean>(false);
  const [lastScanTimeStr, setLastScanTimeStr] = useState<string | null>(null);
  const [scanDurationSec, setScanDurationSec] = useState<number | null>(null);

  // Data pools
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  // Persistent user overrides for device nicknames and brands
  const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem('netmonitor_custom_names');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [customVendors, setCustomVendors] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem('netmonitor_custom_vendors');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // External API Mac Resolution States
  const [isResolvingVendors, setIsResolvingVendors] = useState<boolean>(false);
  const [apiResolutionsCount, setApiResolutionsCount] = useState<number>(0);
  const [hasRealInternetAccess, setHasRealInternetAccess] = useState<boolean | null>(null);
  const [isCheckingInternet, setIsCheckingInternet] = useState<boolean>(false);

  const checkRealInternetConnection = async (silent = false): Promise<boolean> => {
    if (isCheckingInternet) return false;
    setIsCheckingInternet(true);
    if (!silent) {
      addAlert("📡 Probando conectividad WAN... Enviando paquetes de prueba a servidores de internet para verificar salida real...", "info", "Sistema", "NET-100");
    }

    if (!navigator.onLine || !isCablePhysicallyConnected) {
      setHasRealInternetAccess(false);
      setIsCheckingInternet(false);
      if (!silent) {
        addAlert("❌ Verificación de internet fallida: El adaptador de red físico o local está desconectado.", "error", "Sistema", "NET-101");
      }
      return false;
    }

    try {
      // First try server-side authoritative check to see if our node has active egress dns lookup
      const serverRes = await fetch("/api/check-internet");
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData && serverData.online) {
          setHasRealInternetAccess(true);
          setIsCheckingInternet(false);
          addAlert("🌐 Conexión externa confirmada: El servidor local de monitoreo reporta salida autoritativa a Internet.", "success", "Sistema", "NET-102");
          handleResolveAllVendorsViaApi(true);
          return true;
        }
      }
    } catch (errServer) {
      console.warn("Authoritative server WAN check unreachable, attempting browser probe...", errServer);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Verify reachability of a high-availability server
      await fetch("https://cloudflare.com/cdn-cgi/trace", {
        method: "GET",
        signal: controller.signal,
        mode: "no-cors"
      });
      clearTimeout(timeoutId);

      setHasRealInternetAccess(true);
      setIsCheckingInternet(false);
      
      addAlert("🌐 Conexión externa confirmada: El navegador tiene salida real a Internet.", "success", "Sistema", "NET-102");
      
      // Auto resolve names since we have internet
      handleResolveAllVendorsViaApi(true);
      return true;
    } catch (e) {
      console.warn("Primary WAN check failed, trying fallback...", e);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        await fetch("https://api.macvendors.com/00:00:00", {
          method: "GET",
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(timeoutId);

        setHasRealInternetAccess(true);
        setIsCheckingInternet(false);
        
        addAlert("🌐 Conexión externa confirmada (vía fallback): El sistema tiene salida real a Internet.", "success", "Sistema", "NET-102");
        
        handleResolveAllVendorsViaApi(true);
        return true;
      } catch (errFallback) {
        setHasRealInternetAccess(false);
        setIsCheckingInternet(false);
        
        addAlert("⚠️ Sin salida a Internet: No se detectó conectividad WAN externa. Operando en modo offline de contingencia.", "warning", "Sistema", "NET-103");
        return false;
      }
    }
  };

  // Run initial internet connectivity check on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      checkRealInternetConnection(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isCablePhysicallyConnected]);

  // Synchronize theme onto document.documentElement
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    }
  }, [theme]);

  const handleResolveAllVendorsViaApi = async (isAuto = false) => {
    if (isResolvingVendors) return;
    setIsResolvingVendors(true);
    if (!isAuto) {
      addAlert("🔍 Iniciando consulta externa de fabricantes vía API para los dispositivos con MAC...", "info");
    }

    const devicesToResolve = devices.filter(d => d.mac && d.mac !== '—');
    if (devicesToResolve.length === 0) {
      if (!isAuto) {
        addAlert("⚠️ No se encontraron dispositivos con dirección MAC válida para consultar.", "warning");
      }
      setIsResolvingVendors(false);
      return;
    }

    let successCount = 0;
    let cachedCount = 0;
    let failedCount = 0;

    // We process sequentially with a small delay (e.g. 800ms) to avoid rate limiting
    for (let i = 0; i < devicesToResolve.length; i++) {
      const dev = devicesToResolve[i];
      const mac = dev.mac!;
      const cleanMac = mac.replace(/[:-]/g, '').toUpperCase().trim();
      
      // If we already have it in localStorage/apiVendorCache, skip the network request
      const cached = localStorage.getItem('netmonitor_api_vendors');
      const cacheObj = cached ? JSON.parse(cached) : {};
      if (cacheObj[cleanMac] && cacheObj[cleanMac] !== 'UNKNOWN') {
        cachedCount++;
        continue;
      }

      // Add a visual log or alert for first few to show user progress
      if (i < 3 || i === devicesToResolve.length - 1) {
        addAlert(`Consultando fabricante para ${dev.ip} (${mac}) en API externa...`, "info", "API", "API-100");
      }

      try {
        const result = await fetchVendorFromApi(mac);
        if (result && result !== 'UNKNOWN') {
          successCount++;
          // Trigger forced re-render of processedDevices so it grabs the newly cached value
          setApiResolutionsCount(prev => prev + 1);
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }

      // 800ms delay to respect rate limit
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setIsResolvingVendors(false);
    // Force one last recalculation to ensure everything matches
    setApiResolutionsCount(prev => prev + 1);

    if (successCount > 0) {
      addAlert(`✅ Consulta completada. Se resolvieron ${successCount} nuevos fabricantes vía API.`, "success");
    } else if (!isAuto) {
      if (cachedCount > 0 && failedCount === 0) {
        addAlert("ℹ️ Todos los fabricantes ya se encontraban resueltos y cargados desde la caché local.", "info");
      } else {
        addAlert("ℹ️ Consulta finalizada. Los fabricantes locales se mantienen como respaldo de seguridad.", "info");
      }
    }
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportCustomizations = () => {
    try {
      const data = {
        names: customNames,
        vendors: customVendors
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `RedMonitor_Backup_Inventario_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addAlert("📥 Copia de seguridad del inventario exportada con éxito.", "success");
    } catch {
      addAlert("❌ Error al exportar la copia de seguridad.", "error");
    }
  };

  const handleImportCustomizations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.names || parsed.vendors)) {
          const newNames = { ...customNames, ...(parsed.names || {}) };
          const newVendors = { ...customVendors, ...(parsed.vendors || {}) };
          
          setCustomNames(newNames);
          setCustomVendors(newVendors);
          
          localStorage.setItem('netmonitor_custom_names', JSON.stringify(newNames));
          localStorage.setItem('netmonitor_custom_vendors', JSON.stringify(newVendors));
          
          addAlert("📤 Inventario personalizado de marcas y apodos importado correctamente.", "success");
        } else {
          addAlert("⚠️ Formato de copia de seguridad no válido.", "warning");
        }
      } catch {
        addAlert("❌ Error al parsear el archivo de copia de seguridad JSON.", "error");
      }
    };
    fileReader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleClearCustomizations = () => {
    if (confirm("¿Estás seguro de que deseas eliminar TODOS los nombres y marcas personalizadas? Esta acción no se puede deshacer.")) {
      setCustomNames({});
      setCustomVendors({});
      localStorage.removeItem('netmonitor_custom_names');
      localStorage.removeItem('netmonitor_custom_vendors');
      addAlert("🗑️ Todas las personalizaciones de red se han restablecido de fábrica.", "success");
    }
  };

  const processedDevices = useMemo(() => {
    return devices.map(d => {
      // Look up custom name: try MAC first, then IP
      const customName = (d.mac && d.mac !== '—' && customNames[d.mac]) !== undefined
        ? customNames[d.mac]
        : customNames[d.ip];

      // Look up custom vendor: try MAC first, then IP
      const customVendor = (d.mac && d.mac !== '—' && customVendors[d.mac]) !== undefined
        ? customVendors[d.mac]
        : customVendors[d.ip];
      
      const resolvedVendor = isGenericVendor(d.vendor)
        ? resolveVendorByMac(d.mac, d.host, d.ip)
        : d.vendor!;

      return {
        ...d,
        host: customName !== undefined ? customName : d.host,
        vendor: customVendor !== undefined ? customVendor : resolvedVendor
      };
    });
  }, [devices, customNames, customVendors, apiResolutionsCount]);
  
  // History point database (preload with realistic past records)
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([
    { timeLabels: '09:20:00', hostsActivos: 4, latenciaMedia: 48 },
    { timeLabels: '09:25:00', hostsActivos: 4, latenciaMedia: 52 },
    { timeLabels: '09:30:00', hostsActivos: 4, latenciaMedia: 51 },
    { timeLabels: '09:35:00', hostsActivos: 4, latenciaMedia: 55 },
  ]);

  // Bandwidth simulation states & initial history records
  const [trafficGeneratorActive, setTrafficGeneratorActive] = useState<{ ip: string; profileName: string; durationLeft: number } | null>(null);
  const [bandwidthHistory, setBandwidthHistory] = useState<{ timeLabels: string; downTotal: number; upTotal: number }[]>([
    { timeLabels: '16:01:00', downTotal: 65.2, upTotal: 15.4 },
    { timeLabels: '16:02:00', downTotal: 68.1, upTotal: 16.2 },
    { timeLabels: '16:03:00', downTotal: 72.4, upTotal: 14.8 },
    { timeLabels: '16:04:00', downTotal: 66.0, upTotal: 50.8 },
    { timeLabels: '16:05:00', downTotal: 68.3, upTotal: 51.2 },
  ]);

  // Selected device for modal diagnostic popup
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');
  const [isEditingVendor, setIsEditingVendor] = useState<boolean>(false);
  const [tempVendor, setTempVendor] = useState<string>('');
  const [modalTab, setModalTab] = useState<'info' | 'ports' | 'fingerprint'>('info');
  const [activeAnomaly, setActiveAnomaly] = useState<'none' | 'latency' | 'gateway' | 'loss'>('none');

  // Passive/Active Fingerprint analysis simulation states
  const [isAnalyzingFingerprint, setIsAnalyzingFingerprint] = useState<boolean>(false);
  const [fingerprintProgress, setFingerprintProgress] = useState<number>(0);
  const [fingerprintLogs, setFingerprintLogs] = useState<string[]>([]);
  const [analyzedSuccessfully, setAnalyzedSuccessfully] = useState<boolean>(false);

  // Synchronize renaming and brand fields on selecting a device or state change
  useEffect(() => {
    if (!selectedDevice) {
      setIsEditingName(false);
      setTempName('');
      setIsEditingVendor(false);
      setTempVendor('');
      setModalTab('info');
      setPortScanStatus('idle');
      setPortScanProgress(0);
      setPortScanResults([]);
      setActiveScanningPort(null);
      setIsAnalyzingFingerprint(false);
      setFingerprintProgress(0);
      setFingerprintLogs([]);
      setAnalyzedSuccessfully(false);
    } else {
      const activeDevice = processedDevices.find(d => d.id === selectedDevice.id);
      if (activeDevice) {
        setTempName(activeDevice.host !== '—' ? activeDevice.host : '');
        const currentBrand = isGenericVendor(activeDevice.vendor)
          ? resolveVendorByMac(activeDevice.mac, activeDevice.host, activeDevice.ip)
          : activeDevice.vendor!;
        setTempVendor(currentBrand === 'Sonda de Red Genérica' ? '' : currentBrand);
      }
    }
  }, [selectedDevice, processedDevices]);

  const handleStartFingerprintAnalysis = (device: Device) => {
    if (!device) {
      console.error("handleStartFingerprintAnalysis called with undefined/null device");
      return;
    }

    setIsAnalyzingFingerprint(true);
    setFingerprintProgress(0);
    setFingerprintLogs([]);
    setAnalyzedSuccessfully(false);

    try {
      const ipVal = device.ip || '0.0.0.0';
      const macVal = device.mac || '00:00:00:00:00:00';
      const ttlVal = device.ttl || 64;
      const ttlOsName = device.ttlOs || "Linux Kernel 3.x - 5.x / FreeBSD";
      const serverVal = device.httpServer || "nginx/1.22.1";
      const uaVal = device.userAgent || "—";
      const osDeducVal = device.osDeducido || "Dispositivo Linux / Android";

      const logsSteps = [
        `[INFO] Iniciando Captura de Paquetes Raw en la interfaz activa...`,
        `[INFO] Target: IP ${ipVal} [MAC: ${macVal}]`,
        `[ICMP] Enviando solicitud ICMP Echo (Ping) para forzar respuesta de red...`,
        `[ICMP] Recibido ICMP Echo Reply desde ${ipVal}: RTT=3.4ms | TTL recibido = ${ttlVal}`,
        `[ANALYSIS] Evaluando firma TTL de capa IP: TTL=${ttlVal} (original predeterminado detectado: ${ttlVal === 255 ? '255' : ttlVal === 128 ? '128' : '64'})`,
        `[ANALYSIS] S.O. sugerido por TTL: ${ttlOsName}`,
        `[ANALYSIS] Distancia estimada en saltos IP (Hops): 0 (Conectado al mismo segmento local)`,
        `[TCP/IP] Escaneando puerto TCP 80 / 443 (HTTP/S) en busca de firmas de servidor...`,
        device.sensorHttp 
          ? `[TCP] ¡Puerto HTTP ABIERTO! Enviando solicitud HEAD / HTTP/1.1 para obtener cabeceras...`
          : `[TCP] Puerto HTTP cerrado. Iniciando análisis pasivo de tramas HTTP de tránsito local...`,
        device.sensorHttp 
          ? `[HTTP] Respuesta HTTP 200 OK recibida. Cabecera Server: "${serverVal}"`
          : `[PASSIVE] Interceptada trama de broadcast/multicast local de este host.`,
        uaVal && uaVal !== '—'
          ? `[HTTP] Cabecera User-Agent decodificada: "${String(uaVal).substring(0, 50)}..."`
          : `[HTTP] No se detectaron cabeceras User-Agent pasivas activas.`,
        `[CORRELATION] Correlacionando OUI de MAC address [${String(macVal).substring(0, 8)}] con base de fabricantes de red...`,
        `[CORRELATION] Fabricante registrado: ${device.vendor || 'Desconocido'}`,
        `[DEDUCTION] Correlacionando firma de respuesta con firmas registradas en la base de datos...`,
        `[SUCCESS] ¡IDENTIFICACIÓN EXITOSA! S.O. final deducido: ${osDeducVal}`
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        try {
          if (currentStep < logsSteps.length) {
            const nextLog = logsSteps[currentStep];
            if (nextLog) {
              setFingerprintLogs(prev => [...prev, nextLog]);
            }
            setFingerprintProgress(Math.min(100, Math.round((currentStep + 1) * (100 / logsSteps.length))));
            currentStep++;
          } else {
            clearInterval(interval);
            setIsAnalyzingFingerprint(false);
            setAnalyzedSuccessfully(true);
          }
        } catch (innerErr) {
          console.error("Error in fingerprint step interval:", innerErr);
          clearInterval(interval);
          setIsAnalyzingFingerprint(false);
        }
      }, 280);
    } catch (err) {
      console.error("Error starting fingerprint analysis:", err);
      setIsAnalyzingFingerprint(false);
    }
  };

  const handleRenameDevice = (id: string, newName: string) => {
    const finalName = newName.trim() || '—';
    const targetDevice = devices.find(d => d.id === id);
    if (targetDevice) {
      const ip = targetDevice.ip;
      const mac = targetDevice.mac;
      setCustomNames(prev => {
        const next = { ...prev, [ip]: finalName };
        if (mac && mac !== '—') {
          next[mac] = finalName;
        }
        localStorage.setItem('netmonitor_custom_names', JSON.stringify(next));
        return next;
      });
      addAlert(`Apodo de dispositivo con IP ${ip} cambiado a "${finalName}".`, 'info');
      setSensors(sPrev => sPrev.map(s => {
        if (s.ip === ip) {
          return { ...s, dispositivo: finalName };
        }
        return s;
      }));
    }
  };

  const handleUpdateDeviceVendor = (id: string, newVendor: string) => {
    const finalVendor = newVendor.trim();
    const targetDevice = devices.find(d => d.id === id);
    if (targetDevice) {
      const ip = targetDevice.ip;
      const mac = targetDevice.mac;
      setCustomVendors(prev => {
        const next = { ...prev, [ip]: finalVendor || '—' };
        if (mac && mac !== '—') {
          next[mac] = finalVendor || '—';
        }
        localStorage.setItem('netmonitor_custom_vendors', JSON.stringify(next));
        return next;
      });
      addAlert(`Fabricante de dispositivo con IP ${ip} cambiado a "${finalVendor || 'Autodetectado'}".`, 'info');
    }
  };

  const handleStartPortScan = (deviceIp: string) => {
    if (portScanStatus === 'scanning') return;
    if (isNetworkOffline) {
      addAlert("⚠️ ERROR DE CONEXIÓN: No puedes escanear puertos TCP de un host si el enlace físico está desconectado.", "error");
      return;
    }
    setPortScanStatus('scanning');
    setPortScanProgress(0);
    setPortScanResults([]);
    setActiveScanningPort(null);
    addAlert(`Iniciando escaneo de seguridad y puertos TCP en host ${deviceIp}...`, 'info');

    const portsToScan = [
      { port: 21, service: 'FTP', desc: 'Transferencia de Archivos' },
      { port: 22, service: 'SSH', desc: 'Acceso Remoto Seguro (SSH)' },
      { port: 23, service: 'TELNET', desc: 'Acceso Remoto no síncrono (Inseguro)' },
      { port: 53, service: 'DNS', desc: 'Servidor Domain Name System' },
      { port: 80, service: 'HTTP', desc: 'Servidor Web Inseguro' },
      { port: 161, service: 'SNMP', desc: 'Monitoreo de Red Simple' },
      { port: 443, service: 'HTTPS', desc: 'Servidor Web Seguro SSL' },
      { port: 3306, service: 'MySQL', desc: 'Manejador de Base de Datos' },
      { port: 8080, service: 'HTTP-ALT', desc: 'Puerto HTTP Secundario/Proxy' }
    ];

    let currentIndex = 0;

    const scanInterval = setInterval(() => {
      if (currentIndex >= portsToScan.length) {
        clearInterval(scanInterval);
        portScanTimerRef.current = null;
        setPortScanStatus('done');
        setActiveScanningPort(null);
        setPortScanProgress(100);
        addAlert(`Escaneo de puertos TCP culminado con éxito sobre ${deviceIp}.`, 'success');
        return;
      }

      const currentPortObj = portsToScan[currentIndex];
      setActiveScanningPort(currentPortObj.port);
      setPortScanProgress(Math.round(((currentIndex + 1) / portsToScan.length) * 100));

      const suffix = deviceIp.split('.').pop() || '';
      let status: 'open' | 'closed' = 'closed';
      let risk: 'low' | 'medium' | 'high' = 'low';

      if (suffix === '1') {
        if ([22, 53, 80, 443].includes(currentPortObj.port)) status = 'open';
      } else if (suffix === '38' || deviceIp.endsWith('.38')) {
        if ([80, 23, 8080].includes(currentPortObj.port)) {
          status = 'open';
          if (currentPortObj.port === 23) risk = 'high';
        }
      } else if (suffix === '40' || deviceIp.endsWith('.40')) {
        if ([80, 443, 8080].includes(currentPortObj.port)) status = 'open';
      } else if (suffix === '55' || deviceIp.endsWith('.55')) {
        if ([22, 443].includes(currentPortObj.port)) status = 'open';
      } else if (suffix === '15' || deviceIp.endsWith('.15')) {
        if ([21, 22, 80].includes(currentPortObj.port)) {
          status = 'open';
          if (currentPortObj.port === 21) risk = 'medium';
        }
      } else {
        if ([80, 443].includes(currentPortObj.port)) status = 'open';
      }

      setPortScanResults(prev => [
        ...prev,
        {
          port: currentPortObj.port,
          service: currentPortObj.service,
          status,
          risk,
          desc: currentPortObj.desc
        }
      ]);

      currentIndex++;
    }, 280);

    portScanTimerRef.current = scanInterval;
  };

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize interface segments on interface change
  useEffect(() => {
    const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
    let segments = [...currentInterfaceObj.segments];
    
    // Incorporate manual IP's subnet segment if configured
    if (deviceManualIp) {
      const customSeg = extractSubnetFromIp(deviceManualIp);
      if (customSeg && !segments.includes(customSeg)) {
        segments = [customSeg, ...segments];
      }
    }

    // Auto sync viewedSegmentFilter state and subnet segment inputs
    setViewedSegmentFilter('all');
    if (segments.length > 0) {
      setSubnetSegment(segments[0]);
    }
  }, [selectedInterface, deviceManualIp, activeInterfacesList]);

  // Unified empty pool initializer based on selectedInterface and raw inputs
  useEffect(() => {
    if (loadedProfileId) return; // Prevent overwriting when a saved profile is loaded offline!

    const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
    let segments = [...currentInterfaceObj.segments];
    
    // Add manual IP segment if configured
    if (deviceManualIp) {
      const customSeg = extractSubnetFromIp(deviceManualIp);
      if (customSeg && !segments.includes(customSeg)) {
        segments = [customSeg, ...segments];
      }
    }

    // Fallback: if the user dynamically entered a custom subnet segment that's not in the default list,
    // add it as a segment context so it can be initialized and scanned!
    if (subnetSegment && !segments.includes(subnetSegment)) {
      segments = [subnetSegment, ...segments];
    }

    let initialPool: Device[] = [];
    segments.forEach(seg => {
      const base = seg.replace(/\.0\/24$/, '').replace(/\.0\/16$/, '');
      const subnetPool = Array.from({ length: 254 }, (_, idx) => {
        const i = idx + 1;
        const currentIp = `${base}.${i}`;
        const isCustomWorkstation = deviceManualIp 
          ? (currentIp === deviceManualIp.trim()) 
          : (currentInterfaceObj?.ip ? (currentIp === currentInterfaceObj.ip) : (i === 55));

        let workstationName = 'Laptop de Trabajo (Este PC)';
        if (selectedInterface.includes('PCIe')) {
          workstationName = 'Estación de Trabajo (Este PC)';
        } else if (selectedInterface.includes('Loopback') || selectedInterface.includes('Virtual')) {
          workstationName = 'Nodo Docker Host (Este PC)';
        }

        const macToUse = isCustomWorkstation 
          ? (currentInterfaceObj?.mac && currentInterfaceObj.mac !== '00:00:00:00:00:00' ? currentInterfaceObj.mac.toUpperCase() : '84:C8:A0:BB:AB:66') 
          : '—';

        return {
          id: `host-${base.replace(/\./g, '_')}-${i}`,
          ip: currentIp,
          host: isCustomWorkstation ? workstationName : '—',
          mac: macToUse,
          ping: null,
          estado: 'No_Escaneado' as const,
          lastChecked: null,
          sensorPing: isCustomWorkstation,
          interfaz: selectedInterface,
          segmento: seg,
        };
      });
      initialPool = [...initialPool, ...subnetPool];
    });

    setDevices(initialPool);
    setSensors([]);
    setLastScanDone(false);
    setLastScanTimeStr(null);
    setScanDurationSec(null);
  }, [selectedInterface, subnetSegment, deviceManualIp, activeInterfacesList, loadedProfileId]);

  // Handle active states if Virtuales changes, ask to scan again
  const handleVirtualsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeVirtuals(e.target.checked);
  };

  const handleLoadOfflineProfile = (profile: LocationProfile) => {
    setLoadedProfileId(profile.id);
    setLocationName(profile.name);
    setSubnetSegment(profile.subnet);
    setDevices(profile.devices);
    setLastScanDone(true); // Treat as scanned so that they can see details immediately!
    addAlert(`⚡ Perfil de ubicación offline cargado: "${profile.name}". Vista de mapa e inventario habilitada.`, 'success');
  };

  const handleUnloadOfflineProfile = () => {
    setLoadedProfileId(null);
    // Restore default/cached location name
    const cachedLoc = localStorage.getItem('netmonitor_current_location') || 'Sede Local';
    setLocationName(cachedLoc);
    addAlert(`🔌 Perfil offline desconectado. Re-inicializando simulaciones de red activa.`, 'info');
  };

  // Bandwidth Traffic Simulation and Fluctuation loop
  useEffect(() => {
    // Only fluctuate traffic if a scan has been completed
    if (!lastScanDone || isScanning) return;

    const interval = setInterval(() => {
      if (isNetworkOffline) {
        // Force all device listings and rates to 0 while offline is active
        setDevices(prevDevices => {
          return prevDevices.map(d => ({
            ...d,
            ping: null,
            estado: 'Caído' as const,
            consumoDownload: 0,
            consumoUpload: 0
          }));
        });
        setBandwidthHistory(prevHist => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          const newPoint = {
            timeLabels: timeStr,
            downTotal: 0,
            upTotal: 0
          };
          return [...prevHist, newPoint].slice(-16);
        });
        return;
      }

      // 1. Decrement simulation countdown if active
      let activeSim = trafficGeneratorActive;
      if (activeSim) {
        if (activeSim.durationLeft <= 1) {
          activeSim = null;
          setTrafficGeneratorActive(null);
        } else {
          activeSim = {
            ...activeSim,
            durationLeft: activeSim.durationLeft - 4
          };
          setTrafficGeneratorActive(activeSim);
        }
      }

      // Profiles metadata
      const profileData: Record<string, { down: number; up: number; latency: number; name: string }> = {
        streaming_4k: { down: 25.0, up: 1.5, latency: 15, name: 'Streaming 4K' },
        game_download: { down: 88.0, up: 4.2, latency: 85, name: 'Descarga Masiva' },
        nas_backup: { down: 1.5, up: 45.0, latency: 40, name: 'Copia Certificada/NAS' },
        ddos_test: { down: 120.0, up: 110.0, latency: 280, name: 'Stress DDoS' }
      };

      // 2. Fluctuate devices traffic
      let totalDown = 0;
      let totalUp = 0;

      setDevices(prevDevices => {
        return prevDevices.map(d => {
          if (d.estado === 'Caído' || d.estado === 'No_Escaneado') {
            return d;
          }

          let down = d.consumoDownload || 0;
          let up = d.consumoUpload || 0;
          let ping = d.ping;
          let estado = d.estado;

          // Check if this device is being targeted by active speed/stress test
          if (activeSim && d.ip === activeSim.ip) {
            const prof = profileData[activeSim.profileName];
            if (prof) {
              // Simulated values with tiny fluctuation
              down = Number((prof.down * (0.95 + Math.random() * 0.1)).toFixed(1));
              up = Number((prof.up * (0.95 + Math.random() * 0.1)).toFixed(1));
              
              // Heavy traffic affects ping latency and can trigger warnings!
              ping = Math.round(prof.latency + Math.random() * 8);
              
              if (down > 50 || up > 30) {
                estado = 'Advertencia';
              } else {
                estado = 'OK';
              }
            }
          } else {
            // Normal fluctuation
            const baseDown = d.host.includes('PS5') ? 42.8 : 
                             d.host.includes('Smart-TV') ? 18.5 :
                             d.host.includes('Este PC') ? 5.6 : 
                             d.host.includes('Docker') ? 2.1 :
                             d.host.includes('NAS') ? 0.8 : 0.5;

            const baseUp = d.host.includes('NAS') ? 45.3 :
                           d.host.includes('Docker') ? 3.4 : 0.4;

            // Fluctuate download/upload slightly around bases
            down = Number((baseDown * (0.85 + Math.random() * 0.3)).toFixed(1));
            up = Number((baseUp * (0.85 + Math.random() * 0.3)).toFixed(1));

            // Small floor
            if (down < 0.1) down = 0.1;
            if (up < 0.05) up = 0.05;

            // Restore original presets' status
            if (d.host.includes('PS5')) {
              ping = 120;
              estado = 'Advertencia';
            } else if (d.host.includes('Smart-TV')) {
              ping = 85;
              estado = 'Advertencia';
            } else if (d.host.includes('NAS-Backup')) {
              ping = 95;
              estado = 'Advertencia';
            } else {
              ping = d.host.includes('Router') ? 1 : Math.round(3 + Math.random() * 8);
              estado = 'OK';
            }
          }

          // Accumulate consumed MB in real-time
          const megabits = (down + up) * 4; 
          const megabytes = megabits / 8;
          const currentTotal = d.totalConsumido || 0;
          const newTotal = Number((currentTotal + megabytes).toFixed(1));

          totalDown += down;
          totalUp += up;

          return {
            ...d,
            ping,
            estado,
            consumoDownload: down,
            consumoUpload: up,
            totalConsumido: newTotal
          };
        });
      });

      // 3. Update bandwidth history line chart
      setBandwidthHistory(prevHist => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const newPoint = {
          timeLabels: timeStr,
          downTotal: Number(totalDown.toFixed(1)),
          upTotal: Number(totalUp.toFixed(1))
        };
        return [...prevHist, newPoint].slice(-16); // keep last 16 points
      });

    }, 4000);

    return () => clearInterval(interval);
  }, [lastScanDone, isScanning, trafficGeneratorActive, isNetworkOffline]);

  const handleTriggerTraffic = (ip: string, profile: string) => {
    setTrafficGeneratorActive({
      ip,
      profileName: profile,
      durationLeft: 20
    });
  };

  const handleResetTraffic = () => {
    setTrafficGeneratorActive(null);
    setDevices(prev => prev.map(d => {
      if (d.estado === 'Caído' || d.estado === 'No_Escaneado') return d;
      const isTv = d.ip.endsWith('.38');
      const isPs = d.ip.endsWith('.40');
      const isNas = d.ip.endsWith('.15') || d.host.includes('NAS-Backup');
      return {
        ...d,
        consumoDownload: isPs ? 42.8 : isTv ? 18.5 : 2.5,
        consumoUpload: isPs ? 3.5 : isTv ? 1.2 : isNas ? 45.3 : 0.5,
        estado: (isPs || isTv || isNas) ? 'Advertencia' : 'OK',
        ping: isPs ? 120 : isTv ? 85 : isNas ? 95 : 5
      };
    }));
  };

  // Autosync locally cached probe devices to express server on mount
  useEffect(() => {
    if (manualDevicesList && manualDevicesList.length > 0) {
      fetch('/api/upload-probe-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: manualDevicesList })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Immediately populate state
          const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
          const mappedList = manualDevicesList.map((r, idx) => {
            const isGateway = r.ip.endsWith('.1') || r.ip.endsWith('.254') || (r.hostname && (r.hostname.toLowerCase().includes('gateway') || r.hostname.toLowerCase().includes('router')));
            const isThisPc = r.ip === currentInterfaceObj.ip;
            
            let nameLabel = r.hostname || r.vendor || 'Dispositivo LAN';
            const cleanMac = r.mac && r.mac !== '00:00:00:00:00:00' ? r.mac.toUpperCase() : '—';
            const labelLower = nameLabel.toLowerCase();
            if (
              labelLower.includes('genérico') || 
              labelLower.includes('generico') || 
              labelLower.includes('dispositivo lan') || 
              labelLower.includes('dispositivo de red') || 
              labelLower.includes('sonda de red') || 
              nameLabel === '—'
            ) {
              nameLabel = resolveDeviceNameByMac(cleanMac, r.hostname, r.ip);
            }
            let hostNameStr = nameLabel;
            if (isThisPc) {
              hostNameStr = `Este PC (${nameLabel})`;
            } else if (isGateway) {
              hostNameStr = `Gateway/Router (${nameLabel})`;
            }

            return {
              id: `host-${r.ip.replace(/\./g, '_')}`,
              ip: r.ip,
              host: hostNameStr,
              mac: r.mac && r.mac !== '00:00:00:00:00:00' ? r.mac.toUpperCase() : '—',
              ping: r.ping || Math.floor(Math.random() * 8) + 1,
              estado: 'OK' as const,
              lastChecked: new Date().toLocaleTimeString(),
              sensorPing: true,
              sensorHttp: isGateway || isThisPc,
              consumoDownload: isThisPc ? 12.4 : Number((Math.random() * 4).toFixed(1)),
              consumoUpload: isThisPc ? 3.1 : Number((Math.random() * 0.8).toFixed(1)),
              totalConsumido: isThisPc ? 1420.5 : Number((30 + Math.random() * 200).toFixed(1)),
              interfaz: selectedInterface,
              segmento: subnetSegment,
              os: isThisPc ? 'Windows 11 / Intel' : isGateway ? 'RouterOS / Linux' : r.hostname?.toLowerCase().includes('tv') ? 'Tizen OS' : r.hostname?.toLowerCase().includes('camara') || r.hostname?.toLowerCase().includes('cctv') ? 'Embedded Linux' : 'Android/iOS'
            };
          });

          setDevices(mappedList);
          setIsDemoMode(false);
          setLastScanDone(true);
          setLastScanTimeStr(new Date().toLocaleTimeString());
          const newSensors = generateSensorsForDevices(mappedList);
          setSensors(newSensors);
        }
      })
      .catch(err => console.warn("Error autosyncing local probe devices:", err));
    }
  }, [selectedInterface, subnetSegment, activeInterfacesList]);

  const parseArpOutput = (text: string) => {
    const list: any[] = [];
    const lines = text.split('\n');
    const ipRegex = /((?:\d{1,3}\.){3}\d{1,3})/;
    const macRegex = /((?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2})/;

    lines.forEach(line => {
      const ipMatch = line.match(ipRegex);
      const macMatch = line.match(macRegex);
      if (ipMatch) {
        const ip = ipMatch[1];
        if (ip.startsWith("224.") || ip.startsWith("239.") || ip === "255.255.255.255" || ip.endsWith(".255") || ip.startsWith("127.")) {
          return;
        }

        let mac = "00:00:00:00:00:00";
        if (macMatch) {
          mac = macMatch[1].replace(/-/g, ':').toUpperCase();
          if (mac === "FF:FF:FF:FF:FF:FF") {
            return;
          }
        }

        let hostname = "";
        let vendor = "";

        // Check for CSV format
        if (line.includes('"') || line.includes(',')) {
          const parts = line.split(/[",]+/);
          const filteredParts = parts.map(p => p.trim()).filter(p => p.length > 1);
          if (filteredParts.length >= 3) {
            hostname = filteredParts[1] !== ip ? filteredParts[1] : "";
            if (filteredParts[3] && filteredParts[3].length > 3 && !filteredParts[3].match(ipRegex) && !filteredParts[3].match(macRegex)) {
              vendor = filteredParts[3];
            }
          }
        }

        if (!vendor && mac !== "00:00:00:00:00:00") {
          vendor = resolveVendorByMac(mac, hostname, ip);
        }

        if (!hostname) {
          if (ip.endsWith('.1') || ip.endsWith('.254')) {
            hostname = "Gateway Central Ethernet";
          } else if (ip.endsWith('.55')) {
            hostname = "Estación Local (Este PC)";
          } else {
            // Check if IP is video or iot based on resolveVendor
            const inferredBrand = resolveVendorByMac(mac, '', ip);
            if (inferredBrand.toLowerCase().includes('cam') || inferredBrand.toLowerCase().includes('cctv') || inferredBrand.toLowerCase().includes('dahua') || inferredBrand.toLowerCase().includes('hikvision')) {
              hostname = `Cámara CCTV Grabadora IP ${ip.split('.').pop()}`;
            } else {
              hostname = `Equipo Activo IP ${ip.split('.').pop()}`;
            }
          }
        }

        if (!list.some(d => d.ip === ip)) {
          list.push({
            ip,
            mac,
            estado: 'OK',
            ping: Math.floor(Math.random() * 8) + 1,
            vendor: vendor || 'Dispositivo LAN',
            hostname: hostname
          });
        }
      }
    });
    return list;
  };

  const handleUploadProbeDevices = (devicesToUpload: any[]) => {
    fetch('/api/upload-probe-devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devices: devicesToUpload })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        addAlert(`🔌 ¡Sonda local sincronizada! Se cargaron ${data.count} dispositivos reales conectados en tu misma red local.`, 'success');
        
        const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
        const mappedList = devicesToUpload.map((r, idx) => {
          const isGateway = r.ip.endsWith('.1') || r.ip.endsWith('.254') || (r.hostname && (r.hostname.toLowerCase().includes('gateway') || r.hostname.toLowerCase().includes('router')));
          const isThisPc = r.ip === currentInterfaceObj.ip;
          
          let nameLabel = r.hostname || r.vendor || 'Dispositivo LAN';
          const labelLower = nameLabel.toLowerCase();
          if (
            labelLower.includes('genérico') || 
            labelLower.includes('generico') || 
            labelLower.includes('dispositivo lan') || 
            labelLower.includes('dispositivo de red') || 
            labelLower.includes('sonda de red') || 
            nameLabel === '—'
          ) {
            nameLabel = resolveDeviceNameByMac(r.mac, r.hostname, r.ip);
          }
          let hostNameStr = nameLabel;
          if (isThisPc) {
            hostNameStr = `Este PC (${nameLabel})`;
          } else if (isGateway) {
            hostNameStr = `Gateway/Router (${nameLabel})`;
          }

          return {
            id: `host-${r.ip.replace(/\./g, '_')}`,
            ip: r.ip,
            host: hostNameStr,
            mac: r.mac && r.mac !== '00:00:00:00:00:00' ? r.mac.toUpperCase() : '—',
            ping: r.ping || Math.floor(Math.random() * 8) + 1,
            estado: 'OK' as const,
            lastChecked: new Date().toLocaleTimeString(),
            sensorPing: true,
            sensorHttp: isGateway || isThisPc,
            consumoDownload: isThisPc ? 12.4 : Number((Math.random() * 4).toFixed(1)),
            consumoUpload: isThisPc ? 3.1 : Number((Math.random() * 0.8).toFixed(1)),
            totalConsumido: isThisPc ? 1420.5 : Number((30 + Math.random() * 200).toFixed(1)),
            interfaz: selectedInterface,
            segmento: subnetSegment,
            os: isThisPc ? 'Windows 11 / Intel' : isGateway ? 'RouterOS / Linux' : r.hostname?.toLowerCase().includes('tv') ? 'Tizen OS' : r.hostname?.toLowerCase().includes('camara') || r.hostname?.toLowerCase().includes('cctv') ? 'Embedded Linux' : 'Android/iOS'
          };
        });

        // Prepend workstation device if missing
        if (!mappedList.some(d => d.ip === currentInterfaceObj.ip)) {
          mappedList.unshift({
            id: `host-${currentInterfaceObj.ip.replace(/\./g, '_')}`,
            ip: currentInterfaceObj.ip,
            host: `Este PC (Laptop de Trabajo)`,
            mac: currentInterfaceObj.mac,
            ping: 1,
            estado: 'OK' as const,
            lastChecked: new Date().toLocaleTimeString(),
            sensorPing: true,
            sensorHttp: true,
            consumoDownload: 14.5,
            consumoUpload: 4.2,
            totalConsumido: 2150.0,
            interfaz: selectedInterface,
            segmento: subnetSegment,
            os: 'Windows 11 / Intel Core'
          });
        }

        setDevices(mappedList);
        setIsDemoMode(false); // Disable demo to lock in real mode!
        localStorage.setItem('netmonitor_demo_mode', 'false');
        setLastScanDone(true);
        setLastScanTimeStr(new Date().toLocaleTimeString());
        
        const newSensors = generateSensorsForDevices(mappedList);
        setSensors(newSensors);
        
        setManualDevicesList(devicesToUpload);
        localStorage.setItem('netmonitor_manual_devices', JSON.stringify(devicesToUpload));
        
        setIsLocalHelpModalOpen(false);
      } else {
        addAlert("Error al sincronizar dispositivos de la sonda local.", "error");
      }
    })
    .catch(err => {
      console.error(err);
      addAlert("Error de red conectando con la sonda local del servidor.", "error");
    });
  };

  const clearProbeDevices = () => {
    fetch('/api/clear-probe-devices', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        addAlert("🔌 Sonda física desconectada: Reestablecido los valores simulados predeterminados.", "info");
        setManualDevicesList([]);
        localStorage.removeItem('netmonitor_manual_devices');
        setDevices([]);
        setSensors([]);
        setLastScanDone(false);
        setIsLocalHelpModalOpen(false);
      }
    });
  };

  // Perform Network Scan Simulation (supporting multi-segment sequential scan of all configured subnets)
  const handleStartScan = () => {
    if (isScanning) return;
    if (isNetworkOffline) {
      addAlert("⚠️ ERROR DE INTERFAZ FÍSICA: El adaptador de red seleccionado reporta cable desconectado o Wi-Fi apagado. Conecta tu red física para poder realizar barridos.", "error");
      return;
    }
    setIsScanning(true);
    setScanProgress(0);
    setScannedIndex(0);

    const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
    const segmentsToScan = scanAllSegments ? currentInterfaceObj.segments : [subnetSegment];

    let realHosts: any[] = [];
    // Pass the active subnet segment to the backend so it knows exactly which /24 scope to actively ping
    fetch(`/api/scan-real-arp?subnet=${encodeURIComponent(subnetSegment)}&isCloud=${isHostedInCloud}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.devices)) {
          realHosts = data.devices;
          if (realHosts.length > 0) {
            addAlert(`Sonda ARP física completada: Se encontraron ${realHosts.length} dispositivos reales conectados en tu misma red local.`, 'success');
            
            // Immediately apply real host results to React state to prevent timing discard
            setDevices(prev => {
              const nextPool = [...prev];
              realHosts.forEach(r => {
                const rSubnet = extractSubnetFromIp(r.ip);
                if (segmentsToScan.includes(rSubnet)) {
                  const idx = nextPool.findIndex(d => d.ip === r.ip);
                  const macToUse = r.mac && r.mac !== '00:00:00:00:00:00' ? r.mac.toUpperCase() : '—';
                  const isGateway = r.ip.endsWith('.1') || r.ip.endsWith('.254') || (r.hostname && (r.hostname.toLowerCase().includes('gateway') || r.hostname.toLowerCase().includes('router')));
                  const isThisPc = r.ip === currentInterfaceObj.ip;
                  
                  let nameLabel = r.hostname || r.vendor || 'Dispositivo Genérico';
                  const labelLower = nameLabel.toLowerCase();
                  if (
                    labelLower.includes('genérico') || 
                    labelLower.includes('generico') || 
                    labelLower.includes('dispositivo lan') || 
                    labelLower.includes('dispositivo de red') || 
                    labelLower.includes('sonda de red') || 
                    nameLabel === '—'
                  ) {
                    nameLabel = resolveDeviceNameByMac(macToUse, r.hostname, r.ip);
                  }
                  let hostNameStr = nameLabel;
                  if (isThisPc) {
                    hostNameStr = `Este PC (${nameLabel})`;
                  } else if (isGateway) {
                    hostNameStr = `Gateway/Router (${nameLabel})`;
                  }

                  const deviceObj = {
                    id: `host-${r.ip.replace(/\./g, '_')}`,
                    ip: r.ip,
                    host: hostNameStr,
                    mac: macToUse,
                    ping: r.ping || 4,
                    estado: 'OK' as const,
                    lastChecked: new Date().toLocaleTimeString(),
                    sensorPing: true,
                    sensorHttp: isGateway || isThisPc,
                    consumoDownload: isThisPc ? 8.5 : Number((Math.random() * 5).toFixed(1)),
                    consumoUpload: isThisPc ? 2.1 : Number((Math.random() * 1).toFixed(1)),
                    totalConsumido: isThisPc ? 1120.0 : Number((50 + Math.random() * 300).toFixed(1)),
                    interfaz: selectedInterface,
                    segmento: rSubnet,
                    vendor: r.vendor,
                    serialNumber: r.serialNumber
                  };

                  if (idx !== -1) {
                    nextPool[idx] = deviceObj;
                  } else {
                    nextPool.push(deviceObj);
                  }
                }
              });

              // Recompute sensors immediately for live dashboard health
              const generatedSensors = generateSensorsForDevices(nextPool);
              setSensors(generatedSensors);
              return nextPool;
            });
          }
        }
      })
      .catch(err => {
        console.warn("ARP real host scanner skipped (sandboxed background controller active):", err);
        addAlert("🔌 Sonda física offline: No se pudo contactar al router real de la LAN. Operando en modo de simulación segura de hardware.", "warning");
      });

    addAlert(`Iniciando escaneo secuencial ICMP en ${segmentsToScan.length} segmento(s) registrado(s) para ${selectedInterface}...`, 'info');

    let segmentIndex = 0;
    let stepCount = 0;
    const totalStepsPerSegment = 12; // 12 updates per segment is fast and gorgeous
    const totalSteps = totalStepsPerSegment * segmentsToScan.length;
    const intervalStep = 100; // total: ~1.2s per subnet, super responsive!

    // Generate final target pools for all selected segments with custom manual IP overrides
    const finalTargetsMap: Record<string, Device[]> = {};
    segmentsToScan.forEach(seg => {
      const rawTargets = generateFullSubnet(seg, includeVirtuals, selectedInterface, isDemoMode);
      if (deviceManualIp) {
        const trimmedManualIp = deviceManualIp.trim();
        const manualSubnet = extractSubnetFromIp(trimmedManualIp);
        const isIpInThisSegment = seg === manualSubnet;

        if (isIpInThisSegment) {
          finalTargetsMap[seg] = rawTargets.map(d => {
            if (d.ip === trimmedManualIp) {
              let workstationName = 'Laptop de Trabajo (Este PC)';
              if (selectedInterface.includes('PCIe')) {
                workstationName = 'Estación de Trabajo (Este PC)';
              } else if (selectedInterface.includes('Loopback') || selectedInterface.includes('Virtual')) {
                workstationName = 'Nodo Docker Host (Este PC)';
              }

              return {
                ...d,
                host: workstationName,
                mac: '84:C8:A0:BB:AB:66',
                ping: 3,
                estado: 'OK' as const,
                sensorPing: true,
                consumoDownload: 8.5,
                consumoUpload: 2.1,
                totalConsumido: 1120.0
              };
            }
            // Clear default .55 preset to prevent duplicates
            const parts = d.ip.split('.');
            if (parts[3] === '55' && d.ip !== trimmedManualIp) {
              return {
                ...d,
                host: '—',
                mac: '—',
                ping: null,
                estado: 'Caído' as const,
                sensorPing: false,
                consumoDownload: 0,
                consumoUpload: 0,
                totalConsumido: 0
              };
            }
            return d;
          });
        } else {
          // If in a different segment, clean out accidental presets matching 'Este PC'
          finalTargetsMap[seg] = rawTargets.map(d => {
            if (d.host.includes('(Este PC)')) {
              return {
                ...d,
                host: '—',
                mac: '—',
                ping: null,
                estado: 'Caído' as const,
                sensorPing: false,
                consumoDownload: 0,
                consumoUpload: 0,
                totalConsumido: 0
              };
            }
            return d;
          });
        }
      } else {
        finalTargetsMap[seg] = rawTargets;
      }
    });

    const timer = setInterval(() => {
      stepCount++;
      const currentSegment = segmentsToScan[segmentIndex];
      setCurrentScanningSegName(currentSegment);

      const segmentPercent = (stepCount - (segmentIndex * totalStepsPerSegment)) / totalStepsPerSegment;
      const itemsScannedCount = Math.min(254, Math.round(segmentPercent * 254));

      const overallPercent = Math.min(100, Math.round((stepCount / totalSteps) * 100));
      setScanProgress(overallPercent);
      setScannedIndex(itemsScannedCount);

      // Smooth real-time update of simulated active hosts inside devices state
      setDevices(prev => {
        const nextPool = [...prev];
        const currentTargets = finalTargetsMap[currentSegment];
        if (currentTargets) {
          currentTargets.slice(0, itemsScannedCount).forEach(t => {
            const idx = nextPool.findIndex(d => d.ip === t.ip);
            if (idx !== -1) {
              nextPool[idx] = {
                ...t,
                lastChecked: new Date().toLocaleTimeString(),
              };
            }
          });
        }
        return nextPool;
      });

      // Advance to the next configured segment if step reached threshold
      if (stepCount % totalStepsPerSegment === 0) {
        segmentIndex = Math.min(segmentsToScan.length - 1, segmentIndex + 1);
      }

      if (stepCount >= totalSteps) {
        clearInterval(timer);
        scanTimerRef.current = null;

        // Apply final state to ALL segments scanned
        setDevices(prev => {
          const nextPool = [...prev];
          segmentsToScan.forEach(seg => {
            const currentTargets = finalTargetsMap[seg];
            if (currentTargets) {
              currentTargets.forEach(t => {
                const idx = nextPool.findIndex(d => d.ip === t.ip);
                if (idx !== -1) {
                  nextPool[idx] = {
                    ...t,
                    lastChecked: new Date().toLocaleTimeString(),
                  };
                }
              });
            }
          });

          // Overlay real host ARP results if retrieved!
          if (realHosts && realHosts.length > 0) {
            realHosts.forEach(r => {
              const rSubnet = extractSubnetFromIp(r.ip);
              // Ensure this device matches one of our active scan subnets
              if (segmentsToScan.includes(rSubnet)) {
                // Find if the IP is already in our nextPool
                const idx = nextPool.findIndex(d => d.ip === r.ip);
                
                // Format MAC nicely
                const macToUse = r.mac && r.mac !== '00:00:00:00:00:00' ? r.mac.toUpperCase() : '—';
                
                // Determine whether this is the local computer/gateway or device
                const isGateway = r.ip.endsWith('.1') || r.ip.endsWith('.254') || (r.hostname && (r.hostname.toLowerCase().includes('gateway') || r.hostname.toLowerCase().includes('router')));
                const isThisPc = r.ip === currentInterfaceObj.ip;
                
                // Choose the resolved hostname if retrieved, fallback to MAC manufacturer vendor
                let nameLabel = r.hostname || r.vendor || 'Dispositivo Genérico';
                const labelLower = nameLabel.toLowerCase();
                if (
                  labelLower.includes('genérico') || 
                  labelLower.includes('generico') || 
                  labelLower.includes('dispositivo lan') || 
                  labelLower.includes('dispositivo de red') || 
                  labelLower.includes('sonda de red') || 
                  nameLabel === '—'
                ) {
                  nameLabel = resolveDeviceNameByMac(macToUse, r.hostname, r.ip);
                }
                let hostNameStr = nameLabel;
                if (isThisPc) {
                  hostNameStr = `Este PC (${nameLabel})`;
                } else if (isGateway) {
                  hostNameStr = `Gateway/Router (${nameLabel})`;
                }

                const deviceObj = {
                  id: `host-${r.ip.replace(/\./g, '_')}`,
                  ip: r.ip,
                  host: hostNameStr,
                  mac: macToUse,
                  ping: r.ping || 4,
                  estado: 'OK' as const,
                  lastChecked: new Date().toLocaleTimeString(),
                  sensorPing: true,
                  sensorHttp: isGateway || isThisPc,
                  consumoDownload: isThisPc ? 8.5 : Number((Math.random() * 5).toFixed(1)),
                  consumoUpload: isThisPc ? 2.1 : Number((Math.random() * 1).toFixed(1)),
                  totalConsumido: isThisPc ? 1120.0 : Number((50 + Math.random() * 300).toFixed(1)),
                  interfaz: selectedInterface,
                  segmento: rSubnet
                };

                if (idx !== -1) {
                  nextPool[idx] = deviceObj;
                } else {
                  nextPool.push(deviceObj);
                }
              }
            });
          }

          // Compute sensors for all scanned devices
          const generatedSensors = generateSensorsForDevices(nextPool);
          setSensors(generatedSensors);

          // Meta statistics computed
          const now = new Date();
          const scanTimeStr = now.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
          });
          const duration = Number((1.5 + Math.random() * 1.5).toFixed(1));

          const activeHostsFiltered = nextPool.filter(d => 
            (d.estado === 'OK' || d.estado === 'Advertencia') && 
            segmentsToScan.includes(d.segmento || '')
          );
          const liveHostsCount = activeHostsFiltered.length;

          addAlert(`Sonda ICMP concluida en ${duration}s. Se encontraron ${liveHostsCount} hosts activos en ${segmentsToScan.length} subredes.`, 'success');

          setLastScanTimeStr(scanTimeStr);
          setScanDurationSec(duration);
          setLastScanDone(true);
          setIsScanning(false);

          // Quietly check internet and resolve MAC manufacturers via the external API in the background if online
          setTimeout(() => {
            checkRealInternetConnection(true);
          }, 600);

          // Latency aggregates
          const validPings = activeHostsFiltered.filter(d => d.ping !== null).map(d => d.ping as number);
          const avgPing = validPings.length > 0 ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;

          setHistoryData(hPrev => [
            ...hPrev,
            {
              timeLabels: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              hostsActivos: liveHostsCount,
              latenciaMedia: avgPing
            }
          ].slice(-8));

          return nextPool;
        });
      }
    }, intervalStep);

    scanTimerRef.current = timer;
  };

  // Preset Segment scan autofills with real-time hardware dynamic detection
  const handleAutoSegment = async (showNotification = true) => {
    const isCloud = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isCloud) {
      if (showNotification) {
        addAlert("🔍 Leyendo adaptadores de red de tu portátil por tecnología WebRTC...", "info");
      }
      try {
        const ip = await detectWebRTCLocalIP();
        if (ip) {
          setDeviceManualIp(ip);
          setTempIpVal(ip);
          localStorage.setItem('netmonitor_manual_ip', ip);
          const detectedSegment = extractSubnetFromIp(ip);
          if (detectedSegment) {
            setSubnetSegment(detectedSegment);
            if (showNotification) {
              addAlert(`¡Sonda exitosa! Tu portátil tiene la dirección IP local ${ip}. Sintonizamos el segmento de escaneo en: ${detectedSegment}`, 'success');
            }
          }
        } else {
          if (showNotification) {
            addAlert('⚠️ Tu navegador oculta las IPs por privacidad. No te preocupes: escribe la IP de tu portátil manualmente en el campo "IP" arriba o inicia el programa de forma local.', 'warning');
          }
          setIsEditingRealIp(true); // Open edit mode automatically to allow typing
        }
      } catch (e) {
        if (showNotification) {
          addAlert('No se pudo determinar el adaptador de tu portátil. Escribe la IP manualmente.', 'warning');
        }
        setIsEditingRealIp(true);
      }
      return;
    }

    try {
      const res = await fetch('/api/interfaces');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setServerInterfaces(data);
        
        // Find genuine physical interfaces (Wi-Fi or LAN that have a non-loopback IP)
        const physical = data.filter((i: any) => 
          i.type !== 'Virtual' && 
          i.ip && 
          !i.ip.startsWith('127.') && 
          !i.ip.startsWith('169.254.')
        );
        
        // Prioritize Wi-Fi, then LAN, then any
        const best = physical.find((i: any) => i.type === 'Wi-Fi') || 
                     physical.find((i: any) => i.type === 'LAN') || 
                     physical[0] || 
                     data[0];
                     
        if (best) {
          setSelectedInterface(best.name);
          if (best.ip) {
            setDeviceManualIp(best.ip);
            setTempIpVal(best.ip);
            localStorage.setItem('netmonitor_manual_ip', best.ip);
          }
          if (best.subnet) {
            setSubnetSegment(best.subnet);
            if (showNotification) {
              addAlert(`¡Localización de red exitosa! IP de tu portátil: ${best.ip}, segmento de red: ${best.subnet} en la interfaz "${best.originalName || best.name}" (${best.type}).`, 'success');
            }
          }
        }
      } else {
        const currentActiveObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
        if (currentActiveObj && currentActiveObj.subnet) {
          setSubnetSegment(currentActiveObj.subnet);
          if (showNotification) {
            addAlert(`Segmento restablecido a la interfaz activa: ${currentActiveObj.subnet}.`, 'info');
          }
        }
      }
    } catch (err) {
      console.error(err);
      const currentActiveObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
      if (currentActiveObj && currentActiveObj.subnet) {
        setSubnetSegment(currentActiveObj.subnet);
      }
    }
  };

  // Helper values filtered by the active, viewed segment
  const segmentFilteredDevices = useMemo(() => {
    if (viewedSegmentFilter === 'all') return processedDevices;
    return processedDevices.filter(d => d.segmento === viewedSegmentFilter);
  }, [processedDevices, viewedSegmentFilter]);

  const mapDevices = useMemo(() => {
    if (viewedSegmentFilter === 'all') {
      const activeObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
      const primarySeg = activeObj.segments[0] || subnetSegment;
      return processedDevices.filter(d => d.segmento === primarySeg);
    }
    return processedDevices.filter(d => d.segmento === viewedSegmentFilter);
  }, [processedDevices, viewedSegmentFilter, selectedInterface, subnetSegment, activeInterfacesList]);

  const counts = useMemo<ScanStats>(() => {
    if (!lastScanDone && !isScanning) {
      return { ok: 0, advertencia: 0, caido: 0, total: 0, lastScanTime: null, scanDuration: null };
    }
    const filtered = segmentFilteredDevices;
    const ok = filtered.filter(d => d.estado === 'OK').length;
    const advertencia = filtered.filter(d => d.estado === 'Advertencia').length;
    const caido = filtered.filter(d => d.estado === 'Caído').length;
    const total = filtered.length;

    return { ok, advertencia, caido, total, lastScanTime: lastScanTimeStr, scanDuration: scanDurationSec };
  }, [segmentFilteredDevices, lastScanDone, isScanning, lastScanTimeStr, scanDurationSec]);

  // Overall availability % calculation
  const statsAvailability = useMemo(() => {
    if (!lastScanDone && !isScanning) return '0%';
    const totalActive = counts.ok + counts.advertencia;
    if (counts.total === 0) return '0%';
    const pct = ((totalActive / counts.total) * 100).toFixed(2);
    return `${pct}%`;
  }, [counts, lastScanDone, isScanning]);

  // Average active latency calculation
  const statsAvgLatency = useMemo(() => {
    if (!lastScanDone && !isScanning) return '—';
    const activeWithPing = segmentFilteredDevices.filter(d => d.ping !== null);
    if (activeWithPing.length === 0) return '—';
    const sum = activeWithPing.reduce((acc, curr) => acc + (curr.ping || 0), 0);
    return `${Math.round(sum / activeWithPing.length)} ms`;
  }, [segmentFilteredDevices, lastScanDone, isScanning]);

  // Filter devices list for sidebar tree view
  const sidebarFilteredDevices = useMemo(() => {
    const list = segmentFilteredDevices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia');
    if (!sidebarSearch) return list;
    return list.filter(d => 
      d.ip.includes(sidebarSearch) || 
      d.host.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [segmentFilteredDevices, sidebarSearch]);

  // Dynamic workstation IP properties based on the active segment or interface
  const activeWorkstationInfo = useMemo(() => {
    const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
    
    // Build dynamic array of segments including any custom manual IP segment
    let segments = [...currentInterfaceObj.segments];
    if (deviceManualIp) {
      const customSeg = extractSubnetFromIp(deviceManualIp);
      if (customSeg && !segments.includes(customSeg)) {
        segments = [customSeg, ...segments];
      }
    }

    // Determine which segment is active
    let seg = viewedSegmentFilter !== 'all' ? viewedSegmentFilter : subnetSegment;
    // If we have viewedSegmentFilter set to 'all' and subnetSegment isn't in this interface (including manual segment),
    // let's grab the first segment of the interface to keep it aligned!
    if (viewedSegmentFilter === 'all' && !segments.includes(seg)) {
      seg = segments[0] || '192.168.1.0/24';
    }

    const base = seg.replace(/\.0\/24$/, '').replace(/\.0\/16$/, '');
    
    // Use manual IP if provided; fallback to the real interface IP or simulated .55 IP
    let localIp = currentInterfaceObj.ip || `${base}.55`;
    if (deviceManualIp) {
      const trimmed = deviceManualIp.trim();
      const customSeg = extractSubnetFromIp(trimmed);
      if (customSeg === seg) {
        localIp = trimmed;
      } else {
        const parts = trimmed.split('.');
        if (parts.length === 4) {
          localIp = trimmed;
        }
      }
    }

    const gateway = `${base}.1`;
    const subnet = seg;

    return {
      localIp,
      gateway,
      subnet
    };
  }, [viewedSegmentFilter, selectedInterface, subnetSegment, deviceManualIp, activeInterfacesList]);

  const handleSaveCustomIp = () => {
    const rawVal = tempIpVal.trim();
    if (!rawVal) {
      setDeviceManualIp('');
      localStorage.removeItem('netmonitor_manual_ip');
      addAlert('Se restablecieron los valores de simulación por defecto.', 'info');
      setIsEditingRealIp(false);
      return;
    }

    const parts = rawVal.split('.');
    if (parts.length !== 4 || parts.some(p => isNaN(Number(p)) || Number(p) < 0 || Number(p) > 255)) {
      addAlert('Dirección IP inválida. Por favor ingresa una dirección IPv4 válida (ej. 192.168.1.134).', 'error');
      return;
    }

    setDeviceManualIp(rawVal);
    localStorage.setItem('netmonitor_manual_ip', rawVal);
    setIsEditingRealIp(false);

    // Prompt user to perform scan to refresh the active nodes with the new IP mappings
    const detectedSegment = extractSubnetFromIp(rawVal);
    if (detectedSegment) {
      setSubnetSegment(detectedSegment);
      // Automatically switch to the physical Wi-Fi or first simulated interface to reflect the IP
      if (!selectedInterface.includes("Intel Wi-Fi") && !selectedInterface.includes("Realtek")) {
        setSelectedInterface("Intel Wi-Fi 6E AX211 @ 802.11ax");
      }
    }
    addAlert(`IP real de tu portátil guardada: ${rawVal}. Sincronizando interfaz al segmento local: ${detectedSegment || 'Auto'}. ¡Pulsa "Escanear ahora" para barrer el segmento real!`, 'success');
  };

  const copyCellUrl = () => {
    const url = mobileAccessTab === 'cloud' && typeof window !== 'undefined' 
      ? window.location.origin 
      : `http://${activeWorkstationInfo.localIp}:3000`;
    navigator.clipboard.writeText(url);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-100">
        <div className="space-y-4 text-center">
          <Network className="h-10 w-10 text-cyan-400 animate-pulse mx-auto" />
          <p className="text-sm font-mono tracking-wider text-cyan-400 uppercase">Verificando Credenciales de Acceso...</p>
        </div>
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return (
      <NetworkAuthGate 
        onAuthenticated={handleAuthenticated} 
        onAddLog={(msg, type) => addAlert(msg, type)} 
      />
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#040814] tech-grid flex items-center justify-center p-4">
        <div className="bg-[#070b19]/95 border border-slate-800/80 rounded-xl max-w-4xl w-full p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-cyan-400 mb-2">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold font-display tracking-wider text-white uppercase">Asistente de Configuración de Vistas de Red</h2>
            <p className="text-xs text-slate-400 max-w-2xl mx-auto">
              ¡Bienvenido a <span className="text-cyan-400 font-bold">RedMonitor PRO</span>! Personalice su entorno de trabajo seleccionando los módulos y herramientas que desea visualizar en su menú de navegación lateral. Podrá modificar esta selección en cualquier momento desde "Seguridad y Accesos".
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {AVAILABLE_FEATURES.map((feature) => {
              const IconComp = feature.icon;
              const isChecked = enabledFeatures[feature.key] !== false;
              return (
                <div 
                  key={feature.key}
                  onClick={() => {
                    setEnabledFeatures(prev => ({
                      ...prev,
                      [feature.key]: !isChecked
                    }));
                  }}
                  className={`p-4 rounded-lg border cursor-pointer select-none transition-all duration-200 flex gap-4 items-start ${
                    isChecked 
                      ? 'bg-cyan-500/5 border-cyan-500/40 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                      : 'bg-slate-950/40 border-slate-900/80 hover:border-slate-800'
                  }`}
                >
                  <div className="mt-1 flex items-center justify-center">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div click
                      className="accent-cyan-500 h-4 w-4 cursor-pointer rounded border-slate-800 bg-slate-950"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <IconComp className={`h-4.5 w-4.5 ${isChecked ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs text-slate-100">{feature.label}</span>
                      <span className="text-[8px] font-mono tracking-widest uppercase bg-slate-850 text-slate-400 border border-slate-800 px-1.5 py-0.2 rounded">
                        {feature.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-800/80 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-[10.5px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span>Personalización de perfil de visualización activo</span>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('netmonitor_configured_features', JSON.stringify(enabledFeatures));
                setShowOnboarding(false);
                addAlert('🚀 ¡Consola configurada correctamente! Bienvenido a RedMonitor.', 'success');
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold uppercase py-3 px-8 rounded text-xs tracking-wider transition-all duration-200 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Inicializar Consola RedMonitor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#0B0F19] tech-grid font-sans text-xs text-slate-300 ${theme === 'light' ? 'light' : ''}`}>
      {/* HEADER BAR (Geometric Balance Theme) */}
      <header className="bg-[#070A13]/90 backdrop-blur-md text-slate-300 px-4 py-2.5 border-b border-slate-900/80 flex flex-wrap items-center justify-between gap-3 shadow-md z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center p-2 rounded-xs bg-[#0f172a]/95 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 focus:outline-hidden cursor-pointer transition-colors"
            title="Alternar navegación"
            id="mobile-nav-toggle-btn"
          >
            {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>

          <div className="bg-[#0f172a]/80 text-white px-2.5 py-1.5 rounded-xs font-semibold flex items-center gap-2.5 border border-slate-800/50 shadow-inner">
            <div className="w-6 h-6 bg-cyan-500 rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 border border-slate-900 bg-[#0F172A]" />
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-bold font-display tracking-wider text-white">Net-Core V4.0</div>
              <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">RedMonitor System</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-3">
            <Radio className={`h-4 w-4 ${isScanning ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-[10px] text-slate-500 font-mono">Simulador de LAN integrado</span>
          </div>

          {/* Ubicación actual */}
          <div 
            onClick={() => setShowLocationModal(true)}
            className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-3 cursor-pointer group hover:text-cyan-450 transition-colors"
            title="Haga clic aquí para cambiar la ubicación física de las pruebas"
          >
            <span className="text-[10.5px] text-amber-500 group-hover:animate-bounce">📍</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Sitio: <span className="text-cyan-400 font-bold group-hover:underline">{locationName || "Sede Local / No registrada"}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Controls Header Group */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] ml-auto">
          {/* Interfaz Select */}
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-slate-500 font-medium">Interfaz</span>
              <select 
                value={selectedInterface}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedInterface(val);
                  const matched = activeInterfacesList.find(i => i.name === val);
                  if (matched && matched.subnet) {
                    setSubnetSegment(matched.subnet);
                    addAlert(`Se cambió la interfaz de red a "${val}". Segmento sugerido: ${matched.subnet}.`, 'info');
                  }
                }}
                className="bg-slate-950 text-slate-200 border border-slate-800/50 rounded-xs px-2 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-medium"
              >
                {activeInterfacesList.map(i => (
                  <option key={i.name} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Glowing Laptop IP Badge */}
            <div className={`flex items-center gap-1 bg-[#0f172a]/90 px-2 py-1 rounded-sm text-cyan-400 font-mono text-[11px] h-[24px] border ${
              isHostedInCloud && !deviceManualIp 
                ? 'border-amber-500/55 animate-pulse bg-amber-955/10' 
                : 'border-cyan-500/20'
            }`}
              title={isHostedInCloud && !deviceManualIp 
                ? "Atención: RedMonitor corre en Google Cloud. Haz clic aquí para ingresar la IP PRIVADA de tu portátil y así escudriñar tu LAN real."
                : "Dirección IP activa de detección de tu portátil."
              }
            >
              <span className="text-slate-500 text-[10px]">Mi IP:</span>
              {isEditingRealIp ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempIpVal}
                    placeholder="ej: 192.168.1.134"
                    onChange={(e) => setTempIpVal(e.target.value)}
                    className="bg-slate-900 border border-cyan-500/50 rounded text-slate-200 px-1 py-0 w-28 text-[9px] focus:outline-hidden font-mono text-center"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCustomIp();
                      if (e.key === 'Escape') setIsEditingRealIp(false);
                    }}
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveCustomIp} 
                    className="text-emerald-400 hover:text-emerald-300 font-bold px-0.5 cursor-pointer text-[12px]"
                    title="Confirmar IP real"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={() => {
                      setTempIpVal(deviceManualIp);
                      setIsEditingRealIp(false);
                    }} 
                    className="text-rose-450 hover:text-rose-300 font-bold px-1 cursor-pointer text-[12px]"
                    title="Cancelar"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span 
                    onClick={() => {
                      setTempIpVal(deviceManualIp || activeWorkstationInfo.localIp);
                      setIsEditingRealIp(true);
                    }}
                    className="cursor-pointer hover:underline text-cyan-400 font-bold hover:text-cyan-300 select-all flex items-center gap-1 group leading-none"
                    title="Haz clic para ingresar la dirección IP real de tu portátil"
                  >
                    {activeWorkstationInfo.localIp}
                    <span className={`text-[8px] px-1 py-0.5 rounded font-sans font-normal border ${
                      deviceManualIp 
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30' 
                        : 'text-amber-400 bg-amber-950/40 border-amber-900/30 font-bold animate-pulse'
                    }`}>
                      {deviceManualIp ? 'Propia' : 'Simulada (Clic para cambiar)'}
                    </span>
                  </span>
                  
                  {/* Real-time hardware auto-discovery button (always visible) */}
                  <button
                    onClick={() => handleAutoSegment(true)}
                    className="ml-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 hover:text-cyan-300 border border-cyan-900/35 hover:border-cyan-700 p-0.5 rounded cursor-pointer transition-colors flex items-center justify-center h-[18px] w-[18px]"
                    title={isHostedInCloud 
                      ? "Intentar auto-detectar la IP local de tu portátil vía WebRTC"
                      : "Auto-detectar los adaptadores de red y la IP activa de este PC"
                    }
                  >
                    <Search className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Physical Link status controller (Unplug Wifi/Ethernet) */}
            <button
              onClick={() => {
                setIsCablePhysicallyConnected(prev => {
                  const nextState = !prev;
                  addAlert(nextState ? "🔌 Capa física simulada: CABLE DE RED CONECTADO / WIFI ACTIVO." : "🔌 Capa física simulada: CABLE DE RED DESCONECTADO / WIFI DESACTIVADO. Alarma activada.", nextState ? "success" : "error");
                  return nextState;
                });
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] font-mono font-medium transition-all cursor-pointer h-[24px] ${
                isNetworkOffline 
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title="Estatus físico del hardware de red. Haz clic para simular que desconectas el cable Ethernet o apagas la antena Wi-Fi de tu portátil."
            >
              <Cable className="h-3.5 w-3.5" />
              <span>{isNetworkOffline ? 'Enlace: CAÍDO 🔌' : 'Enlace: OK ✔'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isNetworkOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
            </button>

            {/* Real Internet egress status badge */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] font-mono font-medium transition-all h-[24px] ${
                hasRealInternetAccess === null
                  ? 'bg-slate-900 border-slate-800 text-slate-400 font-bold'
                  : hasRealInternetAccess
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 font-bold'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold'
              }`}
              title="Resultado de la última sonda de salida real a Internet (conectividad WAN externa)."
            >
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {hasRealInternetAccess === null 
                  ? 'WAN: Sin probar' 
                  : hasRealInternetAccess 
                    ? 'WAN: Con internet ✔' 
                    : 'WAN: Sin internet ❌'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                hasRealInternetAccess === null 
                  ? 'bg-slate-500' 
                  : hasRealInternetAccess 
                    ? 'bg-cyan-500' 
                    : 'bg-amber-500 animate-pulse'
              }`} />
            </div>
          </div>

          {/* TOGGLE Demo / Simulación */}
          <label className="flex items-center gap-1.5 text-amber-400 cursor-pointer" title="Habilita la simulación de hosts de prueba (TV, Consolas, Cámaras, etc.). Desactívalo para que el escáner sea 100% real y busque únicamente tus equipos físicos activos en la red local actual.">
            <input 
              type="checkbox" 
              checked={isDemoMode}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsDemoMode(checked);
                localStorage.setItem('netmonitor_demo_mode', String(checked));
                addAlert(checked ? "Modo Simulación DEMO activado: El escáner generará datos demostrativos y alarmas ficticias." : "Modo ESCANEO REAL activado: El escáner ahora mostrará con precisión quirúrgica únicamente tus dispositivos reales físicamente conectados mediante ARP y barrido ICMP.", "warning");
              }}
              className="rounded-xs border-slate-800/50 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer accent-amber-500"
            />
            <span className="select-none text-[11px] font-bold font-sans">🧪 Modo Demo</span>
          </label>

          {/* CHECKBOX Virtuales */}
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer" title="Habilita la simulación de hosts y contenedores virtuales en la subred activa">
            <input 
              type="checkbox" 
              checked={includeVirtuals}
              onChange={handleVirtualsChange}
              className="rounded-xs border-slate-800/50 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer accent-cyan-500"
            />
            <span className="select-none text-[11px] font-medium">Virtuales</span>
          </label>

          {/* CHECKBOX Scan All Configured Subnets */}
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer" title="Escaneo y sonda secuencial completa sobre todas las VLANs y subredes registradas en esta interfaz">
            <input 
              type="checkbox" 
              checked={scanAllSegments}
              onChange={(e) => setScanAllSegments(e.target.checked)}
              className="rounded-xs border-slate-800/50 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer accent-cyan-500"
            />
            <span className="select-none text-[11px] font-medium text-cyan-400/90 font-bold">Escaneo Multi-Red</span>
          </label>

          {/* Segmento IP Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium font-sans">Segmento IP</span>
            <div className="flex">
              <input 
                type="text" 
                value={subnetSegment}
                onChange={(e) => setSubnetSegment(e.target.value)}
                placeholder="192.168.1.0/24"
                className="bg-slate-950 text-slate-200 text-center border border-slate-800/50 rounded-l-xs w-32 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-mono font-medium"
              />
              <button 
                onClick={() => handleAutoSegment(true)}
                className="bg-slate-800 hover:bg-slate-755 text-cyan-400 font-semibold text-[10px] px-2 rounded-r-xs py-1 border-t border-r border-b border-slate-800 cursor-pointer transition-colors"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Intervalo Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Intervalo</span>
            <select 
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="bg-slate-950 text-slate-300 border border-slate-800/50 rounded-xs px-2 py-1 text-[11px] focus:outline-hidden focus:border-cyan-500 font-sans"
            >
              <option value="30 segundos">30 segundos</option>
              <option value="1 minuto">1 minuto</option>
              <option value="5 minutos">5 minutos</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* CONSULTAR FABRICANTES API BUTTON */}
          <button 
            disabled={isResolvingVendors || isCheckingInternet || isScanning}
            onClick={() => checkRealInternetConnection(false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-bold transition-all border shrink-0 ${
              isCheckingInternet
                ? 'bg-slate-950 text-cyan-400 border-cyan-500/50 cursor-wait'
                : isResolvingVendors 
                  ? 'bg-slate-950 text-amber-500 border-amber-500/50 cursor-wait' 
                  : isScanning
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    : 'bg-slate-950 text-amber-400 border-slate-850 hover:border-amber-500/50 hover:text-amber-300 active:scale-95 cursor-pointer'
            }`}
            title="Verifica la salida a internet de tu red local y, si la hay, consulta las direcciones MAC en bases de datos externas para resolver los nombres de fabricantes reales."
          >
            <Globe className={`h-3.5 w-3.5 ${
              isCheckingInternet 
                ? 'text-cyan-400 animate-pulse' 
                : isResolvingVendors 
                  ? 'text-amber-400 animate-spin' 
                  : 'text-amber-400'
            }`} style={{ animationDuration: isResolvingVendors ? '2s' : undefined }} />
            {isCheckingInternet 
              ? 'Verificando Internet...' 
              : isResolvingVendors 
                ? 'Resolviendo Nombres...' 
                : 'Verificar Internet y Nombres'}
          </button>

          {/* ESCANEAR AHORA BUTTON (Highlight Accent cyan) */}
          <button 
            disabled={isScanning}
            onClick={handleStartScan}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-bold transition-all shadow-xs pr-4 ${
              isScanning 
                ? 'bg-slate-800 text-cyan-500/50 opacity-60 cursor-not-allowed' 
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:text-black active:scale-95 cursor-pointer'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? (
              <span className="text-[10px] truncate max-w-[150px]">
                {currentScanningSegName ? `Sondeando ${currentScanningSegName.replace('.0/16', '').replace('.0/24', '')}...` : `Escaneando...`}
              </span >
            ) : 'Escanear ahora'}
          </button>

          {/* DESIGNER AND PROGRAMMER STATEMENT */}
          <div className="hidden sm:flex flex-col text-right pr-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">AUTORÍA DEL SISTEMA</span>
            <span className="text-[10px] font-semibold text-slate-300 font-sans tracking-wide">
              Diseñado y programado por <span className="font-bold text-cyan-400">ASNEIDER ZAPATA</span>
            </span>
          </div>

          {/* CLOCK */}
          <div className="border-l border-slate-800/50 pl-3 font-mono font-bold text-[13px] tracking-wider text-cyan-400 drop-shadow-sm w-20 text-right shrink-0">
            {currentTime || '9:34:52'}
          </div>
        </div>
      </header>

      {/* ALERTA ENLACE CAÍDO INTERFAZ FÍSICA / NAVEGADOR OFFLINE */}
      {isNetworkOffline && (
        <div className="bg-red-500/10 border-b border-rose-950 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-pulse text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold uppercase tracking-wide text-rose-450 pr-1">⚠️ Error de Capa Física / Enlace de Red:</span> 
              La interfaz <span className="font-mono text-white bg-red-950/40 px-1 py-0.5 rounded border border-rose-900/30 font-semibold">{selectedInterface}</span> reporta cable desconectado o Wi-Fi apagado. Las lecturas en vivo e ICMP están congeladas y reportan pérdida total.
            </div>
          </div>
          <button
            onClick={() => {
              setIsCablePhysicallyConnected(true);
              addAlert("Conectando de nuevo el cable virtual de red física.", "success");
            }}
            className="text-[10px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-rose-200 hover:text-white px-2.5 py-1 rounded font-bold cursor-pointer transition-all shrink-0"
          >
            Reconectar Cable
          </button>
        </div>
      )}



       {/* MODAL DE INSTRUCCIONES DE ESCANEO DE RED LOCAL REAL */}
       {isLocalHelpModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xs">
           <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 font-sans">
             <button 
               onClick={() => setIsLocalHelpModalOpen(false)}
               className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
             >
               <Terminal className="h-4 w-4" />
             </button>
 
             <h3 className="text-md font-bold text-white flex items-center gap-2 mb-2">
               <Network className="h-5 w-5 text-cyan-400 animate-pulse" />
               Conectar Dispositivos Reales de mi LAN
             </h3>
             
             <p className="text-xs text-slate-350 mb-4 leading-relaxed">
               Dado que este panel corre temporalmente en servidores en la nube de <span className="text-amber-450 font-semibold">Google Cloud Run</span>, el servidor no puede "tocar" tu enrutador físico ni tu red local de manera pasiva. Elige una de estas soluciones interactivas para sincronizar tus dispositivos reales:
             </p>
 
             {/* TABS SELECTOR */}
             <div className="flex border-b border-slate-800 mb-4">
               <button 
                 onClick={() => setProbeTab('arp')} 
                 className={`flex-1 pb-2.5 text-xs font-bold tracking-wide transition-all text-center border-b-2 cursor-pointer ${probeTab === 'arp' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 📋 Pegar arp -a (Rápido)
               </button>
               <button 
                 onClick={() => setProbeTab('manual')} 
                 className={`flex-1 pb-2.5 text-xs font-bold tracking-wide transition-all text-center border-b-2 cursor-pointer ${probeTab === 'manual' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 📝 Añadir Manual / CCTV
               </button>
               <button 
                 onClick={() => setProbeTab('local')} 
                 className={`flex-1 pb-2.5 text-xs font-bold tracking-wide transition-all text-center border-b-2 cursor-pointer ${probeTab === 'local' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 💻 Correr Localmente (Físico)
               </button>
             </div>
 
             {/* CONTENT - TAB 1: ARP-A PASTE */}
             {probeTab === 'arp' && (
               <div className="space-y-3.5">
                 <div className="bg-slate-950/80 p-3 rounded border border-slate-800/50 text-[11px] leading-relaxed text-slate-300">
                   <p className="font-semibold text-cyan-400 mb-1">💡 ¿Cómo funciona este método?</p>
                   Puedes sondear de forma pasiva tu red sin descargar nada. Abre la consola de tu ordenador, extrae la caché ARP de tu LAN en un segundo, y pégala aquí:
                   <ol className="list-decimal list-inside space-y-1 mt-2 text-slate-400 font-sans">
                     <li>Abre la consola en tu PC (<span className="text-white">PowerShell/CMD</span> en Windows o <span className="text-white">Terminal</span> en Mac/Linux).</li>
                     <li>Escribe el comando <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono font-bold select-all">arp -a</code> y pulsa <kbd className="text-white">Enter</kbd>.</li>
                     <li>Copia todo el texto que aparezca y pégalo en el cuadro de abajo.</li>
                   </ol>
                 </div>
 
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">CONTENIDO COPIADO DE LA CONSOLA (ARP / EXPORT DE ESCÁNER):</label>
                   <textarea
                     rows={5}
                     value={arpPasteText}
                     onChange={(e) => setArpPasteText(e.target.value)}
                     placeholder="Ejemplo Windows:&#10;192.168.1.1       10-7B-44-A2-99-11     dinámico&#10;192.168.1.15      00-11-32-8F-A1-AC     dinámico...&#10;&#10;Ejemplo Mac/Linux o Advanced IP Scanner CSV se detectan automáticamente."
                     className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-[11px] font-mono text-slate-200 focus:outline-hidden focus:border-cyan-500"
                   />
                 </div>
 
                 <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                   <span className="text-[10px] text-slate-400">
                     Soporta: <span className="text-slate-300">arp -a dumper</span>, <span className="text-slate-300">nmap lists</span>, exports de <span className="text-slate-300">Advanced IP Scanner</span>.
                   </span>
                   {manualDevicesList.length > 0 && (
                     <button
                       onClick={clearProbeDevices}
                       className="text-[10px] text-rose-450 hover:text-rose-400 font-bold bg-rose-950/20 px-2 py-1 rounded border border-rose-900/20 cursor-pointer"
                       title="Restablece las simulaciones de prueba por defecto"
                     >
                       Limpiar Sonda
                     </button>
                   )}
                 </div>
 
                 <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/60">
                   <button 
                     onClick={() => setIsLocalHelpModalOpen(false)}
                     className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs px-4 py-2 rounded-xs cursor-pointer"
                   >
                     Cerrar
                   </button>
                   <button 
                     onClick={() => {
                       if (!arpPasteText.trim()) {
                         addAlert("⚠️ Mensaje: Por favor pega la salida de tu caché arp -a primero.", "warning");
                         return;
                       }
                       const parsed = parseArpOutput(arpPasteText);
                       if (parsed.length === 0) {
                         addAlert("⚠️ Error de parseo: No se identificaron patrones de direcciones IP y MAC en el texto pegado.", "error");
                       } else {
                         handleUploadProbeDevices(parsed);
                       }
                     }}
                     className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-xs shadow-md cursor-pointer flex items-center gap-1.5"
                   >
                     <RefreshCw className="h-3 w-3 animate-pulse" />
                     Procesar y Cargar ({parseArpOutput(arpPasteText).length} detectados)
                   </button>
                 </div>
               </div>
             )}
 
             {/* CONTENT - TAB 2: MANUAL REGISTRATION */}
             {probeTab === 'manual' && (
               <div className="space-y-3.5">
                 <p className="text-[11px] text-slate-350">
                   Registra tu equipamiento favorito (Cámaras de Seguridad, NVR, Teléfonos, Smart TVs) manualmente. El panel interpretará sus marcas basándose en las tres primeras parejas de la dirección MAC.
                 </p>
 
                 <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded border border-slate-800/50">
                   <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dirección IP *</label>
                     <input
                       type="text"
                       value={manualDevIp}
                       onChange={(e) => setManualDevIp(e.target.value)}
                       placeholder="Ej: 192.168.1.18"
                       className="w-full bg-slate-900 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono"
                     />
                   </div>
 
                   <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nombre / Apodo *</label>
                     <input
                       type="text"
                       value={manualDevName}
                       onChange={(e) => setManualDevName(e.target.value)}
                       placeholder="Ej: Cámara Patio Hikvision"
                       className="w-full bg-slate-900 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono"
                     />
                   </div>
 
                   <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dirección MAC (Opcional)</label>
                     <input
                       type="text"
                       value={manualDevMac}
                       onChange={(e) => setManualDevMac(e.target.value)}
                       placeholder="Ej: E8-AB-FA-12-34-56"
                       className="w-full bg-slate-900 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono"
                     />
                   </div>
 
                   <div>
                     <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fabricante (Opcional)</label>
                     <input
                       type="text"
                       value={manualDevVendor}
                       onChange={(e) => setManualDevVendor(e.target.value)}
                       placeholder="Ej: Dahua Technology"
                       className="w-full bg-slate-900 border border-slate-800 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono"
                     />
                   </div>
 
                   <div className="col-span-2 flex justify-end">
                     <button
                       onClick={() => {
                         if (!manualDevIp.trim() || !manualDevName.trim()) {
                           addAlert("⚠️ Campos obligatorios faltantes: IP y Nombre son requeridos.", "warning");
                           return;
                         }
                         const cleanIp = manualDevIp.trim();
                         const cleanMac = manualDevMac.trim() || "00:00:00:00:00:00";
                         const cleanVendor = manualDevVendor.trim() || resolveVendorByMac(cleanMac, manualDevName, cleanIp);
 
                         const existingList = [...manualDevicesList];
                         const isDuplicate = existingList.some(d => d.ip === cleanIp);
                         
                         let updatedList = [];
                         if (isDuplicate) {
                           updatedList = existingList.map(d => d.ip === cleanIp ? { ...d, hostname: manualDevName, mac: cleanMac, vendor: cleanVendor } : d);
                         } else {
                           updatedList = [...existingList, {
                             ip: cleanIp,
                             mac: cleanMac,
                             hostname: manualDevName,
                             vendor: cleanVendor,
                             ping: Math.floor(Math.random() * 8) + 1
                           }];
                         }
 
                         setManualDevicesList(updatedList);
                         localStorage.setItem('netmonitor_manual_devices', JSON.stringify(updatedList));
                         addAlert(`Añadido/Actualizado: ${manualDevName} con IP ${cleanIp}`, "success");
                         
                         // Clear state
                         setManualDevIp('');
                         setManualDevName('');
                         setManualDevMac('');
                         setManualDevVendor('');
                       }}
                       className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xs transition-colors cursor-pointer"
                     >
                       + Registrar Dispositivo
                     </button>
                   </div>
                 </div>
 
                 {/* PREVIEW CONTAINER */}
                 <div className="max-h-[140px] overflow-y-auto border border-slate-800 rounded divide-y divide-slate-800/30 bg-slate-950/30">
                   <div className="bg-slate-900 text-[10px] uppercase font-bold text-slate-400 p-2 tracking-wider flex justify-between">
                     <span>Dispositivos para Sonda Local ({manualDevicesList.length})</span>
                     {manualDevicesList.length > 0 && (
                       <button onClick={clearProbeDevices} className="text-rose-400 hover:underline bg-transparent font-bold">Limpiar Sonda</button>
                     )}
                   </div>
                   {manualDevicesList.length === 0 ? (
                     <div className="p-3 text-center text-slate-500 text-xs">No tienes dispositivos manuales registrados aún en la sonda.</div>
                   ) : (
                     manualDevicesList.map((d, index) => (
                       <div key={index} className="p-2 flex justify-between items-center text-xs text-slate-350">
                         <div>
                           <span className="font-bold text-white font-mono">{d.ip}</span> - <span className="text-cyan-400">{d.hostname}</span>
                           <span className="text-[10px] text-slate-500 font-mono block">MAC: {d.mac} | {d.vendor}</span>
                         </div>
                         <button
                           onClick={() => {
                             const filtered = manualDevicesList.filter(dev => dev.ip !== d.ip);
                             setManualDevicesList(filtered);
                             localStorage.setItem('netmonitor_manual_devices', JSON.stringify(filtered));
                             addAlert(`Eliminado de la sonda: Host con IP ${d.ip}`, "info");
                           }}
                           className="text-red-400 hover:text-red-200 text-[11px] font-bold bg-transparent"
                         >
                           Eliminar
                         </button>
                       </div>
                     ))
                   )}
                 </div>
 
                 <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/60">
                   <button 
                     onClick={() => setIsLocalHelpModalOpen(false)}
                     className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs px-4 py-2 rounded-xs cursor-pointer"
                   >
                     Cerrar
                   </button>
                   <button
                     disabled={manualDevicesList.length === 0}
                     onClick={() => handleUploadProbeDevices(manualDevicesList)}
                     className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs px-5 py-2 rounded-xs shadow-md cursor-pointer flex items-center gap-1"
                   >
                     Sincronizar y Ver en Mapa
                   </button>
                 </div>
               </div>
             )}
 
             {/* CONTENT - TAB 3: RUN LOCAL NODE */}
             {probeTab === 'local' && (
               <div className="space-y-4">
                 <div className="bg-slate-950/90 border border-slate-800/50 rounded-xs p-3.5 mb-2 font-sans">
                   <h4 className="text-[11px] font-bold text-cyan-400 mb-2 uppercase tracking-wider">Paso a paso para medición real / física directa:</h4>
                   <ol className="text-slate-300 text-[11px] space-y-2.5 list-decimal list-inside leading-snug font-sans">
                     <li>
                       Haz clic en el menú superior izquierdo/derecho en la barra de herramientas y descarga el código fuente (<span className="text-emerald-400 font-semibold">Export ZIP</span>).
                     </li>
                     <li>
                       Descomprime el archivo en tu portátil o PC de la red LAN que deseas auditar.
                     </li>
                     <li>
                       Abre la consola/terminal en esa carpeta y ejecuta:
                       <div className="mt-1.5 bg-slate-900 border border-slate-800 text-slate-200 p-1.5 rounded font-mono text-[10px] break-all select-all">
                         npm install
                       </div>
                     </li>
                     <li>
                       Inicia la aplicación en tu entorno local físico:
                       <div className="mt-1.5 bg-slate-900 border border-slate-800 text-cyan-400 p-1.5 rounded font-mono text-[10px] break-all select-all">
                         npm run dev
                       </div>
                     </li>
                     <li>
                       Abre <span className="text-white underline font-semibold">http://localhost:3000</span> en tu navegador y ¡listo! El escáner ARP y barrido ICMP se ejecutará directo en tu hardware de red físico, detectando todo al vuelo sin simulación.
                     </li>
                   </ol>
                 </div>
 
                 <p className="text-[10px] text-slate-400 leading-normal mb-1">
                   💡 <span className="text-amber-400 font-semibold">Tip:</span> Para explorar y probar todas las métricas del panel gráfico en el contenedor en la nube, te recomendamos mantener activado el <span className="text-amber-400 font-semibold">🧪 Modo Demo</span>.
                 </p>
 
                 <div className="flex justify-end pt-2 border-t border-slate-800/60">
                   <button 
                     onClick={() => setIsLocalHelpModalOpen(false)}
                     className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-xs transition-all cursor-pointer shadow-md"
                   >
                     Entendido
                   </button>
                 </div>
               </div>
             )}
           </div>
         </div>
       )}

      {/* BREADCRUMBS SECONDARY ROW */}
      <nav className="bg-[#0B1120] text-[11px] text-slate-400 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between select-none shadow-xs font-medium">
        <ul className="flex items-center gap-1.5 flex-wrap">
          <li className="text-slate-500 font-semibold hover:text-slate-300 cursor-pointer" onClick={() => setActiveView('vista_general')}>Raíz</li>
          <li className="text-slate-600">›</li>
          <li className="text-cyan-500/80 font-semibold hover:text-cyan-400 cursor-pointer" onClick={() => setActiveView('vista_general')}>
            LAN {subnetSegment}
          </li>
          <li className="text-slate-600">›</li>
          <li className="bg-slate-800 px-2 py-0.5 rounded-sm text-slate-300 font-bold leading-none text-[10px] uppercase">
            {activeView === 'vista_general' ? 'Vista general' : 
             activeView === 'sensores' ? 'Sensores' : 
             activeView === 'dispositivos' ? 'Dispositivos' : 
             activeView === 'ancho_banda' ? 'Ancho de Banda' : 
             activeView === 'wiki_soporte' ? 'Wiki y Soporte' :
             activeView === 'configuracion' ? 'Configuración' :
             activeView === 'event_logger' ? 'Consola de Eventos' :
             activeView === 'diseno_red' ? 'Herramientas L2/L3' :
             'Pruebas y Diagnóstico'}
          </li>
        </ul>

        {isScanning && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-cyan-400 font-mono">BARRIDA IP: {scannedIndex} / 254 IP</span>
            <div className="w-24 bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div className="bg-cyan-400 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
            </div>
          </div>
        )}
      </nav>

      {/* COLOR COUNTERS (Sleek Geometric Balance cards) */}
      <section className="bg-[#0B0F19] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-900/80 shadow-md">
        {/* GREEN (OK) */}
        <div className="bg-slate-950/30 border border-emerald-500/20 text-emerald-400 py-3.5 px-5 rounded-lg flex items-center justify-between shadow-lg status-breath-ok transition-all hover:bg-slate-950/50 hover:-translate-y-0.5 duration-300">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.ok}</div>
            <div className="text-[10px] tracking-wider font-semibold opacity-75 mt-1.5 font-display uppercase text-slate-400">OK</div>
          </div>
          <CheckCircle2 className="h-5 w-5 opacity-70 text-emerald-400" />
        </div>

        {/* YELLOW (Advertencia) */}
        <div className="bg-slate-950/30 border border-amber-500/20 text-amber-500 py-3.5 px-5 rounded-lg flex items-center justify-between shadow-lg status-breath-warning transition-all hover:bg-slate-950/50 hover:-translate-y-0.5 duration-300">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.advertencia}</div>
            <div className="text-[10px] tracking-wider font-semibold opacity-75 mt-1.5 font-display uppercase text-slate-400">Advertencia</div>
          </div>
          <AlertTriangle className="h-5 w-5 opacity-70 text-amber-400" />
        </div>

        {/* RED (Caído) */}
        <div className="bg-slate-950/30 border border-rose-500/20 text-rose-500 py-3.5 px-5 rounded-lg flex items-center justify-between shadow-lg status-breath-danger transition-all hover:bg-slate-950/50 hover:-translate-y-0.5 duration-300">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.caido}</div>
            <div className="text-[10px] tracking-wider font-semibold opacity-75 mt-1.5 font-display uppercase text-slate-400">Caído</div>
          </div>
          <XCircle className="h-5 w-5 opacity-70 text-rose-400" />
        </div>

        {/* BLUE (Total) */}
        <div className="bg-slate-950/30 border border-cyan-500/15 text-cyan-400 py-3.5 px-5 rounded-lg flex items-center justify-between shadow-lg border-glow-cyan transition-all hover:bg-slate-950/50 hover:-translate-y-0.5 duration-300">
          <div>
            <div className="text-2xl font-light text-white font-mono leading-none">{counts.total}</div>
            <div className="text-[10px] tracking-wider font-semibold opacity-75 mt-1.5 font-display uppercase text-slate-400">Total</div>
          </div>
          <Layers className="h-5 w-5 opacity-70 text-cyan-400" />
        </div>
      </section>

      {/* THREE VIEW SPLIT CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* LEFT SIDEBAR NAVBAR */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-[#070A13]/95 backdrop-blur-md text-slate-300 p-4 border-r border-slate-900/80 flex-col gap-4 select-none flex-shrink-0 transition-all duration-300`}>
          
          {/* USER PROFILE INFO & LOGOUT */}
          {currentUser && (
            <div className="bg-[#0b1329]/80 p-2.5 rounded border border-slate-800 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#12244a] border border-cyan-500/20 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono shrink-0">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <span className="text-[10px] text-slate-300 font-bold block truncate">{currentUser.fullName}</span>
                  <span className={`inline-flex items-center text-[8px] font-bold font-mono px-1.5 py-0.5 uppercase rounded ${
                    currentUser.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {currentUser.role === 'admin' ? 'ADMIN' : 'AUDITOR'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-center py-1 bg-slate-900/50 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-850 hover:border-rose-500/20 text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
          
          {/* SENSOR SEARCH BOX */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filtrar dispositivos..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-slate-950/50 text-slate-200 pl-8.5 pr-3 py-1.5 rounded-md border border-slate-800/80 text-xs focus:outline-hidden focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 font-sans transition-all duration-300"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </div>

          {/* NAVIGATION TREE NODES */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1 font-display">Navegación</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <button 
                  onClick={() => { setActiveView('vista_general'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'vista_general' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Vista general</span>
                </button>
              </li>
              {enabledFeatures.sensores !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('sensores'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'sensores' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Sensores</span>
                  </button>
                </li>
              )}
              {enabledFeatures.dispositivos !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('dispositivos'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'dispositivos' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                    <span>Dispositivos</span>
                  </button>
                </li>
              )}
              {enabledFeatures.ancho_banda !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('ancho_banda'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'ancho_banda' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Ancho de Banda</span>
                    <span className="ml-auto bg-emerald-500/10 text-emerald-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-emerald-500/20">VIVO</span>
                  </button>
                </li>
              )}
              {enabledFeatures.testeo !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('testeo'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'testeo' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Consola de Pruebas</span>
                    <span className="ml-auto bg-cyan-500/10 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">TEST</span>
                  </button>
                </li>
              )}
              {enabledFeatures.ai_diagnostic !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('ai_diagnostic'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'ai_diagnostic' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Brain className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    <span>Copiloto de Red AI</span>
                    <span className="ml-auto bg-purple-500/15 text-purple-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-purple-500/20">GEMINI</span>
                  </button>
                </li>
              )}
              {enabledFeatures.speed_test !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('speed_test'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'speed_test' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Gauge className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Prueba de Velocidad</span>
                    <span className="ml-auto bg-cyan-500/10 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">MEGABITS</span>
                  </button>
                </li>
              )}
              {enabledFeatures.auditorias_red !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('auditorias_red'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'auditorias_red' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Auditorías de Red</span>
                    <span className="ml-auto bg-emerald-500/10 text-emerald-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-emerald-500/20">AUDITOR</span>
                  </button>
                </li>
              )}
              {enabledFeatures.diseno_red !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('diseno_red'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'diseno_red' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                    id="nav-diseno-red-btn"
                  >
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Herramientas L2/L3</span>
                    <span className="ml-auto bg-cyan-500/15 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">EMPRESA</span>
                  </button>
                </li>
              )}
              
              <li>
                <button 
                  onClick={() => { setActiveView('ubicaciones_offline' as any); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'ubicaciones_offline' as any
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                  id="nav-ubicaciones-btn"
                >
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Ubicaciones Offline</span>
                  <span className="ml-auto bg-cyan-500/15 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">CACHÉ</span>
                </button>
              </li>

              {enabledFeatures.event_logger !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('event_logger'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'event_logger' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                    id="nav-event-logger-btn"
                  >
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Consola de Eventos</span>
                    <span className="ml-auto bg-cyan-500/15 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">LOGGER</span>
                  </button>
                </li>
              )}
              {enabledFeatures.wiki_soporte !== false && (
                <li>
                  <button 
                    onClick={() => { setActiveView('wiki_soporte'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                      activeView === 'wiki_soporte' 
                        ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                        : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                    id="nav-wiki-btn"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                    <span>Wiki y Soporte</span>
                    <span className="ml-auto bg-cyan-500/15 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">WIKI</span>
                  </button>
                </li>
              )}

              <li>
                <button 
                  onClick={() => { setActiveView('configuracion'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left py-1.5 px-2.5 rounded-xs flex items-center gap-2 font-medium transition-colors ${
                    activeView === 'configuracion' 
                      ? 'bg-[#0f172a] text-cyan-400 font-semibold border-l-2 border-cyan-500' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                  id="nav-configuracion-btn"
                >
                  <Settings className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Configuración</span>
                  <span className="ml-auto bg-cyan-500/15 text-cyan-400 font-mono text-[8px] tracking-wider px-1 py-0.2 rounded-xs border border-cyan-500/20">SISTEMA</span>
                </button>
              </li>

              {/* Collapsible Subnet Folder Entry */}
              <li className="pt-2">
                <div 
                  onClick={() => setIsLanTreeOpen(!isLanTreeOpen)}
                  className="w-full text-left py-1.5 px-1 hover:bg-slate-900/30 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer select-none rounded-xs"
                >
                  {isLanTreeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="flex-1 truncate">LAN {subnetSegment}</span>
                  <span className="bg-slate-950 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded-xs border border-slate-800/50">
                    {sidebarFilteredDevices.length}
                  </span>
                </div>

                {/* Subnet hosts tree details (only showing active ones matching image 4 context!) */}
                {isLanTreeOpen && (
                  <ul className="pl-4 mt-0.5 border-l border-slate-800 list-none space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    {sidebarFilteredDevices.length === 0 ? (
                      <li className="text-[10px] text-slate-600 py-1 italic px-1">Sin hosts cargados.</li>
                    ) : (
                      sidebarFilteredDevices.map(d => {
                        let dotColor = 'bg-slate-700';
                        if (d.estado === 'OK') dotColor = 'bg-emerald-500';
                        else if (d.estado === 'Advertencia') dotColor = 'bg-amber-500';
                        else if (d.estado === 'Caído') dotColor = 'bg-rose-500';

                        return (
                          <li key={d.id}>
                            <button
                              onClick={() => setSelectedDevice(d)}
                              className="w-full text-left py-1 px-1.5 hover:bg-slate-900/30 rounded-xs text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-2 truncate"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <span className="truncate">{d.host !== '—' ? `${d.host} (${d.ip})` : d.ip}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            </ul>
          </div>

          {/* PERSONALIZACIÓN DE ADAPTADOR FÍSICO */}
          <div className="bg-slate-950 p-3 rounded-md border border-slate-800/50 shadow-inner text-slate-300">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] font-display">
                <Settings className="h-3.5 w-3.5 text-cyan-400" />
                Mi Adaptador de Red Real
              </h5>
              <button
                onClick={() => setIsEditingRealIp(!isEditingRealIp)}
                className="text-[#06b6d4] hover:text-cyan-300 text-[10px] font-semibold cursor-pointer select-none underline decoration-cyan-500/30"
              >
                {isEditingRealIp ? 'Ver info' : (deviceManualIp ? 'Cambiar IP' : 'Ajustar')}
              </button>
            </div>
            
            {deviceManualIp && !isEditingRealIp && (
              <div className="mt-2 p-1.5 bg-slate-900/60 rounded border border-cyan-950/40 flex items-center justify-between">
                <div className="leading-tight">
                  <span className="text-[8px] text-slate-500 font-mono block">IP CAPTURADA</span>
                  <span className="text-emerald-400 font-mono font-bold text-[11px]">{deviceManualIp}</span>
                </div>
                <button
                  onClick={() => {
                    setDeviceManualIp('');
                    setTempIpVal('');
                    localStorage.removeItem('netmonitor_manual_ip');
                    addAlert('Se restablecieron los valores de IP simulados por defecto (.55).', 'info');
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-rose-405 border border-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  title="Restablecer IP a la simulación estándar"
                >
                  Reset
                </button>
              </div>
            )}
            
            {(isEditingRealIp || !deviceManualIp) && (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-slate-400 leading-normal">
                  Dado que la app corre de forma segura en la nube (Cloud Run) y los navegadores web por privacidad bloquean el acceso al hardware real, ingresa tu dirección IP local para sincronizar con tu red física:
                </p>
                <div className="space-y-1.5">
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder="Ej: 192.168.1.134"
                      value={tempIpVal}
                      onChange={(e) => setTempIpVal(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800/85 rounded px-2 py-1 text-[10px] font-mono text-slate-200 focus:border-cyan-500 focus:outline-hidden"
                    />
                    <button
                      onClick={handleSaveCustomIp}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded font-bold text-[10px] transition-all cursor-pointer"
                    >
                      Ok
                    </button>
                  </div>
                  
                  {/* Presets segment list for super-easy 1-click calibration! */}
                  <div className="mt-1">
                    <span className="text-[8px] text-slate-500 font-semibold block uppercase tracking-wider mb-1">Preconfiguraciones comunes:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { ip: '192.168.1.134', label: '1.x (Wifi Hogar/Movistar)' },
                        { ip: '192.168.0.45', label: '0.x (VTR/Claro)' },
                        { ip: '192.168.100.55', label: '100.x (Fibra ONT)' },
                        { ip: '10.0.0.12', label: '10.x (Corporativo)' }
                      ].map((item) => (
                        <button
                          key={item.ip}
                          onClick={() => {
                            setTempIpVal(item.ip);
                            const prevSelected = selectedInterface;
                            setSelectedInterface("Intel Wi-Fi 6E AX211 @ 802.11ax");
                            setDeviceManualIp(item.ip);
                            localStorage.setItem('netmonitor_manual_ip', item.ip);
                            const customSeg = extractSubnetFromIp(item.ip);
                            if (customSeg) {
                              setSubnetSegment(customSeg);
                            }
                            addAlert(`Calibración rápida: Configurada IP ${item.ip} (${item.label}). Presiona "Escanear ahora" para simular este segmento físico.`, 'success');
                          }}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 text-[8px] px-1 py-0.5 rounded cursor-pointer transition-colors"
                          title={`Preajustar segmento ${item.ip}`}
                        >
                          {item.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCESO DESDE CELULAR (From mockup details, bottom left sidebar) */}
          <div className="bg-slate-950 p-3 rounded-md border border-slate-800/50 mt-auto shadow-inner text-slate-300">
            <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] font-display">
              <Monitor className="h-3.5 w-3.5 text-cyan-400" />
              Acceso desde Celular (QR)
            </h5>
            
            {/* Split selectors to handle any context gracefully */}
            <div className="flex border border-slate-800 rounded-sm overflow-hidden p-0.5 bg-slate-900 mt-2 text-[9px] font-bold">
              <button 
                type="button"
                onClick={() => setMobileAccessTab('cloud')}
                className={`flex-1 py-1 text-center rounded-xs cursor-pointer transition-colors ${
                  mobileAccessTab === 'cloud' 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Público (Nube)
              </button>
              <button 
                type="button"
                onClick={() => setMobileAccessTab('local')}
                className={`flex-1 py-1 text-center rounded-xs cursor-pointer transition-colors ${
                  mobileAccessTab === 'local' 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Servidor (Local)
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {mobileAccessTab === 'cloud' 
                ? 'Enlace público compartido sin restricciones de inicio de sesión de Google (Carga en cualquier celular):' 
                : 'Para cuando descargas y ejecutas RedMonitor localmente en tu red Wi-Fi real:'}
            </p>
            
            <div className="mt-1.5 text-cyan-400 font-mono font-medium truncate select-all text-[10px] bg-[#0c1222] p-1.5 rounded-sm border border-slate-800/50">
              {mobileAccessTab === 'cloud' && typeof window !== 'undefined' 
                ? window.location.origin.replace('-dev-', '-pre-') 
                : `http://${activeWorkstationInfo.localIp}:3000`}
            </div>

            {/* Dynamic QR Code generator for extreme convenience on real mobile phones */}
            <div className="mt-2.5 flex flex-col items-center justify-center p-2 bg-slate-900/30 rounded border border-slate-800/40">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=22d3ee&bgcolor=090e1a&data=${encodeURIComponent(
                  mobileAccessTab === 'cloud' && typeof window !== 'undefined' 
                    ? window.location.origin.replace('-dev-', '-pre-') 
                    : `http://${activeWorkstationInfo.localIp}:3000`
                )}`}
                alt="QR de Acceso Móvil"
                className="w-28 h-28 border border-cyan-500/10 rounded p-1.5 bg-[#090e1a] hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span className="text-[8px] text-cyan-400 uppercase font-mono mt-1.5 tracking-wider text-center block font-bold animate-pulse">
                {mobileAccessTab === 'cloud' ? '¡ESCANEAR ESTE CON TU CELULAR!' : 'ESCANEAR LOCAL (SÓLO LOCAL)'}
              </span>
            </div>

            {/* Troubleshooting notes inside the card to guide the user */}
            <div className="mt-2 space-y-1.5 text-[9px] text-slate-500 leading-tight">
              {mobileAccessTab === 'cloud' ? (
                <>
                  <p>
                    <span className="text-emerald-400 font-bold font-sans">✔️ RECOMENDADO:</span> Convertimos el enlace al protocolo público <strong className="text-slate-350">Shared App preview (-pre-)</strong>. Esto evita las cookies e inicio de sesión de Google Cloud y carga al instante en cualquier navegador móvil.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="text-cyan-500/80 font-bold font-sans">📶 REQUISITOS WI-FI:</span> Tu celular y tu PC deben estar conectados al mismo enrutador Wi-Fi.
                  </p>
                  <p>
                    <span className="text-amber-500/80 font-bold font-sans">🛡️ CORTAFUEGOS:</span> Ejecuta la app localmente en tu PC y habilita el puerto 3000 en tu Firewall para que responda a dispositivos de tu hogar.
                  </p>
                </>
              )}
            </div>

            <button 
              type="button"
              onClick={() => {
                const url = mobileAccessTab === 'cloud' && typeof window !== 'undefined' 
                  ? window.location.origin.replace('-dev-', '-pre-') 
                  : `http://${activeWorkstationInfo.localIp}:3000`;
                navigator.clipboard.writeText(url);
                setCopiedSuccess(true);
                setTimeout(() => setCopiedSuccess(false), 2000);
              }}
              className="w-full mt-2.5 bg-slate-900 hover:bg-slate-800/60 active:scale-95 text-slate-300 font-semibold py-1.5 px-2 rounded-xs border border-slate-800 text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copiedSuccess ? '¡Enlace copiado!' : 'Copiar enlace público'}
            </button>
          </div>

          {/* TECHNICAL META PARAMETERS GRID */}
          <div className="border-t border-slate-800/50 pt-3 text-[10px] space-y-1 text-slate-500 font-mono">
            <div className="flex justify-between">
              <span>Modo:</span>
              <span className="text-slate-400">Servidor (este PC)</span>
            </div>
            <div className="flex justify-between">
              <span>IP local:</span>
              <span className="text-slate-400">{activeWorkstationInfo.localIp}</span>
            </div>
            <div className="flex justify-between">
              <span>Subred:</span>
              <span className="text-slate-400">{activeWorkstationInfo.subnet}</span>
            </div>
            <div className="flex justify-between">
              <span>Gateway:</span>
              <span className="text-slate-400">{activeWorkstationInfo.gateway}</span>
            </div>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-transparent">
          
          {/* RENDER CHOSEN COMPONENT PATH */}
          {activeView === 'vista_general' && (
            <div className="space-y-4">
              
              {/* INTERACTIVE SEGMENTS TAB SELECTOR (Supports custom multi-segment view states) */}
              <div className="bg-[#0B1120]/40 border border-slate-800/80 p-3.5 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#06b6d4] font-mono flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Segon de Red / Segmentación Activa en Interfaz
                  </span>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Filtra y visualiza el mapa de red, los logs y las métricas para un segmento específico o la vista unificada.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setViewedSegmentFilter('all')}
                    className={`px-3 py-2 rounded transition-all cursor-pointer text-xs font-semibold flex items-center gap-2 border ${
                      viewedSegmentFilter === 'all'
                        ? 'bg-slate-800 text-cyan-400 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-950/50 text-slate-400 border-slate-800/50 hover:text-white hover:bg-slate-900/30'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Vista Conjunta (Todos)</span>
                    <span className="ml-1 bg-slate-900 border border-slate-800/80 text-[10px] text-cyan-400 font-mono font-bold px-1.5 py-0.5 rounded-full select-none">
                      {devices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia').length}
                    </span>
                  </button>

                  {(() => {
                    const currentInterfaceObj = activeInterfacesList.find(i => i.name === selectedInterface) || activeInterfacesList[0];
                    let segments = [...currentInterfaceObj.segments];
                    if (subnetSegment && !segments.includes(subnetSegment)) {
                      segments = [subnetSegment, ...segments];
                    }

                    return segments.map(seg => {
                      const isActive = viewedSegmentFilter === seg;
                      const activeCount = devices.filter(d => d.segmento === seg && (d.estado === 'OK' || d.estado === 'Advertencia')).length;
                      
                      // Assign a user-friendly alias based on subnet prefixes
                      let alias = "Subred";
                      if (seg.startsWith('192.168.1.')) alias = "LAN Principal";
                      else if (seg.startsWith('192.168.20.')) alias = "VLAN IoT / Domótica";
                      else if (seg.startsWith('192.168.100.')) alias = "Segmento IPTV / TV";
                      else if (seg.startsWith('10.0.0.')) alias = "WiFi Core";
                      else if (seg.startsWith('172.17.')) alias = "Contenedores Docker";
                      else if (seg.startsWith('10.10.10.')) alias = "VLAN Servidores DMZ";
                      
                      return (
                        <button
                          key={seg}
                          onClick={() => setViewedSegmentFilter(seg)}
                          className={`px-3 py-2 rounded transition-all cursor-pointer text-xs font-semibold flex items-center gap-2 border ${
                            isActive
                              ? 'bg-slate-800 text-cyan-450 text-cyan-400 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                              : 'bg-slate-950/50 text-slate-400 border-slate-800/60 hover:text-white hover:bg-slate-900/30'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <div className="text-left font-mono">
                            <span className="font-sans font-semibold text-[11px] block text-[9px] text-slate-500 tracking-tight leading-none mb-0.5">{alias}</span>
                            <span>{seg}</span>
                          </div>
                          <span className="ml-1 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono px-1.5 py-0.5 rounded-full select-none leading-none">
                            {activeCount}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* TOP CIRCULAR GAUGES ROW (Matches image 1) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Availability circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    {/* Ring background */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={100 - parseFloat(statsAvailability)}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-100">
                      {statsAvailability === '0%' ? '0%' : statsAvailability.split('.')[0] + '%'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {statsAvailability}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Disponibilidad
                    </div>
                  </div>
                </div>

                {/* Active hosts circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#06b6d4" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={lastScanDone ? 80 : 100}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-100">
                      {counts.ok + counts.advertencia}
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {counts.ok + counts.advertencia}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Hosts Activos
                    </div>
                  </div>
                </div>

                {/* Average latency circle */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex items-center justify-center gap-5 rounded-md">
                  <div className="relative w-18 h-18">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="2.5"></circle>
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="transparent" 
                        stroke="#f59e0b" 
                        strokeWidth="2.5" 
                        strokeDasharray="100" 
                        strokeDashoffset={lastScanDone ? 75 : 100}
                        className="transition-all duration-500 ease-out"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                      ms
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-200 font-display">
                      {statsAvgLatency}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans">
                      Latencia Media
                    </div>
                  </div>
                </div>

              </div>

              {/* CENTRAL AREA: HISTORICAL CHART AND DETAILS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <HistorialHosts historyData={historyData} />
                </div>
                
                {/* LATEST STATUS PANEL */}
                <div className="lg:col-span-4 bg-slate-900/50 p-4 border border-slate-800 shadow-xs flex flex-col justify-between rounded-md">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display border-b border-slate-800/50 pb-2 mb-2 flex items-center gap-1.5">
                      <Settings className="h-4 w-4 text-cyan-404 text-cyan-400" />
                      Último Diagnóstico
                    </h3>
                    <div className="space-y-2 mt-2">
                       <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Último escaneo:</span>
                        <span className="font-mono font-medium text-slate-300">
                          {counts.lastScanTime || 'No realizado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Duración:</span>
                        <span className="font-mono font-medium text-slate-300">
                          {counts.scanDuration !== null ? `${counts.scanDuration} segundos` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Frecuencia:</span>
                        <span className="font-mono font-medium text-cyan-400">{selectedInterval}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Estado general:</span>
                        <span className={`px-1.5 py-0.5 rounded-sm font-semibold uppercase font-display text-[9px] ${
                          lastScanDone 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {lastScanDone ? 'Monitoreando' : 'Requiere escaneo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center gap-2">
                    <div className="p-1 px-1.5 bg-cyan-500/10 text-cyan-400 rounded-sm font-mono text-[9px] border border-cyan-800/30 uppercase tracking-widest font-bold">
                      INFO
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-tight">
                      El escaneo de red simula la latencia local de los hosts usando subprocesos optimizados.
                    </p>
                  </div>
                </div>
              </div>

              {/* NEW SECTION: PREMIUM IP SUBNET CALCULATOR & LIVE NETWORK ACTIVITY ALERT REPORT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* ADVANCED SUBNET CALCULATOR */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 font-display mb-3 border-b border-slate-800/50 pb-2 flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-cyan-400" />
                      Calculadora de Subred IP e Inyección LAN
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase font-display">IP Base de Red</label>
                        <input
                          type="text"
                          value={calcIp}
                          onChange={(e) => setCalcIp(e.target.value)}
                          placeholder="192.168.1.0"
                          className="w-full bg-slate-950 text-slate-200 border border-slate-800/50 rounded px-2.5 py-1 text-xs font-mono focus:outline-hidden focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1 uppercase font-display">Prefijo CIDR</label>
                        <select
                          value={calcCidr}
                          onChange={(e) => setCalcCidr(Number(e.target.value))}
                          className="w-full bg-slate-950 text-slate-200 border border-slate-800/50 rounded px-2.5 py-1 text-xs font-mono focus:outline-hidden focus:border-cyan-500"
                        >
                          <option value="30">/30 (4 hosts, 2 usables)</option>
                          <option value="29">/29 (8 hosts, 6 usables)</option>
                          <option value="28">/28 (16 hosts, 14 usables)</option>
                          <option value="27">/27 (32 hosts, 30 usables)</option>
                          <option value="26">/26 (64 hosts, 62 usables)</option>
                          <option value="24">/24 (256 hosts, 254 usables)</option>
                          <option value="23">/23 (512 hosts, 510 usables)</option>
                          <option value="22">/22 (1024 hosts, 1022 usables)</option>
                          <option value="16">/16 (65536 hosts, 65534 usables)</option>
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const ans = calculateSubnetDetails(calcIp, calcCidr);
                      if (!ans) {
                        return (
                          <div className="bg-red-500/10 border border-rose-955/40 p-2.5 rounded text-rose-450 text-center font-semibold text-[11px]">
                            La dirección IP ingress es inválida. Ej. use "192.168.1.0"
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2 bg-slate-950/70 p-3 rounded-xs border border-slate-800/50 font-mono text-[10.5px]">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-400">
                            <div className="flex justify-between border-b border-slate-900/40 py-0.5">
                              <span className="text-slate-500">Máscara:</span>
                              <span className="text-slate-200 font-semibold">{ans.netMask}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-0.5">
                              <span className="text-slate-500">Usables:</span>
                              <span className="text-emerald-400 font-bold">{ans.usableCount} IPs</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-0.5 col-span-2">
                              <span className="text-slate-400 font-sans">Rango Host Usables:</span>
                              <span className="text-cyan-400 font-semibold">{ans.usableRange}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-0.5">
                              <span className="text-slate-500">Wilcard:</span>
                              <span className="text-slate-300">{ans.wildcard}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900/40 py-0.5">
                              <span className="text-slate-500">ID Red:</span>
                              <span className="text-slate-200">{ans.netAddr}</span>
                            </div>
                            <div className="flex justify-between col-span-2 py-0.5">
                              <span className="text-slate-500 font-mono">Broadcast:</span>
                              <span className="text-rose-400">{ans.broadAddr}</span>
                            </div>
                          </div>
                          
                          {/* Binary mask rendering to look extremely pro */}
                          <div className="border-t border-slate-900 pt-2 text-[9px] text-slate-500 leading-tight space-y-0.5 font-semibold">
                            <div className="truncate"><span className="text-slate-500 font-sans mr-2">IP (Binario):</span>{ans.binaryIp}</div>
                            <div className="truncate"><span className="text-slate-500 font-sans mr-2">Netmask (Bin):</span>{ans.binaryMask}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => {
                        const segment = `${calcIp}/${calcCidr}`;
                        setSubnetSegment(segment);
                        addAlert(`IP Asignada manualmente mediante calculadora a ${segment}.`, 'info');
                        // Small trigger timeout to scan automatically
                        setTimeout(() => {
                          handleStartScan();
                        }, 250);
                      }}
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-1.5 px-3 rounded-xs text-xs flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-cyan-500/10 cursor-pointer"
                    >
                      <Wifi className="h-3.5 w-3.5" />
                      Inyectar y Escanear esta Subred
                    </button>
                  </div>
                </div>

                {/* LIVE ALERTS AND LOG REPORT PANEL */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between w-full">
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 mb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-400 font-display flex items-center gap-1.5">
                        <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
                        Registro de Actividad y Alertas de Red
                      </h3>
                      <button
                        onClick={() => {
                          setLiveAlerts([
                            { id: 'start', time: new Date().toLocaleTimeString(), msg: 'Monitor local re-establecido. Registros vaciados.', type: 'info' }
                          ]);
                        }}
                        className="text-[9px] text-[#22d3ee] bg-cyan-950/10 hover:bg-[#0284c7]/20 hover:text-cyan-300 font-mono tracking-wider hover:underline uppercase px-1.5 py-0.5 rounded border border-cyan-800/20 cursor-pointer transition-all"
                      >
                        Limpiar Logs
                      </button>
                    </div>

                    <div className="max-h-[178px] overflow-y-auto space-y-2 pr-1 font-mono text-[10.5px]">
                      {liveAlerts.length === 0 ? (
                        <p className="text-center text-slate-600 italic py-10">Ningún registro nuevo en sesión.</p>
                      ) : (
                        liveAlerts.map(alert => (
                          <div 
                            key={alert.id} 
                            className={`p-2 rounded-xs border flex items-start gap-2.5 transition-all duration-150 ${
                              alert.type === 'success' ? 'bg-emerald-500/5 border-emerald-950/20 text-emerald-350' :
                              alert.type === 'warning' ? 'bg-amber-500/5 border-amber-950/20 text-amber-300' :
                              alert.type === 'error' ? 'bg-red-500/5 border-red-950/20 text-red-350' :
                              'bg-slate-950/50 border-slate-800/30 text-slate-400'
                            }`}
                          >
                            <span className="text-[9px] text-slate-500 select-none font-semibold whitespace-nowrap pt-0.5">{alert.time}</span>
                            <div className="text-left leading-relaxed">
                              {alert.msg}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-500 font-mono text-left pt-2 border-t border-slate-800/20 mt-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                    <span>Syslog de red activo escuchando tráfico en Loopback local y ARP.</span>
                  </div>
                </div>

              </div>

              {/* BOTTOM BENTO GRID: MAPS & TOP LATENCY TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* TOP LATENCIA */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-3 border-b border-slate-800/50 pb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-550 text-amber-500" />
                      Top Latencias Activas
                    </h3>
                    <ul className="space-y-2">
                      {devices.filter(d => d.ping !== null).length === 0 ? (
                        <li className="text-center py-6 text-slate-500 text-xs">
                          Inicie un escaneo rápido para ordenar latencias.
                        </li>
                      ) : (
                        devices
                          .filter(d => d.ping !== null)
                          .sort((a, b) => (b.ping || 0) - (a.ping || 0))
                          .slice(0, 4)
                          .map((d, index) => (
                            <li 
                              key={d.id} 
                              onClick={() => setSelectedDevice(d)}
                              className="flex items-center justify-between p-2 rounded-xs bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/30 hover:bg-slate-900/50 cursor-pointer text-xs transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-600">#{index+1}</span>
                                <div>
                                  <div className="font-semibold text-slate-300 truncate max-w-[120px]">{d.host}</div>
                                  <div className="font-mono text-[10px] text-cyan-400">{d.ip}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-amber-500">{d.ping} ms</div>
                                <span className="text-[9px] text-amber-600 font-sans">Alto</span>
                              </div>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* DISPOSITIVOS RECIENTES */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-3 border-b border-slate-800/50 pb-2 flex items-center gap-1.5">
                      <Server className="h-4 w-4 text-cyan-400" />
                      Servidores & Host Encontrados
                    </h3>
                    <ul className="space-y-2">
                      {devices.filter(d => d.estado === 'OK').length === 0 ? (
                        <li className="text-center py-6 text-slate-500 text-xs">
                          Ejecute el escáner para mapear equipos sanos.
                        </li>
                      ) : (
                        devices
                          .filter(d => d.estado === 'OK')
                          .slice(0, 4)
                          .map(d => (
                            <li 
                              key={d.id} 
                              onClick={() => setSelectedDevice(d)}
                              className="flex items-center justify-between p-2 rounded-xs bg-emerald-500/5 border border-emerald-950/20 hover:border-emerald-500/30 hover:bg-[#0F172A] cursor-pointer text-xs transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                                <div>
                                  <div className="font-semibold text-slate-300 truncate max-w-[120px]">{d.host}</div>
                                  <div className="font-mono text-[10px] text-slate-500">{d.ip}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-emerald-400">{d.ping} ms</div>
                                <span className="text-[9px] text-emerald-500 uppercase font-mono tracking-wider font-semibold">Saludable</span>
                              </div>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* SIMULACION MANUAL SETTINGS HELP */}
                <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 font-display mb-2 border-b border-slate-800/50 pb-2 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-slate-500" />
                      Información de Conectividad
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      RedMonitor escanea simultáneamente múltiples sockets utilizando subprocesos ICMP. Para inspeccionar en detalle el estado de cualquier sistema, haz clic en el mapa de subred o navega a la sección de sensores individuales.
                    </p>
                    <div className="bg-[#0B1120] p-2.5 border border-slate-800/50 rounded-xs mt-3 font-mono text-[10px] leading-tight space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Peticiones:</span>
                        <span className="text-slate-350">Ping ICMP ECHO</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Rango:</span>
                        <span className="text-slate-350">{subnetSegment}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* MAPA DE SUBRED GRID */}
              <div className="w-full">
                <MapSubred devices={mapDevices} onSelectDevice={setSelectedDevice} isDemoMode={isDemoMode} selectedDeviceId={selectedDevice?.id} />
              </div>

            </div>
          )}

          {activeView === 'sensores' && (
            <SensorTable sensors={sensors} isScanning={isScanning} />
          )}

          {activeView === 'dispositivos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-4 border border-slate-800/60 rounded-md gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Inventario y Personalización L2/L3</h4>
                  <p className="text-[11px] text-slate-500">
                    Las asignaciones personalizadas de apodos y marcas se guardan permanentemente en tu navegador vinculadas a la dirección MAC física de cada dispositivo.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportCustomizations}
                    className="text-xs bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-450 font-semibold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5"
                    title="Exportar copia de seguridad de marcas y apodos editados"
                  >
                    📥 Exportar Inventario
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="text-xs bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-450 font-semibold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5"
                    title="Importar copia de seguridad de marcas y apodos editados (.json)"
                  >
                    📤 Importar Inventario
                  </button>
                  {(Object.keys(customNames).length > 0 || Object.keys(customVendors).length > 0) && (
                    <button
                      onClick={handleClearCustomizations}
                      className="text-xs bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-500 text-rose-350 font-semibold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5"
                      title="Restablecer todas las marcas y nombres personalizados de fábrica"
                    >
                      🗑️ Limpiar Todo
                    </button>
                  )}
                  <input
                    type="file"
                    ref={importInputRef}
                    accept=".json"
                    onChange={handleImportCustomizations}
                    className="hidden"
                  />
                </div>
              </div>
              <DeviceTable devices={segmentFilteredDevices} onSelectDevice={setSelectedDevice} />
            </div>
          )}

          {activeView === 'ancho_banda' && (
            <BandwidthMonitor 
              devices={processedDevices}
              isScanning={isScanning}
              onSelectDevice={setSelectedDevice}
              onTriggerTraffic={handleTriggerTraffic}
              onResetTraffic={handleResetTraffic}
              trafficGeneratorActive={trafficGeneratorActive}
              bandwidthHistory={bandwidthHistory}
            />
          )}

          {activeView === 'testeo' && (
            <TestingCenter 
              devices={processedDevices} 
              sensors={sensors}
              setDevices={setDevices}
              setSensors={setSensors}
              setHistoryData={setHistoryData}
              subnetSegment={subnetSegment}
              includeVirtuals={includeVirtuals}
              activeAnomaly={activeAnomaly}
              setActiveAnomaly={setActiveAnomaly}
            />
          )}

          {activeView === 'ai_diagnostic' && (
            <NetworkAICopilot 
              devices={processedDevices}
              activeAnomaly={activeAnomaly}
              subnetSegment={subnetSegment}
              sensors={sensors}
            />
          )}

          {activeView === 'speed_test' && (
            <SpeedTest onAddLog={addAlert} />
          )}

          {activeView === 'auditorias_red' && (
            <NetworkAudit 
              devices={processedDevices} 
              onAddLog={addAlert} 
              locationName={locationName}
            />
          )}

          {activeView === 'wiki_soporte' && (
            <NetworkWiki />
          )}

          {activeView === 'configuracion' && currentUser && (
            <ConfigurationPanel 
              theme={theme}
              setTheme={handleSetTheme}
              authToken={authToken!}
              currentUser={currentUser}
              onAddLog={addAlert}
              enabledFeatures={enabledFeatures}
              onUpdateFeatures={handleUpdateFeatures}
            />
          )}

          {activeView === ('ubicaciones_offline' as any) && (
            <OfflineLocationsManager
              currentLocationName={locationName}
              currentSubnet={subnetSegment}
              currentInterface={selectedInterface}
              activeDevices={devices.filter(d => d.estado !== 'No_Escaneado')}
              onLoadProfile={handleLoadOfflineProfile}
              onAddLog={addAlert}
              onAddAlert={addAlert}
              activeProfileId={loadedProfileId}
              onUnloadProfile={handleUnloadOfflineProfile}
            />
          )}

          {activeView === 'event_logger' && (
            <EventLogger 
              logs={liveAlerts} 
              onAddLog={addAlert} 
              onClearLogs={() => setLiveAlerts([])} 
            />
          )}

          {activeView === 'diseno_red' && (
            <NetworkEnterpriseTools />
          )}



        </main>
      </div>

      {/* FOOTER BAR CHROME (Correct inspired credit line) */}
      <footer className="bg-[#0B1120] border-t border-slate-800/50 px-4 py-2.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between select-none font-mono z-30">
        <div>
          {isScanning ? (
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin inline" />
              Escaner en curso, barriendo subred... {scanProgress}% completado
            </span>
          ) : lastScanDone ? (
            <span>
              Escaneo completado — <strong className="text-emerald-400">{counts.ok} OK</strong>, <strong className="text-amber-500">{counts.advertencia} Advertencia</strong>, <strong className="text-red-500">{counts.caido} caídos</strong> • Próximo escaneo en: {selectedInterval}
            </span>
          ) : (
            <span>Listo — Esperando primer escaneo de la subred {subnetSegment}...</span>
          )}
        </div>
        <div className="font-sans text-slate-600">
          RedMonitor v1.0 • Inspirado en **PRTG Network Monitor**
        </div>
      </footer>

      {/* FLOAT MODE DIAGNOSTIC MODAL */}
      {selectedDevice && (() => {
        const activeDiagDevice = processedDevices.find(d => d.id === selectedDevice.id) || selectedDevice;
        if (!activeDiagDevice) return null;
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#0F172A] rounded-xs border border-slate-800 w-full max-w-sm shadow-2xl overflow-hidden font-sans">
              <div className="bg-[#0B1120] text-slate-100 border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wide font-display text-cyan-400 text-left">
                    Diagnóstico de IP: {activeDiagDevice.ip}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="text-slate-500 hover:text-white font-bold text-base cursor-pointer px-1 py-0.5 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                
                {/* Core header of the device state */}
                <div className="bg-slate-950/40 p-3 rounded-xs border border-slate-800/40 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activeDiagDevice.estado === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                    activeDiagDevice.estado === 'Advertencia' ? 'bg-amber-500/10 text-amber-500' :
                    activeDiagDevice.estado === 'Caído' && activeDiagDevice.lastChecked !== null ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="text-left flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="bg-slate-900 border border-slate-800/30 text-slate-200 text-[11px] px-2 py-0.5 rounded focus:outline-hidden focus:border-cyan-500 w-full"
                          maxLength={32}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameDevice(activeDiagDevice.id, tempName);
                              setIsEditingName(false);
                            } else if (e.key === 'Escape') {
                              setIsEditingName(false);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            handleRenameDevice(activeDiagDevice.id, tempName);
                            setIsEditingName(false);
                          }}
                          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer shrink-0"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <h4 className="font-semibold text-slate-200 text-xs text-left">
                          {activeDiagDevice.host !== '—' ? activeDiagDevice.host : 'Host Inactivo'}
                        </h4>
                        {activeDiagDevice.estado !== 'No_Escaneado' && (
                          <button
                            onClick={() => {
                              setTempName(activeDiagDevice.host !== '—' ? activeDiagDevice.host : '');
                              setIsEditingName(true);
                            }}
                            className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer opacity-70 group-hover/title:opacity-100"
                            title="Editar apodo del host"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 font-mono text-left">{activeDiagDevice.ip}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm ${
                      activeDiagDevice.estado === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                      activeDiagDevice.estado === 'Advertencia' ? 'bg-amber-500/10 text-amber-500' :
                      activeDiagDevice.estado === 'Caído' && activeDiagDevice.lastChecked !== null ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {activeDiagDevice.estado === 'No_Escaneado' ? 'Inactivo' : activeDiagDevice.estado}
                    </span>
                  </div>
                </div>

                {/* TABS SELECTOR IN MODAL */}
                <div className="flex border-b border-slate-800/50 text-[10.5px]">
                  <button
                    onClick={() => setModalTab('info')}
                    className={`flex-1 py-1.5 font-bold tracking-wide uppercase transition-all duration-150 text-center cursor-pointer ${
                      modalTab === 'info'
                        ? 'border-b-2 border-cyan-500 text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-350 bg-slate-950/20'
                    }`}
                  >
                    📁 Parámetros
                  </button>
                  <button
                    onClick={() => setModalTab('fingerprint')}
                    className={`flex-1 py-1.5 font-bold tracking-wide uppercase transition-all duration-150 text-center cursor-pointer ${
                      modalTab === 'fingerprint'
                        ? 'border-b-2 border-cyan-500 text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-350 bg-slate-950/20'
                    }`}
                  >
                    🏷️ Huella (TTL/HTTP)
                  </button>
                  <button
                    onClick={() => setModalTab('ports')}
                    className={`flex-1 py-1.5 font-bold tracking-wide uppercase transition-all duration-150 text-center cursor-pointer ${
                      modalTab === 'ports'
                        ? 'border-b-2 border-cyan-500 text-cyan-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-350 bg-slate-950/20'
                    }`}
                  >
                    🔍 Puertos
                  </button>
                </div>

                {modalTab === 'info' ? (
                  <div className="space-y-4">
                    {/* Diagnostic Parameters Grid */}
                    <div className="space-y-1.5 text-xs">
                      <h5 className="font-bold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                        PARÁMETROS DEL HOST
                      </h5>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xs border border-slate-800/25 font-mono text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[9px] text-left">MAC ADDRESS</span>
                          <span className="text-slate-200 font-semibold font-mono text-left block">{activeDiagDevice.mac}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] text-left">PING LATENCIA</span>
                          <span className={`font-bold text-left block ${activeDiagDevice.ping ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {activeDiagDevice.ping !== null ? `${activeDiagDevice.ping} ms` : '—'}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-500 block text-[9px] text-left">BAJADA/SUBIDA</span>
                          <span className="text-slate-200 block text-left font-bold">
                            <span className="text-cyan-400">↓{(activeDiagDevice.consumoDownload || 0).toFixed(1)}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-amber-500">↑{(activeDiagDevice.consumoUpload || 0).toFixed(1)}</span>
                            <span className="text-slate-500 text-[9px] ml-1 font-normal font-sans">Mbps</span>
                          </span>
                        </div>
                        <div className="mt-1">
                           <span className="text-slate-500 block text-[9px] text-left">DATO TOTAL</span>
                           <span className="text-emerald-400 font-bold block text-left">
                             {activeDiagDevice.totalConsumido !== undefined ? `${Math.round(activeDiagDevice.totalConsumido)} MB` : '0 MB'}
                           </span>
                        </div>
                        <div className="col-span-2 border-t border-slate-800/30 pt-2 mt-1">
                          <span className="text-slate-500 block text-[9px] text-left mb-1">MARCA / FABRICANTE DEL DISPOSITIVO</span>
                          {isEditingVendor ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Escribe marca (ej. Hikvision, Apple, TP-Link)..."
                                  value={tempVendor}
                                  onChange={(e) => setTempVendor(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 text-slate-200 text-[11px] px-2 py-1 rounded focus:outline-hidden focus:border-cyan-500 w-full font-sans animate-none"
                                  maxLength={32}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateDeviceVendor(activeDiagDevice.id, tempVendor);
                                      setIsEditingVendor(false);
                                    } else if (e.key === 'Escape') {
                                      setIsEditingVendor(false);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    handleUpdateDeviceVendor(activeDiagDevice.id, tempVendor);
                                    setIsEditingVendor(false);
                                  }}
                                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-2 py-1 text-[10px] rounded transition-colors cursor-pointer shrink-0 font-sans"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setIsEditingVendor(false)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2 py-1 text-[10px] rounded transition-colors cursor-pointer shrink-0 font-sans"
                                >
                                  Cancelar
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Hikvision', 'Dahua', 'EZVIZ', 'Sony', 'TP-Link', 'HP', 'Intel', 'LG', 'Nintendo'].map(brand => (
                                  <button
                                    key={brand}
                                    type="button"
                                    onClick={() => setTempVendor(brand)}
                                    className="text-[9px] bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  >
                                    {brand}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-cyan-400 font-semibold block text-left font-sans">
                                {isGenericVendor(activeDiagDevice.vendor)
                                  ? resolveVendorByMac(activeDiagDevice.mac, activeDiagDevice.host, activeDiagDevice.ip)
                                  : activeDiagDevice.vendor}
                              </span>
                              {activeDiagDevice.estado !== 'No_Escaneado' && (
                                <button
                                  onClick={() => {
                                    const curBrand = isGenericVendor(activeDiagDevice.vendor)
                                      ? resolveVendorByMac(activeDiagDevice.mac, activeDiagDevice.host, activeDiagDevice.ip)
                                      : activeDiagDevice.vendor!;
                                    setTempVendor(curBrand === 'Sonda de Red Genérica' ? '' : curBrand);
                                    setIsEditingVendor(true);
                                  }}
                                  className="text-slate-500 hover:text-cyan-400 text-[10px] font-sans underline transition-colors cursor-pointer"
                                >
                                  Editar Marca
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Simulated active checkers/sensors list inside diagnostic popup */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <h5 className="font-bold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                        SENSORES INTEGRADOS ({activeDiagDevice.estado === 'No_Escaneado' ? 0 : activeDiagDevice.sensorHttp ? 2 : 1})
                      </h5>
                      {activeDiagDevice.estado === 'No_Escaneado' ? (
                        <p className="text-slate-500 text-[11px] italic font-sans text-left">(Mapeador sin escanear. Inicie un escaneo para activar sensores).</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Ping Sensor row */}
                          <div className="flex items-center justify-between p-2 rounded-xs bg-slate-950/25 border border-slate-800/30 text-slate-300">
                            <div className="text-left">
                              <div className="font-semibold text-slate-300 text-left">Sensor Ping ICMP</div>
                              <span className="text-[10px] text-slate-500 font-mono text-left block">Verifica respuesta de eco</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-200">{activeDiagDevice.ping !== null ? `${activeDiagDevice.ping} ms` : 'Falla'}</span>
                              <div className={`text-[9px] uppercase font-bold ${activeDiagDevice.ping !== null ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {activeDiagDevice.ping !== null ? 'Responde' : 'Fuera de red'}
                              </div>
                            </div>
                          </div>

                          {/* HTTP Sensor row if applicable */}
                          {activeDiagDevice.sensorHttp && (
                            <div className="flex items-center justify-between p-2 rounded-xs bg-slate-950/25 border border-[#1e293b] text-slate-300">
                              <div className="text-left">
                                <div className="font-semibold text-slate-300 text-left">Sensor Puerto TCP HTTP</div>
                                <span className="text-[10px] text-slate-500 font-mono text-left block">Verifica código 200 en puerto 80</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-slate-200">
                                  {activeDiagDevice.estado === 'OK' ? '200 OK' : 'No responde'}
                                </span>
                                <div className={`text-[9px] uppercase font-bold ${activeDiagDevice.estado === 'OK' ? 'text-emerald-400' : 'text-amber-550'}`}>
                                  {activeDiagDevice.estado === 'OK' ? 'Activo' : 'Advertencia'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : modalTab === 'fingerprint' ? (
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5">
                      <h5 className="font-bold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                        ANÁLISIS DE HUELLA DIGITAL (TTL/HTTP)
                      </h5>
                      {isAnalyzingFingerprint && (
                        <div className="text-[10px] text-cyan-400 font-mono animate-pulse">
                          Escuchando red...
                        </div>
                      )}
                    </div>

                    {/* Passive/Active status card */}
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xs p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <span className="text-[9px] text-slate-500 uppercase block font-bold">Postura del Host</span>
                          <span className="text-[11px] text-slate-300 font-semibold font-sans">
                            {activeDiagDevice.estado === 'Caído' ? 'Fuera de Línea (No identificable)' : 'Identificación Disponible'}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-xs text-[8px] font-bold uppercase font-mono ${
                          activeDiagDevice.estado === 'Caído' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/25'
                        }`}>
                          {activeDiagDevice.estado === 'Caído' ? 'Inactivo' : 'Listo'}
                        </span>
                      </div>

                      {activeDiagDevice.estado !== 'Caído' && (
                        <div className="grid grid-cols-2 gap-2 text-left pt-1 border-t border-slate-800/30">
                          <div>
                            <span className="text-[8px] text-slate-500 font-bold block">S.O. DEDUCIDO</span>
                            <span className="text-[10px] text-cyan-400 font-bold font-sans">
                              {analyzedSuccessfully ? activeDiagDevice.osDeducido : '— (Requiere Análisis)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 font-bold block">SIGNATURA TTL</span>
                            <span className="text-[10px] text-slate-300 font-mono">
                              TTL = {activeDiagDevice.ttl || 64} ({activeDiagDevice.ttl === 255 ? 'Router' : activeDiagDevice.ttl === 128 ? 'Windows' : 'Unix/Linux'})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Scan Button / Progress */}
                    {activeDiagDevice.estado !== 'Caído' && (
                      <div className="space-y-3">
                        {!isAnalyzingFingerprint && !analyzedSuccessfully && (
                          <div className="text-center py-4 space-y-2">
                            <Sliders className="h-7 w-7 text-cyan-500 mx-auto opacity-60" />
                            <p className="text-[10.5px] text-slate-400 leading-normal max-w-[280px] mx-auto font-sans text-center">
                              Ejecute una inspección profunda para recolectar cabeceras HTTP Server/User-Agent y analizar el TTL de respuesta para inferir con precisión el S.O.
                            </p>
                            <button
                              onClick={() => handleStartFingerprintAnalysis(activeDiagDevice)}
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1.5 rounded-xs hover:shadow-cyan-500/10 hover:shadow-md active:scale-95 transition-all text-xs cursor-pointer inline-flex items-center gap-1.5 font-sans"
                            >
                              <Search className="h-3.5 w-3.5" />
                              Analizar Huella Digital
                            </button>
                          </div>
                        )}

                        {isAnalyzingFingerprint && (
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                              <span>Decodificando Paquetes...</span>
                              <span>{fingerprintProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/40">
                              <div 
                                className="bg-cyan-400 h-full transition-all duration-150 ease-out"
                                style={{ width: `${fingerprintProgress}%` }}
                              />
                            </div>
                            
                            {/* Live packet logs console */}
                            <div className="bg-slate-950 border border-slate-800 p-2 rounded-xs h-[160px] overflow-y-auto text-[9.5px] font-mono text-slate-400 space-y-1 scrollbar-thin text-left pr-1 select-none">
                              {fingerprintLogs.map((log, index) => {
                                if (!log || typeof log !== 'string') return null;
                                return (
                                  <div key={index} className={`leading-relaxed border-b border-slate-950/20 pb-0.5 last:border-0 ${
                                    log.includes('[SUCCESS]') ? 'text-emerald-400 font-bold' :
                                    log.includes('[ICMP]') ? 'text-cyan-300' :
                                    log.includes('[HTTP]') ? 'text-amber-400' :
                                    log.includes('[ANALYSIS]') ? 'text-indigo-300' :
                                    'text-slate-400'
                                  }`}>
                                    {log}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {analyzedSuccessfully && (
                          <div className="space-y-3">
                            {/* Completed telemetry results view */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xs p-2.5 space-y-2 text-left font-mono text-[10.5px]">
                              <div className="border-b border-slate-900 pb-1 flex justify-between">
                                <span className="text-slate-500">MÉTODO DE ANÁLISIS:</span>
                                <span className="text-cyan-400 font-bold font-sans text-[10px]">INSPECCIÓN ACTIVA (DPI)</span>
                              </div>

                              <div className="space-y-1.5 pt-0.5">
                                <div>
                                  <span className="text-slate-500 text-[9px] block">1. FIRMA TTL (CAPA 3 IP)</span>
                                  <div className="text-slate-300 pl-1 border-l-2 border-indigo-500">
                                    Valor TTL = <strong className="text-slate-200">{activeDiagDevice.ttl}</strong> 
                                    <span className="text-slate-500 text-[9px] ml-1">({activeDiagDevice.ttlOs})</span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-slate-500 text-[9px] block">2. CABECERA HTTP SERVER (CAPA 7 APLICACIÓN)</span>
                                  <div className="text-slate-300 pl-1 border-l-2 border-amber-500 truncate" title={activeDiagDevice.httpServer || '—'}>
                                    Server: <strong className="text-slate-200">{activeDiagDevice.httpServer || '— (No expone puerto 80)'}</strong>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-slate-500 text-[9px] block">3. USER-AGENT INTERCEPTADO</span>
                                  <div className="text-slate-400 pl-1 border-l-2 border-emerald-500 break-all text-[9.5px]" title={activeDiagDevice.userAgent || '—'}>
                                    {activeDiagDevice.userAgent || '— (Sin solicitudes activas)'}
                                  </div>
                                </div>

                                <div className="border-t border-slate-900 pt-1.5 mt-2">
                                  <span className="text-slate-500 text-[9px] block uppercase font-bold">Resultado de Huella Unificada</span>
                                  <div className="text-emerald-400 font-bold font-sans text-xs flex items-center gap-1.5 mt-0.5 font-sans">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <span>{activeDiagDevice.osDeducido}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleStartFingerprintAnalysis(activeDiagDevice)}
                              className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 py-1.5 rounded-xs font-bold text-[10.5px] cursor-pointer transition-colors font-sans text-center"
                            >
                              Volver a Analizar Huella
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {activeDiagDevice.estado === 'Caído' && (
                      <div className="text-center py-6 bg-slate-950/20 border border-slate-800/30 rounded p-4 space-y-1">
                        <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto opacity-60" />
                        <h6 className="font-bold text-slate-400 text-[11px]">Host Fuera de Línea</h6>
                        <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto font-sans text-center">
                          No es posible recolectar firmas TTL ni cabeceras HTTP porque el host no responde a las solicitudes de ping ni de conexión de red.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5">
                      <h5 className="font-bold uppercase text-slate-500 text-[10px] tracking-wider font-display text-left">
                        EXPLORADOR DE PUERTOS LOCAL
                      </h5>
                      {activeScanningPort && (
                        <div className="text-[10px] text-cyan-400 font-mono animate-pulse">
                          Escaneando puerto: {activeScanningPort}
                        </div>
                      )}
                    </div>

                    {portScanStatus === 'idle' && (
                      <div className="text-center py-5 space-y-3">
                        <Terminal className="h-8 w-8 text-slate-500 mx-auto opacity-40 text-slate-500" />
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-xs mx-auto">
                          Inspeccione los puertos TCP más comunes de este sistema para buscar configuraciones vulnerables o servicios expuestos.
                        </p>
                        <button
                          onClick={() => handleStartPortScan(activeDiagDevice.ip)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1.5 rounded-xs hover:shadow-cyan-500/10 hover:shadow-md active:scale-95 transition-all text-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Ejecutar Escaneo de Puertos
                        </button>
                      </div>
                    )}

                    {portScanStatus === 'scanning' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono pr-1 text-slate-400">
                          <span>Progreso de Escaneo TCP...</span>
                          <span>{portScanProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/50">
                          <div 
                            className="bg-cyan-400 h-full transition-all duration-200 ease-out shadow-inner"
                            style={{ width: `${portScanProgress}%` }}
                          />
                        </div>
                        <div className="max-h-[160px] overflow-y-auto space-y-1.5 bg-slate-950/40 p-2 border border-slate-800/50 rounded-xs pr-1">
                          {portScanResults.map(r => (
                            <div key={r.port} className="flex justify-between items-center p-1 font-mono text-[10px] border-b border-slate-900/40">
                              <span className="text-slate-300">{r.port}/tcp ({r.service})</span>
                              <span className="text-slate-405 text-slate-500 truncate max-w-[140px] text-[9px]">{r.desc}</span>
                              <span className={`px-1 py-0.2 rounded-xs font-bold uppercase text-[8px] ${
                                r.status === 'open' 
                                  ? r.risk === 'high' ? 'bg-rose-500/15 text-rose-450 text-rose-400 border border-rose-500/20' 
                                    : r.risk === 'medium' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 text-emerald-400'
                                  : 'bg-slate-900 text-slate-600'
                              }`}>
                                {r.status === 'open' ? 'Abierto' : 'Cerrado'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {portScanStatus === 'done' && (
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Escaneo Completado
                          </span>
                          <button
                            onClick={() => handleStartPortScan(activeDiagDevice.ip)}
                            className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Re-escanear
                          </button>
                        </div>
                        
                        <div className="max-h-[165px] overflow-y-auto space-y-1 bg-slate-950 p-2.5 rounded-xs border border-slate-800/50 pr-1">
                          {portScanResults.map(r => (
                            <div key={r.port} className="flex items-center justify-between p-1 border-b border-slate-900 text-[10.5px]">
                              <div className="text-left">
                                <div className="font-mono text-slate-200">
                                  {r.port} <span className="text-slate-500 text-[9px]">/tcp</span> ({r.service})
                                </div>
                                <div className="text-[9px] text-slate-500">{r.desc}</div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[8px] leading-none ${
                                r.status === 'open'
                                  ? r.risk === 'high' ? 'bg-red-500/10 text-rose-400 border border-rose-900/40'
                                    : r.risk === 'medium' ? 'bg-amber-500/15 text-amber-500 border border-amber-800/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/40'
                                  : 'bg-slate-900 text-slate-600'
                              }`}>
                                {r.status === 'open' ? 'Abierto' : 'Cerrado'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Security Advisory alert based on found risk */}
                        {portScanResults.some(r => r.risk === 'high' && r.status === 'open') ? (
                          <div className="bg-red-500/10 p-2 rounded-xs border border-rose-950/40 text-[10px] leading-relaxed flex items-start gap-2 text-rose-300">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                            <div className="text-left">
                              <strong className="block text-rose-400 uppercase font-bold text-[9px] mb-0.5">Alerta de Vulnerabilidad Crítica</strong>
                              El puerto TELNET (23) se encuentra abierto. TELNET transmite toda la información (incluidos los usuarios y claves) en texto plano, haciéndolo vulnerable a escuchas no autorizadas. Migre de inmediato a SSH (puerto 22) para cifrar la conexión.
                            </div>
                          </div>
                        ) : portScanResults.some(r => r.risk === 'medium' && r.status === 'open') ? (
                          <div className="bg-amber-500/10 p-2 rounded-xs border border-amber-950/30 text-[10px] leading-relaxed flex items-start gap-2 text-amber-300">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                            <div className="text-left">
                              <strong className="block text-amber-400 uppercase font-bold text-[9px] mb-0.5">Advertencia de Seguridad Media</strong>
                              Se detectó el puerto FTP (21) abierto en el NAS de backup. FTP no implementa cifrado nativo sobre el canal de control. Considere actualizar el servicio de almacenamiento local a SFTP o HTTPS si los datos son confidenciales.
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-500/10 p-2 rounded-xs border border-emerald-950/40 text-[10px] leading-relaxed flex items-start gap-2 text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            <div className="text-left">
                              <strong className="block text-emerald-400 uppercase font-bold text-[9px] mb-0.5">Análisis de Postura Sano</strong>
                              No se encontraron puertos inseguros de administración expuestos. Los puertos abiertos detectados poseen configuraciones normales para transporte de datos local LAN.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal action Buttons footer */}
              <div className="bg-slate-900 px-4 py-3 border-t border-slate-800/50 flex justify-end gap-2">
                <button 
                  onClick={() => setSelectedDevice(null)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold font-sans py-1.5 px-6 rounded-xs cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE SOLICITUD DE UBICACIÓN INICIAL */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-lg max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 font-sans">
            
            <div className="flex items-center gap-2.5 mb-4 text-cyan-400">
              <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/30">
                <span className="text-base text-cyan-400">📍</span>
              </div>
              <h3 className="text-md font-bold text-white leading-tight">
                Ubicación de la Auditoría
                <span className="block text-[10px] text-slate-500 font-mono font-normal uppercase tracking-wider mt-0.5">Trazabilidad de Verificación Portátil</span>
              </h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Dado que este equipo se traslada a múltiples sedes u oficinas, por favor indique el nombre del sitio donde se encuentra para que aparezca en los reportes de red generados en formato PDF.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-1.5">
                  Nombre de la Ubicación / Sitio
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ej. Sede Norte - Servidores, Sucursal Centro, Bodega 4"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-sm px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationName.trim()) {
                      localStorage.setItem('netmonitor_current_location', locationName.trim());
                      setShowLocationModal(false);
                      addAlert(`📍 Ubicación de pruebas asignada a: "${locationName.trim()}"`, 'success');
                    }
                  }}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const finalLocation = locationName.trim() || 'Sede Local';
                    setLocationName(finalLocation);
                    localStorage.setItem('netmonitor_current_location', finalLocation);
                    setShowLocationModal(false);
                    addAlert(`📍 Ubicación de pruebas asignada a: "${finalLocation}"`, 'success');
                  }}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs py-2 px-5 rounded-xs cursor-pointer transition-colors"
                >
                  Confirmar Ubicación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
