import { useState } from 'react';
import { User, Lock, Mail, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface AuthScreenProps {
  onAuthSuccess: (user: { username: string; displayName: string; avatar: string }) => void;
}

const AVATARS = [
  '🦁', '🦊', '🐻', '🐼', '🐨', '🐯', '🐰', '🦄', '🐙', '🦖'
];

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (!username || !password) {
        setError('Please fill in all fields.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        const newUser = {
          username: username.toLowerCase().trim(),
          displayName: displayName.trim() || username,
          avatar: selectedAvatar,
        };
        localStorage.setItem('revival_user', JSON.stringify(newUser));
        onAuthSuccess(newUser);
      } else {
        // Simple mock login logic
        const saved = localStorage.getItem('revival_user');
        if (saved) {
          const user = JSON.parse(saved);
          if (user.username === username.toLowerCase().trim()) {
            onAuthSuccess(user);
            setLoading(false);
            return;
          }
        }
        // Fallback or default user if nothing saved
        const defaultUser = {
          username: username.toLowerCase().trim(),
          displayName: username,
          avatar: AVATARS[0],
        };
        localStorage.setItem('revival_user', JSON.stringify(defaultUser));
        onAuthSuccess(defaultUser);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111216]">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-radial-gradient from-[#facc15]/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-[#16171d] border border-[#2c2e38] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <img src={logoImg} alt="Revival" className="w-16 h-16 mx-auto object-contain mb-3" />
          <h1 className="text-2xl font-black text-white tracking-tight">
            revival<span className="text-[#facc15]">network</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login' ? 'Sign in to connect with friends' : 'Create your launcher account'}
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
                Choose Avatar Character
              </label>
              <div className="flex flex-wrap gap-2.5 p-2 bg-[#1c1d22] border border-[#2c2e38] rounded-xl justify-center">
                {AVATARS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${
                      selectedAvatar === av
                        ? 'bg-[#facc15] shadow-md shadow-yellow-500/25 scale-110'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#facc15] hover:bg-[#fde047] text-black font-extrabold rounded-2xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
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
