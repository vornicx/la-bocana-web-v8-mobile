import { FloorPlan } from '@/components/admin/floor-plan';

export default function FloorPage() {
  return (
    <div className="admin-page floor-page">
      <div className="admin-page-head floor-page-head">
        <div>
          <span className="admin-kicker">Sala · operación</span>
          <h1>Plano de mesas</h1>
          <p>Una vista clara de la sala para sentar, mover y liberar mesas sin perder el ritmo del servicio.</p>
        </div>
        <div className="floor-legend">
          <span><i className="dot-free" />Libre</span>
          <span><i className="dot-reserved" />Reservada</span>
          <span><i className="dot-seated" />Sentada</span>
          <span><i className="dot-blocked" />Bloqueada</span>
        </div>
      </div>
      <FloorPlan />
    </div>
  );
}
