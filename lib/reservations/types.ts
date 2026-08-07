export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ReservationSource = 'website' | 'phone' | 'walk_in' | 'admin' | 'instagram' | 'google' | 'other';

export interface AvailabilityInput {
  date: string;
  adults: number;
  children: number;
  areaPreferenceId?: string | null;
}

export interface AvailabilitySlot {
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

export interface HoldInput extends AvailabilityInput {
  serviceId: string;
  startsAt: string;
  sessionId: string;
  excludeReservationId?: string | null;
}

export interface HoldResult {
  holdId: string;
  expiresAt: string;
  startsAt: string;
  endsAt: string;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  allergies?: string;
  preferences?: string;
  notes?: string;
  privacyAccepted: boolean;
}
