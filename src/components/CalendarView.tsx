import { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CalendarViewProps {
  doctor: Doctor;
  googleToken: string | null;
  onReauth: () => void;
}

interface GoogleEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
}

export function CalendarView({ doctor, googleToken, onReauth }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoogleEvents = async () => {
    if (!googleToken) return;
    setLoading(true);
    setError(null);
    try {
      const timeMin = startOfMonth(currentMonth).toISOString();
      const timeMax = endOfMonth(currentMonth).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${googleToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('auth_expired');
        }
        const body = await response.text().catch(() => '');
        throw new Error(`Failed to fetch Google Calendar events (${response.status})${body ? `: ${body}` : ''}`);
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (err) {
      console.error('Calendar Error:', err);
      if (err instanceof Error && err.message === 'auth_expired') {
        onReauth();
        setError('Your Google session expired. Please reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      fetchGoogleEvents();
    }
  }, [currentMonth, googleToken]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-display font-bold tracking-tight gradient-text">Calendar</h2>
          <p className="text-text-muted font-sans mt-2">Synchronized with your Google Calendar.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {!googleToken && (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle className="w-4 h-4" />
              Reconnect Google Calendar
            </div>
          )}
          <button
            onClick={fetchGoogleEvents}
            disabled={loading || !googleToken}
            className="p-3 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-text-muted hover:text-text disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center bg-white/5 border border-border rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-all text-text-muted hover:text-text"><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-6 font-bold text-sm uppercase tracking-widest text-text">{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-all text-text-muted hover:text-text"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {error && (
        <div className="glass-card border-red-500/20 p-6 flex items-center gap-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3">
          <div className="glass-card overflow-hidden glow">
            <div className="grid grid-cols-7 border-b border-border bg-white/[0.02]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = events.filter(e => {
                  const start = e.start.dateTime ? new Date(e.start.dateTime) : new Date(e.start.date!);
                  return isSameDay(start, day);
                });
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <div 
                    key={idx} 
                    className={`aspect-square border-b border-r border-border p-3 hover:bg-white/[0.02] transition-all relative group ${!isCurrentMonth ? 'opacity-20' : ''}`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-text-muted'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <a
                          key={event.id}
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[9px] truncate bg-blue-500/10 text-blue-300 px-2 py-1 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                          {event.summary}
                        </a>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[8px] text-text-muted font-bold pl-1">
                          + {dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-6">Upcoming Events</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 glass-card animate-pulse" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-text-muted font-sans italic">No events scheduled.</div>
              ) : (
                events.slice(0, 5).map(event => {
                  const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
                  return (
                    <a 
                      key={event.id} 
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block glass-card p-5 hover:bg-white/[0.04] transition-all border-l-4 border-l-blue-500 group"
                    >
                      <h4 className="font-bold text-text/90 text-sm mb-2 group-hover:text-blue-400 transition-colors">{event.summary}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                        <CalendarIcon className="w-3 h-3" />
                        {format(start, 'MMM d, h:mm a')}
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card p-6 bg-blue-600/5 border-blue-500/20">
            <h4 className="text-sm font-bold text-blue-400 mb-2">Aura Tip</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              "I can automatically remind patients about these events. Just ask me to 'send reminders for tomorrow's appointments'."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
