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
  source: 'website' | 'phone' | 'walk_in' | 'admin' | 'instagram' | 'google' | 'other';
  notes?: string;
  preferences?: string;
  internalNotes?: string;
  allergies?: string;
  visits: number;
  serviceId?: string;
  serviceName?: string;
  startsAt?: string;
  endsAt?: string;
  tableIds?: string[];
  customerId?: string | null;
  confirmationCode?: string;
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
  areaId?: string;
  minSeats?: number;
  blockedReason?: string | null;
  blockedServiceIds?: string[];
};

export type AdminService = {
  id: string;
  name: string;
  slug: string;
  defaultDuration: number;
  openTime: string | null;
  closeTime: string | null;
};

export type TableCombination = {
  id: string;
  name: string;
  tableIds: string[];
  minCapacity: number;
  maxCapacity: number;
};

export type FloorSnapshot = {
  date: string;
  generatedAt: string;
  services: AdminService[];
  tables: DiningTable[];
  reservations: AdminReservation[];
  combinations: TableCombination[];
};

export type StaffSession = {
  id: string;
  email: string;
  fullName: string;
  role: 'manager' | 'host' | 'editor' | 'viewer';
};
