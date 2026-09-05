import { io } from "socket.io-client";

const API_ORIGIN = import.meta.env.VITE_API_URL || undefined;

export const socket = io(API_ORIGIN, {
  path: "/socket.io",
  autoConnect: true,
});

export function subscribeToDelivery(id) {
  socket.emit("subscribe", id);
  return () => socket.emit("unsubscribe", id);
}
