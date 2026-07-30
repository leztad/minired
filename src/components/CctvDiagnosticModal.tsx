import React, { useState } from 'react';
import { 
  Video, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Settings, 
  HelpCircle, 
  Info,
  Radio,
  Search
} from 'lucide-react';

interface CctvDiagnosticModalProps {
  onClose: () => void;
  currentSubnet: string;
  onInjectCctvSubnet: (subnet: string, brandName: string) => void;
  onEnableMultiScan: () => void;
  onOpenPortScanner: (dvrIp: string) => void;
}

export const CctvDiagnosticModal: React.FC<CctvDiagnosticModalProps> = ({
  onClose,
  currentSubnet,
  onInjectCctvSubnet,
  onEnableMultiScan,
  onOpenPortScanner,
}) => {
  const [activeTab, setActiveTab] = useState<'causes' | 'actions' | 'dvr_guide'>('causes');
  const [customDvrIp, setCustomDvrIp] = useState<string>('192.168.1.100');
  const [selectedBrand, setSelectedBrand] = useState<'hikvision' | 'dahua' | 'uniview' | 'generic'>('hikvision');

  const presetSubnets = [
    {
      brand: 'Hikvision / HiLook / Safire',
      subnet: '192.168.254.0/24',
      dvrDefaultIp: '192.168.1.64',
      desc: 'Subred interna predeterminada de los puertos PoE traseros de NVR/DVR Hikvision.',
      ports: '554 (RTSP), 8000 (SDK), 80 (HTTP)',
      color: 'border-red-500/40 text-red-400 bg-red-950/20'
    },
    {
      brand: 'Dahua / Lorex / Saxxon',
      subnet: '10.1.1.0/24',
      dvrDefaultIp: '192.168.1.108',
      desc: 'Rango privado asignado por la interfaz interna de grabadores Dahua.',
      ports: '554 (RTSP), 37777 (TCP Data), 80 (HTTP)',
      color: 'border-amber-500/40 text-amber-400 bg-amber-950/20'
    },
    {
      brand: 'Uniview / Provision-ISR',
      subnet: '172.16.254.0/24',
      dvrDefaultIp: '192.168.1.30',
      desc: 'Segmento aislado usado para cámaras IP aisladas por switches dedicados.',
      ports: '554 (RTSP), 8080 (ONVIF), 80 (HTTP)',
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20'
    },
    {
      brand: 'Segmento Paralelo (Red 192.168.0.x / 192.168.100.x)',
      subnet: '192.168.0.0/24',
      dvrDefaultIp: '192.168.0.100',
      desc: 'Cámaras configuradas con IP estáticas de fábrica antes de enrolar en la red.',
      ports: '80 (HTTP), 554 (RTSP), 8080 (ONVIF)',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl relative font-sans overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Video className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Diagnóstico y Sondeo de Cámaras CCTV / DVR
                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                  Subredes Aisladas PoE
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Solución para dispositivos en línea desde el DVR que no responden al barrido LAN estándar.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('causes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'causes' 
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            1. ¿Por qué no aparecen?
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'actions' 
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Zap className="w-4 h-4" />
            2. Solución en RedMonitor (1-Clic)
          </button>

          <button
            onClick={() => setActiveTab('dvr_guide')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'dvr_guide' 
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Settings className="w-4 h-4" />
            3. Configurar Virtual Host en DVR
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: CAUSES EXPLANATION */}
          {activeTab === 'causes' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 block mb-1">Causa Principal: Subred Interna del Switch PoE del Grabador</strong>
                  Cuando conectas cámaras IP directamente a los puertos traseros PoE de un NVR/DVR, el grabador crea una <strong>subred privada interna aislada</strong> (por ejemplo <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">192.168.254.X</code> o <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">10.1.1.X</code>). Las cámaras hablan únicamente con el DVR y no reciben IP de tu router principal (<code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">192.168.1.X</code>).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Layers className="w-4 h-4" />
                    1. Subred PoE Aislada (NVR / DVR)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    El DVR actúa como router/switch privado. Las cámaras no son enrutadas a la LAN física externa por defecto. Un escáner en <code className="text-cyan-300">192.168.1.0/24</code> no las detectará.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    2. Bloqueo de ICMP / PING
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Muchas cámaras IP deshabilitan las respuestas PING por seguridad o ahorro de energía. Solo responden a peticiones de flujo RTSP en el puerto <code className="text-emerald-300">554</code> o <code className="text-emerald-300">8000</code>.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <ExternalLink className="w-4 h-4" />
                    3. "Virtual Host" Desactivado
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    En grabadores Hikvision/Dahua, la opción "Virtual Host" mapea los puertos de las cámaras hacia la IP principal del DVR. Si está deshabilitado, la LAN no tiene acceso visible a ellas.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Server className="w-4 h-4" />
                    4. Segmentos IP Diferentes
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Si las cámaras tienen asignada una IP fija de fábrica (ej: <code className="text-blue-300">192.168.0.123</code> o <code className="text-blue-300">192.168.100.10</code>), requieren que añadas ese segmento a RedMonitor.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveTab('actions')}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  Ir a las Soluciones en RedMonitor
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ONE-CLICK ACTIONS IN REDMONITOR */}
          {activeTab === 'actions' && (
            <div className="space-y-5">
              <div className="text-xs text-slate-300 leading-relaxed">
                Selecciona la marca o estructura de tu grabador para inyectar su subred de cámaras aisladas o habilitar el escaneo multi-red en RedMonitor:
              </div>

              {/* PRESET SUBNETS LIST */}
              <div className="space-y-3">
                {presetSubnets.map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${item.color} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-slate-600`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">{item.brand}</span>
                        <span className="bg-slate-950 text-cyan-300 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-800">
                          {item.subnet}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                      <div className="text-[10px] text-slate-500 font-mono">Puertos de video: {item.ports}</div>
                    </div>

                    <button
                      onClick={() => {
                        onInjectCctvSubnet(item.subnet, item.brand);
                        onClose();
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-xs px-3.5 py-2 rounded border border-cyan-500/40 hover:border-cyan-400 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      Inyectar & Escanear
                    </button>
                  </div>
                ))}
              </div>

              {/* MULTI-RED SCANNER & PORT SCANNER QUICK LAUNCH */}
              <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  Acciones Rápidas de Diagnóstico
                </h4>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onEnableMultiScan();
                      onClose();
                    }}
                    className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-xs px-4 py-2 rounded border border-cyan-500/40 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Activar Escaneo Multi-Red (Barrer todas las subredes simultáneamente)
                  </button>

                  <button
                    onClick={() => {
                      onOpenPortScanner(customDvrIp);
                      onClose();
                    }}
                    className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold text-xs px-4 py-2 rounded border border-emerald-500/40 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-emerald-400" />
                    Sondear Puertos de Video (RTSP 554, HTTP 80, ONVIF)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DVR PHYSICAL CONFIGURATION GUIDE */}
          {activeTab === 'dvr_guide' && (
            <div className="space-y-5">
              <div className="text-xs text-slate-300 leading-relaxed">
                Para que las cámaras de la subred PoE del DVR respondan en la red LAN principal, activa la función <strong>Virtual Host (Host Virtual)</strong> o <strong>Canal IP Pass-Through</strong> en la consola web de tu DVR:
              </div>

              {/* BRAND SELECTION */}
              <div className="flex gap-2 border-b border-slate-800 pb-3">
                {[
                  { id: 'hikvision', label: 'Hikvision / HiLook' },
                  { id: 'dahua', label: 'Dahua / Saxxon' },
                  { id: 'uniview', label: 'Uniview / Provision' },
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(b.id as any)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedBrand === b.id 
                        ? 'bg-cyan-500 text-slate-950' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* HIKVISION GUIDE */}
              {selectedBrand === 'hikvision' && (
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <h4 className="font-bold text-red-400 text-sm flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Hikvision / HiLook / Safire: Activar Virtual Host
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Abre el navegador web e ingresa la IP local de tu DVR (ej: <code className="text-cyan-300 font-mono">192.168.1.64</code>).</li>
                    <li>Inicia sesión como administrador y ve a <strong>Configuración (Configuration)</strong>.</li>
                    <li>Navega a <strong>Red (Network)</strong> &rarr; <strong>Configuración Avanzada (Advanced Settings)</strong> &rarr; Pestaña <strong>Otros (Other)</strong>.</li>
                    <li>Marca la casilla <strong>Activar Virtual Host (Enable Virtual Host)</strong> y presiona <strong>Guardar</strong>.</li>
                    <li>Ve a <strong>Gestión de Cámaras (Camera Management)</strong>: Verás que aparece un hipervínculo azul en cada cámara con su puerto mapeado (ej: <code className="text-emerald-300 font-mono">http://192.168.1.64:65001</code>).</li>
                  </ol>
                </div>
              )}

              {/* DAHUA GUIDE */}
              {selectedBrand === 'dahua' && (
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Dahua / Lorex / Saxxon: Activar Canal IP Pass-Through
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Acepta la consola del DVR Dahua ingresando a su IP (ej: <code className="text-cyan-300 font-mono">192.168.1.108</code>).</li>
                    <li>Ve a <strong>Configuración del Sistema</strong> &rarr; <strong>Cámara / Canal IP</strong>.</li>
                    <li>En la tabla de canales PoE, haz clic en el botón <strong>Enlace Web / Pass-Through</strong> en la columna de acción.</li>
                    <li>Habilita el protocolo <strong>ARP Broadcast & ONVIF Discovery</strong> para que las cámaras respondan a sondas LAN.</li>
                  </ol>
                </div>
              )}

              {/* UNIVIEW GUIDE */}
              {selectedBrand === 'uniview' && (
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Uniview / Provision-ISR: Mapeo de Puertos
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Ingresa a la interfaz web del NVR Uniview.</li>
                    <li>Ve a <strong>Setup</strong> &rarr; <strong>Camera</strong> &rarr; <strong>Camera List</strong>.</li>
                    <li>Activa la columna <strong>Direct Access / Web Link</strong> para habilitar acceso directo desde la subred principal.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-cyan-400" />
            RedMonitor admite escaneo simultáneo de múltiples VLANs y subredes PoE.
          </span>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-1.5 rounded transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
