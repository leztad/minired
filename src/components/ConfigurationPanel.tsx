import React, { useState } from 'react';
import { 
  Palette, Monitor, Shield, Sun, Moon, Check, 
  HelpCircle, Eye, Info, Lock
} from 'lucide-react';
import TauriInstallerGuide from './TauriInstallerGuide';
import UserManagement from './UserManagement';

interface ConfigurationPanelProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  authToken: string;
  currentUser: { username: string; fullName: string; role: 'admin' | 'auditor' };
  onAddLog: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  enabledFeatures: Record<string, boolean>;
  onUpdateFeatures: (features: Record<string, boolean>) => void;
}

export default function ConfigurationPanel({
  theme,
  setTheme,
  authToken,
  currentUser,
  onAddLog,
  enabledFeatures,
  onUpdateFeatures
}: ConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState<'visualizacion' | 'installer' | 'seguridad'>('visualizacion');

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    onAddLog(`Se cambió el tema visual de la consola a: ${newTheme === 'dark' ? 'Tema Oscuro (NOC)' : 'Tema Claro (Día)'}`, 'info');
  };

  return (
    <div className="w-full space-y-6 animate-slide-up" id="configuration-panel">
      {/* Header card with contextual description */}
      <div className="glass-panel rounded-lg p-5 border-l-4 border-cyan-500 shadow-lg">
        <h2 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
          <Palette className="h-5 w-5 text-cyan-400" />
          Configuración Global del Monitor
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-4xl">
          Administre la apariencia de su consola de red, descargue los instaladores de escritorio nativos 
          para habilitar raw-sockets y gestione los accesos y roles del equipo técnico desde un único panel centralizado.
        </p>
      </div>

      {/* Main Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sub-Tab Navigation Sidebar */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none sticky top-2 z-10 glass-panel p-2 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('visualizacion')}
            className={`flex-1 lg:flex-none text-left py-2.5 px-3 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === 'visualizacion'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Tema y Pantalla</span>
          </button>

          <button
            onClick={() => setActiveTab('installer')}
            className={`flex-1 lg:flex-none text-left py-2.5 px-3 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === 'installer'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span>Instalador Desktop</span>
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`flex-1 lg:flex-none text-left py-2.5 px-3 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === 'seguridad'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Seguridad y Accesos</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'visualizacion' && (
            <div className="glass-panel rounded-lg p-6 border border-slate-800/80 space-y-6 animate-fade-in" id="settings-theme-tab">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Sun className="h-4.5 w-4.5 text-cyan-400" />
                  Tema y Contraste Visual
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cambie entre temas oscuros y claros para optimizar la legibilidad de la telemetría según las condiciones de luz ambiental de su entorno de trabajo.
                </p>
              </div>

              {/* Theme Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dark Theme Option */}
                <div 
                  onClick={() => handleThemeChange('dark')}
                  className={`relative p-5 rounded-lg border transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 overflow-hidden ${
                    theme === 'dark' 
                      ? 'border-cyan-500 bg-slate-950/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                      : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3 text-cyan-500/10 group-hover:scale-110 transition-transform">
                    <Moon className="h-20 w-20" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-850 text-cyan-400">
                        <Moon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-white font-display">Tema Oscuro (NOC)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 max-w-[85%]">
                      Paleta de alto contraste en fondo negro profundo para entornos nocturnos o Centros de Operaciones de Red (NOC). Previene el cansancio ocular.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-auto pt-2">
                    <span className="text-[9px] font-mono bg-slate-900/80 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Activo de Noche</span>
                    {theme === 'dark' && (
                      <span className="bg-cyan-500 text-slate-950 rounded-full p-0.5">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Light Theme Option */}
                <div 
                  onClick={() => handleThemeChange('light')}
                  className={`relative p-5 rounded-lg border transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 overflow-hidden ${
                    theme === 'light' 
                      ? 'border-cyan-500 bg-white/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                      : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3 text-cyan-500/10 group-hover:scale-110 transition-transform">
                    <Sun className="h-20 w-20" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                        <Sun className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-white font-display">Tema Claro (Día)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 max-w-[85%]">
                      Paleta limpia, clara y de alto contraste con fondo suave de oficina. Recomendado para entornos muy iluminados por luz solar natural.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-auto pt-2">
                    <span className="text-[9px] font-mono bg-slate-900/80 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Luz de Oficina</span>
                    {theme === 'light' && (
                      <span className="bg-cyan-500 text-slate-950 rounded-full p-0.5">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative advice box */}
              <div className="flex gap-3 bg-slate-900/40 border border-slate-800 p-4 rounded-lg text-xs text-slate-300">
                <Info className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-white">¿Sabías que?</p>
                  <p className="leading-relaxed">
                    La variación constante entre pantallas oscuras y luces fluorescentes de oficina puede inducir dolor de cabeza o fatiga visual. 
                    Cambiar al <strong>Tema Claro (Día)</strong> bajo la luz del sol directa o ambientes de oficina estándar reduce la fatiga por acomodación de la pupila.
                  </p>
                </div>
              </div>

              {/* Live Preview mockup card */}
              <div className="border border-slate-800/60 rounded-lg p-4 space-y-3 bg-slate-950/40">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Vista Previa Dinámica del Contraste</span>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="bg-[#0B0F19] border border-slate-800 rounded p-2.5 text-slate-300 space-y-1 font-mono">
                    <span className="text-cyan-400 font-bold block"># MUESTRA_OSCURA</span>
                    <span className="text-slate-400 text-[9px] block">Dispositivos activos: 15 / Ping: 4ms</span>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-1">
                      <div className="bg-cyan-400 h-full w-[70%]"></div>
                    </div>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 rounded p-2.5 text-slate-800 space-y-1 font-mono">
                    <span className="text-cyan-700 font-bold block"># MUESTRA_CLARA</span>
                    <span className="text-slate-500 text-[9px] block">Dispositivos activos: 15 / Ping: 4ms</span>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-cyan-600 h-full w-[70%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'installer' && (
            <div className="glass-panel rounded-lg p-1 border border-slate-800/80 overflow-hidden animate-fade-in" id="settings-desktop-tab">
              <div className="p-5 border-b border-slate-800/80">
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Monitor className="h-4.5 w-4.5 text-cyan-400" />
                  Instalador de Escritorio (Tauri Desktop App)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Siga las instrucciones para compilar e instalar la aplicación de escritorio nativa en Windows, macOS o Linux, ganando acceso a Raw Sockets para escaneos locales directos.
                </p>
              </div>
              <div className="bg-slate-950/20 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <TauriInstallerGuide />
              </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="glass-panel rounded-lg p-1 border border-slate-800/80 overflow-hidden animate-fade-in" id="settings-security-tab">
              <div className="p-5 border-b border-slate-800/80">
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-cyan-400" />
                  Seguridad y Accesos
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Administre los perfiles de usuario, roles del sistema (RBAC), credenciales Firebase y configure qué módulos están habilitados globalmente para los operadores.
                </p>
              </div>
              <div className="p-3 bg-slate-950/20">
                <UserManagement 
                  authToken={authToken}
                  currentUser={currentUser}
                  onAddLog={onAddLog}
                  enabledFeatures={enabledFeatures}
                  onUpdateFeatures={onUpdateFeatures}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
