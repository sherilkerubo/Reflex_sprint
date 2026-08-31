import { io } from "socket.io-client";

// Single shared socket for the whole app. Board-wide events (delivery:new,
// delivery:assigned, etc.) arrive unscoped; components additionally
// `subscribe(id)` to a delivery room for location pings scoped to one job.
export const socket = io({
  path: "/socket.io",
  autoConnect: true,
});

export function subscribeToDelivery(id) {
  socket.emit("subscribe", id);
  return () => socket.emit("unsubscribe", id);
}
