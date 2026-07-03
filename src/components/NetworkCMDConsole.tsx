import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, Play, Trash2, ArrowRight, CornerDownLeft, Info, HelpCircle, 
  Settings, ShieldAlert, Wifi, Globe, Server, ListCollapse, Command
} from 'lucide-react';
import { Device } from '../types';

interface NetworkCMDConsoleProps {
  devices: Device[];
  subnetSegment: string;
}

interface CommandPreset {
  cmd: string;
  description: string;
  category: 'básicos' | 'diagnóstico' | 'avanzados';
  explanation: string;
}

export default function NetworkCMDConsole({ devices, subnetSegment }: NetworkCMDConsoleProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [inputVal, setInputVal] = useState<string>('');
  const [terminalLines, setTerminalLines] = useState<Array<{ text: string; type: 'input' | 'output' | 'error' | 'success' | 'info' }>>([
    { text: 'Microsoft Windows [Versión 10.0.22631.3527]', type: 'info' },
    { text: '(c) Microsoft Corporation. Todos los derechos reservados.', type: 'info' },
    { text: '', type: 'info' },
    { text: 'RedMonitor LAN CLI Terminal • Inicializado con éxito.', type: 'success' },
    { text: `Rango de subred activo detectado: ${subnetSegment}.0/24`, type: 'info' },
    { text: 'Escribe "help" o haz clic en un comando preestablecido para comenzar el diagnóstico físico.', type: 'info' },
    { text: '', type: 'info' }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandPresets: CommandPreset[] = [
    { 
      cmd: `ping ${subnetSegment}.1`, 
      description: 'Prueba la conectividad y latencia hacia el Gateway de la red.', 
      category: 'diagnóstico',
      explanation: 'Envía un pulso ICMP Echo Request al Router Principal (.1) para comprobar si responde y medir el tiempo de respuesta en milisegundos.'
    },
    { 
      cmd: 'ipconfig /all', 
      description: 'Muestra la configuración de red completa del terminal local.', 
      category: 'básicos',
      explanation: 'Muestra la IP asignada localmente, máscara de subred, puerta de enlace predeterminada, servidor DNS y la dirección física MAC del host local.'
    },
    { 
      cmd: 'arp -a', 
      description: 'Lista la caché de la tabla de resolución de direcciones IP a MAC.', 
      category: 'básicos',
      explanation: 'Muestra el mapa dinámico de direcciones IP de todos los equipos con los que el terminal local ha tenido contacto y sus respectivas direcciones MAC físicas.'
    },
    { 
      cmd: `nmap -sP ${subnetSegment}.0/24`, 
      description: 'Escanea toda la subred local buscando hosts activos.', 
      category: 'diagnóstico',
      explanation: 'Realiza un barrido de pings masivo sobre las 254 direcciones IPv4 de la red para detectar qué dispositivos están en línea, reportando su estado y latencia.'
    },
    { 
      cmd: 'netstat -an', 
      description: 'Muestra conexiones TCP/UDP activas y puertos en escucha.', 
      category: 'diagnóstico',
      explanation: 'Lista todos los sockets de comunicación locales activos, mostrando puertos de origen, destino, direcciones IP externas y el estado de la sesión.'
    },
    { 
      cmd: 'tracert google.com', 
      description: 'Traza la ruta de saltos de red hacia un servidor externo.', 
      category: 'diagnóstico',
      explanation: 'Envía paquetes con TTL incremental para listar cada Router o Gateway intermedio por el que pasa la señal hasta salir de la LAN y alcanzar el destino global.'
    },
    { 
      cmd: 'nslookup google.com', 
      description: 'Consulta servidores DNS para resolver nombres de dominio.', 
      category: 'básicos',
      explanation: 'Interroga al DNS asignado para verificar si la resolución de nombres funciona y obtener la dirección IP externa de un dominio web.'
    },
    { 
      cmd: 'route print', 
      description: 'Imprime la tabla de enrutamiento IP local.', 
      category: 'avanzados',
      explanation: 'Muestra los caminos de salida de red configurados en el host, indicando qué interfaz utilizar para llegar a cada segmento de red destino.'
    }
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const handleCommandSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCmd = inputVal.trim();
    if (!cleanCmd) return;

    // Add input to logs
    setTerminalLines(prev => [...prev, { text: `C:\\Users\\RedMonitor>${cleanCmd}`, type: 'input' }]);
    
    // Add to history
    setHistory(prev => [cleanCmd, ...prev.filter(c => c !== cleanCmd)].slice(0, 50));
    setHistoryIndex(-1);
    setInputVal('');

    // Process command
    setTimeout(() => {
      processCommand(cleanCmd);
    }, 100);
  };

  const selectCommand = (cmd: string) => {
    setInputVal(cmd);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const processCommand = (cmdText: string) => {
    const parts = cmdText.split(' ').filter(p => p.length > 0);
    const baseCmd = parts[0].toLowerCase();
    const arg1 = parts[1] ? parts[1] : '';
    const arg2 = parts[2] ? parts[2] : '';

    let outputs: Array<{ text: string; type: 'output' | 'error' | 'success' | 'info' }> = [];

    // Local details helper
    const localIP = `${subnetSegment}.55`;
    const localMAC = 'A4:1F:72:C8:E9:10';
    const activeHosts = devices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia');

    switch (baseCmd) {
      case 'cls':
      case 'clear':
        setTerminalLines([]);
        return;

      case 'help':
        outputs = [
          { text: '--- COMANDOS DE RED SOPORTADOS POR LA CONSOLA ---', type: 'info' },
          { text: '  ipconfig [/all]     - Muestra configuración IP del host de monitoreo local.', type: 'output' },
          { text: '  ping <IP/Host>      - Prueba conectividad y latencia de un host específico.', type: 'output' },
          { text: '  arp -a              - Lista la tabla ARP de resolución IP-MAC activa.', type: 'output' },
          { text: '  nmap -sP <Subred>   - Escanea el rango para listar hosts activos con pings.', type: 'output' },
          { text: '  tracert <IP/Host>   - Traza la ruta de saltos de red al destino.', type: 'output' },
          { text: '  nslookup <Host>     - Consulta servidores DNS para resolver un nombre.', type: 'output' },
          { text: '  netstat -an         - Muestra sockets, puertos en escucha y conexiones TCP/UDP.', type: 'output' },
          { text: '  route print         - Muestra la tabla de enrutamiento IP local.', type: 'output' },
          { text: '  cls / clear         - Limpia todo el contenido de la pantalla.', type: 'output' },
          { text: '  help                - Muestra esta pantalla de ayuda.', type: 'output' },
          { text: '------------------------------------------------', type: 'info' },
          { text: 'Tip: Puedes hacer clic en cualquiera de los comandos sugeridos en el panel lateral.', type: 'success' }
        ];
        break;

      case 'ipconfig':
        const showAll = arg1.toLowerCase() === '/all';
        outputs = [
          { text: '', type: 'output' },
          { text: 'Configuración IP de Windows', type: 'info' },
          { text: '', type: 'output' },
          { text: 'Adaptador de Ethernet Local Connection:', type: 'info' },
          { text: '   Sufijo DNS específico de la conexión. . : lan.local', type: 'output' },
        ];

        if (showAll) {
          outputs.push(
            { text: `   Descripción . . . . . . . . . . . . . . : Intel(R) Ethernet Controller I225-V`, type: 'output' },
            { text: `   Dirección física (MAC) . . . . . . . . . : ${localMAC}`, type: 'output' },
            { text: `   DHCP habilitado . . . . . . . . . . . . : Sí`, type: 'output' },
            { text: `   Configuración automática habilitada . . : Sí`, type: 'output' }
          );
        }

        outputs.push(
          { text: `   Dirección IPv4. . . . . . . . . . . . . : ${localIP}(Principal)`, type: 'success' },
          { text: '   Máscara de subred . . . . . . . . . . . : 255.255.255.0', type: 'output' },
          { text: `   Puerta de enlace predeterminada . . . . : ${subnetSegment}.1`, type: 'success' }
        );

        if (showAll) {
          outputs.push(
            { text: `   Servidor DHCP . . . . . . . . . . . . . : ${subnetSegment}.1`, type: 'output' },
            { text: '   Servidores DNS. . . . . . . . . . . . . : 1.1.1.1', type: 'output' },
            { text: '                                             8.8.8.8', type: 'output' },
            { text: '   NetBIOS sobre TCP/IP. . . . . . . . . . : Habilitado', type: 'output' }
          );
        }
        break;

      case 'ifconfig':
        outputs = [
          { text: 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', type: 'info' },
          { text: `        inet ${localIP}  netmask 255.255.255.0  broadcast ${subnetSegment}.255`, type: 'success' },
          { text: `        ether ${localMAC.toLowerCase()}  txqueuelen 1000  (Ethernet)`, type: 'output' },
          { text: '        RX packets 45102  bytes 68904532 (68.9 MB)', type: 'output' },
          { text: '        RX errors 0  dropped 0  overruns 0  frame 0', type: 'output' },
          { text: '        TX packets 32912  bytes 48102391 (48.1 MB)', type: 'output' },
          { text: '        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0', type: 'output' },
          { text: '', type: 'output' },
          { text: 'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', type: 'info' },
          { text: '        inet 127.0.0.1  netmask 255.0.0.0', type: 'output' },
          { text: '        loop  txqueuelen 1000  (Local Loopback)', type: 'output' }
        ];
        break;

      case 'ping':
        if (!arg1) {
          outputs = [
            { text: 'Uso: ping <dirección_IP o nombre_de_host>', type: 'error' },
            { text: 'Ejemplo: ping 192.168.1.1', type: 'info' }
          ];
          break;
        }

        const target = arg1.trim();
        // Check if target matches any simulated device or external
        let deviceFound = devices.find(d => d.ip === target || d.host.toLowerCase() === target.toLowerCase());

        // Standard host mockings
        const isExternal = target.includes('.') && !target.startsWith(subnetSegment);
        const isLocalhost = target === '127.0.0.1' || target.toLowerCase() === 'localhost';

        outputs.push({ text: `Haciendo ping a ${target} con 32 bytes de datos:`, type: 'info' });

        if (isLocalhost) {
          outputs.push(
            { text: 'Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128', type: 'success' },
            { text: 'Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128', type: 'success' },
            { text: 'Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128', type: 'success' },
            { text: 'Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128', type: 'success' },
            { text: '', type: 'output' },
            { text: 'Estadísticas de ping para 127.0.0.1:', type: 'info' },
            { text: '    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% de pérdida),', type: 'output' },
            { text: 'Tiempos aproximados de ida y vuelta en milisegundos:', type: 'info' },
            { text: '    Mínimo = 0ms, Máximo = 0ms, Media = 0ms', type: 'success' }
          );
        } else if (isExternal) {
          const lat = Math.floor(12 + Math.random() * 15);
          outputs.push(
            { text: `Respuesta desde 8.8.8.8: bytes=32 tiempo=${lat}ms TTL=54`, type: 'success' },
            { text: `Respuesta desde 8.8.8.8: bytes=32 tiempo=${lat + 2}ms TTL=54`, type: 'success' },
            { text: `Respuesta desde 8.8.8.8: bytes=32 tiempo=${lat - 1}ms TTL=54`, type: 'success' },
            { text: `Respuesta desde 8.8.8.8: bytes=32 tiempo=${lat + 1}ms TTL=54`, type: 'success' },
            { text: '', type: 'output' },
            { text: `Estadísticas de ping para ${target}:`, type: 'info' },
            { text: '    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% de pérdida),', type: 'output' },
            { text: 'Tiempos aproximados de ida y vuelta en milisegundos:', type: 'info' },
            { text: `    Mínimo = ${lat - 1}ms, Máximo = ${lat + 2}ms, Media = ${lat}ms`, type: 'success' }
          );
        } else if (deviceFound) {
          if (deviceFound.estado === 'Caído' || deviceFound.ping === null) {
            outputs.push(
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: '', type: 'output' },
              { text: `Estadísticas de ping para ${deviceFound.ip} (${deviceFound.host}):`, type: 'info' },
              { text: '    Paquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% de pérdida),', type: 'error' }
            );
          } else {
            const p = deviceFound.ping;
            outputs.push(
              { text: `Respuesta desde ${deviceFound.ip}: bytes=32 tiempo=${p}ms TTL=64`, type: 'success' },
              { text: `Respuesta desde ${deviceFound.ip}: bytes=32 tiempo=${Math.max(1, p + Math.floor(Math.random() * 4 - 2))}ms TTL=64`, type: 'success' },
              { text: `Respuesta desde ${deviceFound.ip}: bytes=32 tiempo=${Math.max(1, p + Math.floor(Math.random() * 4 - 2))}ms TTL=64`, type: 'success' },
              { text: `Respuesta desde ${deviceFound.ip}: bytes=32 tiempo=${Math.max(1, p + Math.floor(Math.random() * 4 - 2))}ms TTL=64`, type: 'success' },
              { text: '', type: 'output' },
              { text: `Estadísticas de ping para ${deviceFound.ip}:`, type: 'info' },
              { text: '    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% de pérdida),', type: 'output' },
              { text: 'Tiempos aproximados de ida y vuelta en milisegundos:', type: 'info' },
              { text: `    Mínimo = ${Math.max(1, p - 2)}ms, Máximo = ${p + 2}ms, Media = ${p}ms`, type: 'success' }
            );
          }
        } else {
          // If IP format is correct but not in network
          if (/^192\.168\.\d+\.\d+$/.test(target)) {
            outputs.push(
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: 'Host de destino inaccesible.', type: 'error' },
              { text: 'Tiempo de espera agotado para esta solicitud.', type: 'error' },
              { text: '', type: 'output' },
              { text: `Estadísticas de ping para ${target}:`, type: 'info' },
              { text: '    Paquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% de pérdida),', type: 'error' }
            );
          } else {
            outputs.push(
              { text: `La solicitud de ping no pudo encontrar el host ${target}.`, type: 'error' },
              { text: 'Compruebe el nombre y vuelva a intentarlo.', type: 'error' }
            );
          }
        }
        break;

      case 'arp':
        if (arg1 !== '-a') {
          outputs = [
            { text: 'Sintaxis incorrecta. Use "arp -a" para listar la caché de la subred.', type: 'error' }
          ];
          break;
        }

        outputs = [
          { text: '', type: 'output' },
          { text: `Interfaz: ${localIP} --- 0x10`, type: 'info' },
          { text: '  Dirección de Internet  Dirección física      Tipo', type: 'info' },
        ];

        // Fill with active hosts
        activeHosts.forEach(host => {
          if (host.ip !== localIP) {
            const paddingIP = host.ip.padEnd(23, ' ');
            const paddingMAC = host.mac.toLowerCase().padEnd(20, ' ');
            outputs.push({
              text: `  ${paddingIP}${paddingMAC}dinámico`,
              type: 'success'
            });
          }
        });

        // Add broad/multicast standards
        outputs.push(
          { text: `  ${subnetSegment}.255`.padEnd(25, ' ') + 'ff-ff-ff-ff-ff-ff    estático', type: 'output' },
          { text: '  224.0.0.22             01-00-5e-00-00-16    estático', type: 'output' },
          { text: '  239.255.255.250        01-00-5e-7f-ff-fa    estático', type: 'output' }
        );
        break;

      case 'nmap':
        if (!arg1 || (!arg2 && arg1 !== '-sP')) {
          outputs = [
            { text: 'Uso correcto: nmap -sP <rango_de_red>', type: 'error' },
            { text: `Ejemplo: nmap -sP ${subnetSegment}.0/24`, type: 'info' }
          ];
          break;
        }

        const scanSubnet = arg2 || arg1;
        outputs = [
          { text: `Starting Nmap 7.92 ( https://nmap.org ) at ${new Date().toLocaleString()}`, type: 'info' },
          { text: `Nmap scan report for network segment (${scanSubnet}):`, type: 'info' },
          { text: '', type: 'output' }
        ];

        let countFound = 0;
        devices.forEach(d => {
          if (d.estado !== 'Caído' && d.estado !== 'No_Escaneado') {
            countFound++;
            const lat = d.ping || 1;
            outputs.push({
              text: `Nmap scan report for ${d.host} (${d.ip})`,
              type: 'success'
            });
            outputs.push({
              text: `Host is up (0.0${lat}s latency). MAC Address: ${d.mac} (${d.vendor || 'Dispositivo Genérico'})`,
              type: 'output'
            });
            outputs.push({ text: '', type: 'output' });
          }
        });

        outputs.push({
          text: `Nmap done: 256 IP addresses (254 hosts) scanned. ${countFound} hosts up.`,
          type: 'success'
        });
        break;

      case 'tracert':
      case 'traceroute':
        if (!arg1) {
          outputs = [
            { text: 'Uso: tracert <IP_destino_o_Dominio>', type: 'error' },
            { text: 'Ejemplo: tracert google.com', type: 'info' }
          ];
          break;
        }

        const dest = arg1;
        const gatewayIP = `${subnetSegment}.1`;
        outputs = [
          { text: '', type: 'output' },
          { text: `Traza a la dirección ${dest} sobre un máximo de 30 saltos:`, type: 'info' },
          { text: '', type: 'output' },
          { text: `  1    <1 ms    <1 ms    <1 ms  [Puerta de Enlace] [${gatewayIP}]`, type: 'success' }
        ];

        if (dest.includes('google') || dest === '8.8.8.8') {
          outputs.push(
            { text: '  2     8 ms     7 ms     7 ms  10.0.0.1 [Carrier Router]', type: 'output' },
            { text: '  3    11 ms    10 ms    10 ms  190.150.1.25 [CO Edge IP]', type: 'output' },
            { text: '  4    14 ms    13 ms    13 ms  142.250.230.12 [Google Edge POP]', type: 'output' },
            { text: `  5    14 ms    13 ms    14 ms  google.com [142.250.191.46]`, type: 'success' },
            { text: '', type: 'output' },
            { text: 'Traza completa.', type: 'info' }
          );
        } else {
          // If it is in LAN
          const lanDevice = devices.find(d => d.ip === dest || d.host.toLowerCase() === dest.toLowerCase());
          if (lanDevice) {
            if (lanDevice.estado === 'Caído') {
              outputs.push(
                { text: '  2     *        *        *     Tiempo de espera agotado.', type: 'error' },
                { text: '  3     *        *        *     Tiempo de espera agotado.', type: 'error' }
              );
            } else {
              outputs.push(
                { text: `  2     1 ms     1 ms     1 ms  ${lanDevice.host} [${lanDevice.ip}]`, type: 'success' },
                { text: '', type: 'output' },
                { text: 'Traza completa.', type: 'info' }
              );
            }
          } else {
            outputs.push(
              { text: '  2    12 ms    13 ms    11 ms  10.0.0.1', type: 'output' },
              { text: '  3     *        *        *     Tiempo de espera agotado.', type: 'error' },
              { text: '  4     *        *        *     Tiempo de espera agotado.', type: 'error' }
            );
          }
        }
        break;

      case 'nslookup':
        if (!arg1) {
          outputs = [
            { text: 'Uso: nslookup <nombre_de_dominio>', type: 'error' },
            { text: 'Ejemplo: nslookup google.com', type: 'info' }
          ];
          break;
        }

        const domain = arg1.toLowerCase();
        outputs = [
          { text: `Servidor:  Unlnown`, type: 'output' },
          { text: `Address:   ${subnetSegment}.1`, type: 'output' },
          { text: '', type: 'output' },
          { text: `Respuesta no autoritativa para ${domain}:`, type: 'info' }
        ];

        if (domain.includes('google')) {
          outputs.push(
            { text: 'Nombre:    google.com', type: 'success' },
            { text: 'Addresses: 142.250.191.46', type: 'success' },
            { text: '          2607:f8b0:4005:805::200e', type: 'output' }
          );
        } else if (domain.includes('facebook')) {
          outputs.push(
            { text: 'Nombre:    facebook.com', type: 'success' },
            { text: 'Addresses: 157.240.22.35', type: 'success' }
          );
        } else {
          outputs.push(
            { text: `Nombre:    ${domain}`, type: 'success' },
            { text: `Address:   198.51.100.${Math.floor(1 + Math.random() * 250)}`, type: 'success' }
          );
        }
        break;

      case 'netstat':
        outputs = [
          { text: '', type: 'output' },
          { text: 'Conexiones activas', type: 'info' },
          { text: '', type: 'output' },
          { text: '  Proto  Dirección local        Dirección externa      Estado', type: 'info' },
          { text: `  TCP    ${localIP}:135`.padEnd(25, ' ') + `0.0.0.0:0`.padEnd(23, ' ') + 'LISTENING', type: 'output' },
          { text: `  TCP    ${localIP}:445`.padEnd(25, ' ') + `0.0.0.0:0`.padEnd(23, ' ') + 'LISTENING', type: 'output' },
          { text: `  TCP    ${localIP}:49664`.padEnd(25, ' ') + `${subnetSegment}.1:443`.padEnd(23, ' ') + 'ESTABLISHED', type: 'success' },
          { text: `  TCP    ${localIP}:51023`.padEnd(25, ' ') + `142.250.191.46:443`.padEnd(23, ' ') + 'ESTABLISHED', type: 'success' },
          { text: `  TCP    ${localIP}:51025`.padEnd(25, ' ') + `1.1.1.1:53`.padEnd(23, ' ') + 'TIME_WAIT', type: 'output' },
          { text: `  UDP    ${localIP}:5353`.padEnd(25, ' ') + `*:*`.padEnd(23, ' ') + '', type: 'output' }
        ];
        break;

      case 'route':
        if (arg1 !== 'print') {
          outputs = [
            { text: 'Sintaxis no admitida en esta emulación. Use: "route print"', type: 'error' }
          ];
          break;
        }

      case 'route_print_fallback': // fallback to combine with above case
        outputs = [
          { text: '===========================================================================', type: 'info' },
          { text: 'Lista de interfaces:', type: 'info' },
          { text: ` 10...00 1a 4b d3 f8 c9 ......Intel(R) Ethernet Controller I225-V`, type: 'output' },
          { text: '===========================================================================', type: 'info' },
          { text: 'Rutas activas (IPv4):', type: 'info' },
          { text: '  Destino de red       Máscara          Puerta enlace      Interfaz    Métrica', type: 'info' },
          { text: `          0.0.0.0          0.0.0.0      ${subnetSegment}.1      ${localIP}     25`, type: 'success' },
          { text: `        127.0.0.0        255.0.0.0        En enlace         127.0.0.1    331`, type: 'output' },
          { text: `      ${subnetSegment}.0    255.255.255.0        En enlace         ${localIP}    281`, type: 'success' },
          { text: `    ${localIP}  255.255.255.255        En enlace         ${localIP}    281`, type: 'success' },
          { text: '        224.0.0.0        240.0.0.0        En enlace         127.0.0.1    331', type: 'output' },
          { text: '  255.255.255.255  255.255.255.255        En enlace         127.0.0.1    331', type: 'output' },
          { text: '===========================================================================', type: 'info' }
        ];
        break;

      default:
        outputs = [
          { text: `"${baseCmd}" no se reconoce como un comando interno o externo,`, type: 'error' },
          { text: 'programa o archivo por lotes ejecutable.', type: 'error' },
          { text: 'Escribe "help" para ver la lista de comandos físicos integrados.', type: 'info' }
        ];
        break;
    }

    setTerminalLines(prev => [...prev, ...outputs, { text: '', type: 'output' }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputVal(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputVal(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden grid grid-cols-1 lg:grid-cols-12" id="cmd-console-area">
      {/* SIDEBAR: SELECTABLE COMMAND PRESETS */}
      <div className="lg:col-span-4 bg-slate-950 p-4 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
            <Command className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-300 font-display uppercase tracking-wider">
              Comandos de Red LAN
            </h3>
          </div>

          <p className="text-[10px] text-slate-500 font-sans leading-tight mb-4">
            Selecciona un comando para cargarlo en la consola. Esto te permite testear diagnósticos físicos e inspeccionar la respuesta de los hosts en vivo.
          </p>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {/* Category: Básicos */}
            <div>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">
                Básicos de Configuración
              </span>
              <div className="space-y-1">
                {commandPresets.filter(p => p.category === 'básicos').map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectCommand(p.cmd)}
                    className="w-full text-left p-2 rounded-xs bg-slate-900/60 border border-slate-800/40 hover:border-cyan-500/30 hover:bg-slate-900 transition-all flex flex-col gap-0.5 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-xs text-cyan-400 group-hover:text-cyan-300 transition-colors font-bold">
                        {p.cmd}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-600 group-hover:text-cyan-400 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-sans leading-tight">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category: Diagnóstico */}
            <div className="pt-2">
              <span className="text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-widest block mb-1">
                Diagnóstico de Capa 3
              </span>
              <div className="space-y-1">
                {commandPresets.filter(p => p.category === 'diagnóstico').map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectCommand(p.cmd)}
                    className="w-full text-left p-2 rounded-xs bg-slate-900/60 border border-slate-800/40 hover:border-emerald-500/30 hover:bg-slate-900 transition-all flex flex-col gap-0.5 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors font-bold">
                        {p.cmd}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-600 group-hover:text-emerald-400 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-sans leading-tight">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category: Avanzados */}
            <div className="pt-2">
              <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block mb-1">
                Avanzados / Enrutamiento
              </span>
              <div className="space-y-1">
                {commandPresets.filter(p => p.category === 'avanzados').map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectCommand(p.cmd)}
                    className="w-full text-left p-2 rounded-xs bg-slate-900/60 border border-slate-800/40 hover:border-amber-500/30 hover:bg-slate-900 transition-all flex flex-col gap-0.5 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-xs text-amber-400 group-hover:text-amber-300 transition-colors font-bold">
                        {p.cmd}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-600 group-hover:text-amber-400 transform group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-sans leading-tight">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM EXPLANATORY CARD */}
        <div className="bg-[#0b1329] p-3 rounded-xs border border-cyan-950/40 mt-4 text-[10px] space-y-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[9px]">
            <Info className="h-3 w-3" />
            Explicador Técnico en Vivo
          </div>
          {(() => {
            const activeMatch = commandPresets.find(p => p.cmd === inputVal || inputVal.startsWith(p.cmd.split(' ')[0]));
            if (activeMatch) {
              return (
                <div className="text-slate-400 font-sans leading-relaxed">
                  <span className="text-slate-200 font-semibold">{activeMatch.cmd}:</span> {activeMatch.explanation}
                </div>
              );
            }
            return (
              <p className="text-slate-500 font-sans leading-relaxed">
                Escribe un comando o haz clic en uno de la lista superior para visualizar la teoría y su impacto real en la resolución de problemas de capa física y de red.
              </p>
            );
          })()}
        </div>
      </div>

      {/* TERMINAL EMULATOR */}
      <div className="lg:col-span-8 bg-[#02050b] p-5 flex flex-col justify-between min-h-[460px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-slate-400">CMD.EXE (Símbolo del Sistema)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setTerminalLines([])}
              title="Llimpiar consola"
              className="p-1 hover:bg-slate-900 rounded-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-1 pl-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
            </div>
          </div>
        </div>

        {/* Lines display */}
        <div className="flex-1 font-mono text-xs text-slate-300 overflow-y-auto space-y-1.5 pr-2 max-h-[350px]">
          {terminalLines.map((line, idx) => (
            <div 
              key={idx} 
              className={`leading-relaxed whitespace-pre-wrap ${
                line.type === 'input' ? 'text-white font-semibold' :
                line.type === 'error' ? 'text-red-400' :
                line.type === 'success' ? 'text-emerald-400' :
                line.type === 'info' ? 'text-cyan-400' :
                'text-slate-300'
              }`}
            >
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Interactive input line */}
        <form onSubmit={handleCommandSubmit} className="mt-4 pt-3 border-t border-slate-900 flex items-center gap-2 font-mono text-xs">
          <span className="text-emerald-400 font-bold shrink-0">C:\Users\RedMonitor&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder-slate-700 caret-cyan-400 text-xs py-1"
            placeholder="Escribe un comando... (e.g. ping 192.168.1.1)"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            type="submit"
            className="p-1 px-2.5 rounded-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-[10px]"
          >
            <span>Run</span>
            <CornerDownLeft className="h-3 w-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
