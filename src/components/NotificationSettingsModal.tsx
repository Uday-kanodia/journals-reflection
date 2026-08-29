import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { NotificationConfig, NotificationPlatform, NotificationTrigger } from '../types';
import {
  subscribeToNotificationConfigs,
  saveNotificationConfig,
  deleteNotificationConfig,
} from '../firebase';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string | null;
  currentUser?: any;
}

const TRIGGER_OPTIONS: { id: NotificationTrigger; label: string; description: string }[] = [
  {
    id: 'all',
    label: 'All Reflections',
    description: 'Dispatch alert immediately when any journal entry is saved',
  },
  {
    id: 'high_clarity',
    label: 'High Clarity (>80%)',
    description: 'Trigger when Gemini detects a deep clarity breakthrough',
  },
  {
    id: 'high_energy',
    label: 'High Energy (>=8/10)',
    description: 'Trigger when energetic optimism or gratitude peaks',
  },
  {
    id: 'breakthrough',
    label: 'Creative Brainstorms',
    description: 'Trigger when brainstorming ideas or strategic action items are distilled',
  },
  {
    id: 'weekly_digest',
    label: 'Weekly Syntheses',
    description: 'Dispatch executive digest summary when weekly recap is generated',
  },
];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  userId: propUserId,
  userEmail: propUserEmail,
  currentUser,
}) => {
  const effectiveUserId = propUserId || currentUser?.uid || '';
  const effectiveUserEmail = propUserEmail || currentUser?.email || '';

  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [platform, setPlatform] = useState<NotificationPlatform>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<NotificationTrigger[]>([
    'high_clarity',
    'breakthrough',
    'weekly_digest',
  ]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !effectiveUserId) return;
    const unsub = subscribeToNotificationConfigs(effectiveUserId, (list) => {
      setConfigs(list);
    });
    return () => unsub();
  }, [isOpen, effectiveUserId]);

  const handleToggleTrigger = (trigger: NotificationTrigger) => {
    if (selectedTriggers.includes(trigger)) {
      if (selectedTriggers.length === 1) return; // keep at least one
      setSelectedTriggers(selectedTriggers.filter((t) => t !== trigger));
    } else {
      setSelectedTriggers([...selectedTriggers, trigger]);
    }
  };

  const handleSaveNewWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !effectiveUserId) return;

    const newConfig: NotificationConfig = {
      id: 'notify_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: effectiveUserId,
      platform,
      webhookUrl: webhookUrl.trim(),
      channelName: channelName.trim() || undefined,
      enabled: true,
      triggers: selectedTriggers,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveNotificationConfig(effectiveUserId, newConfig);
      setWebhookUrl('');
      setChannelName('');
      setIsAdding(false);
    } catch (err: any) {
      alert(`Failed to save notification webhook: ${err.message || err}`);
    }
  };

  const handleToggleEnabled = async (config: NotificationConfig) => {
    if (!effectiveUserId) return;
    try {
      await saveNotificationConfig(effectiveUserId, {
        ...config,
        enabled: !config.enabled,
      });
    } catch (err: any) {
      console.error('Failed to toggle webhook state:', err);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!effectiveUserId) return;
    if (!window.confirm('Remove this notification webhook integration?')) return;
    try {
      await deleteNotificationConfig(effectiveUserId, configId);
    } catch (err: any) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleTestPing = async (config: NotificationConfig) => {
    setTestingId(config.id);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          platform: config.platform,
          userEmail: effectiveUserEmail || 'anonymous',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          id: config.id,
          success: true,
          msg: 'Test signal delivered successfully to channel.',
        });
      } else {
        setTestResult({
          id: config.id,
          success: false,
          msg: data.error || data.message || `Delivery failed with status ${res.status}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        id: config.id,
        success: false,
        msg: err.message || 'Connection error dispatching webhook test',
      });
    } finally {
      setTestingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-50 border border-stone-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-100/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-olive-700/10 text-olive-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">External Notifications & Webhooks</h3>
              <p className="text-xs text-stone-500">Dispatch structured journal milestones to Slack, Discord, or Webhooks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Webhooks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Connected Endpoints ({configs.length})
              </span>
              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 bg-olive-800 hover:bg-olive-900 text-stone-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Webhook
                </button>
              )}
            </div>

            {configs.length === 0 && !isAdding && (
              <div className="p-6 bg-white border border-dashed border-stone-300 rounded-xl text-center space-y-2">
                <Bell className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-serif font-semibold text-stone-700">No Notification Webhooks Configured</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Connect your team Slack channel or private Discord room to receive automated reflections and weekly digest syntheses.
                </p>
              </div>
            )}

            {configs.map((cfg) => {
              const isTesting = testingId === cfg.id;
              const result = testResult && testResult.id === cfg.id ? testResult : null;

              return (
                <div
                  key={cfg.id}
                  className={`p-4 bg-white rounded-xl border transition-all ${
                    cfg.enabled ? 'border-stone-200 shadow-xs' : 'border-stone-200/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-bold text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                          {cfg.platform}
                        </span>
                        {cfg.channelName && (
                          <span className="text-xs font-medium text-stone-600">
                            #{cfg.channelName}
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            cfg.enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {cfg.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-stone-400 truncate max-w-xs">
                        {cfg.webhookUrl.slice(0, 25)}...{cfg.webhookUrl.slice(-10)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestPing(cfg)}
                        disabled={isTesting || !cfg.enabled}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        <Send className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        {isTesting ? 'Pinging...' : 'Test Ping'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(cfg)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          cfg.enabled
                            ? 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {cfg.enabled ? 'Pause' : 'Enable'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(cfg.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger chips */}
                  <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-stone-400 font-medium">Triggers:</span>
                    {cfg.triggers.map((trig) => (
                      <span
                        key={trig}
                        className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full"
                      >
                        {TRIGGER_OPTIONS.find((o) => o.id === trig)?.label || trig}
                      </span>
                    ))}
                  </div>

                  {/* Test result message */}
                  {result && (
                    <div
                      className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                        result.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{result.msg}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Webhook Form */}
          {isAdding && (
            <form
              onSubmit={handleSaveNewWebhook}
              className="bg-white p-5 rounded-xl border border-olive-700/20 shadow-sm space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-semibold text-sm text-stone-900">
                  Configure Outbound Notification Webhook
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Platform Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['slack', 'discord', 'webhook'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        platform === p
                          ? 'bg-olive-800 text-white border-olive-900 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {p === 'webhook' ? 'Custom HTTP' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Webhook URL Target
                </label>
                <input
                  type="url"
                  required
                  placeholder={
                    platform === 'slack'
                      ? 'https://hooks.slack.com/services/...'
                      : platform === 'discord'
                      ? 'https://discord.com/api/webhooks/...'
                      : 'https://api.yourdomain.com/webhook'
                  }
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-olive-600/30"
                />
                <p className="text-[11px] text-stone-400">
                  Protected by server-side SSRF validation and credential isolation.
                </p>
              </div>

              {/* Optional Channel Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Channel Name / Destination (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. reflections-log, daily-standup"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-olive-600/30"
                />
              </div>

              {/* Trigger Options */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-2">
                  Dispatch Trigger Events
                </label>
                <div className="space-y-1.5">
                  {TRIGGER_OPTIONS.map((opt) => {
                    const isChecked = selectedTriggers.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-olive-50/50 border-olive-200 text-stone-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTrigger(opt.id)}
                          className="mt-0.5 rounded text-olive-800 focus:ring-olive-600"
                        />
                        <div>
                          <span className="text-xs font-semibold block">{opt.label}</span>
                          <span className="text-[11px] text-stone-500 block">{opt.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-olive-800 hover:bg-olive-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Integration
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-100/70 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Payload Schemas & SSRF Mitigations</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold rounded-lg shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
