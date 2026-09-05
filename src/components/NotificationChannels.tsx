import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, Plus, Trash2, CheckCircle2, AlertTriangle, 
  XCircle, RefreshCw, Radio, Settings, ShieldAlert, 
  ExternalLink, Copy, Check, MessageSquare, Terminal, Eye, EyeOff
} from 'lucide-react';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'telegram' | 'discord' | 'slack' | 'teams' | 'webhook';
  enabled: boolean;
  webhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  customHeaders?: Record<string, string>;
  triggers: {
    onDeviceDown: boolean;
    onDeviceRecovered: boolean;
    onHighLatency: boolean;
    onNewDevice: boolean;
    onSnmpThreshold: boolean;
  };
}

export interface NotificationDeliveryLog {
  id: string;
  channelId: string;
  channelName: string;
  channelType: string;
  title: string;
  severity: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

interface NotificationChannelsProps {
  onAddLog?: (msg: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function NotificationChannels({ onAddLog }: NotificationChannelsProps) {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [history, setHistory] = useState<NotificationDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'canales' | 'historial' | 'difusion'>('canales');

  // Broadcast states
  const [broadcastTitle, setBroadcastTitle] = useState('Aviso de Mantenimiento de Red');
  const [broadcastMessage, setBroadcastMessage] = useState('Se realizará una intervención técnica en los conmutadores de distribución en 15 minutos.');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'critical' | 'warning' | 'info'>('warning');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // New channel modal/form
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'telegram' | 'discord' | 'slack' | 'teams' | 'webhook'>('telegram');
  const [newChannelName, setNewChannelName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newTelegramToken, setNewTelegramToken] = useState('');
  const [newTelegramChatId, setNewTelegramChatId] = useState('');

  const loadChannels = async () => {
    try {
      const res = await fetch('/api/notifications/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (e) {
      console.error("Error loading notification channels:", e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/notifications/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Error loading delivery history:", e);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadChannels(), loadHistory()]).finally(() => setIsLoading(false));
  }, []);

  const saveChannelsToServer = async (updatedChannels: NotificationChannel[]) => {
    try {
      const res = await fetch('/api/notifications/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: updatedChannels })
      });
      if (res.ok) {
        setChannels(updatedChannels);
        if (onAddLog) onAddLog('Configuración de canales de alerta guardada exitosamente.', 'success');
      }
    } catch (e) {
      console.error("Error saving channels:", e);
    }
  };

  const toggleChannel = (id: string) => {
    const updated = channels.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
    saveChannelsToServer(updated);
  };

  const updateTrigger = (id: string, triggerKey: keyof NotificationChannel['triggers']) => {
    const updated = channels.map(c => {
      if (c.id === id) {
        return {
          ...c,
          triggers: {
            ...c.triggers,
            [triggerKey]: !c.triggers[triggerKey]
          }
        };
      }
      return c;
    });
    saveChannelsToServer(updated);
  };

  const updateField = (id: string, field: string, value: string) => {
    const updated = channels.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setChannels(updated);
  };

  const handleSaveField = () => {
    saveChannelsToServer(channels);
  };

  const deleteChannel = (id: string) => {
    if (!confirm('¿Desea eliminar este canal de notificación?')) return;
    const updated = channels.filter(c => c.id !== id);
    saveChannelsToServer(updated);
  };

  const testChannel = async (id: string) => {
    setTestingChannelId(id);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: id })
      });

      const log = await res.json();
      setTestResult({
        id,
        success: log.success,
        msg: log.success ? 'Mensaje entregado exitosamente al canal.' : `Fallo: ${log.error || 'Error desconocido'}`
      });
      loadHistory();
      if (onAddLog) {
        onAddLog(log.success ? `Prueba de alerta enviada a ${log.channelName}` : `Error en alerta a ${log.channelName}: ${log.error}`, log.success ? 'success' : 'error');
      }
    } catch (e: any) {
      setTestResult({ id, success: false, msg: e.message || 'Error de conexión' });
    } finally {
      setTestingChannelId(null);
    }
  };

  const handleAddChannel = () => {
    if (!newChannelName) return;

    const newChannel: NotificationChannel = {
      id: `chan-${Date.now()}`,
      name: newChannelName,
      type: newChannelType,
      enabled: true,
      webhookUrl: newWebhookUrl || undefined,
      telegramBotToken: newTelegramToken || undefined,
      telegramChatId: newTelegramChatId || undefined,
      triggers: {
        onDeviceDown: true,
        onDeviceRecovered: true,
        onHighLatency: true,
        onNewDevice: true,
        onSnmpThreshold: true
      }
    };

    const updated = [...channels, newChannel];
    saveChannelsToServer(updated);
    setIsAddingChannel(false);
    setNewChannelName('');
    setNewWebhookUrl('');
    setNewTelegramToken('');
    setNewTelegramChatId('');
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return;
    setIsBroadcasting(true);

    try {
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: {
            title: broadcastTitle,
            message: broadcastMessage,
            severity: broadcastSeverity,
            eventType: 'test',
            timestamp: new Date().toLocaleTimeString('es-ES')
          }
        })
      });

      const data = await res.json();
      if (onAddLog) {
        onAddLog(`Difusión transmitida a ${data.deliveredCount} canal(es) activo(s).`, 'success');
      }
      loadHistory();
      setActiveTab('historial');
    } catch (e: any) {
      if (onAddLog) onAddLog(`Fallo al enviar difusión: ${e.message}`, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/notifications/history', { method: 'DELETE' });
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="bg-[#070c1b]/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl shadow-inner">
              <Bell className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display tracking-wide uppercase">
                  Canales Externos de Notificación
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  DISPATCHER ACTIVO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Entrega desatendida de alertas hacia Telegram, Discord, Slack, Microsoft Teams y Webhooks REST cuando ocurren eventos críticos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddingChannel(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir Canal</span>
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-800 gap-2 text-xs font-medium mt-5">
          <button
            onClick={() => setActiveTab('canales')}
            className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'canales' 
                ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Canales Configurados ({channels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'historial' 
                ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Bitácora de Envíos ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('difusion')}
            className={`px-4 py-2 border-b-2 font-display uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'difusion' 
                ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Difusión Manual (Broadcast)</span>
          </button>
        </div>
      </div>

      {/* MODAL FOR ADDING CHANNEL */}
      {isAddingChannel && (
        <div className="bg-[#070c1b] border border-cyan-500/40 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase font-display flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" />
              Nuevo Canal de Alertas
            </h3>
            <button
              onClick={() => setIsAddingChannel(false)}
              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Tipo de Canal</label>
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="telegram">Telegram (Bot Token + Chat ID)</option>
                <option value="discord">Discord (Webhook URL)</option>
                <option value="slack">Slack (Incoming Webhook)</option>
                <option value="teams">Microsoft Teams (Connector URL)</option>
                <option value="webhook">Webhook Genérico (HTTP POST JSON)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Nombre Descriptivo</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Ej. Telegram NOC Turno Noche"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {newChannelType === 'telegram' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Bot Token de Telegram</label>
                <input
                  type="text"
                  value={newTelegramToken}
                  onChange={(e) => setNewTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
                />
                <span className="text-[10px] text-slate-500 block">Obtenible gratis hablando con @BotFather en Telegram</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Chat ID o Grupo ID</label>
                <input
                  type="text"
                  value={newTelegramChatId}
                  onChange={(e) => setNewTelegramChatId(e.target.value)}
                  placeholder="-1001234567890 o ID de usuario"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                />
                <span className="text-[10px] text-slate-500 block">Obtenible reenviando un mensaje a @userinfobot</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">URL de Webhook</label>
              <input
                type="text"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/... o https://hooks.slack.com/..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsAddingChannel(false)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddChannel}
              disabled={!newChannelName}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
            >
              Guardar Canal
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: CONFIGURED CHANNELS */}
      {activeTab === 'canales' && (
        <div className="space-y-4">
          {channels.map((chan) => {
            const isShowingToken = showTokens[chan.id];
            const isTesting = testingChannelId === chan.id;
            const currentTestRes = testResult?.id === chan.id ? testResult : null;

            return (
              <div 
                key={chan.id}
                className={`bg-[#070c1b] border rounded-xl p-5 shadow-lg transition-all ${
                  chan.enabled 
                    ? 'border-slate-800/90 shadow-slate-950/50' 
                    : 'border-slate-900/60 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border ${
                      chan.type === 'telegram' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                      chan.type === 'discord' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                      chan.type === 'slack' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      chan.type === 'teams' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    }`}>
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white font-display">{chan.name}</h3>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {chan.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {chan.enabled ? '🟢 Activo y escuchando eventos' : '⚪ Canal pausado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleChannel(chan.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                        chan.enabled 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {chan.enabled ? 'Habilitado' : 'Deshabilitado'}
                    </button>

                    <button
                      onClick={() => testChannel(chan.id)}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className={`h-3.5 w-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
                      <span>{isTesting ? 'Enviando...' : 'Probar Envío'}</span>
                    </button>

                    <button
                      onClick={() => deleteChannel(chan.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-rose-500/10"
                      title="Eliminar Canal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* TEST RESULT BANNER */}
                {currentTestRes && (
                  <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                    currentTestRes.success 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}>
                    {currentTestRes.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-rose-400" />}
                    <span>{currentTestRes.msg}</span>
                  </div>
                )}

                {/* CREDENTIALS CONFIG */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {chan.type === 'telegram' ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Bot Token de Telegram</label>
                          <button
                            onClick={() => setShowTokens(prev => ({ ...prev, [chan.id]: !isShowingToken }))}
                            className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                          >
                            {isShowingToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            <span>{isShowingToken ? 'Ocultar' : 'Ver'}</span>
                          </button>
                        </div>
                        <input
                          type={isShowingToken ? "text" : "password"}
                          value={chan.telegramBotToken || ''}
                          onChange={(e) => updateField(chan.id, 'telegramBotToken', e.target.value)}
                          onBlur={handleSaveField}
                          placeholder="Introduce el bot token de @BotFather"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Chat ID de Telegram</label>
                        <input
                          type="text"
                          value={chan.telegramChatId || ''}
                          onChange={(e) => updateField(chan.id, 'telegramChatId', e.target.value)}
                          onBlur={handleSaveField}
                          placeholder="Ej. -1001234567890"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">URL de Webhook</label>
                        <button
                          onClick={() => setShowTokens(prev => ({ ...prev, [chan.id]: !isShowingToken }))}
                          className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                        >
                          {isShowingToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{isShowingToken ? 'Ocultar' : 'Ver'}</span>
                        </button>
                      </div>
                      <input
                        type={isShowingToken ? "text" : "password"}
                        value={chan.webhookUrl || ''}
                        onChange={(e) => updateField(chan.id, 'webhookUrl', e.target.value)}
                        onBlur={handleSaveField}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* DISPATCH TRIGGERS CHECKLIST */}
                <div className="mt-4 pt-3 border-t border-slate-800/60">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block mb-2">
                    Disparadores de Alerta (Triggers)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { key: 'onDeviceDown', label: 'Host Caído (Offline)', desc: 'Envía alerta crítica inmediata al detectar timeout ICMP' },
                      { key: 'onDeviceRecovered', label: 'Host Recuperado', desc: 'Notifica cuando un equipo caído vuelve a responder' },
                      { key: 'onHighLatency', label: 'Alta Latencia (>150ms)', desc: 'Advierte degradación severa o saturación' },
                      { key: 'onNewDevice', label: 'Nuevo Host Detectado', desc: 'Alerta intrusiones o nuevas IPs en el segmento' },
                      { key: 'onSnmpThreshold', label: 'Umbral SNMP Crítico', desc: 'CPU > 85% o Memoria > 90% en telemetría' }
                    ].map(item => (
                      <label
                        key={item.key}
                        className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-900 hover:border-slate-800 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={chan.triggers[item.key as keyof NotificationChannel['triggers']]}
                          onChange={() => updateTrigger(chan.id, item.key as keyof NotificationChannel['triggers'])}
                          className="mt-0.5 accent-cyan-500 rounded"
                        />
                        <div>
                          <span className="font-semibold text-slate-200 block text-[11px]">{item.label}</span>
                          <span className="text-[9px] text-slate-500 leading-tight block">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: DELIVERY HISTORY */}
      {activeTab === 'historial' && (
        <div className="bg-[#070c1b] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-display">Bitácora de Alertas Despachadas</h3>
              <p className="text-[11px] text-slate-400">Registro en tiempo real de notificaciones enviadas a plataformas externas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadHistory}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Actualizar</span>
              </button>
              <button
                onClick={clearHistory}
                className="text-xs bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Limpiar Historial
              </button>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Hora</th>
                    <th className="py-2.5 px-4">Canal</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Título Alerta</th>
                    <th className="py-2.5 px-4">Severidad</th>
                    <th className="py-2.5 px-4">Estado Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 font-semibold">{log.channelName}</td>
                      <td className="py-2.5 px-4 text-slate-400 uppercase">{log.channelType}</td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate">{log.title}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.severity === 'critical' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          log.severity === 'warning' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {log.success ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Entregado {log.statusCode ? `(${log.statusCode})` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 font-semibold" title={log.error}>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Fallo: {log.error || 'Desconocido'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hay envíos registrados todavía. Realice una prueba de canal o active los disparadores automáticos.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BROADCAST / MANUAL DISPATCH */}
      {activeTab === 'difusion' && (
        <div className="bg-[#070c1b] border border-slate-800 rounded-xl p-5 shadow-xl max-w-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-display flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-400" />
              Difusión Manual de Alertas (NOC Broadcast)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Transmita un comunicado o advertencia de emergencia inmediatamente a todos los canales externos activos configurados.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Título del Comunicado</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Ej. Alerta de Caída de Enlace WAN Principal"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Nivel de Severidad</label>
              <div className="flex gap-2">
                {[
                  { level: 'info', label: 'Informativo', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
                  { level: 'warning', label: 'Advertencia', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
                  { level: 'critical', label: 'Crítico / Emergencia', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' }
                ].map(item => (
                  <button
                    key={item.level}
                    onClick={() => setBroadcastSeverity(item.level as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      broadcastSeverity === item.level 
                        ? item.color 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Mensaje Detallado</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={4}
                placeholder="Escriba el detalle técnico del evento o intervención..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSendBroadcast}
              disabled={isBroadcasting || !broadcastTitle || !broadcastMessage}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`h-4 w-4 ${isBroadcasting ? 'animate-bounce' : ''}`} />
              <span>{isBroadcasting ? 'Transmitiendo Alerta a los Canales...' : 'Transmitir Difusión a Canales Activos'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
