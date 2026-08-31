import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { socket } from "../lib/socket";
import StatusPill from "../components/StatusPill";
import { enqueue, getQueueForDelivery, clearQueueForDelivery } from "../lib/offlineQueue";

// Nairobi CBD, used as the simulated GPS starting point / walk.
const START = { lat: -1.2864, lng: 36.8172 };

export default function RiderConsole() {
  const { session } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [active, setActive] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [code, setCode] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState("");
  const posRef = useRef({ ...START });
  const intervalRef = useRef(null);

  async function refresh() {
    const data = await api.listDeliveries({ mine: "true" });
    setDeliveries(data);
    if (active) {
      const updated = data.find((d) => d.id === active.id);
      if (updated) setActive(updated);
    }
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    socket.on("delivery:assigned", handler);
    socket.on("delivery:status", handler);
    return () => {
      socket.off("delivery:assigned", handler);
      socket.off("delivery:status", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  async function refreshQueue(deliveryId) {
    setQueueSize(await getQueueForDelivery(deliveryId).then((q) => q.length));
  }

  async function setStatus(status) {
    setError("");
    try {
      if (offlineMode) {
        await enqueue(active.id, "status", { status });
        await refreshQueue(active.id);
      } else {
        await api.setStatus(active.id, status);
      }
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleStream() {
    if (streaming) {
      clearInterval(intervalRef.current);
      setStreaming(false);
      return;
    }
    posRef.current = { ...START };
    setStreaming(true);
    intervalRef.current = setInterval(async () => {
      // small random walk so the customer's map visibly moves
      posRef.current = {
        lat: posRef.current.lat + (Math.random() - 0.4) * 0.002,
        lng: posRef.current.lng + (Math.random() - 0.4) * 0.002,
      };
      try {
        if (offlineMode) {
          await enqueue(active.id, "location", {
            latitude: posRef.current.lat,
            longitude: posRef.current.lng,
          });
          refreshQueue(active.id);
        } else {
          await api.sendLocation(active.id, posRef.current.lat, posRef.current.lng);
        }
      } catch {
        // network drop mid-stream: fall back to queueing so nothing is lost
        await enqueue(active.id, "location", {
          latitude: posRef.current.lat,
          longitude: posRef.current.lng,
        });
        refreshQueue(active.id);
      }
    }, 5000);
  }

  async function syncNow() {
    const queued = await getQueueForDelivery(active.id);
    if (queued.length === 0) return;
    const events = queued.map((q) => ({ type: q.type, payload: q.payload, clientTimestamp: q.clientTimestamp }));
    await api.syncBatch(active.id, events);
    await clearQueueForDelivery(active.id);
    setQueueSize(0);
    refresh();
  }

  async function submitVerify(e) {
    e.preventDefault();
    setError("");
    setVerifyResult(null);
    try {
      const result = await api.verify(active.id, code);
      setVerifyResult(result);
      setCode("");
      refresh();
    } catch (err) {
      setError(err.message);
      setVerifyResult({ verified: false });
    }
  }

  const nextAction = {
    ASSIGNED: { label: "Mark picked up", next: "PICKED_UP" },
    PICKED_UP: { label: "Start transit", next: "IN_TRANSIT" },
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <section>
        <h2 className="font-bold text-ink mb-3">Your jobs</h2>
        <div className="space-y-2">
          {deliveries.length === 0 && (
            <p className="text-muted text-sm border border-dashed border-line rounded-lg p-4 text-center">
              Nothing assigned yet. Ask dispatch to send you a job.
            </p>
          )}
          {deliveries.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setActive(d);
                setVerifyResult(null);
                refreshQueue(d.id);
              }}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                active?.id === d.id
                  ? "border-orange bg-orange-soft"
                  : "border-line bg-surface hover:border-navy"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="stamp text-orange text-[10px]">{d.tracking_number}</span>
                <StatusPill status={d.status} />
              </div>
              <p className="text-ink text-sm">{d.customer_name}</p>
              <p className="text-muted text-xs">{d.delivery_address}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        {!active ? (
          <p className="text-muted text-sm border border-dashed border-line rounded-lg p-10 text-center">
            Select a job on the left to manage pickup, live tracking, and delivery verification.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <span className="stamp text-orange">{active.tracking_number}</span>
                  <p className="text-ink mt-2 font-medium">{active.customer_name}</p>
                  <p className="text-muted text-sm">{active.delivery_address}</p>
                  <p className="text-muted text-sm">{active.item_description}</p>
                </div>
                <StatusPill status={active.status} />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {nextAction[active.status] && (
                  <button
                    onClick={() => setStatus(nextAction[active.status].next)}
                    className="text-sm px-4 py-2 rounded-md btn-primary"
                  >
                    {nextAction[active.status].label}
                  </button>
                )}

                {active.status === "IN_TRANSIT" && (
                  <button
                    onClick={toggleStream}
                    className={`text-sm px-4 py-2 rounded-md font-bold transition-colors ${
                      streaming
                        ? "bg-red text-white hover:brightness-110"
                        : "border border-teal text-teal hover:bg-teal-soft"
                    }`}
                  >
                    {streaming ? "Stop GPS stream" : "Start GPS stream"}
                  </button>
                )}

                <label className="flex items-center gap-1.5 text-xs text-muted ml-auto">
                  <input
                    type="checkbox"
                    checked={offlineMode}
                    onChange={(e) => setOfflineMode(e.target.checked)}
                  />
                  Simulate offline (queue in IndexedDB)
                </label>
              </div>

              {offlineMode && (
                <div className="mt-3 flex items-center justify-between rounded-md border border-amber/30 bg-amber-soft px-3 py-2 text-xs">
                  <span className="text-amber">
                    {queueSize} event{queueSize === 1 ? "" : "s"} queued locally
                  </span>
                  <button
                    onClick={syncNow}
                    disabled={queueSize === 0}
                    className="text-amber underline disabled:opacity-40"
                  >
                    Sync now
                  </button>
                </div>
              )}

              {error && <p className="text-red text-sm mt-3">{error}</p>}
            </div>

            {active.status === "IN_TRANSIT" && (
              <div className="card p-5">
                <h3 className="font-bold text-ink mb-1">Verify handoff</h3>
                <p className="text-muted text-sm mb-3">
                  Ask the customer for their 6-digit release code from the SMS.
                </p>
                <form onSubmit={submitVerify} className="flex items-center gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="482910"
                    className="input font-display text-lg tracking-widest text-center max-w-40"
                    inputMode="numeric"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-teal text-white font-bold hover:brightness-110"
                  >
                    Confirm delivery
                  </button>
                </form>
                {verifyResult && !verifyResult.verified && (
                  <p className="text-red text-sm mt-2">Code doesn't match. Try again.</p>
                )}
                {verifyResult?.verified && (
                  <div className="mt-3 rounded-md border border-teal/30 bg-teal-soft p-3 text-sm">
                    <p className="text-teal font-semibold">Delivered — payout unlocked.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
