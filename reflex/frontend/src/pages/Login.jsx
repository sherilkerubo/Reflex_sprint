import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const ROLES = ["RETAILER", "DISPATCHER", "RIDER"];

const ROLE_HOME = { RETAILER: "/retailer", DISPATCHER: "/dispatch", RIDER: "/rider" };

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "RETAILER",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (mode === "signup" && form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setBusy(true);
    try {
      const { user } =
        mode === "signup"
          ? await register({
              name: form.name,
              phone: form.phone,
              role: form.role,
              password: form.password,
            })
          : await login({ phone: form.phone, password: form.password });
      navigate(ROLE_HOME[user.role] || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-ink">
          {mode === "signup" ? "Create your Reflex account" : "Sign in to Reflex"}
        </h1>
        <p className="text-muted text-sm mt-2">
          One account, three cockpits — retailer, dispatcher, or rider.
        </p>
      </div>

      <div className="flex rounded-lg border border-line bg-surface p-1 mb-5 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-1.5 text-sm rounded-md font-semibold transition-colors ${
            mode === "login" ? "bg-navy text-white" : "text-muted"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 py-1.5 text-sm rounded-md font-semibold transition-colors ${
            mode === "signup" ? "bg-navy text-white" : "text-muted"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => update("role", r)}
                  className={`py-2 rounded-md text-xs font-semibold border transition-colors ${
                    form.role === r
                      ? "bg-navy text-white border-navy"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Amina's Electronics"
              className="input"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Phone</label>
          <input
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+2547..."
            className="input font-display"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
          <input
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 6 characters"
            className="input"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Confirm password</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Retype your password"
              className="input"
              autoComplete="new-password"
            />
          </div>
        )}

        {error && <p className="text-red text-sm">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
