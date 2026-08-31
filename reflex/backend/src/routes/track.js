import { Router } from "express";
import { getDeliveryByTrackingNumber, getLatestLocation, getLocationHistory } from "../store/db.js";

const router = Router();

// GET /api/track/:trackingNumber — the zero-friction link sent via SMS.
// Deliberately unauthenticated: customers never install anything or log in.
router.get("/:trackingNumber", (req, res) => {
  const delivery = getDeliveryByTrackingNumber(req.params.trackingNumber);
  if (!delivery) return res.status(404).json({ error: "Tracking number not found" });

  const { release_code_hash, retailer_id, ...publicFields } = delivery;
  res.json({
    ...publicFields,
    latest_location: getLatestLocation(delivery.id),
    location_history: getLocationHistory(delivery.id).slice(-100),
  });
});

export default router;
