import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/api/axios';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  high:     { color: 'bg-red-50 border-red-200',      badge: 'bg-red-500 text-white',     icon: '🚨', label: 'HIGH RISK' },
  moderate: { color: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-500 text-white',  icon: '⚠️', label: 'MODERATE' },
  low:      { color: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-400 text-white',    icon: 'ℹ️', label: 'LOW RISK' },
};

export default function InteractionCheckerPage() {
  const [drugs,     setDrugs]     = useState(['', '']);
  const [result,    setResult]    = useState(null);

  const check = useMutation({
    mutationFn: (drugList) => api.post('/interactions/check', { drugs: drugList }),
    onSuccess:  (res) => setResult(res.data.data),
    onError:    (err) => toast.error(err.response?.data?.message || 'Check failed'),
  });

  const addDrug    = () => { if (drugs.length < 10) setDrugs(d => [...d, '']); };
  const removeDrug = (i) => setDrugs(d => d.filter((_, idx) => idx !== i));
  const setDrug    = (i, val) => setDrugs(d => d.map((v, idx) => idx === i ? val : v));

  const handleCheck = () => {
    const valid = drugs.map(d => d.trim()).filter(Boolean);
    if (valid.length < 2) { toast.error('Enter at least 2 drug generic names'); return; }
    setResult(null);
    check.mutate(valid);
  };

  const highCount     = result?.interactions.filter(i => i.severity === 'high').length     || 0;
  const moderateCount = result?.interactions.filter(i => i.severity === 'moderate').length || 0;
  const lowCount      = result?.interactions.filter(i => i.severity === 'low').length      || 0;

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="section-title">Drug Interaction Checker</h1>
          <p className="section-subtitle mx-auto max-w-xl">
            Enter generic drug names to check for known interactions. Uses generic names only — not brand names.
          </p>
        </div>

        {/* Input form */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">Enter Drug Names</h2>
            <span className="text-xs text-neutral-400">Use generic names (e.g. "warfarin" not "Coumadin")</span>
          </div>

          <div className="space-y-3">
            {drugs.map((drug, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <input
                  className="input flex-1"
                  value={drug}
                  onChange={e => setDrug(i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. warfarin' : i === 1 ? 'e.g. aspirin' : `Drug ${i + 1}…`}
                  onKeyDown={e => e.key === 'Enter' && i === drugs.length - 1 && addDrug()}
                />
                {drugs.length > 2 && (
                  <button onClick={() => removeDrug(i)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={addDrug} disabled={drugs.length >= 10} className="btn-secondary btn-sm">
              + Add Drug
            </button>
            <button onClick={handleCheck} disabled={check.isPending} className="btn-primary ml-auto">
              {check.isPending
                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Checking…</>
                : '🔍 Check Interactions'
              }
            </button>
          </div>

          {/* Common examples */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['warfarin','aspirin'],
                ['metformin','alcohol'],
                ['metronidazole','alcohol'],
                ['sildenafil','nitroglycerin'],
              ].map(pair => (
                <button key={pair.join('+')}
                  onClick={() => { setDrugs(pair); setResult(null); }}
                  className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs rounded-full transition-colors">
                  {pair.join(' + ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary card */}
            <div className={`card p-5 border-2 ${result.summary.safe ? 'border-primary-200 bg-primary-50' : highCount > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`text-4xl`}>{result.summary.safe ? '✅' : highCount > 0 ? '🚨' : '⚠️'}</div>
                <div>
                  <h3 className={`font-display font-bold text-xl ${result.summary.safe ? 'text-primary-800' : highCount > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
                    {result.summary.safe
                      ? 'No interactions detected'
                      : `${result.summary.interactions} interaction${result.summary.interactions > 1 ? 's' : ''} found`
                    }
                  </h3>
                  <p className="text-sm text-neutral-600 mt-0.5">
                    Checked {result.summary.pairs} drug pair{result.summary.pairs > 1 ? 's' : ''} from {result.summary.checked} drugs
                  </p>
                </div>
              </div>

              {!result.summary.safe && (
                <div className="flex gap-3 mt-4">
                  {highCount     > 0 && <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full"><span className="w-2 h-2 rounded-full bg-red-500"/><span className="text-xs font-semibold text-red-700">{highCount} High Risk</span></div>}
                  {moderateCount > 0 && <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-full"><span className="w-2 h-2 rounded-full bg-yellow-500"/><span className="text-xs font-semibold text-yellow-700">{moderateCount} Moderate</span></div>}
                  {lowCount      > 0 && <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full"><span className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-xs font-semibold text-blue-700">{lowCount} Low Risk</span></div>}
                </div>
              )}
            </div>

            {/* Interaction cards */}
            {result.interactions.map((interaction, i) => {
              const cfg = SEVERITY_CONFIG[interaction.severity];
              return (
                <div key={i} className={`card p-5 border ${cfg.color}`}>
                  <div className="flex items-start gap-4">
                    <span className="text-2xl shrink-0">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-display font-bold text-neutral-800 text-lg">
                          {interaction.drug1}
                          <span className="text-neutral-400 mx-2">↔</span>
                          {interaction.drug2}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-neutral-700 text-sm leading-relaxed mb-3">
                        {interaction.description}
                      </p>
                      {interaction.recommendation && (
                        <div className="p-3 bg-white/70 rounded-xl border border-white">
                          <p className="text-xs font-semibold text-neutral-600 mb-1">💡 Recommendation:</p>
                          <p className="text-sm text-neutral-700">{interaction.recommendation}</p>
                        </div>
                      )}
                      {interaction.mechanism && (
                        <p className="text-xs text-neutral-500 mt-2">
                          <span className="font-medium">Mechanism:</span> {interaction.mechanism}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Disclaimer */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <p className="text-xs text-neutral-500">
                ⚕️ <strong>Medical Disclaimer:</strong> This tool is for informational purposes only.
                Always consult your pharmacist or physician before making medication decisions.
                This database may not cover all possible interactions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
