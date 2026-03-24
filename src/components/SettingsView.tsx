import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Stethoscope, Building2, CheckCircle, Clock, Cpu, Zap, MessageSquare, PhoneCall, AlertCircle, TrendingUp, Filter } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FREE_MODELS = [
  { id: "z-ai/glm-4.5-air:free",                   label: "GLM-4.5 Air (Z-AI)" },
  { id: "stepfun/step-3.5-flash:free",              label: "Step-3.5 Flash (Stepfun)" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free",   label: "Nemotron-3 Super 120B (NVIDIA)" },
  { id: "arcee-ai/trinity-large-preview:free",      label: "Trinity Large Preview (Arcee AI)" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free",      label: "Nemotron-3 Nano 30B (NVIDIA)" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free",    label: "Qwen3-Next 80B Instruct (Alibaba)" },
  { id: "minimax/minimax-m2.5:free",                label: "MiniMax M2.5 (MiniMax)" },
  { id: "qwen/qwen3-coder:free",                    label: "Qwen3-Coder (Alibaba)" },
  { id: "openai/gpt-oss-120b:free",                 label: "GPT-OSS 120B (OpenAI)" },
];

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

  const currentPeriodUsage = useQuery(api.billing.getMyCurrentPeriod, { doctorId: doctor.uid });
  const usageHistory = useQuery(api.billing.getMyUsage, { doctorId: doctor.uid });

  const commSummary = useQuery(api.commLog.getSummary, { doctorId: doctor.uid });
  const [commTypeFilter, setCommTypeFilter] = useState<string>("ALL");
  const [commStatusFilter, setCommStatusFilter] = useState<string>("ALL");
  const commHistory = useQuery(api.commLog.getHistory, {
    doctorId: doctor.uid,
    type: commTypeFilter === "ALL" ? undefined : commTypeFilter as "SMS" | "CALL",
    status: commStatusFilter === "ALL" ? undefined : commStatusFilter as "SENT" | "FAILED" | "ANSWERED" | "NO_ANSWER",
  });

  React.useEffect(() => {
    if (aiModel !== undefined) {
      setModelInput(aiModel ?? 'z-ai/glm-4.5-air:free');
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

      {/* Billing Period Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-8 space-y-6"
      >
        <h3 className="text-lg font-display font-bold text-foreground/90 flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          Usage This Month {currentPeriodUsage?.billingPeriod ?? ""}
        </h3>

        {currentPeriodUsage ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{currentPeriodUsage.smsSent}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3" /> SMS Sent
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{currentPeriodUsage.callsMade}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <PhoneCall className="w-3 h-3" /> Calls Made
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{currentPeriodUsage.tokenTotal.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3" /> AI Tokens
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No usage data for this period yet.</p>
        )}

        {usageHistory && usageHistory.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Billing History</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Period</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">SMS</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Calls</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">AI Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {usageHistory.map((row: any) => (
                  <tr key={row.billingPeriod} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 text-foreground font-medium">{row.billingPeriod}</td>
                    <td className="py-2 text-right text-muted-foreground">{row.smsSent}</td>
                    <td className="py-2 text-right text-muted-foreground">{row.callsMade}</td>
                    <td className="py-2 text-right text-foreground font-bold">{row.tokenTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(!usageHistory || usageHistory.length === 0) && (
          <p className="text-sm text-muted-foreground">No billing history yet. Usage will appear here as you use Aura.</p>
        )}
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
        <p className="text-xs text-muted-foreground">Choose which AI model Aura uses for chat and appointment booking.</p>
        <div className="space-y-3">
          <Select value={modelInput || 'z-ai/glm-4.5-air:free'} onValueChange={setModelInput}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {FREE_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{model.id}</span>
                  </div>
                </SelectItem>
              ))}
              {modelInput && !FREE_MODELS.find(m => m.id === modelInput) && (
                <SelectItem value={modelInput}>
                  <div className="flex flex-col">
                    <span className="font-medium">Custom Model</span>
                    <span className="text-xs text-muted-foreground font-mono">{modelInput}</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <Button
              onClick={saveAiModelFn}
              disabled={savingModel || !modelInput?.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {savingModel ? 'Saving...' : 'Save Model'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Default: <code className="text-muted-foreground/80">z-ai/glm-4.5-air:free</code>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Communications Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-8 space-y-6"
      >
        <h3 className="text-lg font-display font-bold text-foreground/90 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          Communications Analytics
        </h3>

        {commSummary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{commSummary.totalSms}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Total SMS
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{commSummary.totalCalls}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <PhoneCall className="w-3 h-3" /> Total Calls
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{commSummary.todayCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Sent Today
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{commSummary.thisMonthCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> This Month
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{commSummary.totalSent}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Total Sent
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{commSummary.totalFailed}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Total Failed
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Type:</span>
                {["ALL", "SMS", "CALL"].map(t => (
                  <button
                    key={t}
                    onClick={() => setCommTypeFilter(t)}
                    className={`text-xs px-3 py-1 rounded-full transition-all ${commTypeFilter === t ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status:</span>
                {["ALL", "SENT", "FAILED", "ANSWERED", "NO_ANSWER"].map(s => (
                  <button
                    key={s}
                    onClick={() => setCommStatusFilter(s)}
                    className={`text-xs px-3 py-1 rounded-full transition-all ${commStatusFilter === s ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* History Table */}
            {commHistory && commHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Date</th>
                      <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Patient</th>
                      <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Phone</th>
                      <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Type</th>
                      <th className="text-left text-[10px] uppercase tracking-widest text-muted-foreground pb-2 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {commHistory.map((entry: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 text-muted-foreground text-xs">
                          {new Date(entry.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2 text-foreground font-medium text-xs">{entry.patientName}</td>
                        <td className="py-2 text-muted-foreground text-xs font-mono">{entry.patientPhone}</td>
                        <td className="py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.type === "SMS" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            entry.status === "SENT" || entry.status === "ANSWERED"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}>
                            {entry.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No communications logged yet. SMS reminders sent via Twilio will appear here.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading communications data...</p>
        )}
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
