import React, { useState } from 'react';
import { X, Plus, Trash2, Sliders, AlertCircle, Loader2 } from 'lucide-react';
import { MenuItem } from '../../types/index.js';
import { api } from '../../services/api.js';

interface CustomizationModalProps {
  item: MenuItem | null;
  currencySymbol: string;
  onClose: () => void;
  onMenuUpdated: () => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  item,
  currencySymbol,
  onClose,
  onMenuUpdated,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Group Form State
  const [showAddGroup, setShowAddGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupType, setNewGroupType] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [newGroupRequired, setNewGroupRequired] = useState<boolean>(true);
  const [newGroupMin, setNewGroupMin] = useState<number>(1);
  const [newGroupMax, setNewGroupMax] = useState<number>(1);

  // New Option Form State: Map of groupId -> { show, name, price }
  const [activeAddOptionGroupId, setActiveAddOptionGroupId] = useState<string | null>(null);
  const [newOptName, setNewOptName] = useState<string>('');
  const [newOptPrice, setNewOptPrice] = useState<string>('0');

  if (!item) return null;

  const groups = item.customizationGroups || [];

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setLoadingAction('create_group');
      setError(null);
      await api.createCustomizationGroup(item.id, {
        name: newGroupName.trim(),
        type: newGroupType,
        required: newGroupRequired,
        minSelections: newGroupType === 'SINGLE' ? (newGroupRequired ? 1 : 0) : newGroupMin,
        maxSelections: newGroupType === 'SINGLE' ? 1 : newGroupMax,
      });

      setNewGroupName('');
      setShowAddGroup(false);
      onMenuUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to create customization group');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete customization group "${groupName}" and all its options?`)) return;

    try {
      setLoadingAction(`del_group_${groupId}`);
      setError(null);
      await api.deleteCustomizationGroup(groupId);
      onMenuUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleOptionSoldOut = async (optionId: string) => {
    try {
      setLoadingAction(`toggle_opt_${optionId}`);
      setError(null);
      await api.toggleCustomizationOptionAvailability(optionId);
      onMenuUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update option availability');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddOption = async (groupId: string) => {
    if (!newOptName.trim()) return;

    try {
      setLoadingAction(`add_opt_${groupId}`);
      setError(null);
      await api.addCustomizationOption(groupId, {
        name: newOptName.trim(),
        priceAddition: parseFloat(newOptPrice) || 0,
      });

      setNewOptName('');
      setNewOptPrice('0');
      setActiveAddOptionGroupId(null);
      onMenuUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to add option');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteOption = async (optionId: string, optionName: string) => {
    if (!confirm(`Delete option "${optionName}"?`)) return;

    try {
      setLoadingAction(`del_opt_${optionId}`);
      setError(null);
      await api.deleteCustomizationOption(optionId);
      onMenuUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete option');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-modal max-h-[90vh] flex flex-col overflow-hidden border border-cream-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-cream-300 flex items-center justify-between bg-cream-100/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-bronze-100 flex items-center justify-center text-bronze-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-charcoal-900">
                Customizations for {item.name}
              </h2>
              <p className="text-xs text-charcoal-600 font-medium">
                Manage options like Size, Milk, Crust, Toppings, and Add-ons
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-cream-200 text-charcoal-700 hover:bg-cream-300 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Groups List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {groups.length === 0 ? (
            <div className="text-center py-8 bg-cream-50 rounded-xl border border-dashed border-cream-300 p-6">
              <Sliders className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
              <p className="font-serif text-sm font-bold text-charcoal-900">No customizations yet</p>
              <p className="text-xs text-charcoal-600 mt-1 max-w-sm mx-auto font-light">
                Add choice groups (e.g. "Choose Milk" or "Extra Toppings") for this menu item.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="bg-[#faf8f5] rounded-xl p-4 border border-cream-300 shadow-2xs space-y-3"
              >
                {/* Group Title Row */}
                <div className="flex items-center justify-between gap-2 border-b border-cream-300/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-charcoal-900">{group.name}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        group.required
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-cream-200 text-charcoal-700'
                      }`}
                    >
                      {group.required ? 'Required' : 'Optional'}
                    </span>
                    <span className="text-[11px] text-charcoal-600 font-medium">
                      ({group.type === 'SINGLE' ? 'Single Choice' : `Multi Choice, max ${group.maxSelections}`})
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={loadingAction === `del_group_${group.id}`}
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    className="text-charcoal-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Options In Group */}
                <div className="space-y-1.5">
                  {(group.options || []).map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-cream-300 text-xs gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-charcoal-900">{opt.name}</span>
                        <span className="text-charcoal-600 font-medium">
                          {opt.priceAddition > 0 ? `(+${currencySymbol}${opt.priceAddition.toFixed(0)})` : '(Free)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sold Out Toggle */}
                        <button
                          type="button"
                          disabled={loadingAction === `toggle_opt_${opt.id}`}
                          onClick={() => handleToggleOptionSoldOut(opt.id)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                            opt.isAvailable !== false
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-black'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              opt.isAvailable !== false ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span>{opt.isAvailable !== false ? 'Available' : 'Sold Out'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={loadingAction === `del_opt_${opt.id}`}
                          onClick={() => handleDeleteOption(opt.id, opt.name)}
                          className="text-charcoal-400 hover:text-rose-600 p-1 rounded"
                          title="Delete option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Option Form or Trigger */}
                {activeAddOptionGroupId === group.id ? (
                  <div className="bg-white p-3 rounded-lg border border-charcoal-300 space-y-2 pt-2 animate-in fade-in duration-100">
                    <div className="text-xs font-bold text-charcoal-900">Add Option to {group.name}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Option Name (e.g. Oat Milk)"
                        value={newOptName}
                        onChange={(e) => setNewOptName(e.target.value)}
                        className="flex-1 text-xs p-2 bg-cream-100/70 border border-cream-300 rounded-lg text-charcoal-900 font-semibold focus:border-charcoal-800 outline-none"
                      />
                      <div className="w-28 flex items-center bg-cream-100/70 border border-cream-300 rounded-lg px-2">
                        <span className="text-xs text-charcoal-500 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          step="1"
                          placeholder="Price"
                          value={newOptPrice}
                          onChange={(e) => setNewOptPrice(e.target.value)}
                          className="w-full text-xs p-2 bg-transparent text-charcoal-900 font-bold outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAddOptionGroupId(null);
                          setNewOptName('');
                          setNewOptPrice('0');
                        }}
                        className="btn-outline px-3 py-1.5 text-xs font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={loadingAction === `add_opt_${group.id}` || !newOptName.trim()}
                        onClick={() => handleAddOption(group.id)}
                        className="btn-primary px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        {loadingAction === `add_opt_${group.id}` && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                        <span>Save Option</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAddOptionGroupId(group.id);
                      setNewOptName('');
                      setNewOptPrice('0');
                    }}
                    className="text-xs font-bold text-bronze-700 hover:text-bronze-900 flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add option to {group.name}</span>
                  </button>
                )}
              </div>
            ))
          )}

          {/* Add New Group Section */}
          {showAddGroup ? (
            <form onSubmit={handleCreateGroup} className="bg-white p-5 rounded-xl border border-charcoal-800 shadow-subtle space-y-3">
              <h3 className="font-serif text-sm font-bold text-charcoal-900">Create New Customization Group</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-charcoal-800 mb-1">Group Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Choose Size, Milk Type, Extra Toppings..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full p-2.5 bg-cream-100/70 border border-cream-300 rounded-lg text-charcoal-900 font-semibold focus:border-charcoal-800 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-charcoal-800 mb-1">Selection Mode</label>
                    <select
                      value={newGroupType}
                      onChange={(e) => setNewGroupType(e.target.value as 'SINGLE' | 'MULTI')}
                      className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg text-charcoal-900 font-bold focus:border-charcoal-800 outline-none"
                    >
                      <option value="SINGLE">Single Selection (Radio)</option>
                      <option value="MULTI">Multiple Selections (Checkbox)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-charcoal-800 mb-1">Requirement</label>
                    <label className="flex items-center gap-2 p-2 border border-cream-300 rounded-lg cursor-pointer bg-cream-50">
                      <input
                        type="checkbox"
                        checked={newGroupRequired}
                        onChange={(e) => setNewGroupRequired(e.target.checked)}
                        className="w-3.5 h-3.5 text-charcoal-900 rounded"
                      />
                      <span className="font-bold text-charcoal-800">Required Selection</span>
                    </label>
                  </div>
                </div>

                {newGroupType === 'MULTI' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-charcoal-800 mb-1">Min Selections</label>
                      <input
                        type="number"
                        min="0"
                        value={newGroupMin}
                        onChange={(e) => setNewGroupMin(parseInt(e.target.value) || 0)}
                        className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg text-charcoal-900 font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-charcoal-800 mb-1">Max Selections</label>
                      <input
                        type="number"
                        min="1"
                        value={newGroupMax}
                        onChange={(e) => setNewGroupMax(parseInt(e.target.value) || 1)}
                        className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg text-charcoal-900 font-bold outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGroup(false)}
                    className="btn-outline px-3.5 py-2 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === 'create_group'}
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    {loadingAction === 'create_group' && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                    <span>Create Group</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddGroup(true)}
              className="btn-outline w-full py-3 rounded-xl border-dashed flex items-center justify-center gap-2 text-xs font-bold hover:border-charcoal-800 hover:bg-cream-100"
            >
              <Plus className="w-4 h-4 text-bronze-700" />
              <span>+ Add Customization Group</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cream-300 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-6 py-2 rounded-lg text-xs font-bold shadow-subtle"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
