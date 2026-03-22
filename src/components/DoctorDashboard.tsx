import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, Appointment } from '../types.ts';
import { format, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, Trash2, Filter, MessageSquare, PhoneCall, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  doctor: Doctor;
  onAskAura: () => void;
}

export function DoctorDashboard({ doctor, onAskAura }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('today');
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    if (!doctor?.uid) return;
    const appointmentsRef = collection(db, 'doctors', doctor.uid, 'appointments');
    let q = query(appointmentsRef, orderBy('startTime', 'asc'));

    if (filter === 'today') {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      q = query(
        appointmentsRef,
        where('startTime', '>=', Timestamp.fromDate(todayStart)),
        where('startTime', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('startTime', 'asc')
      );
    } else if (filter === 'upcoming') {
      const tomorrowStart = startOfDay(new Date(Date.now() + 86400000));
      q = query(
        appointmentsRef,
        where('startTime', '>=', Timestamp.fromDate(tomorrowStart)),
        orderBy('startTime', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(apps);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `doctors/${doctor.uid}/appointments`);
    });

    return () => unsubscribe();
  }, [doctor.uid, filter]);

  const updateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'doctors', doctor.uid, 'appointments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `doctors/${doctor.uid}/appointments/${id}`);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', doctor.uid, 'appointments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `doctors/${doctor.uid}/appointments/${id}`);
    }
  };

  const sendReminder = (app: Appointment, type: 'sms' | 'whatsapp' | 'call') => {
    if (!app.patientContact) {
      alert('Patient contact number is required for reminders.');
      return;
    }

    const message = `Hi ${app.patientName}, this is a reminder for your appointment with ${doctor.name} on ${format(app.startTime.toDate(), 'PPP')} at ${format(app.startTime.toDate(), 'p')}.`;
    
    if (type === 'whatsapp') {
      const url = `https://wa.me/${app.patientContact.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (type === 'sms') {
      const url = `sms:${app.patientContact}?body=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (type === 'call') {
      window.open(`tel:${app.patientContact}`, '_self');
    }

    setSendingReminder(app.id);
    setTimeout(() => setSendingReminder(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Appointments</h2>
          <p className="text-text-muted font-sans mt-2">Manage your schedule and patient outreach with AI precision.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-border backdrop-blur-md">
          {(['today', 'upcoming', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg font-medium capitalize transition-all ${
                filter === f ? 'bg-white/10 text-text shadow-lg' : 'text-text-muted hover:text-text hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Quick Ask Aura Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all group border-blue-500/20"
        onClick={onAskAura}
      >
        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
          <MessageSquare className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text/90">Ask Aura AI</p>
          <p className="text-xs text-text-muted">"Schedule a follow-up for Sarah Miller..."</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          Ask Now
          <Send className="w-3 h-3" />
        </div>
      </motion.div>

      <div className="grid gap-6">
        {loading ? (
          <div className="p-20 text-center text-text-muted font-sans animate-pulse">Synchronizing schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="p-20 glass-card text-center text-text-muted font-sans">
            No appointments found for this period.
          </div>
        ) : (
          <AnimatePresence>
            {appointments.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex flex-col items-center justify-center w-24 h-24 border-r border-border pr-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                    {format(app.startTime.toDate(), 'EEE')}
                  </span>
                  <span className="text-4xl font-display font-bold text-text group-hover:text-blue-400 transition-colors">
                    {format(app.startTime.toDate(), 'd')}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                    {format(app.startTime.toDate(), 'MMM')}
                  </span>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-border">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="font-bold text-sm text-text/80">
                        {format(app.startTime.toDate(), 'p')}
                      </span>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                      app.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      app.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-text-muted" />
                    <h3 className="text-2xl font-display font-bold text-text/90">{app.patientName}</h3>
                  </div>

                  <div className="flex flex-wrap gap-6 text-xs text-text-muted">
                    {app.patientContact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {app.patientContact}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Filter className="w-3 h-3" />
                      Reminder: {app.reminderType} ({app.reminderStatus})
                    </div>
                  </div>
                  
                  {app.patientContact && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => sendReminder(app, 'call')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <PhoneCall className="w-3 h-3 text-blue-400" />
                        Call
                      </button>
                      <button
                        onClick={() => sendReminder(app, 'sms')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <Send className="w-3 h-3 text-purple-400" />
                        SMS
                      </button>
                      <button
                        onClick={() => sendReminder(app, 'whatsapp')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-green-400" />
                        WhatsApp
                      </button>
                      {sendingReminder === app.id && (
                        <span className="text-[10px] text-green-400 font-bold self-center animate-pulse">Sent!</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {app.status === 'scheduled' && (
                    <button
                      onClick={() => updateStatus(app.id, 'completed')}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all"
                      title="Mark as Completed"
                    >
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </button>
                  )}
                  {app.status === 'scheduled' && (
                    <button
                      onClick={() => updateStatus(app.id, 'cancelled')}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      title="Cancel Appointment"
                    >
                      <XCircle className="w-6 h-6 text-red-400" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAppointment(app.id)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-border hover:bg-red-500/10 hover:border-red-500/20 transition-all group/del"
                    title="Delete"
                  >
                    <Trash2 className="w-6 h-6 text-text-muted group-hover/del:text-red-400 transition-colors" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
