import type { ReservationStatus } from '@/lib/admin/types';
const labels:Record<ReservationStatus,string>={pending:'Pendiente',confirmed:'Confirmada',seated:'Sentada',completed:'Completada',cancelled:'Cancelada',no_show:'No-show'};
export function StatusPill({status}:{status:ReservationStatus}){return <span className={`status-pill status-${status}`}>{labels[status]}</span>}
