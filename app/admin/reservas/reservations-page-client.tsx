'use client';

import { useState } from 'react';
import { PlusIcon } from '@/components/admin/admin-icons';
import { ReservationsList } from '@/components/admin/reservations-list';

export function ReservationsPageClient() {
  const [createSignal, setCreateSignal] = useState(0);
  return <div className="admin-page">
    <div className="admin-page-head reservation-page-head">
      <div><span className="admin-kicker">Operaciones</span><h1>Reservas</h1><p>El servicio completo, desde una sola vista.</p></div>
      <button className="admin-primary reservation-create-desktop" onClick={() => setCreateSignal((signal) => signal + 1)}><PlusIcon/>Nueva reserva</button>
    </div>
    <ReservationsList openCreateSignal={createSignal}/>
  </div>;
}
