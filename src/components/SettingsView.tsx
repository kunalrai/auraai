import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Stethoscope, Building2, CheckCircle, Clock, Cpu } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SettingsViewProps {
  doctor: Doctor;
  onDoctorUpdate: (updated: Doctor) => void;
}

export function SettingsView({ doctor, onDoctorUpdate }: SettingsViewProps) {
  const [form, setForm] = useState({
    name: doctor.name || '',
    specialty: doctor.specialty || '',
    phone: doctor.phone || '',
    clinicName: doctor.clinicName || '',
  });
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [avail, setAvail] = useState<Record<string, { enabled: boolean; start: string; end: string }>>(() =>
    Object.fromEntries(DAYS.map(day => {
      const saved = doctor.availability?.[day];
      return [day, saved ? { enabled: true, start: saved.start, end: saved.end } : { enabled: false, start: '09:00', end: '17:00' }];
    }))
  );
  const [savingAvail, setSavingAvail] = useState(false);

  const aiModel = useQuery(api.settings.getAiModel, { userId: doctor.uid });
  const saveAiModel = useMutation(api.settings.saveAiModel);
  const [modelInput, setModelInput] = useState('');
  const [savingModel, setSavingModel] = useState(false);

  React.useEffect(() => {
    if (aiModel !== undefined) {
      setModelInput(aiModel ?? 'gemini-3-flash-preview');
    }
  }, [aiModel]);

  const saveAvailability = async () => {
    setSavingAvail(true);
    try {
      const availability = Object.fromEntries(
        Object.entries(avail).filter(([, v]) => v.enabled).map(([day, v]) => [day, { start: v.start, end: v.end }])
      );
      await updateDoc(doc(db, 'doctors', doctor.uid), { availability });
      onDoctorUpdate({ ...doctor, availability });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `doctors/${doctor.uid}`);
    } finally {
      setSavingAvail(false);
    }
  };

  const saveAiModelFn = async () => {
    if (!modelInput.trim()) return;
    setSavingModel(true);
    try {
      await saveAiModel({ userId: doctor.uid, aiModel: modelInput.trim() });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setSavingModel(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'doctors', doctor.uid), {
        name: form.name,
        specialty: form.specialty,
        phone: form.phone,
        clinicName: form.clinicName,
      });
      onDoctorUpdate({ ...doctor, ...form });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `doctors/${doctor.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header>
        <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Settings</h2>
        <p className="text-muted-foreground font-sans mt-2">Manage your doctor profile and clinic information.</p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 space-y-6"
      >
        <h3 className="text-lg font-display font-bold text-foreground/90 flex items-center gap-3">
          <User className="w-5 h-5 text-blue-400" />
          Doctor Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <User className="w-3 h-3" /> Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="w-3 h-3" /> Specialty
            </label>
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => setForm(f => ({ ...f, specialty: e.target.value }))}
              placeholder="e.g. Cardiology"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Clinic Name
            </label>
            <input
              type="text"
              value={form.clinicName}
              onChange={(e) => setForm(f => ({ ...f, clinicName: e.target.value }))}
              placeholder="e.g. City Medical Center"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {/* Availability */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 space-y-6"
      >
        <h3 className="text-lg font-display font-bold text-foreground/90 flex items-center gap-3">
          <Clock className="w-5 h-5 text-purple-400" />
          Working Hours
        </h3>
        <p className="text-xs text-muted-foreground">Set your available days and hours. The AI will warn when booking outside these times.</p>

        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4">
              <label className="flex items-center gap-3 w-36 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avail[day].enabled}
                  onChange={(e) => setAvail(a => ({ ...a, [day]: { ...a[day], enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className={`text-sm font-bold ${avail[day].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{day.slice(0, 3)}</span>
              </label>
              {avail[day].enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={avail[day].start}
                    onChange={(e) => setAvail(a => ({ ...a, [day]: { ...a[day], start: e.target.value } }))}
                    className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="time"
                    value={avail[day].end}
                    onChange={(e) => setAvail(a => ({ ...a, [day]: { ...a[day], end: e.target.value } }))}
                    className="bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Not available</span>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={saveAvailability}
            disabled={savingAvail}
            className="px-8 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
          >
            {savingAvail ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </motion.div>

      {/* AI Model */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 space-y-6"
      >
        <h3 className="text-lg font-display font-bold text-foreground/90 flex items-center gap-3">
          <Cpu className="w-5 h-5 text-blue-400" />
          AI Model
        </h3>
        <p className="text-xs text-muted-foreground">Choose which AI model Aura uses for chat and appointment booking. Enter any OpenRouter-compatible model string.</p>
        <div className="space-y-3">
          <Input
            value={modelInput}
            onChange={e => setModelInput(e.target.value)}
            placeholder="e.g. gemini-3-flash-preview, z-ai/glm-4.5-air:free"
            className="max-w-md"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={saveAiModelFn}
              disabled={savingModel || !modelInput.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {savingModel ? 'Saving...' : 'Save Model'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Default: <code className="text-muted-foreground/80">gemini-3-flash-preview</code>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-xl backdrop-blur-md text-green-400 font-bold text-sm shadow-xl z-50 whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4" />
            Profile saved successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
