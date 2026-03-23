import { Timestamp } from 'firebase/firestore';

export interface Doctor {
  uid: string;
  name: string;
  specialty?: string;
  email: string;
  phone?: string;
  clinicName?: string;
  availability?: Record<string, { start: string; end: string }>; // e.g., { "Monday": { start: "09:00", end: "17:00" } }
  createdAt: Timestamp;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  doctorId: string;
  createdAt: Timestamp;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId?: string;
  patientName: string;
  patientContact?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  status: 'scheduled' | 'cancelled' | 'completed';
  reminderType: 'text' | 'phone' | 'email' | 'none';
  reminderStatus: 'pending' | 'sent' | 'failed';
  notes?: string;
  createdAt: Timestamp;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
