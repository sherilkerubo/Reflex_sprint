// Mirrors the relational integrity the doc assigns to PostgreSQL
// ("Relational integrity enforces strict state transitions") at the
// application layer, since the demo store isn't a real RDBMS.

const TRANSITIONS = {
  CREATED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid status transition: ${from} -> ${to}`);
    err.status = 409;
    throw err;
  }
}
