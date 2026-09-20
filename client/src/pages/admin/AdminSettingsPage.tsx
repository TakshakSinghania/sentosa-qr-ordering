import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Settings, Save, Power, Store, Loader2, Sparkles } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [taxRate, setTaxRate] = useState<string>('5.0');
  const [serviceChargeRate, setServiceChargeRate] = useState<string>('0.0');
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [enableTableFavorites, setEnableTableFavorites] = useState<boolean>(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setName(data.name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setTaxRate((data.taxRate || 5.0).toString());
        setServiceChargeRate((data.serviceChargeRate || 0.0).toString());
        setIsOpen(Boolean(data.isOpen));
        setLogoUrl(data.logoUrl || '');
        setEnableTableFavorites(data.enableTableFavorites !== undefined ? Boolean(data.enableTableFavorites) : true);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await api.updateSettings({
        name,
        phone,
        address,
        taxRate: parseFloat(taxRate),
        serviceChargeRate: parseFloat(serviceChargeRate),
        isOpen,
        logoUrl: logoUrl || null,
        enableTableFavorites,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-900 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-stone-900 tracking-tight">
          Café Profile & Tax Settings
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Configure restaurant operating hours, GST rates, service charge, and public dining branding
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium p-3 rounded-xl animate-in fade-in">
          ✓ Café settings and tax rates updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Café Open / Closed Status */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm text-stone-900">Café Ordering Status</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              When closed, customer table QRs still open but display "Currently Closed" and pause orders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isOpen
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/70'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOpen ? 'OPEN FOR ORDERS' : 'STORE CLOSED'}</span>
          </button>
        </div>

        {/* Table Favorites Feature Toggle */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6492b3]" />
              <h3 className="font-medium text-sm text-stone-900">Table Recommendations</h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Display “Guests here often order…” section on customer QR menus using historical orders from that table.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEnableTableFavorites((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              enableTableFavorites
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <span>{enableTableFavorites ? 'ENABLED' : 'DISABLED'}</span>
          </button>
        </div>

        {/* Café Identity */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-stone-600" />
            <h3 className="font-medium text-xs text-stone-900 uppercase tracking-wider">
              Branding & Contact Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Café Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none text-stone-900 transition-colors"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none text-stone-900 transition-colors"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-stone-700 mb-1">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none text-stone-900 transition-colors"
            />
          </div>

          <div className="text-xs">
            <label className="block font-medium text-stone-700 mb-1">Logo Image URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none text-stone-900 transition-colors"
            />
          </div>
        </div>

        {/* Taxes & Pricing Configuration */}
        <div className="bg-white rounded-xl p-5 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-stone-600" />
            <h3 className="font-medium text-xs text-stone-900 uppercase tracking-wider">
              Tax & Billing Rates (Configurable)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                GST / Sales Tax Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                required
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none font-mono text-stone-900 transition-colors"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Typically 5.0% for restaurant services in India.
              </p>
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Optional Service Charge (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                required
                value={serviceChargeRate}
                onChange={(e) => setServiceChargeRate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-stone-400 outline-none font-mono text-stone-900 transition-colors"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Set to 0% if no service charge is levied.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-xs font-bold py-3 px-6 rounded-lg shadow-subtle"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Café Profile & Tax Rates</span>
          </button>

        </div>
      </form>
    </div>
  );
};
