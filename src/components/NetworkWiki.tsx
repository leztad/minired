import React, { useState, useMemo } from 'react';
import { 
  BookOpen, HelpCircle, FileText, Search, ChevronRight, ChevronDown, CheckCircle, 
  AlertTriangle, Copy, Terminal, Shield, Cpu, Cable, Network, AlertCircle, Sparkles, Server,
  Smartphone, Lock, Bell, Layers, Activity, RefreshCw, Sliders, Eye, Globe, Wifi, Key
} from 'lucide-react';

interface WikiItem {
  id: string;
  category: 'how-to' | 'qa' | 'guide';
  title: string;
  tags: string[];
  summary: string;
  content: string;
  steps?: string[];
}

export default function NetworkWiki() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'guide' | 'qa' | 'how-to'>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    'guide-servidor-local-qr': true,
    'qa-saturacion': true,
    'how-to-perdida': true
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const wikiItems: WikiItem[] = [
    // --- MANUAL / GUÍA ---
    {
      id: 'guide-escaner-puertos',
      category: 'guide',
      title: 'Manual: Módulo Escáner de Puertos TCP y Auditoría de Ciberseguridad',
      tags: ['Escáner Puertos', 'TCP', 'Ciberseguridad', 'Servicios', 'Vulnerabilidades', 'Banners'],
      summary: 'Inspección activa de sockets TCP, auditoría de ciberseguridad para servicios expuestos y análisis de riesgo.',
      content: `El módulo **Escáner de Puertos TCP** permite realizar una auditoría de seguridad en profundidad sobre cualquier dirección IP de la red local. Prueba la apertura de puertos TCP estándar para descubrir qué servicios o demonios de sistema se encuentran escuchando y respondiendo peticiones.

      ### Servicios y Puertos Auditados:
      * **Puerto 80 / 443 / 8080 / 8443 (HTTP/HTTPS Web Admin)**: Interfaces web de configuración de routers, switches, impresoras, cámaras IP y paneles de control.
      * **Puerto 22 (SSH) / 23 (Telnet)**: Consolas de administración remota. Telnet se marca con **Riesgo Alto** por transmitir credenciales en texto plano sin cifrado.
      * **Puerto 554 (RTSP Video Stream)**: Transmisión de video IP en tiempo real desde cámaras de seguridad NVR/DVR.
      * **Puerto 3306 (MySQL) / 5432 (PostgreSQL)**: Bases de datos SQL expuestas en la LAN.
      * **Puerto 3389 (RDP) / 5900 (VNC)**: Protocolos de control de escritorio remoto gráfico.
      * **Puerto 631 (IPP) / 9100 (RAW Print)**: Servicios directos de impresión en red JetDirect.

      ### Calificación de Riesgo de Seguridad:
      El sistema clasifica automáticamente el estado del dispositivo en **Óptimo**, **Advertencia** o **Riesgo Alto (Telnet Abierto / DB Expuesta)**. Para cualquier puerto web detectado, ofrece un botón directo **"Abrir Web UI"** para navegar al panel administrativo.`,
      steps: [
        'Haga clic en el botón "Escáner de Puertos TCP" en la barra superior o en los detalles de un dispositivo.',
        'Ingrese la dirección IP objetivo a auditar y presione "Escanear Puertos".',
        'Filtre las respuestas entre "Todos", "Abiertos" o "Alertas / Riesgos".',
        'Revise las recomendaciones de seguridad para cerrar protocolos inseguros como Telnet o habilitar contraseñas fuertes.'
      ]
    },
    {
      id: 'guide-diagnostico-remoto',
      category: 'guide',
      title: 'Manual: Módulo Herramientas de Diagnóstico Continuo, WoL y Control Remoto',
      tags: ['Diagnóstico', 'Ping Continuo', 'WoL', 'Wake-on-LAN', 'SSH', 'Web Probe', 'Jitter'],
      summary: 'Pruebas de latencia continua, diagnóstico HTTP, encendido remoto por paquete mágico Wake-on-LAN y acceso SSH.',
      content: `El panel de **Diagnóstico & Control Remoto** reúne un conjunto de utilidades avanzadas de telemetría y gestión para ingenieros de sistemas.

      ### Utilidades Incluidas:
      1. **Ping Continuo y Gráfica de Latencia MTR**: Envía ráfagas periódicas de pings ICMP a intervalos de 1 segundo, construyendo una gráfica de barras en tiempo real y calculando latencias mínimas, medias, máximas y el **Jitter** (varianza del retardo).
      2. **Acceso e Inspección HTTP/HTTPS (Web Probe)**: Sondea los puertos 80 y 443 del host objetivo para extraer el título de la página y el banner del servidor HTTP, ofreciendo un botón directo para acceder a la consola web.
      3. **Wake-on-LAN (Encendido Remoto WoL)**: Envía un *Paquete Mágico* (Magic Packet UDP de 102 bytes) a la dirección MAC del host para encender equipos que soportan inicio por red en BIOS/Ethernet.
      4. **Lanzador de Consola SSH**: Genera el comando de terminal listo (\`ssh admin@192.168.1.X\`) para copiar y pegar en PuTTY, OpenSSH o MobaXterm.`,
      steps: [
        'Presione "Diagnóstico & Control Remoto" en la cabecera principal o en la ventana flotante de un equipo.',
        'Haga clic en "Iniciar Ping Continuo" para monitorear la estabilidad de la conexión y detectar fluctuaciones de jitter en vivo.',
        'Si el equipo está apagado, verifique que la MAC esté correctamente ingresada y presione "Enviar Paquete Mágico Wake-on-LAN".',
        'Para acceder por web o consola, utilice los botones directos de "Entrar a Interfaz Web" o el botón "Copiar" para el comando SSH.'
      ]
    },
    {
      id: 'qa-wake-on-lan',
      category: 'qa',
      title: '¿Cómo encender un equipo remoto mediante Wake-on-LAN (WoL)?',
      tags: ['WoL', 'Wake-on-LAN', 'Magic Packet', 'BIOS', 'Ethernet'],
      summary: 'Requisitos de hardware y configuración para encender computadores a distancia a través de la red local.',
      content: `El protocolo **Wake-on-LAN (WoL)** permite despertar un computador o servidor que se encuentre en estado de reposo, suspensión o apagado parcial (S3/S4/S5) mediante un paquete especial Ethernet enviado a su tarjeta de red.

      ### Requisitos de Hardware y Configuración:
      1. **Habilitación en la BIOS / UEFI del Computador**: Debe ingresar a la BIOS del equipo objetivo (presionando F2/Del al arrancar) y activar opciones como \`Wake on LAN\`, \`Power on by PCI-E/LAN\` o \`Enable WoL\`.
      2. **Configuración de la Tarjeta de Red (Windows / Linux)**: En el Administrador de Dispositivos de Windows, abra las propiedades del adaptador Ethernet -> *Administración de Energía* -> marque "Permitir que este dispositivo reactive el equipo" y "Permitir solo un paquete mágico para reactivar el equipo".
      3. **Estructura del Paquete Mágico (Magic Packet)**: La aplicación genera una trama de difusión de 102 bytes constituida por 6 bytes de valor \`0xFF\` seguidos de 16 repeticiones seguidas de la dirección MAC del objetivo (48 bits). Se transmite mediante socket UDP por los puertos estándar **9 y 7**.

      ### Ejecución desde el Sistema:
      Abra la herramienta **Diagnóstico & Control Remoto**, confirme la dirección MAC objetivo y presione **"Enviar Paquete Mágico Wake-on-LAN"**. Si el equipo está conectado a la energía eléctrica y al cable UTP, su tarjeta de red capturará el paquete y encenderá la placa madre inmediatamente.`
    },
    {
      id: 'how-to-acceso-webui',
      category: 'how-to',
      title: 'Cómo acceder a la Interfaz Web de Configuración (Web UI) de Routers, Cámaras y NAS',
      tags: ['Web UI', 'HTTP', 'HTTPS', 'Router', 'Cámara IP', 'NAS', 'Configuración'],
      summary: 'Paso a paso para detectar e ingresar a las plataformas web de administración de tus dispositivos de red.',
      content: `Muchos dispositivos de infraestructura (routers gateway, switches administrables, cámaras IP CCTV, impresoras, servidores NAS Synology y microcontroladores ESP32) alojan un servidor web embebido en los puertos 80, 443 o 8080.

      ### Detección Automática en el Panel:
      El sistema detecta automáticamente los hosts que cuentan con interfaz web y muestra un botón distintivo **"Web UI"** o **"Entrar a Interfaz Web"** en:
      * **Tabla de Dispositivos**: Junto a la dirección IP del host (ej: \`192.168.1.1\` o \`192.168.1.38\`).
      * **Modal de Detalles del Dispositivo**: Botón verde resaltado con enlace a \`http://<IP>\`.
      * **Modal de Escáner de Puertos**: Cuando se detecta abierto el puerto 80, 443, 8080 u 8443.

      ### Pasos para Configurar un Dispositivo desde su Web UI:
      1. Identifique el dispositivo objetivo en la tabla o mapa de red.
      2. Haga clic en el botón **"Web UI"** o **"Entrar a Interfaz Web"**.
      3. La aplicación abrirá la consola de configuración directamente en una pestaña de navegador o mediante enlace seguro.
      4. Si el equipo requiere HTTPS y muestra una advertencia de certificado autofirmado, acepte la excepción de seguridad para ingresar al panel de inicio de sesión del fabricante.`,
      steps: [
        'Localice el equipo en la tabla de dispositivos o en la vista general de la topología.',
        'Verifique que aparezca la insignia verde "Web UI" junto a su dirección IP.',
        'Haga clic sobre el botón para abrir directamente la URL de administración HTTP/HTTPS.',
        'Ingrese las credenciales del fabricante (asegúrese de cambiar las contraseñas predeterminadas de fábrica "admin/admin").'
      ]
    },
    {
      id: 'guide-vista-general',
      category: 'guide',
      title: 'Manual: Módulo Vista General - Topología Dinámica e Integridad',
      tags: ['Vista General', 'Topología', 'Dashboard', 'Mapa de Red'],
      summary: 'Documentación del panel principal, que representa gráficamente la subred LAN, la conmutación y la salud física.',
      content: `El módulo de **Vista General** es el centro de operaciones del sistema. Ofrece una representación gráfica en tiempo real de la topología lógica de la Capa 2 (L2), permitiendo identificar visualmente la interconexión entre el Gateway (enrutador central), los conmutadores (Switches) y cada uno de los dispositivos cliente (Hosts).

      ### Elementos Representados en la Topología:
      * **Gateway Principal (.1)**: El nodo de borde que proporciona direccionamiento DHCP y traducción de direcciones de red (NAT).
      * **Switch Troncal Administrado**: El nodo de conmutación central que distribuye las tramas de datos Ethernet. Reporta el consumo eléctrico si opera en modalidad PoE.
      * **Hosts Locales Activos**: Divididos en categorías de integridad según su comportamiento y tiempos de respuesta.
      * **Medio de Transmisión (Enlaces de Red)**: Los cables físicos representados con animaciones y colores dinámicos (Verde: Enlace óptimo; Amarillo: Latencia elevada; Rojo: Canal desconectado o con pérdida severa de paquetes).

      ### Indicadores Clave en Pantalla (KPIs):
      1. **Score de Salud de Red**: Un porcentaje calculado dinámicamente que evalúa las alarmas activas del switch, los pings promedio y los puertos fuera de servicio.
      2. **Contador de Dispositivos**: Desglosa cuántos nodos están activos de manera concurrente frente al total de la base ARP registrada en la subred.
      3. **Medidor de Latencia Promedio (Ping)**: Tiempo medio de respuesta ICMP del segmento local medido en milisegundos (ms).`,
      steps: [
        'Seleccione un adaptador de red o interfaz virtual en la cabecera del monitor.',
        'Presione "Iniciar Escaneo de Red" para gatillar el ping de sondeo ARP/ICMP interactivo.',
        'Observe las animaciones de pulso de red: un pulso fluido verde indica canales estables, mientras que líneas punteadas rojas alertan sobre colapsos lógicos.',
        'Haga clic en cualquiera de los nodos del mapa interactivo para ver detalles específicos de telemetría y direccionamiento físico.'
      ]
    },
    {
      id: 'guide-sensores',
      category: 'guide',
      title: 'Manual: Módulo Consola de Sensores y Estado de Puertos',
      tags: ['Sensores', 'Switches', 'Puertos', 'PoE', 'RSTP'],
      summary: 'Guía sobre el monitoreo detallado de switches de red, presupuestos PoE, estados STP y recuento de tramas.',
      content: `El módulo **Consola de Sensores** proporciona visibilidad granular sobre la capa física y de enlace de tus switches administrables. Permite inspeccionar qué ocurre a nivel de puertos físicos, previniendo cuellos de botella e identificando fallos de cableado estructurado.

      ### Datos de Telemetría Disponibles:
      * **Estado del Puerto (Port Link Status)**: Muestra si la interfaz física está Activa (UP), Apagada (Down) o bloqueada por protocolos de prevención de loops.
      * **Dirección del Enlace (Negotiation)**: Indica la velocidad y método duplex (Ej: 1000 Mbps - Full Duplex para Gigabit Ethernet).
      * **Métricas PoE (Power over Ethernet)**: Consumo de energía en tiempo real (Watts) por puerto, crucial para evitar sobrecargar la fuente de alimentación del switch al conectar cámaras IP de alta potencia o domótica.
      * **Métricas de RSTP (Rapid Spanning Tree Protocol)**: Detecta cuál es el switch raíz (Root Bridge) y cuáles puertos están en estado "Forwarding" o "Blocking" para prevenir colapsos por bucles de red.
      * **Recuento de Paquetes (Unicast / Multicast / Broadcast)**: Permite vigilar si hay ráfagas anómalas de broadcast que puedan saturar el procesador del switch.`,
      steps: [
        'Navegue a la pestaña "Sensores" para cargar la matriz de telemetría.',
        'Inspeccione la tabla de puertos del switch administrado para verificar la velocidad de negociación física.',
        'Valide el "PoE Budget": si el total de Watts consumidos supera el 85% de la capacidad nominal del switch, prepare planes de balanceo de carga energética.',
        'Observe las tramas de error de puerto: incrementos en descartes (Discards) indican colisiones tardías por tarjetas de red defectuosas o cables dañados.'
      ]
    },
    {
      id: 'guide-dispositivos',
      category: 'guide',
      title: 'Manual: Módulo Tabla de Dispositivos y Rastreo OUI',
      tags: ['Dispositivos', 'MAC', 'OUI', 'IP', 'Ping'],
      summary: 'Cómo administrar la base de datos de hosts locales, rastrear fabricantes de tarjetas de red y auditar direcciones físicas.',
      content: `El módulo **Dispositivos** contiene el registro administrativo de todos los hosts que han sido descubiertos dentro de la subred local mediante tablas de vecinos ARP (Address Resolution Protocol) y escaneo ICMP. Es el inventario físico principal de la LAN.

      ### Características y Funciones Clave:
      * **Resolución OUI (Organizationally Unique Identifier)**: El sistema analiza automáticamente los primeros tres octetos de la dirección MAC física de cada dispositivo y determina el fabricante de hardware (Ej: Apple, Cisco, Intel, Huawei, etc.).
      * **Medición de Latencia Individual (Ping)**: Muestra el tiempo de ida y vuelta de un paquete de eco ICMP enviado a cada host para evaluar su tiempo de respuesta local.
      * **Segmentación de Red**: Clasifica los hosts según el segmento lógico asignado en la subred para aislar grupos de usuarios (Ej: Servidores, Impresoras, Telefonía VoIP, Dispositivos IoT).
      * **Buscador Multicriterio**: Permite buscar de forma instantánea cualquier host ingresando el nombre, parte de la IP o la dirección MAC.`,
      steps: [
        'Vaya a la sección "Dispositivos" del panel de navegación.',
        'Use la barra de búsqueda para localizar un host por su IP (Ej. 192.168.1.45) o por su dirección MAC.',
        'Utilice el filtro de segmento para ver únicamente dispositivos IoT o de la infraestructura crítica corporativa.',
        'Identifique hosts con fabricante "Desconocido": podrían ser hosts virtuales de contenedores locales, o intrusos usando técnicas de MAC aleatoria.'
      ]
    },
    {
      id: 'guide-ancho-banda',
      category: 'guide',
      title: 'Manual: Módulo Ancho de Banda y Tráfico en Mbps',
      tags: ['Ancho de Banda', 'Tráfico', 'Mbps', 'Red', 'Consumo'],
      summary: 'Rastreo interactivo y visualización en tiempo real del consumo de ancho de banda por interfaz y por puerto.',
      content: `El módulo de **Ancho de Banda** se encarga de recolectar estadísticas de transmisión y recepción de datos (Tx/Rx) para mapear el consumo de tráfico local. Ayuda a diagnosticar qué aplicaciones o hosts específicos están saturando la subred.

      ### Métricas Representadas:
      * **Tráfico de Bajada (Download / Rx)**: Volumen de datos que ingresa al host local desde el gateway o servidores LAN.
      * **Tráfico de Subida (Upload / Tx)**: Volumen de datos que el host transmite hacia la red.
      * **Ancho de Banda por Puerto**: Carga de tráfico acumulada en cada boca del switch troncal medida en Mbps.

      ### Utilidad Diagnóstica:
      Si un canal de red muestra un consumo superior al **90% de su capacidad nominal de forma constante**, el buffer del puerto físico del switch se saturará, induciendo pérdida de paquetes y retardos severos en la transmisión de video-streaming o telefonía VoIP.`,
      steps: [
        'Abra el panel de "Ancho de Banda" para inicializar los gráficos de rendimiento.',
        'Observe las gráficas en tiempo real que desglosan la velocidad de transmisión en Megabits por segundo (Mbps).',
        'Busque picos de tráfico inusuales: un comportamiento plano al tope de la capacidad indica descargas pesadas concurrentes.',
        'Use la información de puertos saturados para aplicar políticas de Calidad de Servicio (QoS) en tu enrutador físico.'
      ]
    },
    {
      id: 'guide-testeo',
      category: 'guide',
      title: 'Manual: Módulo Consola de Pruebas e Inyector de Fallas',
      tags: ['Pruebas', 'Anomalías', 'Inyector', 'Diagnóstico', 'Simulación'],
      summary: 'Cómo entrenar al personal inyectando fallas y comportamientos anómalos reales de redes de área local.',
      content: `El **Centro de Pruebas** es un simulador de fallos de red avanzado diseñado con fines educativos y de validación de políticas. Permite "inyectar" de forma segura condiciones anómalas simuladas en el segmento para evaluar cómo reacciona el sistema y cómo se alertarían los usuarios de campo.

      ### Fallos e Interrupciones Disponibles:
      1. **Caída de Gateway Central**: Bloquea el nodo de salida, dejando a la LAN sin traducción NAT ni enrutamiento WAN.
      2. **Latencia Excesiva (Ping Spike)**: Agrega retardos variables de más de 200ms para simular saturación en buffers físicos de conmutadores.
      3. **Pérdida de Paquetes (Packet Loss)**: Descarta tramas simuladas de forma intermitente (del 5% al 45%), simulando ruido electromagnético severo en cableado UTP o fibras ópticas con suciedad.
      4. **Bucle de Capa 2 (Broadcast Storm)**: Simula un loop físico sin protocolo Spanning Tree activo, lo que desencadena consumo del 100% en los procesadores del switch.`,
      steps: [
        'Vaya al módulo "Consola de Pruebas" en el menú lateral.',
        'Elija una de las anomalías técnicas disponibles en el panel de inyección interactiva.',
        'Haga clic en "Inyectar Anomalía" y observe los efectos inmediatos en los gráficos de la Vista General.',
        'Use el botón "Restaurar Red" para limpiar todos los fallos artificiales inyectados y volver al estado óptimo de línea base.'
      ]
    },
    {
      id: 'guide-copiloto-ai',
      category: 'guide',
      title: 'Manual: Módulo Copiloto de Red AI y Generación de Diagnósticos',
      tags: ['AI', 'Gemini', 'Copiloto', 'Diagnóstico AI', 'Asistente'],
      summary: 'Guía para utilizar la inteligencia artificial de Google Gemini para auditar logs y diagnosticar topologías de red.',
      content: `El **Copiloto AI** es un asistente experto integrado que aprovecha la tecnología avanzada de **Google Gemini** para actuar como un ingeniero de redes virtual de nivel superior. Analiza el estado actual de la telemetría, logs del switch y anomalías activas, entregando un reporte técnico explicativo y planes de remediación.

      ### Capacidades del Copiloto AI:
      * **Análisis de Estado Físico**: Lee los contadores de paquetes del switch, latencias y errores de puertos para encontrar cuellos de botella ocultos.
      * **Mitigación en Lenguaje Natural**: Explica de forma amena y profesional por qué se están perdiendo paquetes o por qué se caen los servicios PoE.
      * **Generación de Comandos de CLI**: Proporciona comandos de configuración reales para marcas líderes (Cisco IOS, Juniper, Aruba, Mikrotik RouterOS) que solucionan el problema diagnosticado (Ej: Configurar Spanning Tree, Port-Security o políticas de VLANs).`,
      steps: [
        'Ingrese a "Copiloto AI" en el panel lateral.',
        'Haga clic en "Generar Diagnóstico Completo" para que la inteligencia lea la matriz actual del sistema en tiempo real.',
        'Revise las recomendaciones estructuradas que incluyen el análisis del problema, diagnóstico causal y comandos de mitigación paso a paso.',
        'Utilice el chat interactivo para hacer preguntas específicas sobre tu infraestructura o para traducir configuraciones a marcas de hardware particulares.'
      ]
    },
    {
      id: 'guide-speedtest',
      category: 'guide',
      title: 'Manual: Módulo Prueba de Velocidad de Borde (Speedtest)',
      tags: ['Speedtest', 'Prueba de Velocidad', 'Internet', 'Borde', 'WAN'],
      summary: 'Simulación detallada de pruebas de rendimiento WAN midiendo subida, bajada, ping y jitter.',
      content: `El módulo de **Prueba de Velocidad (Speedtest)** está diseñado para medir el rendimiento de la conexión de frontera (hacia Internet o WAN). A diferencia del ping local de la LAN, esta prueba simula una transferencia masiva de archivos contra servidores CDN de borde para calibrar las capacidades máximas de la línea.

      ### Métricas Evaluadas:
      * **Velocidad de Descarga (Downstream)**: Capacidad para recibir datos desde la red WAN medida en Megabits por segundo (Mbps).
      * **Velocidad de Subida (Upstream)**: Capacidad para enviar datos hacia la red externa medida en Mbps.
      * **Ping de Borde (Latency)**: Tiempo de respuesta hacia el servidor de speedtest de borde (generalmente inferior a los pings transcontinentales).
      * **Jitter**: La fluctuación temporal entre los paquetes ping recibidos. Un jitter superior a **30 ms** degrada de forma severa llamadas de VoIP y videoconferencias.`,
      steps: [
        'Navegue a la pestaña "Test de Velocidad".',
        'Haga clic en el botón circular central "Iniciar Test" para disparar la simulación de transferencia.',
        'Observe cómo el tacómetro mide secuencialmente el ping/jitter, luego la fase de descarga y finalmente la fase de subida.',
        'Compare los resultados obtenidos contra el ancho de banda contratado con su ISP para reclamar por bajo rendimiento o sobreventa de línea.'
      ]
    },
    {
      id: 'guide-auditoria',
      category: 'guide',
      title: 'Manual: Módulo Auditorías de Red, Análisis de Deriva y Sondas TCP',
      tags: ['Auditoría', 'Historial', 'Deriva', 'Drift', 'Sonda', 'Puertos'],
      summary: 'Cómo registrar reportes históricos, realizar análisis de integridad contra intrusos y escanear puertos abiertos.',
      content: `El módulo de **Auditorías de Red** es la herramienta de seguridad y cumplimiento de nivel corporativo del sistema. Permite documentar el estado de la red, auditar la seguridad de hosts individuales y detectar cambios no autorizados en la infraestructura física de la LAN.

      ### Funcionalidades de Auditoría:
      * **Guardado de Reportes en Historial**: Guarda capturas de pantalla lógicas persistentes (snapshots) con la cantidad de hosts activos, latencias y puntuación de seguridad en el navegador local (localStorage).
      * **Análisis de Deriva (Drift Analysis)**: Compara el estado actual de la red contra una auditoría histórica guardada (Línea Base / Baseline). Detecta inmediatamente **Dispositivos Nuevos (Intrusos / Rogue Devices)** que se hayan conectado a la LAN física sin autorización, así como dispositivos críticos caídos.
      * **Escáner de Puertos TCP (Port Scanner)**: Sondea de forma segura puertos estándar (Quick: 5 puertos comunes) o avanzados (Full: 12 puertos) en un dispositivo seleccionado. Permite identificar servicios vulnerables activos expuestos (FTP, HTTP sin cifrar, Telnet expuesto, SMB v1, etc.).
      * **Exportación de Reportes**: Permite descargar informes auditados completos en formatos profesionales: PDF formal con membrete, JSON estructurado y Hoja de Cálculo CSV.`,
      steps: [
        'Vaya a la sección "Auditorías de Red" para ver el panel de control de seguridad.',
        'Utilice "Guardar Reporte" para establecer la línea base de la red en un momento de estabilidad garantizada.',
        'Para buscar intrusos, abra "Ver Historial", seleccione una auditoría pasada y examine la tarjeta de "Análisis de Deriva".',
        'Para evaluar la seguridad de un host, haga clic en "Escanear" en la tabla de dispositivos para iniciar el escaneo de puertos TCP y ver las alertas de exposición de servicios.'
      ]
    },
    {
      id: 'guide-diseno-red',
      category: 'guide',
      title: 'Manual: Módulo de Diseño de Red y Herramientas L2/L3',
      tags: ['Diseño de Red', 'L2/L3', 'Planificador', 'Topología', 'Arquitectura'],
      summary: 'Cómo utilizar el lienzo interactivo drag-and-drop para planificar ampliaciones de redes locales.',
      content: `El módulo de **Diseño de Red (Herramientas L2/L3)** es un lienzo CAD interactivo que permite a administradores diseñar y documentar topologías de red lógicas y físicas antes de su despliegue físico en racks de campo.

      ### Características del Diseñador:
      * **Lienzo Interactivo (Drag & Drop)**: Permite arrastrar elementos como enrutadores, firewalls, switches de core, servidores y estaciones al espacio de trabajo.
      * **Interconexión Dinámica**: Dibuja líneas de enlace entre puertos de equipos simulando cables de cobre, interfaces de fibra SFP o conexiones Wi-Fi aéreas.
      * **Configuración de Propiedades**: Permite etiquetar direcciones IP de subredes, máscaras, VLANs y descripciones de puertos de conmutación.
      * **Exportación**: Ofrece una opción de exportado para guardar el diagrama de arquitectura y compartirlo con ingenieros de soporte o clientes.`,
      steps: [
        'Ingrese al módulo "Herramientas L2/L3" en el panel de navegación.',
        'Utilice el panel izquierdo para arrastrar un nuevo conmutador (Switch) o cortafuegos (Firewall) al lienzo central.',
        'Haga clic en el icono de enlace, seleccione el dispositivo origen y luego el destino para trazar la conexión física lógica.',
        'Haga doble clic en cualquier nodo para configurar sus atributos lógicos (Ej: Dirección IP, Segmento, Gateway predeterminado).',
        'Guarde el diseño utilizando las opciones de exportado para documentar el as-built de la obra de cableado estructurado.'
      ]
    },
    {
      id: 'guide-ubicaciones-offline',
      category: 'guide',
      title: 'Manual: Módulo Ubicaciones Offline y Gestión de Inspección',
      tags: ['Offline', 'Filtros', 'Ping', 'Topología', 'Multi-sitio', 'Sedes'],
      summary: 'Cómo administrar múltiples sedes físicas de red, modelar mapas topológicos personalizados y filtrar dispositivos por estado o latencia de ping.',
      content: `El módulo de **Ubicaciones Offline** permite a ingenieros de soporte técnico administrar configuraciones y telemetrías de múltiples sucursales, oficinas o clientes locales de forma aislada, utilizando almacenamiento persistente sin necesidad de conexión activa a Internet.

      ### Capacidades del Gestor Multi-Sede y Visualización:
      * **Persistencia Multi-Sede**: Toda la base de hosts, perfiles e historiales se asocia de forma independiente a la sede activa en el almacenamiento local del navegador (\`localStorage\`).
      * **Modelos de Distribución (Layouts)**: Puede estructurar el mapa topológico en tres modos dinámicos según el tipo de red:
        * 🌳 *Árbol LAN*: Ideal para topologías jerárquicas clásicas (Gateway en la cabecera, servidores en capa de distribución, impresoras y clientes en la base).
        * ⭕ *Anillo*: Distribución circular concéntrica ideal para topologías en estrella y anillos redundantes.
        * ⊞ *Bento Grid*: Cuadrícula bento alineada de alta densidad, idónea para depurar inventarios voluminosos de forma ultra-ordenada.
      * **Controles de Separación y Visualización**: Cuenta con un regulador de espaciado interactivo para escalar el mapa de nodos (de 1.0x a 2.2x) y selectores booleanos para mostrar u ocultar de manera dinámica las etiquetas de hostname e IP de cada host.

      ### Filtros de Inspección Avanzados (Estado y Latencia de Ping):
      Para facilitar el análisis y aislamiento de problemas de red en sedes offline, el sistema incorpora controles dinámicos de filtrado que actualizan instantáneamente el mapa gráfico y la tabla del inventario de hosts:
      1. **Filtrado por Estado de Conexión**: Permite aislar rápidamente equipos sanos de aquellos que reportan anomalías:
        * 🟢 *Conectado (OK)*: Filtra únicamente nodos operativos estables.
        * 🟡 *Alerta*: Muestra hosts con latencia inestable o alertas activas de telemetría.
        * 🔴 *Caído (Offline)*: Aísla instantáneamente los hosts caídos o inaccesibles.
      2. **Filtrado por Latencia de Ping (ICMP)**: Clasifica los equipos según el retardo de respuesta para diagnosticar Bufferbloat o problemas físicos:
        * ⚡ *Rápido (< 10 ms)*: Equipos de baja latencia con respuesta inmediata.
        * ⏳ *Medio (10 - 50 ms)*: Equipos con respuesta típica o leve retardo.
        * 🐢 *Lento (> 50 ms)*: Identifica saturaciones de buffer o canales con atenuación severa.
        * ❌ *Inalcanzable*: Filtra aquellos dispositivos caídos o sin respuesta ICMP activa.`,
      steps: [
        'Vaya a la pestaña de "Ubicaciones Offline" en el menú principal.',
        'Haga clic en "Nueva Ubicación" para registrar una sucursal, o seleccione una de las sedes existentes.',
        'Use el panel de "Filtros de Inspección de Red" para segmentar los equipos según su "Estado de Conexión" o "Latencia de Ping". Verá que tanto el mapa SVG como la tabla de abajo se actualizan al instante.',
        'Ajuste el control deslizante de "Separación" y alterne los interruptores "Mostrar Nombres" y "Mostrar IPs" para optimizar la claridad visual del plano físico.'
      ]
    },
    {
      id: 'guide-eventos',
      category: 'guide',
      title: 'Manual: Módulo Consola de Eventos e Historial de Syslog',
      tags: ['Eventos', 'Logs', 'Syslog', 'Consola', 'Historial'],
      summary: 'Supervisión de registros operativos y auditoría de cambios del sistema tipo servidor Syslog.',
      content: `El módulo de **Consola de Eventos (Event Logger)** funciona como un recolector Syslog simplificado para registrar todas las alarmas, cambios en puertos de conmutación, pings caídos e inyecciones de fallas que ocurren en el ecosistema.

      ### Clasificación de Logs:
      * **Éxito (Success / Info)**: Notificaciones de operaciones rutinarias completadas con éxito (Ej: Sonda ARP exitosa, reporte guardado).
      * **Advertencia (Warning)**: Alertas preventivas que no detienen el tráfico pero requieren atención (Ej: Latencias de ping superiores a 100 ms).
      * **Error (Critical)**: Fallas graves en la red local que bloquean o degradan la conmutación de tramas (Ej: Caída física del router central, loop detectado, sobrecarga PoE).

      ### Utilidad de Análisis:
      El log de consola almacena marcas de tiempo de milisegundos precisas, fundamentales para correlacionar en qué minuto exacto se cayó un switch PoE frente a un picos térmicos o sobrecorriente registrada.`,
      steps: [
        'Abra la pestaña "Consola de Eventos" para ver el buffer de logs en tiempo real.',
        'Filtre los registros por gravedad utilizando los botones rápidos (Ver solo Errores o Advertencias).',
        'Use la barra de búsqueda interna de la consola de logs para buscar cadenas específicas (como "PoE" o "IP 192.168.1.1").',
        'Exporte los registros a formato de texto plano para adjuntar a tickets de soporte técnico o bitácoras de guardia corporativas.'
      ]
    },
    {
      id: 'guide-instalador',
      category: 'guide',
      title: 'Manual: Módulo Instalador Desktop (Guía de Integración Tauri)',
      tags: ['Desktop', 'Tauri', 'Instalador', 'Raw Sockets', 'Windows/Linux'],
      summary: 'Cómo compilar y ejecutar la aplicación como un ejecutable nativo de escritorio para capturar tramas reales.',
      content: `El módulo **Instalador Desktop** proporciona las directrices y archivos de configuración para empaquetar este panel web en una aplicación nativa de escritorio utilizando el framework **Tauri** o Electron.

      ### ¿Por qué utilizar la versión Desktop?
      Debido a las políticas de seguridad de los navegadores web modernos (Sandboxing de iFrames), las aplicaciones basadas puramente en navegador no pueden acceder a los sockets de red del sistema operativo de bajo nivel. Por lo tanto, no pueden realizar pings ICMP reales o escuchar tramas Ethernet crudas de la interfaz local sin proxies.

      ### Ventajas de Compilar con Tauri:
      * **Acceso a Raw Sockets**: Permite inyectar tramas ARP y pings ICMP reales directamente a la tarjeta de red de tu computadora.
      * **Ejecutable Ultra Liviano**: Aplicación compilada en Rust con un peso inferior a **10 MB** en disco.
      * **Bajo Consumo de RAM**: Libre de la pesada carga de Chromium que arrastran wrappers tradicionales como Electron.`,
      steps: [
        'Navegue a la pestaña "Instalador Desktop" para descargar las plantillas de compilación Tauri.',
        'Asegúrese de tener instalado Node.js y el compilador de Rust (Cargo) en su computadora de desarrollo.',
        'Instale las dependencias de compilación y ejecute el comando en consola: \`npm run tauri build\`.',
        'Instale el instalador generado (.msi para Windows, .deb para Linux o .dmg para macOS) para operar con privilegios de Administrador sobre su interfaz ethernet física.'
      ]
    },
    {
      id: 'guide-usuarios',
      category: 'guide',
      title: 'Manual: Módulo Gestión de Usuarios y Permisos de Acceso',
      tags: ['Usuarios', 'Roles', 'Firebase', 'Seguridad', 'Permisos'],
      summary: 'Control de accesos corporativo basado en roles para delimitar las acciones del personal de TI.',
      content: `El módulo de **Gestión de Usuarios** implementa políticas de seguridad RBAC (Role-Based Access Control) utilizando la infraestructura de **Firebase Authentication** y perfiles de base de datos seguros en la nube. Permite controlar quién tiene acceso de escritura sobre la red y quién es un observador pasivo.

      ### Roles de Usuario Disponibles:
      1. **Administrador de Red (Admin)**: Acceso total al monitor. Es el único perfil con permisos para inyectar fallos de pruebas, borrar historiales de auditorías de red y configurar usuarios de soporte.
      2. **Operador Técnico (Operator)**: Permiso para cambiar de sede de monitoreo, inicializar escaneos de red, realizar tests de velocidad y solicitar diagnósticos al Copiloto AI. Tiene prohibido inyectar fallos lógicos a la red.
      3. **Auditor de Seguridad (Auditor)**: Acceso de solo lectura optimizado para revisar reportes históricos de auditoría, descargar reportes PDF de cumplimiento de la LAN y ejecutar el escáner de puertos de host específicos.`,
      steps: [
        'Acceda a la pestaña de "Usuarios" (disponible en la barra superior si ha iniciado sesión con perfil de Administrador).',
        'Consulte la lista de ingenieros de soporte registrados y su estado de autorización.',
        'Utilice el formulario de creación para agregar un nuevo técnico, definiendo su correo y asignándole el Rol adecuado para su nivel de responsabilidad.',
        'Verifique que los operadores de campo no tengan acceso a los controles del Inyector de Anomalías para prevenir accidentes lógicos en entornos productivos.'
      ]
    },
    {
      id: 'guide-servidor-local-qr',
      category: 'guide',
      title: 'Manual: Servidor de Red Local, Acceso Móvil (Código QR) y Scripts de Ejecución (.bat / .sh)',
      tags: ['Red Local', 'LAN', 'Wi-Fi', 'Código QR', 'Móvil', 'Firewall', 'Scripts', 'Puerto 3000'],
      summary: 'Cómo desplegar el monitor en tu red local física, abrir el cortafuegos y acceder desde celulares o tablets escaneando el código QR.',
      content: `RedMonitor incluye herramientas nativas para operar en modo **Servidor de Red Local (LAN / Wi-Fi)**, permitiendo que cualquier dispositivo conectado a tu red (computadoras portátiles, smartphones Android, iPhones, iPads o consolas técnicas) acceda al panel de control en tiempo real mediante el puerto 3000.

      ### Arquitectura del Servidor Local:
      * **Enlace Universal (0.0.0.0)**: El backend Node/Express y el servidor Vite vinculan sus sockets en \`0.0.0.0\`, permitiendo tráfico de todas las interfaces de red físicas y virtuales de la máquina.
      * **Detección Automática de IP LAN**: El servidor identifica automáticamente tu dirección IPv4 privada (\`192.168.X.X\`, \`10.X.X.X\` o \`172.16.X.X\`) y genera la URL directa de acceso.
      * **Generador de Código QR en Pantalla**: En la barra superior, el botón **"Acceso Móvil"** despliega un código QR dinámico listo para ser escaneado con la cámara de cualquier teléfono celular.
      * **Soporte Multiplataforma**: Incluye scripts listos para usar en Windows (\`Iniciar_RedMonitor.bat\`) y Linux/macOS (\`Iniciar_RedMonitor.sh\`).

      ### Requisitos de Cortafuegos (Firewall):
      Para que los dispositivos de la red Wi-Fi puedan cargar la interfaz, el **puerto 3000 TCP** debe estar permitido:
      * **Windows Defender Firewall**: Reglas de Entrada -> Nueva Regla -> Puerto -> TCP -> 3000 -> Permitir la conexión.
      * **Linux (UFW)**: Ejecutar en terminal \`sudo ufw allow 3000/tcp\`.`,
      steps: [
        'En Windows, ejecute el archivo "Iniciar_RedMonitor.bat". En Linux/macOS, abra una terminal y ejecute "./Iniciar_RedMonitor.sh".',
        'El script verificará Node.js, instalará dependencias si faltan y levantará el servicio mostrando la URL de tu red.',
        'Haga clic en el botón "Acceso Móvil" en la barra de navegación superior de RedMonitor.',
        'Escanee el código QR con la cámara de su teléfono móvil o ingrese manualmente la URL mostrada (ej: http://192.168.1.50:3000) en el navegador del celular.',
        'Si no conecta desde el móvil, verifique que ambos dispositivos estén en la misma red Wi-Fi y habilite el puerto 3000 TCP en su cortafuegos.'
      ]
    },
    {
      id: 'guide-auditoria-ssl',
      category: 'guide',
      title: 'Manual: Módulo Auditoría de Certificados SSL/TLS y Criptografía HTTPS',
      tags: ['SSL', 'TLS', 'Certificados', 'HTTPS', 'Criptografía', 'Expiración', 'Ciphers'],
      summary: 'Auditoría en tiempo real de certificados digitales, fechas de caducidad, suites criptográficas y SANs en hosts web de la LAN.',
      content: `El módulo de **Auditoría SSL/TLS** inspecciona las capas de seguridad criptográfica de todos los servicios web y paneles administrativos HTTPS alojados en la red local o WAN. Permite prevenir caídas de servicio por expiración imprevista de certificados y detectar protocolos obsoletos.

      ### Métricas y Análisis Criptográfico:
      * **Conteo Regresivo de Expiración**: Calcula los días restantes de validez del certificado X.509, emitiendo alertas preventivas a los 30, 15 y 7 días previos a la caducidad.
      * **Cadena de Emisores (Issuer CA)**: Identifica la autoridad de certificación emisora (Let's Encrypt, DigiCert, Sectigo o Certificados Autofirmados de routers).
      * **Nombres Alternativos del Sujeto (SANs)**: Extrae todos los dominios e IPs autorizados para el certificado digital.
      * **Evaluación de Algoritmo de Clave y Hash**: Detecta si se utilizan algoritmos robustos (RSA 2048/4096 bits, ECDSA P-256/P-384, SHA-256) o algoritmos vulnerables (SHA-1, MD5).
      * **Auditoría Masiva por Lotes**: Permite agregar múltiples hosts HTTPS de la infraestructura y auditarlos con un solo clic.`,
      steps: [
        'Acceda a la pestaña "Auditoría SSL/TLS" en el menú de navegación.',
        'Ingrese el dominio o IP local con su puerto seguro (ej: 192.168.1.1:443 o intranet.local:8443).',
        'Presione "Auditar Certificado" para iniciar el handshake TLS y extraer los metadatos criptográficos.',
        'Agregue el host a la lista de "Certificados Monitoreados" para supervisar su fecha de caducidad de forma continua.',
        'Revise las alertas tempranas si la vigencia del certificado es inferior a 15 días para planificar su renovación.'
      ]
    },
    {
      id: 'guide-seguridad-rogue',
      category: 'guide',
      title: 'Manual: Módulo Control de Seguridad y Dispositivos No Autorizados (Rogue Devices & NAC)',
      tags: ['Seguridad L2', 'Rogue Devices', 'Lista Blanca', 'MAC Spoofing', 'NAC', 'Intrusos'],
      summary: 'Control de acceso a nivel de red (NAC), lista blanca de MACs autorizadas y detección inmediata de intrusos en la LAN.',
      content: `El módulo de **Seguridad y Dispositivos Rogue** actúa como un controlador de admisión de red (Network Access Control - NAC) ligero. Compara continuamente todos los hosts activos en el escaneo ARP contra una **Lista Blanca (Whitelist)** de dispositivos corporativos autorizados.

      ### Funcionalidades de Blindaje:
      * **Lista Blanca de Hardware Aprobado**: Registro de equipos legítimos con su dirección MAC física, nombre descriptivo, departamento y propietario.
      * **Detección Instantánea de Equipos Rogue (Intrusos)**: Cualquier host descubierto cuya MAC no coincida con la lista blanca es catalogado inmediatamente como "No Autorizado / Rogue".
      * **Análisis de Dispositivos con MAC Aleatoria**: Advierte sobre equipos móviles que usan ofuscación de dirección física privada.
      * **Disparo Automático de Alertas**: Envía notificaciones inmediatas a canales configurados (Telegram, Discord) al detectar una conexión desconocida en la subred.`,
      steps: [
        'Abra la vista "Seguridad & Rogue Devices" desde el menú lateral.',
        'Revise los dispositivos actualmente descubiertos y presione "Aprobar y Agregar a Lista Blanca" para los equipos de confianza.',
        'Configure la política de alerta: si se detecta un host desconocido, el sistema emitirá una alarma acústica y visual en pantalla.',
        'Para investigar un host no autorizado, copie su dirección MAC e IP y diríjase al "Escáner de Puertos TCP" para auditar sus servicios.'
      ]
    },
    {
      id: 'guide-snmp-telemetria',
      category: 'guide',
      title: 'Manual: Módulo Telemetría SNMP Avanzada y Consultas OID / MIBs',
      tags: ['SNMP', 'MIB', 'OID', 'v1/v2c/v3', 'Switches', 'Telemetría', 'Interfaces'],
      summary: 'Consultas directas a agentes SNMP en routers y switches, monitoreo de uso de CPU/RAM y contadores de interfaces físicas.',
      content: `El protocolo **SNMP (Simple Network Management Protocol)** permite comunicarse directamente con el sistema operativo de switches gestionables (Cisco IOS, Mikrotik RouterOS, Juniper, HP Aruba) para extraer métricas de telemetría interna que no se pueden obtener mediante un simple ping.

      ### Capacidades del Monitor SNMP:
      * **Soporte SNMP v1 / v2c**: Autenticación por comunidad de lectura (típicamente \`public\`).
      * **Consultas OID Personalizadas**: Permite consultar cualquier identificador de objeto (OID) estándar de la base de información de administración (MIB-II).
      * **Métricas Extraídas Automáticamente**:
        * \`sysDescr\` (1.3.6.1.2.1.1.1.0): Modelo de hardware, versión de firmware y sistema operativo.
        * \`sysUpTime\` (1.3.6.1.2.1.1.3.0): Tiempo de funcionamiento ininterrumpido del switch.
        * \`ifInOctets\` / \`ifOutOctets\`: Bytes acumulados transmitidos y recibidos por interfaz.
        * \`ifOperStatus\`: Estado operacional físico del puerto (1=Up, 2=Down, 3=Testing).
        * Carga porcentual de procesador (CPU) y utilización de memoria RAM.`,
      steps: [
        'Vaya al módulo "Telemetría SNMP" en el panel de navegación.',
        'Ingrese la dirección IP del switch o router administrable (ej: 192.168.1.254) y la comunidad SNMP (por defecto "public").',
        'Presione "Consultar Telemetría SNMP" para extraer el resumen de salud, uptime y tabla de interfaces.',
        'Use la herramienta "Consulta OID Rápida" para inspeccionar parámetros específicos como temperatura del chasis o contadores de tramas de error.'
      ]
    },
    {
      id: 'guide-syslog-traps',
      category: 'guide',
      title: 'Manual: Módulo Servidor Syslog UDP (Puerto 514) y Receptor de Traps SNMP',
      tags: ['Syslog', 'UDP 514', 'SNMP Traps', 'UDP 162', 'RFC 3164', 'RFC 5424', 'Logs Remotos'],
      summary: 'Receptor centralizado de logs UDP en vivo para switches, routers y firewalls, con clasificación de severidad RFC.',
      content: `RedMonitor incorpora un **Servidor Syslog UDP nativo** en el puerto estándar **514** y un receptor de **Traps SNMP** en el puerto **162**. Permite que los conmutadores y cortafuegos de la red envíen sus eventos operativos directamente a esta consola sin requerir software de terceros como Kiwi Syslog o Graylog.

      ### Características del Servidor de Logs:
      * **Conformidad con Estándares RFC 3164 y RFC 5424**: Parsea automáticamente la prioridad (PRIVAL), facilidad (Facility: kernel, daemon, local0-local7) y severidad del mensaje.
      * **Escala de Severidades**:
        * 0 - Emergency (Caída total del sistema).
        * 1 - Alert (Acción inmediata requerida).
        * 2 - Critical (Falla crítica de hardware o PoE).
        * 3 - Error (Condición de error en enlace o interfaz).
        * 4 - Warning (Advertencia de umbral o flapping).
        * 5 - Notice (Evento normal pero significativo).
        * 6 - Informational (Mensaje informativo de conexión/desconexión).
        * 7 - Debug (Traza de diagnóstico en profundidad).
      * **Filtrado Dinámico**: Permite filtrar por IP de origen, severidad mínima o texto de mensaje.`,
      steps: [
        'Acceda a la pestaña "Syslog & Traps" en el menú principal.',
        'Verifique que el estado del receptor indique "Escuchando en UDP 514 / 162".',
        'Configure su switch o router para apuntar su Syslog a la IP de esta máquina (ej: logging host 192.168.1.50).',
        'Observe cómo ingresan los eventos en tiempo real: caídas de enlaces de puerto (link-down), autenticaciones administrativas o cambios de topología STP.',
        'Utilice el simulador integrado para generar eventos de prueba y verificar el funcionamiento de las reglas de alerta.'
      ]
    },
    {
      id: 'guide-notificaciones-canales',
      category: 'guide',
      title: 'Manual: Módulo Notificaciones Multicanal (Telegram, Discord, Webhooks, Slack)',
      tags: ['Notificaciones', 'Telegram', 'Discord', 'Slack', 'Webhooks', 'Alertas', 'Automatización'],
      summary: 'Despacho automatizado de alertas de red a aplicaciones de mensajería y plataformas de guardia técnica.',
      content: `El módulo de **Canales de Notificación** permite que el equipo de soporte reciba avisos al instante en sus teléfonos celulares y ordenadores cuando ocurre un incidente crítico en la red, sin necesidad de tener el navegador abierto permanentemente.

      ### Canales Soportados:
      * **Telegram Bot**: Mensajes directos o a grupos de técnicos mediante la API de Telegram Bot (\`https://api.telegram.org/bot<TOKEN>/sendMessage\`).
      * **Discord Webhook**: Publicación en canales de alertas de Discord con formato de inserción enriquecido (Embeds de color rojo/amarillo/verde).
      * **Slack Webhook**: Alertas en canales corporativos de Slack mediante Incoming Webhooks.
      * **Webhooks HTTP/HTTPS Personalizados**: Peticiones POST con payload JSON estructurado para integrarse con sistemas de tickets (Jira, GLPI, ServiceNow) o APIs internas.

      ### Tipos de Eventos Notificables:
      1. Dispositivo crítico caído (Gateway, Servidor o Switch fuera de línea).
      2. Detección de dispositivo no autorizado (Rogue Device).
      3. Certificado SSL/TLS próximo a caducar (< 7 días).
      4. Spikes de latencia excesiva (> 200 ms) o pérdida de paquetes sostenida.`,
      steps: [
        'Diríjase a la vista "Notificaciones" en la barra de navegación.',
        'Haga clic en "Nuevo Canal" y seleccione el tipo (Telegram, Discord, Slack o Webhook genérico).',
        'Complete los parámetros requeridos (Token del Bot y Chat ID para Telegram; Webhook URL para Discord/Slack).',
        'Presione "Probar Envío" para despachar un mensaje de prueba y verificar que llegue correctamente a su teléfono.',
        'Active los interruptores de eventos para definir qué alertas específicas deben despacharse por ese canal.'
      ]
    },
    {
      id: 'guide-mantenimiento-silenciado',
      category: 'guide',
      title: 'Manual: Módulo Ventanas de Mantenimiento Programadas y Silenciado Rápido (Quick Mute)',
      tags: ['Mantenimiento', 'Quick Mute', 'Supresión Alertas', 'Uptime', 'Paradas Programadas'],
      summary: 'Supresión controlada de alarmas durante trabajos de mantenimiento en racks, reinicios o cortes de energía.',
      content: `Durante trabajos planificados de mantenimiento físico (sustitución de cableado UTP, actualización de firmware de switches o reubicación de racks), los dispositivos se desconectan intencionalmente. El módulo de **Ventanas de Mantenimiento** previene la "fatiga de alertas" silenciando temporalmente las alarmas sin perder el registro en el historial.

      ### Modos de Silenciado:
      * **Silenciado Rápido (Quick Mute)**: Silencia instantáneamente un host o segmento específico por un período predeterminado:
        * ⏱️ 15 minutos (para reinicio de routers o pruebas de parche).
        * ⏱️ 1 hora (para recableado de pach panels o sustitución de fuentes PoE).
        * ⏱️ 24 horas (para equipos en laboratorio o reparación técnica).
      * **Ventanas de Mantenimiento Programadas**: Permite calendarizar paradas con fecha y hora de inicio y fin, definiendo el rango de IPs afectadas y el motivo del trabajo.
      * **Preservación de Métricas SLA**: Los minutos de caída durante una ventana de mantenimiento programada se pueden excluir del cálculo de penalización de disponibilidad (SLA).`,
      steps: [
        'Abra la sección "Mantenimiento & Silenciado" en el menú lateral.',
        'Para silenciar un dispositivo de inmediato, use "Quick Mute", ingrese su IP y seleccione la duración deseada (15m / 1h / 24h).',
        'Para programar una parada futura, haga clic en "Nueva Ventana de Mantenimiento", defina el horario, IPs objetivo y notas técnicas.',
        'Al finalizar las tareas antes de tiempo, puede presionar "Restaurar / Desilenciar" para reactivar la vigilancia en tiempo real.'
      ]
    },
    {
      id: 'guide-respaldos-config-diff',
      category: 'guide',
      title: 'Manual: Módulo Respaldos de Configuración de Switches y Comparador Diff',
      tags: ['Respaldos', 'Backup', 'Switch Config', 'Diff', 'Cisco IOS', 'Mikrotik', 'Versionado'],
      summary: 'Almacenamiento versionado de configuraciones de conmutadores (running-config) y comparador visual de diferencias.',
      content: `Las modificaciones erróneas en configuraciones de switches (como eliminar una VLAN por descuido o aplicar una ACL restrictiva) son una de las principales causas de caídas de red. Este módulo almacena el historial de revisiones de configuración de cada switch y ofrece un **Comparador Visual de Diferencias (Diff)**.

      ### Características del Gestor de Configuraciones:
      * **Repositorio de Revisiones**: Guarda instantáneas de configuración (\`running-config\`, backups en texto plano o scripts de RouterOS) con fecha, hora y autor.
      * **Comparador Visual de Diferencias (Diff Engine)**:
        * 🟢 **Líneas Verdes (+)**: Parámetros o comandos agregados en la nueva versión.
        * 🔴 **Líneas Rojas (-)**: Comandos eliminados respecto a la versión anterior.
        * 🟡 **Líneas Modificadas**: Ajustes de parámetros específicos (ej: cambio de número de VLAN o velocidad de puerto).
      * **Restauración Rápida (Rollback)**: Permite copiar la versión estable anterior para restaurar el switch a su estado operativo funcional en segundos.`,
      steps: [
        'Vaya a la vista "Respaldos de Configuración" en la barra de navegación.',
        'Seleccione el switch deseado o agregue uno nuevo indicando su marca (Cisco, Mikrotik, HP, etc.) y modelo.',
        'Haga clic en "Nueva Revisión" y pegue el volcado de la configuración actual o cargue el archivo de texto exportado.',
        'Abra la pestaña "Comparador Diff", elija dos versiones históricas y presione "Comparar Revisiones".',
        'Revise las líneas resaltadas en rojo y verde para auditar qué cambios se realizaron antes de que surgiera una anomalía.'
      ]
    },
    {
      id: 'guide-reportes-sla',
      category: 'guide',
      title: 'Manual: Módulo Reportes de SLA, Uptime y Métricas de Disponibilidad',
      tags: ['SLA', 'Uptime', 'Disponibilidad', 'MTBF', 'MTTR', 'Cumplimiento', 'Reportes'],
      summary: 'Cálculo automatizado de disponibilidad porcentual (99.9%), tiempos medios entre fallas (MTBF) y reportes ejecutivos de servicio.',
      content: `El módulo de **Reportes de SLA (Service Level Agreement)** permite auditar objetivamente el nivel de servicio entregado por la infraestructura de red, generando métricas estandarizadas de fiabilidad para auditorías corporativas o reportes a clientes.

      ### Indicadores Clave de Fiabilidad:
      * **Disponibilidad Porcentual (Uptime %)**: Calculado como \`(Tiempo Total - Tiempo Caído) / Tiempo Total * 100\`. Permite verificar el cumplimiento de acuerdos contractuales:
        * 99.0% = Máximo 7.2 horas de caída al mes.
        * 99.9% ("Tres Nueves") = Máximo 43.8 minutos de caída al mes.
        * 99.99% ("Cuatro Nueves") = Máximo 4.38 minutos de caída al mes.
      * **MTBF (Mean Time Between Failures)**: Tiempo promedio en horas que el sistema opera de forma continua entre incidentes consecutivos.
      * **MTTR (Mean Time To Recovery / Repair)**: Tiempo promedio en minutos que toma restablecer el servicio una vez ocurrida una caída.
      * **Exportación de Informes**: Genera reportes estructurados listos para imprimir o exportar con desglose por equipo.`,
      steps: [
        'Acceda a la pestaña "Reportes de SLA" en el menú lateral.',
        'Seleccione el período de evaluación (Últimas 24 horas, Últimos 7 días o Últimos 30 días).',
        'Defina el umbral de SLA objetivo (por ejemplo, 99.9%).',
        'Revise la tabla de cumplimiento: los equipos que superen el SLA se mostrarán con insignia verde, mientras que los incumplimientos se destacarán en rojo.',
        'Haga clic en "Exportar Reporte" para generar el documento oficial de auditoría.'
      ]
    },
    {
      id: 'guide-topologia-switches-lldp',
      category: 'guide',
      title: 'Manual: Módulo Topología de Switches y Descubrimiento LLDP / CDP',
      tags: ['Topología', 'LLDP', 'CDP', 'Vecinos', 'Switches', 'Capa 2', 'Enlaces'],
      summary: 'Mapeo automático de interconexiones puerto a puerto entre conmutadores mediante protocolos estándar de Capa 2.',
      content: `El módulo de **Topología de Switches** permite reconstruir el plano de interconexión física de la red mediante protocolos de descubrimiento de vecinos de Capa 2: **LLDP (Link Layer Discovery Protocol - IEEE 802.1AB)** y **CDP (Cisco Discovery Protocol)**.

      ### Cómo Funciona el Descubrimiento Automático:
      * **Descubrimiento de Vecinos (Neighbor Discovery)**: Los switches administrables transmiten periódicamente tramas LLDP/CDP por cada boca física. El monitor lee estas tablas para saber con precisión milimétrica qué puerto local está conectado a qué puerto del switch remoto (ej: *Switch-Core Gi0/24 conectado a Switch-Piso1 Gi0/1*).
      * **Información de Enlace Intercambiada**:
        * Identificador de chasis y nombre del switch remoto (System Name).
        * Número y descripción del puerto remoto (Port ID / Port Description).
        * Capacidades del equipo (Bridge, Router, WLAN Access Point).
        * VLANs etiquetadas permitidas en el enlace troncal (Trunk 802.1Q).
      * **Visualización de la Malla de Distribución**: Muestra la jerarquía de conmutación desde el Core hasta el Acceso, previniendo errores de conexionado.`,
      steps: [
        'Abra la sección "Topología de Switches" en el panel de navegación.',
        'Verifique que los switches administrados tengan habilitado LLDP o CDP en su configuración.',
        'Presione "Iniciar Descubrimiento de Topología" para sondear las tablas de vecinos.',
        'Explore el mapa de interconexión: pase el cursor sobre los enlaces para ver los puertos específicos de origen y destino.',
        'Identifique enlaces troncales redundantes y verifique que no existan bucles físicos no gestionados por Spanning Tree.'
      ]
    },
    {
      id: 'guide-sistema-actualizaciones',
      category: 'guide',
      title: 'Manual: Módulo Sistema de Actualizaciones de RedMonitor y Changelog',
      tags: ['Actualizaciones', 'Updates', 'Changelog', 'Firmware', 'Parches', 'Versiones'],
      summary: 'Comprobación de nuevas versiones estables, historial de cambios (Changelog) y actualización de la plataforma.',
      content: `El sistema incluye un **Gestor de Actualizaciones Integrado** para garantizar que la plataforma cuente siempre con las últimas firmas OUI de fabricantes, mejoras en el motor de escaneo ARP y parches de seguridad.

      ### Capacidades del Gestor:
      * **Consulta de Versión en Tiempo Real**: Compara la versión local activa contra el registro de actualizaciones (\`updates-history.json\`).
      * **Canales de Lanzamiento**: Soporta canales **Estable (Stable)** para producción y **Beta** para probar funciones experimentales.
      * **Registro Detallado de Cambios (Changelog)**: Desglosa cada parche con su fecha, notas técnicas, optimizaciones aplicadas y correcciones de estabilidad.
      * **Flujo Seguro de Aplicación**: Verifica la integridad de los archivos antes de actualizar para evitar estados inconsistentes.`,
      steps: [
        'Vaya a "Configuración" -> sección "Actualizaciones del Sistema".',
        'Consulte la versión actual instalada y presione "Buscar Actualizaciones".',
        'Si existe una versión más reciente, revise el registro de cambios (Changelog) detallado.',
        'Haga clic en "Aplicar Actualización" para descargar e instalar el parche de forma transparente.'
      ]
    },
    {
      id: 'guide-informes-optimizacion-vulnerabilidades',
      category: 'guide',
      title: 'Manual: Módulo Informes Detallados, Matriz de Vulnerabilidades y Plan de Optimización de Red',
      tags: ['Informes', 'Reportes', 'Vulnerabilidades', 'Optimización', 'Hardening', 'PDF', 'Score', 'Roadmap'],
      summary: 'Generación de informes exhaustivos en tiempo real con diagnóstico de salud, detección de vulnerabilidades L2/L3, recomendaciones técnicas y hoja de ruta interactiva para optimizar la red.',
      content: `El módulo de **Informes Detallados & Optimización** constituye el centro directivo y de auditoría integral de RedMonitor. Transforma las lecturas crudas del escaneo de subred y telemetría en un informe ejecutivo y técnico formal, ideal para gerencias de TI, auditorías de cumplimiento (ISO 27001, CIS Controls, NIST) y planes de mejora continua.

      ### Estructura y Capacidades del Módulo:
      * **Diagnóstico del Estado Actual & KPIs de Red**:
        * **Índice de Salud de Red (Score 0-100%)**: Evaluación ponderada calculada a partir de hosts caídos, advertencias de paquetes, latencia media, picos de jitter y vulnerabilidades activas. Clasificado en cuatro rangos: *Excelente*, *Bueno*, *En Riesgo* o *Crítico*.
        * **Inventario L2/L3 Clasificado**: Conteo desglosado de Routers/Gateways, Switches de Acceso, Servidores/NAS, Puestos de Trabajo (PCs) y Dispositivos CCTV/IoT.
        * **Métricas de Latencia y Estabilidad**: Registro de latencia media, pico máximo detectado y cálculo de variación de jitter entre paquetes.
      * **Matriz Exhaustiva de Vulnerabilidades Identificadas**:
        * Detección automática de servicios administrativos en texto plano (Telnet TCP 23, HTTP 80 en gateways).
        * Identificación de topologías planas sin segmentación VLAN (IEEE 802.1Q ausente con tráfico heterogéneo en /24).
        * Localización de direcciones MAC privadas/aleatorias o no registradas en la IEEE (Rogue Devices).
        * Detección de recursos compartidos SMB (TCP 445) sin firma criptográfica obligatoria.
        * Evaluación de puntos únicos de fallo (SPOF) en el enrutador de borde sin redundancia VRRP/HSRP.
        * Vulnerabilidad a envenenamiento ARP por ausencia de DHCP Snooping y Dynamic ARP Inspection (DAI).
        * Cada hallazgo detalla: ID único, Severidad (Crítica, Alta, Media, Baja), Categoría, Host/IP afectada, Vector de Ataque y Remediación técnica.
      * **Recomendaciones de Hardening y Arquitectura**:
        * Directivas concretas basadas en CIS Benchmarks y NIST SP 800-115 para endurecimiento criptográfico (SSHv2, SNMPv3 AuthPriv), blindaje de capa 2 y priorización de tráfico (QoS).
        * Incluye comandos prácticos de configuración listos para aplicar en conmutadores Cisco IOS, Mikrotik y Linux.
      * **Plan de Acción y Hoja de Ruta para Optimización (Interactive Checklist)**:
        * Organizado en 3 fases secuenciales:
          * **Fase 1: Mitigación Inmediata de Emergencia (0 - 48 Horas)**: Desactivación de protocolos sin cifrar, aislamiento de MACs anómalas y corrección de duplex.
          * **Fase 2: Optimización de Rendimiento & Hardening (3 - 14 Días)**: Configuración de DHCP Snooping, DAI, QoS para telefonía VoIP y alertas automatizadas.
          * **Fase 3: Modernización Arquitectónica & Resiliencia (15 - 45 Días)**: Despliegue de microsegmentación por VLANs, redundancia Multi-WAN con VRRP y respaldos automatizados.
        * Barra de progreso interactiva que se actualiza en tiempo real al marcar pasos y se preserva en almacenamiento local.
      * **Exportación Profesional Multiformato**:
        * **Descarga de PDF Ejecutivo Oficial**: Documento formal de múltiples páginas con membrete institucional, carátula, resumen ejecutivo, tabla de métricas, matriz de vulnerabilidades, recomendaciones y hoja de ruta con firma digital.
        * **Exportar a CSV / Excel**: Planilla para seguimiento de proyectos de infraestructura y auditorías externas.
        * **Copiar en Markdown**: Formato listo para pegar en wikis corporativas (Notion, Confluence, Obsidian, GitHub).
        * **Exportar JSON**: Para interoperabilidad con sistemas SIEM o almacenamiento estructurado.
      * **Archivo Histórico & Comparativa Temporal**:
        * Guardado de instantáneas en memoria persistente para comparar la evolución de la red a lo largo de los meses.`,
      steps: [
        'Haga clic en "Informes & Optimización" en la sección de Operaciones del menú lateral (o pulse el botón correspondiente desde Auditorías de Red).',
        'Revise el "Diagnóstico Actual & KPIs": observe el Score de Salud de la red, los dispositivos caídos y los picos de latencia.',
        'Haga clic en "Configurar Informe" si desea personalizar el título, la organización, el nombre del auditor o acotar el alcance a una subred específica.',
        'Explore la pestaña "Vulnerabilidades" para examinar los riesgos clasificados por severidad (Crítica, Alta, Media) con sus respectivos vectores de ataque y soluciones.',
        'Consulte las "Recomendaciones & Hardening" para obtener plantillas de comandos de conmutación de borde.',
        'Diríjase a la pestaña "Plan de Optimización" y marque las tareas que su equipo técnico vaya completando para observar el incremento porcentual en la barra de avance.',
        'Utilice los botones superiores para "Descargar PDF" formal o "Copiar Markdown" según las necesidades de documentación de su organización.',
        'Guarde el estado actual en la pestaña "Historial" para realizar comparativas de deriva en futuras auditorías.'
      ]
    },

    // --- PREGUNTAS Y RESPUESTAS (Q&A) ---
    {
      id: 'qa-saturacion',
      category: 'qa',
      title: '¿Cómo puedo saber si una red LAN está saturada?',
      tags: ['Saturación', 'Ancho de banda', 'Ping'],
      summary: 'Indicadores técnicos fiables para diagnosticar cuellos de botella por tráfico en redes de área local.',
      content: `Una red local saturada (congestión LAN) suele manifestarse en las capas inferiores mediante la saturación de búferes en switches y interfaces del gateway. Puedes detectarla a través de los siguientes patrones técnicos:

      ### 1. Elevación de Latencia Sistemática (Pings Altos)
      Al realizar peticiones de eco ICMP (ping) a múltiples hosts dentro del mismo segmento, verás un aumento severo en la latencia, no solo hacia Internet, sino **hacia el propio router local (gateway 192.168.1.1)**. Si el ping local supera los **10-15 ms de forma persistente**, hay saturación activa del procesador de tramas o del medio físico de transmisión.

      ### 2. Pérdida de Paquetes por Buffer Overrun
      Cuando las colas de conmutación del switch o la cola FIFO de recepción de los hosts se llenan (fenómeno conocido como **Bufferbloat**), los dispositivos descartan tramas excedentes. Si observas pérdida de paquetes local bajo cargas altas, es un claro síntoma de colas saturadas.

      ### 3. Monitoreo de Mbps por Host
      Verifica el uso de ancho de banda del adaptador en el menú "Ancho de Banda" de este sistema: si el consumo acumulado de descarga ronda o supera el **85% de la velocidad de negociación de Ethernet/Wi-Fi** (ej. estar descargando a 850 Mbps sostenidos en un puerto Gigabit de 1000 Mbps), el canal experimentará colisiones tardías y colas con retrasos persistentes.`
    },
    {
      id: 'qa-colapso-switch',
      category: 'qa',
      title: '¿Cómo puedo saber desde el sistema si tengo una red o switch (PoE o normal) colapsado?',
      tags: ['Switch', 'PoE', 'Colapso', 'Fallas'],
      summary: 'Métodos de diagnóstico remoto para determinar fallos eléctricos o lógicos en switches Ethernet.',
      content: `Un conmutador o switch colapsado bloquea el plano de datos de Capa 2, impidiendo la propagación de tramas. En este panel interactivo y en entornos reales de campo, puedes identificarlo evaluando estos síntomas:

      ### 1. Patrón de Pérdida Masiva de Equipos ("Isla de Red")
      Si el switch central se colapsa, todos los equipos conectados a ese nodo físico perderán conectividad simultáneamente. En nuestra **Vista General** o **Dispositivos**, verás que un bloque entero de host antes monitorizados en "OK" pasa a estado **Caído** de manera instantánea, dejando únicamente activos los hosts que residen aguas arriba o conectados de forma directa a interfaces del gateway local.

      ### 2. Caída del Bridge de Enlace (0% de Respuesta ICMP)
      Si ejecutas una ráfaga de pings continuos hacia el switch administrable (si este cuenta con una IP de administración in-band) y el resultado es un rotundo \`Request timed out\` repetitivo, el plano de control del switch está caído o bloqueado.

      ### 3. Sobrecalentamiento y Agotamiento de PoE (Power over Ethernet)
      Los switches PoE se encargan de alimentar dispositivos físicos (cámaras de seguridad domóticas, teléfonos IP, puntos de acceso Wi-Fi). Al colapsar eléctricamente:
      * **PoE Budget Exhausted**: Si el consumo de watts solicitado por la suma de cámaras IP excede la capacidad de entrega total (Por ejemplo, solicitar 65W a un switch de 60W de PoE total), los circuitos integrados de seguridad cortarán la energía de los puertos de forma cíclica.
      * En la interfaz del sistema, verás que estos equipos de sensorización PoE se **apagan y encienden intermitentemente cada 2 o 5 minutos**, o se reportan persistentemente inactivos.`
    },
    {
      id: 'qa-diff-poe',
      category: 'qa',
      title: '¿Qué diferencia a un switch PoE de uno común con respecto a fallos?',
      tags: ['Switches', 'PoE', 'Electricidad', 'Hardware'],
      summary: 'Aspectos eléctricos y térmicos propios que diferencian el mantenimiento de dispositivos PoE frente a switches estándar.',
      content: `Aunque ambos operan tramas Ethernet en la Capa 2, la integración de inyección de energía CC (corriente continua) sobre los pares de cable UTP (pines 1/2-3/6 en PoE Alternativo A o 4/5-7/8 en Alternativo B) hace que el switch PoE sea infinitamente más susceptible a los siguientes fallos específicos:

      ### 1. Sobrecargas Térmicas Críticas
      La inyección de energía PoE genera calor considerable en la placa madre interna del dispositivo. Por lo tanto, un switch PoE colocado en un rack mal ventilado o en áticos calurosos entrará frecuentemente en estados de **estrangulamiento térmico (Thermal Throttling)**, bloqueando los puertos o reiniciando el procesador general de conmutación. Un switch común no experimenta este estrés térmico.

      ### 2. Sensibilidad a Cableados Defectuosos y Cortocircuitos
      Un pequeño daño en el forro exterior de un cable Ethernet (o conectores RJ45 mal crimpados o húmedos) en un switch común solo provocará errores de CRC o pérdidas de tramas. Sin embargo, en un sistema **PoE**, este mismo defecto de cableado puede causar un **cortocircuito físico directo de 48V-57V**, activando las protecciones de sobrecorriente del puerto y quemando los transceptores del switch de forma permanente.`
    },
    {
      id: 'qa-desconocido-vendors',
      category: 'qa',
      title: '¿Por qué algunas direcciones IP muestran fabricante "Desconocido"?',
      tags: ['MAC', 'Vendor', 'OUI', 'Seguridad'],
      summary: 'La razón detrás de las marcas de red genéricas o ilegibles y su impacto en la prevención de intrusos.',
      content: `Cuando el monitor escanea los host, deduce su fabricante (Vendor) usando los primeros 3 octetos de la dirección MAC física (como \`00:1A:11\` o \`84:C8:A0\`), un mecanismo estandarizado gestionado por la IEEE conocido como **Organizationally Unique Identifier (OUI)**.
      
      Si un dispositivo se reporta como "Desconocido" o "Fabricante Estimado Genérico", generalmente se debe a:
      1. **Dirección MAC Virtual / Conmutador de Software**: Máquinas virtuales, contenedores de virtualización interna (como Docker bridge, VirtualBox, Kubernetes) o adaptadores simulados no registran prefijos en las bases de datos registradas de hardware de la IEEE.
      2. **Aleatoriedad de MAC de Dispositivos Móviles**: Por privacidad del usuario, los teléfonos modernos (iOS / Android) y portátiles Windows activan por defecto la opción **"Dirección MAC Aleatoria / Privada"** al conectarse. Esta función genera una dirección MAC ficticia local que rompe la correlación OUI con el fabricante real (ej. Apple se disfraza con un prefijo privado genérico).`
    },
    {
      id: 'qa-acceso-movil-wifi',
      category: 'qa',
      title: '¿Cómo conectar y visualizar el panel de RedMonitor desde mi teléfono celular o tablet en la misma Wi-Fi?',
      tags: ['Móvil', 'Celular', 'Wi-Fi', 'QR', 'LAN', 'Android', 'iOS', 'Acceso Remoto'],
      summary: 'Pasos exactos para monitorear tu red en tiempo real desde smartphones o tablets sin instalar aplicaciones adicionales.',
      content: `RedMonitor está desarrollado con una arquitectura de interfaz web progresiva y responsiva (PWA Ready), lo que permite que cualquier celular o tablet funcione como una consola portátil de monitoreo de red sin requerir instalación en tiendas de apps.

      ### Procedimiento de Conexión:
      1. **Conexión a la Misma Red Wi-Fi**: Asegúrate de que el smartphone o tablet esté conectado al mismo SSID (red inalámbrica Wi-Fi) o a la misma subred que la computadora donde corre el servidor RedMonitor.
      2. **Obtener el Código QR**: En la computadora, haz clic en el botón superior **"Acceso Móvil"**. Se abrirá una ventana emergente con:
         * Un **Código QR grande** de alta legibilidad.
         * La **URL exacta de red** (ej: \`http://192.168.1.50:3000\`).
      3. **Escanear y Cargar**: Abre la cámara de tu celular (Android o iOS) o tu lector de QR favorito y enfoca el código en la pantalla.
      4. **Navegación Táctil**: La interfaz se adaptará automáticamente a la pantalla táctil de tu dispositivo móvil, permitiendo disparar pings, revisar estados de switches y recibir alertas de red mientras te desplazas físicamente por las instalaciones.`
    },
    {
      id: 'qa-firewall-puerto-3000',
      category: 'qa',
      title: '¿Por qué la web no carga desde otros equipos de la red local y cómo configurar el Cortafuegos (Firewall)?',
      tags: ['Firewall', 'Puerto 3000', 'Bloqueo', 'Windows Defender', 'ufw', 'iptables', 'Conexión'],
      summary: 'Solución a los bloqueos de puerto 3000 por cortafuegos de Windows o Linux y aislamiento de puntos de acceso Wi-Fi.',
      content: `Si al ingresar la IP local en tu celular u otra computadora la página queda cargando indefinidamente o muestra "ERR_CONNECTION_TIMED_OUT", el 99% de las veces se debe al cortafuegos del sistema operativo o a una función de seguridad en tu router.

      ### 1. Desbloqueo en Firewall de Windows Defender:
      Por defecto, Windows bloquea conexiones entrantes a programas ejecutados por consola.
      1. Presiona \`Win + R\`, escribe \`wf.msc\` y presiona Enter (*Firewall de Windows Defender con seguridad avanzada*).
      2. En el panel izquierdo, haz clic en **Reglas de Entrada**.
      3. En el panel derecho, haz clic en **Nueva Regla...**.
      4. Selecciona tipo **Puerto** -> Siguiente.
      5. Selecciona protocolo **TCP** y en *Puertos locales específicos* escribe: \`3000\` -> Siguiente.
      6. Selecciona **Permitir la conexión** -> Siguiente.
      7. Marca las opciones de perfil: *Dominio*, *Privada* y *Pública* -> Siguiente.
      8. Nómbrala como \`RedMonitor Puerto 3000\` y haz clic en **Finalizar**.

      ### 2. Desbloqueo en Linux (Ubuntu, Debian, Raspberry Pi):
      Si el servidor corre en una máquina Linux con firewall UFW activo, ejecuta en la terminal:
      \`sudo ufw allow 3000/tcp\`
      \`sudo ufw reload\`

      ### 3. Aislamiento de Clientes Wi-Fi (AP Isolation / Client Isolation):
      Algunos routers y puntos de acceso Wi-Fi tienen activada la función "Aislamiento de AP" (Guest Isolation). Esta función impide que dos dispositivos conectados a la misma Wi-Fi se comuniquen entre sí. Desactiva el *AP Isolation* en el panel web de tu router para permitir la comunicación entre tu PC y tu teléfono.`
    },
    {
      id: 'qa-motor-arp-proc',
      category: 'qa',
      title: '¿Cómo funciona el nuevo motor de lectura ARP y por qué no depende de comandos externos en Linux?',
      tags: ['ARP', '/proc/net/arp', 'Kernel', 'Linux', 'PowerShell', 'Escaneo', 'Rendimiento'],
      summary: 'Detalles de bajo nivel del analizador de tablas de vecinos del kernel y compatibilidad multiplataforma.',
      content: `En distribuciones Linux modernas y contenedores mínimos de servidor (Ubuntu 22+, Debian 12, Alpine), el paquete histórico \`net-tools\` (que contenía el comando \`arp\`) ya no viene instalado por defecto, provocando fallos de ejecución (\`code 127\`).

      ### Arquitectura Resiliente de RedMonitor:
      Para solucionar este desafío de forma definitiva, RedMonitor implementa un motor de resolución multinivel:
      1. **Lectura Directa de Kernel (/proc/net/arp)**: En Linux, el sistema lee directamente el archivo virtual del kernel \`/proc/net/arp\`. Esta operación es **instantánea**, no genera procesos hijos (\`child_process\`), consume **cero ciclos de CPU** y no requiere permisos de superusuario ni paquetes externos.
      2. **Fallback IP Route / Neigh**: Si no se encuentra \`/proc/net/arp\`, consulta la herramienta moderna de red \`ip -4 neigh show\`.
      3. **PowerShell Get-NetNeighbor en Windows**: En sistemas Windows, combina la salida clásica de \`arp -a\` con el cmdlet nativo de PowerShell \`Get-NetNeighbor -AddressFamily IPv4\`, extrayendo direcciones MAC con precisión incluso cuando la interfaz de consola está restringida.
      4. **Inyección de Identidad de "Este PC"**: El motor auto-detecta las tarjetas de red locales del equipo anfitrión y las inyecta en la tabla para garantizar que la máquina servidora siempre aparezca en el mapa de dispositivos.`
    },

    // --- CÓMO HACER (HOW-TO) ---
    {
      id: 'how-to-perdida',
      category: 'how-to',
      title: 'Cómo diagnosticar la pérdida de paquetes en un Switch paso a paso',
      tags: ['Diagnóstico', 'Remediación', 'Enlace', 'Capa 2'],
      summary: 'Método estructurado para aislar y resolver la caída intermitente de tramas en conmutadores físicos.',
      content: `La pérdida masiva de tramas Ethernet en switches locales degrada severamente el rendimiento debido a retransmisiones constantes en la capa de transporte TCP. Sigue esta checklist profesional para aislar la causa raíz de inmediato:

      ### Paso 1: Examinar la tabla de contadores de errores (CRC Errors)
      Entra por consola (SSH/CLI) o interfaz web a tu switch administrable y ejecuta comandos como \`show interfaces counters errors\` (o equivalente según marca).
      * **Si ves incrementos constantes de CRC (Cyclic Redundancy Check):** El cable Ethernet, los conectores RJ45 o el keystones de pared están dañados físicamente o reciben interferencias cruzadas por inducción magnética.
      * Un switch común no administrable requerirá ser diagnosticado por un probador de cables físico o midiendo con el ping del sistema.

      ### Paso 2: Evaluar la Calidad y Distancia del Cable UTP
      * Asegúrate de que los cables de red de cobre no excedan el **límite de 100 metros** estandarizado en la norma ANSI/TIA-568-C.2. Superar esta distancia debilita la señal hasta causar atenuaciones extremas y pérdidas intermitentes.
      * Revisa que los cables UTP no estén doblados excesivamente (respetar el radio mínimo de curvatura del cable).

      ### Paso 3: Identificar Loops de Red (Tormentas de Broadcast)
      Cuando un cable de red se conecta accidentalmente por ambos extremos al mismo switch, o se interconectan dos switches en bucle sin el protocolo Spanning Tree activo, las tramas de broadcast circulan infinitamente.
      * **Síntoma:** El indicador LED de actividad del switch parpadea a una velocidad frenética y constante (todos los puertos al unísono) y el ping local escalará instantáneamente a **timeouts prolongados**.
      * **Remediación:** Habilita **RSTP (Rapid Spanning Tree Protocol)** en todos tus conmutadores locales para prevenir tormentas antes de que ocurran.`,
      steps: [
        'Aísla el host afectado aislando el puerto del switch correspondiente.',
        'Sustituye temporalmente el cable UTP del dispositivo por un latiguillo (patch cord) certificado nuevo para descartar falla electromecánica.',
        'Inspecciona las colas del switch administrable para validar si hay saturación por Bufferbloat (Tráfico masivo concurrente).',
        'Limpia transceptores SFP ópticos en caso de enlaces de fibra local mediante kits de limpieza para eliminar polvo microscópico.'
      ]
    },
    {
      id: 'how-to-colapso-resolv',
      category: 'how-to',
      title: 'Cómo resolver un Colapso de Gateway o Router Local',
      tags: ['Gateway', 'Router', 'Bypass', 'Soluciones'],
      summary: 'Guía práctica para restablecer la conectividad troncal cuando el router LAN deja de funcionar.',
      content: `Cuando el gateway principal (.1) se colapsa, la red pierde salida debido a fallos en la tabla NAT, bloqueo del firewall o congelamiento del procesador ASIC principal. Aplica este procedimiento de contingencia operativa:

      ### Paso 1: Validar el Límite de Conexiones Concurrentes
      Los routers de operadores o de gama baja residencial colapsan rápidamente si se inician miles de conexiones simultáneas (ej. por descargas BitTorrent pesadas, tráfico de minería masivo o malware). El plano de control se queda sin recursos RAM y arrastra el plano de datos.
      * **Remediación instantánea**: Purga el tráfico reiniciando el equipo, y asocia reglas de QoS para limitar el máximo de conexiones concurrentes por puerto.

      ### Paso 2: Realizar Bypass de Bucle Físico
      Si sospechas que el router local está bloqueado por culpa de una sobrecarga transmitida desde el switch (ej. un loop de Capa 2), desconecta temporalmente el switch del router de frontera y conecta una sola laptop directamente al puerto LAN del router.
      * Si la laptop logra levantar ping al gateway, la falla origen está alojada aguas abajo, en un loop físico sobre el switch local.`,
      steps: [
        'Desconecta el switch troncal del router local para aislar capas lógicas.',
        'Conecta un único host por puerto físico directo al router para validar entrega IP por DHCP.',
        'Ejecuta una solicitud ping sostenida al router (\`ping -t 192.168.1.1\` o la subred activa).',
        'Si persiste el timeout, realiza un ciclo de apagado (Power Cycle) completo desconectando el cable de alimentación por 30 segundos.',
        'Actualiza el Firmware del equipo de borde para solventar fugas de memoria típicas que degradan el procesador tras días de uptime.'
      ]
    },
    {
      id: 'how-to-intrusos',
      category: 'how-to',
      title: 'Cómo identificar intrusos y mitigar ARP Spoofing',
      tags: ['Seguridad', 'Intrusos', 'Spoofing', 'LAN'],
      summary: 'Acciones de filtrado físico para neutralizar atacantes locales que intentan interceptar datos.',
      content: `El spoofing de protocolo ARP consiste en engañar a un conmutador de red o hosts locales asociando una IP legítima (como el Gateway) a la MAC de un intruso.
      
      ### Indicación Visual en este Sistema
      Usa la pestaña **Dispositivos** de esta herramienta. Si detectas dos direcciones IP diferentes registradas con la **misma e idéntica dirección MAC**, o una IP troncal legítima adquiere repentinamente una dirección MAC de fabricante desconocido, tienes un caso de envenenamiento ARP en proceso.
      
      ### Cómo Neutralizar e Impedir este ataque:
      1. **Habilitar DAI (Dynamic ARP Inspection)**: En switches administrables L2/L3, activa la inspección dinámica de ARP combinada con **DHCP Snooping**. El switch mantendrá una tabla segura de asignaciones reales IP-MAC y descartará instantáneamente cualquier respuesta ARP falsa que se reciba desde puertos no autorizados.
      2. **Establecer Entradas ARP Estáticas**: En servidores clave o estaciones de trabajo analíticas, puedes fijar la MAC del gateway de forma estática ejecutando el comando Unix/Windows:
         \`arp -s 192.168.1.1 00-aa-bb-cc-dd-ee\`
         Esto fuerza al host a ignorar cualquier trama ARP maliciosa enviada por atacantes.`,
      steps: [
        'Inspecciona las asignaciones duplicadas de MAC en tu tabla de hosts.',
        'Activa DHCP Snooping en tu conmutador local para blindar puertos de usuario.',
        'Configura el puerto del router troncal como puerto confiable (Trusted Port).',
        'Para sistemas hogareños estándar, instala firewalls locales que implementen vigilancia activa de tablas ARP.'
      ]
    },
    {
      id: 'how-to-entorno-profesional',
      category: 'how-to',
      title: 'Cómo diseñar y crear un entorno de red profesional (Enterprise Grade)',
      tags: ['Diseño de Red', 'Mejores Prácticas', 'Seguridad L2', 'Infraestructura'],
      summary: 'Directrices fundamentales de arquitectura para escalar desde una subred hogareña a un entorno empresarial blindado.',
      content: `Para migrar de un entorno de red básico o doméstico hacia una arquitectura robusta de nivel empresarial ("Enterprise Grade"), es fundamental implementar mecanismos físicos y lógicos de control de tráfico, redundancia y segmentación rigurosa.

      ### 1. Segmentación Lógica con VLANs (IEEE 802.1Q)
      En una red profesional, **nunca** dejes todos los hosts en la misma subred predeterminada (Default VLAN 1). Configura VLANs independientes para aislar los diferentes tipos de tráfico y hosts:
      * **VLAN 10 - Gestión (Management)**: Reservada exclusivamente para las IPs de administración de switches, puntos de acceso y el router de borde.
      * **VLAN 20 - Empleados / Estaciones de Trabajo**: Equipos de cómputo diario.
      * **VLAN 30 - Servidores y Recursos Críticos**: Bases de datos, almacenamiento NAS y controladores de dominio.
      * **VLAN 40 - Telefonía y VoIP**: Con prioridad de servicio (QoS/CoS) activada para evitar cortes de audio.
      * **VLAN 50 - Cámaras de Seguridad (CCTV) / Domótica**: Equipos IoT con salidas restringidas de Internet para prevenir fugas de telemetría.
      * **VLAN 90 - Invitados (Guest)**: Conexión aislada a Internet sin acceso a recursos internos corporativos.

      ### 2. Seguridad en Puertos de Acceso (Port Security)
      Protege físicamente tu switch administrable bloqueando el acceso a puertos Ethernet expuestos en salas de reuniones o pasillos:
      * **Filtro de Dirección MAC**: Limita la cantidad de direcciones MAC permitidas por puerto a un máximo de **1 o 2**. Si alguien desconecta un teléfono IP e intenta conectar una laptop externa, el switch desactivará automáticamente la interfaz física (\`err-disable\`).
      * **Filtro DHCP Snooping**: Evita que intrusos conecten un router doméstico barato al revés y actúe como un servidor DHCP falso (provocando conflictos de IPs en toda la LAN).

      ### 3. Redundancia de Enlaces sin Bucles (Spanning Tree Protocol)
      Para entornos empresariales de alta disponibilidad, es vital interconectar switches mediante rutas físicas duplicadas (anillos o mallas de backup).
      * Activa **MSTP (Multiple Spanning Tree Protocol)** o **RSTP (Rapid Spanning Tree Protocol)** para que el plano lógico L2 calcule automáticamente el camino óptimo y mantenga el enlace redundante en modo "bloqueo" temporal. En caso de corte físico de una fibra, el enlace de backup se activará en menos de **2 segundos** de forma transparente.

      ### 4. Estructuración Física y Climatización
      * **Rack de Telecomunicaciones**: Centraliza tu infraestructura en un rack de 19 pulgadas cerrado con llave, provisto de organizadores de cables horizontales y verticales.
      * **Organización del Cableado (Patch Panels)**: No conectes cables UTP largos de forma directa a los switches. Termina el cableado de pared en un Patch Panel y realiza puentes limpios mediante latiguillos (patch cords) certificados del color correspondiente a la VLAN.
      * **Sistemas de Respaldo Energético (UPS)**: Alimenta tus switches PoE principales y routers de borde mediante sistemas UPS (Uninterruptible Power Supply) de doble conversión en línea para filtrar picos de voltaje y proveer un bypass eléctrico fluido.`,
      steps: [
        'Dibuja un diagrama de topología lógica y física antes de adquirir equipamiento físico.',
        'Sustituye routers y switches de consumo por equipos corporativos administrables con soporte L2/L3 y control de VLANs.',
        'Implementa direccionamiento estático ordenado para servidores e infraestructura crítica de red.',
        'Habilita protocolos de monitoreo estándar como SNMPv3 o Syslog remoto para centralizar las alertas del switch.',
        'Etiqueta cada extremo del cableado estructurado según la nomenclatura del patch panel (ej: R1-P05).'
      ]
    },
    {
      id: 'how-to-configurar-telegram-discord',
      category: 'how-to',
      title: 'Cómo configurar un Bot de Telegram o Webhook de Discord para recibir alertas críticas al instante',
      tags: ['Telegram', 'Discord', 'BotFather', 'Webhook', 'Alertas', 'Automatización'],
      summary: 'Guía práctica para enlazar canales de mensajería y recibir caídas de red directamente en tu smartphone.',
      content: `La recepción de alertas en tiempo real en tu teléfono inteligente evita tiempos de inactividad prolongados. Configura canales de mensajería instantánea siguiendo estos pasos:

      ### Configuración de Telegram Bot:
      1. Abre Telegram y busca al bot oficial **@BotFather**.
      2. Envía el comando \`/newbot\` y sigue las instrucciones para asignarle un nombre y un nombre de usuario terminado en \`bot\`.
      3. BotFather te entregará un **Token de Acceso HTTP API** (ej: \`7123456789:AAHk..._XYZ\`). Copia este valor.
      4. Inicia una conversación con tu nuevo bot enviándole cualquier mensaje (ej: "Hola").
      5. Para obtener tu **Chat ID**, reenvía un mensaje al bot **@userinfobot** o consulta \`https://api.telegram.org/bot<TU_TOKEN>/getUpdates\`.
      6. En RedMonitor, ve a **Notificaciones** -> **Nuevo Canal** -> selecciona **Telegram** -> pega el Token y el Chat ID -> presiona **Probar Envío**.

      ### Configuración de Discord Webhook:
      1. En tu servidor de Discord, entra a los **Ajustes del Canal** donde deseas recibir las alertas de red.
      2. Dirígete a **Integraciones** -> **Webhooks** -> **Crear Webhook**.
      3. Asígnale el nombre "RedMonitor Alertas" y copia la **URL del Webhook** (\`https://discord.com/api/webhooks/...\`).
      4. En RedMonitor, ve a **Notificaciones** -> **Nuevo Canal** -> selecciona **Discord** -> pega la URL del Webhook -> presiona **Probar Envío**.`,
      steps: [
        'Cree el bot en Telegram con @BotFather o genere el Webhook en Discord desde los ajustes del canal.',
        'Obtenga el token de autenticación o la URL del Webhook.',
        'Diríjase a la sección "Notificaciones" en el menú principal de RedMonitor.',
        'Haga clic en "Nuevo Canal", ingrese los datos y presione "Probar Envío".',
        'Compruebe la recepción del mensaje de prueba en su celular y active las alertas de dispositivos caídos.'
      ]
    },
    {
      id: 'how-to-configurar-syslog-remoto',
      category: 'how-to',
      title: 'Cómo centralizar logs remotos configurando tu Router o Switch para enviar Syslog a RedMonitor',
      tags: ['Syslog Remoto', 'UDP 514', 'Cisco', 'Mikrotik', 'Router', 'Logs'],
      summary: 'Comandos y configuraciones para enviar eventos operativos desde Cisco, Mikrotik o Ubiquiti al puerto UDP 514 de RedMonitor.',
      content: `Para que RedMonitor capture las alertas generadas por tu hardware de red (desconexión de puertos, fallas de ventiladores, cambios en STP), debes apuntar el demonio Syslog de tus equipos hacia la IP del servidor RedMonitor en el puerto **UDP 514**.

      ### 1. Configuración en Cisco IOS / Catalyst:
      Accede a la consola del switch y entra en modo de configuración global:
      \`\`\`bash
      configure terminal
      logging host 192.168.1.50   ! Reemplazar por la IP del servidor RedMonitor
      logging trap warnings       ! Enviar eventos de nivel warning, error y critical
      logging source-interface GigabitEthernet0/1
      logging on
      end
      write memory
      \`\`\`

      ### 2. Configuración en Mikrotik RouterOS:
      Abre New Terminal en WinBox o WebFig:
      \`\`\`bash
      /system logging action add name=redmonitor target=remote remote=192.168.1.50:514 remote-port=514
      /system logging add action=redmonitor topics=critical,error,warning,interface
      \`\`\`

      ### 3. Configuración en Ubiquiti UniFi:
      En la consola de UniFi Network:
      * *Settings* -> *System* -> *Advanced* -> *Remote Syslog Server*.
      * Activa la casilla, ingresa la IP del servidor RedMonitor y especifica el puerto \`514\`.`,
      steps: [
        'Identifique la dirección IP de la computadora donde corre RedMonitor (ej: 192.168.1.50).',
        'Verifique que el Firewall permita el tráfico entrante en el puerto 514 UDP.',
        'Aplique los comandos correspondientes en su conmutador Cisco, Mikrotik o firewall.',
        'Desconecte y reconecte un cable Ethernet en el switch para disparar un evento link-down / link-up.',
        'Abra la pestaña "Syslog & Traps" en RedMonitor para confirmar la llegada del log en tiempo real.'
      ]
    },
    {
      id: 'how-to-auditar-certificados-ssl',
      category: 'how-to',
      title: 'Cómo auditar la caducidad y vulnerabilidades en certificados SSL/TLS de portales y switches',
      tags: ['SSL', 'TLS', 'Certificados', 'HTTPS', 'Auditoría', 'Expiración'],
      summary: 'Procedimiento para descubrir certificados por expirar, cifrados débiles y validar la confianza en la red.',
      content: `La expiración inesperada de un certificado SSL/TLS en un portal de autenticación o switch administrable puede bloquear el acceso a los usuarios o generar advertencias críticas de seguridad en navegadores.

      ### Procedimiento de Auditoría SSL:
      1. **Identificar Servicios Web Seguros (HTTPS)**: Revisa los equipos en la tabla de dispositivos que tengan abiertos los puertos 443, 8443 o 4443.
      2. **Ejecutar la Auditoría**: Ve a la pestaña **Auditoría SSL/TLS**, escribe la dirección y puerto objetivo y pulsa **Auditar Certificado**.
      3. **Interpretar los Resultados**:
         * **Días Restantes**: Si quedan menos de 15 días, el sistema marcará el estado en amarillo o rojo.
         * **Emisor**: Si es autofirmado (*Self-signed*), se recomienda reemplazarlo por un certificado emitido por una CA interna de la empresa o Let's Encrypt para evitar alertas del navegador.
         * **Versión de TLS**: Verifica que negocie **TLS 1.2 o TLS 1.3**. Si negocia TLS 1.0 o TLS 1.1, actualice el firmware del switch para mitigar vulnerabilidades criptográficas (BEAST, POODLE).`,
      steps: [
        'Acceda al módulo "Auditoría SSL/TLS" en RedMonitor.',
        'Ingrese los hosts HTTPS críticos de la red (routers de borde, portales cautivos, paneles de switches).',
        'Presione "Auditar Certificado" y revise los días restantes de vigencia.',
        'Presione "Agregar a Monitoreo" para registrar el host en la matriz de seguimiento continuo.',
        'Configure alertas en "Notificaciones" para recibir avisos automáticos 7 días antes de la expiración.'
      ]
    }
  ];

  const filteredItems = useMemo(() => {
    return wikiItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="bg-[#0B1120] text-slate-100 rounded-xs border border-slate-800 shadow-xl overflow-hidden" id="network-wiki-container">
      {/* HEADER WIKI BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/30 text-cyan-400">
            <BookOpen className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Wiki y Centro de Soporte Red L2
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Manuales del sistema, FAQs y guías avanzadas para diagnosticar switches, pérdida de paquetes y redes saturadas.
            </p>
          </div>
        </div>
        
        {/* API KNOWLEDGE NOTIFICATION */}
        <div className="bg-cyan-950/40 border border-cyan-800/40 py-1.5 px-3.5 rounded-xs flex items-center gap-2 max-w-sm">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-[10px] text-cyan-300 leading-normal">
            <strong>¿Tienes un problema único?</strong> Usa el <strong>Copiloto AI</strong> en el panel de navegación para diagnósticos a medida.
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR BAR BAR */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* INTERACTIVE SEARCH */}
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-sm py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-505 focus:outline-none focus:border-cyan-500 transition-all font-sans"
            placeholder="Buscar por tag, título o palabras clave (PoE, saturada, CRC)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="wiki-search-input"
          />
        </div>

        {/* CATEGORY SELECTOR TABS */}
        <div className="flex flex-wrap gap-1.5 md:col-span-7 justify-start md:justify-end">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Todos los temas ({wikiItems.length})
          </button>
          <button
            onClick={() => setSelectedCategory('guide')}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              selectedCategory === 'guide'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="h-3 w-3" />
            Manual del Sistema
          </button>
          <button
            onClick={() => setSelectedCategory('qa')}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              selectedCategory === 'qa'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HelpCircle className="h-3 w-3" />
            Preguntas y Respuestas
          </button>
          <button
            onClick={() => setSelectedCategory('how-to')}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              selectedCategory === 'how-to'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="h-3 w-3" />
            Cómo hacer...
          </button>
        </div>
      </div>

      {/* SEARCH COUNTER OR EMPTY STATE */}
      <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-[10px] text-slate-450 font-mono">
        <div>
          Mostrando <span className="text-cyan-400 font-bold">{filteredItems.length}</span> de <span className="text-slate-400 font-bold">{wikiItems.length}</span> temas encontrados
        </div>
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="text-cyan-500 hover:text-cyan-400 font-semibold uppercase cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {/* WIKI CONTENT GRID LIST */}
      <div className="p-5 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-xs">
            <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-350">Ningún tema coincide con tu búsqueda</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Prueba a buscar palabras como "PoE", "saturada", "CRC", "Cableado", o selecciona otra pestaña de categoría.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = !!expandedItems[item.id];
            const isQa = item.category === 'qa';
            const isHowTo = item.category === 'how-to';
            const isGuide = item.category === 'guide';

            return (
              <div 
                key={item.id}
                className={`border rounded-xs transition-all overflow-hidden ${
                  isExpanded 
                    ? 'border-slate-700 bg-slate-900/65 shadow-md' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/30'
                }`}
                id={`wiki-item-${item.id}`}
              >
                {/* INTERACTIVE HEADER CONTAINER */}
                <div 
                  onClick={() => toggleExpand(item.id)}
                  className="p-4 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {/* ACCENT COLORED CATEGORY ICON */}
                    <div className={`p-1.5 rounded-sm shrink-0 border ${
                      isGuide 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : isQa 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {isGuide ? (
                        <FileText className="h-4 w-4" />
                      ) : isQa ? (
                        <HelpCircle className="h-4 w-4" />
                      ) : (
                        <Terminal className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* THE TITLE STATEMENT */}
                        <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors font-display">
                          {item.title}
                        </h3>

                        {/* CATEGORY BADGE */}
                        <span className={`text-[8px] font-mono tracking-wider uppercase px-1.5 py-0.2 rounded-xs border leading-none font-bold shrink-0 ${
                          isGuide 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                            : isQa 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                            : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                        }`}>
                          {isGuide ? 'Módulo' : isQa ? 'P&R' : 'Cómo hacer'}
                        </span>
                      </div>

                      {/* SUMMARY PREVIEW */}
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-4xl">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  {/* CHEVRON TOGGLER */}
                  <div className="text-slate-500 p-0.5">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-cyan-500" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>

                {/* EXPANDABLE BODY CONTENT */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-1 border-t border-slate-800/80 bg-slate-900/20">
                    {/* REUSABLE TAGS STRIP */}
                    <div className="flex flex-wrap items-center gap-1 px-1 mb-4">
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider mr-1 uppercase">Etiquetas:</span>
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-semibold bg-slate-950 border border-slate-800/80 text-slate-400 px-2 py-0.5 rounded-sm">
                          #{tag}
                        </span>
                      ))}

                      {/* ACTION COPIER BUTTON */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.id, `**${item.title}**\n\n${item.content}`);
                        }}
                        className="ml-auto flex items-center gap-1 text-[9px] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80 rounded-sm py-1 px-2 cursor-pointer transition-colors"
                        title="Copiar contenido de este tema"
                      >
                        <Copy className="h-2.5 w-2.5" />
                        <span>{copiedId === item.id ? '¡Copiado!' : 'Copiar tema'}</span>
                      </button>
                    </div>

                    {/* CORE MARKDOWN LIKE FORMATTED TEXT */}
                    <div className="prose prose-invert prose-xs max-w-none text-slate-350 pr-4 pl-1 space-y-3 font-sans text-xs leading-relaxed">
                      {item.content.split('\n\n').map((paragraph, i) => {
                        const trimmed = paragraph.trim();
                        if (trimmed.startsWith('### ')) {
                          return <h4 key={i} className="text-sm font-bold text-white tracking-tight mt-4 pt-1 flex items-center gap-1.5">{trimmed.replace('### ', '')}</h4>;
                        }
                        if (trimmed.startsWith('* ')) {
                          return (
                            <ul key={i} className="list-disc pl-5 space-y-1">
                              {trimmed.split('\n').map((li, liIdx) => (
                                <li key={liIdx}>{li.replace('* ', '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ')) {
                          return (
                            <ol key={i} className="list-decimal pl-5 space-y-1">
                              {trimmed.split('\n').map((li, liIdx) => (
                                <li key={liIdx}>{li.replace(/^\d+\.\s+/, '')}</li>
                              ))}
                            </ol>
                          );
                        }
                        return <p key={i}>{trimmed}</p>;
                      })}
                    </div>

                    {/* DYNAMIC STEPS IF ANY (STEPS TIMELINE) */}
                    {item.steps && item.steps.length > 0 && (
                      <div className="mt-5 border-t border-slate-800/60 pt-4">
                        <h4 className="text-xs font-bold font-display uppercase tracking-widest text-cyan-400 mb-3 ml-1 flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5" /> Pasos a Seguir / Checklist:
                        </h4>
                        <div className="relative border-l border-slate-800 ml-4 pl-3 space-y-3 pt-1 pb-1">
                          {item.steps.map((step, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[19.5px] top-0.5 bg-slate-950 border border-cyan-500 text-cyan-400 rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] font-bold font-mono">
                                {idx + 1}
                              </div>
                              <p className="text-xs text-slate-300 pl-2">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER WIKI BOX */}
      <div className="bg-slate-900/40 border-t border-slate-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
        <div>
          © 2026 RedMonitor Network System L2. Documentación Oficial y Manuales Operativos.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('Móvil'); setSelectedCategory('guide'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Acceso Móvil / QR
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('SSL'); setSelectedCategory('guide'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Auditoría SSL/TLS
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('Telegram'); setSelectedCategory('how-to'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Telegram / Discord
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('Syslog'); setSelectedCategory('guide'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Syslog UDP 514
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('PoE'); setSelectedCategory('qa'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Switches PoE
          </a>
        </div>
      </div>
    </div>
  );
}
