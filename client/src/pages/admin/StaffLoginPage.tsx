import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { ChefHat, Lock, Mail, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react';

interface StaffLoginPageProps {
  onNavigate: (path: string) => void;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [managerDetected, setManagerDetected] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setManagerDetected(false);
    setLoading(true);

    try {
      await login(email, password);
      // Role routing happens in App.tsx — if they logged in as MANAGER they'll be
      // redirected to the manager dashboard automatically
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('staff@democafe.com');
    setPassword('staff123');
  };

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-stone-800/20 animate-in fade-in zoom-in-98 duration-150">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 text-[#4f7897] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ChefHat className="w-5 h-5 text-[#6492b3]" />
            </div>
            <p className="text-[10px] tracking-wider uppercase font-semibold text-[#8d7d6d]">Sentosa — The Coffee Unit</p>
            <h1 className="font-sans text-2xl text-[#3a3530] font-bold mt-0.5">Staff Login</h1>
            <p className="text-xs text-[#8d7d6d] mt-0.5">
              Live orders, waiter calls &amp; kitchen operations
            </p>
            <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#e8eff4] text-[#4f7897] border border-[#6492b3]/30">
              Staff Operations Portal
            </span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {managerDetected && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-xs text-amber-800">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Manager account detected. You will be redirected to the Manager Portal.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 uppercase tracking-wider mb-1">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@cafe.com"
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
              className="w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-white transition-colors shadow-subtle"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In to Kitchen POS</span>
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
              Fill Demo Staff Credentials
            </button>
          </div>
        </div>

        {/* Manager login link */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => onNavigate('/admin/manager/login')}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Switch to Manager Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
