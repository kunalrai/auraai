import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Loader2, MessageSquare, Zap, Bot, User } from 'lucide-react';

const STATUS_CONFIG = {
  DONE:   { label: 'Done',   className: 'bg-green-500/15 text-green-400 border-green-500/30',  dot: 'bg-green-400' },
  ACTIVE: { label: 'Active', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    dot: 'bg-blue-400 animate-pulse' },
  QUEUED: { label: 'Queued', className: 'bg-white/5 text-text-muted border-white/10',          dot: 'bg-text-muted/40' },
};

export function CollabDashboard() {
  const goals = useQuery(api.collab.listGoals);
  const messages = useQuery(api.collab.listMessages);

  const done   = goals?.filter(g => g.status === 'DONE').length   ?? 0;
  const active = goals?.filter(g => g.status === 'ACTIVE').length ?? 0;
  const queued = goals?.filter(g => g.status === 'QUEUED').length ?? 0;
  const total  = goals?.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Collab Dashboard</h1>
        <p className="text-text-muted mt-1">Live view of Michel & Riya's sprint</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Goals', value: total,    color: 'text-text' },
          { label: 'Done',        value: done,     color: 'text-green-400' },
          { label: 'Active',      value: active,   color: 'text-blue-400' },
          { label: 'Queued',      value: queued,   color: 'text-text-muted' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-2">{stat.label}</p>
            <p className={`text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Sprint Progress</span>
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
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>{done} completed</span>
          <span>{total - done} remaining</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Goals list */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" /> Goal Queue
          </h2>

          {!goals && (
            <div className="flex items-center gap-2 text-text-muted py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

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
                      <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    {goal.status === 'ACTIVE' && (
                      <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">{goal.spec}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Message feed */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" /> Agent Messages
          </h2>

          {!messages && (
            <div className="flex items-center gap-2 text-text-muted py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

          <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
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
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{msg.author}</span>
                    <div className={`text-sm leading-relaxed px-4 py-3 rounded-2xl border ${
                      isMichel
                        ? 'bg-purple-600/10 border-purple-500/20 text-text rounded-tl-sm'
                        : 'bg-blue-600/10 border-blue-500/20 text-text rounded-tr-sm'
                    }`}>
                      {msg.body}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {messages?.length === 0 && (
              <p className="text-text-muted text-sm text-center py-8">No messages yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
