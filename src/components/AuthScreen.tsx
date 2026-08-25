import { useState } from 'react';
import { User, Lock, Mail, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { ICON_AVATARS } from './UserAvatar';

interface AuthScreenProps {
  onAuthSuccess: (user: { username: string; displayName: string; avatar: string }) => void;
}

const AVATAR_KEYS = ['crown', 'swords', 'zap', 'gamepad', 'shield', 'flame', 'sparkles', 'terminal', 'bot', 'rocket'];

// Passwords stored as { [username]: password } in localStorage
function getPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem('revival_passwords');
    const db: Record<string, string> = raw ? JSON.parse(raw) : {};
    // Pre-seed envixyy default password if not yet set
    if (!db['envixyy']) {
      db['envixyy'] = 'revival2025';
      localStorage.setItem('revival_passwords', JSON.stringify(db));
    }
    return db;
  } catch {
    return { envixyy: 'revival2025' };
  }
}

function savePassword(username: string, password: string) {
  const db = getPasswords();
  db[username] = password;
  localStorage.setItem('revival_passwords', JSON.stringify(db));
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('crown');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const uname = username.toLowerCase().trim();
      if (!uname || !password) {
        setError('Please fill in all fields.');
        setLoading(false);
        return;
      }

      const db = getPasswords();

      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (uname === 'envixyy') {
          setError('That username is reserved. Please sign in instead.');
          setLoading(false);
          return;
        }
        const newUser = { username: uname, displayName: displayName.trim() || username, avatar: selectedAvatar };
        savePassword(uname, password);
        localStorage.setItem('revival_user', JSON.stringify(newUser));
        onAuthSuccess(newUser);

      } else {
        // LOGIN — check password
        const storedPw = db[uname];
        if (!storedPw) {
          setError('Account not found. Create an account first.');
          setLoading(false);
          return;
        }
        if (storedPw !== password) {
          setError('Incorrect password. Please try again.');
          setLoading(false);
          return;
        }
        // Load saved profile or build one
        let user: { username: string; displayName: string; avatar: string } | null = null;
        try {
          const saved = localStorage.getItem('revival_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.username === uname) user = parsed;
          }
        } catch {}
        if (!user) user = { username: uname, displayName: uname, avatar: uname === 'envixyy' ? 'crown' : 'gamepad' };
        localStorage.setItem('revival_user', JSON.stringify(user));
        onAuthSuccess(user);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111216]">
      <div className="absolute inset-0 bg-radial-gradient from-[#facc15]/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-[#16171d] border border-[#2c2e38] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <img src={logoImg} alt="Revival" className="w-16 h-16 mx-auto object-contain mb-3" />
          <h1 className="text-2xl font-black text-white tracking-tight">
            revival<span className="text-[#facc15]">network</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login' ? 'Sign in to connect with friends & play' : 'Create your launcher account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <Shield size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="alex_miner"
                className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="alex@gmail.com"
                    className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1c1d22] border border-[#2c2e38] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-[#facc15]/60 transition-all font-semibold"
                  required
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
                Choose Vector Avatar Icon
              </label>
              <div className="flex flex-wrap gap-2 p-2 bg-[#1c1d22] border border-[#2c2e38] rounded-xl justify-center">
                {AVATAR_KEYS.map(key => {
                  const item = ICON_AVATARS[key];
                  const IconComp = item.icon;
                  const isSelected = selectedAvatar === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAvatar(key)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${item.bg} ${
                        isSelected
                          ? 'ring-2 ring-[#facc15] shadow-md shadow-yellow-500/25 scale-110'
                          : 'hover:scale-105 opacity-60 hover:opacity-100'
                      }`}
                      title={item.label}
                    >
                      <IconComp size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#facc15] hover:bg-[#fde047] text-black font-extrabold rounded-2xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10 active:scale-95"
          >
            {loading ? (
              'Processing...'
            ) : mode === 'login' ? (
              <>Sign In <ArrowRight size={14} /></>
            ) : (
              <>Sign Up <CheckCircle size={14} /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          {mode === 'login' ? (
            <p>
              New to Revival?{' '}
              <button onClick={() => setMode('register')} className="text-[#facc15] hover:underline font-bold">
                Create account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-[#facc15] hover:underline font-bold">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
