import React, { useState, useEffect } from 'react';
import { 
  Palette, Monitor, Shield, Sun, Moon, Check, 
  HelpCircle, Eye, Info, Lock, Database, DownloadCloud, 
  UploadCloud, AlertTriangle, RefreshCw, FileJson, 
  CheckCircle2, Trash2, ShieldAlert
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

const BACKUP_KEYS = [
  'netmonitor_manual_devices',
  'netmonitor_custom_names',
  'netmonitor_custom_vendors',
  'netmonitor_api_vendors',
  'redmonitor_speedtests',
  'redmonitor_audit_history',
  'netmonitor_saved_locations',
  'netmonitor_configured_features',
  'netmonitor_theme',
  'netmonitor_manual_ip',
  'netmonitor_current_location'
];

export default function ConfigurationPanel({
  theme,
  setTheme,
  authToken,
  currentUser,
  onAddLog,
  enabledFeatures,
  onUpdateFeatures
}: ConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState<'visualizacion' | 'installer' | 'seguridad' | 'respaldo'>('visualizacion');

  // Backup / Restore states
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isRestoreSuccess, setIsRestoreSuccess] = useState<boolean>(false);
  const [isResetSuccess, setIsResetSuccess] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    onAddLog(`Se cambió el tema visual de la consola a: ${newTheme === 'dark' ? 'Tema Oscuro (NOC)' : 'Tema Claro (Día)'}`, 'info');
  };

  const getLocalStorageStats = () => {
    try {
      const stats = {
        devices: JSON.parse(localStorage.getItem('netmonitor_manual_devices') || '[]').length,
        names: Object.keys(JSON.parse(localStorage.getItem('netmonitor_custom_names') || '{}')).length,
        vendors: Object.keys(JSON.parse(localStorage.getItem('netmonitor_custom_vendors') || '{}')).length,
        apiVendors: Object.keys(JSON.parse(localStorage.getItem('netmonitor_api_vendors') || '{}')).length,
        speedtests: JSON.parse(localStorage.getItem('redmonitor_speedtests') || '[]').length,
        audits: JSON.parse(localStorage.getItem('redmonitor_audit_history') || '[]').length,
        locations: JSON.parse(localStorage.getItem('netmonitor_saved_locations') || '[]').length,
        hasConfig: !!localStorage.getItem('netmonitor_configured_features'),
        currentIp: localStorage.getItem('netmonitor_manual_ip') || 'Ninguno',
        currentLoc: localStorage.getItem('netmonitor_current_location') || 'Sede Local'
      };
      return stats;
    } catch (e) {
      return {
        devices: 0,
        names: 0,
        vendors: 0,
        apiVendors: 0,
        speedtests: 0,
        audits: 0,
        locations: 0,
        hasConfig: false,
        currentIp: 'Ninguno',
        currentLoc: 'Sede Local'
      };
    }
  };

  const [stats, setStats] = useState(getLocalStorageStats());

  useEffect(() => {
    setStats(getLocalStorageStats());
  }, [activeTab]);

  const exportBackup = () => {
    try {
      const backupData: Record<string, string | null> = {};
      let itemCount = 0;
      BACKUP_KEYS.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) {
          backupData[key] = val;
          itemCount++;
        }
      });

      const payload = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        system: "NetMonitor Pro",
        data: backupData
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netmonitor_respaldo_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onAddLog(`Respaldo total del sistema generado con éxito (${itemCount} módulos respaldados)`, 'success');
    } catch (error) {
      onAddLog('Error al generar el respaldo del sistema', 'error');
      console.error(error);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || json.system !== 'NetMonitor Pro' || !json.data) {
          onAddLog('El archivo de respaldo seleccionado no es válido o no pertenece a NetMonitor', 'error');
          setImportError('Archivo inválido: estructura de respaldo incompatible o dañada.');
          setPendingBackup(null);
          return;
        }

        setPendingBackup(json);
        setImportError(null);
        onAddLog('Archivo de respaldo cargado correctamente. Listo para confirmación.', 'info');
      } catch (err) {
        onAddLog('Error al procesar el archivo JSON de respaldo', 'error');
        setImportError('No se pudo analizar el archivo JSON de respaldo.');
        setPendingBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingBackup || !pendingBackup.data) return;

    try {
      const data = pendingBackup.data;
      Object.keys(data).forEach(key => {
        const val = data[key];
        if (val !== null) {
          localStorage.setItem(key, val);
        }
      });
      
      onAddLog('¡Restauración de respaldo completada con éxito!', 'success');
      setIsRestoreSuccess(true);
      setPendingBackup(null);

      let timeLeft = 3;
      setCountdown(timeLeft);
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      onAddLog('Error al restaurar los datos en el sistema', 'error');
      console.error(error);
    }
  };

  const handleFactoryReset = () => {
    if (confirmText.trim().toUpperCase() !== 'CONFIRMAR') {
      onAddLog('Texto de confirmación incorrecto para el restablecimiento de fábrica', 'warning');
      return;
    }

    try {
      BACKUP_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });
      onAddLog('El sistema ha sido restablecido a los valores de fábrica.', 'success');
      setIsResetSuccess(true);
      
      let timeLeft = 3;
      setCountdown(timeLeft);
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      onAddLog('Error al restablecer el sistema', 'error');
      console.error(error);
    }
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

          <button
            onClick={() => setActiveTab('respaldo')}
            className={`flex-1 lg:flex-none text-left py-2.5 px-3 rounded-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === 'respaldo'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Respaldo y Recuperación</span>
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

          {activeTab === 'respaldo' && (
            <div className="glass-panel rounded-lg p-6 border border-slate-800/80 space-y-6 animate-fade-in" id="settings-backup-tab">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-cyan-400" />
                  Respaldo y Restauración Total del Sistema
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Exporte un archivo de seguridad con todas las personalizaciones, dispositivos locales, historiales de auditorías y métricas guardadas en este navegador, o restaure una base de datos previa para clonar la configuración.
                </p>
              </div>

              {isRestoreSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 bg-emerald-950/15 border border-emerald-500/30 rounded-lg text-center p-6 animate-pulse">
                  <CheckCircle2 className="h-16 w-16 text-emerald-400 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">¡Restauración Completada con Éxito!</h4>
                    <p className="text-xs text-slate-400 max-w-md">
                      Toda la información del respaldo ha sido aplicada. La consola de red se reiniciará automáticamente para cargar el nuevo estado de forma segura.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-md border border-slate-800 font-mono text-xs text-cyan-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Reiniciando sistema en {countdown} segundos...</span>
                  </div>
                </div>
              ) : isResetSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 bg-rose-950/15 border border-rose-500/30 rounded-lg text-center p-6 animate-pulse">
                  <ShieldAlert className="h-16 w-16 text-rose-500 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">¡Valores de Fábrica Restablecidos!</h4>
                    <p className="text-xs text-slate-400 max-w-md">
                      Se han eliminado todos los datos, historiales de auditoría y preferencias del navegador. El sistema se reiniciará de inmediato.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-md border border-slate-800 font-mono text-xs text-rose-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Reiniciando sistema en {countdown} segundos...</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GENERAR RESPALDO */}
                  <div className="p-5 rounded-lg border border-slate-800 bg-slate-950/40 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold bg-cyan-950/35 border border-cyan-800/30 px-2 py-0.5 rounded">Generar Respaldo Local</span>
                      <h4 className="text-sm font-bold text-white">Exportar Estado del Monitor</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Compila de forma segura todos los datos en un único archivo JSON encriptado lógicamente para respaldar la telemetría de red.
                      </p>

                      {/* Stats preview */}
                      <div className="pt-3 space-y-1.5 border-t border-slate-800/60 mt-3 text-[11px] font-mono">
                        <div className="flex justify-between text-slate-400">
                          <span>Nombres personalizados:</span>
                          <span className="text-white font-bold">{stats.names}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Fabricantes deducidos:</span>
                          <span className="text-white font-bold">{stats.vendors}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Dispositivos registrados:</span>
                          <span className="text-white font-bold">{stats.devices}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Pruebas de velocidad:</span>
                          <span className="text-white font-bold">{stats.speedtests}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Auditorías en historial:</span>
                          <span className="text-white font-bold">{stats.audits}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Sedes y ubicaciones:</span>
                          <span className="text-white font-bold">{stats.locations}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={exportBackup}
                      className="bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold py-2 px-3 rounded-md text-xs flex items-center justify-center gap-2 cursor-pointer transition-all w-full shadow-md"
                    >
                      <DownloadCloud className="h-4.5 w-4.5" />
                      Descargar Respaldo (.json)
                    </button>
                  </div>

                  {/* RESTAURAR RESPALDO */}
                  <div className="p-5 rounded-lg border border-slate-800 bg-slate-950/40 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold bg-purple-950/20 border border-purple-800/30 px-2 py-0.5 rounded">Restauración de Punto</span>
                      <h4 className="text-sm font-bold text-white">Restaurar Copia de Seguridad</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Cargue un archivo `.json` de respaldo previamente generado por esta aplicación para restablecer o clonar todo el sistema.
                      </p>

                      {pendingBackup ? (
                        <div className="pt-3 border-t border-slate-800/60 mt-3 space-y-2 animate-fade-in">
                          <div className="bg-slate-900/60 border border-slate-800 rounded p-3 text-[11px] font-mono space-y-1">
                            <span className="text-purple-400 font-bold block">Respaldo Encontrado:</span>
                            <div className="flex justify-between text-slate-400">
                              <span>Fecha creación:</span>
                              <span className="text-white text-[10px]">{new Date(pendingBackup.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Sistema origen:</span>
                              <span className="text-white font-bold">{pendingBackup.system} v{pendingBackup.version}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/40 mt-1">
                              <span>Módulos de datos:</span>
                              <span className="text-purple-400 font-bold">{Object.keys(pendingBackup.data || {}).length} detectados</span>
                            </div>
                          </div>

                          <div className="flex gap-2 items-start bg-amber-950/20 border border-amber-900/30 p-2 rounded text-[10.5px] text-amber-400">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Atención: Al confirmar se reemplazará toda la configuración de dispositivos, auditorías e historiales actuales de forma inmediata.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative pt-3">
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/10 hover:bg-slate-900/30 rounded-lg p-6 cursor-pointer transition-all group">
                            <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-xs font-semibold text-slate-300 mt-2">Haga clic para examinar</span>
                            <span className="text-[10px] text-slate-500 mt-1">Soporta archivos .json de NetMonitor</span>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleFileImport}
                              className="hidden"
                            />
                          </label>
                          {importError && (
                            <p className="text-[10px] text-rose-400 font-mono mt-1.5 text-center bg-rose-950/25 border border-rose-900/30 rounded px-2 py-0.5">{importError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {pendingBackup ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPendingBackup(null); setImportError(null); }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 py-2 rounded-md text-xs font-bold cursor-pointer transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={confirmRestore}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/20"
                        >
                          <Check className="h-4 w-4" />
                          Confirmar
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[10px] text-slate-500 italic">
                        Cargue un archivo para habilitar la restauración del sistema.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FACTORY RESET CARD */}
              {!isRestoreSuccess && !isResetSuccess && (
                <div className="border border-rose-500/20 bg-rose-950/5 rounded-lg p-5 mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-950/45 border border-rose-800/30 text-rose-400 rounded-sm">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Zona de Peligro: Restablecimiento de Fábrica</h4>
                      <p className="text-xs text-slate-400 max-w-4xl">
                        Esta acción es de carácter destructivo. Limpia de forma completa y definitiva todos los historiales de pruebas de velocidad, auditorías archivadas, dispositivos locales configurados, nombres personalizados de MAC e IP, y ajustes visuales de la aplicación.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2 border-t border-slate-900">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Para continuar, escriba la palabra <span className="text-rose-400 font-bold">CONFIRMAR</span> abajo:</label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Escriba CONFIRMAR aquí..."
                        className="bg-slate-950 text-slate-200 border border-slate-800 rounded-md px-3 py-1.5 text-xs focus:outline-hidden focus:border-rose-500 font-mono w-full md:max-w-xs placeholder-slate-700 uppercase"
                      />
                    </div>

                    <button
                      disabled={confirmText.trim().toUpperCase() !== 'CONFIRMAR'}
                      onClick={handleFactoryReset}
                      className="bg-rose-900/30 hover:bg-rose-600 disabled:bg-slate-900 disabled:text-slate-500 text-rose-200 hover:text-white disabled:border-slate-850 font-bold py-2 px-4 rounded-md border border-rose-850 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none md:mt-5"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Restablecer Consola de Fábrica
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
