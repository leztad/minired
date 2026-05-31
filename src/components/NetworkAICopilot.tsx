import React, { useState } from 'react';
import { 
  Brain, Sparkles, Copy, Check, RefreshCw, Terminal, ChevronRight, AlertCircle, ShieldCheck, Cpu 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Device, Sensor } from '../types';

interface NetworkAICopilotProps {
  devices: Device[];
  activeAnomaly: 'none' | 'latency' | 'gateway' | 'loss';
  subnetSegment: string;
  sensors: Sensor[];
}

export default function NetworkAICopilot({
  devices,
  activeAnomaly,
  subnetSegment,
  sensors
}: NetworkAICopilotProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const getAnomalyLabel = (type: typeof activeAnomaly) => {
    switch (type) {
      case 'latency': return 'Latencia Degradada (Spike inyectado)';
      case 'gateway': return 'Colapso de Gateway principal (.1 Caído)';
      case 'loss': return 'Pérdida masiva de paquetes (Interferencias)';
      default: return 'Ninguna (Todos los parámetros sanos)';
    }
  };

  const handleGenerateDiagnostic = async () => {
    setLoading(true);
    setReport('');
    setErrorMsg('');
    setLoadingStep('Preparando matriz de dispositivos e identificadores MAC...');
    
    // Animate fake but helpful status updates
    const steps = [
      'Invocando modelo Gemini 3.5 Flash en nodo seguro...',
      'Deduciendo fabricantes de red mediante análisis heurístico de prefijos MAC...',
      'Estructurando mapas de latencia y aislamiento del gateway. Exponiendo vulnerabilidades...',
      'Refinando reporte en formato Markdown técnico profesional...'
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(stepInterval);
      }
    }, 1800);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          devices,
          activeAnomaly: getAnomalyLabel(activeAnomaly),
          activeSensors: sensors,
          subnet: subnetSegment
        })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo de respuesta del servidor.');
      }

      const data = await response.json();
      setReport(data.report || 'No se recibió ningún informe. Comprueba que las configuraciones de red no estén vacías.');
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMsg(err.message || 'Error al conectar con la API de diagnóstico de Gemini.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0B1120] p-4 md:p-6 rounded-xs border border-slate-850 flex-1 flex flex-col gap-6 animate-fade-in text-slate-100 max-w-4xl mx-auto w-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-850 pb-4 gap-4">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-sm">
              Copiloto AI Activo
            </span>
          </div>
          <h2 className="text-lg font-bold font-display text-slate-205 flex items-center gap-2 text-slate-100">
            Copiloto de Red Inteligente Gemini
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl">
            Ejecuta diagnósticos heurísticos avanzados utilizando los modelos de lenguaje de Google DeepMind. Analiza la topología actual, busca bucles, predice fabricantes por MAC-prefixes y establece un catálogo de remediación completo.
          </p>
        </div>
        <div className="shrink-0">
          <button
            onClick={handleGenerateDiagnostic}
            disabled={loading || devices.length === 0}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xs font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              loading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-755' 
                : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/5 hover:scale-[1.01] active:scale-95 cursor-pointer'
            }`}
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-cyan-250 text-cyan-200" />
            )}
            Generar Diagnóstico Completo (IA)
          </button>
        </div>
      </div>

      {/* CORE ENVIRONMENT VALUES READ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/50 p-3 rounded-xs border border-slate-850 text-left">
          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider font-display mb-1">Subred Monitoreada</span>
          <span className="font-mono text-cyan-400 text-xs font-semibold">{subnetSegment}</span>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-xs border border-slate-850 text-left">
          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider font-display mb-1">Anomalía Inyectada</span>
          <span className={`text-xs font-semibold font-sans ${activeAnomaly !== 'none' ? 'text-amber-500' : 'text-emerald-400'}`}>
            {getAnomalyLabel(activeAnomaly)}
          </span>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-xs border border-slate-850 text-left">
          <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider font-display mb-1">Dispositivos a Examinar</span>
          <span className="font-mono text-slate-250 text-slate-200 text-xs font-semibold">
            {devices.filter(d => d.estado !== 'No_Escaneado').length} activos en capa
          </span>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 min-h-[300px] flex flex-col justify-center items-center bg-slate-950/40 p-4 border border-slate-850 rounded-xs">
        {loading && (
          <div className="text-center py-10 max-w-md mx-auto space-y-4 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-purple-550/10 rounded-full animate-pulse" />
              <div className="w-full h-full border-t-2 border-b-2 border-r-2 border-cyan-500 rounded-full animate-spin flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div className="space-y-1.5 px-4">
              <p className="font-mono text-cyan-400 text-xs font-bold font-display uppercase tracking-wider">
                Analizando con Gemini AI...
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans min-h-[32px] italic">
                {loadingStep}
              </p>
            </div>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="text-center py-10 max-w-md mx-auto space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-red-500/15 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 px-4 flex flex-col items-center">
              <p className="font-sans text-rose-400 text-xs font-bold uppercase tracking-wider">
                Error en Diagnóstico
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-slate-950 p-3 rounded-xs border border-slate-850 select-text text-left w-full">
                {errorMsg}
              </p>
              {!(errorMsg.includes("503") || errorMsg.toLowerCase().includes("saturados")) ? (
                <p className="text-[10px] text-slate-500 font-sans leading-tight pt-1">
                  Asegúrate de agregar la clave <code className="text-cyan-400 font-mono bg-slate-900 px-1 py-0.2 rounded font-bold">GEMINI_API_KEY</code> en la esquina superior derecha del editor en Settings &gt; Secrets (Ajustes de variables de entorno).
                </p>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={handleGenerateDiagnostic}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xs text-xs font-sans active:scale-95 transition-all cursor-pointer shadow-md shadow-purple-500/10 flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                    Re-intentar Diagnóstico ahora
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !errorMsg && !report && (
          <div className="text-center py-14 max-w-sm mx-auto space-y-3">
            <Sparkles className="h-10 w-10 text-purple-500/40 mx-auto" />
            <h3 className="font-bold text-slate-350 text-xs uppercase tracking-wider font-display text-slate-300">
              Listo para diagnóstico cognitivo
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              Haz clic en el botón superior para enviar el mapa de subred activo y las configuraciones de latencia al copiloto de Gemini. Generará recomendaciones, buscará impostores MAC ARP y evaluará la higiene de la red local.
            </p>
          </div>
        )}

        {!loading && !errorMsg && report && (
          <div className="w-full text-left flex flex-col h-full select-text animate-fade-in">
            <div className="flex justify-between items-center bg-[#0B1120] p-2.5 rounded-sm border-b border-slate-850 mb-4 px-4 font-mono text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                informe_gemini_diagnostico.md • Generación Concluida
              </span>
              <button
                onClick={handleCopyReport}
                className="text-cyan-400 hover:text-cyan-350 font-bold flex items-center gap-1 transition-colors px-2 py-0.5 rounded cursor-pointer bg-slate-950"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Markdown Container */}
            <div className="text-xs text-slate-300 leading-relaxed markdown-style-container pr-1 space-y-4 max-h-[500px] overflow-y-auto select-text px-2 markdown-body">
              <ReactMarkdown>
                {report}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* QUICK SECURITY EDUCATION NOTES */}
      <div className="bg-slate-900/30 p-4 border border-slate-850 rounded-xs text-left">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Nota Educativa sobre Seguridad LAN
        </h4>
        <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
          El análisis cognitivo de Gemini es capaz de procesar anomalías simuladas en vivo. Al inyectar una anomalía como <strong className="text-amber-500">Colapso del Gateway</strong> o <strong className="text-amber-500">Spike de Latencia</strong> en el Panel de Pruebas, el modelo adaptará de forma reactiva las recomendaciones del plan de remediación utilizando su entendimiento lógico de redes OSI y direccionamiento Ethernet.
        </p>
      </div>

    </div>
  );
}
