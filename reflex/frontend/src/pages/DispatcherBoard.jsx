import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import StatusPill from "../components/StatusPill";

const COLUMNS = [
  { status: "CREATED", label: "Unassigned" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "PICKED_UP", label: "Picked up" },
  { status: "IN_TRANSIT", label: "In transit" },
  { status: "DELIVERED", label: "Delivered" },
];

export default function DispatcherBoard() {
  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [selectedRider, setSelectedRider] = useState({});
  const [lastAssignment, setLastAssignment] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    const [d, r] = await Promise.all([api.listDeliveries(), api.riders()]);
    setDeliveries(d);
    setRiders(r);
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    socket.on("delivery:new", handler);
    socket.on("delivery:assigned", handler);
    socket.on("delivery:status", handler);
    socket.on("delivery:delivered", handler);
    return () => {
      socket.off("delivery:new", handler);
      socket.off("delivery:assigned", handler);
      socket.off("delivery:status", handler);
      socket.off("delivery:delivered", handler);
    };
  }, []);

  async function confirmAssign(deliveryId) {
    const riderId = selectedRider[deliveryId];
    if (!riderId) return;
    setError("");
    try {
      const result = await api.assign(deliveryId, riderId);
      setLastAssignment(result);
      setAssigning(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-ink">Dispatch board</h2>
        <p className="text-muted text-sm">{deliveries.length} total jobs</p>
      </div>

      {error && <p className="text-red text-sm mb-3">{error}</p>}

      {lastAssignment && (
        <div className="rounded-lg border border-teal/30 bg-teal-soft p-3 text-sm mb-4">
          <p className="text-teal font-semibold mb-1">
            Assigned {lastAssignment.delivery.tracking_number}
          </p>
          <p className="text-ink">
            SMS sent with release code{" "}
            <span className="stamp text-teal">{lastAssignment.releaseCode}</span> and tracking
            link <span className="font-display text-xs">{lastAssignment.trackingUrl}</span>
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className="min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {col.label}
              </h3>
              <span className="text-xs text-muted">
                {deliveries.filter((d) => d.status === col.status).length}
              </span>
            </div>
            <div className="space-y-2 min-h-24">
              {deliveries
                .filter((d) => d.status === col.status)
                .map((d) => (
                  <div key={d.id} className="card p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="stamp text-orange text-[10px]">{d.tracking_number}</span>
                      <StatusPill status={d.status} />
                    </div>
                    <p className="text-ink text-sm font-medium leading-snug">{d.customer_name}</p>
                    <p className="text-muted text-xs leading-snug mt-0.5">{d.delivery_address}</p>

                    {col.status === "CREATED" &&
                      (assigning === d.id ? (
                        <div className="mt-2 space-y-1.5">
                          <select
                            className="input text-xs py-1.5"
                            value={selectedRider[d.id] || ""}
                            onChange={(e) =>
                              setSelectedRider((s) => ({ ...s, [d.id]: e.target.value }))
                            }
                          >
                            <option value="">Choose rider…</option>
                            {riders.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => confirmAssign(d.id)}
                              className="flex-1 text-xs py-1.5 rounded-md bg-orange text-white font-semibold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setAssigning(null)}
                              className="text-xs py-1.5 px-2 rounded-md border border-line text-muted"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigning(d.id)}
                          className="mt-2 w-full text-xs py-1.5 rounded-md border border-orange/40 text-orange hover:bg-orange-soft transition-colors"
                        >
                          Assign rider
                        </button>
                      ))}

                    {d.rider_id && col.status !== "CREATED" && (
                      <p className="text-muted text-[11px] mt-2">
                        rider: {riders.find((r) => r.id === d.rider_id)?.name || "—"}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
