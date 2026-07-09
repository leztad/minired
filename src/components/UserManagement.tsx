import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Trash2, Key, Shield, User, Clock, AlertTriangle, 
  CheckCircle2, ShieldAlert, RefreshCw, Server
} from 'lucide-react';

interface DBUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'auditor';
  createdAt: string;
}

interface UserManagementProps {
  authToken: string;
  currentUsername: string;
  onAddLog: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function UserManagement({ authToken, currentUsername, onAddLog }: UserManagementProps) {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'auditor'>('auditor');

  const fetchUsers = async () => {
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
  }, [authToken]);

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

  const handleDeleteUser = async (id: string, name: string) => {
    if (name.trim().toLowerCase() === currentUsername.trim().toLowerCase()) {
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

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div className="bg-[#0b1329]/40 border border-slate-800/60 p-4 rounded-md flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2 text-cyan-400 uppercase tracking-wider">
            <Shield className="h-4.5 w-4.5" />
            Consola de Gestión de Usuarios y Permisos
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cree, modifique y elimine credenciales de acceso para auditores y administradores del sistema RedMonitor.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-cyan-400 border border-slate-850 cursor-pointer"
          title="Actualizar lista de usuarios"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {success && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CREATE USER FORM */}
        <div className="bg-[#0b1329]/50 border border-slate-800/60 p-5 rounded-md shadow-lg space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-850 pb-2 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-cyan-400" />
            Registrar Nuevo Usuario
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
              <label className="text-[10px] font-bold uppercase text-slate-400">Contraseña Temporal</label>
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
                  <span>Auditor</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="accent-cyan-500"
                  />
                  <span>Administrador</span>
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
                  <th className="py-2.5 px-3">Creado el</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      {isLoading ? 'Cargando usuarios...' : 'No hay usuarios configurados en el sistema.'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.username.toLowerCase() === currentUsername.toLowerCase();
                    return (
                      <tr 
                        key={u.id} 
                        className={`hover:bg-slate-900/30 transition-colors ${
                          isSelf ? 'bg-cyan-500/5' : ''
                        }`}
                      >
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
                        <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {new Date(u.createdAt).toLocaleDateString('es-ES')} {new Date(u.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-950/15 border border-amber-500/10 rounded flex items-start gap-2 text-[10px] text-amber-300 leading-tight">
            <span className="text-xs">💡</span>
            <p>
              <strong className="text-amber-200">Importante sobre Roles de Seguridad:</strong> Los usuarios con rol <strong className="text-slate-100">"Administrador"</strong> gozan de privilegios plenos incluyendo gestión de usuarios y herramientas de diagnóstico destructivas. Los <strong className="text-slate-100">"Auditores"</strong> tienen privilegios de lectura, escaneos y generación de informes de subred, pero no pueden alterar cuentas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
