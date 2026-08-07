# Fase 2 — Criterios de aceptación

## Implementado

- [x] Adultos / niños / party size.
- [x] Calendario y servicios gobernados por reglas configurables.
- [x] Slots configurables.
- [x] Duración por tamaño de grupo.
- [x] Capacidad máxima por servicio.
- [x] Asignación de mesa individual por menor desperdicio.
- [x] Combinaciones de mesas explícitas.
- [x] Preferencia de área no garantizada.
- [x] Cierres generales / área / mesa.
- [x] Holds temporales de 5 minutos.
- [x] Liberación explícita del hold al cambiar hora.
- [x] Protección ante carreras mediante advisory lock transaccional del inventario diario.
- [x] Revalidación final antes del commit.
- [x] Reserva pendiente/confirmada según configuración del servicio.
- [x] Relación reserva ↔ varias mesas.
- [x] Cliente/CRM base vinculado por email/teléfono.
- [x] Token privado de gestión; hash en base de datos.
- [x] Modificación preservando la reserva anterior hasta asegurar la nueva.
- [x] Cancelación sin borrar histórico.
- [x] Lista de espera persistida.
- [x] Activity logs.
- [x] Máquina de estados para operación futura.
- [x] Rate limiting persistente.
- [x] Honeypot anti-spam en formularios públicos.
- [x] RLS sin exposición directa de tablas.
- [x] Flujo responsive independiente.
- [x] Smoke test SQL transaccional.

## Deliberadamente reservado para fases posteriores

- UI completa de `/admin`, plano drag-and-drop, calendario operativo y creación manual: **Fase 3**.
- Web pública completa, navegación, historia, cocina, galería, ES/EN y SEO local: **Fase 4**.
- Carta y CMS: **Fase 5**.
- Email/SMS/WhatsApp, recordatorios y recuperación automática de waitlist: **Fase 6**.
- Permisos finales por rol y analytics avanzados: **Fase 7**.

## Datos que necesitamos validar antes de llamar a la Fase 2 “producción real”

El motor está preparado; el inventario del restaurante no puede inventarse. Antes de producción hay que sustituir el seed de QA por datos validados de La Bocana: mesas, capacidades, combinaciones, áreas, horarios, aforo, duraciones, antelación, horizonte y política de grupos/cancelaciones.
