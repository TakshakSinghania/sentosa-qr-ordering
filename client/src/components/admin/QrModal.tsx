import React from 'react';
import { X, Download, Printer, ExternalLink } from 'lucide-react';
import { TableInfo } from '../../types/index.js';

interface QrModalProps {
  table: TableInfo | null;
  restaurantName: string;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ table, restaurantName, onClose }) => {
  if (!table) return null;

  const handleDownload = () => {
    if (!table.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = table.qrDataUrl;
    a.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-table-${table.tableNumber}-qr.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${restaurantName} - Table ${table.tableNumber} Stand</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              padding: 24px;
              color: #1c1917;
              background-color: #ffffff;
            }
            .stand-card {
              border: 1px solid #eae4d9;
              border-radius: 20px;
              padding: 40px 24px;
              max-width: 300px;
              margin: 0 auto;
            }
            .cafe-name {
              font-size: 20px;
              font-weight: 700;
              color: #1c1917;
              margin-bottom: 4px;
              font-family: 'Playfair Display', Georgia, serif;
            }
            .table-badge {
              display: inline-block;
              background-color: #f4efe6;
              color: #1c1917;
              padding: 4px 16px;
              border-radius: 100px;
              font-size: 13px;
              font-weight: 700;
              margin: 8px 0 20px;
              border: 1px solid #eae4d9;
            }
            .qr-wrapper {
              margin: 0 auto 20px;
              width: 180px;
              height: 180px;
              padding: 8px;
              border: 1px solid #eae4d9;
              border-radius: 12px;
            }
            .qr-wrapper img {
              width: 100%;
              height: 100%;
            }
            .cta {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1c1917;
              margin-bottom: 4px;
            }
            .instructions {
              font-size: 11px;
              color: #78716c;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="stand-card">
            <div class="cafe-name">${restaurantName}</div>
            <div class="table-badge">TABLE ${table.tableNumber}</div>
            <div class="qr-wrapper">
              <img src="${table.qrDataUrl}" />
            </div>
            <div class="cta">Scan to Order & Pay</div>
            <div class="instructions">Browse our menu and order directly from your table.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-modal text-center relative border border-cream-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 text-charcoal-600 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <h3 className="font-serif text-base font-bold text-charcoal-900 mb-0.5">{restaurantName}</h3>
        <p className="text-[11px] text-charcoal-500 mb-4 font-light">Tabletop Ordering Stand</p>

        {/* QR Preview Container */}
        <div className="bg-cream-100 p-4 rounded-xl border border-cream-300 inline-block mb-3">
          <img
            src={table.qrDataUrl}
            alt={`Table ${table.tableNumber} QR`}
            className="w-44 h-44 mx-auto"
          />
        </div>

        <div className="mb-4">
          <span className="bg-charcoal-900 text-cream-100 px-3 py-1 rounded-full text-xs font-bold">
            Table {table.tableNumber}
          </span>
          <p className="text-[10px] text-charcoal-500 font-mono mt-1.5 truncate">
            Token: {table.token}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cream-300">
          <button
            type="button"
            onClick={handleDownload}
            className="btn-outline flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-700" />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-bronze-300" />
            <span>Print Stand</span>
          </button>
        </div>

        {table.menuUrl && (
          <a
            href={table.menuUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-bronze-600 hover:text-bronze-800 font-medium"
          >
            <span>Preview Digital Menu</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
