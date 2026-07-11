import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, CheckCircle2, AlertTriangle, Key, 
  User, ArrowRight, UserPlus, Shield, Sparkles, Server, Terminal, Network, Info, ShieldCheck,
  Copy, Check, HelpCircle, ArrowLeft
} from 'lucide-react';

export const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: 'Sin ingresar', color: 'bg-slate-800', textColor: 'text-slate-500', width: 'w-0' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Muy Débil', color: 'bg-rose-500', textColor: 'text-rose-400', width: 'w-1/5' };
    case 2:
      return { score: 2, label: 'Débil', color: 'bg-orange-500', textColor: 'text-orange-400', width: 'w-2/5' };
    case 3:
      return { score: 3, label: 'Aceptable (Estándar)', color: 'bg-amber-500', textColor: 'text-amber-400', width: 'w-3/5' };
    case 4:
      return { score: 4, label: 'Fuerte (Segura)', color: 'bg-cyan-500', textColor: 'text-cyan-400', width: 'w-4/5' };
    case 5:
    default:
      return { score: 5, label: 'Excelente (Militar)', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: 'w-full' };
  }
};

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

  // Password recovery states
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryQuestionText, setRecoveryQuestionText] = useState('');
  const [hasRecoveryQuestion, setHasRecoveryQuestion] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryMethod, setRecoveryMethod] = useState<'question' | 'key'>('question');

  // Setup security recovery configuration
  const [setupQuestion, setSetupQuestion] = useState('Nombre de tu primera mascota');
  const [setupAnswer, setSetupAnswer] = useState('');
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isSetupNeeded) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let key = 'RM-';
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 2) key += '-';
      }
      setGeneratedRecoveryKey(key);
    }
  }, [isSetupNeeded]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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

    if (!setupAnswer.trim()) {
      setError('Por favor ingrese una respuesta para la pregunta de seguridad.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          fullName,
          securityQuestion: setupQuestion,
          securityAnswer: setupAnswer,
          recoveryKey: generatedRecoveryKey
        })
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

  // Handle Recovery Step 1: Check Username
  const handleRecoveryCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUsername.trim()) {
      setError('Por favor ingrese su nombre de usuario.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/auth/recovery-question?username=${encodeURIComponent(recoveryUsername)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo verificar el usuario.');
      }

      setHasRecoveryQuestion(data.hasQuestion);
      if (data.hasQuestion) {
        setRecoveryQuestionText(data.securityQuestion);
        setRecoveryMethod('question');
      } else {
        setRecoveryQuestionText('');
        setRecoveryMethod('key');
      }
      setRecoveryStep(2);
    } catch (err: any) {
      setError(err.message || 'Error al verificar el usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Recovery Step 2: Reset Password
  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryMethod === 'question' && !recoveryAnswerInput.trim()) {
      setError('Por favor ingrese la respuesta a su pregunta de seguridad.');
      return;
    }
    if (recoveryMethod === 'key' && !recoveryKeyInput.trim()) {
      setError('Por favor ingrese su clave de recuperación maestra.');
      return;
    }
    if (!recoveryNewPassword || !recoveryConfirmPassword) {
      setError('Por favor complete todos los campos de contraseña.');
      return;
    }
    if (recoveryNewPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    // Validar nivel de seguridad de la nueva contraseña
    const strength = getPasswordStrength(recoveryNewPassword);
    if (strength.score < 3) {
      setError('Contraseña demasiado débil por directivas de seguridad corporativa. Debe incluir números, letras mayúsculas o caracteres especiales.');
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Sanitizar la respuesta de seguridad para evitar fallas por mayúsculas/minúsculas o espacios extra
      const sanitizedAnswer = recoveryMethod === 'question' 
        ? recoveryAnswerInput.trim().toLowerCase() 
        : undefined;

      const res = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: recoveryUsername,
          securityAnswer: sanitizedAnswer,
          recoveryKey: recoveryMethod === 'key' ? recoveryKeyInput.trim() : undefined,
          newPassword: recoveryNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }

      setSuccessMsg('¡Contraseña restablecida con éxito! Ya puede iniciar sesión.');
      onAddLog(`🔐 Contraseña restablecida con éxito para el usuario "${recoveryUsername}".`, 'info');
      
      setTimeout(() => {
        setIsRecoveryMode(false);
        setRecoveryStep(1);
        setRecoveryUsername('');
        setRecoveryAnswerInput('');
        setRecoveryKeyInput('');
        setRecoveryNewPassword('');
        setRecoveryConfirmPassword('');
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
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

                {/* CONFIGURACIÓN DE RECUPERACIÓN */}
                <div className="border-t border-slate-800/60 pt-4 mt-2 space-y-4">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Seguridad de Recuperación
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Establezca estos datos por seguridad. En caso de olvidar su contraseña, podrá restablecerla utilizando esta pregunta o la clave maestra.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Pregunta de Seguridad
                    </label>
                    <select
                      value={setupQuestion}
                      onChange={(e) => setSetupQuestion(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="Nombre de tu primera mascota">Nombre de tu primera mascota</option>
                      <option value="Ciudad donde nació tu madre">Ciudad donde nació tu madre</option>
                      <option value="Nombre de tu primera escuela">Nombre de tu primera escuela</option>
                      <option value="Modelo de tu primer coche">Modelo de tu primer coche</option>
                      <option value="Tu comida favorita de la infancia">Tu comida favorita de la infancia</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Respuesta de Seguridad
                    </label>
                    <input
                      type="text"
                      required
                      value={setupAnswer}
                      onChange={(e) => setSetupAnswer(e.target.value)}
                      placeholder="Ingrese la respuesta secreta"
                      className="w-full bg-slate-900/80 border border-slate-800 rounded p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Clave Maestra de Recuperación</span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedKey ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="font-mono text-center text-xs text-white bg-[#020617] py-2 rounded select-all border border-slate-800 tracking-wider">
                      {generatedRecoveryKey}
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Guarde esta clave en un lugar seguro. Es única para su servidor.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/40 text-[#020617] font-bold py-3 px-4 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
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
            ) : isRecoveryMode ? (
              /* ================= PASSWORD RECOVERY FORM ================= */
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoveryMode(false);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <ArrowLeft className="h-4 w-4" /> Volver al Inicio
                  </button>
                </div>

                {recoveryStep === 1 ? (
                  <form onSubmit={handleRecoveryCheckUser} className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ingrese su nombre de usuario de RedMonitor para iniciar el proceso de recuperación de credenciales.
                    </p>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Nombre de Usuario
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isLoading}
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        placeholder="Ingrese su usuario"
                        className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/40 text-[#020617] font-bold py-3 px-4 rounded text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin"></span>
                          Buscando usuario...
                        </span>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRecoveryReset} className="space-y-4">
                    {/* Selección de Método de Recuperación si el usuario tiene pregunta de seguridad configurada */}
                    {hasRecoveryQuestion && (
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded border border-slate-850">
                        <button
                          type="button"
                          onClick={() => setRecoveryMethod('question')}
                          className={`py-1.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            recoveryMethod === 'question'
                              ? 'bg-cyan-500 text-[#020617]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Pregunta de Seguridad
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecoveryMethod('key')}
                          className={`py-1.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                            recoveryMethod === 'key'
                              ? 'bg-cyan-500 text-[#020617]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Clave Maestra
                        </button>
                      </div>
                    )}

                    {recoveryMethod === 'question' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-cyan-950/20 border border-cyan-500/15 rounded text-xs text-slate-300 space-y-1">
                          <span className="text-[9px] uppercase font-mono tracking-wider font-semibold text-cyan-400">Pregunta:</span>
                          <p className="font-medium text-white">{recoveryQuestionText}</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Su Respuesta
                          </label>
                          <input
                            type="text"
                            required
                            disabled={isLoading}
                            value={recoveryAnswerInput}
                            onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                            placeholder="Ingrese su respuesta"
                            className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Key className="h-3 w-3 text-amber-400" /> Clave de Recuperación Maestra
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isLoading}
                          value={recoveryKeyInput}
                          onChange={(e) => setRecoveryKeyInput(e.target.value)}
                          placeholder="ej: RM-XXXX-XXXX-XXXX"
                          className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono tracking-wider"
                        />
                      </div>
                    )}

                    <div className="border-t border-slate-800/60 pt-3 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          required
                          disabled={isLoading}
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />

                        {/* PASSWORD STRENGTH VISUAL METER */}
                        {recoveryNewPassword && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span className="text-slate-400 uppercase">Fortaleza:</span>
                              <span className={`font-bold uppercase ${getPasswordStrength(recoveryNewPassword).textColor}`}>
                                {getPasswordStrength(recoveryNewPassword).label}
                              </span>
                            </div>
                            <div className="h-1 w-full bg-slate-950 rounded overflow-hidden flex">
                              <div 
                                className={`h-full transition-all duration-300 ${getPasswordStrength(recoveryNewPassword).color} ${getPasswordStrength(recoveryNewPassword).width}`}
                              />
                            </div>
                            {/* Requisitos de seguridad interactivos */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[8.5px] font-mono text-slate-400">
                              <div className="flex items-center gap-1">
                                <span className={recoveryNewPassword.length >= 8 ? "text-emerald-400" : "text-slate-500"}>
                                  {recoveryNewPassword.length >= 8 ? '✓' : '•'} 8+ caracteres
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={/[A-Z]/.test(recoveryNewPassword) ? "text-emerald-400" : "text-slate-500"}>
                                  {/[A-Z]/.test(recoveryNewPassword) ? '✓' : '•'} Mayúscula [A-Z]
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={/[0-9]/.test(recoveryNewPassword) ? "text-emerald-400" : "text-slate-500"}>
                                  {/[0-9]/.test(recoveryNewPassword) ? '✓' : '•'} Número [0-9]
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={/[^A-Za-z0-9]/.test(recoveryNewPassword) ? "text-emerald-400" : "text-slate-500"}>
                                  {/[^A-Za-z0-9]/.test(recoveryNewPassword) ? '✓' : '•'} Símbolo (!@#$)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Confirmar Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          required
                          disabled={isLoading}
                          value={recoveryConfirmPassword}
                          onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                          placeholder="Repita nueva contraseña"
                          className="w-full bg-slate-900/80 border border-slate-800 rounded p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-cyan-500/30 disabled:to-blue-600/30 text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Procesando restablecimiento...
                        </span>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Restablecer Contraseña
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(true);
                        setRecoveryStep(1);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer hover:underline"
                    >
                      ¿Olvidó su contraseña?
                    </button>
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
