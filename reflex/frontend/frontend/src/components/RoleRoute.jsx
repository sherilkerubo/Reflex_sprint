import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function RoleRoute({ role, children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.user.role !== role) {
    return (
      <div className="card p-6 text-center max-w-md mx-auto">
        <p className="text-red font-semibold">Wrong role for this screen.</p>
        <p className="text-muted text-sm mt-1">
          You're signed in as {session.user.role}. Log in as {role} to view this page.
        </p>
      </div>
    );
  }
  return children;
}
