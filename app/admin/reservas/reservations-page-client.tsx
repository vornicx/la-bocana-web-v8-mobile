'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlusIcon } from '@/components/admin/admin-icons';
import { ReservationsList } from '@/components/admin/reservations-list';
import type { FloorSnapshot } from '@/lib/admin/types';

export function ReservationsPageClient({ initialSnapshot, canOperate }: { initialSnapshot: FloorSnapshot; canOperate: boolean }) {
  const params = useSearchParams();
  const [createSignal, setCreateSignal] = useState(0);

  useEffect(() => {
    if (canOperate && params.get('new') === '1') setCreateSignal((signal) => signal + 1);
  }, [canOperate, params]);

  return <div className="admin-page reservations-real-page">
    <div className="admin-page-head reservation-page-head premium-reservation-head">
      <div><span className="admin-kicker">Reservas · operación</span><h1>Todo el servicio, sin ruido.</h1><p>Reservas, clientes, mesas y estados conectados a Supabase en una única vista de trabajo.</p></div>
      <button className="admin-primary reservation-create-desktop" disabled={!canOperate} onClick={() => setCreateSignal((signal) => signal + 1)}><PlusIcon />Nueva reserva</button>
    </div>
    <ReservationsList initialSnapshot={initialSnapshot} canOperate={canOperate} openCreateSignal={createSignal} />
  </div>;
}
