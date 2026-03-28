import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { appointmentsAPI } from '@/api/services';
import useAuthStore from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SERVICES = ['general-consultation','prescription-review','medication-counseling','blood-pressure-check','diabetes-management','vaccination','lab-results-review','other'];

export default function BookingPage() {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ doctorName:'Dr. Ahmed Hassan', service:'general-consultation', date:'', timeSlot:'', notes:'' });

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', form.date, form.doctorName],
    queryFn: () => appointmentsAPI.getSlots({ date: form.date, doctorName: form.doctorName }).then(r => r.data.data),
    enabled: !!form.date && !!form.doctorName,
  });

  const book = useMutation({
    mutationFn: () => appointmentsAPI.book(form),
    onSuccess: () => { toast.success('Appointment booked! 🎉'); navigate('/appointments'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed'),
  });

  const f = (k) => (e) => setForm({...form, [k]: e.target.value});
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accessToken) { toast.error('Please login first'); navigate('/login'); return; }
    if (!form.timeSlot) { toast.error('Please select a time slot'); return; }
    book.mutate();
  };

  return (
    <div className="section">
      <div className="container-app max-w-2xl">
        <div className="mb-8">
          <h1 className="section-title">Book an Appointment</h1>
          <p className="section-subtitle">Schedule a consultation with our health professionals</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          <div>
            <label className="label">Doctor</label>
            <select className="input" value={form.doctorName} onChange={f('doctorName')}>
              {['Dr. Ahmed Hassan','Dr. Sara Mohamed','Dr. Khaled Ali'].map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Service Type</label>
            <select className="input" value={form.service} onChange={f('service')}>
              {SERVICES.map(s=><option key={s} value={s}>{s.replace(/-/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" min={today} value={form.date} onChange={f('date')} required/>
          </div>
          {form.date && (
            <div>
              <label className="label">Available Time Slots</label>
              {loadingSlots ? <div className="skeleton h-20 rounded-xl"/> : (
                slots?.availableSlots?.length === 0 ? (
                  <p className="text-sm text-neutral-500 p-4 bg-neutral-50 rounded-xl">No available slots for this date.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {(slots?.availableSlots||[]).map(slot => (
                      <button key={slot} type="button" onClick={() => setForm({...form, timeSlot: slot})}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${form.timeSlot===slot?'border-primary-500 bg-primary-50 text-primary-700':'border-neutral-200 text-neutral-700 hover:border-primary-300'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
          <div>
            <label className="label">Notes <span className="text-neutral-400 font-normal">(optional)</span></label>
            <textarea className="input" rows={3} value={form.notes} onChange={f('notes')} placeholder="Describe your symptoms or reason for visit..."/>
          </div>
          <button type="submit" disabled={book.isPending || !form.timeSlot} className="btn-primary w-full justify-center py-3">
            {book.isPending ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
