import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RouteDiagram from "../components/RouteDiagram";

export default function Home() {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState("");

  function submitTracking(e) {
    e.preventDefault();
    const value = trackingNumber.trim();
    if (value) navigate(`/track/${value}`);
  }

  return (
    <div>
      <section className="bg-navy">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-24 flex items-start justify-between gap-10 flex-wrap">
          <div className="max-w-xl">
            <p className="text-orange text-xs font-bold tracking-wide mb-3">
              REAL-TIME DISPATCH, NO PHONE TAG NEEDED
            </p>
            <h1 className="text-white text-4xl sm:text-5xl font-bold leading-tight">
              Know where it is.
              <br />
              Get it sorted.
            </h1>
            <p className="mt-4 leading-relaxed" style={{ color: "#B7C0D1" }}>
              Log a delivery, hand it to a rider, and watch it move — all in one place,
              updated the moment it happens.
            </p>
          </div>
          <RouteDiagram />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 -mt-14 pb-16">
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="card p-6">
            <div className="icon-badge bg-orange-soft mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA5B35" strokeWidth="2">
                <path d="M3 7l9-4 9 4-9 4-9-4Z" />
                <path d="M3 7v10l9 4 9-4V7" />
                <path d="M12 11v10" />
              </svg>
            </div>
            <h2 className="font-bold text-ink text-lg">Track your delivery</h2>
            <p className="text-muted text-sm mt-1 mb-4">
              Enter the tracking number from your SMS.
            </p>
            <form onSubmit={submitTracking} className="flex items-center gap-2">
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="e.g. RFX-8240"
                className="input font-display"
              />
              <button type="submit" className="btn-primary shrink-0">
                Track order
              </button>
            </form>
          </div>

          <div className="card p-6">
            <div className="icon-badge bg-teal-soft mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#158F6B" strokeWidth="2">
                <rect x="3" y="7" width="14" height="10" rx="1.5" />
                <path d="M17 10h2.5l1.5 2.5V17H17" />
                <circle cx="7.5" cy="18" r="1.6" />
                <circle cx="17.5" cy="18" r="1.6" />
              </svg>
            </div>
            <h2 className="font-bold text-ink text-lg">Staff sign in</h2>
            <p className="text-muted text-sm mt-1 mb-4">
              Retailer, dispatcher, or rider — one login, three cockpits.
            </p>
            <button onClick={() => navigate("/login")} className="btn-secondary">
              Sign in to your console
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
