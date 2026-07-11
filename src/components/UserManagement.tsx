import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Trash2, Key, Shield, User, Clock, AlertTriangle, 
  CheckCircle2, ShieldAlert, RefreshCw, Lock, Unlock, Settings, Eye, EyeOff,
  Cpu, Server, Activity, Terminal, Brain, Gauge, ShieldCheck, Layers, HelpCircle,
  Copy, Check
} from 'lucide-react';

interface DBUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'auditor';
  createdAt: string;
  hasSecurityQuestion?: boolean;
  hasRecoveryKey?: boolean;
}

interface UserManagementProps {
  authToken: string;
  currentUser: { username: string; fullName: string; role: 'admin' | 'auditor' };
  onAddLog: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  enabledFeatures: Record<string, boolean>;
  onUpdateFeatures: (features: Record<string, boolean>) => void;
}

export const AVAILABLE_FEATURES = [
  { key: 'sensores', label: 'Monitoreo de Sondas y Sensores', icon: Cpu, category: 'Hardware & IoT', desc: 'Monitoreo en tiempo real de sondas de temperatura, ping ICMP, puertos y servicios HTTP.' },
  { key: 'dispositivos', label: 'Gestión de Dispositivos e IPs', icon: Server, category: 'Hosts & Equipos', desc: 'Inventario interactivo de hosts, direcciones IP/MAC, marcas OUI y auditoría de red.' },
  { key: 'ancho_banda', label: 'Gráficos de Ancho de Banda', icon: Activity, category: 'Tráfico en Vivo', desc: 'Graficador dinámico del consumo instantáneo en megabits (Mbps) por cada equipo.' },
  { key: 'testeo', label: 'Consola de Pruebas y Diagnóstico', icon: Terminal, category: 'Herramientas de Red', desc: 'Herramientas interactivas para trazas Ping, Traceroute y escaneo de puertos TCP abiertos.' },
  { key: 'ai_diagnostic', label: 'Copiloto de Inteligencia Artificial', icon: Brain, category: 'IA & Automatización', desc: 'Sugerencias de optimización y diagnósticos inteligentes de red utilizando el modelo Gemini.' },
  { key: 'speed_test', label: 'Test de Velocidad de Canal', icon: Gauge, category: 'Rendimiento', desc: 'Medición de velocidad local, jitter, pérdidas de paquetes y latencia WAN.' },
  { key: 'auditorias_red', label: 'Auditorías y Reportes de Seguridad', icon: ShieldCheck, category: 'Seguridad Informática', desc: 'Escaneo automatizado de vulnerabilidades y buenas prácticas recomendadas por expertos.' },
  { key: 'diseno_red', label: 'Planificador y Topología (L2/L3)', icon: Layers, category: 'Diseño Corporativo', desc: 'Planificación de subredes CIDR, diagramas de topología y mapeo lógico de routers/switches.' },
  { key: 'event_logger', label: 'Consola de Syslog / Eventos', icon: Terminal, category: 'Bitácora general', desc: 'Historial detallado en tiempo real de caídas de enlaces, accesos de usuarios y alertas.' },
  { key: 'wiki_soporte', label: 'Base de Conocimientos y Wiki', icon: HelpCircle, category: 'Wiki Soporte', desc: 'Glosario completo de redes y telecomunicaciones con guías paso a paso para el operador.' }
];

export default function UserManagement({ authToken, currentUser, onAddLog, enabledFeatures, onUpdateFeatures }: UserManagementProps) {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'gestion' | 'vistas'>(
    currentUser.role === 'admin' ? 'gestion' : 'perfil'
  );

  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>({ ...enabledFeatures });

  useEffect(() => {
    setLocalFeatures({ ...enabledFeatures });
  }, [enabledFeatures]);

  // Own Password Change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingOwnPass, setIsChangingOwnPass] = useState(false);
  const [showOwnPass, setShowOwnPass] = useState(false);

  // New user form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'auditor'>('auditor');

  // Admin Force password change states (for resetting other users' keys)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [adminForceNewPass, setAdminForceNewPass] = useState('');

  // Own Account Recovery states
  const [personalQuestion, setPersonalQuestion] = useState('Nombre de tu primera mascota');
  const [personalAnswer, setPersonalAnswer] = useState('');
  const [personalRecoveryKey, setPersonalRecoveryKey] = useState('');
  const [personalHasQuestion, setPersonalHasQuestion] = useState(false);
  const [personalHasKey, setPersonalHasKey] = useState(false);
  const [personalQuestionText, setPersonalQuestionText] = useState('');
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);
  const [copiedPersonalKey, setCopiedPersonalKey] = useState(false);

  const fetchRecoveryInfo = async () => {
    try {
      const res = await fetch('/api/auth/recovery-info', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error('No se pudo obtener información de recuperación.');
      }
      const data = await res.json();
      setPersonalHasQuestion(data.hasQuestion);
      setPersonalHasKey(data.hasRecoveryKey);
      if (data.hasQuestion && data.securityQuestion) {
        setPersonalQuestionText(data.securityQuestion);
        setPersonalQuestion(data.securityQuestion);
      }
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const fetchUsers = async () => {
    if (currentUser.role !== 'admin') return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudieron cargar los usuarios.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [authToken, currentUser.role]);

  useEffect(() => {
    if (activeTab === 'perfil') {
      fetchRecoveryInfo();
    }
  }, [activeTab, authToken]);

  const handleGeneratePersonalKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'RM-';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 2) key += '-';
    }
    setPersonalRecoveryKey(key);
  };

  const handleCopyPersonalKey = () => {
    if (!personalRecoveryKey) return;
    navigator.clipboard.writeText(personalRecoveryKey);
    setCopiedPersonalKey(true);
    setTimeout(() => setCopiedPersonalKey(false), 2000);
  };

  const handleUpdateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!personalAnswer.trim()) {
      setError('Por favor ingrese una respuesta para la pregunta de seguridad.');
      return;
    }

    try {
      setIsSavingRecovery(true);
      const res = await fetch('/api/auth/update-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          securityQuestion: personalQuestion,
          securityAnswer: personalAnswer,
          recoveryKey: personalRecoveryKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la configuración de recuperación.');
      }

      setSuccess('Configuración de recuperación de cuenta actualizada correctamente.');
      onAddLog('🔐 Configuración de recuperación de cuenta de usuario actualizada.', 'success');
      setPersonalAnswer('');
      setPersonalRecoveryKey('');
      fetchRecoveryInfo();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al actualizar los datos de recuperación.');
    } finally {
      setIsSavingRecovery(false);
    }
  };

  // Handle own password change
  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Por favor complete todos los campos de contraseña.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsChangingOwnPass(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      }

      setSuccess('Su contraseña ha sido actualizada con éxito.');
      onAddLog('🔐 Contraseña de usuario actualizada exitosamente por el propietario.', 'success');
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al cambiar la contraseña.');
    } finally {
      setIsChangingOwnPass(false);
    }
  };

  // Handle administrator creating new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !fullName.trim() || !role) {
      setError('Por favor complete todos los campos.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ username, password, fullName, role })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el usuario.');
      }

      setSuccess(`Usuario "${username}" creado exitosamente.`);
      onAddLog(`👤 Nuevo usuario creado: "${username}" con rol ${role}.`, 'success');
      
      // Reset form
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('auditor');
      
      // Refresh list
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el nuevo usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle administrator deleting user
  const handleDeleteUser = async (id: string, name: string) => {
    if (name.trim().toLowerCase() === currentUser.username.trim().toLowerCase()) {
      setError('No puedes eliminar tu propio usuario activo en esta sesión.');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente al usuario "${name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al intentar eliminar el usuario.');
      }

      setSuccess(`Usuario "${name}" eliminado correctamente.`);
      onAddLog(`🗑️ Usuario eliminado del sistema: "${name}"`, 'warning');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al intentar eliminar el usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle admin forcing password reset for another user
  const handleAdminForceReset = async (userId: string, targetUsername: string) => {
    if (!adminForceNewPass || adminForceNewPass.length < 6) {
      setError('La contraseña de restablecimiento debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/auth/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ userId, newPassword: adminForceNewPass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }

      setSuccess(`Contraseña del usuario "${targetUsername}" restablecida exitosamente.`);
      onAddLog(`🔑 Administrador restableció la contraseña del usuario: "${targetUsername}"`, 'info');
      setEditingUserId(null);
      setAdminForceNewPass('');
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña del usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div className="bg-[#0b1329]/40 border border-slate-800/60 p-4 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2 text-cyan-400 uppercase tracking-wider">
            <Settings className="h-4.5 w-4.5 animate-spin-slow" />
            Configuración de Accesos y Seguridad
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gestione sus credenciales de acceso personales y administre los usuarios autorizados de la plataforma.
          </p>
        </div>
        {currentUser.role === 'admin' && activeTab === 'gestion' && (
          <button
            onClick={fetchUsers}
            className="self-start md:self-center p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-cyan-400 border border-slate-850 cursor-pointer flex items-center gap-1.5 text-[10px] font-mono uppercase"
            title="Actualizar lista de usuarios"
          >
            <RefreshCw className="h-3 w-3" />
            Sincronizar
          </button>
        )}
      </div>

      {/* TAB SELECTOR */}
      <div className="flex border-b border-slate-800/80 gap-1.5">
        <button
          onClick={() => {
            setActiveTab('perfil');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'perfil'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Mi Perfil y Contraseña
        </button>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => {
              setActiveTab('gestion');
              setError(null);
              setSuccess(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gestion'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Consola de Usuarios ({users.length})
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab('vistas');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'vistas'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Módulos Visibles
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {success && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 animate-bounce" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: OWN PROFILE & PASSWORD CHANGE */}
      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PROFILE CARD */}
          <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              Detalles del Operador Activo
            </h3>
            
            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-850/50">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Nombre Completo:</span>
                <span className="text-slate-200 font-sans font-semibold">{currentUser.fullName}</span>
              </div>
              
              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-850/50">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Nombre de Usuario (Login):</span>
                <span className="text-cyan-400 font-bold">{currentUser.username}</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded border border-slate-850/50">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Rango de Acceso:</span>
                <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase px-2 py-0.5 mt-1 rounded border ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                }`}>
                  <Shield className="h-3 w-3" />
                  {currentUser.role === 'admin' ? 'Administrador Pleno' : 'Auditor de Red'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-cyan-950/10 border border-cyan-500/10 rounded text-[10px] text-cyan-300 leading-tight">
              <p>
                <strong>Sesión Segura:</strong> Sus credenciales se transmiten encriptadas por canales seguros y su sesión caduca automáticamente tras inactividad. Recomiende cambiar su clave cada 90 días.
              </p>
            </div>
          </div>

          {/* PASSWORD CHANGE FORM */}
          <div className="md:col-span-2 bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md space-y-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-850 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4 text-cyan-400" />
                Actualizar Clave de Acceso Personal
              </span>
              <button
                type="button"
                onClick={() => setShowOwnPass(!showOwnPass)}
                className="text-slate-400 hover:text-cyan-400 text-[10px] font-mono flex items-center gap-1"
              >
                {showOwnPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showOwnPass ? 'Ocultar' : 'Mostrar'} claves
              </button>
            </h3>

            <form onSubmit={handleChangeOwnPassword} className="space-y-4 text-xs max-w-md">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Contraseña Actual</label>
                <input
                  type={showOwnPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su clave vigente"
                  className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Nueva Contraseña</label>
                  <input
                    type={showOwnPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Confirmar Nueva Contraseña</label>
                  <input
                    type={showOwnPass ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingOwnPass}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 text-[#020617] font-bold py-2 px-4 rounded uppercase tracking-wider text-[10px] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isChangingOwnPass ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                Actualizar Mi Contraseña
              </button>
            </form>

            {/* SECCIÓN ADICIONAL DE OPCIONES DE RECUPERACIÓN */}
            <div className="border-t border-slate-800/80 pt-5 mt-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                Opciones de Recuperación de Cuenta
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal max-w-xl">
                Configure sus métodos de recuperación en caso de olvido. Al habilitar estos métodos, podrá usar tanto la pregunta secreta como una Clave Maestra de Recuperación para restablecer su contraseña de forma segura.
              </p>

              {/* Badges de estado actual */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-[#0b1329]/80 border border-slate-850 p-3 rounded-lg flex items-center gap-2.5 flex-1 min-w-[200px]">
                  <HelpCircle className="h-5 w-5 text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Pregunta de Seguridad:</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${personalHasQuestion ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {personalHasQuestion ? (
                        <>✓ Configurada: "{personalQuestionText}"</>
                      ) : (
                        <>✗ No Configurada</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0b1329]/80 border border-slate-850 p-3 rounded-lg flex items-center gap-2.5 flex-1 min-w-[200px]">
                  <Key className="h-5 w-5 text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Clave Maestra:</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${personalHasKey ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {personalHasKey ? (
                        <>✓ Vinculada al Servidor</>
                      ) : (
                        <>✗ No Vinculada</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulario de actualización */}
              <form onSubmit={handleUpdateRecovery} className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-md space-y-4 text-xs max-w-xl">
                <h4 className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider">
                  Actualizar Métodos de Recuperación
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Pregunta de Seguridad</label>
                    <select
                      value={personalQuestion}
                      onChange={(e) => setPersonalQuestion(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-850 rounded p-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      <option value="Nombre de tu primera mascota">Nombre de tu primera mascota</option>
                      <option value="Ciudad donde nació tu madre">Ciudad donde nació tu madre</option>
                      <option value="Nombre de tu primera escuela">Nombre de tu primera escuela</option>
                      <option value="Modelo de tu primer coche">Modelo de tu primer coche</option>
                      <option value="Tu comida favorita de la infancia">Tu comida favorita de la infancia</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Respuesta de Seguridad</label>
                    <input
                      type="text"
                      required
                      value={personalAnswer}
                      onChange={(e) => setPersonalAnswer(e.target.value)}
                      placeholder="Ingrese la respuesta secreta"
                      className="w-full bg-[#020617] border border-slate-850 rounded p-2 text-white placeholder-slate-650 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-850/80 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Clave Maestra de Recuperación (Opcional)</span>
                    <button
                      type="button"
                      onClick={handleGeneratePersonalKey}
                      className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider"
                    >
                      {personalRecoveryKey ? 'Re-Generar Clave' : 'Generar Clave Maestra'}
                    </button>
                  </div>

                  {personalRecoveryKey ? (
                    <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-amber-400 uppercase font-bold">¡Guarde esta nueva clave segura!</span>
                        <button
                          type="button"
                          onClick={handleCopyPersonalKey}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedPersonalKey ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedPersonalKey ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <div className="font-mono text-center text-xs text-white bg-[#020617] py-2 rounded border border-slate-850 select-all tracking-wider">
                        {personalRecoveryKey}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-550 leading-normal">
                      Si lo desea, genere una nueva clave de recuperación y descárguela en un sitio seguro. De lo contrario, se mantendrá su clave anterior.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingRecovery}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 text-[#020617] font-bold py-2 px-4 rounded uppercase tracking-wider text-[10px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {isSavingRecovery ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Guardar Cambios de Recuperación
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM ADMIN USER CREATION & MANAGEMENT */}
      {activeTab === 'gestion' && currentUser.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CREATE USER FORM */}
          <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md shadow-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              Registrar Nuevo Operador
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: auditor_red, supervisor2"
                  className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej: Ing. Mario Silva"
                  className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Contraseña de Acceso</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-850 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Rol del Sistema</label>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'auditor'}
                      onChange={() => setRole('auditor')}
                      className="accent-cyan-500"
                    />
                    <span>Auditor (Lectura / Diagnósticos)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="accent-cyan-500"
                    />
                    <span>Administrador (Privilegios Plenos)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 text-[#020617] font-bold py-2 px-3 rounded uppercase tracking-wider text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Guardar Nuevo Usuario
              </button>
            </form>
          </div>

          {/* ACTIVE USERS TABLE */}
          <div className="lg:col-span-2 bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md shadow-lg space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-850 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" />
                Lista de Usuarios con Acceso Registrado
              </span>
              <span className="bg-[#122543] border border-cyan-500/20 text-[9px] font-mono text-cyan-300 px-2 py-0.5 rounded">
                {users.length} {users.length === 1 ? 'Usuario' : 'Usuarios'}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">Usuario (Login)</th>
                    <th className="py-2.5 px-3">Nombre Completo</th>
                    <th className="py-2.5 px-3 text-center">Rol</th>
                    <th className="py-2.5 px-3 text-center">Seguridad</th>
                    <th className="py-2.5 px-3">Creado el</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                        {isLoading ? 'Cargando usuarios...' : 'No hay usuarios configurados en el sistema.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = u.username.toLowerCase() === currentUser.username.toLowerCase();
                      const isEditing = editingUserId === u.id;
                      
                      return (
                        <React.Fragment key={u.id}>
                          <tr className={`hover:bg-slate-900/30 transition-colors ${isSelf ? 'bg-cyan-500/5' : ''}`}>
                            <td className="py-3 px-3 font-mono font-bold text-slate-200 flex items-center gap-1.5">
                              {u.username}
                              {isSelf && (
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[8px] uppercase px-1 py-0.2 rounded font-mono font-bold">
                                  TÚ
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300">{u.fullName}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                              }`}>
                                <Shield className="h-2.5 w-2.5" />
                                {u.role === 'admin' ? 'ADMIN' : 'AUDITOR'}
                              </span>
                            </td>
                            {/* SEGURIDAD DE RECUPERACIÓN */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span 
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full border cursor-help ${
                                    u.hasSecurityQuestion
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-500/70 border-amber-500/20'
                                  }`}
                                  title={u.hasSecurityQuestion ? 'Pregunta de seguridad configurada' : 'Sin pregunta de seguridad registrada'}
                                >
                                  <HelpCircle className="w-3 h-3" />
                                </span>
                                <span 
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full border cursor-help ${
                                    u.hasRecoveryKey
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-500/70 border-amber-500/20'
                                  }`}
                                  title={u.hasRecoveryKey ? 'Clave Maestra vinculada' : 'Sin clave de recuperación maestra registrada'}
                                >
                                  <Key className="w-3 h-3" />
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-500" />
                                {new Date(u.createdAt).toLocaleDateString('es-ES')} {new Date(u.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Admin force password change toggle button */}
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingUserId(null);
                                      setAdminForceNewPass('');
                                    } else {
                                      setEditingUserId(u.id);
                                      setAdminForceNewPass('');
                                    }
                                  }}
                                  disabled={isLoading}
                                  className={`p-1.5 rounded transition-colors border cursor-pointer ${
                                    isEditing 
                                      ? 'text-cyan-400 bg-cyan-950/25 border-cyan-500/30' 
                                      : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800 border-slate-850'
                                  }`}
                                  title="Forzar restablecimiento de contraseña"
                                >
                                  <Key className="h-3.5 w-3.5" />
                                </button>

                                {/* Delete user button */}
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={isSelf || isLoading}
                                  className={`p-1.5 rounded transition-colors border cursor-pointer ${
                                    isSelf 
                                      ? 'text-slate-600 border-transparent cursor-not-allowed'
                                      : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border-slate-850 hover:border-rose-500/30'
                                  }`}
                                  title={isSelf ? "No puedes eliminar tu propia sesión activa" : "Eliminar este usuario permanentemente"}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* INLINE ADMIN PASSWORD RESET SECTION */}
                          {isEditing && (
                            <tr className="bg-cyan-950/5">
                              <td colSpan={6} className="py-3 px-4 border-l-2 border-cyan-500 bg-[#070e1e]/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-cyan-400 animate-pulse" />
                                    <span>
                                      Restablecer contraseña para <strong className="text-cyan-400">"{u.username}"</strong>:
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                                    <input
                                      type="text"
                                      placeholder="Nueva contraseña (Mín. 6 caracteres)"
                                      value={adminForceNewPass}
                                      onChange={(e) => setAdminForceNewPass(e.target.value)}
                                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                                    />
                                    <button
                                      onClick={() => handleAdminForceReset(u.id, u.username)}
                                      disabled={isLoading || !adminForceNewPass}
                                      className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 text-[#020617] font-bold px-3 py-1.5 rounded uppercase tracking-wider text-[9px] transition-colors cursor-pointer"
                                    >
                                      Aplicar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingUserId(null);
                                        setAdminForceNewPass('');
                                      }}
                                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded uppercase tracking-wider text-[9px] transition-colors cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-950/15 border border-amber-500/10 rounded flex items-start gap-2 text-[10px] text-amber-300 leading-tight">
              <span className="text-xs">💡</span>
              <p>
                <strong className="text-amber-200">Privilegios Administrativos:</strong> Como Administrador, usted puede cambiar la clave de acceso de cualquier usuario inmediatamente sin necesidad de conocer su clave actual. Esto es útil en caso de extravío de credenciales o por auditorías periódicas de personal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VISIBLE FEATURES PREFERENCE PANEL */}
      {activeTab === 'vistas' && (
        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Settings className="h-4 w-4 text-cyan-400 animate-spin-slow" />
              Personalización de Vistas de Red
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Marque o desmarque los módulos del sistema para personalizar las secciones visibles en el menú de navegación lateral.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_FEATURES.map((feature) => {
              const IconComp = feature.icon;
              const isChecked = localFeatures[feature.key] !== false;
              return (
                <div 
                  key={feature.key}
                  onClick={() => {
                    setLocalFeatures(prev => ({
                      ...prev,
                      [feature.key]: !isChecked
                    }));
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-200 flex gap-3.5 items-start ${
                    isChecked 
                      ? 'bg-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50' 
                      : 'bg-slate-950/20 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="mt-0.5">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div click
                      className="accent-cyan-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <IconComp className={`h-4 w-4 ${isChecked ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="font-semibold text-xs text-slate-200">{feature.label}</span>
                      <span className="text-[8px] font-mono tracking-widest uppercase bg-slate-850 text-slate-400 border border-slate-800 px-1.5 py-0.2 rounded">
                        {feature.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-850 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] text-slate-400 italic">
              Las vistas no seleccionadas se ocultarán del menú principal, pero continuarán registrando información en segundo plano.
            </span>
            <button
              type="button"
              onClick={() => {
                onUpdateFeatures(localFeatures);
                setSuccess('Preferencias de visualización actualizadas con éxito.');
                onAddLog('🎨 Preferencias de interfaz de red actualizadas por el operador.', 'success');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-cyan-500 hover:bg-cyan-600 text-[#020617] font-bold py-2 px-5 rounded uppercase tracking-wider text-[10px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 self-end sm:self-auto"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aplicar Configuración de Vistas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
