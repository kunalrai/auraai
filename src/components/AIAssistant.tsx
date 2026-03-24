import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { Doctor, Appointment, ChatMessage } from '../types.ts';
import { BookingDetails } from '../types.ts';
import { Send, Bot, User, Sparkles, Calendar, Loader2, AlertTriangle, CheckCircle, XCircle, Paperclip, X, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isTomorrow } from 'date-fns';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface AssistantProps {
  doctor: Doctor;
}

export function AIAssistant({ doctor }: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hello Dr. ${doctor?.name || 'Doctor'}. I'm Aura, your AI assistant. How can I help you manage your practice today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingBooking, setPendingBooking] = useState<BookingDetails | null>(null);
  const [conflictWith, setConflictWith] = useState<Appointment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateUploadUrl = useMutation(api.settings.generateUploadUrl);
  const chatAction = useAction(api.ai.chat);
  const parsePrescriptionAction = useAction(api.patients.parsePrescription);
  const parseBookingRequestAction = useAction(api.ai.parseBookingRequest);

  const [selectedFile, setSelectedFile] = useState<{ name: string; mimeType: string; data: string; storageId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!doctor?.uid) return;
    const q = query(collection(db, 'doctors', doctor.uid, 'appointments'), orderBy('startTime', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });
    return () => unsub();
  }, [doctor.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (appointments.length === 0) return;
    const today = appointments.filter(a => isToday(a.startTime.toDate()));
    const tomorrow = appointments.filter(a => isTomorrow(a.startTime.toDate()));

    if (today.length === 0 && tomorrow.length === 0) {
      setMessages(prev => [{
        role: 'assistant',
        content: `Hello Dr. ${doctor?.name || 'Doctor'}. I'm Aura, your AI assistant. No appointments scheduled for today or tomorrow.`
      }]);
      return;
    }

    const formatAppt = (a: Appointment) => {
      const time = format(a.startTime.toDate(), 'h:mm a');
      const status = a.status === 'completed' ? '✓' : a.status === 'cancelled' ? '✗' : '○';
      return `• ${a.patientName} — ${time} ${status}`;
    };

    const todayList = today.map(formatAppt).join('\n');
    const tomorrowList = tomorrow.map(formatAppt).join('\n');

    let summary = 'Upcoming appointments:\n';
    if (today.length > 0) summary += `Today:\n${todayList}\n`;
    if (tomorrow.length > 0) summary += `Tomorrow:\n${tomorrowList}`;

    setMessages(prev => [{
      role: 'assistant',
      content: `Hello Dr. ${doctor?.name || 'Doctor'}. I'm Aura, your AI assistant. Here's your schedule:\n\n${summary}`
    }]);
  }, [appointments.length]);

  const checkAvailability = (booking: BookingDetails): string | null => {
    const avail = doctor.availability;
    if (!avail || Object.keys(avail).length === 0) return null;
    const date = new Date(booking.startTime);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const dayAvail = avail[dayName];
    if (!dayAvail) return `${dayName} is not a working day`;
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const bookingTime = `${hh}:${mm}`;
    if (bookingTime < dayAvail.start || bookingTime > dayAvail.end) {
      return `${dayName} working hours are ${dayAvail.start}–${dayAvail.end}`;
    }
    return null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unsupported file type. Please upload a PNG, JPG, or WebP image.' }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const uploadUrl = await generateUploadUrl({});
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: bytes,
      });
      const { storageId } = await uploadRes.json() as { storageId: string };
      setSelectedFile({ name: file.name, mimeType: file.type, data: base64, storageId });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = () => setSelectedFile(null);

  const findConflict = (booking: BookingDetails): Appointment | null => {
    const newStart = new Date(booking.startTime).getTime();
    const thirtyMin = 30 * 60 * 1000;
    return appointments.find(app => {
      if (app.status === 'cancelled') return false;
      return Math.abs(newStart - app.startTime.toDate().getTime()) < thirtyMin;
    }) ?? null;
  };

  const writeAppointmentDoc = async (booking: BookingDetails, startTime: string) => {
    const appointmentsRef = collection(db, 'doctors', doctor.uid, 'appointments');
    await addDoc(appointmentsRef, {
      doctorId: doctor.uid,
      patientName: booking.patientName,
      patientContact: booking.patientContact || '',
      startTime: Timestamp.fromDate(new Date(startTime)),
      status: 'scheduled',
      reminderType: booking.reminderType || 'none',
      reminderStatus: 'pending',
      notes: booking.notes || '',
      createdAt: Timestamp.now()
    });
  };

  const writeAppointment = async (booking: BookingDetails) => {
    await writeAppointmentDoc(booking, booking.startTime);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Appointment scheduled for ${booking.patientName} on ${new Date(booking.startTime).toLocaleString()}. I'll send a reminder if requested.`
    }]);
  };

  const generateRecurringDates = (startTime: string, recurrence: { frequency: 'weekly' | 'monthly'; count: number }): string[] => {
    const dates: string[] = [];
    const base = new Date(startTime);
    for (let i = 0; i < recurrence.count; i++) {
      const d = new Date(base);
      if (recurrence.frequency === 'weekly') {
        d.setDate(d.getDate() + i * 7);
      } else {
        d.setMonth(d.getMonth() + i);
      }
      dates.push(d.toISOString());
    }
    return dates;
  };

  const writeRecurringSeries = async (booking: BookingDetails) => {
    const recurrence = booking.recurrence!;
    const dates = generateRecurringDates(booking.startTime, recurrence);
    const booked: string[] = [];
    const skipped: string[] = [];

    for (const date of dates) {
      const conflict = findConflict({ ...booking, startTime: date });
      if (conflict) {
        skipped.push(date);
      } else {
        await writeAppointmentDoc(booking, date);
        booked.push(date);
      }
    }

    const bookedList = booked.map(d => `• ${new Date(d).toLocaleString()}`).join('\n');
    const skippedNote = skipped.length > 0
      ? `\n\n⚠️ ${skipped.length} date(s) skipped due to conflicts:\n${skipped.map(d => `• ${new Date(d).toLocaleString()}`).join('\n')}`
      : '';

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Recurring appointments created for ${booking.patientName} (${recurrence.count}× ${recurrence.frequency}):\n${bookedList}${skippedNote}`
    }]);
  };

  const confirmOverride = async () => {
    if (!pendingBooking) return;
    try {
      await writeAppointment(pendingBooking);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error saving the appointment." }]);
    }
    setPendingBooking(null);
    setConflictWith(null);
  };

  const cancelOverride = () => {
    setPendingBooking(null);
    setConflictWith(null);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Understood — booking cancelled. The appointment was not scheduled.' }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTyping || !doctor?.uid) return;

    const hasFile = selectedFile && selectedFile.storageId;

    if (!hasFile && !input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    if (!hasFile) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    setIsTyping(true);

    try {
      if (hasFile && selectedFile) {
        const result = await parsePrescriptionAction({
          storageId: selectedFile.storageId!,
          doctorId: doctor.uid,
        });
        if (result.success) {
          const reminderNote = result.reminderDate
            ? ` Follow-up reminder set for ${new Date(result.reminderDate).toLocaleDateString()}.`
            : ' No follow-up reminder detected.';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Patient ${result.patientName} saved.${reminderNote}`
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Could not process prescription: ${result.error}`
          }]);
        }
      } else {
        const currentDateTime = new Date().toISOString();

        const booking = await parseBookingRequestAction({
          prompt: userMessage,
          currentDateTime,
          userId: doctor.uid ?? "",
        });
        
        if (booking) {
          const availWarning = checkAvailability(booking);
          if (availWarning) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `⚠️ Outside working hours: ${availWarning}. The requested time for ${booking.patientName} falls outside your configured schedule. Please choose a different time.`
            }]);
            return;
          }

          if (booking.recurrence) {
            await writeRecurringSeries(booking);
          } else {
            const conflict = findConflict(booking);
            if (conflict) {
              setPendingBooking(booking);
              setConflictWith(conflict);
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Conflict detected! ${conflict.patientName} is already scheduled at ${conflict.startTime.toDate().toLocaleString()} — within 30 minutes of the requested slot.\n\nDo you want to override and schedule anyway, or cancel?`
              }]);
            } else {
              await writeAppointment(booking);
            }
          }
        } else {
          const result = await chatAction({
            messages: [...messages, { role: 'user', content: userMessage }],
            userId: doctor.uid ?? "",
          });
          setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
        }
      }
    } catch (error) {
      console.error("Assistant error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
      setSelectedFile(null);
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
            <h2 className="text-2xl font-display font-bold text-foreground/90">Aura AI</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Neural Engine Active</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Sparkles className="w-5 h-5 text-blue-400/50 animate-pulse" />
          <div className="w-px h-8 bg-border" />
          <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-muted-foreground hover:text-foreground">
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
                    ? 'bg-white/10 text-foreground/90 border border-border' 
                    : 'bg-blue-600/5 text-foreground/80 border border-blue-500/10'
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aura is processing...</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingBooking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-8 py-4 border-t border-yellow-500/20 bg-yellow-500/5 flex items-center gap-4"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="flex-1 text-sm text-yellow-300/80 font-medium">
              Schedule <span className="font-bold text-yellow-300">{pendingBooking.patientName}</span> at {new Date(pendingBooking.startTime).toLocaleString()} despite the conflict?
            </p>
            <button
              onClick={confirmOverride}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-bold text-xs uppercase tracking-widest hover:bg-yellow-500/30 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Override
            </button>
            <button
              onClick={cancelOverride}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-muted-foreground font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-8 border-t border-border bg-white/[0.01]">
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl"
            >
              <Image className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-400 font-medium truncate flex-1">{selectedFile.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Image attached</span>
              <button
                onClick={clearFile}
                className="p-1 hover:bg-white/10 rounded transition-all text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Attach image"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <form onSubmit={handleSend} className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Aura to schedule, remind, or assist..."
              className="w-full p-5 pr-16 bg-white/5 border border-border rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={isTyping || (!input.trim() && !selectedFile?.storageId)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all disabled:opacity-20 disabled:grayscale"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Try: "Schedule Sarah Miller for tomorrow at 2 PM"
          </p>
          <div className="w-1 h-1 bg-border rounded-full" />
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            "Remind all patients for today"
          </p>
        </div>
      </div>
    </div>
  );
}
