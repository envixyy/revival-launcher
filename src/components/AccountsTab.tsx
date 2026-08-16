import { useState, useEffect } from 'react';
import { UserCircle, Trash2, CheckCircle, RefreshCw, Copy } from 'lucide-react';
import { safeInvoke } from '../utils/tauri';

interface Account {
  id: string;
  type: 'microsoft' | 'offline';
  username: string;
  uuid: string;
  access_token: string;
}

interface AccountData {
  accounts: Account[];
  active_id: string | null;
}

export function AccountsTab() {
  const [data, setData] = useState<AccountData>({ accounts: [], active_id: null });
  const [loading, setLoading] = useState(true);
  const [addingOffline, setAddingOffline] = useState(false);
  const [offlineName, setOfflineName] = useState('');
  const [msFlowData, setMsFlowData] = useState<{ user_code: string; verification_uri: string; device_code: string; interval: number } | null>(null);
  const [msPolling, setMsPolling] = useState(false);
  const [msError, setMsError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await safeInvoke<AccountData>('list_accounts');
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleSetActive = async (id: string) => {
    await safeInvoke('set_active_account', { id });
    refresh();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this account?')) return;
    await safeInvoke('remove_account', { id });
    refresh();
  };

  const handleAddOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineName.trim()) return;
    await safeInvoke('add_offline_account', { username: offlineName.trim() });
    setOfflineName('');
    setAddingOffline(false);
    refresh();
  };

  const handleStartMsLogin = async () => {
    setMsError(null);
    try {
      const flow = await safeInvoke<any>('ms_start_device_flow', {});
      setMsFlowData(flow);
      setMsPolling(true);
      // Start polling
      try {
        await safeInvoke<Account>('ms_poll_device_code', {
          device_code: flow.device_code,
          interval: flow.interval
        });
        setMsFlowData(null);
        setMsPolling(false);
        refresh();
      } catch (err: any) {
        setMsError(err?.message || String(err));
        setMsPolling(false);
      }
    } catch (err: any) {
      setMsError(err?.message || String(err));
    }
  };

  const copyCode = () => {
    if (msFlowData?.user_code) {
      navigator.clipboard.writeText(msFlowData.user_code);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <button onClick={refresh} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Account List */}
      <div className="space-y-3">
        {data.accounts.map(account => (
          <div key={account.id} className={`flex items-center gap-4 bg-revival-card border rounded-xl p-4 transition-all ${data.active_id === account.id ? 'border-revival-accent/60' : 'border-gray-800'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
              {account.type === 'microsoft' ? '🎮' : '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold truncate">{account.username}</span>
                {data.active_id === account.id && (
                  <span className="text-[10px] bg-revival-accent/20 text-revival-accent px-2 py-0.5 rounded-full font-semibold">Active</span>
                )}
              </div>
              <span className={`text-xs capitalize ${account.type === 'microsoft' ? 'text-blue-400' : 'text-gray-500'}`}>
                {account.type === 'microsoft' ? '✓ Microsoft / Xbox Live' : '⚠ Offline (local only)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {data.active_id !== account.id && (
                <button onClick={() => handleSetActive(account.id)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1">
                  <CheckCircle size={12} /> Use
                </button>
              )}
              <button onClick={() => handleRemove(account.id)} className="p-2 hover:bg-red-900/30 text-gray-500 hover:text-red-400 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {data.accounts.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-500">
            No accounts yet. Add one below.
          </div>
        )}
      </div>

      {/* Microsoft Login Flow */}
      {msFlowData && (
        <div className="bg-revival-card border border-blue-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-blue-400">Microsoft Login</h3>
          <p className="text-sm text-gray-400">Go to <a href={msFlowData.verification_uri} target="_blank" rel="noreferrer" className="text-revival-accent underline">{msFlowData.verification_uri}</a> and enter the code:</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-white bg-slate-900 px-4 py-2 rounded-xl">{msFlowData.user_code}</span>
            <button onClick={copyCode} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Copy size={18} />
            </button>
          </div>
          {msPolling && <p className="text-xs text-gray-500 animate-pulse">Waiting for you to log in...</p>}
        </div>
      )}

      {msError && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          {msError}
        </div>
      )}

      {/* Add Account */}
      <div className="bg-revival-card border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold">Add Account</h3>
        <div className="flex gap-3">
          <button
            onClick={handleStartMsLogin}
            disabled={msPolling}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>🎮</span> Sign in with Microsoft
          </button>
          <button
            onClick={() => setAddingOffline(v => !v)}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <UserCircle size={16} /> Add Offline Account
          </button>
        </div>

        {addingOffline && (
          <form onSubmit={handleAddOffline} className="flex gap-2">
            <input
              type="text"
              placeholder="Username"
              value={offlineName}
              onChange={e => setOfflineName(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-revival-accent"
            />
            <button type="submit" className="px-4 py-2 bg-revival-accent hover:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
              Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
