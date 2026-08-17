export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface Booth {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  operatorId?: string; // Teacher or operator
  createdAt: string;
}

export interface Student {
  id: string;
  eventId: string;
  studentNumber: string; // e.g., "60123" (Grade 6, Class 1, Number 23)
  name: string;
  qrCode: string;
  createdAt: string;
}

export interface Participation {
  id: string;
  eventId: string;
  boothId: string;
  studentId: string;
  scannedAt: string;
}

export type UserRole = "admin" | "operator" | "student";
