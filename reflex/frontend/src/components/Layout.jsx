import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const ROLE_HOME = {
  RETAILER: { to: "/retailer", label: "Retailer" },
  DISPATCHER: { to: "/dispatch", label: "Dispatch board" },
  RIDER: { to: "/rider", label: "Rider console" },
};

export default function Layout({ children }) {
  const { session, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <header className="border-b border-line bg-surface sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center h-8 w-8 rounded-md bg-navy text-white font-bold text-sm">
              R
            </span>
            <span className="font-bold tracking-tight text-lg text-ink">Reflex</span>
            <span className="pill hidden sm:inline-flex">Dispatch console</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === "/" ? "text-orange font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              Track order
            </Link>
            {session && (
              <Link
                to={ROLE_HOME[session.user.role]?.to || "/"}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname.startsWith(ROLE_HOME[session.user.role]?.to || "###")
                    ? "text-orange font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {ROLE_HOME[session.user.role]?.label}
              </Link>
            )}
            {session?.user.role === "DISPATCHER" && (
              <Link
                to="/sms"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === "/sms" ? "text-orange font-semibold" : "text-muted hover:text-ink"
                }`}
              >
                SMS log
              </Link>
            )}
          </nav>

          {session ? (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-ink leading-tight font-medium">{session.user.name}</div>
                <div className="text-xs text-muted leading-tight">{session.user.role}</div>
              </div>
              <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">
                Log out
              </button>
            </div>
          ) : (
            // Home already has its own "Staff sign in" card as the entry
            // point — skip the header button there so there aren't two.
            location.pathname !== "/" && (
              <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">
                Staff sign in
              </Link>
            )
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line py-5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-xs text-muted flex justify-between">
          <span>Reflex Delivery Engine — sprint demo build</span>
          <span className="font-display">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
