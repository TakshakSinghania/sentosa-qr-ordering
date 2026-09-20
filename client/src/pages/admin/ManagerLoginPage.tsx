import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Coffee, Lock, Mail, AlertCircle, Loader2, Shield, ArrowRight } from 'lucide-react';

interface ManagerLoginPageProps {
  onNavigate: (path: string) => void;
}

export const ManagerLoginPage: React.FC<ManagerLoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // AuthContext updates user — App.tsx will redirect based on role
      // If they logged in as STAFF they'll be routed to staff dashboard;
      // the App.tsx routing handles that
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      if (msg.toLowerCase().includes('deactivated')) {
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@democafe.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-stone-800/20 animate-in fade-in zoom-in-98 duration-150">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 text-[#4f7897] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Shield className="w-5 h-5 text-[#6492b3]" />
            </div>
            <p className="text-[10px] tracking-wider uppercase font-semibold text-[#8d7d6d]">Sentosa — The Coffee Unit</p>
            <h1 className="font-sans text-2xl text-[#3a3530] font-bold mt-0.5">Manager Login</h1>
            <p className="text-xs text-[#8d7d6d] mt-0.5">
              Full restaurant management &amp; analytics access
            </p>
            <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#e8eff4] text-[#4f7897] border border-[#6492b3]/30">
              Manager Portal
            </span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 uppercase tracking-wider mb-1">
                Manager Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@cafe.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-subtle"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In as Manager</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Demo fill */}
          <div className="mt-5 pt-4 border-t border-stone-100 text-center space-y-3">
            <p className="text-[11px] text-stone-500 font-medium">Development Demo Account:</p>
            <button
              type="button"
              onClick={fillDemo}
              className="btn-outline text-xs font-bold px-3.5 py-2 rounded-lg transition-colors inline-block"
            >
              Fill Demo Manager Credentials
            </button>
          </div>
        </div>

        {/* Staff login link */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => onNavigate('/admin/staff/login')}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Switch to Staff Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
