import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import { doc, getDoc, setDoc, Timestamp, query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Doctor } from './types.ts';
import { Layout } from './components/Layout.tsx';
import { DoctorDashboard } from './components/DoctorDashboard.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { PatientsView } from './components/PatientsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CollabDashboard } from './components/CollabDashboard.tsx';
import { MissionHQ } from './components/MissionHQ.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import SignupPage from './components/SignupPage.tsx';
import AdminBillingView from './components/AdminBillingView.tsx';
import { LogIn, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../convex/_generated/api';

type AppView = 'dashboard' | 'assistant' | 'calendar' | 'patients' | 'settings' | 'collab' | 'missionhq' | 'admin';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signOut } = useAuthActions();
  const authStatus = useQuery(api.doctors.authStatus);
  const createProfile = useMutation(api.doctors.createProfile);

  const [user, setUser] = useState<{ uid: string; displayName: string | null; email: string | null } | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_token'));
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark');
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  if (location.pathname === '/signup') {
    return <SignupPage />;
  }
  if (location.pathname === '/missionhq') {
    return <MissionHQ />;
  }
  if (location.pathname === '/collab') {
    return <CollabDashboard />;
  }
  if (location.pathname === '/overview') {
    return <OverviewDashboard />;
  }

  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, displayName: firebaseUser.displayName, email: firebaseUser.email });
        const docRef = doc(db, 'doctors', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctor(docSnap.data() as Doctor);
        } else {
          const newDoctor: Doctor = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Dr. Anonymous',
            email: firebaseUser.email || '',
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newDoctor);
          setDoctor(newDoctor);
        }
      } else {
        setUser(null);
        setDoctor(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!doctor?.uid) return;
    const lastOpened = parseInt(localStorage.getItem('aura_assistant_last_opened') || '0');
    const q = query(collection(db, 'doctors', doctor.uid, 'appointments'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const latest = snap.docs[0].data();
      const createdAt = latest.createdAt?.toDate?.()?.getTime() || 0;
      if (createdAt > lastOpened) {
        setAppointmentCount(prev => prev + 1);
      }
    });
    return () => unsub();
  }, [doctor?.uid]);

  useEffect(() => {
    if (authStatus && doctor) {
      createProfile({
        name: doctor.name || 'Dr. Anonymous',
        clinicName: doctor.clinicName || 'My Clinic',
        email: doctor.email || '',
        phone: doctor.phone,
      }).catch(console.error);
    }
  }, [authStatus, doctor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse" />
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative z-10" />
          </div>
          <p className="text-text/40 font-display tracking-widest text-xs uppercase animate-pulse">
            Initializing Aura
          </p>
        </div>
      </div>
    );
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-10 glow relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-blue-600/20 flex items-center justify-center rounded-2xl mb-6 border border-blue-500/30">
              <Calendar className="text-blue-400 w-8 h-8" />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight gradient-text mb-3">Aura AI</h1>
            <p className="text-text/50 font-sans leading-relaxed">
              The next generation of medical practice management. Intelligent, seamless, and patient-focused.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/signup')}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-xl"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Email
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="w-full flex items-center justify-center gap-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 py-4 px-6 rounded-xl font-bold hover:bg-blue-600/20 transition-all"
            >
              Create Account
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-text/30 uppercase tracking-[0.2em] font-bold">
              Powered by Gemini 3.1 Pro
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout
      doctor={doctor}
      onLogout={handleLogout}
      currentView={view}
      setView={setView}
      theme={theme}
      toggleTheme={toggleTheme}
      appointmentCount={appointmentCount}
    >
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1">
            <DoctorDashboard doctor={doctor!} onAskAura={() => setView('assistant')} />
          </motion.div>
        )}
        {view === 'assistant' && (
          <motion.div key="assistant" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <AIAssistant doctor={doctor!} />
          </motion.div>
        )}
        {view === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <CalendarView doctor={doctor!} googleToken={googleToken} onReauth={handleLogout} />
          </motion.div>
        )}
        {view === 'patients' && (
          <motion.div key="patients" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <PatientsView doctor={doctor!} />
          </motion.div>
        )}
        {view === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <SettingsView doctor={doctor!} onDoctorUpdate={(updated) => setDoctor(updated)} />
          </motion.div>
        )}
        {view === 'collab' && (
          <motion.div key="collab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <CollabDashboard />
          </motion.div>
        )}
        {view === 'missionhq' && (
          <motion.div key="missionhq" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <MissionHQ />
          </motion.div>
        )}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1">
            <AdminBillingView />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
