import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Bot, Calendar, Bell, FileText, Users, LogIn, Sparkles,
  ArrowRight, Zap, Clock, TrendingUp, X, CheckCircle,
  MessageSquare, PhoneCall, Mail, Send,
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const step = (end / 1800) * 16;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { setCount(end); clearInterval(timer); return; }
      setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Animated background orbs ────────────────────────────────────────────────

function Orbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 -left-24 w-[580px] h-[580px] bg-blue-600/8 blur-[130px] rounded-full"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-1/4 -right-24 w-[580px] h-[580px] bg-purple-600/8 blur-[130px] rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[320px] bg-blue-500/4 blur-[110px] rounded-full"
      />
    </div>
  );
}

// ─── Live chat demo ───────────────────────────────────────────────────────────

const DEMO_MESSAGES = [
  { role: 'user',      text: 'Book Sarah Miller for tomorrow at 2 PM' },
  { role: 'assistant', text: '✓ Done! Sarah Miller scheduled for tomorrow at 2:00 PM. SMS reminder will go out 24 hrs before.' },
  { role: 'user',      text: 'What did I prescribe John last visit?' },
  { role: 'assistant', text: 'John\'s last visit (Mar 18): Hypertension — Amlodipine 5 mg daily. Follow-up was set for 4 weeks.' },
];

function ChatDemo() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= DEMO_MESSAGES.length) return;
    const delay = shown === 0 ? 700 : 2000;
    const t = setTimeout(() => setShown(n => n + 1), delay);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <div className="space-y-3 min-h-[140px]">
      <AnimatePresence>
        {DEMO_MESSAGES.slice(0, shown).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-white/10 border border-white/10 text-foreground/90'
                : 'bg-blue-600/10 border border-blue-500/20 text-foreground/80'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {shown < DEMO_MESSAGES.length && (
        <motion.div
          className="flex gap-1.5 px-4 py-2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-blue-400 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: Clock,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    title: '3+ Hours Lost Daily to Admin',
    desc: 'Doctors spend up to 34% of their time on scheduling, paperwork, and follow-up calls — time that belongs with patients.',
  },
  {
    icon: X,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    title: '30% Appointment No-Shows',
    desc: 'Without automated reminders, patients forget. Missed appointments cost clinics thousands every month.',
  },
  {
    icon: FileText,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    title: 'Follow-Ups Fall Through the Cracks',
    desc: 'Prescription follow-ups get lost. Patients don\'t return, conditions worsen, and your practice loses revenue.',
  },
];

const FEATURES = [
  {
    icon: Bot,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'Core AI',
    title: 'Aura — Your AI Receptionist',
    desc: 'Talk naturally. "Book Sarah for tomorrow at 2 PM." Aura schedules, detects conflicts, and keeps you organised — no training needed.',
  },
  {
    icon: FileText,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    badge: 'Vision AI',
    title: 'Prescription Scan → Auto Record',
    desc: 'Snap a prescription photo. Aura extracts patient details, diagnosis, and medications — and auto-schedules follow-up reminders.',
  },
  {
    icon: Bell,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    badge: 'Automation',
    title: 'Multi-Channel Reminders',
    desc: 'SMS, WhatsApp, phone call, and email — all AI-personalised per patient. One click sends the right message on the right channel.',
  },
  {
    icon: Users,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    badge: 'Records',
    title: 'Complete Patient History',
    desc: 'Every visit, diagnosis, medication, and note instantly surfaced the moment you need it. No more digging through folders.',
  },
  {
    icon: Calendar,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    badge: 'Integration',
    title: 'Google Calendar Sync',
    desc: 'Your clinic schedule and personal calendar unified. See everything in one view and eliminate double-bookings forever.',
  },
  {
    icon: TrendingUp,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    badge: 'Insights',
    title: 'Practice Analytics',
    desc: 'Track completion rates, cancellations, and weekly trends at a glance. Make smarter decisions backed by real data.',
  },
];

const STEPS = [
  { num: '01', title: 'Sign in with Google', desc: 'One click to get started. No forms, no setup, no credit card.' },
  { num: '02', title: 'Tell Aura what you need', desc: 'Schedule, remind, look up a patient — just say it naturally.' },
  { num: '03', title: 'Focus on your patients', desc: 'Aura handles the rest while you do what you trained for.' },
];

const STATS = [
  { value: 3,   suffix: 'hrs',  label: 'Saved per doctor daily' },
  { value: 70,  suffix: '%',    label: 'Fewer no-shows' },
  { value: 100, suffix: '%',    label: 'Free to start' },
  { value: 9,   suffix: '+',    label: 'AI models available' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 glass border-b border-border"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Aura AI</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLogin}
          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-white/90 transition-all shadow-lg"
        >
          <LogIn className="w-4 h-4" />
          Get Started Free
        </motion.button>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        <Orbs />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-8 border border-blue-500/20 relative z-10"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">AI-Powered Practice Management</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.25 }}
          className="relative z-10 text-6xl md:text-7xl lg:text-[88px] font-display font-bold tracking-tight leading-[0.95] mb-6"
        >
          <span className="gradient-text">Medicine,</span>
          <br />
          not paperwork.
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4 }}
          className="relative z-10 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Aura is your AI assistant that handles scheduling, reminders, patient records, and follow-ups —
          so you spend more time healing and less time managing.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55 }}
          className="relative z-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLogin}
            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/90 transition-all shadow-2xl shadow-white/10"
          >
            <LogIn className="w-5 h-5" />
            Start Free with Google
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">No credit card required</span>
        </motion.div>

        {/* Chat preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="relative z-10 mt-20 w-full max-w-xl mx-auto"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-xl" />
          <div className="relative glass-card p-6 glow">
            {/* Chat header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-none mb-1">Aura</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Online</span>
                </div>
              </div>
              <div className="flex gap-1">
                {['bg-red-500/60', 'bg-yellow-500/60', 'bg-green-500/60'].map((c, i) => (
                  <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                ))}
              </div>
            </div>
            <ChatDemo />
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/30"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/20" />
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold">Scroll</span>
        </motion.div>
      </section>

      {/* ── Pain Points ── */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-red-400 mb-4">The Real Problem</p>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Sound familiar?</h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAIN_POINTS.map((p, i) => (
              <FadeIn key={i} delay={i * 0.14}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`glass-card p-8 h-full border ${p.bg}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${p.bg} border flex items-center justify-center mb-6`}>
                    <p.icon className={`w-6 h-6 ${p.color}`} />
                  </div>
                  <h3 className="text-lg font-display font-bold mb-3">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reminders Showcase ── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-green-400 mb-4">Zero No-Shows</p>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">
              Reach patients<br />wherever they are.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Aura sends AI-personalised reminders across every channel — automatically, before every appointment.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Channel cards */}
            {[
              {
                icon: Send,
                label: 'SMS',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
                glow: 'shadow-blue-500/10',
                sample: 'Hi Sarah, reminder: appointment with Dr. Kunal tomorrow at 2:00 PM. Reply CONFIRM or CANCEL.',
                delay: 0,
              },
              {
                icon: MessageSquare,
                label: 'WhatsApp',
                color: 'text-green-400',
                bg: 'bg-green-500/10 border-green-500/20',
                glow: 'shadow-green-500/10',
                sample: '👋 Hi John! Just a friendly reminder about your visit with Dr. Kunal on Friday at 10 AM. See you soon!',
                delay: 0.12,
              },
              {
                icon: PhoneCall,
                label: 'Phone Call',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
                glow: 'shadow-purple-500/10',
                sample: 'An automated call is placed to the patient with appointment details — no staff effort required.',
                delay: 0.24,
              },
              {
                icon: Mail,
                label: 'Email',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                glow: 'shadow-yellow-500/10',
                sample: 'A polished, AI-written email reminder with appointment date, time, and clinic details — sent instantly.',
                delay: 0.36,
              },
            ].map((ch) => (
              <FadeIn key={ch.label} delay={ch.delay}>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`glass-card p-7 border ${ch.bg} h-full`}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${ch.bg} border flex items-center justify-center`}>
                      <ch.icon className={`w-6 h-6 ${ch.color}`} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-lg">{ch.label}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${ch.color}`}>Auto-sent by Aura</span>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, delay: ch.delay }}
                      className={`ml-auto w-2 h-2 rounded-full ${ch.color.replace('text-', 'bg-')}`}
                    />
                  </div>
                  <div className={`p-4 rounded-xl ${ch.bg} border text-sm text-muted-foreground italic leading-relaxed`}>
                    "{ch.sample}"
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>

          {/* Single stat callout */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-8 border border-green-500/10 text-center glow">
              <p className="text-5xl font-display font-bold text-green-400 mb-2">
                <Counter end={70} suffix="%" />
              </p>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
                Average reduction in appointment no-shows with automated reminders
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <p className="text-4xl md:text-5xl font-display font-bold text-blue-400 mb-2">
                <Counter end={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{s.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4">The Solution</p>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">
              Everything you need,<br />nothing you don't.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built specifically for doctors. Every feature solves a real, daily pain point.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.09}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="glass-card p-8 h-full cursor-default"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${f.bg} border flex items-center justify-center`}>
                      <f.icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${f.bg} ${f.color}`}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-bold mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              Up and running<br />in 60 seconds.
            </h2>
          </FadeIn>
          <div className="relative space-y-10">
            <div className="absolute left-8 top-4 bottom-4 w-px bg-gradient-to-b from-blue-500/50 via-blue-500/20 to-transparent hidden md:block" />
            {STEPS.map((s, i) => (
              <FadeIn key={i} delay={i * 0.18}>
                <div className="flex gap-8 items-start">
                  <div className="relative flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center border border-blue-500/20 glow"
                    >
                      <span className="font-display font-bold text-blue-400 text-xl">{s.num}</span>
                    </motion.div>
                  </div>
                  <div className="pt-4">
                    <h3 className="text-xl font-display font-bold mb-2">{s.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Checkmarks ── */}
      <section className="py-16 px-6 border-t border-border">
        <FadeIn>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Natural language scheduling',
              'Prescription image scanning',
              'SMS, WhatsApp, phone call & email reminders',
              'Google Calendar integration',
              'Full patient visit history',
              'Smart conflict detection',
              'Clinical notes with auto-save',
              '9+ free AI models — no API cost',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3"
              >
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-foreground/80">{item}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6">
        <FadeIn>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-blue-500/6 blur-[90px] rounded-full pointer-events-none" />
            <div className="relative glass-card p-14 md:p-20 glow border border-blue-500/10">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30 mx-auto mb-8"
              >
                <Zap className="w-8 h-8 text-blue-400" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6">
                Ready to reclaim<br />your time?
              </h2>
              <p className="text-muted-foreground mb-10 text-lg max-w-lg mx-auto leading-relaxed">
                Join doctors who've automated the busywork and refocused entirely on patient care.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={onLogin}
                className="inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-bold text-base hover:bg-white/90 transition-all shadow-2xl"
              >
                <LogIn className="w-5 h-5" />
                Start Free with Google
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <p className="text-[11px] text-muted-foreground mt-6 font-bold uppercase tracking-widest">
                Free to use · No credit card · Live in 60 seconds
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-border text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-6 h-6 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
            <Bot className="w-3 h-3 text-blue-400" />
          </div>
          <span className="font-display font-bold text-sm">Aura AI</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Built for doctors. Powered by AI.
        </p>
      </footer>

    </div>
  );
}
