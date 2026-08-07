# Phase 3 — Floor operations acceptance

## Implemented

- [x] Service context (lunch / dinner)
- [x] Floor status metrics
- [x] Visual table states
- [x] Reservation detail from table
- [x] Unassigned reservation queue
- [x] Assignment mode
- [x] Original inventory protected until confirm
- [x] Capacity validation
- [x] Multi-table assignment
- [x] Allowed physical table combinations
- [x] Seat reservation
- [x] Complete visit + release table
- [x] Walk-in from floor
- [x] Temporary table block/reactivation
- [x] Mobile-specific layout

## Requires Supabase before production

- [ ] Persist table assignment atomically
- [ ] Lock inventory while reassignment is being confirmed
- [ ] Persist walk-ins and recalculate public availability
- [ ] Persist table blocks / closures
- [ ] Activity logs for each floor mutation
- [ ] Permission checks (host / manager / admin)
- [ ] Real-time updates across multiple staff devices
- [ ] Replace QA floor geometry/capacities/combinations with validated restaurant data

## Product rule

The floor UI may automate suggestions, but staff retain manual control. Invalid or physically impossible table combinations must never be offered as valid assignments.
