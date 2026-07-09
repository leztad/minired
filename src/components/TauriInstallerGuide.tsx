import React, { useState } from 'react';
import { 
  Monitor, Cpu, Download, ArrowRight, CheckCircle2, Copy, 
  ExternalLink, Terminal, Shield, Sparkles, HelpCircle, FileText
} from 'lucide-react';
// @ts-ignore
import desktopIcon from '../assets/images/desktop_icon_1783639951095.jpg';

export default function TauriInstallerGuide() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const response = await fetch('/api/download-zip');
      if (!response.ok) {
        throw new Error('No se pudo generar el archivo ZIP');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RedMonitor_Desktop_Tauri.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
      alert('Error al descargar el archivo ZIP: ' + (error as Error).message);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const codeSnippets = {
    install_rust: 'winget install Rust.Rustup',
    npm_install: 'npm install',
    generate_icons: 'npm run tauri:icon',
    build_app: 'npm run tauri:build',
    nsis_shortcut: `"nsis": {\n  "createDesktopLink": "always",\n  "oneClick": false,\n  "languages": ["Spanish"]\n}`
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="tauri-installer-guide-root">
      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0a142c] to-slate-950 border border-cyan-500/10 rounded-lg p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <img 
              src={desktopIcon} 
              alt="RedMonitor Desktop Icon" 
              className="w-28 h-28 rounded-2xl shadow-xl relative border border-slate-900 object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-2 -right-2 bg-cyan-500 text-slate-950 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full border-2 border-slate-900 shadow-lg">
              TAURI V2
            </span>
          </div>
 
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                Cliente Nativo de Escritorio
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                Listo para Compilar
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
              Instalador Nativo RedMonitor con Acceso en Escritorio
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Tauri empaqueta el sistema para que se ejecute en un ejecutable superligero (.exe). Hemos configurado el instalador para que <strong className="text-emerald-400 font-semibold">cree automáticamente un acceso directo con el icono oficial en tu escritorio</strong> al instalarse.
            </p>
            <div className="pt-3 flex flex-wrap justify-center md:justify-start gap-3">
              <button
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-lg transition-all shadow-lg shadow-cyan-500/10 active:scale-95 disabled:opacity-50"
              >
                <Download className={`h-4.5 w-4.5 ${downloadingZip ? 'animate-bounce' : ''}`} />
                {downloadingZip ? 'Comprimiendo Proyecto (.ZIP)...' : 'Generar y Descargar Código .ZIP'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: FEATURES & ADVANTAGES */}
        <div className="lg:col-span-1 space-y-6">
          {/* SCREENSHOT MOCKUP */}
          <div className="bg-[#0c152a] border border-slate-800/80 rounded-lg p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="h-4 w-4 text-cyan-400" />
              Vista Previa en Escritorio
            </h3>
            
            {/* Desktop Mockup container */}
            <div className="bg-slate-950/80 border border-slate-900 rounded-md p-3 relative h-48 overflow-hidden flex flex-col justify-between">
              {/* Desktop background effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/40 opacity-80"></div>
              
              {/* Shortcut Icon Icon Mockup */}
              <div className="relative z-10 flex flex-col items-center justify-center w-16 h-16 bg-slate-900/30 hover:bg-slate-800/40 border border-cyan-500/10 rounded-lg p-1 cursor-pointer transition-all mt-4 ml-4">
                <img 
                  src={desktopIcon} 
                  alt="Desktop ShortCut" 
                  className="w-10 h-10 rounded-lg shadow-md border border-cyan-500/20" 
                  referrerPolicy="no-referrer"
                />
                <span className="text-[9px] text-slate-200 font-semibold mt-1 select-none text-center leading-none">
                  RedMonitor
                </span>
                <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-[6px] text-slate-950 p-0.5 rounded-full">
                  ↩
                </span>
              </div>

              {/* Windows taskbar mockup */}
              <div className="relative z-10 w-full bg-slate-900/90 border-t border-slate-800/60 p-1 flex items-center justify-between text-[9px] text-slate-400 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-cyan-500/20 rounded-xs flex items-center justify-center font-bold text-cyan-400 text-[8px]">田</div>
                  <div className="w-8 h-1.5 bg-slate-800 rounded-full"></div>
                  <div className="w-10 h-1.5 bg-slate-800 rounded-full"></div>
                </div>
                <div className="flex items-center gap-1 text-[8px] font-mono pr-1">
                  <span>ESP</span>
                  <span>16:30 PM</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              Representación visual del <strong className="text-slate-300 font-semibold">Acceso Directo</strong> creado en el Escritorio con el Icono de Red de Alta Resolución.
            </p>
          </div>

          {/* ADVANTAGES */}
          <div className="bg-[#0b1329]/50 border border-slate-800/60 rounded-lg p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              ¿Por qué usar la versión nativa?
            </h3>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/35 flex items-center justify-center text-cyan-400 text-[9px] font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Sonda de Red Real (LAN)</h4>
                  <p className="text-[10px] text-slate-400">Escanea la red física real de tu casa u oficina sin las restricciones del contenedor de la nube.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/35 flex items-center justify-center text-cyan-400 text-[9px] font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Consumo de Memoria Ínfimo</h4>
                  <p className="text-[10px] text-slate-400">Tauri pesa menos de 10 MB y consume una fracción de memoria en comparación con navegadores completos.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/35 flex items-center justify-center text-cyan-400 text-[9px] font-bold">✓</div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Instalación Local en Windows</h4>
                  <p className="text-[10px] text-slate-400">Instalador formal con desinstalador en Panel de Control y accesos directos configurados.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: STEP BY STEP GUIDE */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1329]/80 border border-slate-800/80 rounded-lg p-5 shadow-lg space-y-5">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="h-4 w-4 text-cyan-400" />
              Guía de Instalación y Generación Local
            </h2>

            {/* PRE-REQUISITES PANEL */}
            <div className="bg-slate-950/50 rounded-lg border border-slate-900 p-4 space-y-2.5">
              <span className="text-[10px] font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                ⚙️ prerrequisitos obligatorios en tu pc
              </span>
              <p className="text-[11px] text-slate-300">
                Para compilar el código de Rust que da vida al cliente nativo de Tauri, necesitas tener instalado:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-slate-400">
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/40 flex items-start gap-2">
                  <span className="text-emerald-400">🟢</span>
                  <div>
                    <strong className="text-slate-200 block">Node.js (v18+)</strong>
                    Motor de javascript para compilar Vite.
                  </div>
                </div>
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800/40 flex items-start gap-2">
                  <span className="text-cyan-400">🦀</span>
                  <div>
                    <strong className="text-slate-200 block">Rust y Cargo</strong>
                    Compilador de alto rendimiento para Tauri.
                  </div>
                </div>
              </div>
            </div>

            {/* INTERACTIVE STEPPING */}
            <div className="space-y-4">
              {/* STEP 1 */}
              <div className="relative pl-7 border-l border-slate-800 pb-3">
                <div className="absolute top-0.5 -left-2.5 w-5 h-5 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center font-bold text-xs text-cyan-400">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-200">Exporta y Descarga el Proyecto</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Usa el menú superior derecho de AI Studio, haz clic en <strong className="text-slate-300">"Exportar"</strong> o <strong className="text-slate-300">"Download ZIP"</strong> y extrae la carpeta entera en tu computadora.
                </p>
              </div>

              {/* STEP 2 */}
              <div className="relative pl-7 border-l border-slate-800 pb-3">
                <div className="absolute top-0.5 -left-2.5 w-5 h-5 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center font-bold text-xs text-cyan-400">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-200">Instala Rust (Si no lo tienes)</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  En Windows, abre PowerShell como administrador e instala Rustup ejecutando el comando inferior, o descárgalo de la web oficial:
                </p>
                <div className="flex items-center gap-1.5 mt-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-900">
                  <code className="text-[10px] font-mono text-cyan-300 flex-1">{codeSnippets.install_rust}</code>
                  <button 
                    onClick={() => handleCopy(codeSnippets.install_rust, 'rust')}
                    className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-0.5 px-2 rounded border border-slate-800 cursor-pointer flex items-center gap-1 font-sans transition-all"
                  >
                    {copiedText === 'rust' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === 'rust' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative pl-7 border-l border-slate-800 pb-3">
                <div className="absolute top-0.5 -left-2.5 w-5 h-5 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center font-bold text-xs text-cyan-400">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-200">Genera los Iconos Nativos del Escritorio</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Antes de compilar, ejecuta este comando para recortar y compilar la imagen JPG de alta resolución en formatos nativos (<code className="text-cyan-400">.ico</code> para Windows, <code className="text-cyan-400">.icns</code> para macOS):
                </p>
                <div className="flex items-center gap-1.5 mt-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-900">
                  <code className="text-[10px] font-mono text-emerald-400 flex-1">{codeSnippets.generate_icons}</code>
                  <button 
                    onClick={() => handleCopy(codeSnippets.generate_icons, 'icons')}
                    className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-0.5 px-2 rounded border border-slate-800 cursor-pointer flex items-center gap-1 font-sans transition-all"
                  >
                    {copiedText === 'icons' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === 'icons' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="relative pl-7 border-l border-slate-800 pb-3">
                <div className="absolute top-0.5 -left-2.5 w-5 h-5 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center font-bold text-xs text-cyan-400">
                  4
                </div>
                <h3 className="text-xs font-bold text-slate-200">Compila el Instalador Nativo</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Finalmente, ejecuta el compilador. Este descargará los crates de Rust necesarios y generará el instalador .EXE que crea el acceso directo en el Escritorio:
                </p>
                <div className="flex items-center gap-1.5 mt-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-900">
                  <code className="text-[10px] font-mono text-cyan-300 flex-1">{codeSnippets.build_app}</code>
                  <button 
                    onClick={() => handleCopy(codeSnippets.build_app, 'build')}
                    className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-0.5 px-2 rounded border border-slate-800 cursor-pointer flex items-center gap-1 font-sans transition-all"
                  >
                    {copiedText === 'build' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedText === 'build' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* SCRIPT AUTO */}
              <div className="relative pl-7">
                <div className="absolute top-0.5 -left-2.5 w-5 h-5 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center font-bold text-xs text-emerald-400">
                  ⚡
                </div>
                <h3 className="text-xs font-bold text-emerald-400">¡Script Todo en Uno Provisto!</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Para simplificar todo, hemos creado el archivo <strong className="text-slate-300">"Instalar_RedMonitor_Desktop.bat"</strong> en la raíz del proyecto. Al descargarlo en tu máquina, simplemente hazle <strong className="text-emerald-400">doble clic</strong> y automatizará todos los pasos anteriores automáticamente.
                </p>
              </div>
            </div>

            {/* NSIS TECHNICAL CORNER */}
            <div className="p-4 bg-slate-950 border border-slate-900 rounded-md">
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1">
                ⚙️ Configuración NSIS del acceso directo (tauri.conf.json)
              </span>
              <p className="text-[10px] text-slate-500 mb-2 leading-tight">
                El motor de instalación NSIS está instruido para crear el enlace del escritorio mediante esta regla específica que hemos añadido:
              </p>
              <pre className="text-[9px] text-cyan-300 bg-slate-900 p-2.5 rounded border border-slate-950/85 font-mono select-all">
                {codeSnippets.nsis_shortcut}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
