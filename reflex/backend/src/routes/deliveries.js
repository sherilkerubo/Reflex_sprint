import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { assertTransition } from "../services/statusMachine.js";
import { generateReleaseCode, hashReleaseCode, verifyReleaseCode } from "../services/releaseCode.js";
import { sendSms, buildTrackingSms } from "../services/sms.js";
import {
  createDelivery,
  getDelivery,
  listDeliveries,
  updateDelivery,
  addDeliveryLocation,
  getLatestLocation,
  getLocationHistory,
  addAuditLog,
  getAuditLog,
  getUserById,
} from "../store/db.js";

const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || "https://rflx.app/t";

export default function deliveriesRouter(io) {
  const router = Router();

  function broadcast(event, payload) {
    io.emit(event, payload);
    io.to(`delivery:${payload.id || payload.delivery_id}`).emit(event, payload);
  }

  function logTransition(deliveryId, previousStatus, newStatus, changedBy) {
    const log = addAuditLog({ deliveryId, previousStatus, newStatus, changedBy });
    broadcast("audit:new", { delivery_id: deliveryId, ...log });
    return log;
  }

  // STEP 1 — Order Creation (Retailer)
  router.post("/", requireAuth, requireRole("RETAILER"), async (req, res) => {
    const { customerName, customerPhone, deliveryAddress, itemDescription } = req.body;
    if (!customerName || !customerPhone || !deliveryAddress || !itemDescription) {
      return res.status(400).json({ error: "customerName, customerPhone, deliveryAddress, itemDescription are required" });
    }
    const delivery = createDelivery({
      retailerId: req.user.id,
      customerName,
      customerPhone,
      deliveryAddress,
      itemDescription,
    });
    logTransition(delivery.id, null, "CREATED", req.user.id);
    broadcast("delivery:new", delivery);
    res.status(201).json(delivery);
  });

  // Dispatcher board / general listing
  router.get("/", requireAuth, (req, res) => {
    const { status, mine } = req.query;
    const filter = { status: status || undefined };
    if (mine === "true") {
      if (req.user.role === "RIDER") filter.riderId = req.user.id;
      if (req.user.role === "RETAILER") filter.retailerId = req.user.id;
    }
    res.json(listDeliveries(filter));
  });

  router.get("/:id", requireAuth, (req, res) => {
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    res.json({
      ...delivery,
      latest_location: getLatestLocation(delivery.id),
    });
  });

  router.get("/:id/audit", requireAuth, (req, res) => {
    res.json(getAuditLog(req.params.id));
  });

  router.get("/:id/locations", requireAuth, (req, res) => {
    res.json(getLocationHistory(req.params.id));
  });

  // STEP 2 — Assignment & OTP Dispatch (Dispatcher)
  router.post("/:id/assign", requireAuth, requireRole("DISPATCHER"), async (req, res) => {
    const { riderId } = req.body;
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    const rider = getUserById(riderId);
    if (!rider || rider.role !== "RIDER") return res.status(400).json({ error: "riderId must reference a RIDER" });

    try {
      assertTransition(delivery.status, "ASSIGNED");
    } catch (err) {
      return res.status(err.status || 409).json({ error: err.message });
    }

    const releaseCode = generateReleaseCode();
    const releaseCodeHash = await hashReleaseCode(releaseCode);
    const previousStatus = delivery.status;
    const updated = updateDelivery(delivery.id, {
      rider_id: rider.id,
      status: "ASSIGNED",
      release_code_hash: releaseCodeHash,
    });

    const retailer = getUserById(delivery.retailer_id);
    const trackingUrl = `${TRACKING_BASE_URL}/${delivery.tracking_number}`;
    const message = buildTrackingSms({
      shopName: retailer?.name || "your retailer",
      trackingNumber: delivery.tracking_number,
      releaseCode,
      trackingUrl,
    });
    await sendSms(delivery.customer_phone, message);

    logTransition(delivery.id, previousStatus, "ASSIGNED", req.user.id);
    broadcast("delivery:assigned", updated);

    // release code is only ever returned here, to the dispatcher who
    // triggered the send, for the demo UI to display what the SMS said —
    // a real client never receives the plaintext code back from the API.
    res.json({ delivery: updated, releaseCode, trackingUrl });
  });

  // Rider: PICKED_UP / IN_TRANSIT status updates
  router.post("/:id/status", requireAuth, requireRole("RIDER"), (req, res) => {
    const { status } = req.body;
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    if (delivery.rider_id !== req.user.id) {
      return res.status(403).json({ error: "Not the assigned rider for this delivery" });
    }
    if (!["PICKED_UP", "IN_TRANSIT", "CANCELLED"].includes(status)) {
      return res.status(400).json({ error: "status must be PICKED_UP, IN_TRANSIT, or CANCELLED" });
    }
    try {
      assertTransition(delivery.status, status);
    } catch (err) {
      return res.status(err.status || 409).json({ error: err.message });
    }
    const previousStatus = delivery.status;
    const updated = updateDelivery(delivery.id, { status });
    logTransition(delivery.id, previousStatus, status, req.user.id);
    broadcast("delivery:status", updated);
    res.json(updated);
  });

  // STEP 3 — In-Transit Telemetry (Rider PWA streams GPS every 5-10s)
  router.post("/:id/location", requireAuth, requireRole("RIDER"), (req, res) => {
    const { latitude, longitude } = req.body;
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    if (delivery.rider_id !== req.user.id) {
      return res.status(403).json({ error: "Not the assigned rider for this delivery" });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude must be numbers" });
    }
    const point = addDeliveryLocation(delivery.id, { latitude, longitude });
    broadcast("delivery:location", { delivery_id: delivery.id, ...point });
    res.status(201).json(point);
  });

  // Offline sync: batched location/status events queued in the rider's
  // IndexedDB while offline, replayed in order once connectivity returns.
  router.post("/:id/sync", requireAuth, requireRole("RIDER"), async (req, res) => {
    const { events } = req.body; // [{ type: 'location'|'status', payload, clientTimestamp }]
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    if (delivery.rider_id !== req.user.id) {
      return res.status(403).json({ error: "Not the assigned rider for this delivery" });
    }
    if (!Array.isArray(events)) return res.status(400).json({ error: "events must be an array" });

    const applied = [];
    for (const event of events.sort((a, b) => a.clientTimestamp - b.clientTimestamp)) {
      if (event.type === "location") {
        const { latitude, longitude } = event.payload || {};
        if (typeof latitude === "number" && typeof longitude === "number") {
          const point = addDeliveryLocation(delivery.id, { latitude, longitude });
          broadcast("delivery:location", { delivery_id: delivery.id, ...point });
          applied.push({ type: "location", id: point.id });
        }
      } else if (event.type === "status") {
        const current = getDelivery(delivery.id);
        const { status } = event.payload || {};
        if (canTransitionSafe(current.status, status)) {
          const previousStatus = current.status;
          const updated = updateDelivery(delivery.id, { status });
          logTransition(delivery.id, previousStatus, status, req.user.id);
          broadcast("delivery:status", updated);
          applied.push({ type: "status", status });
        }
      }
    }
    res.json({ applied: applied.length, total: events.length });
  });

  function canTransitionSafe(from, to) {
    try {
      assertTransition(from, to);
      return true;
    } catch {
      return false;
    }
  }

  // STEP 4/5 — Verification & Payout Trigger, Instant Settlement
  router.post("/:id/verify", requireAuth, requireRole("RIDER"), async (req, res) => {
    const { releaseCode } = req.body;
    const delivery = getDelivery(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Not found" });
    if (delivery.rider_id !== req.user.id) {
      return res.status(403).json({ error: "Not the assigned rider for this delivery" });
    }
    try {
      assertTransition(delivery.status, "DELIVERED");
    } catch (err) {
      return res.status(err.status || 409).json({ error: err.message });
    }
    const isValid = await verifyReleaseCode(String(releaseCode || ""), delivery.release_code_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Release code does not match", verified: false });
    }
    const previousStatus = delivery.status;
    const updated = updateDelivery(delivery.id, { status: "DELIVERED" });
    logTransition(delivery.id, previousStatus, "DELIVERED", req.user.id);

    const payout = { deliveryId: delivery.id, riderId: req.user.id, unlockedAt: new Date().toISOString() };
    broadcast("delivery:delivered", { ...updated, payout });
    broadcast("payout:unlocked", payout);

    res.json({ delivery: updated, verified: true, payout });
  });

  return router;
}
