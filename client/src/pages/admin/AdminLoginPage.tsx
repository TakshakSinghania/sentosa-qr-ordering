import React from 'react';
import { Coffee, Shield, ChefHat, ArrowRight } from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#e8eff4] flex items-center justify-center mx-auto mb-3 shadow-xs border border-[#6492b3]/30">
            <Coffee className="w-6 h-6 text-[#6492b3]" />
          </div>
          <h1 className="font-sans text-2xl font-bold text-white">Sentosa</h1>
          <p className="text-[11px] font-semibold text-[#bdb8ad] tracking-wider uppercase mt-0.5">The Coffee Unit</p>
          <p className="text-xs text-[#bdb8ad] mt-1 font-normal">Café Operations & Kitchen POS</p>
        </div>

        {/* Role selection cards */}
        <div className="space-y-3">
          {/* Manager */}
          <button
            type="button"
            onClick={() => onNavigate('/admin/manager/login')}
            className="w-full bg-[#292524] hover:bg-[#3a3330] border border-[#3a3330] hover:border-[#4a4340] rounded-2xl p-5 text-left transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-800/40 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-white text-sm">Manager Login</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Dashboard • Analytics • Menu • Tables • Staff
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors" />
            </div>
          </button>

          {/* Staff */}
          <button
            type="button"
            onClick={() => onNavigate('/admin/staff/login')}
            className="w-full bg-[#292524] hover:bg-[#3a3330] border border-[#3a3330] hover:border-[#4a4340] rounded-2xl p-5 text-left transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/30 border border-emerald-800/40 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-white text-sm">Staff Login</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Live Orders • Waiter Calls • Kitchen Operations
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors" />
            </div>
          </button>
        </div>

        <p className="text-center text-[11px] text-stone-600 mt-6">
          Select your role to proceed to the appropriate portal.
        </p>
      </div>
    </div>
  );
};
