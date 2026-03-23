import React, { useState } from 'react';
import { Doctor } from '../types.ts';
import { Calendar, MessageSquare, LogOut, User as UserIcon, Users, Sun, Moon, Sparkles, Bot, Settings, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

function NavContent({ onNavigate, currentView, setView, toggleTheme, theme, doctor, onLogout }: {
  onNavigate?: () => void;
  currentView: AppView;
  setView: (v: AppView) => void;
  toggleTheme: () => void;
  theme: 'dark' | 'light';
  doctor: Doctor | null;
  onLogout: () => void;
}) {
  const handleNav = (view: AppView) => {
    setView(view);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full p-6 pb-safe">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 flex items-center justify-center rounded-xl border border-blue-500/30">
            <Calendar className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight gradient-text">Aura AI</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Workspace</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <button
          onClick={() => handleNav('assistant')}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all group relative overflow-hidden text-sm",
            currentView === 'assistant'
              ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30"
              : "bg-blue-600/5 text-blue-400 hover:bg-blue-600/10 border border-blue-500/10"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageSquare className={cn("w-5 h-5 relative z-10", currentView === 'assistant' ? "text-white" : "text-blue-400")} />
          <span className="relative z-10">Ask Aura AI</span>
          {currentView !== 'assistant' && (
            <Sparkles className="w-3 h-3 absolute right-3 text-blue-400/50 animate-pulse" />
          )}
        </button>

        <div className="pt-3 pb-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold px-3 mb-2">Management</p>
        </div>

        {([
          { view: 'dashboard' as AppView, icon: Calendar, label: 'Dashboard' },
          { view: 'calendar' as AppView, icon: Calendar, label: 'Calendar' },
          { view: 'patients' as AppView, icon: Users, label: 'Patients' },
          { view: 'settings' as AppView, icon: Settings, label: 'Settings' },
        ] as const).map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => handleNav(view)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl font-medium transition-all group text-sm",
              currentView === view
                ? "bg-white/10 text-foreground shadow-lg border border-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Icon className={cn("w-5 h-5 transition-colors", currentView === view ? "text-blue-400" : "group-hover:text-blue-400")} />
            {label}
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold border border-white/20">
            {doctor?.name?.charAt(0) || 'D'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{doctor?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{doctor?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Layout({ children, doctor, onLogout, currentView, setView, theme, toggleTheme, appointmentCount = 0 }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNavigate = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen bg-bg text-foreground font-sans flex flex-col md:flex-row transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 border-r border-border bg-card p-8 flex-col gap-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 flex items-center justify-center rounded-xl border border-blue-500/30 glow">
              <Calendar className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight gradient-text">Aura AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Workspace</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 px-4">AI Intelligence</p>
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

          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 px-4">Management</p>
          {([
            { view: 'dashboard' as AppView, icon: Calendar, label: 'Dashboard' },
            { view: 'calendar' as AppView, icon: Calendar, label: 'Calendar' },
            { view: 'patients' as AppView, icon: Users, label: 'Patients' },
            { view: 'settings' as AppView, icon: Settings, label: 'Settings' },
          ] as const).map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl font-medium transition-all group",
                currentView === view
                  ? "bg-white/10 text-foreground shadow-lg border border-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-colors", currentView === view ? "text-blue-400" : "group-hover:text-blue-400")} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold border border-white/20">
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{doctor?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{doctor?.email}</p>
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

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger className="p-2 rounded-lg hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-card border-border">
              <NavContent
                onNavigate={handleNavigate}
                currentView={currentView}
                setView={setView}
                toggleTheme={toggleTheme}
                theme={theme}
                doctor={doctor}
                onLogout={onLogout}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600/20 flex items-center justify-center rounded-lg border border-blue-500/30">
              <Calendar className="text-blue-400 w-4 h-4" />
            </div>
            <h1 className="text-lg font-display font-bold gradient-text">Aura AI</h1>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 safe-area-inset-bottom">
        <div className="flex items-center justify-around gap-1">
          {([
            { view: 'dashboard' as AppView, icon: Calendar, label: 'Home', highlight: false },
            { view: 'calendar' as AppView, icon: Calendar, label: 'Calendar', highlight: false },
            { view: 'assistant' as AppView, icon: MessageSquare, label: 'Aura', highlight: true },
            { view: 'patients' as AppView, icon: Users, label: 'Patients', highlight: false },
            { view: 'settings' as AppView, icon: Settings, label: 'More', highlight: false },
          ] as const).map(({ view, icon: Icon, label, highlight }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]",
                currentView === view
                  ? highlight
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    : "text-blue-400"
                  : highlight
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", highlight && "w-6 h-6")} />
              <span className="text-[9px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 md:p-12 relative flex flex-col pb-24 md:pb-12",
        currentView !== 'assistant' && "overflow-auto"
      )}>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full -z-10" />
        {children}

        {/* Floating AI Button — desktop only */}
        {currentView !== 'assistant' && (
          <button
            onClick={() => {
              localStorage.setItem('aura_assistant_last_opened', Date.now().toString());
              setView('assistant');
            }}
            className="hidden md:flex fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-[0_0_30px_rgba(37,99,235,0.5)] items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50 border border-blue-400/30"
            title="Ask Aura AI"
          >
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 group-hover:opacity-40" />
            <Bot className="w-8 h-8 relative z-10" />
            {appointmentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
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

