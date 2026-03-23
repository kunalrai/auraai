import { useRef, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, Bot, User, CheckCircle2, Circle, Clock, Zap, ChevronRight, MessageSquare, X } from 'lucide-react';

export function MissionHQ() {
  const goals    = useQuery(api.collab.listGoals);
  const messages = useQuery(api.collab.listMessages);
  const activeGoal = useQuery(api.collab.getActiveGoal);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<'Michel' | 'Riya' | 'Dev' | null>(null);
  const [modalGoal, setModalGoal] = useState<{ _id: string; number: number; title: string; spec: string; status: string; completedAt?: number } | null>(null);

  const toggleAgent = (agent: 'Michel' | 'Riya' | 'Dev') =>
    setSelectedAgent(prev => prev === agent ? null : agent);

  const riyaGoal = goals?.find(g => g.status === 'ACTIVE') ?? null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const done   = goals?.filter(g => g.status === 'DONE').length   ?? 0;
  const active = goals?.filter(g => g.status === 'ACTIVE').length ?? 0;
  const queued = goals?.filter(g => g.status === 'QUEUED').length ?? 0;
  const total  = goals?.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const isConnected = goals !== undefined;

  return (
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
            {isConnected ? 'Convex Live' : 'Connecting…'}
          </span>
        </div>
      </header>

      {/* Agent Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Michel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => toggleAgent('Michel')}
          className={`glass-card p-6 space-y-3 cursor-pointer transition-all hover:bg-white/[0.06] ${selectedAgent === 'Michel' ? 'border-purple-500/50 ring-1 ring-purple-500/30' : 'border-purple-500/20'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-display font-bold text-text/90">Michel</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Feature Planner</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                queued > 0
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-white/5 text-text-muted border-border'
              }`}>
                {queued > 0 ? 'Planning' : 'Idle'}
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {queued > 0
              ? `${queued} goal${queued > 1 ? 's' : ''} queued for Riya`
              : 'Queue is clear — awaiting next sprint'}
          </p>
        </motion.div>

        {/* Riya */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => toggleAgent('Riya')}
          className={`glass-card p-6 space-y-3 cursor-pointer transition-all hover:bg-white/[0.06] ${selectedAgent === 'Riya' ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-blue-500/20'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-display font-bold text-text/90">Riya</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Frontend Developer</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                activeGoal
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-white/5 text-text-muted border-border'
              }`}>
                {activeGoal ? 'Building' : 'Idle'}
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted truncate leading-relaxed">
            {activeGoal
              ? `Goal ${activeGoal.number}: ${activeGoal.title}`
              : 'No active goal — waiting for Michel'}
          </p>
        </motion.div>

        {/* Dev */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => toggleAgent('Dev')}
          className={`glass-card p-6 space-y-3 cursor-pointer transition-all hover:bg-white/[0.06] ${selectedAgent === 'Dev' ? 'border-green-500/50 ring-1 ring-green-500/30' : 'border-green-500/20'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
              <User className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-display font-bold text-text/90">Dev</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-400">AI Employee</p>
            </div>
            <div className="ml-auto">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-white/5 text-text-muted border-border">
                Standby
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">New team member — ready for assignments</p>
        </motion.div>
      </div>

      {/* Agent Detail Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            key={selectedAgent}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={`glass-card p-6 space-y-4 ${
              selectedAgent === 'Michel' ? 'border-purple-500/30' :
              selectedAgent === 'Riya'   ? 'border-blue-500/30' :
                                           'border-green-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`font-display font-bold text-lg ${
                  selectedAgent === 'Michel' ? 'text-purple-400' :
                  selectedAgent === 'Riya'   ? 'text-blue-400' :
                                               'text-green-400'
                }`}>
                  {selectedAgent}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  {selectedAgent === 'Michel' ? 'Feature Planner' : selectedAgent === 'Riya' ? 'Frontend Developer' : 'AI Employee'}
                </span>
              </div>

              {selectedAgent === 'Michel' ? (
                <div className="space-y-2">
                  <p className="text-xs text-text-muted">Michel plans and queues goals — no direct code assignments.</p>
                  <p className="text-xs text-text-muted">
                    {queued > 0 ? `Currently planning ${queued} goal(s) for the team.` : 'Queue is clear — awaiting next sprint.'}
                  </p>
                </div>
              ) : selectedAgent === 'Riya' && riyaGoal ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Goal #{riyaGoal.number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text/90">{riyaGoal.title}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{riyaGoal.spec}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <Circle className="w-4 h-4 text-text-muted/40" />
                  <p className="text-xs text-text-muted">Waiting for next assignment.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
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
          <div className="space-y-2 overflow-y-auto max-h-[420px] scrollbar-hide">
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
          <div ref={scrollRef} className="space-y-3 overflow-y-auto max-h-[420px] scrollbar-hide">
            {messages?.map((msg, i) => (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.015 }}
                className={`flex gap-3 ${msg.author === 'Riya' ? 'flex-row-reverse' : msg.author === 'Dev' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border text-xs font-bold ${
                  msg.author === 'Michel'  ? 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                  : msg.author === 'Riya' ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : msg.author === 'Dev'  ? 'bg-green-600/20 border-green-500/30 text-green-400'
                  : 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400'
                }`}>
                  {msg.author[0]}
                </div>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-xl text-xs leading-relaxed border ${
                  msg.author === 'Michel'  ? 'bg-purple-500/5 border-purple-500/10 text-text/80'
                  : msg.author === 'Riya' ? 'bg-blue-500/5 border-blue-500/10 text-text/80'
                  : msg.author === 'Dev'  ? 'bg-green-500/5 border-green-500/10 text-text/80'
                  : 'bg-yellow-500/5 border-yellow-500/10 text-text/80'
                }`}>
                  {msg.body}
                </div>
              </motion.div>
            ))}
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
  );
}
