import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from '@/hooks/useCommon';
import { appointmentsAPI } from '@/api/services';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending:   'badge-yellow',
  confirmed: 'badge-green',
  completed: 'badge-blue',
  cancelled: 'badge-red',
  'no-show': 'badge-gray',
};
const TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no-show', 'cancelled'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

function AppointmentModal({ appt, onClose, onStatusUpdate, isUpdating }) {
  const { t } = useTranslation();
  const [newStatus,  setNewStatus]  = useState('');
  const [adminNotes, setAdminNotes] = useState(appt.adminNotes || '');
  const allowed = TRANSITIONS[appt.status] || [];

  const apptDate   = new Date(`${appt.date}T${appt.timeSlot}:00`);
  const isPastAppt = isPast(apptDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay" onClick={onClose}/>
      <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{t('admin.appointmentDetails')}</h2>
            <span className={STATUS_COLORS[appt.status] || 'badge-gray'}>{t(`appointments.statuses.${appt.status}`) || appt.status}</span>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-primary-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center font-bold text-primary-800 text-lg shrink-0">
              {appt.patient?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-neutral-800">{appt.patient?.name}</p>
              <p className="text-sm text-neutral-600">{appt.patient?.email}</p>
              <p className="text-sm text-neutral-600">{appt.patient?.phone || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('admin.doctor'),  val: appt.doctorName },
              { label: t('admin.service'), val: appt.service?.replace(/-/g,' ') },
              { label: t('common.date'),   val: appt.date },
              { label: t('appointments.selectTime'), val: appt.timeSlot },
            ].map(({ label, val }) => (
              <div key={label} className="bg-neutral-50 rounded-xl p-3">
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-semibold text-neutral-800 capitalize">{val}</p>
              </div>
            ))}
          </div>

          <div className={`px-3 py-2 rounded-xl text-sm font-medium ${
            isToday(apptDate)    ? 'bg-primary-50 text-primary-700 border border-primary-200' :
            isTomorrow(apptDate) ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            isPastAppt           ? 'bg-neutral-100 text-neutral-500' :
            'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            📅 {isToday(apptDate) ? t('admin.today_label') : isTomorrow(apptDate) ? t('admin.tomorrow_label') : format(apptDate, 'EEEE, dd MMMM yyyy')} at {appt.timeSlot}
          </div>

          {appt.notes && (
            <div className="bg-neutral-50 rounded-xl p-3">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">{t('admin.patientNotes')}</p>
              <p className="text-sm text-neutral-700">{appt.notes}</p>
            </div>
          )}

          {appt.status === 'cancelled' && (
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-xs text-red-500 font-medium mb-1">{t('admin.cancellationInfo')}</p>
              <p className="text-sm text-red-700">{t('admin.cancelledBy')} {appt.cancelledBy || '—'}</p>
              {appt.cancelReason && <p className="text-sm text-red-700">{t('admin.cancelReason')} {appt.cancelReason}</p>}
              {appt.cancelledAt  && <p className="text-xs text-red-400 mt-1">{format(new Date(appt.cancelledAt), 'dd MMM yyyy HH:mm')}</p>}
            </div>
          )}

          {allowed.length > 0 && (
            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <p className="text-sm font-semibold text-neutral-700">{t('admin.updateAppointment')}</p>
              <div>
                <label className="label">{t('admin.adminNotes')}</label>
                <textarea className="input text-sm" rows={2} value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={t('admin.adminNotesPlaceholder')}/>
              </div>
              <div className="flex gap-2">
                <select className="input flex-1 text-sm" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">{t('admin.changeStatus')}</option>
                  {allowed.map(s => <option key={s} value={s}>{t(`appointments.statuses.${s}`) || s}</option>)}
                </select>
                <button
                  disabled={!newStatus || isUpdating}
                  onClick={() => onStatusUpdate(appt._id, newStatus, adminNotes)}
                  className="btn-primary shrink-0 min-w-[90px]">
                  {isUpdating ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-neutral-400 border-t border-neutral-100 pt-3 space-y-0.5">
            <p>{t('common.date')}: {format(new Date(appt.createdAt), 'dd MMM yyyy HH:mm')}</p>
            {appt.confirmedAt && <p>{t('appointments.statuses.confirmed')}: {format(new Date(appt.confirmedAt), 'dd MMM yyyy HH:mm')}</p>}
            {appt.completedAt && <p>{t('appointments.statuses.completed')}: {format(new Date(appt.completedAt), 'dd MMM yyyy HH:mm')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAppointmentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState(null);
  const [filters,   setFilters]   = useState({ status:'', date:'', doctorName:'', service:'' });
  const [searchDoc, setSearchDoc] = useState('');

  const debouncedDoctor = useDebouncedCallback((val) => {
    setPage(1); setFilters(f => ({ ...f, doctorName: val }));
  }, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-appointments', page, filters],
    queryFn: () => appointmentsAPI.getAll({
      page, limit: 12,
      ...(filters.status     && { status:     filters.status }),
      ...(filters.date       && { date:        filters.date }),
      ...(filters.doctorName && { doctorName:  filters.doctorName }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-appt-stats'],
    queryFn: () => appointmentsAPI.getStats().then(r => r.data.data),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => appointmentsAPI.getDoctors().then(r => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, notes }) => appointmentsAPI.updateStatus(id, { status, adminNotes: notes }),
    onSuccess: (res) => {
      toast.success(t('common.success'));
      qc.invalidateQueries(['admin-appointments']);
      qc.invalidateQueries(['admin-appt-stats']);
      setSelected(res.data.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const deleteAppt = useMutation({
    mutationFn: (id) => appointmentsAPI.delete(id),
    onSuccess: () => { toast.success(t('common.success')); qc.invalidateQueries(['admin-appointments']); setSelected(null); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const appts      = data?.data || [];
  const meta       = data?.meta || {};
  const stats      = statsData;
  const doctors    = doctorsData || [];
  const hasFilters = filters.status || filters.date || filters.doctorName;
  const resetFilters = () => { setFilters({ status:'', date:'', doctorName:'', service:'' }); setSearchDoc(''); setPage(1); };
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.appointments')}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{meta.total || 0} {t('admin.totalOrders')}</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: t('common.all'),                       val: stats.total,                     icon:'📋', color:'bg-neutral-50' },
            { label: t('admin.upcoming'),                   val: stats.upcoming,                  icon:'📅', color:'bg-blue-50' },
            { label: t('appointments.statuses.pending'),    val: stats.byStatus?.pending    || 0, icon:'⏳', color:'bg-yellow-50' },
            { label: t('appointments.statuses.confirmed'),  val: stats.byStatus?.confirmed  || 0, icon:'✅', color:'bg-primary-50' },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className={`card p-3 flex items-center gap-3 ${color}`}>
              <span className="text-lg">{icon}</span>
              <div>
                <p className="font-bold text-neutral-900 text-sm">{val ?? '—'}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="input pl-9 text-sm" placeholder={t('admin.searchByDoctor')}
              value={searchDoc}
              onChange={e => { setSearchDoc(e.target.value); debouncedDoctor(e.target.value); }}
            />
          </div>
          {doctors.length > 0 && (
            <select className="input w-auto text-sm" value={filters.doctorName}
              onChange={e => { setPage(1); setFilters(f => ({ ...f, doctorName: e.target.value })); setSearchDoc(e.target.value); }}>
              <option value="">{t('admin.allDoctors')}</option>
              {doctors.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <select className="input w-auto text-sm" value={filters.status}
            onChange={e => { setPage(1); setFilters(f => ({ ...f, status: e.target.value })); }}>
            <option value="">{t('admin.allStatus')}</option>
            {['pending','confirmed','completed','cancelled','no-show'].map(s => (
              <option key={s} value={s}>{t(`appointments.statuses.${s}`) || s}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500 whitespace-nowrap">{t('admin.dateLabel')}</label>
            <input type="date" className="input text-sm w-36" value={filters.date}
              onChange={e => { setPage(1); setFilters(f => ({ ...f, date: e.target.value })); }}/>
          </div>
          <button
            onClick={() => { setPage(1); setFilters(f => ({ ...f, date: today })); }}
            className={`btn-sm ${filters.date === today ? 'btn-primary' : 'btn-secondary'}`}>
            {t('admin.today')}
          </button>
          {hasFilters && <button onClick={resetFilters} className="btn-ghost btn-sm text-red-500">✕ {t('admin.clearFilters')}</button>}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.doctorName && <span className="badge-blue text-xs">{t('admin.doctor')}: {filters.doctorName}</span>}
            {filters.status     && <span className={`text-xs ${STATUS_COLORS[filters.status]||'badge-gray'}`}>{t(`appointments.statuses.${filters.status}`) || filters.status}</span>}
            {filters.date       && <span className="badge-gray text-xs">{t('common.date')}: {filters.date}</span>}
          </div>
        )}
      </div>

      <div className={`card transition-opacity ${isFetching?'opacity-70':''}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(8)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
        ) : appts.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-semibold text-neutral-700">{t('admin.noAppointments')}</p>
            {hasFilters && <button onClick={resetFilters} className="btn-secondary mt-4">{t('admin.clearFilters')}</button>}
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('admin.doctor')}</th>
                  <th>{t('admin.service')}</th>
                  <th>{t('admin.dateTime')}</th>
                  <th>{t('admin.when')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {appts.map(a => {
                  const apptDate = new Date(`${a.date}T${a.timeSlot}:00`);
                  const whenLabel = isToday(apptDate) ? t('admin.today_label') : isTomorrow(apptDate) ? t('admin.tomorrow_label') : isPast(apptDate) ? t('admin.past_label') : t('admin.upcoming_label');
                  return (
                    <tr key={a._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                            {a.patient?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">{a.patient?.name}</p>
                            <p className="text-xs text-neutral-400">{a.patient?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm font-medium text-neutral-700">{a.doctorName}</td>
                      <td><span className="badge-gray text-xs capitalize">{a.service?.replace(/-/g,' ')}</span></td>
                      <td>
                        <p className="text-sm font-medium text-neutral-800">{a.date}</p>
                        <p className="text-xs text-primary-600 font-semibold">{a.timeSlot}</p>
                      </td>
                      <td><span className="text-xs">{whenLabel}</span></td>
                      <td><span className={STATUS_COLORS[a.status]||'badge-gray'}>{t(`appointments.statuses.${a.status}`) || a.status}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setSelected(a)} className="btn-secondary btn-sm">{t('common.view')}</button>
                          {a.status === 'cancelled' && (
                            <button
                              onClick={() => { if(window.confirm(t('admin.deleteConfirm'))) deleteAppt.mutate(a._id); }}
                              className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
                              {t('common.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">{((meta.page-1)*meta.limit)+1}–{Math.min(meta.page*meta.limit, meta.total)} of {meta.total}</p>
            <div className="flex gap-1">
              <button disabled={meta.page<=1} onClick={()=>setPage(p=>p-1)} className="btn-ghost btn-sm disabled:opacity-40">← {t('common.previous')}</button>
              {[...Array(Math.min(meta.totalPages,7))].map((_,i)=>(
                <button key={i+1} onClick={()=>setPage(i+1)} className={`w-8 h-8 rounded-lg text-sm ${meta.page===i+1?'bg-primary-600 text-white':'hover:bg-neutral-100'}`}>{i+1}</button>
              ))}
              <button disabled={meta.page>=meta.totalPages} onClick={()=>setPage(p=>p+1)} className="btn-ghost btn-sm disabled:opacity-40">{t('common.next')} →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <AppointmentModal
          appt={selected}
          onClose={() => setSelected(null)}
          onStatusUpdate={(id, status, notes) => updateStatus.mutate({ id, status, notes })}
          isUpdating={updateStatus.isPending}
        />
      )}
    </div>
  );
}