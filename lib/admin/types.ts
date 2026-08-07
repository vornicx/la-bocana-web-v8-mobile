export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export type AdminReservation = {
  id: string;
  time: string;
  duration: number;
  customer: string;
  phone: string;
  email?: string;
  partySize: number;
  adults: number;
  children: number;
  table: string | null;
  area: 'Terraza' | 'Interior' | 'Barra';
  status: ReservationStatus;
  source: 'website' | 'phone' | 'walk_in' | 'admin';
  notes?: string;
  preferences?: string;
  internalNotes?: string;
  allergies?: string;
  visits: number;
};

export type DiningTable = {
  id: string;
  label: string;
  seats: number;
  area: 'Terraza' | 'Interior' | 'Barra';
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'round' | 'rect';
  state: 'free' | 'reserved' | 'seated' | 'blocked';
  reservationId?: string;
};
