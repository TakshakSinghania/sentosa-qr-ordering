import React, { useState } from 'react';
import { Bell, X, Check, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface CallWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  tableSessionToken: string;
  activeStatus?: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED' | null;
  onStatusChange: (status: 'PENDING' | 'ACKNOWLEDGED' | null) => void;
}

const QUICK_REASONS = [
  'Refill Water',
  'Extra Napkins & Cutlery',
  'Assistance with Menu',
  'Request the Check',
  'Clean Table',
];

export const CallWaiterModal: React.FC<CallWaiterModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  tableSessionToken,
  activeStatus,
  onStatusChange,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAlreadyActive = activeStatus === 'PENDING' || activeStatus === 'ACKNOWLEDGED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyActive) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.callWaiter({
        tableSessionToken,
        reason: selectedReason.trim() || undefined,
        note: customNote.trim() || undefined,
      });

      onStatusChange(res.request?.status || 'PENDING');
      setSuccessMessage(`A member of our team has been notified for Table ${tableNumber}.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2200);
    } catch (err: any) {
      if (err.message?.includes('already pending') || err.message?.includes('409') || err.message?.includes('already been notified')) {
        onStatusChange('PENDING');
        setError('A waiter request is already active for this table.');
      } else {
        setError(err.message || 'Failed to call waiter. Please ask a server directly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-all animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-[#ebeae7] w-full max-w-md rounded-t-[28px] sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 border-t sm:border border-[#bdb8ad]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-[#bdb8ad]/60 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#bdb8ad]/60 bg-white/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 flex items-center justify-center text-[#4f7897] shadow-2xs">
              <Bell className="w-4 h-4 text-[#6492b3]" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold text-[#3a3530] tracking-tight">
                Call waiter
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <p className="text-xs text-[#5b554f] font-semibold">
                  Table {tableNumber}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#f4f3f0] text-[#5b554f] hover:bg-[#bdb8ad]/30 flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 pb-safe">
          {successMessage ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-800 stroke-[2.5]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#3a3530]">
                Waiter summoned
              </h3>
              <p className="text-xs text-[#5b554f] max-w-xs mx-auto leading-relaxed font-medium">
                {successMessage}
              </p>
            </div>
          ) : isAlreadyActive ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 text-amber-800 mx-auto flex items-center justify-center animate-pulse shadow-xs">
                <Clock className="w-6 h-6 text-amber-800 stroke-[2.5]" />
              </div>
              <h3 className="font-sans text-base font-bold text-[#3a3530]">
                {activeStatus === 'ACKNOWLEDGED'
                  ? 'Server on the way'
                  : 'Server notified for Table ' + tableNumber}
              </h3>
              <p className="text-xs text-[#5b554f] max-w-xs mx-auto leading-relaxed font-medium">
                {activeStatus === 'ACKNOWLEDGED'
                  ? 'Our team has acknowledged your request and is heading to your table.'
                  : 'Your request has been received. A team member will assist you shortly.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary px-6 py-2.5 min-h-[40px] rounded-xl text-xs font-bold active:scale-[0.98] transition-transform"
                >
                  Understood
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#5b554f] leading-relaxed font-medium">
                Select what you need at Table <strong className="text-[#3a3530] font-bold">#{tableNumber}</strong>:
              </p>

              {/* Quick Reasons Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedReason(isSelected ? '' : reason)}
                      className={`text-xs px-3.5 py-2 min-h-[38px] rounded-xl transition-all flex items-center gap-2 select-none touch-press active:scale-[0.97] ${
                        isSelected
                          ? 'btn-glass-selected shadow-2xs'
                          : 'btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3]'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-[#4f7897] stroke-[3] flex-shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#bdb8ad] flex-shrink-0"></span>
                      )}
                      <span className={isSelected ? 'text-[#4f7897] font-bold' : 'text-[#3a3530] font-medium'}>
                        {reason}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Custom Note */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-[#3a3530] mb-1.5">
                  Optional note for server
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring two extra glasses..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  maxLength={100}
                  className="w-full text-base sm:text-xs p-3 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl focus:border-[#6492b3] outline-none transition-colors text-[#3a3530] placeholder:text-[#8d7d6d] font-medium"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-glass-secondary border-[#bdb8ad] text-[#5b554f] flex-1 py-3 min-h-[44px] rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Notifying...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      <span>Call waiter</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
