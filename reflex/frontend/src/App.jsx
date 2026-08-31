import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RoleRoute from "./components/RoleRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RetailerDashboard from "./pages/RetailerDashboard";
import DispatcherBoard from "./pages/DispatcherBoard";
import RiderConsole from "./pages/RiderConsole";
import CustomerTracking from "./pages/CustomerTracking";
import SmsOutbox from "./pages/SmsOutbox";
import { useAuth } from "./lib/AuthContext";

const ROLE_HOME = { RETAILER: "/retailer", DISPATCHER: "/dispatch", RIDER: "/rider" };

function Landing() {
  const { session } = useAuth();
  if (session) return <Navigate to={ROLE_HOME[session.user.role] || "/login"} replace />;
  return <Home />;
}

function Page({ children }) {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</div>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/track/:trackingNumber" element={<Page><CustomerTracking /></Page>} />
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route
          path="/sms"
          element={
            <Page>
              <RoleRoute role="DISPATCHER">
                <SmsOutbox />
              </RoleRoute>
            </Page>
          }
        />
        <Route
          path="/retailer"
          element={
            <Page>
              <RoleRoute role="RETAILER">
                <RetailerDashboard />
              </RoleRoute>
            </Page>
          }
        />
        <Route
          path="/dispatch"
          element={
            <Page>
              <RoleRoute role="DISPATCHER">
                <DispatcherBoard />
              </RoleRoute>
            </Page>
          }
        />
        <Route
          path="/rider"
          element={
            <Page>
              <RoleRoute role="RIDER">
                <RiderConsole />
              </RoleRoute>
            </Page>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
