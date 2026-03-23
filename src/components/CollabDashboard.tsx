import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Loader2, MessageSquare, Zap, Bot, User, GitBranch, Radar, Calendar, Sun, Moon, SendHorizonal, LayoutDashboard } from 'lucide-react';
import { format, isToday, isYesterday, isAfter, subDays, startOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const STATUS_CONFIG = {
  DONE:   { label: 'Done',   className: 'bg-green-500/15 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
  ACTIVE: { label: 'Active', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    dot: 'bg-blue-400 animate-pulse' },
  QUEUED: { label: 'Queued', className: 'bg-white/5 text-muted-foreground border-white/10',          dot: 'bg-text-muted/40' },
};

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  if (isToday(date)) return format(date, 'p');
  if (isYesterday(date)) return 'Yesterday';
  if (isAfter(date, startOfDay(subDays(now, 6)))) return format(date, 'EEEE');
  return format(date, 'MMM d');
}

export function CollabDashboard() {
  const goals    = useQuery(api.collab.listGoals);
  const messages = useQuery(api.collab.listMessages);
  const agents   = useQuery(api.collab.getAgentStatus);
  const postMessage = useMutation(api.collab.postMessage);

  const [chatInput, setChatInput] = useState('');
  const [sending, setSending]     = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSending(true);
    try {
      await postMessage({ author: 'User', body: chatInput.trim() });
      setChatInput('');
    } finally {
      setSending(false);
    }
  };

  const done   = goals?.filter(g => g.status === 'DONE').length   ?? 0;
  const active = goals?.filter(g => g.status === 'ACTIVE').length ?? 0;
  const queued = goals?.filter(g => g.status === 'QUEUED').length ?? 0;
  const total  = goals?.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg text-foreground font-sans flex flex-row">

      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card p-8 flex flex-col gap-10 flex-shrink-0">
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
        <nav className="flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 px-4">Dev</p>
          <NavLink
            to="/collab"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${
                isActive
                  ? 'bg-white/10 text-foreground shadow-lg border border-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <GitBranch className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-purple-400'}`} />
                Collab Board
              </>
            )}
          </NavLink>
          <NavLink
            to="/missionhq"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${
                isActive
                  ? 'bg-white/10 text-foreground shadow-lg border border-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Radar className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-purple-400'}`} />
                Mission HQ
              </>
            )}
          </NavLink>
          <NavLink
            to="/overview"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${
                isActive
                  ? 'bg-white/10 text-foreground shadow-lg border border-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-purple-400'}`} />
                Overview
              </>
            )}
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-12 overflow-auto">
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Collab Dashboard</h1>
        <p className="text-muted-foreground mt-1">Live view of Michel & Riya's sprint</p>
      </div>

      {/* Michel Chat Input */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Message Michel</span>
        </div>
        <form onSubmit={handleSend} className="flex gap-3">
          <Input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Say something to Michel..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={sending || !chatInput.trim()}
            className="shrink-0 bg-purple-600 hover:bg-purple-500"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
          </Button>
        </form>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Goals', value: total,    color: 'text-foreground' },
          { label: 'Done',        value: done,     color: 'text-green-400' },
          { label: 'Active',      value: active,   color: 'text-blue-400' },
          { label: 'Queued',      value: queued,   color: 'text-muted-foreground' },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">{stat.label}</p>
            <p className={`text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sprint Progress</span>
          <span className="text-sm font-bold text-blue-400">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{done} completed</span>
          <span>{total - done} remaining</span>
        </div>
      </Card>

      {/* Agents Online Status */}
      {agents && agents.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-blue-400" /> Team Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {agents.map(agent => {
              const status = agent.isOnline ? 'online' : (agent.lastSeen ? 'offline' : 'never');
              const colorMap: Record<string, string> = {
                purple: 'bg-purple-600/20 border-purple-500/30 text-purple-400',
                blue: 'bg-blue-600/20 border-blue-500/30 text-blue-400',
                green: 'bg-green-600/20 border-green-500/30 text-green-400',
                yellow: 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400',
                orange: 'bg-orange-600/20 border-orange-500/30 text-orange-400',
              };
              const colorClass = colorMap[agent.color] || colorMap.blue;
              return (
                <div key={agent._id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-border">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border relative ${colorClass}`}>
                    {agent.name[0]}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      status === 'online' ? 'bg-green-400 animate-pulse' :
                      status === 'offline' ? 'bg-gray-500' : 'bg-gray-600 opacity-40'
                    }`}
                      title={status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Never connected'}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground/80 truncate max-w-full">{agent.name}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${
                      status === 'online' ? 'text-green-400' :
                      status === 'offline' ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                      {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Never'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Goals list */}
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" /> Goal Queue
          </h2>

          {!goals && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

          <ScrollArea className="max-h-[480px] pr-2">
            <div className="flex flex-col gap-3">
              {goals?.map((goal, i) => {
                const cfg = STATUS_CONFIG[goal.status];
                return (
                  <motion.div
                    key={goal._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.className}`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {goal.status === 'DONE'
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Circle className="w-4 h-4 opacity-40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold opacity-50">#{goal.number}</span>
                        <span className="font-bold text-sm truncate">{goal.title}</span>
                        <Badge variant="secondary" className={`ml-auto flex items-center gap-1 ${cfg.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </Badge>
                      </div>
                      {goal.status === 'ACTIVE' && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{goal.spec}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Message feed */}
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" /> Agent Messages
          </h2>

          {!messages && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

          <ScrollArea className="max-h-[480px] pr-2">
            <div className="flex flex-col gap-3">
              {messages?.slice().reverse().map((msg, i) => {
                const isMichel = msg.author === 'Michel';
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, x: isMichel ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex gap-3 ${isMichel ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                      isMichel
                        ? 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                        : 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                    }`}>
                      {isMichel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`flex flex-col gap-1 max-w-[80%] ${isMichel ? 'items-start' : 'items-end'}`}>
                      <div className={`flex items-baseline gap-2 ${isMichel ? 'flex-row' : 'flex-row-reverse'}`}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{msg.author}</span>
                        <span className="text-[9px] text-muted-foreground/60">{formatMessageTime(msg._creationTime)}</span>
                      </div>
                      <div className={`text-sm leading-relaxed px-4 py-3 rounded-2xl border ${
                        isMichel
                          ? 'bg-purple-600/10 border-purple-500/20 text-foreground rounded-tl-sm'
                          : 'bg-blue-600/10 border-blue-500/20 text-foreground rounded-tr-sm'
                      }`}>
                        {msg.body}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {messages?.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">No messages yet.</p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
      </main>
    </div>
  );
}
