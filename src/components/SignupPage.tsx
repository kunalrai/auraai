import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn("password", { email, password, name, flow: "signup", redirectTo: "/" });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-10 glow relative z-10 text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 flex items-center justify-center rounded-2xl mb-6 border border-green-500/30 mx-auto">
            <Calendar className="text-green-400 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight gradient-text mb-4">Check your email</h1>
          <p className="text-text/60 font-sans leading-relaxed mb-8">
            We've sent a verification link to <strong className="text-foreground">{email}</strong>. Click the link to activate your account and sign in.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-500 transition-all"
          >
            Back to sign in
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-card p-10 glow relative z-10"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-text/50 hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-blue-600/20 flex items-center justify-center rounded-2xl mb-4 border border-blue-500/30">
            <Calendar className="text-blue-400 w-7 h-7" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight gradient-text mb-2">Create account</h1>
          <p className="text-text/50 font-sans">Join Aura AI and manage your practice smarter.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Dr. Jane Smith"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="doctor@clinic.com"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground placeholder-text-muted focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-xl mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Sending verification...' : 'Create Account'}
          </button>
        </form>

        <p className="text-[10px] text-text/30 uppercase tracking-[0.2em] text-center mt-6 font-bold">
          Powered by Convex Auth
        </p>
      </motion.div>
    </div>
  );
}
