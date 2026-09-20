import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';

interface PrintableQrSheetProps {
  onBack: () => void;
}

export const PrintableQrSheet: React.FC<PrintableQrSheetProps> = ({ onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSheet() {
      try {
        const res = await api.getPrintableQrs();
        setData(res);
      } catch (err) {
        console.error('Failed to load printable QRs:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSheet();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-charcoal-700" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-8 text-charcoal-900">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="print:hidden mb-8 max-w-4xl mx-auto flex items-center justify-between border-b border-cream-300 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-950 bg-cream-100 hover:bg-cream-200 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Table Management</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-charcoal-500">
            {data?.tables?.length || 0} Table QRs Ready for Printing
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-charcoal-900 hover:bg-charcoal-950 text-cream-100 font-semibold text-xs px-4 py-2 rounded-lg shadow-subtle transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-bronze-300" />
            <span>Print Tabletop Stands (Ctrl+P / Cmd+P)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="max-w-4xl mx-auto">
        {/* Header (Minimalist & Serif) */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-charcoal-950">
            {data?.restaurantName}
          </h1>
          <p className="text-[11px] font-sans uppercase tracking-widest text-charcoal-500 mt-1 font-medium">
            Tabletop Ordering QR Stands
          </p>
        </div>

        {/* 2 or 3 Column Grid with Cutting Guides */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {data?.tables?.map((tbl: any) => (
            <div
              key={tbl.tableNumber}
              className="border border-dashed border-charcoal-300 rounded-2xl p-6 text-center flex flex-col items-center justify-between bg-white print:border-charcoal-400 break-inside-avoid"
            >
              {/* Stand Header */}
              <div className="w-full">
                <p className="font-serif font-bold text-sm text-charcoal-900 tracking-tight truncate">
                  {data?.restaurantName}
                </p>
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-cream-200 text-charcoal-900 text-xs font-bold font-sans">
                  TABLE {tbl.tableNumber}
                </div>
              </div>

              {/* High-Resolution Unobstructed QR Code */}
              <div className="my-4 p-2.5 bg-white rounded-xl border border-cream-300">
                <img
                  src={tbl.qrDataUrl}
                  alt={`Table ${tbl.tableNumber} QR`}
                  className="w-36 h-36 mx-auto object-contain"
                />
              </div>

              {/* Clear Tabletop Instructions */}
              <div className="w-full">
                <p className="text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-0.5 font-sans">
                  Scan to Order & Pay
                </p>
                <p className="text-[10px] text-charcoal-500 font-light leading-snug">
                  Point smartphone camera to browse menu and order from your table
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
