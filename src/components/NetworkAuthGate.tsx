import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, CheckCircle2, AlertTriangle, Key, 
  User, ArrowRight, UserPlus, Shield, Sparkles, Server, Terminal, Network, Info, ShieldCheck
} from 'lucide-react';

interface NetworkAuthGateProps {
  onAuthenticated: (token: string, user: { username: string; fullName: string; role: 'admin' | 'auditor' }) => void;
  onAddLog: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function NetworkAuthGate({ onAuthenticated, onAddLog }: NetworkAuthGateProps) {
  const [isSetupNeeded, setIsSetupNeeded] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Check setup status on load
  const checkSetupStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/setup-needed');
      if (!res.ok) throw new Error('No se pudo verificar el estado del servidor.');
      const data = await res.json();
      setIsSetupNeeded(data.setupNeeded);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el backend de RedMonitor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSetupStatus();
  }, []);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nombre de usuario o contraseña incorrectos.');
      }

      onAddLog(`🔑 Inicio de sesión exitoso: Bienvenido ${data.user.fullName} (${data.user.role})`, 'success');
      onAuthenticated(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Error al intentar iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !fullName.trim()) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la cuenta del administrador.');
      }

      setSuccessMsg('¡Administrador creado con éxito!');
      onAddLog(`👑 Asistente Inicial Completado: Cuenta Administrador "${username}" configurada correctamente.`, 'success');
      
      setTimeout(() => {
        onAuthenticated(data.token, data.user);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración inicial.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSetupNeeded === null && isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans p-6 text-slate-100">
        <div className="space-y-4 text-center max-w-sm">
          <div className="relative mx-auto w-16 h-16 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-lg">
            <Network className="h-8 w-8 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-sm font-mono tracking-wider text-cyan-400">INICIALIZANDO CONEXIÓN SEGURA...</p>
          <div className="w-48 h-1 bg-slate-900 mx-auto rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-cyan-500 animate-infinite-loading w-2/3 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden flex items-center justify-center font-sans p-4 md:p-8">
      {/* Dynamic scan line background effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)]"></div>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,30,58,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,30,58,0.1)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="w-full max-w-md relative z-10 transition-all">
        {/* LOGO & BRAND */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0b1329]/80 border border-cyan-500/20 rounded-full text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            SISTEMA AUDITOR DE REDES
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <Network className="h-7 w-7 text-cyan-400" />
            Red<span className="text-cyan-400">Monitor</span>
          </h1>
          <p className="text-xs text-slate-400">Consola Centralizada de Auditoría y Diagnóstico de Redes L2/L3</p>
        </div>

        {/* CONTAINER CARD */}
        <div className="bg-[#0b1528]/85 border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
          {/* TOP SECURE BADGE HEADER */}
          <div className="px-5 py-4 bg-[#0e1b35] border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-wider">
                {isSetupNeeded ? 'Configuración de Primer Uso' : 'Autenticación Requerida'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#1a2e54] text-cyan-300 font-mono text-[9px] px-2 py-0.5 rounded border border-cyan-500/20">
              <Lock className="h-2.5 w-2.5" /> SSL ACTIVE
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Success banner */}
            {successMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded text-xs text-rose-400 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Error de Acceso</p>
                  <p className="text-slate-300 leading-normal">{error}</p>
                </div>
              </div>
            )}

            {isSetupNeeded ? (
              /* ================= FIRST USE SETUP FORM ================= */
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded text-[11px] leading-relaxed text-slate-300 flex items-start gap-2">
                  <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    Bienvenido a <strong className="text-white font-semibold">RedMonitor</strong>. No se detectan cuentas de usuario configuradas en el servidor. Configure la cuenta del <strong className="text-cyan-400">Super Administrador</strong> inicial para asegurar la consola.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: admin, auditor_jefe"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Nombre Completo / Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ej: Ing. Carlos Ortega - TI"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Key className="h-3 w-3" /> Contraseña
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      className="w-full bg-slate-900/80 border border-slate-800 rounded p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Confirmar Contraseña
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita contraseña"
                      className="w-full bg-slate-900/80 border border-slate-800 rounded p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={() => setShowPassword(!showPassword)}
                      className="rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                    />
                    Mostrar Contraseña
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/40 text-[#020617] font-bold py-3 px-4 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin"></span>
                      Guardando y Creando...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Inicializar Administrador y Entrar
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ================= STANDARD LOGIN FORM ================= */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Key className="h-3 w-3" /> Contraseña
                    </label>
                  </div>
                  <input
                    type="password"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-cyan-500/30 disabled:to-blue-600/30 text-white font-bold py-3.5 px-4 rounded text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Verificando credenciales...
                    </span>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Iniciar Sesión Autorizada
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* BOTTOM METADATA/INFO */}
        <div className="mt-4 text-center text-[10px] text-slate-500 font-mono space-y-1">
          <p>RedMonitor Central Node Router v2.9.14</p>
          <p>Capa de Autenticación de Sistemas Locales SHA-512 / PBKDF2 Enabled</p>
        </div>
      </div>
    </div>
  );
}
