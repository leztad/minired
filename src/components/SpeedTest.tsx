import React, { useState, useEffect, useRef } from 'react';
import { 
  Gauge, RefreshCw, HardDriveDownload, HardDriveUpload,
  Clock, Server, Globe, Sparkles, Play, ChevronRight, CheckCircle2, Copy
} from 'lucide-react';

interface SpeedTestRecord {
  id: string;
  timestamp: string;
  provider: string;
  server: string;
  ping: number;
  jitter: number;
  download: number;
  upload: number;
}

interface SpeedTestProps {
  onAddLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export default function SpeedTest({ onAddLog }: SpeedTestProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testStage, setTestStage] = useState<'idle' | 'concting' | 'ping' | 'download' | 'upload' | 'completed'>('idle');
  const [progress, setProgress] = useState(0); // 0 to 100
  
  // Real-time animated values
  const [ping, setPing] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  
  // Custom configs
  const [selectedProvider, setSelectedProvider] = useState('Sonda de Red Unificada (ISP Local)');
  const [selectedServer, setSelectedServer] = useState('Buenos Aires - Telecom Argentina');
  const [recentTests, setRecentTests] = useState<SpeedTestRecord[]>(() => {
    try {
      const saved = localStorage.getItem('redmonitor_speedtests');
      return saved ? JSON.parse(saved) : [
        {
          id: 'test-1',
          timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString('es-ES'),
          provider: 'Sonda de Red Unificada (ISP Local)',
          server: 'Buenos Aires - Telecom Argentina',
          ping: 11,
          jitter: 2,
          download: 524.3,
          upload: 240.5
        },
        {
          id: 'test-2',
          timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString('es-ES'),
          provider: 'Sonda de Red Unificada (ISP Local)',
          server: 'Buenos Aires - Telecom Argentina',
          ping: 15,
          jitter: 4,
          download: 498.1,
          upload: 215.8
        }
      ];
    } catch {
      return [];
    }
  });

  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);
  
  // Gauge variables
  const [gaugeValue, setGaugeValue] = useState(0); // value represented in the gauge index (0 to 1000 Mbps scale)

  const requestRef = useRef<any>(null);
  const stageTimeoutRef = useRef<any>(null);

  // Persistence callback
  useEffect(() => {
    localStorage.setItem('redmonitor_speedtests', JSON.stringify(recentTests));
  }, [recentTests]);

  // Handle speed test lifecycle
  const runSpeedTest = () => {
    if (isRunning) return;
    setIsRunning(true);
    setTestStage('concting');
    setProgress(0);
    setPing(0);
    setJitter(0);
    setDownload(0);
    setUpload(0);
    setGaugeValue(0);

    onAddLog(`⚡ Test de Velocidad iniciado usando el servidor '${selectedServer}'...`, 'info');

    // Stage 1: Connecting (2 seconds)
    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += 2;
      setProgress(Math.min(currentProg, 100));
      if (currentProg >= 100) {
        clearInterval(interval);
        startPingStage();
      }
    }, 40);
  };

  const startPingStage = () => {
    setTestStage('ping');
    setProgress(0);
    
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      // Fluctuate Ping & Jitter
      const tempPing = Math.round(5 + Math.random() * 8);
      const tempJitter = Math.round(1 + Math.random() * 3);
      setPing(tempPing);
      setJitter(tempJitter);
      setGaugeValue(tempPing * 10); // temporary visual bounce
      setProgress(Math.min(step * 5, 100));

      if (step >= 20) {
        clearInterval(interval);
        const finalPing = Math.round(8 + Math.random() * 6);
        const finalJitter = Math.round(2 + Math.random() * 2);
        setPing(finalPing);
        setJitter(finalJitter);
        startDownloadStage(finalPing, finalJitter);
      }
    }, 100);
  };

  const startDownloadStage = (finalPing: number, finalJitter: number) => {
    setTestStage('download');
    setProgress(0);
    
    // Choose a high performance target, e.g. around 500-900 Mbps
    const maxDownload = 450 + Math.random() * 480; 
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      const currentProgressRatio = step / 40; // 4 seconds total
      setProgress(Math.min(Math.round(currentProgressRatio * 100), 100));

      // Ease-in speed climbing
      let tempSpeed = 0;
      if (step < 10) {
        tempSpeed = maxDownload * (step / 10) * 0.7;
      } else {
        tempSpeed = maxDownload * (0.9 + Math.random() * 0.15);
      }
      
      const fixedSpeed = parseFloat(tempSpeed.toFixed(1));
      setDownload(fixedSpeed);
      setGaugeValue(fixedSpeed);

      if (step >= 40) {
        clearInterval(interval);
        const finalDownload = parseFloat(maxDownload.toFixed(1));
        setDownload(finalDownload);
        startUploadStage(finalPing, finalJitter, finalDownload);
      }
    }, 100);
  };

  const startUploadStage = (finalPing: number, finalJitter: number, finalDownload: number) => {
    setTestStage('upload');
    setProgress(0);
    setGaugeValue(0);

    // Upload speeds typically asymmetric, e.g. 200 - 400 Mbps
    const maxUpload = 180 + Math.random() * 160;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      const currentProgressRatio = step / 40; // 4 seconds total
      setProgress(Math.min(Math.round(currentProgressRatio * 100), 100));

      // Ease-in upload speed
      let tempSpeed = 0;
      if (step < 10) {
        tempSpeed = maxUpload * (step / 10) * 0.7;
      } else {
        tempSpeed = maxUpload * (0.91 + Math.random() * 0.12);
      }

      const fixedSpeed = parseFloat(tempSpeed.toFixed(1));
      setUpload(fixedSpeed);
      setGaugeValue(fixedSpeed);

      if (step >= 40) {
        clearInterval(interval);
        const finalUpload = parseFloat(maxUpload.toFixed(1));
        setUpload(finalUpload);
        finishSpeedTest(finalPing, finalJitter, finalDownload, finalUpload);
      }
    }, 100);
  };

  const finishSpeedTest = (finalPing: number, finalJitter: number, finalDownload: number, finalUpload: number) => {
    setTestStage('completed');
    setIsRunning(false);
    setGaugeValue(0);

    const newRecord: SpeedTestRecord = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-ES'),
      provider: selectedProvider,
      server: selectedServer,
      ping: finalPing,
      jitter: finalJitter,
      download: finalDownload,
      upload: finalUpload
    };

    setRecentTests(prev => [newRecord, ...prev]);

    onAddLog(`🚀 Prueba de velocidad en servidor local exitosa: Bajada: ${finalDownload} Mbps | Subida: ${finalUpload} Mbps | Latencia: ${finalPing} ms (Jitter: ${finalJitter} ms).`, 'success');
  };

  const clearTestHistory = () => {
    setRecentTests([]);
  };

  const copyResultsText = (record: SpeedTestRecord) => {
    const text = `=== PRUEBA DE VELOCIDAD REDMONITOR ===
Fecha: ${record.timestamp}
Servidor: ${record.server}
Proveedor: ${record.provider}
--------------------------------------
Descarga: ${record.download} Mbps
Subida: ${record.upload} Mbps
Ping: ${record.ping} ms
Jitter: ${record.jitter} ms
======================================`;
    navigator.clipboard.writeText(text);
    setCopiedResultId(record.id);
    setTimeout(() => {
      setCopiedResultId(null);
    }, 2000);
  };

  // Compute SVG needle and glow position based on gaugeValue (0 to 1000 Mbps)
  const computeAngle = (val: number) => {
    // Speedometre goes from -220 degrees to 40 degrees
    const capped = Math.min(Math.max(val, 0), 1000);
    const percentage = capped / 1000;
    return -210 + percentage * 240; 
  };

  const activeAngle = computeAngle(gaugeValue);

  return (
    <div className="space-y-4" id="speed-test-view">
      
      {/* HEADER CARD */}
      <div className="bg-[#0B1120]/40 border border-slate-800/80 p-3.5 rounded-md">
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" /> TESTER DE VELOCIDAD INTEGRADO / SPEED TEST
        </span>
        <h2 className="text-sm font-bold text-slate-200 mt-2">Medidor Métrico de Calidad de Ancho de Banda LAN y WAN</h2>
        <p className="text-[11px] text-slate-500 font-sans mt-1">
          Mida latencia local, Jitter de transmisión, ancho de banda saturado, velocidades medias de descarga y subida de paquetes directos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* MAIN PANEL - SPEEDOMETER */}
        <div className="lg:col-span-8 bg-slate-900/50 p-6 border border-slate-800 rounded-md shadow-xs flex flex-col items-center justify-center relative min-h-[420px]">
          
          {/* TOP CONFIG BAR */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 border-b border-slate-800/50 pb-4 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Server className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none mb-0.5">Servidor de Prueba</span>
                <select 
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                  disabled={isRunning}
                  className="bg-slate-950 border border-slate-800/50 rounded px-2 py-1 font-semibold text-slate-350 focus:outline-hidden focus:border-cyan-500 text-[11px] disabled:opacity-50"
                >
                  <option value="Buenos Aires - Telecom Argentina">Buenos Aires - Telecom Argentina (10G)</option>
                  <option value="Santiago de Chile - Entel Soluciones">Santiago de Chile - Entel (10G)</option>
                  <option value="São Paulo - Hostinger International">São Paulo - Hostinger Core (40G)</option>
                  <option value="Miami, FL - Cloudflare Anycast">Miami, FL - Cloudflare Edge (100G)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Globe className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="text-left w-full sm:w-auto">
                <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none mb-0.5">Proveedor (ISP)</span>
                <input
                  type="text"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  disabled={isRunning}
                  placeholder="Ej. Fibertel / Claro"
                  className="bg-slate-950 border border-slate-800/50 rounded px-2.5 py-1 text-slate-300 font-semibold focus:outline-hidden focus:border-cyan-500 text-[11px] w-full sm:w-48 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* GAUGE BODY */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* SVG GAUGE DIAL */}
            <svg className="w-full h-full transform -rotate-135" viewBox="0 0 100 100">
              {/* Outer gauge track */}
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="6" 
                strokeDasharray="188 100" 
                strokeLinecap="round"
              />
              
              {/* Active speed track indicator */}
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none" 
                stroke={testStage === 'upload' ? '#cf9f2d' : '#06b6d4'} 
                strokeWidth="6.5" 
                strokeDasharray={`${(Math.min(gaugeValue, 1000) / 1000) * 188} 250`} 
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
                strokeOpacity={testStage === 'idle' || testStage === 'concting' ? 0.05 : 0.8}
              />
              
              {/* Scale Tick marks */}
              {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((t, idx) => {
                const angle = -210 + idx * 24; 
                const rad = (angle * Math.PI) / 180;
                const x1 = 50 + 38 * Math.cos(rad);
                const y1 = 50 + 38 * Math.sin(rad);
                const x2 = 50 + 41 * Math.cos(rad);
                const y2 = 50 + 41 * Math.sin(rad);
                return (
                  <line 
                    key={t}
                    x1={x1} 
                    y1={y1} 
                    x2={x2} 
                    y2={y2} 
                    stroke="#475569" 
                    strokeWidth="0.6"
                    strokeOpacity="0.4"
                    transform="rotate(135 50 50)"
                  />
                );
              })}
            </svg>

            {/* REAL NEEDLE */}
            <div 
              style={{ transform: `rotate(${activeAngle}deg)` }}
              className="absolute w-2.5 h-28 bottom-1/2 left-[calc(50%-5px)] origin-bottom transition-all duration-100 ease-out flex flex-col items-center pointer-events-none select-none"
            >
              <div className={`w-1 bg-gradient-to-t ${testStage === 'upload' ? 'from-amber-600 to-amber-400' : 'from-cyan-600 to-cyan-400'} h-full rounded-full shadow-lg shadow-cyan-950`} />
              <div className="w-4 h-4 bg-slate-950 border-2 border-slate-700 rounded-full -mt-2 shadow-md shrink-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              </div>
            </div>

            {/* INNER TEXT COUNTER */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-6">
              {testStage === 'idle' ? (
                <button
                  onClick={runSpeedTest}
                  disabled={isRunning}
                  className="bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-extrabold w-20 h-20 rounded-full border border-cyan-300 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/10 cursor-pointer transition-all uppercase text-[11px] leading-tight"
                >
                  <Play className="h-5 w-5 fill-slate-950 mb-0.5" />
                  Iniciar
                </button>
              ) : testStage === 'concting' ? (
                <div className="space-y-0.5">
                  <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin mx-auto mb-1" />
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest block font-mono">Conectando</span>
                  <span className="text-xs text-slate-300 font-semibold">{progress}%</span>
                </div>
              ) : (
                <div className="space-y-0.5 select-all">
                  <span className="text-4xl font-extrabold font-mono text-slate-100 leading-none block tracking-tighter">
                    {testStage === 'download' ? download.toFixed(0) : testStage === 'upload' ? upload.toFixed(0) : (download || 0).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">Mbps</span>
                  
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm inline-block ${
                    testStage === 'download' ? 'bg-cyan-550/10 text-cyan-400 border border-cyan-800/20' :
                    testStage === 'upload' ? 'bg-amber-550/10 text-amber-400 border border-amber-800/20' : 'bg-slate-950 text-slate-500'
                  }`}>
                    {testStage === 'download' ? 'Descarga' : testStage === 'upload' ? 'Subida' : 'Completado'}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* REAL TIME THREE-GAUGE LOWER VALUES */}
          <div className="grid grid-cols-4 gap-2 w-full mt-6 bg-[#0B1120]/40 p-3 rounded border border-slate-800/50">
            
            {/* Ping Card */}
            <div className="text-center space-y-1 border-r border-slate-800/30 p-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Ping (latencia)</span>
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono text-xs font-bold text-slate-200">
                  {testStage === 'concting' || testStage === 'idle' ? '—' : `${ping} ms`}
                </span>
              </div>
            </div>

            {/* Jitter Card */}
            <div className="text-center space-y-1 border-r border-slate-800/30 p-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Jitter (variación)</span>
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-mono text-xs font-bold text-slate-200">
                  {testStage === 'concting' || testStage === 'idle' ? '—' : `${jitter} ms`}
                </span>
              </div>
            </div>

            {/* Descarga Card */}
            <div className="text-center space-y-1 border-r border-slate-800/30 p-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Descarga</span>
              <div className="flex items-center justify-center gap-1">
                <HardDriveDownload className={`h-3.5 w-3.5 ${testStage === 'download' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {testStage === 'idle' || testStage === 'concting' || testStage === 'ping' ? '—' : `${download} Mbps`}
                </span>
              </div>
            </div>

            {/* Subida Card */}
            <div className="text-center space-y-1 p-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-mono">Subida</span>
              <div className="flex items-center justify-center gap-1">
                <HardDriveUpload className={`h-3.5 w-3.5 ${testStage === 'upload' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="font-mono text-xs font-bold text-amber-500">
                  {testStage === 'idle' || testStage === 'concting' || testStage === 'ping' || testStage === 'download' ? '—' : `${upload} Mbps`}
                </span>
              </div>
            </div>

          </div>

          {/* ACTIVE PROGRESS BAR */}
          {isRunning && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950">
              <div 
                style={{ width: `${progress}%` }} 
                className={`h-full bg-cyan-400 transition-all ${
                  testStage === 'upload' ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
            </div>
          )}

        </div>

        {/* SIDE PANEL - HISTORIC RESULTS */}
        <div className="lg:col-span-4 bg-slate-900/50 p-4 border border-slate-800 rounded-md shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-2.5">
              <h3 className="text-xs font-bold uppercase text-slate-400 font-display flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-cyan-400" />
                Auditoría Histórica de Testeo
              </h3>
              {recentTests.length > 0 && (
                <button
                  onClick={clearTestHistory}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer font-semibold"
                >
                  Vaciar
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {recentTests.length === 0 ? (
                <p className="text-center text-slate-500 italic text-xs py-10 font-sans">
                  No se registran pruebas. Presione "Iniciar" para medir.
                </p>
              ) : (
                recentTests.map((test) => (
                  <div 
                    key={test.id} 
                    className="p-2.5 rounded-sm bg-slate-950/40 border border-slate-800/50 hover:border-slate-800/30 flex flex-col gap-1.5 transition-all"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium font-sans">{test.timestamp}</span>
                      <span className="text-[8.5px] bg-slate-900 border border-slate-800 text-slate-400 px-1 hover:text-cyan-300 transition-colors uppercase truncate max-w-[120px]" title={test.server}>
                        {test.server.split('-')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 py-1 border-t border-b border-slate-900/35 text-[11px] font-mono select-all">
                      <div className="flex items-center gap-1">
                        <span className="text-cyan-500 text-[9px] font-bold">DL:</span>
                        <span className="text-slate-200 font-extrabold">{test.download} Mbps</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500 text-[9px] font-bold">UL:</span>
                        <span className="text-slate-200 font-extrabold">{test.upload} Mbps</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>ping: {test.ping}ms | jitter: {test.jitter}ms</span>
                      <button
                        onClick={() => copyResultsText(test)}
                        className="text-cyan-400 hover:text-cyan-300 font-sans text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedResultId === test.id ? '¡Copiado!' : 'Compartir'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 border border-slate-800/50 rounded-xs mt-3 text-[10px] text-slate-500 space-y-1 font-mono">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase font-sans mb-1">Nota del sistema:</span>
            <p className="leading-tight font-sans text-slate-500">
              Las velocidades de bajada (Download) y subida (Upload) simulan la respuesta física de tu interfaz <strong className="text-slate-350">{selectedProvider.split(' ')[0]}</strong> ante ráfagas TCP multicadena.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
