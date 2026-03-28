import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { format } from 'date-fns';

// ── Print styles injected into head ──────────────────────────────────────
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-root, #invoice-root * { visibility: visible !important; }
  #invoice-root { position: fixed; inset: 0; margin: 0; padding: 24px; }
  #invoice-actions { display: none !important; }
  @page { size: A4; margin: 10mm; }
}
`;

function QRPlaceholder({ value }) {
  // Simple QR placeholder — in production use a qr library
  return (
    <div className="w-16 h-16 border-2 border-neutral-300 rounded-lg flex items-center justify-center bg-neutral-50" title={value}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <line x1="14" y1="14" x2="14" y2="14" strokeWidth="3"/><line x1="17" y1="14" x2="21" y2="14"/>
        <line x1="14" y1="17" x2="14" y2="21"/><line x1="17" y1="17" x2="21" y2="21"/>
        <line x1="17" y1="17" x2="17" y2="17" strokeWidth="3"/>
      </svg>
    </div>
  );
}

export default function InvoicePage() {
  const { orderId } = useParams();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', orderId],
    queryFn:  () => api.get(`/invoice/${orderId}`).then(r => r.data.data),
  });

  const handlePrint = () => {
    // Inject print CSS
    const style = document.createElement('style');
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1000);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-primary-600" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <p className="text-neutral-500">Generating invoice…</p>
      </div>
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">❌</p>
        <p className="text-neutral-600 mb-4">Invoice not found or access denied.</p>
        <Link to="/orders" className="btn-primary">Back to Orders</Link>
      </div>
    </div>
  );

  const inv = invoice;

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
      {/* Action buttons — hidden on print */}
      <div id="invoice-actions" className="max-w-3xl mx-auto mb-4 flex items-center justify-between">
        <Link to={`/orders/${inv.orderId}`} className="btn-secondary btn-sm">← Back to Order</Link>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div id="invoice-root" className="max-w-3xl mx-auto bg-white shadow-lifted rounded-2xl overflow-hidden print:shadow-none print:rounded-none">

        {/* Header */}
        <div className="bg-neutral-900 text-white px-8 py-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-green shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">{inv.pharmacy.name}</h1>
              <p className="text-neutral-400 text-xs mt-0.5">{inv.pharmacy.address}</p>
              <p className="text-neutral-400 text-xs">{inv.pharmacy.phone} · {inv.pharmacy.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-neutral-400 text-xs uppercase tracking-widest">Invoice</p>
            <p className="font-display font-bold text-2xl text-white mt-0.5">{inv.invoiceNumber}</p>
            <p className="text-neutral-400 text-xs mt-1">
              {format(new Date(inv.issuedAt), 'dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Bill to + Order info */}
        <div className="px-8 py-6 grid grid-cols-2 gap-8 border-b border-neutral-100">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Bill To</p>
            <p className="font-semibold text-neutral-900">{inv.customer.name}</p>
            <p className="text-sm text-neutral-600 mt-1">{inv.customer.email}</p>
            <p className="text-sm text-neutral-600">{inv.customer.phone}</p>
            {inv.customer.address.street && (
              <div className="text-sm text-neutral-600 mt-2">
                <p>{inv.customer.address.street}</p>
                <p>{inv.customer.address.city}, {inv.customer.address.state} {inv.customer.address.zip}</p>
                <p>{inv.customer.address.country}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Order Details</p>
            {[
              ['Order #',   inv.orderNumber],
              ['Payment',   inv.paymentMethod.replace(/_/g,' ')],
              ['Status',    inv.orderStatus],
              ['Date',      format(new Date(inv.issuedAt), 'dd/MM/yyyy HH:mm')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b border-neutral-50">
                <span className="text-neutral-500">{label}</span>
                <span className="font-medium text-neutral-800 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items table */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-neutral-900">
                <th className="text-left py-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">Product</th>
                <th className="text-center py-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">Qty</th>
                <th className="text-right py-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right py-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-3 font-medium text-neutral-800">{item.name}</td>
                  <td className="py-3 text-center text-neutral-600">{item.quantity}</td>
                  <td className="py-3 text-right text-neutral-600">{item.price.toFixed(2)} EGP</td>
                  <td className="py-3 text-right font-semibold text-neutral-800">{item.subtotal.toFixed(2)} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span><span>{inv.subtotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Shipping</span>
                <span>{inv.shippingCost === 0 ? 'Free' : `${inv.shippingCost.toFixed(2)} EGP`}</span>
              </div>
              {inv.discount > 0 && (
                <div className="flex justify-between text-sm text-primary-600">
                  <span>Discount</span><span>-{inv.discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t-2 border-neutral-900 pt-2 mt-2">
                <span>Total</span><span>{inv.total.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        </div>

        {/* QR + Footer */}
        <div className="px-8 pb-8 flex items-end justify-between border-t border-neutral-100 pt-6">
          <div className="max-w-xs">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Return Policy</p>
            <p className="text-xs text-neutral-500 leading-relaxed">{inv.returnPolicy}</p>
            <p className="text-xs text-neutral-400 mt-4">
              Thank you for choosing {inv.pharmacy.name}.<br/>
              {inv.pharmacy.website}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <QRPlaceholder value={`${inv.pharmacy.website}/orders/${inv.orderId}`}/>
            <p className="text-[10px] text-neutral-400 text-center">Scan to track order</p>
          </div>
        </div>

        {/* Bottom stamp */}
        <div className="bg-primary-600 px-8 py-3 flex items-center justify-between">
          <p className="text-primary-100 text-xs">{inv.pharmacy.name} · {inv.pharmacy.phone}</p>
          <p className="text-primary-200 text-xs font-mono">{inv.invoiceNumber}</p>
        </div>
      </div>
    </div>
  );
}
