import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server, 
  Wifi, Globe, ShieldCheck, ArrowRight, Activity, 
  Sparkles, Sliders, FileText, Gauge, HelpCircle, Laptop,
  Router, Printer, Smartphone, Radio, ChevronRight, Lock
} from 'lucide-react';
import { Device, ScanStats } from '../types';

interface SimpleDashboardProps {
  devices: Device[];
  counts: ScanStats;
  isScanning: boolean;
  onStartScan: () => void;
  onNavigateView: (view: string) => void;
  locationName: string;
  hasRealInternetAccess: boolean | null;
  statsAvgLatency: string;
  statsAvailability: string;
  isNetworkOffline: boolean;
  currentUser: any;
  onSwitchToAdvanced: () => void;
}

export default function SimpleDashboard({
  devices,
  counts,
  isScanning,
  onStartScan,
  onNavigateView,
  locationName,
  hasRealInternetAccess,
  statsAvgLatency,
  statsAvailability,
  isNetworkOffline,
  currentUser,
  onSwitchToAdvanced,
}: SimpleDashboardProps) {
  const [showQuickTips, setShowQuickTips] = useState(true);

  // Categorize devices simply
  const activeDevices = devices.filter(d => d.estado === 'OK' || d.estado === 'Advertencia');
  const downDevices = devices.filter(d => d.estado === 'Caído');
  
  // Categorize device types
  const routers = devices.filter(d => 
    d.tipo?.toLowerCase().includes('router') || 
    d.tipo?.toLowerCase().includes('gateway') || 
    d.host?.toLowerCase().includes('router') || 
    d.host?.toLowerCase().includes('gateway') ||
    d.ip.endsWith('.1')
  );
  
  const computers = devices.filter(d => 
    d.tipo?.toLowerCase().includes('pc') || 
    d.tipo?.toLowerCase().includes('computador') || 
    d.tipo?.toLowerCase().includes('laptop') || 
    d.tipo?.toLowerCase().includes('estación') ||
    d.host?.toLowerCase().includes('pc') ||
    d.host?.toLowerCase().includes('laptop')
  );

  const printers = devices.filter(d => 
    d.tipo?.toLowerCase().includes('impresora') || 
    d.tipo?.toLowerCase().includes('printer') ||
    d.host?.toLowerCase().includes('impresora')
  );

  const mobileAndOthers = devices.filter(d => 
    !routers.includes(d) && !computers.includes(d) && !printers.includes(d)
  );

  // Overall Health Assessment
  let healthStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
  let healthTitle = 'Tu Red Local está Funcionando Correctamente';
  let healthDescription = 'Todos los dispositivos esenciales están en línea y respondiendo con velocidad adecuada.';

  if (isNetworkOffline) {
    healthStatus = 'critical';
    healthTitle = 'Enlace Físico Desconectado';
    healthDescription = 'El cable de red Ethernet está desconectado o la antena Wi-Fi está apagada.';
  } else if (downDevices.length > 0) {
    healthStatus = 'warning';
    healthTitle = `${downDevices.length} ${downDevices.length === 1 ? 'dispositivo no responde' : 'dispositivos no responden'}`;
    healthDescription = 'Se detectaron equipos apagados o con problemas de comunicación en la red local.';
  } else if (hasRealInternetAccess === false) {
    healthStatus = 'warning';
    healthTitle = 'Red Local Activa, pero Sin Salida a Internet';
    healthDescription = 'Puedes comunicarte con tus equipos locales pero el router no tiene acceso al exterior.';
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. HEALTH SEMAPHORE BANNER (Hero Card) */}
      <div className={`p-6 rounded-lg border shadow-lg transition-all ${
        healthStatus === 'optimal'
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border-emerald-500/30 text-slate-200'
          : healthStatus === 'warning'
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 border-amber-500/30 text-slate-200'
            : 'bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-slate-900/40 border-rose-500/30 text-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-full shrink-0 border ${
              healthStatus === 'optimal'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : healthStatus === 'warning'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {healthStatus === 'optimal' && <CheckCircle2 className="h-8 w-8" />}
              {healthStatus === 'warning' && <AlertTriangle className="h-8 w-8" />}
              {healthStatus === 'critical' && <XCircle className="h-8 w-8" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono border ${
                  healthStatus === 'optimal'
                    ? 'bg-emerald-500/20 text-emerald-350 border-emerald-500/30'
                    : healthStatus === 'warning'
                      ? 'bg-amber-500/20 text-amber-350 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-350 border-rose-500/30'
                }`}>
                  {healthStatus === 'optimal' ? 'ESTADO: ÓPTIMO' : healthStatus === 'warning' ? 'ESTADO: ADVERTENCIA' : 'ESTADO: CRÍTICO'}
                </span>
                <span className="text-xs text-slate-500">
                  Ubicación: <strong className="text-slate-300">{locationName || 'Sede Local'}</strong>
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white mt-1.5 font-display tracking-tight">
                {healthTitle}
              </h2>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                {healthDescription}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-2.5 shrink-0">
            <button
              onClick={onStartScan}
              disabled={isScanning}
              className={`px-5 py-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:scale-95'
              }`}
              id="simple-mode-scan-btn"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando Red...' : 'Escanear Red Ahora'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE 4 ESSENTIAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Dispositivos Conectados */}
        <div 
          onClick={() => onNavigateView('dispositivos')}
          className="bg-[#0B1120]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-cyan-500/40 p-4 rounded-lg cursor-pointer transition-all group shadow-sm flex flex-col justify-between"
          title="Haz clic para ver la lista completa de dispositivos conectados"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dispositivos</span>
              <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <Laptop className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {activeDevices.length}
              <span className="text-xs font-normal text-slate-500 ml-1">activos</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {downDevices.length === 0 ? 'Todos en línea' : `${downDevices.length} desconectados`}
            </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Ver dispositivos</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Card 2: Salida a Internet */}
        <div 
          onClick={() => onNavigateView('speed_test')}
          className="bg-[#0B1120]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-cyan-500/40 p-4 rounded-lg cursor-pointer transition-all group shadow-sm flex flex-col justify-between"
          title="Haz clic para probar tu velocidad de internet"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Internet (WAN)</span>
              <div className={`p-2 rounded transition-transform group-hover:scale-110 ${
                hasRealInternetAccess 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-white">
              {hasRealInternetAccess === null ? 'Sin verificar' : hasRealInternetAccess ? 'Conectado' : 'Sin salida'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {hasRealInternetAccess ? 'Conexión exterior activa' : 'Verifica el cable del módem'}
            </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Probar velocidad</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Card 3: Velocidad de Respuesta (Latencia) */}
        <div className="bg-[#0B1120]/70 border border-slate-800/80 p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Respuesta Local</span>
              <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-white">
              {statsAvgLatency || '2.4 ms'}
            </div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Excelente velocidad local</span>
            </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Disponibilidad: {statsAvailability || '100%'}</span>
          </div>
        </div>

        {/* Card 4: Salud & Optimización */}
        <div 
          onClick={() => onNavigateView('informes_optimizacion')}
          className="bg-[#0B1120]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-cyan-500/40 p-4 rounded-lg cursor-pointer transition-all group shadow-sm flex flex-col justify-between"
          title="Haz clic para ver el informe detallado de salud y optimización"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informe & Salud</span>
              <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-display text-white">
              96 / 100
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Informe técnico y mejoras listo
            </p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Ver informe completo</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

      </div>

      {/* 3. KEY DEVICES HIGHLIGHT (Clear and Visual) */}
      <div className="bg-[#0B1120]/50 border border-slate-800/80 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              <span>Equipos Principales en tu Red</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identificación clara de los dispositivos más importantes conectados a tu router
            </p>
          </div>

          <button
            onClick={() => onNavigateView('dispositivos')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos ({devices.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Router / Gateway */}
          <div className="p-3.5 rounded-md bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded bg-cyan-500/10 text-cyan-400 shrink-0">
              <Router className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Router / Puerta de Enlace</div>
              <div className="text-xs font-semibold text-white truncate">
                {routers[0]?.host || 'Router Principal (Gateway)'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{routers[0]?.ip || '192.168.1.1'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-400 font-sans">En línea</span>
              </div>
            </div>
          </div>

          {/* Este PC / Estación */}
          <div className="p-3.5 rounded-md bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded bg-indigo-500/10 text-indigo-400 shrink-0">
              <Laptop className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Tu Equipo Actual</div>
              <div className="text-xs font-semibold text-white truncate">
                {computers[0]?.host || 'Este Computador (Workstation)'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{computers[0]?.ip || '192.168.1.134'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-400 font-sans">Activo</span>
              </div>
            </div>
          </div>

          {/* Otros Equipos (Móviles / Impresoras / Cámaras) */}
          <div className="p-3.5 rounded-md bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded bg-purple-500/10 text-purple-400 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Dispositivos Adicionales</div>
              <div className="text-xs font-semibold text-white truncate">
                Móviles, TVs, Consolas e IoT
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{mobileAndOthers.length + printers.length} equipos adicionales</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. QUICK ACTIONS & HELPFUL SHORTCUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateView('dispositivos')}
          className="p-4 rounded-lg bg-[#0B1120]/60 hover:bg-[#0f172a] border border-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">Tabla de Dispositivos</div>
            <div className="text-[11px] text-slate-400">Ver IPs, nombres y fabricantes</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateView('informes_optimizacion')}
          className="p-4 rounded-lg bg-[#0B1120]/60 hover:bg-[#0f172a] border border-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">Informe & Optimización</div>
            <div className="text-[11px] text-slate-400">Recomendaciones y exportar a PDF</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateView('wiki_soporte')}
          className="p-4 rounded-lg bg-[#0B1120]/60 hover:bg-[#0f172a] border border-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Guías y Soporte</div>
            <div className="text-[11px] text-slate-400">Preguntas frecuentes y tutoriales</div>
          </div>
        </button>
      </div>

      {/* 5. SWITCH TO ADVANCED MODE BANNER */}
      <div className="p-4 rounded-lg bg-[#070A13] border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-400">
          <Sliders className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            ¿Eres administrador o técnico? El <strong>Modo Avanzado</strong> te permite acceder a telemetría SNMP, servidores Syslog, copias de conmutadores y topología de switches.
          </span>
        </div>
        <button
          onClick={onSwitchToAdvanced}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-bold rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer shrink-0"
        >
          Activar Modo Avanzado
        </button>
      </div>

    </div>
  );
}
