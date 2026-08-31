import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function SmsOutbox() {
  const [messages, setMessages] = useState([]);

  async function refresh() {
    setMessages(await api.smsOutbox());
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-bold text-ink mb-1">SMS log</h2>
      <p className="text-muted text-sm mb-4">
        Demo-only view of what Africa's Talking would have sent to customers. Wire in real
        credentials in <code className="stamp text-xs">backend/src/services/sms.js</code> for
        production.
      </p>
      <div className="space-y-2">
        {messages.length === 0 && (
          <p className="text-muted text-sm border border-dashed border-line rounded-lg p-6 text-center bg-surface">
            No messages sent yet — assign a delivery to a rider to trigger one.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between text-xs text-muted mb-2">
              <span className="font-display">{m.to}</span>
              <span>{new Date(m.sentAt).toLocaleTimeString()}</span>
            </div>
            <p className="text-ink text-sm">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
