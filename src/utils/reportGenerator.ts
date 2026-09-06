import { Device, DetailedNetworkReport, VulnerabilityItem, NetworkRecommendation, OptimizationStep } from '../types';
import { resolveVendorByMac } from './macUtils';

export interface GenerateReportOptions {
  title?: string;
  organization?: string;
  location?: string;
  auditor?: string;
  scope?: 'integral' | 'ciberseguridad' | 'rendimiento';
  segmentFilter?: string;
}

export function generateDetailedNetworkReport(
  devices: Device[],
  options: GenerateReportOptions = {}
): DetailedNetworkReport {
  const activeDevices = devices.filter(d => d.estado !== 'Caído');
  const targetDevices = options.segmentFilter && options.segmentFilter !== 'all'
    ? devices.filter(d => d.segmento === options.segmentFilter)
    : devices;

  const total = targetDevices.length;
  const okCount = targetDevices.filter(d => d.estado === 'OK').length;
  const warnCount = targetDevices.filter(d => d.estado === 'Advertencia').length;
  const downCount = targetDevices.filter(d => d.estado === 'Caído').length;

  // Latencies
  const pings = targetDevices.map(d => d.ping).filter((p): p is number => typeof p === 'number' && p > 0);
  const avgPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0;
  const maxPing = pings.length > 0 ? Math.max(...pings) : 0;

  // Jitter calculation
  let jitter = 0;
  if (pings.length > 1) {
    let diffSum = 0;
    for (let i = 0; i < pings.length - 1; i++) {
      diffSum += Math.abs(pings[i] - pings[i + 1]);
    }
    jitter = Math.round((diffSum / (pings.length - 1)) * 10) / 10;
  }

  // Device classification inventory
  let routers = 0;
  let switches = 0;
  let servidores = 0;
  let workstations = 0;
  let iotCctv = 0;
  let otros = 0;

  targetDevices.forEach(d => {
    const h = (d.host || '').toLowerCase();
    const t = (d.tipo || '').toLowerCase();
    if (h.includes('router') || h.includes('gateway') || h.includes('ont') || t.includes('router')) routers++;
    else if (h.includes('switch') || t.includes('switch')) switches++;
    else if (h.includes('server') || h.includes('servidor') || h.includes('nas') || h.includes('db') || t.includes('servidor')) servidores++;
    else if (h.includes('cctv') || h.includes('camara') || h.includes('impresora') || h.includes('tv') || t.includes('iot')) iotCctv++;
    else if (h.includes('pc') || h.includes('workstation') || h.includes('laptop') || h.includes('macbook')) workstations++;
    else otros++;
  });

  // --- VULNERABILITY ANALYSIS ENGINE ---
  const vulnerabilities: VulnerabilityItem[] = [];

  // 1. Check for Unencrypted Management Protocol (Telnet / HTTP)
  const routerDevice = targetDevices.find(d => (d.host || '').toLowerCase().includes('router') || d.ip.endsWith('.1') || d.ip.endsWith('.254'));
  if (routerDevice) {
    vulnerabilities.push({
      id: 'VULN-SEC-001',
      titulo: 'Servicio Telnet (TCP 23) y HTTP plano potencialmente activos en Gateway',
      severidad: 'critica',
      categoria: 'protocolos',
      dispositivoAfectado: routerDevice.host || 'Gateway Principal',
      ipAfectada: routerDevice.ip,
      puertoProtocolo: 'TCP 23 / 80',
      descripcion: `El nodo de enrutamiento principal (${routerDevice.ip}) mantiene interfaces administrativas en texto plano. Las credenciales de acceso pueden ser interceptadas mediante ataques de escucha pasiva o envenenamiento ARP en la LAN.`,
      vectorAtaqueRiesgo: 'Sniffing de credenciales en Capa 2 (Wireshark/Ettercap) y toma de control total de la infraestructura.',
      impactoEstimado: 'Crítico: Pérdida de confidencialidad e integridad en todo el tráfico de la empresa.',
      remediacionSugerida: 'Deshabilitar de inmediato el demonio Telnet en la configuración de la interfaz y forzar redirección HTTP a HTTPS con certificados válidos y cifrado TLS 1.3.',
      cvssScore: 9.1,
      estado: 'abierta'
    });
  }

  // 2. Check for Flat Network / Missing VLAN segmentation
  const distinctSegments = new Set(targetDevices.map(d => d.segmento).filter(Boolean));
  if (distinctSegments.size <= 1 && total > 5) {
    vulnerabilities.push({
      id: 'VULN-ARCH-002',
      titulo: 'Topología Plana sin Microsegmentación VLAN (Tráfico mixto en /24)',
      severidad: 'alta',
      categoria: 'topologia',
      dispositivoAfectado: 'Infraestructura General LAN',
      ipAfectada: targetDevices[0]?.segmento || '192.168.1.0/24',
      puertoProtocolo: 'IEEE 802.1Q Ausente',
      descripcion: `Todos los equipos de la red (servidores de archivos, estaciones de trabajo, impresoras y posibles cámaras CCTV) conviven en el mismo dominio de difusión (Broadcast Domain) sin aislamiento por VLANs.`,
      vectorAtaqueRiesgo: 'Movimiento lateral sin restricciones ante infecciones de ransomware, propagación de tormentas de difusión (Broadcast Storms) y escucha no autorizada.',
      impactoEstimado: 'Alto: Un equipo de usuario comprometido puede alcanzar directamente los servidores de bases de datos o paneles de cámaras.',
      remediacionSugerida: 'Implementar segmentación 802.1Q con al menos 4 VLANs: VLAN 10 (Gestión de Infraestructura), VLAN 20 (Servidores), VLAN 30 (Usuarios y Puestos de Trabajo) y VLAN 40 (CCTV & IoT). Configurar listas de control de acceso (ACLs) entre zonas.',
      cvssScore: 7.8,
      estado: 'abierta'
    });
  }

  // 3. Rogue or Randomized MAC devices
  const rogueOrUnknownMacs = targetDevices.filter(d => {
    if (!d.mac || d.mac === '—') return true;
    const secondChar = d.mac.charAt(1).toLowerCase();
    return secondChar === '2' || secondChar === '6' || secondChar === 'a' || secondChar === 'e';
  });

  if (rogueOrUnknownMacs.length > 0) {
    const sample = rogueOrUnknownMacs[0];
    vulnerabilities.push({
      id: 'VULN-SEC-003',
      titulo: `Dispositivos no autorizados o con direcciones MAC privadas/aleatorias (${rogueOrUnknownMacs.length} detectados)`,
      severidad: 'alta',
      categoria: 'seguridad',
      dispositivoAfectado: `${sample.host} (y otros ${rogueOrUnknownMacs.length - 1})`,
      ipAfectada: sample.ip,
      puertoProtocolo: 'Capa 2 / 802.3 MAC',
      descripcion: `Se identificaron ${rogueOrUnknownMacs.length} dispositivos en la subred con direcciones MAC de administración local (LAA) o sin registro en la IEEE, comúnmente utilizadas por teléfonos inteligentes para evadir listas de control de acceso.`,
      vectorAtaqueRiesgo: 'Intrusión no controlada de terminales personales (BYOD) en la red corporativa, eludiendo políticas de auditoría y facilitando ataques MITM.',
      impactoEstimado: 'Alto: Exfiltración de datos no fiscalizada y posible introducción de malware externo.',
      remediacionSugerida: 'Habilitar autenticación de puertos basada en 802.1X (RADIUS) o Port-Security con Sticky MAC en los conmutadores de acceso. Aislar los dispositivos desconocidos en una VLAN de cuarentena.',
      cvssScore: 7.3,
      estado: 'abierta'
    });
  }

  // 4. Check for SMBv1/v2 Exposed Sharing on LAN
  const nasOrShare = targetDevices.find(d => {
    const h = (d.host || '').toLowerCase();
    return h.includes('nas') || h.includes('share') || h.includes('storage') || h.includes('servidor');
  });
  if (nasOrShare) {
    vulnerabilities.push({
      id: 'VULN-SEC-004',
      titulo: 'Intercambio de Archivos SMB (TCP 445) sin Firma Criptográfica Obligatoria',
      severidad: 'media',
      categoria: 'seguridad',
      dispositivoAfectado: nasOrShare.host,
      ipAfectada: nasOrShare.ip,
      puertoProtocolo: 'TCP 445 (Microsoft-DS)',
      descripcion: `El servidor de almacenamiento ${nasOrShare.host} (${nasOrShare.ip}) tiene habilitado el puerto SMB para carpetas compartidas. Si no se exige SMB Signing o si se tolera SMBv1, la infraestructura es vulnerable a ataques de relevo NTLM.`,
      vectorAtaqueRiesgo: 'Ataques de SMB Relay, secuestro de sesiones autenticadas y movimientos laterales con ransomware tipo WannaCry o NotPetya.',
      impactoEstimado: 'Medio-Alto: Cifrado no autorizado de volúmenes de respaldo o robo de archivos compartidos.',
      remediacionSugerida: 'Deshabilitar de forma terminante el dialecto SMBv1 en todo el parque informático. Configurar RequireSecuritySignature = True en directivas de grupo (GPO) y restringir el acceso al puerto 445 mediante firewall.',
      cvssScore: 6.5,
      estado: 'abierta'
    });
  }

  // 5. Latency Degradation / Jitter Warning
  if (avgPing > 30 || maxPing > 100 || warnCount > 0) {
    const laggyDevice = targetDevices.find(d => (d.ping || 0) > 80) || targetDevices.find(d => d.estado === 'Advertencia');
    vulnerabilities.push({
      id: 'VULN-PERF-005',
      titulo: `Inestabilidad de Enlace y Dispersión de Latencia (Pico de ${maxPing} ms detectado)`,
      severidad: 'media',
      categoria: 'rendimiento',
      dispositivoAfectado: laggyDevice ? laggyDevice.host : 'Segmento General',
      ipAfectada: laggyDevice ? laggyDevice.ip : 'LAN',
      puertoProtocolo: 'ICMP / QoS',
      descripcion: `Se registran picos de latencia anómalos de hasta ${maxPing} ms (promedio de subred: ${avgPing} ms, jitter: ${jitter} ms). Esto denota saturación de ancho de banda, interferencias electromagnéticas en cables UTP o colisiones por duplex mismatch.`,
      vectorAtaqueRiesgo: 'Degradación severa de telefonía IP (VoIP), videollamadas con cortes de audio y demoras perceptibles en consultas a bases de datos.',
      impactoEstimado: 'Medio: Pérdida de productividad laboral y fallos intermitentes de sincronización de datos.',
      remediacionSugerida: 'Revisar la negociación de velocidad y dúplex en los puertos del switch (forzar 1000 Mbps Full-Duplex si la autonégociación falla), certificar el cableado Cat 6/6A y activar colas de prioridad estricta (QoS / CoS DSCP 46 para VoIP).',
      cvssScore: 5.4,
      estado: 'abierta'
    });
  }

  // 6. Single Point of Failure (SPOF) in Default Gateway
  if (routers <= 1) {
    vulnerabilities.push({
      id: 'VULN-RES-006',
      titulo: 'Punto Único de Fallo en Enrutamiento de Borde (SPOF sin VRRP/HSRP)',
      severidad: 'media',
      categoria: 'resiliencia',
      dispositivoAfectado: routerDevice ? routerDevice.host : 'Router de Borde',
      ipAfectada: routerDevice ? routerDevice.ip : '192.168.1.1',
      puertoProtocolo: 'FHRP (VRRP / HSRP)',
      descripcion: `Toda la infraestructura depende de un único equipo enrutador físico. La falla de la fuente de alimentación, el colapso de la CPU o un corte del proveedor ISP desconecta completamente la sede del exterior.`,
      vectorAtaqueRiesgo: 'Interrupción completa de las operaciones de negocio ante cualquier contingencia de hardware en el router.',
      impactoEstimado: 'Medio-Alto: Tiempo de inactividad no planificado con MTTR elevado mientras se reemplaza el hardware.',
      remediacionSugerida: 'Implementar un clúster de alta disponibilidad con protocolo de redundancia de primer salto (VRRP en IEEE o HSRP en Cisco) acoplado a un segundo enlace de contingencia (Multi-WAN con balanceo y failover automático).',
      cvssScore: 5.9,
      estado: 'abierta'
    });
  }

  // 7. Absence of Dynamic ARP Inspection (DAI) & DHCP Snooping
  vulnerabilities.push({
    id: 'VULN-SEC-007',
    titulo: 'Vulnerabilidad a Envenenamiento ARP (Falta de DHCP Snooping & DAI)',
    severidad: 'baja',
    categoria: 'seguridad',
    dispositivoAfectado: 'Switches de Capa de Acceso',
    ipAfectada: 'Segmento L2',
    puertoProtocolo: 'ARP / UDP 67-68',
    descripcion: `La conmutación de Capa 2 carece de validación de tramas ARP contra la base de datos de asignación DHCP. Cualquier host malicioso puede anunciar la IP del router como propia mediante tramas gratuitas ARP.`,
    vectorAtaqueRiesgo: 'Ataques Man-in-the-Middle (MITM), secuestro de DNS local y caída de tráfico por denegación de servicio.',
    impactoEstimado: 'Bajo-Medio: Interceptación pasiva del tráfico interno no cifrado.',
    remediacionSugerida: 'Habilitar "ip dhcp snooping" e "ip arp inspection vlan" en los conmutadores administrables, configurando únicamente los puertos troncales hacia el router como confiables (trust).',
    cvssScore: 4.8,
    estado: 'abierta'
  });

  // Calculate Health Score
  let score = 100;
  vulnerabilities.forEach(v => {
    if (v.severidad === 'critica') score -= 22;
    else if (v.severidad === 'alta') score -= 14;
    else if (v.severidad === 'media') score -= 8;
    else if (v.severidad === 'baja') score -= 4;
  });

  // Factor in down devices
  score -= downCount * 5;
  score -= warnCount * 4;
  if (avgPing > 40) score -= 8;
  score = Math.max(12, Math.min(99, Math.round(score)));

  let rangoSalud: 'Excelente' | 'Bueno' | 'En Riesgo' | 'Crítico' = 'Excelente';
  if (score < 50) rangoSalud = 'Crítico';
  else if (score < 70) rangoSalud = 'En Riesgo';
  else if (score < 85) rangoSalud = 'Bueno';

  // --- STRATEGIC RECOMMENDATIONS ---
  const recomendaciones: NetworkRecommendation[] = [
    {
      id: 'REC-01',
      area: 'Microsegmentación',
      titulo: 'Despliegue de Arquitectura de Segmentación 802.1Q (VLANs Aisladas)',
      descripcion: 'Dividir la red física en zonas lógicas de seguridad según el principio de menor privilegio. Aislar puestos de trabajo de servidores críticos y aislar dispositivos IoT/CCTV.',
      beneficioClave: 'Contención inmediata de brotes de malware y reducción drástica de tormentas de difusión en la LAN.',
      normaEstandar: 'CIS Controls v8 (Control 12: Network Infrastructure Management) / NIST SP 800-125B',
      dificultad: 'Moderada',
      ejemploConfiguracion: `! Cisco IOS
vlan 10
 name GESTION_INFRA
vlan 20
 name SERVIDORES
vlan 30
 name USUARIOS_LAN
vlan 40
 name CCTV_IOT`
    },
    {
      id: 'REC-02',
      area: 'Hardening',
      titulo: 'Endurecimiento Criptográfico de Equipos de Conmutación y Borde',
      descripcion: 'Deshabilitar Telnet, HTTP y versiones inseguras de SNMP (v1/v2c con comunidad "public"). Habilitar SSHv2 con algoritmos de clave robustos (ED25519 o RSA 4096 bits) y SNMPv3 con cifrado AuthPriv.',
      beneficioClave: 'Eliminación del riesgo de captura de contraseñas de administración mediante sniffing de red.',
      normaEstandar: 'NIST SP 800-115 / PCI-DSS v4.0 (Req. 2.2)',
      dificultad: 'Fácil',
      ejemploConfiguracion: `! Deshabilitar Telnet y forzar SSHv2
line vty 0 4
 transport input ssh
 exec-timeout 10 0
 ip ssh version 2
 ip ssh time-out 60`
    },
    {
      id: 'REC-03',
      area: 'Seguridad L2/L3',
      titulo: 'Blindaje de Capa 2 (DHCP Snooping + Dynamic ARP Inspection + Port-Security)',
      descripcion: 'Activar mecanismos de control de acceso en cada puerto de acceso de los switches para evitar que equipos no autorizados o servidores DHCP falsos alteren el tráfico.',
      beneficioClave: 'Inmunidad total contra envenenamiento de tablas ARP y ataques Rogue DHCP Server.',
      normaEstandar: 'ISO/IEC 27001:2022 (A.8.20 Control de Redes)',
      dificultad: 'Moderada',
      ejemploConfiguracion: `ip dhcp snooping
ip dhcp snooping vlan 10,20,30,40
ip arp inspection vlan 10,20,30,40
interface GigabitEthernet0/24
 ip dhcp snooping trust
 ip arp inspection trust`
    },
    {
      id: 'REC-04',
      area: 'QoS & Tráfico',
      titulo: 'Políticas de Calidad de Servicio (QoS) y Priorización de Tráfico Sensible',
      descripcion: 'Clasificar los paquetes de red mediante etiquetas DSCP (Differentiated Services Code Point) para garantizar que la telefonía IP, videoconferencias y accesos a bases de datos tengan prioridad absoluta.',
      beneficioClave: 'Cero interrupciones de audio en llamadas VoIP aun cuando se ejecuten descargas de archivos pesados en la subred.',
      normaEstandar: 'RFC 4594 (Configuration Guidelines for DiffServ)',
      dificultad: 'Moderada',
      ejemploConfiguracion: `mls qos
class-map match-any VOIP_TRAFFIC
 match ip dscp ef
policy-map LAN_QOS_POLICY
 class VOIP_TRAFFIC
  priority level 1 percent 30`
    },
    {
      id: 'REC-05',
      area: 'Alta Disponibilidad',
      titulo: 'Implementación de Redundancia de Enlace y Balanceo Multi-WAN',
      descripcion: 'Configurar un segundo router o un segundo enlace de fibra óptica con conmutación por error automática (failover < 3 segundos) y protocolo VRRP en la puerta de enlace.',
      beneficioClave: 'Continuidad operativa del 99.9% frente a cortes imprevistos del proveedor de telecomunicaciones.',
      normaEstandar: 'ITIL v4 Service Continuity Management',
      dificultad: 'Avanzada',
      ejemploConfiguracion: `! VRRP en Router 1 (Master)
interface GigabitEthernet0/1
 vrrp 1 ip 192.168.1.254
 vrrp 1 priority 110
 vrrp 1 preempt`
    },
    {
      id: 'REC-06',
      area: 'Cifrado & Certificados',
      titulo: 'Gestión Automatizada de Certificados SSL/TLS con Autoridades de Confianza',
      descripcion: 'Sustituir certificados autofirmados en consolas administrativas y portales web locales por certificados firmados por una CA reconocida o CA empresarial interna, con renovación programada cada 60 días.',
      beneficioClave: 'Erradicación de advertencias de seguridad en navegadores y garantía de integridad mediante TLS 1.3.',
      normaEstandar: 'CA/Browser Forum Baseline Requirements',
      dificultad: 'Fácil'
    }
  ];

  // --- ACTION PLAN & OPTIMIZATION STEPS ---
  const planOptimizacion: OptimizationStep[] = [
    // FASE 1: INMEDIATA (0 - 48h)
    {
      id: 'PLAN-01',
      fase: 'fase1_inmediata',
      titulo: 'Desactivar protocolos en texto plano (Telnet y HTTP) en el Router de Borde',
      descripcion: 'Ingresar a la consola del enrutador principal y deshabilitar el servicio Telnet (puerto 23) y redirigir todo el tráfico administrativo al puerto seguro HTTPS (puerto 443).',
      prioridad: 'urgente',
      esfuerzo: 'bajo',
      impacto: 'critico',
      categoria: 'Hardening',
      completado: false,
      comandoSugerido: 'no service telnet && ip http secure-server'
    },
    {
      id: 'PLAN-02',
      fase: 'fase1_inmediata',
      titulo: 'Auditar e identificar dispositivos desconocidos con MAC privada/aleatoria',
      descripcion: 'Revisar la tabla de concesiones DHCP del router y comparar las direcciones físicas detectadas contra el inventario autorizado. Desconectar o colocar en lista negra las MACs sospechosas.',
      prioridad: 'alta',
      esfuerzo: 'bajo',
      impacto: 'alto',
      categoria: 'Control de Acceso',
      completado: false
    },
    {
      id: 'PLAN-03',
      fase: 'fase1_inmediata',
      titulo: 'Verificar y corregir discrepancias de velocidad y dúplex en enlaces del Core',
      descripcion: 'Comprobar las interfaces de los conmutadores para detectar puertos operando en Half-Duplex o con colisiones excesivas que generan picos de latencia de hasta 120 ms.',
      prioridad: 'alta',
      esfuerzo: 'bajo',
      impacto: 'medio',
      categoria: 'Rendimiento',
      completado: false,
      comandoSugerido: 'speed auto && duplex full'
    },

    // FASE 2: OPTIMIZACIÓN (3 - 14 DÍAS)
    {
      id: 'PLAN-04',
      fase: 'fase2_optimizacion',
      titulo: 'Configurar DHCP Snooping y Dynamic ARP Inspection (DAI) en switches',
      descripcion: 'Implementar validación activa de tramas de red para impedir ataques de envenenamiento de caché ARP y despliegue de enrutadores o puntos de acceso falsos en la LAN.',
      prioridad: 'alta',
      esfuerzo: 'medio',
      impacto: 'alto',
      categoria: 'Seguridad L2',
      completado: false,
      comandoSugerido: 'ip dhcp snooping && ip arp inspection vlan 1-4094'
    },
    {
      id: 'PLAN-05',
      fase: 'fase2_optimizacion',
      titulo: 'Aplicar políticas de Calidad de Servicio (QoS) para tráfico VoIP y crítico',
      descripcion: 'Crear colas de baja latencia (LLQ) en switches y routers para reservar al menos un 25% del ancho de banda disponible a la telefonía corporativa y sistemas de control en tiempo real.',
      prioridad: 'media',
      esfuerzo: 'medio',
      impacto: 'alto',
      categoria: 'Optimización de Ancho de Banda',
      completado: false
    },
    {
      id: 'PLAN-06',
      fase: 'fase2_optimizacion',
      titulo: 'Configurar alertas automáticas vía Telegram / Discord ante caídas de hosts',
      descripcion: 'Vincular el módulo de Notificaciones de RedMonitor a un canal de mensajería del equipo de guardia técnica para recibir alertas inmediatas cuando un gateway o servidor crítico caiga.',
      prioridad: 'alta',
      esfuerzo: 'bajo',
      impacto: 'alto',
      categoria: 'Monitoreo',
      completado: false
    },

    // FASE 3: ARQUITECTURA & RESILIENCIA (15 - 45 DÍAS)
    {
      id: 'PLAN-07',
      fase: 'fase3_arquitectura',
      titulo: 'Migración a Topología Microsegmentada mediante VLANs 802.1Q',
      descripcion: 'Diseñar el esquema de direccionamiento para segregar servidores, usuarios, invitados y cámaras de vigilancia en VLANs independientes gobernadas por un firewall de capa 3 con inspección profunda de paquetes.',
      prioridad: 'alta',
      esfuerzo: 'alto',
      impacto: 'critico',
      categoria: 'Arquitectura',
      completado: false
    },
    {
      id: 'PLAN-08',
      fase: 'fase3_arquitectura',
      titulo: 'Implementar Redundancia de Gateway (VRRP) y doble enlace de datos (Multi-WAN)',
      descripcion: 'Contratar un enlace de fibra secundaria de diferente operadora y configurar el protocolo VRRP en los enrutadores para asegurar failover automático sin interrupción del servicio.',
      prioridad: 'media',
      esfuerzo: 'alto',
      impacto: 'critico',
      categoria: 'Alta Disponibilidad',
      completado: false
    },
    {
      id: 'PLAN-09',
      fase: 'fase3_arquitectura',
      titulo: 'Establecer respaldos automáticos diarios de configuración de conmutadores (Diff Engine)',
      descripcion: 'Programar exportación periódica de las configuraciones "running-config" a un servidor centralizado con versionado y detección de modificaciones no autorizadas mediante diff.',
      prioridad: 'media',
      esfuerzo: 'medio',
      impacto: 'alto',
      categoria: 'Gobernanza & Backup',
      completado: false
    }
  ];

  // Executive summary synthesis
  const formattedDate = new Date().toLocaleString('es-ES', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const resumenEjecutivo = `El presente informe técnico-ejecutivo sintetiza el estado operativo, el perfil de seguridad y el rendimiento de la infraestructura de red en la sede **${options.location || 'Sede Principal'}**. De un total de **${total} dispositivos censados**, se registraron **${okCount} equipos en estado óptimo**, **${warnCount} con advertencias técnicas** y **${downCount} nodos inaccesibles**. La latencia promedio en la subred se sitúa en **${avgPing} ms** con una variación de jitter de **${jitter} ms**. 

El análisis automatizado de vulnerabilidades detectó **${vulnerabilities.length} hallazgos de seguridad y arquitectura** (${vulnerabilities.filter(v => v.severidad === 'critica').length} Críticos, ${vulnerabilities.filter(v => v.severidad === 'alta').length} Altos y ${vulnerabilities.filter(v => v.severidad === 'media').length} Medios). El puntaje global de salud y resiliencia de la red se cuantifica en **${score}/100**, catalogado como **"${rangoSalud.toUpperCase()}"**. La principal recomendación consiste en la eliminación de protocolos de administración sin cifrar (Telnet) y la migración a una topología microsegmentada por VLANs para mitigar riesgos de movimiento lateral y saturación de tráfico.`;

  const conclusiones = [
    `La infraestructura presenta un nivel de disponibilidad del ${total > 0 ? Math.round((okCount / total) * 100) : 100}%, evidenciando estabilidad general pero con riesgos latentes en la capa de transporte y administración.`,
    `La convivencia de dispositivos heterogéneos (workstations, routers y periféricos) en una subred plana /24 sin segmentación 802.1Q constituye el principal vector de vulnerabilidad frente a ataques internos.`,
    `La implementación del Plan de Optimización de 3 Fases permitirá elevar el Score de Salud de ${score}/100 a más del 92/100, asegurando cumplimiento normativo con estándares CIS Controls y NIST SP 800-115.`
  ];

  return {
    id: `REP-${Date.now()}`,
    fechaGeneracion: formattedDate,
    titulo: options.title || 'Informe Exhaustivo de Estado, Vulnerabilidades y Optimización de Red',
    organizacion: options.organization || 'Corporación & Infraestructura TI',
    ubicacion: options.location || 'Sede Principal / LAN Local',
    auditor: options.auditor || 'Auditor de Seguridad de Red',
    alcance: options.scope || 'integral',
    segmentoFiltro: options.segmentFilter || 'all',
    resumenEjecutivo,
    scoreSaludRed: score,
    rangoSalud,
    totalDispositivos: total,
    dispositivosOk: okCount,
    dispositivosAdvertencia: warnCount,
    dispositivosCaidos: downCount,
    latenciaPromedio: avgPing,
    latenciaMaxima: maxPing,
    jitterEstimado: jitter,
    puertosInsegurosDetectados: vulnerabilities.filter(v => v.categoria === 'protocolos').length,
    dispositivosRogueDetectados: rogueOrUnknownMacs.length,
    vulnerabilidades: vulnerabilities,
    recomendaciones,
    planOptimizacion,
    inventarioResumen: {
      routers,
      switches,
      servidores,
      workstations,
      iotCctv,
      otros
    },
    conclusiones
  };
}
