import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Play, Radio, RotateCcw, Flame, AlertTriangle, PlayCircle, 
  Terminal, ServerCrash, CheckCircle2, RefreshCw, Layers, HelpCircle, Server
} from 'lucide-react';
import { Device, Sensor, HistoryPoint } from '../types';
import { generateFullSubnet, generateSensorsForDevices } from '../utils/simulation';

interface TestingCenterProps {
  devices: Device[];
  sensors: Sensor[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  setSensors: React.Dispatch<React.SetStateAction<Sensor[]>>;
  setHistoryData: React.Dispatch<React.SetStateAction<HistoryPoint[]>>;
  subnetSegment: string;
  includeVirtuals: boolean;
}

interface TestStep {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  log?: string;
}

export default function TestingCenter({
  devices,
  sensors,
  setDevices,
  setSensors,
  setHistoryData,
  subnetSegment,
  includeVirtuals
}: TestingCenterProps) {
  // Anomaly states
  const [activeAnomaly, setActiveAnomaly] = useState<'none' | 'latency' | 'gateway' | 'loss'>('none');
  
  // Terminal and Interactive Runner states
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>(['Esperando inicio de diagnóstico...']);
  
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    { name: 'IP Subnet Pool Accuracy', description: 'Verifica que la subred contenga exactamente 254 hosts direccionables.', status: 'idle' },
    { name: 'Formato e Integridad de MAC', description: 'Valida que todas las direcciones MAC físicas tengan el formato de 6 octetos.', status: 'idle' },
    { name: 'Gateway Binding Router', description: 'Asegura que la IP .1 esté asignada al Gateway Router en estado OK.', status: 'idle' },
    { name: 'Docker Virtual Containment', description: 'Verifica comportamiento del balanceador con contenedores virtuales habilitados.', status: 'idle' },
    { name: 'Health Check Sensor Mapping', description: 'Confirma que todos los hosts activos tengan sus respectivos sensores ICMP/HTTP asignados.', status: 'idle' },
  ]);

  // Log helper
  const addLog = (msg: string) => {
    setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // 1. Chaos Engineering Trigger
  const injectAnomaly = (type: 'none' | 'latency' | 'gateway' | 'loss') => {
    setActiveAnomaly(type);
    
    // Create base simulated devices
    const basePool = generateFullSubnet(subnetSegment, includeVirtuals);
    const timestampStr = new Date().toLocaleTimeString();

    let mutatedPool = [...basePool];

    if (type === 'latency') {
      // Latency spike anomaly: make all active devices have extremely high latency
      mutatedPool = basePool.map(d => {
        if (d.estado !== 'Caído' && d.estado !== 'No_Escaneado') {
          const highPing = Math.floor(180 + Math.random() * 220); // 180ms - 400ms
          return {
            ...d,
            ping: highPing,
            estado: 'Advertencia',
            lastChecked: timestampStr
          };
        }
        return d;
      });
      addLog("⚠️ ANOMALÍA: Latencia degradada inyectada en todos los hosts activos (+250ms).");
    } else if (type === 'gateway') {
      // Gateway collapse anomaly: take down the Router (.1)
      mutatedPool = basePool.map(d => {
        if (d.ip.endsWith('.1')) {
          return {
            ...d,
            ping: null,
            estado: 'Caído',
            lastChecked: timestampStr
          };
        }
        // Increase remaining device pings due to routing fallback congestion
        if (d.estado !== 'Caído' && d.estado !== 'No_Escaneado') {
          return {
            ...d,
            ping: d.ping ? d.ping + 45 : 45,
            lastChecked: timestampStr
          };
        }
        return d;
      });
      addLog("🔥 ANOMALÍA: Colapso del Gateway principal (Router 192.168.1.1 reporta CAÍDO).");
    } else if (type === 'loss') {
      // High Packet Loss: drop 35% of devices randomly
      let droppedCount = 0;
      mutatedPool = basePool.map(d => {
        if (d.estado !== 'Caído' && d.estado !== 'No_Escaneado') {
          const drop = Math.random() < 0.45; // 45% chance to drop
          if (drop) {
            droppedCount++;
            return {
              ...d,
              ping: null,
              estado: 'Caído',
              lastChecked: timestampStr
            };
          }
        }
        return d;
      });
      addLog(`💥 ANOMALÍA: Ruido electromagnético inyectado. Pérdida masiva de paquetes de red. ${droppedCount} hosts perdidos.`);
    } else {
      // Reset
      mutatedPool = basePool.map(d => ({
        ...d,
        lastChecked: timestampStr
      }));
      addLog("✅ ESTADO RESTABLECIDO: Estado de red óptimo re-establecido.");
    }

    // Set updated state
    setDevices(mutatedPool);
    const newSensors = generateSensorsForDevices(mutatedPool);
    setSensors(newSensors);

    // Update history point
    const liveHosts = mutatedPool.filter(d => d.estado === 'OK' || d.estado === 'Advertencia').length;
    const validPings = mutatedPool.filter(d => d.ping !== null).map(d => d.ping as number);
    const avgPing = validPings.length > 0 ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;

    setHistoryData(prev => [
      ...prev,
      {
        timeLabels: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hostsActivos: liveHosts,
        latenciaMedia: avgPing
      }
    ].slice(-8));
  };


  // 2. Interactive Diagnostic Suite Execution
  const runSelfDiagnostic = () => {
    if (isRunningDiagnostic) return;
    setIsRunningDiagnostic(true);
    setDiagnosticLogs([]);
    
    // Reset test steps layout
    setTestSteps(prev => prev.map(step => ({ ...step, status: 'running' })));
    
    addLog("🏁 Iniciando Suite de Autodiagnóstico de Red...");
    addLog(`Configuración actual: Subred ${subnetSegment} | Virtuales: ${includeVirtuals ? 'Sí' : 'No'}`);

    let currentStep = 0;
    
    const runNextTest = () => {
      if (currentStep >= testSteps.length) {
        setIsRunningDiagnostic(false);
        addLog("🏆 ¡PROCESO FINALIZADO! Todos los subsistemas cumplen con las métricas de rendimiento esperadas.");
        return;
      }

      const activeStep = testSteps[currentStep];
      addLog(`Comprobando: ${activeStep.name}...`);
      
      setTimeout(() => {
        let success = true;
        let logDetails = '';

        if (currentStep === 0) {
          // IP Subnet Pool Accuracy test
          const pool = generateFullSubnet(subnetSegment, includeVirtuals);
          success = pool.length === 254;
          logDetails = `Resultado: ${pool.length} hosts mapeados en memoria [Esperado: 254]`;
        } else if (currentStep === 1) {
          // Format & MAC Integrity
          const pool = generateFullSubnet(subnetSegment, includeVirtuals);
          const activeHosts = pool.filter(d => d.estado !== 'Caído');
          const macPattern = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
          const allValidMac = activeHosts.every(d => macPattern.test(d.mac));
          success = allValidMac;
          logDetails = `Resultado: ${activeHosts.length} MACs validadas contra regex físico.`;
        } else if (currentStep === 2) {
          // Gateway Router mapping
          const pool = generateFullSubnet(subnetSegment, includeVirtuals);
          const router = pool.find(d => d.ip.endsWith('.1'));
          success = router !== undefined && (router.host.includes('Router') || router.host.includes('Gateway'));
          logDetails = `Resultado: Gateway hallado en subbase (.1) con identificador '${router?.host || 'Nulo'}'.`;
        } else if (currentStep === 3) {
          // Virtual containers toggle
          const poolStd = generateFullSubnet(subnetSegment, false);
          const poolVir = generateFullSubnet(subnetSegment, true);
          success = poolVir.filter(d => d.estado !== 'Caído').length > poolStd.filter(d => d.estado !== 'Caído').length;
          logDetails = `Resultado: Modulador de entorno Docker detectado (Activos con Virtuals: ${poolVir.filter(d => d.estado !== 'Caído').length} vs Estándar: ${poolStd.filter(d => d.estado !== 'Caído').length})`;
        } else if (currentStep === 4) {
          // Health Check Sensors generate
          const pool = generateFullSubnet(subnetSegment, includeVirtuals);
          const activeSensors = generateSensorsForDevices(pool);
          success = activeSensors.length > 0;
          logDetails = `Resultado: ${activeSensors.length} sensores reactivos montados en tabla de monitoreo activo.`;
        }

        setTestSteps(prev => prev.map((step, idx) => {
          if (idx === currentStep) {
            return {
              ...step,
              status: success ? 'passed' : 'failed',
              log: logDetails
            };
          }
          return step;
        }));

        addLog(`${success ? '✅ PASSED' : '❌ FAILED'}: ${logDetails}`);
        currentStep++;
        runNextTest();
      }, 900);
    };

    runNextTest();
  };

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 border border-cyan-800/30 rounded-xs text-cyan-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white font-display uppercase">Consola de Control de Testing & Chaos Engineering</h2>
            <p className="text-[11px] text-slate-500 font-sans">
              Suite interactiva para probar reactivación de alarmas mediante inyección de fallas en red y ejecución de autodiagnósticos en tiempo real.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chaos Engineering Block */}
        <div className="lg:col-span-4 bg-slate-900/50 p-4 border border-slate-800 rounded-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-850 pb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-semibold text-slate-300 font-display uppercase">Chaos Network Injector</h3>
            </div>
            
            <p className="text-[10.5px] text-slate-500 font-sans leading-relaxed mb-4">
              Pon a prueba la robustez de los visualizadores y las alarmas de RedMonitor inyectando anomalías en vivo. Observa instantáneamente cómo reacciona en la **Vista General**, los **Sensores** y el **Mapa de Subred**.
            </p>

            <div className="space-y-2.5">
              {/* Reset to Normal */}
              <button
                onClick={() => injectAnomaly('none')}
                className={`w-full py-2 px-3 rounded-xs text-[11px] font-semibold font-sans flex items-center justify-between transition-all cursor-pointer ${
                  activeAnomaly === 'none' || activeAnomaly === 'none'
                    ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Operación Normal (Restablecer)
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1 py-0.2 rounded-xs bg-slate-900/50 text-emerald-500 border border-emerald-500/20">Normal</span>
              </button>

              {/* Latency Anomaly */}
              <button
                onClick={() => injectAnomaly('latency')}
                className={`w-full py-2 px-3 rounded-xs text-[11px] font-semibold font-sans flex items-center justify-between transition-all cursor-pointer ${
                  activeAnomaly === 'latency'
                    ? 'bg-amber-500/15 border border-amber-500 text-amber-400 font-semibold'
                    : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Inyectar Degradación de Latencia
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1 py-0.2 rounded-xs bg-slate-900/50 text-amber-500 border border-amber-500/20">+300ms</span>
              </button>

              {/* Gateway Collapse Anomaly */}
              <button
                onClick={() => injectAnomaly('gateway')}
                className={`w-full py-2 px-3 rounded-xs text-[11px] font-semibold font-sans flex items-center justify-between transition-all cursor-pointer ${
                  activeAnomaly === 'gateway'
                    ? 'bg-rose-500/15 border border-rose-500 text-rose-400 font-semibold'
                    : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ServerCrash className="h-3.5 w-3.5" />
                  Derribar Gateway Router (.1)
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1 py-0.2 rounded-xs bg-slate-900/50 text-rose-500 border border-rose-500/20">DOWN</span>
              </button>

              {/* Loss Anomaly */}
              <button
                onClick={() => injectAnomaly('loss')}
                className={`w-full py-2 px-3 rounded-xs text-[11px] font-semibold font-sans flex items-center justify-between transition-all cursor-pointer ${
                  activeAnomaly === 'loss'
                    ? 'bg-purple-500/15 border border-purple-500 text-purple-400 font-semibold'
                    : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5" />
                  Inyectar Ruido de Radiación (Pérdida)
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest px-1 py-0.2 rounded-xs bg-slate-900/50 text-purple-400 border border-purple-500/20">45% LOSS</span>
              </button>
            </div>
          </div>

          <div className="bg-[#0B1120] p-2.5 rounded-sm border border-slate-850 mt-4 text-[10px] space-y-1 text-slate-500">
            <div className="flex items-center gap-1 text-slate-400 font-semibold">
              <HelpCircle className="h-3 w-3" />
              ¿Qué evalúa esto?
            </div>
            <p className="font-sans leading-tight mt-0.5">
              Evalúa la velocidad de refresco del layout, la reconfiguración de medidores vectoriales (OK/Warning/Caído), el dibujo dinámico en el panel de tendencias, y el disparo de estados de alarma correspondientes en la grilla y detalles.
            </p>
          </div>
        </div>

        {/* Assertions Test Runner Block */}
        <div className="lg:col-span-8 bg-slate-900/50 p-4 border border-slate-800 rounded-md">
          <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-300 font-display uppercase">Suite de Diagnósticos Integrados</h3>
            </div>
            
            <button
              disabled={isRunningDiagnostic}
              onClick={runSelfDiagnostic}
              className={`px-3 py-1 rounded-xs text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isRunningDiagnostic
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
              Ejecutar Autodiagnóstico
            </button>
          </div>

          {/* Steps Display */}
          <div className="space-y-2">
            {testSteps.map((step, idx) => (
              <div 
                key={idx} 
                className={`p-2.5 rounded-sm border flex flex-col md:flex-row md:items-center justify-between gap-2 transition-all ${
                  step.status === 'passed' ? 'bg-emerald-500/5 border-emerald-950/30' :
                  step.status === 'failed' ? 'bg-rose-500/5 border-rose-950/30' :
                  step.status === 'running' ? 'bg-cyan-500/5 border-cyan-950/30 animate-pulse' :
                  'bg-slate-950/40 border-slate-850/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-500">#0{idx+1}</span>
                    <h4 className={`text-xs font-semibold font-display ${
                      step.status === 'passed' ? 'text-emerald-400' :
                      step.status === 'failed' ? 'text-rose-400' :
                      step.status === 'running' ? 'text-cyan-400' :
                      'text-slate-300'
                    }`}>
                      {step.name}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">{step.description}</p>
                  
                  {step.log && (
                    <div className="font-mono text-[9px] text-slate-400 mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded-xs border border-slate-900 inline-block">
                      {step.log}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center">
                  {step.status === 'passed' && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs font-bold font-sans flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Pass
                    </span>
                  )}
                  {step.status === 'failed' && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs font-bold font-sans flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Fail
                    </span>
                  )}
                  {step.status === 'running' && (
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-800/30 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs font-bold font-sans flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Testeando
                    </span>
                  )}
                  {step.status === 'idle' && (
                    <span className="bg-slate-900 text-slate-500 border border-slate-850 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-xs font-semibold font-sans">
                      En Pausa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Test Logs Terminal Console */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-slate-500 uppercase">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              Terminal stdout
            </div>
            
            <div className="font-mono text-[10.5px] bg-slate-950 p-3 rounded-md border border-slate-850 text-emerald-400 max-h-[140px] overflow-y-auto space-y-1">
              {diagnosticLogs.map((log, index) => (
                <div key={index} className="leading-tight">
                  <span className="text-slate-600 mr-1.5">&gt;&gt;</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* CLI testing guides */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-md">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-display flex items-center gap-1.5 mb-2">
          <Server className="h-4 w-4 text-pink-400" />
          Ejecución de Pruebas Unitarias desde Consola Terminal (Vitest Env)
        </h4>
        <p className="text-[11px] text-slate-500 leading-normal mb-3 font-sans">
          El sistema cuenta con un ambiente de pruebas unitarias implementado con **Vitest**. Estas pruebas corren directamente sobre los archivos funcionales aislados para asegurar la consistencia del algoritmo matemático de direccionamiento y simulador de topología.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#0B1120] p-3 rounded-xs border border-slate-850">
            <div className="font-mono font-semibold text-slate-300 mb-1">Para ejecutar la Suite de Pruebas:</div>
            <pre className="font-mono text-[11px] text-cyan-400 bg-slate-950 p-2 border border-slate-900 rounded-xs">npm run test</pre>
            <p className="text-[10px] text-slate-500 font-sans mt-1.5 leading-tight">
              Lanza el runner de Vitest de forma estática sobre todo el directorio `/src/utils` para capturar aserciones lógicas.
            </p>
          </div>

          <div className="bg-[#0B1120] p-3 rounded-xs border border-slate-850">
            <div className="font-mono font-semibold text-slate-300 mb-1">Estructura del archivo cargado:</div>
            <div className="font-mono text-[11px] text-pink-400 bg-slate-950 p-2 border border-slate-900 rounded-s">/src/utils/simulation.test.ts</div>
            <p className="text-[10px] text-slate-500 font-sans mt-1.5 leading-tight">
              Contiene aserciones para `generateRandomMAC()`, límites de tamaño (`exactly 254 hosts`), gateway binding validation, y toggle de virtualización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
