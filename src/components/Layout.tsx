import React from 'react';
import { Doctor } from '../types.ts';
import { Calendar, MessageSquare, LogOut, User as UserIcon, Users, Sun, Moon, Sparkles, Bot, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppView = 'dashboard' | 'assistant' | 'calendar' | 'patients' | 'settings' | 'collab' | 'missionhq';

interface LayoutProps {
  children: React.ReactNode;
  doctor: Doctor | null;
  onLogout: () => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  appointmentCount?: number;
}

export function Layout({ children, doctor, onLogout, currentView, setView, theme, toggleTheme, appointmentCount = 0 }: LayoutProps) {

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border bg-card p-8 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 flex items-center justify-center rounded-xl border border-blue-500/30 glow">
              <Calendar className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight gradient-text">Aura AI</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Workspace</p>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 transition-all text-text-muted hover:text-text"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          <div className="mb-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-3 px-4">AI Intelligence</p>
            <button
              onClick={() => setView('assistant')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl font-bold transition-all group relative overflow-hidden",
                currentView === 'assistant' 
                  ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30" 
                  : "bg-blue-600/5 text-blue-400 hover:bg-blue-600/10 border border-blue-500/10"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <MessageSquare className={cn("w-5 h-5 relative z-10", currentView === 'assistant' ? "text-white" : "text-blue-400")} />
              <span className="relative z-10">Ask Aura AI</span>
              {currentView !== 'assistant' && (
                <Sparkles className="w-3 h-3 absolute right-4 text-blue-400/50 animate-pulse" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1 px-4">Management</p>
          <button
            onClick={() => setView('dashboard')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl font-medium transition-all group",
              currentView === 'dashboard' 
                ? "bg-white/10 text-text shadow-lg border border-white/10" 
                : "text-text-muted hover:text-text hover:bg-white/5"
            )}
          >
            <Calendar className={cn("w-5 h-5 transition-colors", currentView === 'dashboard' ? "text-blue-400" : "group-hover:text-blue-400")} />
            Dashboard
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl font-medium transition-all group",
              currentView === 'calendar' 
                ? "bg-white/10 text-text shadow-lg border border-white/10" 
                : "text-text-muted hover:text-text hover:bg-white/5"
            )}
          >
            <Calendar className={cn("w-5 h-5 transition-colors", currentView === 'calendar' ? "text-blue-400" : "group-hover:text-blue-400")} />
            Calendar
          </button>
          <button
            onClick={() => setView('patients')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl font-medium transition-all group",
              currentView === 'patients' 
                ? "bg-white/10 text-text shadow-lg border border-white/10" 
                : "text-text-muted hover:text-text hover:bg-white/5"
            )}
          >
            <Users className={cn("w-5 h-5 transition-colors", currentView === 'patients' ? "text-blue-400" : "group-hover:text-blue-400")} />
            Patients
          </button>
          <button
            onClick={() => setView('settings')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl font-medium transition-all group",
              currentView === 'settings'
                ? "bg-white/10 text-text shadow-lg border border-white/10"
                : "text-text-muted hover:text-text hover:bg-white/5"
            )}
          >
            <Settings className={cn("w-5 h-5 transition-colors", currentView === 'settings' ? "text-blue-400" : "group-hover:text-blue-400")} />
            Settings
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold border border-white/20">
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{doctor?.name}</p>
              <p className="text-xs text-text-muted truncate">{doctor?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 p-4 rounded-xl font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-6 md:p-12 relative flex flex-col",
        currentView !== 'assistant' && "overflow-auto"
      )}>
        {/* Subtle background glows for main area */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full -z-10" />
        {children}

        {/* Floating AI Button */}
        {currentView !== 'assistant' && (
          <button
            onClick={() => {
              localStorage.setItem('aura_assistant_last_opened', Date.now().toString());
              setView('assistant');
            }}
            className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50 border border-blue-400/30"
            title="Ask Aura AI"
          >
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 group-hover:opacity-40" />
            <Bot className="w-8 h-8 relative z-10" />
            {appointmentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-bg animate-pulse" />
            )}
            <div className="absolute -top-12 right-0 bg-card border border-border px-4 py-2 rounded-xl text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Need help? Ask Aura
            </div>
          </button>
        )}
      </main>
    </div>
  );
}
