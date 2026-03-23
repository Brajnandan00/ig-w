import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Save } from 'lucide-react';

export default function SettingsManager({ shop, authenticatedFetch }: { shop: string, authenticatedFetch: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(3600); // Default 1 hour

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/settings?shop=${shop}`);
      const data = await res.json();
      if (data.settings) {
        setAutoRefreshInterval(data.settings.autoRefreshInterval);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Don't show error if it's just a 404 (settings not created yet)
    } finally {
      setLoading(false);
    }
  }, [shop, authenticatedFetch]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authenticatedFetch(`/api/settings?shop=${shop}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRefreshInterval })
      });

      if (res.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await res.json();
        setError(`Failed to save settings: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">Auto-Sync Settings</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-4">Configure how often your Instagram feed automatically refreshes in the background.</p>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSave} className="flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Sync Frequency</label>
          <select 
            value={autoRefreshInterval}
            onChange={e => setAutoRefreshInterval(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={3600}>Every 1 hour</option>
            <option value={10800}>Every 3 hours</option>
            <option value={21600}>Every 6 hours</option>
            <option value={43200}>Every 12 hours</option>
            <option value={86400}>Every 24 hours</option>
          </select>
        </div>
        <button 
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Saving...' : <><Save size={16} /> Save Settings</>}
        </button>
      </form>
      
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
        <strong>Note:</strong> Auto-sync requires a cron job to be configured on your hosting provider (e.g., Railway, Vercel) pointing to <code>/api/cron/sync</code> with the correct <code>Authorization: Bearer [CRON_SECRET]</code> header.
      </div>
    </div>
  );
}
