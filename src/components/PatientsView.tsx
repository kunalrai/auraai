import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, Patient, Appointment } from '../types.ts';
import { User, Phone, Mail, Plus, Trash2, MessageSquare, PhoneCall, Send, X, Search, History, ChevronDown, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface PatientsViewProps {
  doctor: Doctor;
}

export function PatientsView({ doctor }: PatientsViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '' });
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notesDirty, setNotesDirty] = useState<Set<string>>(new Set());
  const [notesSavedAt, setNotesSavedAt] = useState<Record<string, Date>>({});
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const generateReminderAction = useAction(api.ai.generateReminderMessage);

  const toggleHistory = (id: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!doctor?.uid) return;
    const q = query(collection(db, 'doctors', doctor.uid, 'appointments'), orderBy('startTime', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAllAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });
    return () => unsub();
  }, [doctor.uid]);

  useEffect(() => {
    const drafts: Record<string, string> = {};
    patients.forEach(p => {
      drafts[p.id] = p.notes ?? '';
    });
    setNotesDraft(drafts);
  }, [patients]);

  useEffect(() => {
    if (!doctor?.uid) return;
    const patientsRef = collection(db, 'doctors', doctor.uid, 'patients');
    const q = query(patientsRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(pts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `doctors/${doctor.uid}/patients`);
    });

    return () => unsubscribe();
  }, [doctor.uid]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name) return;

    try {
      await addDoc(collection(db, 'doctors', doctor.uid, 'patients'), {
        ...newPatient,
        doctorId: doctor.uid,
        createdAt: Timestamp.now()
      });
      setNewPatient({ name: '', phone: '', email: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `doctors/${doctor.uid}/patients`);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await deleteDoc(doc(db, 'doctors', doctor.uid, 'patients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `doctors/${doctor.uid}/patients/${id}`);
    }
  };

  const sendEmailReminder = async (patient: Patient) => {
    if (!patient.email) {
      alert('Patient email address is required.');
      return;
    }
    try {
      const nextVisit = allAppointments.find(a =>
        a.patientName.toLowerCase() === patient.name.toLowerCase() && a.status === 'scheduled'
      );
      const startTime = nextVisit
        ? nextVisit.startTime.toDate().toISOString()
        : new Date(Date.now() + 86400000).toISOString();
      const body = await generateReminderAction({ patientName: patient.name, doctorName: doctor.name, startTime, type: 'email', userId: doctor.uid });
      const subject = encodeURIComponent(`Appointment Reminder — Dr. ${doctor.name}`);
      window.open(`mailto:${patient.email}?subject=${subject}&body=${encodeURIComponent(body)}`, '_blank');
      setSendingReminder(patient.id);
      setTimeout(() => setSendingReminder(null), 2000);
    } catch (error) {
      console.error('Email reminder error:', error);
    }
  };

  const sendReminder = (patient: Patient, type: 'sms' | 'whatsapp' | 'call') => {
    if (!patient.phone) {
      alert('Patient phone number is required for reminders.');
      return;
    }

    const message = `Hi ${patient.name}, this is a reminder for your upcoming appointment with ${doctor.name}.`;
    
    if (type === 'whatsapp') {
      const url = `https://wa.me/${patient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (type === 'sms') {
      const url = `sms:${patient.phone}?body=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (type === 'call') {
      window.open(`tel:${patient.phone}`, '_self');
    }

    setSendingReminder(patient.id);
    setTimeout(() => setSendingReminder(null), 2000);
  };

  const saveNotes = async (patient: Patient) => {
    setSavingNotes(prev => { const n = new Set(prev); n.add(patient.id); return n; });
    try {
      await updateDoc(doc(db, 'doctors', doctor.uid, 'patients', patient.id), { notes: notesDraft[patient.id] ?? '' });
      setNotesDirty(prev => { const n = new Set(prev); n.delete(patient.id); return n; });
      setNotesSavedAt(prev => ({ ...prev, [patient.id]: new Date() }));
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSavingNotes(prev => { const n = new Set(prev); n.delete(patient.id); return n; });
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;

    // Most recent appointment for this patient (allAppointments is ordered desc by startTime)
    const latest = allAppointments.find(
      a => a.patientName.toLowerCase() === p.name.toLowerCase()
    );
    return latest?.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Patients</h2>
          <p className="text-muted-foreground font-sans mt-2">Manage patient contacts and send reminders with ease.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white/5 border border-border rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-64 text-foreground"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-3 bg-white/5 border border-border rounded-xl focus:outline-none focus:border-blue-500/50 transition-all text-sm font-medium text-foreground"
          >
            <option value="all" className="bg-card">All Patients</option>
            <option value="scheduled" className="bg-card">Scheduled</option>
            <option value="completed" className="bg-card">Completed</option>
            <option value="cancelled" className="bg-card">Cancelled</option>
          </select>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Patient
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddPatient} className="glass-card p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end glow">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                <input
                  required
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-foreground"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-white text-black py-3 rounded-lg font-bold hover:bg-white/90 transition-all">Save Patient</button>
                <button type="button" onClick={() => setIsAdding(false)} className="p-3 bg-white/5 border border-border rounded-lg hover:bg-red-500/10 transition-all group">
                  <X className="w-6 h-6 text-muted-foreground group-hover:text-red-400" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full p-20 text-center text-muted-foreground font-sans animate-pulse">Synchronizing patients...</div>
        ) : filteredPatients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full p-16 glass-card text-center space-y-4"
          >
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mx-auto">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground/80">No patients yet</h3>
            <p className="text-sm text-muted-foreground">Add your first patient to get started with appointment management.</p>
          </motion.div>
        ) : (
          filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 hover:bg-white/[0.04] transition-all flex flex-col gap-6 group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-600/20 transition-all">
                    <User className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-foreground/90">{patient.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">ID: {patient.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePatient(patient.id)}
                  className="p-2 bg-white/5 rounded-lg hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {patient.phone && (
                  <div className="flex items-center gap-3 text-foreground/60">
                    <Phone className="w-4 h-4 text-blue-400/50" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3 text-foreground/60">
                    <Mail className="w-4 h-4 text-purple-400/50" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Send Reminder</p>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => sendReminder(patient, 'call')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 hover:border-white/20 transition-all group/btn"
                  >
                    <PhoneCall className="w-5 h-5 text-blue-400/50 group-hover/btn:text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Call</span>
                  </button>
                  <button
                    onClick={() => sendReminder(patient, 'sms')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 hover:border-white/20 transition-all group/btn"
                  >
                    <Send className="w-5 h-5 text-purple-400/50 group-hover/btn:text-purple-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">SMS</span>
                  </button>
                  <button
                    onClick={() => sendReminder(patient, 'whatsapp')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 hover:border-white/20 transition-all group/btn"
                  >
                    <MessageSquare className="w-5 h-5 text-green-400/50 group-hover/btn:text-green-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">WA</span>
                  </button>
                  <button
                    onClick={() => sendEmailReminder(patient)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 hover:border-white/20 transition-all group/btn"
                  >
                    <Mail className="w-5 h-5 text-yellow-400/50 group-hover/btn:text-yellow-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Email</span>
                  </button>
                </div>
                {sendingReminder === patient.id && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-green-400 font-bold mt-4 text-center animate-pulse"
                  >
                    Reminder triggered!
                  </motion.p>
                )}
              </div>

              {/* Visit History */}
              {(() => {
                const visits = allAppointments.filter(a =>
                  a.patientName.toLowerCase() === patient.name.toLowerCase()
                );
                return (
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => toggleHistory(patient.id)}
                      className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        Visit History ({visits.length})
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedHistory.has(patient.id) ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {expandedHistory.has(patient.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3 space-y-2"
                        >
                          {visits.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No visits yet.</p>
                          ) : visits.map(visit => (
                            <div key={visit.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-border/50">
                              <Clock className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground/80">
                                    {format(visit.startTime.toDate(), 'MMM d, yyyy')}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(visit.startTime.toDate(), 'p')}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                    visit.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    visit.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                  }`}>
                                    {visit.status}
                                  </span>
                                </div>
                                {visit.notes && (
                                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{visit.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Clinical Notes */}
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Notes</span>
                        {notesSavedAt[patient.id] && (
                          <span className="text-[9px] text-muted-foreground">Saved {format(notesSavedAt[patient.id], 'p')}</span>
                        )}
                      </div>
                      <textarea
                        value={notesDraft[patient.id] ?? ''}
                        onChange={(e) => {
                          setNotesDraft(prev => ({ ...prev, [patient.id]: e.target.value }));
                          if (!notesDirty.has(patient.id)) {
                            setNotesDirty(prev => { const n = new Set(prev); n.add(patient.id); return n; });
                          }
                        }}
                        rows={3}
                        placeholder="Add clinical notes..."
                        className="w-full p-3 bg-white/[0.03] border border-border/50 rounded-xl text-xs text-foreground/80 placeholder-text-muted/40 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.05] transition-all resize-none"
                      />
                      {notesDirty.has(patient.id) && (
                        <button
                          onClick={() => saveNotes(patient)}
                          disabled={savingNotes.has(patient.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-all disabled:opacity-50"
                        >
                          {savingNotes.has(patient.id) ? 'Saving...' : 'Save Notes'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
