import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { TableInfo } from '../../types/index.js';
import { QrModal } from '../../components/admin/QrModal.js';
import { PrintableQrSheet } from '../../components/admin/PrintableQrSheet.js';
import {
  Plus,
  QrCode,
  Printer,
  ExternalLink,
  Power,
  RotateCw,
  Loader2,
  X,
  Users,
} from 'lucide-react';

export const AdminTablesPage: React.FC = () => {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Views
  const [selectedQrTable, setSelectedQrTable] = useState<TableInfo | null>(null);
  const [showPrintableSheet, setShowPrintableSheet] = useState<boolean>(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState<boolean>(false);

  // Form Fields
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await api.getTables();
      setTables(data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum.trim()) return;
    setSubmitting(true);
    try {
      await api.createTable({
        tableNumber: newTableNum.trim(),
        capacity: newCapacity,
      });
      setNewTableNum('');
      setIsAddTableOpen(false);
      loadTables();
    } catch (err: any) {
      alert(`Failed to add table: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (tableId: string) => {
    try {
      await api.toggleTableActive(tableId);
      loadTables();
    } catch (err: any) {
      alert(`Error toggling table: ${err.message}`);
    }
  };

  const handleRegenerateToken = async (tableId: string, tableNum: string) => {
    if (!confirm(`Warning: Regenerating the QR token for Table ${tableNum} will immediately invalidate any existing printed QR code. You must print and place the new QR stand on the table. Proceed?`)) return;
    try {
      await api.regenerateTableToken(tableId);
      loadTables();
    } catch (err: any) {
      alert(`Failed to regenerate token: ${err.message}`);
    }
  };

  if (showPrintableSheet) {
    return <PrintableQrSheet onBack={() => setShowPrintableSheet(false)} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-300 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">
            Tables & Dynamic QR Codes
          </h1>
          <p className="text-xs text-charcoal-500 font-light mt-0.5">
            Every table has an unguessable cryptographic token binding orders strictly to that dining table
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrintableSheet(true)}
            className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-charcoal-700" />
            <span>Print All QR Codes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddTableOpen(true)}
            className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg shadow-subtle transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-700 mx-auto mb-2" />
          <p className="text-xs text-charcoal-500">Loading tables...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-xl border p-4 shadow-subtle flex flex-col justify-between transition-all ${
                !table.isActive
                  ? 'opacity-60 border-cream-300 bg-cream-100/50'
                  : table.isOccupied
                  ? 'border-cream-400 ring-1 ring-cream-300'
                  : 'border-cream-300 hover:border-charcoal-400'
              }`}
            >
              <div>
                {/* Table Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-charcoal-900 leading-tight">
                      Table {table.tableNumber}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-charcoal-500 mt-0.5 font-light">
                      <Users className="w-3 h-3 text-charcoal-400" />
                      <span>{table.capacity || 4} Seats</span>
                    </div>
                  </div>

                  {/* Occupancy Indicator */}
                  {table.isOccupied ? (
                    <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      <span>Occupied ({table.activeOrdersCount} {table.activeOrdersCount === 1 ? 'order' : 'orders'})</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-semantic-success bg-semantic-success-bg border border-semantic-success-border px-2 py-0.5 rounded">
                      Available
                    </span>
                  )}
                </div>

                {/* QR Preview Thumbnail */}
                <div
                  onClick={() => setSelectedQrTable(table)}
                  className="bg-cream-50 hover:bg-cream-100 cursor-pointer p-3 rounded-lg border border-cream-300 text-center mb-3 group transition-colors"
                >
                  <img
                    src={table.qrDataUrl}
                    alt={`Table ${table.tableNumber} QR`}
                    className="w-24 h-24 mx-auto object-contain"
                  />
                  <span className="text-[10px] font-semibold text-charcoal-800 group-hover:underline mt-1 inline-block">
                    View & Download
                  </span>
                </div>

                <div className="text-[10px] text-charcoal-500 font-mono truncate">
                  Token: {table.token}
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-3 pt-2.5 border-t border-cream-300/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedQrTable(table)}
                  className="font-semibold text-charcoal-900 hover:text-bronze-700 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRegenerateToken(table.id, table.tableNumber)}
                    className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-md transition-colors"
                    title="Regenerate QR Token (Invalidates old QR)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(table.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      table.isActive
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-charcoal-400 hover:bg-cream-200'
                    }`}
                    title={table.isActive ? 'Active Table' : 'Deactivated'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  {table.menuUrl && (
                    <a
                      href={table.menuUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-md transition-colors"
                      title="Open Table Menu"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <QrModal
        table={selectedQrTable}
        restaurantName={restaurant?.name || 'Café'}
        onClose={() => setSelectedQrTable(null)}
      />

      {isAddTableOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddTableOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-modal relative border border-cream-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddTableOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 text-charcoal-600 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="font-serif text-base font-bold text-charcoal-900 mb-0.5">Add Dining Table</h3>
            <p className="text-[11px] text-charcoal-500 mb-4 font-light">
              Generates a secure cryptographic QR token.
            </p>

            <form onSubmit={handleCreateTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-charcoal-700 mb-1">Table Number or Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12, Garden 01, VIP 01"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none font-semibold text-charcoal-900"
                />
              </div>

              <div>
                <label className="block font-medium text-charcoal-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none text-charcoal-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="btn-outline px-3.5 py-1.5 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold shadow-subtle flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                  <span>Add Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
