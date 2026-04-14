import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = { high:'badge-red', moderate:'badge-yellow', low:'badge-blue' };
const EMPTY = { drug1:'', drug2:'', severity:'moderate', description:'', recommendation:'', mechanism:'' };

export default function AdminInteractionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [checkDrugs,  setCheckDrugs]  = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [search,      setSearch]      = useState('');
  const [severity,    setSeverity]    = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['interactions', search, severity],
    queryFn: () => api.get('/interactions', {
      params: { limit: 50, ...(search && { search }), ...(severity && { severity }) }
    }).then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (body) => editing ? api.put(`/interactions/${editing._id}`, body) : api.post('/interactions', body),
    onSuccess: () => {
      toast.success(editing ? t('adminInteractions.updated') : t('adminInteractions.added'));
      refetch();
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY);
    },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/interactions/${id}`),
    onSuccess: () => { toast.success(t('adminInteractions.deleted')); refetch(); },
    onError: (err) => toast.error(err.response?.data?.message || t('errors.unknown')),
  });

  const seedCommon = useMutation({
    mutationFn: () => api.post('/interactions/seed-common'),
    onSuccess: (res) => { toast.success(res.data.message); refetch(); },
    onError: (err) => toast.error(err.response?.data?.message || t('adminInteractions.seedFailed')),
  });

  const checkInteraction = async () => {
    const drugs = checkDrugs.split(',').map(d => d.trim()).filter(Boolean);
    if (drugs.length < 2) { toast.error(t('drugCheck.minDrugsError')); return; }
    try {
      const res = await api.post('/interactions/check', { drugs });
      setCheckResult(res.data.data);
    } catch { toast.error(t('drugCheck.checkFailed')); }
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ drug1: item.drug1, drug2: item.drug2, severity: item.severity, description: item.description, recommendation: item.recommendation || '', mechanism: item.mechanism || '' });
    setShowModal(true);
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const interactions = data || [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">{t('admin.interactions')}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {t('adminInteractions.subtitle', { count: interactions.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => seedCommon.mutate()} disabled={seedCommon.isPending} className="btn-secondary btn-sm">
            {seedCommon.isPending ? t('adminInteractions.seeding') : t('adminInteractions.seedCommon')}
          </button>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }} className="btn-primary">
            {t('adminInteractions.addInteraction')}
          </button>
        </div>
      </div>

      {/* Quick check */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold text-neutral-800 mb-3">{t('adminInteractions.quickCheckTitle')}</h2>
        <div className="flex gap-3">
          <input className="input flex-1" value={checkDrugs} onChange={e => setCheckDrugs(e.target.value)}
            placeholder={t('adminInteractions.quickCheckPlaceholder')}/>
          <button onClick={checkInteraction} className="btn-primary shrink-0">{t('common.search')}</button>
        </div>
        {checkResult && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${checkResult.summary.safe ? 'bg-primary-50 text-primary-700' : 'bg-red-50 text-red-700'}`}>
            {checkResult.summary.safe
              ? t('adminInteractions.checkSafe', { drugs: checkResult.drugs.join(', ') })
              : t('adminInteractions.checkUnsafe', {
                  count: checkResult.summary.interactions,
                  pairs: checkResult.interactions.map(i => `${i.drug1}↔${i.drug2}(${i.severity})`).join(' | ')
                })
            }
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input flex-1 min-w-[180px] text-sm" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('adminInteractions.searchPlaceholder')}/>
        <select className="input w-auto text-sm" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">{t('adminInteractions.allSeverity')}</option>
          <option value="high">🚨 {t('drugCheck.severity.high')}</option>
          <option value="moderate">⚠️ {t('drugCheck.severity.moderate')}</option>
          <option value="low">ℹ️ {t('drugCheck.severity.low')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
        ) : interactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💊</p>
            <p className="text-neutral-500 mb-4">{t('adminInteractions.noInteractions')}</p>
            <button onClick={() => seedCommon.mutate()} className="btn-primary">
              {t('adminInteractions.seedCommon')}
            </button>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('adminInteractions.colDrug1')}</th>
                  <th>{t('adminInteractions.colDrug2')}</th>
                  <th>{t('adminInteractions.colSeverity')}</th>
                  <th>{t('adminInteractions.colDescription')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {interactions.map(item => (
                  <tr key={item._id}>
                    <td><span className="font-mono font-medium text-sm">{item.drug1}</span></td>
                    <td><span className="font-mono font-medium text-sm">{item.drug2}</span></td>
                    <td>
                      <span className={`${SEVERITY_COLORS[item.severity] || 'badge-gray'} capitalize`}>
                        {t(`drugCheck.severity.${item.severity}`, item.severity)}
                      </span>
                    </td>
                    <td className="max-w-[220px]">
                      <p className="text-xs text-neutral-600 line-clamp-2">{item.description}</p>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="btn-ghost btn-sm text-blue-600">{t('common.edit')}</button>
                        <button onClick={() => { if(window.confirm(t('adminInteractions.deleteConfirm'))) remove.mutate(item._id); }}
                          className="btn-ghost btn-sm text-red-500">{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowModal(false)}/>
          <div className="relative z-50 bg-white rounded-2xl shadow-lifted w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-semibold text-lg">
                {editing ? t('adminInteractions.editInteraction') : t('adminInteractions.addInteraction')}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('adminInteractions.drug1Label')} *</label>
                  <input className="input font-mono" value={form.drug1} onChange={f('drug1')}
                    placeholder={t('adminInteractions.drug1Placeholder')} required disabled={!!editing}/>
                </div>
                <div>
                  <label className="label">{t('adminInteractions.drug2Label')} *</label>
                  <input className="input font-mono" value={form.drug2} onChange={f('drug2')}
                    placeholder={t('adminInteractions.drug2Placeholder')} required disabled={!!editing}/>
                </div>
              </div>
              <div>
                <label className="label">{t('adminInteractions.colSeverity')} *</label>
                <select className="input" value={form.severity} onChange={f('severity')}>
                  <option value="high">🚨 {t('drugCheck.severity.high')}</option>
                  <option value="moderate">⚠️ {t('drugCheck.severity.moderate')}</option>
                  <option value="low">ℹ️ {t('drugCheck.severity.low')}</option>
                </select>
              </div>
              <div>
                <label className="label">{t('adminInteractions.colDescription')} *</label>
                <textarea className="input" rows={3} value={form.description} onChange={f('description')} required
                  placeholder={t('adminInteractions.descriptionPlaceholder')}/>
              </div>
              <div>
                <label className="label">{t('adminInteractions.recommendationLabel')}</label>
                <textarea className="input" rows={2} value={form.recommendation} onChange={f('recommendation')}
                  placeholder={t('adminInteractions.recommendationPlaceholder')}/>
              </div>
              <div>
                <label className="label">{t('adminInteractions.mechanismLabel')}</label>
                <input className="input" value={form.mechanism} onChange={f('mechanism')}
                  placeholder={t('adminInteractions.mechanismPlaceholder')}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
                  {save.isPending
                    ? t('adminInteractions.saving')
                    : editing ? t('adminInteractions.updateBtn') : t('adminInteractions.addBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}