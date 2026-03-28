import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsAPI } from '@/api/services';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import { AppointmentSkeleton } from '@/components/ui/Skeletons';
import { EmptyState, ConfirmDialog, StatusBadge } from '@/components/ui/UIComponents';
import { useDisclosure } from '@/hooks/useCommon';

const SERVICE_LABELS = {
  'general-consultation':   '🩺 General Consultation',
  'prescription-review':    '💊 Prescription Review',
  'medication-counseling':  '💬 Medication Counseling',
  'blood-pressure-check':   '🩸 Blood Pressure Check',
  'diabetes-management':    '🩸 Diabetes Management',
  'vaccination':            '💉 Vaccination',
  'lab-results-review':     '🔬 Lab Results Review',
  'other':                  '📋 Other',
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const confirmDialog = useDisclosure();
  const [cancelTarget, setCancelTarget] = React.useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn:  () => appointmentsAPI.getMyList({ limit: 20 }).then(r => r.data.data),
  });

  const cancel = useMutation({
    mutationFn: (id) => appointmentsAPI.cancelMy(id, {}),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      qc.invalidateQueries(['my-appointments']);
      confirmDialog.close();
      setCancelTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot cancel — less than 1 hour before appointment'),
  });

  const handleCancelClick = (appt) => {
    setCancelTarget(appt);
    confirmDialog.open();
  };

  const upcoming = (data || []).filter(a => !isPast(new Date(`${a.date}T${a.timeSlot}:00`)) && !['cancelled','completed'].includes(a.status));
  const past     = (data || []).filter(a =>  isPast(new Date(`${a.date}T${a.timeSlot}:00`)) ||  ['cancelled','completed'].includes(a.status));

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">My Appointments</h1>
            <p className="section-subtitle mt-1">
              {data ? `${upcoming.length} upcoming · ${past.length} past` : ''}
            </p>
          </div>
          <Link to="/booking" className="btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Book New
          </Link>
        </div>

        {isLoading ? <AppointmentSkeleton count={4}/> : (
          (data || []).length === 0 ? (
            <EmptyState
              icon="📅"
              title="No appointments yet"
              description="Book a consultation with our health professionals"
              action={{ label: 'Book Appointment', onClick: () => window.location.href = '/booking', variant: 'primary' }}
            />
          ) : (
            <div className="space-y-6">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <h2 className="font-semibold text-neutral-700 text-sm uppercase tracking-wide mb-3">
                    📅 Upcoming ({upcoming.length})
                  </h2>
                  <div className="space-y-3">
                    {upcoming.map(appt => (
                      <AppointmentCard key={appt._id} appt={appt} onCancel={() => handleCancelClick(appt)}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Past */}
              {past.length > 0 && (
                <div>
                  <h2 className="font-semibold text-neutral-500 text-sm uppercase tracking-wide mb-3">
                    🗓 Past ({past.length})
                  </h2>
                  <div className="space-y-3 opacity-80">
                    {past.map(appt => (
                      <AppointmentCard key={appt._id} appt={appt} isPast/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Confirm cancel dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Cancel Appointment?"
        message={cancelTarget
          ? `Are you sure you want to cancel your appointment with ${cancelTarget.doctorName} on ${cancelTarget.date} at ${cancelTarget.timeSlot}?`
          : ''
        }
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Appointment"
        variant="danger"
        onConfirm={() => cancelTarget && cancel.mutate(cancelTarget._id)}
        onCancel={() => { confirmDialog.close(); setCancelTarget(null); }}
        isLoading={cancel.isPending}
      />
    </div>
  );
}

function AppointmentCard({ appt, onCancel, isPast }) {
  const cancellable = ['pending', 'confirmed'].includes(appt.status) && !isPast;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-neutral-800">{appt.doctorName}</h3>
            <StatusBadge status={appt.status}/>
          </div>
          <p className="text-sm text-neutral-600 mb-2">
            {SERVICE_LABELS[appt.service] || appt.service?.replace(/-/g, ' ')}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-primary-700 font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {appt.date}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {appt.timeSlot}
            </span>
          </div>
          {appt.notes && (
            <p className="text-xs text-neutral-400 mt-2 bg-neutral-50 rounded-lg px-3 py-2">
              📝 {appt.notes}
            </p>
          )}
          {appt.adminNotes && (
            <p className="text-xs text-primary-600 mt-2 bg-primary-50 rounded-lg px-3 py-2">
              💊 Doctor note: {appt.adminNotes}
            </p>
          )}
        </div>
        {cancellable && (
          <button onClick={onCancel}
            className="btn-ghost btn-sm text-red-500 hover:bg-red-50 shrink-0">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
