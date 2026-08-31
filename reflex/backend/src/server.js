import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRouter from "./routes/auth.js";
import deliveriesRouter from "./routes/deliveries.js";
import trackRouter from "./routes/track.js";
import { getOutbox } from "./services/sms.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Real-time channels: clients join `delivery:<id>` to receive scoped
// events (location pings, status changes) for a single delivery, in
// addition to the unscoped board-wide events dispatchers/retailers watch.
io.on("connection", (socket) => {
  socket.on("subscribe", (deliveryId) => {
    if (deliveryId) socket.join(`delivery:${deliveryId}`);
  });
  socket.on("unsubscribe", (deliveryId) => {
    if (deliveryId) socket.leave(`delivery:${deliveryId}`);
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "reflex-backend" }));
// Dispatcher-only: the SMS log exists for ops visibility (and demo
// convenience), not as something customers or other roles should see.
app.get("/api/sms/outbox", requireAuth, requireRole("DISPATCHER"), (req, res) =>
  res.json(getOutbox()),
);

app.use("/api/auth", authRouter);
app.use("/api/deliveries", deliveriesRouter(io));
app.use("/api/track", trackRouter);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Reflex backend listening on :${PORT}`);
});