import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, Patient } from '../types.ts';
import { User, Phone, Mail, Plus, Trash2, MessageSquare, PhoneCall, Send, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatientsViewProps {
  doctor: Doctor;
}

export function PatientsView({ doctor }: PatientsViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '' });
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

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

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Patients</h2>
          <p className="text-text-muted font-sans mt-2">Manage patient contacts and send reminders with ease.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white/5 border border-border rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all w-64 text-text"
            />
          </div>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Full Name</label>
                <input
                  required
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phone Number</label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Email Address</label>
                <input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="w-full p-3 bg-white/5 border border-border rounded-lg focus:outline-none focus:border-blue-500/50 text-text"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-white text-black py-3 rounded-lg font-bold hover:bg-white/90 transition-all">Save Patient</button>
                <button type="button" onClick={() => setIsAdding(false)} className="p-3 bg-white/5 border border-border rounded-lg hover:bg-red-500/10 transition-all group">
                  <X className="w-6 h-6 text-text-muted group-hover:text-red-400" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full p-20 text-center text-text-muted font-sans animate-pulse">Synchronizing patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="col-span-full p-20 glass-card text-center text-text-muted font-sans">
            No patients found. Add your first patient to get started.
          </div>
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
                    <h3 className="text-2xl font-display font-bold text-text/90">{patient.name}</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">ID: {patient.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePatient(patient.id)}
                  className="p-2 bg-white/5 rounded-lg hover:bg-red-500/10 transition-all text-text-muted hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {patient.phone && (
                  <div className="flex items-center gap-3 text-text/60">
                    <Phone className="w-4 h-4 text-blue-400/50" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3 text-text/60">
                    <Mail className="w-4 h-4 text-purple-400/50" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-4">Send Reminder</p>
                <div className="grid grid-cols-3 gap-3">
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
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
