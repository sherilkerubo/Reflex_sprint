import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "../lib/api";
import { socket, subscribeToDelivery } from "../lib/socket";
import StatusPill from "../components/StatusPill";

// Default Leaflet marker assets don't resolve correctly under Vite's
// bundling — rebuild the icon from CDN URLs instead of the broken
// relative paths.
const riderIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const NAIROBI = [-1.2864, 36.8172];

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom() < 13 ? 14 : map.getZoom());
  }, [position, map]);
  return null;
}

export default function CustomerTracking() {
  const { trackingNumber } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);
  const idRef = useRef(null);

  async function refresh() {
    try {
      const data = await api.track(trackingNumber);
      setDelivery(data);
      idRef.current = data.id;
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000); // poll as a fallback alongside sockets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNumber]);

  useEffect(() => {
    if (!delivery?.id) return;
    const unsubscribe = subscribeToDelivery(delivery.id);
    const onLocation = (loc) => {
      if (loc.delivery_id !== delivery.id) return;
      setDelivery((d) => ({
        ...d,
        latest_location: loc,
        location_history: [...(d.location_history || []), loc],
      }));
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    };
    const onStatus = (d) => {
      if (d.id !== delivery.id) return;
      setDelivery((prev) => ({ ...prev, status: d.status }));
    };
    socket.on("delivery:location", onLocation);
    socket.on("delivery:status", onStatus);
    socket.on("delivery:delivered", onStatus);
    return () => {
      unsubscribe();
      socket.off("delivery:location", onLocation);
      socket.off("delivery:status", onStatus);
      socket.off("delivery:delivered", onStatus);
    };
  }, [delivery?.id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <p className="text-red font-semibold">Tracking number not found.</p>
        <p className="text-muted text-sm mt-1">Double-check the link from your SMS.</p>
      </div>
    );
  }

  if (!delivery) {
    return <p className="text-muted text-center mt-12">Loading your delivery…</p>;
  }

  const pos = delivery.latest_location
    ? [delivery.latest_location.latitude, delivery.latest_location.longitude]
    : null;
  const trail = (delivery.location_history || []).map((l) => [l.latitude, l.longitude]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-muted text-xs uppercase tracking-wide">Tracking</p>
            <span className="stamp text-orange mt-1">{delivery.tracking_number}</span>
          </div>
          <StatusPill status={delivery.status} />
        </div>
        <div className="mt-3 text-sm text-ink">
          <p>{delivery.item_description}</p>
          <p className="text-muted">{delivery.delivery_address}</p>
        </div>
        {delivery.status === "IN_TRANSIT" && (
          <p className={`text-xs mt-2 transition-opacity ${flash ? "text-teal" : "text-muted"}`}>
            ● live — rider location updates automatically
          </p>
        )}
        {delivery.status === "DELIVERED" && (
          <p className="text-teal text-sm mt-2 font-semibold">Delivered — thanks for your order.</p>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden border border-line h-96">
        <MapContainer center={pos || NAIROBI} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: "#EA5B35" }} />}
          {pos && <Marker position={pos} icon={riderIcon} />}
          {pos && <Recenter position={pos} />}
        </MapContainer>
      </div>

      {!pos && (
        <p className="text-muted text-sm text-center">
          Live location appears once your rider starts the trip.
        </p>
      )}
    </div>
  );
}
