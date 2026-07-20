import React, { useState, useMemo } from 'react';
import { 
  BookOpen, HelpCircle, FileText, Search, ChevronRight, ChevronDown, CheckCircle, 
  AlertTriangle, Copy, Terminal, Shield, Cpu, Cable, Network, AlertCircle, Sparkles, Server
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
          © 2026 Router LAN Monitor L2. Documentación Oficial y Manuales Operativos.
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('PoE'); setSelectedCategory('qa'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Buscar "PoE"
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('saturada'); setSelectedCategory('qa'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Buscar "Saturada"
          </a>
          <span>•</span>
          <a
            href="#wiki-search-input"
            onClick={() => { setSearchTerm('pérdida'); setSelectedCategory('how-to'); }}
            className="hover:text-cyan-400 hover:underline cursor-pointer"
          >
            Buscar "Pérdida de Paquetes"
          </a>
        </div>
      </div>
    </div>
  );
}
