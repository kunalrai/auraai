import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion } from 'motion/react';
import { LayoutDashboard, Bot, User, CheckCircle2, Circle, Loader2, GitBranch, Radar, Calendar, Sun, Moon } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  DONE:    { label: 'Done',    className: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  WORKING: { label: 'Working', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400 animate-pulse' },
  ACTIVE:  { label: 'Active',  className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400 animate-pulse' },
  QUEUED:  { label: 'Queued',  className: 'bg-white/5 text-muted-foreground border-white/10',          dot: 'bg-muted-foreground/40' },
};

export function OverviewDashboard() {
  const goals  = useQuery(api.collab.listGoals);
  const agents = useQuery(api.collab.getAgentStatus);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [sortStatus, setSortStatus] = useState<string>('all');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const total     = goals?.length ?? 0;
  const done      = goals?.filter(g => g.status === 'DONE').length ?? 0;
  const active    = goals?.filter(g => g.status === 'ACTIVE' || g.status === 'WORKING').length ?? 0;
  const queued    = goals?.filter(g => g.status === 'QUEUED').length ?? 0;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

  const sortedGoals = goals ? [...goals].sort((a, b) => {
    if (sortStatus === 'all') return b.number - a.number;
    if (sortStatus === 'DONE') return a.status === 'DONE' ? -1 : 1;
    if (sortStatus === 'ACTIVE') return (a.status === 'ACTIVE' || a.status === 'WORKING') ? -1 : 1;
    if (sortStatus === 'QUEUED') return a.status === 'QUEUED' ? -1 : 1;
    return b.number - a.number;
  }) : [];

  const formatDate = (ts?: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-bg text-foreground font-sans flex flex-row">
      <aside className="w-72 border-r border-border bg-card p-8 flex flex-col gap-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 flex items-center justify-center rounded-xl border border-blue-500/30 glow">
              <LayoutDashboard className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight gradient-text">Aura AI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Overview</p>
            </div>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 px-4">Dev</p>
          <NavLink to="/collab" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${isActive ? 'bg-white/10 text-foreground shadow-lg border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
            <GitBranch className="w-5 h-5 group-hover:text-purple-400" />
            Collab Board
          </NavLink>
          <NavLink to="/missionhq" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${isActive ? 'bg-white/10 text-foreground shadow-lg border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
            <Radar className="w-5 h-5 group-hover:text-purple-400" />
            Mission HQ
          </NavLink>
          <NavLink to="/overview" className={({ isActive }) => `flex items-center gap-4 p-4 rounded-xl font-medium transition-all group ${isActive ? 'bg-white/10 text-foreground shadow-lg border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
            <LayoutDashboard className="w-5 h-5 group-hover:text-purple-400" />
            Overview
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-auto">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Sprint Overview</h1>
            <p className="text-muted-foreground mt-1">Goal queue and team workload at a glance</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Goals', value: total,    color: 'text-foreground' },
              { label: 'Done',        value: done,     color: 'text-green-400' },
              { label: 'Active',      value: active,   color: 'text-blue-400' },
              { label: 'Queued',      value: queued,   color: 'text-muted-foreground' },
            ].map(stat => (
              <div key={stat.label} className="glass-card p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-2">{stat.label}</p>
                <p className={`text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full ${stat.label === 'Done' ? 'bg-green-500' : stat.label === 'Active' ? 'bg-blue-500' : stat.label === 'Queued' ? 'bg-white/20' : 'bg-blue-500'}`} style={{ width: stat.label === 'Total Goals' ? '100%' : `${total > 0 ? (stat.value / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-3">
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
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{done} completed</span>
              <span>{total - done} remaining</span>
            </div>
          </div>

          {/* Agent Workload */}
          <div className="glass-card p-6">
            <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-blue-400" /> Team Workload
            </h2>
            {!agents && (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {agents?.map(agent => {
                const agentGoals = goals?.filter(g => g.assignee === agent.name) ?? [];
                const activeGoal = agentGoals.find(g => g.status === 'ACTIVE' || g.status === 'WORKING');
                const queuedCount = agentGoals.filter(g => g.status === 'QUEUED').length;
                const status = agent.isOnline ? 'online' : (agent.lastSeen ? 'offline' : 'never');

                const colorClass = agent.color === 'purple' ? 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                  : agent.color === 'blue' ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : agent.color === 'green' ? 'bg-green-600/20 border-green-500/30 text-green-400'
                  : agent.color === 'yellow' ? 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400'
                  : 'bg-orange-600/20 border-orange-500/30 text-orange-400';

                return (
                  <div key={agent._id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-border">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${colorClass} relative`}>
                      {agent.name[0]}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${status === 'online' ? 'bg-green-400 animate-pulse' : status === 'offline' ? 'bg-gray-500' : 'bg-gray-600 opacity-40'}`} />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-xs font-bold text-foreground/80 truncate w-full">{agent.name}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${status === 'online' ? 'text-green-400' : status === 'offline' ? 'text-gray-500' : 'text-gray-600'}`}>
                        {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Never'}
                      </p>
                    </div>
                    <div className="w-full text-center">
                      <p className="text-[10px] text-muted-foreground truncate" title={activeGoal?.title ?? 'Idle'}>
                        {activeGoal ? `#${activeGoal.number}` : 'Idle'}
                      </p>
                      {queuedCount > 0 && (
                        <p className="text-[9px] text-muted-foreground/60">{queuedCount} queued</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goals Table */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> All Goals
              </h2>
              <div className="flex gap-2">
                {['all', 'ACTIVE', 'QUEUED', 'DONE'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSortStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      sortStatus === s
                        ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                        : 'bg-white/5 border border-border text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            {!goals && (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-3 pr-4">#</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-3 pr-4">Title</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-3 pr-4">Assignee</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-3 pr-4">Status</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGoals?.filter(g => sortStatus === 'all' || g.status === sortStatus).map((goal, i) => {
                    const cfg = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.QUEUED;
                    return (
                      <motion.tr
                        key={goal._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 pr-4 text-xs font-bold text-muted-foreground">{goal.number}</td>
                        <td className="py-3 pr-4 text-sm font-medium text-foreground/90">{goal.title}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{goal.assignee ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{formatDate(goal.completedAt)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
