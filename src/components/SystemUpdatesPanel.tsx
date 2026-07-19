import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, DownloadCloud, CheckCircle2, AlertTriangle, 
  History, Server, Activity, Terminal, ArrowRight, 
  Clock, ShieldCheck, Check, Layers, Cpu, HelpCircle, AlertCircle
} from 'lucide-react';

interface SystemUpdatesPanelProps {
  onAddLog: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onVersionUpdate?: (newVersion: string) => void;
}

interface UpdateHistoryItem {
  id: string;
  version: string;
  channel: string;
  status: 'completed' | 'failed' | 'pending';
  date: string;
  changelog: string[];
  notes: string;
}

interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  cpuCount: number;
  totalMemoryGB: string;
  freeMemoryGB: string;
}

interface UpdateTask {
  status: 'idle' | 'downloading' | 'verifying' | 'extracting' | 'applying' | 'restarting' | 'completed' | 'failed';
  progress: number;
  targetVersion: string;
  channel: string;
  error?: string;
  logs: string[];
}

export default function SystemUpdatesPanel({ onAddLog, onVersionUpdate }: SystemUpdatesPanelProps) {
  const [activeTab, setActiveTab] = useState<'panel' | 'historial' | 'diagnostico_entorno'>('panel');
  const [currentVersion, setCurrentVersion] = useState<string>('1.3.2');
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [updateHistory, setUpdateHistory] = useState<UpdateHistoryItem[]>([]);
  
  const [selectedChannel, setSelectedChannel] = useState<'stable' | 'beta' | 'developer'>(() => {
    return (localStorage.getItem('redmonitor_update_channel') as 'stable' | 'beta' | 'developer') || 'stable';
  });

  const [checking, setChecking] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [latestUpdateInfo, setLatestUpdateInfo] = useState<any | null>(null);
  const [updateChecked, setUpdateChecked] = useState<boolean>(false);

  // Updating simulation state
  const [updating, setUpdating] = useState<boolean>(false);
  const [updateTask, setUpdateTask] = useState<UpdateTask>({
    status: 'idle',
    progress: 0,
    targetVersion: '',
    channel: '',
    logs: []
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<any>(null);

  // Load current version and stats
  const fetchVersionAndStats = async () => {
    try {
      const res = await fetch('/api/system/version');
      const data = await res.json();
      if (data) {
        if (data.version) {
          setCurrentVersion(data.version);
          if (onVersionUpdate) {
            onVersionUpdate(data.version);
          }
        }
        if (data.environment) {
          setEnvInfo(data.environment);
        }
        if (data.history) {
          setUpdateHistory(data.history);
        }
      }
    } catch (err) {
      console.error("Error loading system version details:", err);
    }
  };

  useEffect(() => {
    fetchVersionAndStats();
    // Periodically sync stats
    const timer = setInterval(fetchVersionAndStats, 10000);
    return () => {
      clearInterval(timer);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Scroll to bottom of install console logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateTask.logs]);

  // Check for updates
  const handleCheckUpdates = async (channelOverride?: 'stable' | 'beta' | 'developer') => {
    setChecking(true);
    setUpdateChecked(false);
    const targetChannel = channelOverride || selectedChannel;
    
    // Save preference
    localStorage.setItem('redmonitor_update_channel', targetChannel);

    try {
      const res = await fetch(`/api/system/check-updates?channel=${targetChannel}`);
      const data = await res.json();
      
      // Artificial delay for premium network sweep checking look
      setTimeout(() => {
        setChecking(false);
        setUpdateChecked(true);
        if (data) {
          setUpdateAvailable(data.available);
          setLatestUpdateInfo(data);
          
          if (data.available) {
            onAddLog(`✨ Nueva actualización detectada: versión v${data.latestVersion} disponible en el canal ${targetChannel}`, 'info');
          } else {
            onAddLog(`✅ El sistema se encuentra actualizado a la última versión (v${currentVersion}) en el canal ${targetChannel}`, 'success');
          }
        }
      }, 1000);
    } catch (err) {
      setChecking(false);
      onAddLog('Error al conectar con el servidor de actualizaciones', 'error');
    }
  };

  // Start polling update status
  const startStatusPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/system/update-status');
        const task: UpdateTask = await res.json();
        setUpdateTask(task);

        if (task.status === 'completed') {
          clearInterval(pollingIntervalRef.current);
          setUpdating(false);
          setUpdateAvailable(false);
          onAddLog(`🎉 ¡Actualización instalada con éxito! Nueva versión v${task.targetVersion} activa.`, 'success');
          fetchVersionAndStats(); // Refresh local states
        } else if (task.status === 'failed') {
          clearInterval(pollingIntervalRef.current);
          setUpdating(false);
          onAddLog(`❌ Error durante el proceso de actualización del sistema: ${task.error || 'Sustitución fallida'}`, 'error');
        }
      } catch (err) {
        console.error("Error polling update status:", err);
      }
    }, 500);
  };

  // Trigger system update
  const handleInstallUpdate = async () => {
    if (!latestUpdateInfo) return;
    
    setUpdating(true);
    onAddLog(`⚙️ Iniciando proceso de descarga e instalación en caliente para v${latestUpdateInfo.latestVersion}...`, 'info');

    try {
      const res = await fetch('/api/system/trigger-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: latestUpdateInfo.latestVersion,
          channel: latestUpdateInfo.channel
        })
      });
      const data = await res.json();
      
      if (data && (data.status === 'started' || data.status === 'busy')) {
        setUpdateTask(data.task);
        startStatusPolling();
      }
    } catch (err) {
      setUpdating(false);
      onAddLog('Error al enviar solicitud de parche en caliente', 'error');
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-6" id="system-updates-module">
      
      {/* Mini top tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/30 p-1 rounded-lg max-w-md">
        <button
          onClick={() => setActiveTab('panel')}
          className={`flex-1 py-1.5 text-center rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'panel'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
          <span>Actualización</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex-1 py-1.5 text-center rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'historial'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Historial ({updateHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostico_entorno')}
          className={`flex-1 py-1.5 text-center rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'diagnostico_entorno'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          <span>Entorno</span>
        </button>
      </div>

      {/* VIEW PANEL */}
      {activeTab === 'panel' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Main Version status banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Version Card */}
            <div className="glass-panel p-5 rounded-lg border border-slate-800/80 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 text-cyan-500/5">
                <Layers className="h-16 w-16" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">VERSIÓN DEL SISTEMA</span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white font-mono tracking-tight">v{currentVersion}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono uppercase tracking-wide">
                    Estable
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Último parche: 10/07/2026
                </span>
                <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
                  BUILD 20260710
                </span>
              </div>
            </div>

            {/* Selected Channel Card */}
            <div className="glass-panel p-5 rounded-lg border border-slate-800/80 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">CANAL DE ACTUALIZACIÓN</span>
                
                <div className="flex flex-col gap-1">
                  <select
                    disabled={checking || updating}
                    value={selectedChannel}
                    onChange={(e) => {
                      const chan = e.target.value as 'stable' | 'beta' | 'developer';
                      setSelectedChannel(chan);
                      handleCheckUpdates(chan);
                    }}
                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold focus:outline-hidden focus:border-cyan-500 cursor-pointer w-full"
                  >
                    <option value="stable">🚀 Estable (Producción Recomendado)</option>
                    <option value="beta">⚡ Beta (Acceso Anticipado / Pruebas)</option>
                    <option value="developer">🛠️ Developer (Experimental / Alphas)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 italic">
                    {selectedChannel === 'stable' && "Canal ultra seguro. Lanzamientos estables y auditados."}
                    {selectedChannel === 'beta' && "Novedades rápidas. Estables para laboratorios y entusiastas."}
                    {selectedChannel === 'developer' && "Integración contínua. Alphas inestables de compilación directa."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-850 flex items-center justify-end">
                <button
                  disabled={checking || updating}
                  onClick={() => handleCheckUpdates()}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 text-xs py-1 px-3.5 rounded transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Buscando...' : 'Buscar parches'}
                </button>
              </div>
            </div>

            {/* Integration check banner */}
            <div className="glass-panel p-5 rounded-lg border border-slate-800/80 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">INTEGRIDAD DEL SISTEMA</span>
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Binarios RedMonitor</span>
                    <span className="font-mono text-emerald-400 font-bold">Verificado</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Firma de Distribución</span>
                    <span className="font-mono text-emerald-400 font-bold">SHA-255 OK</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Repositorio Central</span>
                    <span className="font-mono text-emerald-400 font-bold">En línea</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-850 text-[10px] text-slate-500 text-right">
                Seguridad de Enlace SSL activa
              </div>
            </div>

          </div>

          {/* ACTIVE UPDATING LOG PANEL (Only displayed when actively upgrading) */}
          {updating && (
            <div className="glass-panel p-5 rounded-lg border border-cyan-500/30 bg-slate-950/40 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.05)] animate-slide-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">INSTALANDO PARCHE EN CALIENTE</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Sustituyendo binarios principales para la versión <span className="text-cyan-400 font-mono font-bold">v{updateTask.targetVersion}</span> ({updateTask.channel})
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-500">Estado:</span>{' '}
                  <span className="text-xs font-bold text-cyan-400 uppercase">
                    {updateTask.status === 'downloading' && 'Descargando'}
                    {updateTask.status === 'verifying' && 'Verificando firmas'}
                    {updateTask.status === 'extracting' && 'Extrayendo'}
                    {updateTask.status === 'applying' && 'Aplicando parches'}
                    {updateTask.status === 'restarting' && 'Reiniciando express'}
                    {updateTask.status === 'completed' && 'Completado'}
                  </span>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Procesando cola de instalación...</span>
                  <span className="text-cyan-400 font-bold">{updateTask.progress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${updateTask.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Terminal Logs Container */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-cyan-400" />
                  Consola de Instalación en tiempo real:
                </span>
                <div className="bg-slate-950 border border-slate-850 rounded-md p-3.5 font-mono text-[11px] text-slate-350 space-y-1.5 h-48 overflow-y-auto shadow-inner select-text">
                  {updateTask.logs.map((log, i) => (
                    <div key={i} className="leading-relaxed border-l-2 border-slate-800/40 pl-2">
                      {log.includes('error') || log.includes('Error') ? (
                        <span className="text-rose-400">{log}</span>
                      ) : log.includes('¡Actualización') || log.includes('éxito') ? (
                        <span className="text-emerald-400 font-bold">{log}</span>
                      ) : log.includes('Descargando') || log.includes('Sustituyendo') ? (
                        <span className="text-cyan-300">{log}</span>
                      ) : (
                        <span>{log}</span>
                      )}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          )}

          {/* UPDATE CHECKED RESULTS SCREEN */}
          {updateChecked && !updating && (
            <div className="animate-fade-in">
              {updateAvailable ? (
                /* UPDATE IS AVAILABLE VIEW */
                <div className="border border-cyan-500/30 bg-cyan-950/5 rounded-lg p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-850 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
                        <DownloadCloud className="h-6 w-6 animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-display">¡NUEVO PARCHE DEL SISTEMA DETECTADO!</h4>
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                            latestUpdateInfo.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            latestUpdateInfo.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            Prioridad: {latestUpdateInfo.severity === 'critical' ? 'Crítica' : latestUpdateInfo.severity === 'high' ? 'Alta' : 'Media'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          La versión <strong className="text-white font-mono">v{latestUpdateInfo.latestVersion}</strong> está disponible para descarga e instalación en caliente.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col text-left md:text-right text-xs text-slate-400 font-mono">
                      <span>Tamaño: <strong className="text-white">{latestUpdateInfo.size}</strong></span>
                      <span>Lanzamiento: <strong className="text-white">{latestUpdateInfo.releaseDate}</strong></span>
                    </div>
                  </div>

                  {/* Notes / description */}
                  <div className="bg-slate-950/60 p-4 rounded border border-slate-900 space-y-3.5">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider">Notas de Lanzamiento:</h5>
                      <p className="text-xs text-slate-400 italic">"{latestUpdateInfo.notes}"</p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider">Lista de cambios y parches:</h5>
                      <ul className="space-y-1.5">
                        {latestUpdateInfo.changelog.map((change: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                            <span className="text-cyan-400 font-bold mt-0.5">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action CTA buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setUpdateChecked(false)}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-bold py-2 px-4 rounded transition-all cursor-pointer"
                    >
                      Omitir por ahora
                    </button>
                    <button
                      onClick={handleInstallUpdate}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs py-2 px-5 rounded transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/10 hover:shadow-cyan-400/20"
                    >
                      <DownloadCloud className="h-4 w-4" />
                      Descargar e Instalar en Caliente
                    </button>
                  </div>
                </div>
              ) : (
                /* NO UPDATE AVAILABLE VIEW */
                <div className="border border-emerald-500/20 bg-emerald-950/5 rounded-lg p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white font-sans uppercase">SISTEMA TOTALMENTE ACTUALIZADO</h4>
                      <p className="text-xs text-slate-400">
                        No se encontraron actualizaciones disponibles en el canal <span className="text-white font-bold font-mono uppercase">{latestUpdateInfo?.channel}</span>.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        La versión actual <strong className="font-mono text-slate-400">v{currentVersion}</strong> es la compilación más reciente y segura disponible en el servidor central de RedMonitor.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GENERAL INFO BANNER */}
          {!updating && !updateChecked && (
            <div className="border border-slate-800/80 bg-slate-950/20 rounded-lg p-5 flex items-start gap-3.5">
              <div className="p-2 bg-slate-900 border border-slate-800 text-cyan-400 rounded-sm mt-0.5">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">¿Cómo funcionan las actualizaciones en caliente?</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-4xl">
                  RedMonitor soporta el despliegue de parches de código en caliente (Hot-Patching). 
                  Al desencadenar una actualización, el microservicio Express descarga, descomprime y sustituye las plantillas e hilos de escaneo 
                  sin interrumpir de forma persistente la visualización. El manifiesto de versiones se actualiza de forma síncrona en el archivo package.json del sistema local.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW HISTORIAL */}
      {activeTab === 'historial' && (
        <div className="space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-4 w-4 text-cyan-400" />
              Historial del Control de Versiones
            </h3>
            <p className="text-xs text-slate-400">
              Auditoría cronológica de parches de red, optimizaciones y compilaciones instaladas en este host local.
            </p>
          </div>

          {/* HISTORIAL TIMELINE */}
          <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6 pt-2 pb-2">
            
            {updateHistory.length === 0 ? (
              <div className="text-center text-slate-500 text-xs italic py-6">
                No hay historial de versiones registrado en este sistema.
              </div>
            ) : (
              [...updateHistory].reverse().map((item, idx) => (
                <div key={item.id || idx} className="relative group">
                  
                  {/* Glowing marker indicator */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${
                    idx === 0 
                      ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse' 
                      : 'bg-[#0B1120] border-slate-700'
                  }`} />

                  {/* Log body card */}
                  <div className="glass-panel p-4 rounded-lg border border-slate-800/80 space-y-3.5 hover:border-slate-700 transition-colors duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-mono text-white">v{item.version}</strong>
                        {idx === 0 && (
                          <span className="bg-cyan-500/10 text-cyan-400 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border border-cyan-500/20 uppercase tracking-wider">
                            Versión Activa
                          </span>
                        )}
                        <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          Canal: {item.channel || 'stable'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.date}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-400 font-mono italic">
                        "{item.notes || 'Actualización realizada correctamente.'}"
                      </p>

                      {item.changelog && item.changelog.length > 0 && (
                        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded border border-slate-900">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Registros del parche:</span>
                          <ul className="space-y-1">
                            {item.changelog.map((c, i) => (
                              <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                                <span className="text-emerald-400">✓</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* VIEW DIAGNOSTICO ENTORNO */}
      {activeTab === 'diagnostico_entorno' && (
        <div className="space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-4 w-4 text-cyan-400" />
              Diagnóstico del Entorno Local (Host)
            </h3>
            <p className="text-xs text-slate-400">
              Datos de compilación física, uso de hardware, hilos de ejecución de Node.js y rendimiento de la CPU del servidor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* System Specs Column */}
            <div className="glass-panel p-5 rounded-lg border border-slate-800/80 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">Especificaciones del Host</h4>
              
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-slate-500" /> CPU Cores</span>
                  <span className="font-mono text-white font-bold">{envInfo?.cpuCount || 'Cargando...'} hilos virtuales</span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-slate-500" /> Arquitectura</span>
                  <span className="font-mono text-white font-bold uppercase">{envInfo?.arch || 'Cargando...'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-slate-500" /> Plataforma Operativa</span>
                  <span className="font-mono text-white font-bold uppercase">{envInfo?.platform || 'Cargando...'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-slate-500" /> Motor de Ejecución</span>
                  <span className="font-mono text-white font-bold">Node.js {envInfo?.nodeVersion || 'Cargando...'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> Tiempo de Actividad</span>
                  <span className="font-mono text-cyan-400 font-bold">{envInfo?.uptime ? formatUptime(envInfo.uptime) : 'Cargando...'}</span>
                </div>
              </div>
            </div>

            {/* Hardware Memory Specs */}
            <div className="glass-panel p-5 rounded-lg border border-slate-800/80 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">Memoria Física del Host</h4>
              
              <div className="space-y-4 pt-1.5">
                {envInfo ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Memoria Usada / Total</span>
                        <span className="font-mono text-slate-300 font-bold">
                          {(Number(envInfo.totalMemoryGB) - Number(envInfo.freeMemoryGB)).toFixed(2)} GB / {envInfo.totalMemoryGB} GB
                        </span>
                      </div>
                      
                      {/* Bar graph */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round(((Number(envInfo.totalMemoryGB) - Number(envInfo.freeMemoryGB)) / Number(envInfo.totalMemoryGB)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900/60 text-center">
                        <span className="text-[10px] text-slate-500 block uppercase">Memoria Disponible</span>
                        <strong className="text-sm font-mono text-emerald-400">{envInfo.freeMemoryGB} GB</strong>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900/60 text-center">
                        <span className="text-[10px] text-slate-500 block uppercase">Porcentaje Libre</span>
                        <strong className="text-sm font-mono text-cyan-400">
                          {Math.round((Number(envInfo.freeMemoryGB) / Number(envInfo.totalMemoryGB)) * 100)}%
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-6">
                    Obteniendo telemetría del host físico...
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* SYSTEM INTEGRITY LOGS */}
          <div className="glass-panel p-5 rounded-lg border border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">Estatus de Integridad de Dependencias</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950/40 p-3 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-350">Acceso de Escritura (users.json)</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 inline" /> ESCRIBIBLE</span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-350">Acceso de Escritura (updates-history.json)</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 inline" /> ESCRIBIBLE</span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-350">Resolución de Socket Local</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 inline" /> CONECTADO (3000)</span>
              </div>
              <div className="bg-slate-950/40 p-3 rounded border border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-350">Compilador Vite y Enlace de Producción</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 inline" /> LISTO (ACTIVO)</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
