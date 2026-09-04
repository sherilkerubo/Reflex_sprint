import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import StatusPill from "../components/StatusPill";

const EMPTY = { customerName: "", customerPhone: "", deliveryAddress: "", itemDescription: "" };

export default function RetailerDashboard() {
  const [form, setForm] = useState(EMPTY);
  const [deliveries, setDeliveries] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState(null);

  async function refresh() {
    const data = await api.listDeliveries({ mine: "true" });
    setDeliveries(data);
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

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const delivery = await api.createDelivery(form);
      setForm(EMPTY);
      setJustCreated(delivery);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
      <section className="card p-5 h-fit">
        <h2 className="font-bold text-ink mb-1">Log a delivery</h2>
        <p className="text-muted text-sm mb-4">
          Goes straight to the dispatch board — no phone tag required.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Customer name">
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="input"
              placeholder="John Kamau"
            />
          </Field>
          <Field label="Customer phone">
            <input
              required
              value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
              className="input font-display"
              placeholder="+254711000111"
            />
          </Field>
          <Field label="Delivery address">
            <input
              required
              value={form.deliveryAddress}
              onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
              className="input"
              placeholder="Kilimani, Nairobi"
            />
          </Field>
          <Field label="Item description">
            <textarea
              required
              value={form.itemDescription}
              onChange={(e) => setForm((f) => ({ ...f, itemDescription: e.target.value }))}
              className="input min-h-20 resize-none"
              placeholder="2x phone chargers, 1x screen protector"
            />
          </Field>
          {error && <p className="text-red text-sm">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Logging…" : "Log delivery request"}
          </button>
        </form>

        {justCreated && (
          <div className="mt-4 rounded-lg border border-teal/30 bg-teal-soft p-3 text-sm">
            <p className="text-teal font-semibold mb-1">Logged.</p>
            <p className="text-ink">
              Tracking <span className="stamp text-teal">{justCreated.tracking_number}</span> is
              on the dispatch board now.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-ink mb-3">Your orders</h2>
        <div className="space-y-2">
          {deliveries.length === 0 && (
            <p className="text-muted text-sm border border-dashed border-line rounded-lg p-6 text-center bg-surface">
              No delivery requests yet. Log your first one on the left.
            </p>
          )}
          {deliveries.map((d) => (
            <div key={d.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="stamp text-orange text-xs">{d.tracking_number}</span>
                  <StatusPill status={d.status} />
                </div>
                <p className="text-ink mt-1.5 font-medium">{d.customer_name} · {d.delivery_address}</p>
                <p className="text-muted text-sm">{d.item_description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
