import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * BarcodeScanner
 * Scans real EAN/UPC/CODE128 barcodes from camera using ZXing.
 * Falls back to manual input.
 *
 * Props:
 *   onDetected(barcode: string)
 *   onClose()
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const [mode,        setMode]        = useState('manual');
  const [manualInput, setManualInput] = useState('');
  const [scanning,    setScanning]    = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [hasCamera,   setHasCamera]   = useState(false);
  const [torchOn,     setTorchOn]     = useState(false);
  const [devices,     setDevices]     = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);

  const videoRef   = useRef(null);
  const readerRef  = useRef(null);
  const inputRef   = useRef(null);
  const streamRef  = useRef(null);

  // Check camera on mount
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const cams = devs.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      setHasCamera(cams.length > 0);
    }).catch(() => setHasCamera(false));

    return () => stopCamera();
  }, []);

  // Focus manual input
  useEffect(() => {
    if (mode === 'manual') setTimeout(() => inputRef.current?.focus(), 150);
  }, [mode]);

  // ── Camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    try { readerRef.current?.reset(); } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanning(true);
    setLastScanned(null);

    try {
      // Choose camera (prefer back camera)
      const constraints = {
        video: {
          deviceId: devices[deviceIndex]?.deviceId
            ? { exact: devices[deviceIndex].deviceId }
            : undefined,
          facingMode: devices.length <= 1 ? 'environment' : undefined,
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Load ZXing dynamically
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      reader.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          const barcode = result.getText();
          const format  = result.getBarcodeFormat();

          // Debounce — ignore repeated scans within 2s
          if (barcode === lastScanned) return;
          setLastScanned(barcode);

          // Beep feedback
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain= ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch {}

          toast.success(`✅ تم مسح الباركود: ${barcode}`);
          stopCamera();
          onDetected(barcode);
        }
      });

    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'تم رفض الوصول للكاميرا. يرجى السماح بالإذن.'
        : err.name === 'NotFoundError'
          ? 'لا توجد كاميرا متاحة.'
          : `خطأ: ${err.message}`;
      setCameraError(msg);
      setScanning(false);
    }
  }, [devices, deviceIndex, lastScanned, stopCamera, onDetected]);

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setDeviceIndex(i => (i + 1) % devices.length);
    setTimeout(startCamera, 300);
  }, [devices, stopCamera, startCamera]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(t => !t);
    } catch {
      toast.error('الكاميرا لا تدعم الفلاش');
    }
  }, [torchOn]);

  // ── Manual submit ─────────────────────────────────────────────────────
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val || val.length < 3) { toast.error('أدخل باركود صحيح (3 أحرف على الأقل)'); return; }
    onDetected(val);
  };

  // ── Validate EAN checksum ────────────────────────────────────────────
  const validateEAN13 = (code) => {
    if (code.length !== 13 || !/^\d+$/.test(code)) return null;
    const sum = code.split('').slice(0, 12).reduce((acc, d, i) =>
      acc + parseInt(d) * (i % 2 === 0 ? 1 : 3), 0
    );
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(code[12]);
  };

  const eanValidation = manualInput.length === 13
    ? validateEAN13(manualInput)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={() => { stopCamera(); onClose(); }}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-md animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div>
            <h2 className="font-display font-semibold text-lg">ماسح الباركود</h2>
            <p className="text-xs text-neutral-400 mt-0.5">يدعم EAN-13 · UPC · CODE128 · QR</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 p-3 bg-neutral-50 border-b border-neutral-100">
          <button onClick={() => { stopCamera(); setMode('manual'); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${mode === 'manual' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
            ⌨️ إدخال يدوي
          </button>
          {hasCamera && (
            <button onClick={() => { setMode('camera'); setTimeout(startCamera, 100); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${mode === 'camera' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}>
              📷 مسح بالكاميرا
            </button>
          )}
        </div>

        <div className="p-5">
          {/* ── Camera mode ─────────────────────────────────────────── */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700">
                  ⚠️ {cameraError}
                  <button onClick={startCamera} className="mt-2 block btn-secondary btn-sm w-full">إعادة المحاولة</button>
                </div>
              ) : (
                <>
                  {/* Camera viewport */}
                  <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio:'4/3' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline/>

                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {/* Dark overlay with cutout */}
                      <div className="absolute inset-0 bg-black/40"/>
                      {/* Scan window */}
                      <div className="relative z-10 w-64 h-36">
                        {/* Corner markers */}
                        {[
                          'top-0 left-0 border-t-2 border-l-2',
                          'top-0 right-0 border-t-2 border-r-2',
                          'bottom-0 left-0 border-b-2 border-l-2',
                          'bottom-0 right-0 border-b-2 border-r-2',
                        ].map((cls, i) => (
                          <div key={i} className={`absolute w-6 h-6 border-primary-400 ${cls}`}/>
                        ))}
                        {/* Scanning line */}
                        {scanning && (
                          <div className="absolute left-0 right-0 h-0.5 bg-primary-500/80 shadow-green"
                            style={{ animation: 'scanLine 2s ease-in-out infinite' }}/>
                        )}
                        {/* Clear the overlay inside scan area */}
                        <div className="absolute inset-0 bg-transparent border border-transparent"/>
                      </div>
                      <style>{`
                        @keyframes scanLine {
                          0%   { top: 0; }
                          50%  { top: calc(100% - 2px); }
                          100% { top: 0; }
                        }
                      `}</style>
                    </div>

                    {/* Status badge */}
                    {scanning && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 text-white text-xs rounded-full flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"/>
                        جاري المسح…
                      </div>
                    )}

                    {/* Camera controls */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {devices.length > 1 && (
                        <button onClick={switchCamera}
                          className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="تغيير الكاميرا">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                          </svg>
                        </button>
                      )}
                      <button onClick={toggleTorch}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm
                          ${torchOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white hover:bg-black/70'}`}
                        title={torchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}>
                        {torchOn ? '💡' : '🔦'}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 text-center">
                    وجّه الكاميرا نحو الباركود الموجود على العبوة
                  </p>

                  {!scanning && !cameraError && (
                    <button onClick={startCamera} className="btn-primary w-full justify-center">
                      📷 بدء المسح
                    </button>
                  )}
                  {scanning && (
                    <button onClick={stopCamera} className="btn-secondary w-full justify-center">
                      ⏹ إيقاف
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Manual mode ─────────────────────────────────────────── */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="label">أدخل رقم الباركود</label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  className={`input text-center text-xl font-mono tracking-widest ${
                    eanValidation === false ? 'input-error' :
                    eanValidation === true  ? 'border-primary-400' : ''
                  }`}
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value.replace(/\s/g, ''))}
                  placeholder="مثال: 6224000315771"
                  autoComplete="off"
                />
                {/* EAN-13 validation indicator */}
                {manualInput.length === 13 && (
                  <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${eanValidation ? 'text-primary-600' : 'text-red-500'}`}>
                    {eanValidation
                      ? <><span>✅</span> EAN-13 صحيح</>
                      : <><span>⚠️</span> رقم التحقق غير صحيح — تأكد من الباركود</>
                    }
                  </div>
                )}
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-neutral-400">{manualInput.length} رقم</p>
                  <p className="text-xs text-neutral-400">EAN-13 = 13 رقم</p>
                </div>
              </div>

              {/* Common format info */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type:'EAN-13', digits:'13', eg:'6224000315771' },
                  { type:'UPC-A',  digits:'12', eg:'012345678905' },
                  { type:'CODE128',digits:'أي', eg:'MED-001' },
                ].map(f => (
                  <div key={f.type} className="p-2 bg-neutral-50 rounded-lg text-center border border-neutral-200">
                    <p className="text-xs font-semibold text-neutral-700">{f.type}</p>
                    <p className="text-[10px] text-neutral-400">{f.digits} رقم</p>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={!manualInput.trim() || manualInput.trim().length < 3}
                className="btn-primary w-full justify-center py-3 disabled:opacity-40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                بحث عن الباركود
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
