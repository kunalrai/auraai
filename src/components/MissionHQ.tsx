import { useRef, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, Bot, User, CheckCircle2, Circle, Clock, Zap, ChevronRight, MessageSquare, X, GitBranch, Calendar, Sun, Moon, LayoutDashboard } from 'lucide-react';

// Full Tailwind class strings — must be complete so Tailwind doesn't purge them
const COLOR_MAP: Record<string, {
  cardBorder: string; selectedBorder: string; ring: string;
  iconBg: string; iconBorder: string; iconText: string; roleText: string;
  statusActiveBg: string; statusActiveText: string; statusActiveBorder: string;
  panelBorder: string; panelTitle: string;
  badgeBg: string; badgeText: string; badgeBorder: string;
  avatarBg: string; avatarBorder: string; avatarText: string;
  bubbleBg: string; bubbleBorder: string;
}> = {
  purple: {
    cardBorder: 'border-purple-500/20', selectedBorder: 'border-purple-500/50', ring: 'ring-1 ring-purple-500/30',
    iconBg: 'bg-purple-600/20', iconBorder: 'border-purple-500/30', iconText: 'text-purple-400', roleText: 'text-purple-400',
    statusActiveBg: 'bg-purple-500/10', statusActiveText: 'text-purple-400', statusActiveBorder: 'border-purple-500/20',
    panelBorder: 'border-purple-500/30', panelTitle: 'text-purple-400',
    badgeBg: 'bg-purple-500/10', badgeText: 'text-purple-400', badgeBorder: 'border-purple-500/20',
    avatarBg: 'bg-purple-600/20', avatarBorder: 'border-purple-500/30', avatarText: 'text-purple-400',
    bubbleBg: 'bg-purple-500/5', bubbleBorder: 'border-purple-500/10',
  },
  blue: {
    cardBorder: 'border-blue-500/20', selectedBorder: 'border-blue-500/50', ring: 'ring-1 ring-blue-500/30',
    iconBg: 'bg-blue-600/20', iconBorder: 'border-blue-500/30', iconText: 'text-blue-400', roleText: 'text-blue-400',
    statusActiveBg: 'bg-blue-500/10', statusActiveText: 'text-blue-400', statusActiveBorder: 'border-blue-500/20',
    panelBorder: 'border-blue-500/30', panelTitle: 'text-blue-400',
    badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-400', badgeBorder: 'border-blue-500/20',
    avatarBg: 'bg-blue-600/20', avatarBorder: 'border-blue-500/30', avatarText: 'text-blue-400',
    bubbleBg: 'bg-blue-500/5', bubbleBorder: 'border-blue-500/10',
  },
  green: {
    cardBorder: 'border-green-500/20', selectedBorder: 'border-green-500/50', ring: 'ring-1 ring-green-500/30',
    iconBg: 'bg-green-600/20', iconBorder: 'border-green-500/30', iconText: 'text-green-400', roleText: 'text-green-400',
    statusActiveBg: 'bg-green-500/10', statusActiveText: 'text-green-400', statusActiveBorder: 'border-green-500/20',
    panelBorder: 'border-green-500/30', panelTitle: 'text-green-400',
    badgeBg: 'bg-green-500/10', badgeText: 'text-green-400', badgeBorder: 'border-green-500/20',
    avatarBg: 'bg-green-600/20', avatarBorder: 'border-green-500/30', avatarText: 'text-green-400',
    bubbleBg: 'bg-green-500/5', bubbleBorder: 'border-green-500/10',
  },
  yellow: {
    cardBorder: 'border-yellow-500/20', selectedBorder: 'border-yellow-500/50', ring: 'ring-1 ring-yellow-500/30',
    iconBg: 'bg-yellow-600/20', iconBorder: 'border-yellow-500/30', iconText: 'text-yellow-400', roleText: 'text-yellow-400',
    statusActiveBg: 'bg-yellow-500/10', statusActiveText: 'text-yellow-400', statusActiveBorder: 'border-yellow-500/20',
    panelBorder: 'border-yellow-500/30', panelTitle: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/10', badgeText: 'text-yellow-400', badgeBorder: 'border-yellow-500/20',
    avatarBg: 'bg-yellow-600/20', avatarBorder: 'border-yellow-500/30', avatarText: 'text-yellow-400',
    bubbleBg: 'bg-yellow-500/5', bubbleBorder: 'border-yellow-500/10',
  },
  orange: {
    cardBorder: 'border-orange-500/20', selectedBorder: 'border-orange-500/50', ring: 'ring-1 ring-orange-500/30',
    iconBg: 'bg-orange-600/20', iconBorder: 'border-orange-500/30', iconText: 'text-orange-400', roleText: 'text-orange-400',
    statusActiveBg: 'bg-orange-500/10', statusActiveText: 'text-orange-400', statusActiveBorder: 'border-orange-500/20',
    panelBorder: 'border-orange-500/30', panelTitle: 'text-orange-400',
    badgeBg: 'bg-orange-500/10', badgeText: 'text-orange-400', badgeBorder: 'border-orange-500/20',
    avatarBg: 'bg-orange-600/20', avatarBorder: 'border-orange-500/30', avatarText: 'text-orange-400',
    bubbleBg: 'bg-orange-500/5', bubbleBorder: 'border-orange-500/10',
  },
};

const DEFAULT_COLORS = COLOR_MAP.blue;

function getColors(color: string) {
  return COLOR_MAP[color] ?? DEFAULT_COLORS;
}

function getAgentOnlineStatus(lastSeen?: number): 'online' | 'offline' | 'never' {
  if (lastSeen == null) return 'never';
  return Date.now() - lastSeen < 5 * 60 * 1000 ? 'online' : 'offline';
}

export function MissionHQ() {
  const goals    = useQuery(api.collab.listGoals);
  const messages = useQuery(api.collab.listMessages);
  const agents   = useQuery(api.collab.listAgents);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [modalGoal, setModalGoal] = useState<{
    _id: string; number: number; title: string; spec: string; status: string; completedAt?: number
  } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const done    = goals?.filter(g => g.status === 'DONE').length   ?? 0;
  const active  = goals?.filter(g => g.status === 'ACTIVE').length ?? 0;
  const queued  = goals?.filter(g => g.status === 'QUEUED').length ?? 0;
  const total   = goals?.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const activeGoal = goals?.find(g => g.status === 'ACTIVE') ?? null; // used for modal only
  const isConnected = goals !== undefined;

  const agentMap = Object.fromEntries((agents ?? []).map(a => [a.name, a]));

  const isPlanner = (agent: { role: string }) => agent.role.toLowerCase().includes('planner');

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-row">

      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card p-8 flex flex-col gap-10 flex-shrink-0">
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
        <nav className="flex flex-col gap-1">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-3 px-4">Dev</p>
          <NavLink
            to="/collab"
            className={({ isActive }) =>
              `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${
                isActive
                  ? 'bg-white/10 text-text shadow-lg border border-white/10'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
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
                  ? 'bg-white/10 text-text shadow-lg border border-white/10'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
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
                  ? 'bg-white/10 text-text shadow-lg border border-white/10'
                  : 'text-text-muted hover:text-text hover:bg-white/5'
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
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30 glow">
            <Radar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Mission HQ</h2>
            <p className="text-text-muted font-sans mt-1 text-sm">Live agent collaboration dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl self-start sm:self-auto">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {isConnected ? 'Aura Live' : 'Connecting…'}
          </span>
        </div>
      </header>

      {/* Agent Status Cards — dynamic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents?.map((agent, i) => {
          const c = getColors(agent.color);
          const isSelected = selectedAgent === agent.name;
          const planner = isPlanner(agent);
          // Per-agent active goal: assigned to this agent, or unassigned defaulting to Riya
          const agentActiveGoal = planner ? null : (goals ?? []).find(g =>
            g.status === 'ACTIVE' &&
            (g.assignee === agent.name || (!g.assignee && agent.name === 'Riya'))
          ) ?? null;
          const hasActive = !!agentActiveGoal;
          return (
            <motion.div
              key={agent._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedAgent(isSelected ? null : agent.name)}
              className={`glass-card p-6 space-y-3 cursor-pointer transition-all hover:bg-white/[0.06] ${isSelected ? `${c.selectedBorder} ${c.ring}` : c.cardBorder}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center border ${c.iconBorder} relative`}>
                  {planner ? <Bot className={`w-5 h-5 ${c.iconText}`} /> : <User className={`w-5 h-5 ${c.iconText}`} />}
                  {(() => {
                    const status = getAgentOnlineStatus(agent.lastSeen);
                    return (
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-card ${
                        status === 'online'
                          ? 'bg-green-400 animate-pulse'
                          : status === 'offline'
                          ? 'bg-gray-500'
                          : 'bg-gray-600 opacity-40'
                      }`}
                        title={status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Never connected'}
                      />
                    );
                  })()}
                </div>
                <div>
                  <p className="font-display font-bold text-text/90">{agent.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${c.roleText}`}>{agent.role}</p>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    (planner && queued > 0) || hasActive
                      ? `${c.statusActiveBg} ${c.statusActiveText} ${c.statusActiveBorder}`
                      : 'bg-white/5 text-text-muted border-border'
                  }`}>
                    {planner ? (queued > 0 ? 'Planning' : 'Idle') : (hasActive ? 'Building' : 'Idle')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-text-muted leading-relaxed truncate">
                {planner
                  ? (queued > 0 ? `${queued} goal${queued > 1 ? 's' : ''} queued for team` : 'Queue is clear — awaiting next sprint')
                  : (hasActive ? `Goal ${agentActiveGoal!.number}: ${agentActiveGoal!.title}` : 'No active goal — waiting for Michel')}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Agent Detail Panel */}
      <AnimatePresence>
        {selectedAgent && agentMap[selectedAgent] && (() => {
          const agent = agentMap[selectedAgent];
          const c = getColors(agent.color);
          const planner = isPlanner(agent);
          return (
            <motion.div
              key={selectedAgent}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className={`glass-card p-6 space-y-4 ${c.panelBorder}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`font-display font-bold text-lg ${c.panelTitle}`}>{agent.name}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{agent.role}</span>
                </div>
                {(() => {
                  if (planner) {
                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-text-muted">Plans and queues goals — no direct code assignments.</p>
                        <p className="text-xs text-text-muted">
                          {queued > 0 ? `Currently planning ${queued} goal(s) for the team.` : 'Queue is clear — awaiting next sprint.'}
                        </p>
                      </div>
                    );
                  }
                  // Goals explicitly assigned to this agent, or unassigned goals defaulting to Riya
                  const agentGoals = (goals ?? []).filter(g =>
                    g.assignee === agent.name || (!g.assignee && agent.name === 'Riya')
                  );
                  const agentActive = agentGoals.find(g => g.status === 'ACTIVE');
                  const agentQueued = agentGoals.filter(g => g.status === 'QUEUED');
                  if (!agentActive && agentQueued.length === 0) {
                    return (
                      <div className="flex items-center gap-3 py-2">
                        <Circle className="w-4 h-4 text-text-muted/40" />
                        <p className="text-xs text-text-muted">Waiting for next assignment.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {agentActive && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}>
                              Goal #{agentActive.number}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`}>
                              Active
                            </span>
                          </div>
                          <p className="text-sm font-bold text-text/90">{agentActive.title}</p>
                          <p className="text-xs text-text-muted leading-relaxed">{agentActive.spec}</p>
                        </div>
                      )}
                      {agentQueued.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Queued</p>
                          {agentQueued.slice(0, 3).map(g => (
                            <div key={g._id} className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-text-muted/40 flex-shrink-0" />
                              <p className="text-xs text-text-muted truncate">#{g.number} {g.title}</p>
                            </div>
                          ))}
                          {agentQueued.length > 3 && (
                            <p className="text-[10px] text-text-muted/60 pl-5">+{agentQueued.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Sprint Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-text/90 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Sprint Progress
          </h3>
          <span className="text-2xl font-display font-bold gradient-text">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Done',   value: done,   cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
            { label: 'Active', value: active, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            { label: 'Queued', value: queued, cls: 'bg-white/5 text-text-muted border-border' },
          ].map(pill => (
            <span key={pill.label} className={`px-3 py-1 rounded-full text-xs font-bold border ${pill.cls}`}>
              {pill.value} {pill.label}
            </span>
          ))}
          <span className="text-xs text-text-muted self-center ml-auto">{done} / {total} goals complete</span>
        </div>
      </motion.div>

      {/* Pipeline + Message Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Goal Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6 space-y-4 flex flex-col"
        >
          <h3 className="font-display font-bold text-text/90 flex items-center gap-2 flex-shrink-0">
            <ChevronRight className="w-4 h-4 text-blue-400" />
            Goal Pipeline
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1 mission-hq-scroll">
            {goals?.map((goal, i) => (
              <motion.div
                key={goal._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                onClick={() => goal.status === 'ACTIVE' && setModalGoal(goal)}
                className={`p-4 rounded-xl border transition-all ${
                  goal.status === 'ACTIVE'
                    ? 'bg-blue-500/5 border-blue-500/20 cursor-pointer hover:bg-blue-500/10 hover:border-blue-500/40'
                    : goal.status === 'DONE'
                    ? 'bg-green-500/[0.03] border-green-500/10 opacity-50'
                    : 'bg-white/[0.02] border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {goal.status === 'DONE'   && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {goal.status === 'ACTIVE' && <Circle className="w-4 h-4 text-blue-400 animate-pulse" />}
                    {goal.status === 'QUEUED' && <Clock className="w-4 h-4 text-text-muted/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${goal.status === 'DONE' ? 'text-text-muted line-through' : 'text-text/90'}`}>
                      #{goal.number} {goal.title}
                    </p>
                    {goal.status === 'ACTIVE' && (
                      <p className="text-xs text-blue-400/70 mt-1.5 leading-relaxed">{goal.spec}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Message Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 space-y-4 flex flex-col"
        >
          <h3 className="font-display font-bold text-text/90 flex items-center gap-2 flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Live Message Feed
          </h3>
          <div ref={scrollRef} className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 mission-hq-scroll">
            {messages?.map((msg, i) => {
              const agent = agentMap[msg.author];
              const c = agent ? getColors(agent.color) : DEFAULT_COLORS;
              const rightAlign = agent ? !isPlanner(agent) : false;
              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.015 }}
                  className={`flex gap-3 ${rightAlign ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border text-xs font-bold ${c.avatarBg} ${c.avatarBorder} ${c.avatarText}`}>
                    {msg.author[0]}
                  </div>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-xl text-xs leading-relaxed border ${c.bubbleBg} ${c.bubbleBorder} text-text/80`}>
                    {msg.body}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {modalGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalGoal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              className="glass-card p-8 w-full max-w-lg space-y-5 border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.15)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Goal #{modalGoal.number}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                    {modalGoal.status}
                  </span>
                </div>
                <button
                  onClick={() => setModalGoal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-border text-text-muted hover:bg-white/10 hover:text-text transition-all flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="text-xl font-display font-bold text-text/90 leading-snug">{modalGoal.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{modalGoal.spec}</p>
              {modalGoal.completedAt && (
                <p className="text-xs text-green-400/70">
                  Completed: {new Date(modalGoal.completedAt).toLocaleString()}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      </main>
    </div>
  );
}
