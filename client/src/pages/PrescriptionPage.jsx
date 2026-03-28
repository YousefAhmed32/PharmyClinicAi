import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:   'badge-yellow',
  reviewed:  'badge-blue',
  responded: 'badge-green',
  fulfilled: 'badge-gray',
};

// ── Drag & Drop Upload Zone ───────────────────────────────────────────────
function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }, []);

  const validateAndSet = (file) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, WebP, or PDF allowed'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
        ${dragging
          ? 'border-primary-500 bg-primary-50 scale-[1.01]'
          : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) validateAndSet(e.target.files[0]); }}
      />
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="font-semibold text-neutral-700 mb-1">
        {dragging ? 'Drop your prescription here' : 'Drag & drop your prescription'}
      </p>
      <p className="text-sm text-neutral-500">or click to browse files</p>
      <p className="text-xs text-neutral-400 mt-3">Supported: JPG, PNG, PDF — max 10MB</p>
    </div>
  );
}

// ── File Preview ──────────────────────────────────────────────────────────
function FilePreview({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const url     = URL.createObjectURL(file);

  return (
    <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
      <div className="w-16 h-16 rounded-xl bg-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
        {isImage
          ? <img src={url} alt="preview" className="w-full h-full object-cover"/>
          : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-neutral-800 truncate">{file.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {isImage ? 'Image' : 'PDF'} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <button onClick={onRemove}
        className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

export default function PrescriptionPage() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [file,  setFile]  = useState(null);
  const [notes, setNotes] = useState('');
  const [tab,   setTab]   = useState('upload'); // upload | history

  // My prescriptions
  const { data: myData, refetch } = useQuery({
    queryKey: ['my-prescriptions'],
    queryFn:  () => api.get('/prescriptions/my', { params: { limit: 20 } }).then(r => r.data.data),
    enabled:  !!accessToken,
  });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      if (notes) fd.append('notes', notes);
      return api.post('/prescriptions/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Prescription uploaded! Our pharmacist will review it shortly 💊');
      setFile(null);
      setNotes('');
      refetch();
      setTab('history');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  if (!accessToken) {
    return (
      <div className="section">
        <div className="container-app max-w-lg text-center">
          <div className="card p-12">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-display font-semibold text-xl mb-3">Login Required</h2>
            <p className="text-neutral-500 mb-6">Please login to upload your prescription</p>
            <button onClick={() => navigate('/login')} className="btn-primary">Login Now</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container-app max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#339966" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="section-title">Upload Prescription</h1>
          <p className="section-subtitle">
            Send us your prescription and our pharmacist will review it and provide pricing
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl mb-6">
          {[['upload','📤 Upload New'],['history','📋 My Prescriptions']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${tab === id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="space-y-5 animate-fade-in">
            {!file ? (
              <UploadZone onFile={setFile}/>
            ) : (
              <FilePreview file={file} onRemove={() => setFile(null)}/>
            )}

            <div>
              <label className="label">Notes for pharmacist <span className="text-neutral-400 font-normal text-xs">(optional)</span></label>
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="E.g. I need the cheapest generic alternative, please include dosage instructions…"
              />
            </div>

            {/* How it works */}
            <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100">
              <h3 className="font-semibold text-primary-800 mb-3">📋 How it works</h3>
              <div className="space-y-2">
                {[
                  ['1','Upload your prescription photo or PDF'],
                  ['2','Our pharmacist reviews it (usually within 2 hours)'],
                  ['3','You receive a medicine list with pricing'],
                  ['4','Confirm and we prepare your order'],
                ].map(([n, text]) => (
                  <div key={n} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{n}</span>
                    <p className="text-sm text-primary-700">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => upload.mutate()}
              disabled={!file || upload.isPending}
              className="btn-primary w-full justify-center py-3.5 text-base">
              {upload.isPending ? (
                <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Uploading…</>
              ) : '📤 Send Prescription'}
            </button>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="animate-fade-in space-y-4">
            {!myData || myData.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold text-neutral-700">No prescriptions yet</p>
                <button onClick={() => setTab('upload')} className="btn-primary mt-4">Upload First Prescription</button>
              </div>
            ) : myData.map(p => (
              <div key={p._id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-800">{p.fileName}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{format(new Date(p.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                  <span className={STATUS_COLORS[p.status] || 'badge-gray'}>{p.status}</span>
                </div>

                {p.notes && (
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <p className="text-xs text-neutral-400 mb-1">Your notes:</p>
                    <p className="text-sm text-neutral-700">{p.notes}</p>
                  </div>
                )}

                {/* Pharmacist response */}
                {p.status === 'responded' && p.adminNotes && (
                  <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                    <p className="text-xs font-semibold text-primary-700 mb-2">💊 Pharmacist Response:</p>
                    <p className="text-sm text-primary-800">{p.adminNotes}</p>
                    {p.medicines?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {p.medicines.map((m, i) => (
                          <div key={i} className="flex justify-between text-xs text-primary-700">
                            <span>{m.name} × {m.quantity}</span>
                            <span className="font-semibold">{(m.price * m.quantity).toFixed(2)} EGP</span>
                          </div>
                        ))}
                        <div className="border-t border-primary-200 pt-1 mt-1 flex justify-between text-sm font-bold text-primary-800">
                          <span>Total Estimate</span>
                          <span>{p.totalEstimate?.toFixed(2)} EGP</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* View file link */}
                <a href={p.fileUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  View prescription file
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
