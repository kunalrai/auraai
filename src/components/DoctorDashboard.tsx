import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, Appointment } from '../types.ts';
import { format, isToday, isTomorrow, startOfDay, endOfDay, getDay, startOfWeek, differenceInDays } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, Trash2, Filter, MessageSquare, PhoneCall, Send, Pencil, X, ChevronDown, FileText, Users, Bell, Square, CheckSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { generateReminderMessage } from '../services/geminiService.ts';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{display}</>;
}

interface DashboardProps {
  doctor: Doctor;
  onAskAura: () => void;
}

export function DoctorDashboard({ doctor, onAskAura }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('today');
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({ patientName: '', dateTime: '', notes: '', status: 'scheduled' as Appointment['status'], duration: '30 min' });
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => setSelectedIds(new Set(appointments.map(a => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const batchComplete = async () => {
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.update(doc(db, 'doctors', doctor.uid, 'appointments', id), { status: 'completed' }));
    await batch.commit();
    clearSelection();
  };

  const batchCancel = async () => {
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.update(doc(db, 'doctors', doctor.uid, 'appointments', id), { status: 'cancelled' }));
    await batch.commit();
    clearSelection();
  };

  const batchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} appointment(s)?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, 'doctors', doctor.uid, 'appointments', id)));
    await batch.commit();
    clearSelection();
  };

  // Unfiltered subscription for stats
  useEffect(() => {
    if (!doctor?.uid) return;
    const q = query(collection(db, 'doctors', doctor.uid, 'appointments'), orderBy('startTime', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAllAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });
    return () => unsub();
  }, [doctor.uid]);

  // Patients count
  useEffect(() => {
    if (!doctor?.uid) return;
    const unsub = onSnapshot(collection(db, 'doctors', doctor.uid, 'patients'), (snap) => {
      setPatientCount(snap.size);
    });
    return () => unsub();
  }, [doctor.uid]);

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  const openEdit = (app: Appointment) => {
    setEditingAppointment(app);
    setEditForm({
      patientName: app.patientName,
      dateTime: format(app.startTime.toDate(), "yyyy-MM-dd'T'HH:mm"),
      notes: app.notes || '',
      status: app.status,
      duration: app.duration || '30 min',
    });
  };

  const saveEdit = async () => {
    if (!editingAppointment) return;
    try {
      await updateDoc(doc(db, 'doctors', doctor.uid, 'appointments', editingAppointment.id), {
        patientName: editForm.patientName,
        startTime: Timestamp.fromDate(new Date(editForm.dateTime)),
        notes: editForm.notes,
        status: editForm.status,
        duration: editForm.duration,
      });
      setEditingAppointment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `doctors/${doctor.uid}/appointments/${editingAppointment.id}`);
    }
  };

  const sendEmailReminder = async (app: Appointment) => {
    try {
      const body = await generateReminderMessage(app.patientName, doctor.name, app.startTime.toDate().toISOString(), 'email');
      const subject = encodeURIComponent(`Appointment Reminder — Dr. ${doctor.name}`);
      const encodedBody = encodeURIComponent(body);
      const to = app.patientContact || '';
      window.open(`mailto:${to}?subject=${subject}&body=${encodedBody}`, '_blank');
      setSendingReminder(app.id);
      setTimeout(() => setSendingReminder(null), 2000);
    } catch (error) {
      console.error('Email reminder error:', error);
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

  const totalToday = allAppointments.filter(a => isToday(a.startTime.toDate())).length;
  const completedCount = allAppointments.filter(a => a.status === 'completed').length;
  const scheduledCount = allAppointments.filter(a => a.status === 'scheduled').length;
  const cancelledCount = allAppointments.filter(a => a.status === 'cancelled').length;
  const totalAll = allAppointments.length || 1;
  const weekStart = startOfDay(new Date(Date.now() - 6 * 86400000));
  const remindersSent = allAppointments.filter(a => a.reminderStatus === 'sent' && a.startTime.toDate() >= weekStart).length;

  // Weekly analytics
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(new Date(now.getTime() - 7 * 86400000), { weekStartsOn: 1 });
  const thisWeekEnd = endOfDay(new Date(thisWeekStart.getTime() + 6 * 86400000));

  const thisWeekApps = allAppointments.filter(a => {
    const d = a.startTime.toDate();
    return d >= thisWeekStart && d <= thisWeekEnd;
  });
  const lastWeekApps = allAppointments.filter(a => {
    const d = a.startTime.toDate();
    return d >= lastWeekStart && d < thisWeekStart;
  });

  const weeklyTotal = thisWeekApps.length;
  const weeklyCompleted = thisWeekApps.filter(a => a.status === 'completed').length;
  const weeklyCancelled = thisWeekApps.filter(a => a.status === 'cancelled').length;
  const weeklyCancellationRate = weeklyTotal > 0 ? Math.round((weeklyCancelled / weeklyTotal) * 100) : 0;

  // Busiest day this week
  const dayCounts: Record<number, number> = {};
  thisWeekApps.forEach(a => {
    const day = getDay(a.startTime.toDate());
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestDayName = busiestDay ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(busiestDay[0])] : '-';

  // Trend comparisons
  const lastWeekTotal = lastWeekApps.length;
  const totalTrend = weeklyTotal - lastWeekTotal;
  const lastWeekCompleted = lastWeekApps.filter(a => a.status === 'completed').length;
  const completedTrend = weeklyCompleted - lastWeekCompleted;
  const lastWeekCancelled = lastWeekApps.filter(a => a.status === 'cancelled').length;
  const lastWeekRate = lastWeekTotal > 0 ? Math.round((lastWeekCancelled / lastWeekTotal) * 100) : 0;
  const rateTrend = weeklyCancellationRate - lastWeekRate;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Appointments</h2>
          <p className="text-text-muted font-sans mt-2">Manage your schedule and patient outreach with AI precision.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={selectedIds.size === appointments.length && appointments.length > 0 ? clearSelection : selectAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-border text-xs font-bold text-text-muted hover:text-text hover:bg-white/10 transition-all"
          >
            {selectedIds.size === appointments.length && appointments.length > 0
              ? <CheckSquare className="w-4 h-4 text-blue-400" />
              : <Square className="w-4 h-4" />}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </button>
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
        </div>
      </header>

      {/* Weekly Analytics Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* Weekly Total */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">This Week</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={weeklyTotal} />
          </p>
          <div className="flex items-center gap-1.5">
            {totalTrend !== 0 && (
              totalTrend > 0
                ? <TrendingUp className="w-3 h-3 text-green-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-[10px] font-bold ${totalTrend > 0 ? 'text-green-400' : totalTrend < 0 ? 'text-red-400' : 'text-text-muted'}`}>
              {totalTrend > 0 ? '+' : ''}{totalTrend} vs last week
            </span>
          </div>
        </div>

        {/* Weekly Completed */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Completed</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={weeklyCompleted} />
          </p>
          <div className="flex items-center gap-1.5">
            {completedTrend !== 0 && (
              completedTrend > 0
                ? <TrendingUp className="w-3 h-3 text-green-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-[10px] font-bold ${completedTrend > 0 ? 'text-green-400' : completedTrend < 0 ? 'text-red-400' : 'text-text-muted'}`}>
              {completedTrend > 0 ? '+' : ''}{completedTrend} vs last week
            </span>
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cancellation Rate</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={weeklyCancellationRate} /><span className="text-xl">%</span>
          </p>
          <div className="flex items-center gap-1.5">
            {rateTrend !== 0 && (
              rateTrend < 0
                ? <TrendingUp className="w-3 h-3 text-green-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-[10px] font-bold ${rateTrend < 0 ? 'text-green-400' : rateTrend > 0 ? 'text-red-400' : 'text-text-muted'}`}>
              {rateTrend > 0 ? '+' : ''}{rateTrend}% vs last week
            </span>
          </div>
        </div>

        {/* Busiest Day */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Busiest Day</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">{busiestDayName}</p>
          <p className="text-xs text-text-muted">
            {busiestDay ? `${busiestDay[1]} appointments` : 'No data'}
          </p>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* Today's appointments */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Today</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={totalToday} />
          </p>
          <p className="text-xs text-text-muted">appointments</p>
        </div>

        {/* Status breakdown */}
        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="text-green-400"><AnimatedNumber value={completedCount} /> done</span>
            <span className="text-text-muted">/</span>
            <span className="text-blue-400"><AnimatedNumber value={scheduledCount} /> sched</span>
            <span className="text-text-muted">/</span>
            <span className="text-red-400"><AnimatedNumber value={cancelledCount} /> canc</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
            <div className="bg-green-500 transition-all" style={{ width: `${(completedCount / totalAll) * 100}%` }} />
            <div className="bg-blue-500 transition-all" style={{ width: `${(scheduledCount / totalAll) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(cancelledCount / totalAll) * 100}%` }} />
          </div>
        </div>

        {/* Total patients */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Patients</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={patientCount} />
          </p>
          <p className="text-xs text-text-muted">registered</p>
        </div>

        {/* Reminders sent this week */}
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Reminders</span>
            <Bell className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-display font-bold text-text">
            <AnimatedNumber value={remindersSent} />
          </p>
          <p className="text-xs text-text-muted">sent this week</p>
        </div>
      </motion.div>

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-16 glass-card text-center space-y-4"
          >
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mx-auto">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-display font-bold text-text/80">No appointments</h3>
            <p className="text-sm text-text-muted">No appointments scheduled for this period. Use Aura AI to book one.</p>
          </motion.div>
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
                <button
                  onClick={() => toggleSelect(app.id)}
                  className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                    selectedIds.has(app.id)
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-border text-text-muted hover:border-blue-500/30 hover:text-blue-400'
                  }`}
                >
                  {selectedIds.has(app.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

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
                    {app.duration && (
                      <span className="px-3 py-1 text-[10px] font-bold tracking-widest rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {app.duration}
                      </span>
                    )}
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
                  
                  {app.notes && (
                    <div>
                      <button
                        onClick={() => toggleNotes(app.id)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Notes
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedNotes.has(app.id) ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {expandedNotes.has(app.id) && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 text-sm text-text/70 leading-relaxed pl-1 border-l-2 border-blue-500/30 overflow-hidden"
                          >
                            {app.notes}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

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
                      <button
                        onClick={() => sendEmailReminder(app)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <Mail className="w-3 h-3 text-yellow-400" />
                        Email
                      </button>
                      {sendingReminder === app.id && (
                        <span className="text-[10px] text-green-400 font-bold self-center animate-pulse">Sent!</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(app)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                    title="Edit Appointment"
                  >
                    <Pencil className="w-5 h-5 text-blue-400" />
                  </button>
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

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 glass-card border border-border rounded-2xl backdrop-blur-xl z-50 shadow-2xl"
          >
            <span className="text-xs font-bold text-text-muted pr-1">{selectedIds.size} selected</span>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={batchComplete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/30 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Complete
            </button>
            <button
              onClick={batchCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={batchDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-text-muted font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={clearSelection}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-border text-text-muted hover:bg-white/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Appointment Modal */}
      <AnimatePresence>
        {editingAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingAppointment(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-8 w-full max-w-lg space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold gradient-text">Edit Appointment</h3>
                <button
                  onClick={() => setEditingAppointment(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-border hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Patient Name</label>
                  <input
                    type="text"
                    value={editForm.patientName}
                    onChange={(e) => setEditForm(f => ({ ...f, patientName: e.target.value }))}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.dateTime}
                    onChange={(e) => setEditForm(f => ({ ...f, dateTime: e.target.value }))}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as Appointment['status'] }))}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all [color-scheme:dark]"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Duration</label>
                  <select
                    value={editForm.duration}
                    onChange={(e) => setEditForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all [color-scheme:dark]"
                  >
                    <option value="15 min">15 min</option>
                    <option value="30 min">30 min</option>
                    <option value="45 min">45 min</option>
                    <option value="60 min">60 min</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Add notes..."
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingAppointment(null)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-border text-text-muted font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
