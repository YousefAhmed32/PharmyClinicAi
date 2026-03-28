import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending:'badge-yellow', reviewed:'badge-blue', responded:'badge-green', fulfilled:'badge-gray' };

function RespondModal({ prescription, onClose, onSave, isSaving }) {
  const [adminNotes, setAdminNotes] = useState(prescription.adminNotes || '');
  const [medicines, setMedicines]   = useState(
    prescription.medicines?.length ? prescription.medicines : [{ name:'', price:'', quantity:'1', notes:'' }]
  );
  const [status, setStatus] = useState('responded');

  const addMed    = () => setMedicines(m => [...m, { name:'', price:'', quantity:'1', notes:'' }]);
  const removeMed = (i) => setMedicines(m => m.filter((_,idx) => idx !== i));
  const setMed    = (i, k, v) => setMedicines(m => m.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const total = medicines.reduce((s, m) => s + (Number(m.price)||0) * (Number(m.quantity)||1), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validMeds = medicines.filter(m => m.name.trim());
    onSave({ adminNotes, medicines: validMeds, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-lg">Respond to Prescription</h2>
          <button onClick={onClose} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Prescription file */}
        <div className="p-5 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700 mb-2">Prescription File</p>
          <a href={prescription.fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-primary-700 hover:bg-primary-100 transition-colors text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View {prescription.fileName}
          </a>
          {prescription.notes && (
            <div className="mt-3 p-3 bg-neutral-50 rounded-xl">
              <p className="text-xs text-neutral-400 mb-1">Patient notes:</p>
              <p className="text-sm text-neutral-700">{prescription.notes}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Admin notes */}
          <div>
            <label className="label">Pharmacist Response / Notes</label>
            <textarea className="input" rows={3} value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Explain the medicines, dosage, warnings…"/>
          </div>

          {/* Medicines list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Medicine List</label>
              <button type="button" onClick={addMed} className="btn-secondary btn-sm">+ Add Medicine</button>
            </div>
            <div className="space-y-3">
              {medicines.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="input col-span-4 text-sm" value={m.name} onChange={e => setMed(i,'name',e.target.value)} placeholder="Medicine name"/>
                  <input type="number" min="0" step="0.01" className="input col-span-2 text-sm" value={m.price} onChange={e => setMed(i,'price',e.target.value)} placeholder="Price"/>
                  <input type="number" min="1" className="input col-span-2 text-sm" value={m.quantity} onChange={e => setMed(i,'quantity',e.target.value)} placeholder="Qty"/>
                  <input className="input col-span-3 text-sm" value={m.notes} onChange={e => setMed(i,'notes',e.target.value)} placeholder="Note"/>
                  <button type="button" onClick={() => removeMed(i)} className="btn-ghost btn-sm text-red-500 col-span-1 justify-center">✕</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 text-sm font-bold text-neutral-800">
              Total Estimate: {total.toFixed(2)} EGP
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Update Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="reviewed">Reviewed — under preparation</option>
              <option value="responded">Responded — medicines listed</option>
              <option value="fulfilled">Fulfilled — order completed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center">
              {isSaving ? 'Saving…' : 'Send Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPrescriptionsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-prescriptions', statusFilter],
    queryFn: () => api.get('/prescriptions/admin', {
      params: { limit: 20, ...(statusFilter && { status: statusFilter }) }
    }).then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-prescription-stats'],
    queryFn: () => api.get('/prescriptions/admin/stats').then(r => r.data.data),
  });

  const respond = useMutation({
    mutationFn: (body) => api.patch(`/prescriptions/admin/${selected._id}/respond`, body),
    onSuccess: () => { toast.success('Response sent ✓'); qc.invalidateQueries(['admin-prescriptions']); setSelected(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const prescriptions = data || [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Prescriptions</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Patient prescription uploads</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label:'Total',     val:stats.total,                   icon:'📋', color:'bg-neutral-50' },
            { label:'Pending',   val:stats.byStatus?.pending||0,    icon:'⏳', color:'bg-yellow-50' },
            { label:'Responded', val:stats.byStatus?.responded||0,  icon:'✅', color:'bg-primary-50' },
            { label:'Fulfilled', val:stats.byStatus?.fulfilled||0,  icon:'📦', color:'bg-blue-50' },
          ].map(({label,val,icon,color}) => (
            <div key={label} className={`card p-3 flex items-center gap-3 ${color}`}>
              <span className="text-lg">{icon}</span>
              <div><p className="font-bold text-sm">{val??'—'}</p><p className="text-xs text-neutral-500">{label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[['','All'],['pending','Pending'],['reviewed','Reviewed'],['responded','Responded'],['fulfilled','Fulfilled']].map(([v,l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter===v?'bg-primary-600 text-white border-primary-600':'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : prescriptions.length === 0 ? (
          <div className="p-12 text-center"><p className="text-4xl mb-3">📋</p><p className="text-neutral-500">No prescriptions found</p></div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead><tr><th>Patient</th><th>File</th><th>Notes</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {prescriptions.map(p => (
                  <tr key={p._id}>
                    <td>
                      <p className="font-medium text-sm">{p.patient?.name}</p>
                      <p className="text-xs text-neutral-400">{p.patient?.email}</p>
                    </td>
                    <td>
                      <a href={p.fileUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-primary-600 text-xs hover:underline">
                        {p.fileType === 'image' ? '🖼️' : '📄'} {p.fileName?.slice(0,20)}…
                      </a>
                    </td>
                    <td className="text-xs text-neutral-500 max-w-[140px]">
                      <p className="truncate">{p.notes || '—'}</p>
                    </td>
                    <td><span className={STATUS_COLORS[p.status]||'badge-gray'}>{p.status}</span></td>
                    <td className="text-xs text-neutral-500">{format(new Date(p.createdAt),'dd MMM yyyy')}</td>
                    <td>
                      <button onClick={() => setSelected(p)} className="btn-primary btn-sm">
                        {p.status === 'pending' ? 'Respond' : 'Edit Response'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <RespondModal
          prescription={selected}
          onClose={() => setSelected(null)}
          onSave={(body) => respond.mutate(body)}
          isSaving={respond.isPending}
        />
      )}
    </div>
  );
}
