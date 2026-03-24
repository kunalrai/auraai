import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, query, collection, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, loginWithGoogle, logout, db, googleProvider } from './firebase';
import { Doctor } from './types.ts';
import { Layout } from './components/Layout.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { DoctorDashboard } from './components/DoctorDashboard.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { PatientsView } from './components/PatientsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CollabDashboard } from './components/CollabDashboard.tsx';
import { MissionHQ } from './components/MissionHQ.tsx';
import { OverviewDashboard } from './components/OverviewDashboard.tsx';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

type AppView = 'dashboard' | 'assistant' | 'calendar' | 'patients' | 'settings' | 'collab' | 'missionhq' | 'admin';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_token'));
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark');
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogin = async () => {
    if (user) {
      console.log('[Auth] handleLogin: already logged in as', user.uid);
      return;
    }
    try {
      console.log('[Auth] handleLogin: starting signInWithPopup');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[Auth] handleLogin: signInWithPopup success', result?.user?.uid);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_token', credential.accessToken);
      }
      // Reload to get clean auth state, avoiding state race conditions
      window.location.reload();
    } catch (error: any) {
      console.error("[Auth] Login Error:", error?.code, error?.message);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setDoctor(null);
    setDoctorLoading(true);
    setGoogleToken(null);
    localStorage.removeItem('google_token');
    await logout();
  };

  const handleGoogleReauth = () => {
    setGoogleToken(null);
    localStorage.removeItem('google_token');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[Auth] onAuthStateChanged fired, user:', currentUser?.uid, 'doctorLoading:', doctorLoading);
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, 'doctors', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctor(docSnap.data() as Doctor);
          console.log('[Auth] onAuthStateChanged: doctor loaded from Firestore', (docSnap.data() as Doctor).uid);
        } else {
          const newDoctor: Doctor = {
            uid: currentUser.uid,
            name: currentUser.displayName || 'Dr. Anonymous',
            email: currentUser.email || '',
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newDoctor);
          setDoctor(newDoctor);
          console.log('[Auth] onAuthStateChanged: new doctor created', newDoctor.uid);
        }
        setDoctorLoading(false);
        console.log('[Auth] onAuthStateChanged: doctorLoading set to false');
      } else {
        setUser(null);
        setDoctor(null);
        setDoctorLoading(false);
      }
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

  if (user && doctorLoading) {
    console.log('[Auth] Loading screen (user exists, waiting for doctor):', user.uid);
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

  if (location.pathname === '/missionhq') {
    return <MissionHQ />;
  }
  if (location.pathname === '/collab') {
    return <CollabDashboard />;
  }
  if (location.pathname === '/overview') {
    return <OverviewDashboard />;
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
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
            <CalendarView doctor={doctor!} googleToken={googleToken} onReauth={handleGoogleReauth} />
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
      </AnimatePresence>
    </Layout>
  );
}
