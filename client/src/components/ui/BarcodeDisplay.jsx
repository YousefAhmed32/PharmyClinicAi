import React, { useEffect, useRef, useState } from 'react';

/**
 * BarcodeDisplay
 * Renders a real scannable barcode (EAN-13, UPC-A, CODE128, etc.)
 * using JsBarcode via SVG — no canvas needed.
 *
 * Props:
 *   value     string   — barcode number/string
 *   format    string   — EAN13 | UPC | CODE128 | EAN8 | ITF14 (auto-detect if omitted)
 *   width     number   — bar width in px (default 2)
 *   height    number   — bar height in px (default 60)
 *   fontSize  number   — text size (default 14)
 *   showLabel bool     — show number below bars (default true)
 *   className string
 */
export default function BarcodeDisplay({
  value,
  format,
  width      = 2,
  height     = 60,
  fontSize   = 14,
  showLabel  = true,
  className  = '',
}) {
  const svgRef   = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  // Auto-detect format from value
  const detectFormat = (val) => {
    if (!val) return 'CODE128';
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length === 13) return 'EAN13';
    if (clean.length === 12) return 'UPC';
    if (clean.length === 8)  return 'EAN8';
    if (clean.length === 14) return 'ITF14';
    return 'CODE128';
  };

  useEffect(() => {
    if (!value || !svgRef.current) return;
    setError(null);

    const renderBarcode = async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        const fmt = format || detectFormat(value);

        JsBarcode(svgRef.current, value, {
          format:      fmt,
          width,
          height,
          fontSize,
          displayValue: showLabel,
          margin:       10,
          background:   '#ffffff',
          lineColor:    '#000000',
          textMargin:   4,
          fontOptions:  'bold',
          font:         'monospace',
          valid:        (isValid) => {
            if (!isValid) setError(`Invalid barcode: "${value}" for format ${fmt}`);
          },
        });
        setReady(true);
      } catch (err) {
        setError(`Barcode render failed: ${err.message}`);
      }
    };

    renderBarcode();
  }, [value, format, width, height, fontSize, showLabel]);

  if (!value) return null;

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-600 text-xs ${className}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {error}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg ref={svgRef} className={`transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}/>
      {!ready && (
        <div className="flex items-center gap-1 text-xs text-neutral-400 py-4">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          جاري توليد الباركود…
        </div>
      )}
    </div>
  );
}
