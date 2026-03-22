import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, ChatMessage } from '../types.ts';
import { chatWithAssistant, parseBookingRequest } from '../services/geminiService.ts';
import { Send, Bot, User, Sparkles, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AssistantProps {
  doctor: Doctor;
}

export function AIAssistant({ doctor }: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hello Dr. ${doctor?.name || 'Doctor'}. I'm Aura, your AI assistant. How can I help you manage your practice today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !doctor?.uid) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const currentDateTime = new Date().toISOString();
      
      const booking = await parseBookingRequest(userMessage, currentDateTime);
      
      if (booking) {
        const appointmentsRef = collection(db, 'doctors', doctor.uid, 'appointments');
        await addDoc(appointmentsRef, {
          doctorId: doctor.uid,
          patientName: booking.patientName,
          patientContact: booking.patientContact || '',
          startTime: Timestamp.fromDate(new Date(booking.startTime)),
          status: 'scheduled',
          reminderType: booking.reminderType || 'none',
          reminderStatus: 'pending',
          notes: booking.notes || '',
          createdAt: Timestamp.now()
        });

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Perfect! I've scheduled an appointment for ${booking.patientName} on ${new Date(booking.startTime).toLocaleString()}. I'll make sure to send a reminder if requested.` 
        }]);
      } else {
        const response = await chatWithAssistant([...messages, { role: 'user', content: userMessage }], currentDateTime, doctor.name);
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error("Assistant error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col glass-card overflow-hidden glow">
      <header className="p-6 border-b border-border flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            <Bot className="text-blue-400 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-text/90">Aura AI</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Neural Engine Active</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Sparkles className="w-5 h-5 text-blue-400/50 animate-pulse" />
          <div className="w-px h-8 bg-border" />
          <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-muted hover:text-text">
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                  msg.role === 'user' 
                    ? 'bg-white text-black border-white' 
                    : 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`p-5 rounded-2xl font-sans leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-white/10 text-text/90 border border-border' 
                    : 'bg-blue-600/5 text-text/80 border border-blue-500/10'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Aura is processing...</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-border bg-white/[0.01]">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Aura to schedule, remind, or assist..."
            className="w-full p-5 pr-16 bg-white/5 border border-border rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm text-text"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all disabled:opacity-20 disabled:grayscale"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="mt-4 flex items-center justify-center gap-6">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            Try: "Schedule Sarah Miller for tomorrow at 2 PM"
          </p>
          <div className="w-1 h-1 bg-border rounded-full" />
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
            "Remind all patients for today"
          </p>
        </div>
      </div>
    </div>
  );
}
