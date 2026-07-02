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
      id: 'guide-uso-sistema',
      category: 'guide',
      title: 'Manual de Usuario: Cómo usar el Monitor de Red Capa L2',
      tags: ['Manual', 'Primeros pasos', 'Simulación'],
      summary: 'Aprende a navegar por los módulos del sistema, simular anomalías y auditar enlaces de red.',
      content: `Este panel interactivo simula e inspecciona un segmento de red local (LAN) con capacidades de diagnóstico de Capa 2 (Modelo OSI). 
      
      ### Módulos Principales:
      1. **Vista General**: Muestra la topología del segmento, el estado actual de los hosts (OK/Advertencia/Crítico) y el estado físico del canal.
      2. **Consola de Sensores**: Informa sobre el estado de telemetría inyectada en switches y enlaces físicos (RSTP, contadores de paquetes, PoE budget).
      3. **Dispositivos**: Tabla administrativa de hosts detallada con sus direcciones IP, MAC físicas, pings y fabricantes deducidos por OUI.
      4. **Ancho de Banda**: Gráficas de consumo en Mbps en tiempo real para rastrear saturaciones de puerto.
      5. **Prueba de Velocidad**: Simula pruebas de velocidad de subida, bajada y jitter para medir capacidades del enlace de borde.
      6. **Copiloto AI**: Integración inteligente con Google Gemini que analiza los datos telemetry del switch y genera informes de mitigación.`,
      steps: [
        'Selecciona un adaptador de red físico o virtual en el selector superior.',
        'Pulsa "Iniciar Escaneo de Red" para enviar paquetes de sondeo ICMP generados por simulación.',
        'Ve a la "Consola de Pruebas" al final del menú de navegación para inyectar fallos (Ej. Caída de Gateway, Latencias artificiales o Loops de capa 2).',
        'Haz clic en "Copiloto de Red AI" y solicita un "Diagnóstico Completo" para ver el informe de remediación en base al estado de la red.'
      ]
    },
    {
      id: 'guide-anomalias-sim',
      category: 'guide',
      title: 'Guía de Simulación: Comprensión de Anomalías de Red',
      tags: ['Anomalías', 'Educativo', 'Conmutación'],
      summary: 'Cómo entender e inyectar problemas típicos de redes LAN desde la terminal de testeo.',
      content: `El simulador te permite inyectar condiciones de red adversas para entrenar tus capacidades de análisis en redes multitarea.
      
      ### Anomalías Disponibles para Pruebas:
      * **Colapso del Gateway Principal**: Simula una caída del router central (.1). Esto provoca descarte masivo de tráfico WAN y pérdida de rutas externas.
      * **Latencia Degradada (Spike inyectado)**: Añade retrasos variables de 120ms - 450ms, simulando colas llenas en buffers de switches mal dimensionados o tormentas de broadcast menores.
      * **Pérdida de Paquetes (Interferencias o Faults)**: Genera descartes intermitentes del 5% al 45% en las tramas de enlace por ruido electromagnético o conectores RJ45 oxidados o flojos.
      * **Tráfico de Respuesta Lenta (Saturación LAN)**: Eleva el ping en saltos erráticos y simula consumo masivo de ancho de banda.`,
      steps: [
        'Navega al módulo "Consola de Pruebas".',
        'Busca el panel de "Inyector de Red y Enlace Físico".',
        'Haz clic en "Inyectar" sobre la anomalía deseada.',
        'Observa cómo cambian en tiempo real los contadores de OK/Caídos y cómo la gráfica de latencia reporta picos de ping insostenibles.'
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
