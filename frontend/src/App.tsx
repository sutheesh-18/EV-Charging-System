import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/common/ProtectedRoute";

import Landing from "./pages/public/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/driver/Dashboard";
import MapPage from "./pages/driver/MapPage";
import BookingPage from "./pages/driver/BookingPage";
import BookingsPage from "./pages/driver/BookingsPage";
import HistoryPage from "./pages/driver/HistoryPage";
import PredictionsPage from "./pages/driver/PredictionsPage";
import ProfilePage from "./pages/driver/ProfilePage";
import SettingsPage from "./pages/driver/SettingsPage";
import StationDetails from "./pages/driver/StationDetails";
import MyEV from "./pages/driver/MyEV";

import OperatorDashboard from "./pages/operator/OperatorDashboard";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Driver */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />

      {/* My EV */}
      <Route
        path="/my-ev"
        element={
          <ProtectedRoute>
            <MyEV />
          </ProtectedRoute>
        }
      />

      <Route
        path="/stations/:id"
        element={
          <ProtectedRoute>
            <StationDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/booking/:id"
        element={
          <ProtectedRoute>
            <BookingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/predictions"
        element={
          <ProtectedRoute>
            <PredictionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Operator */}
      <Route
        path="/operator"
        element={
          <ProtectedRoute allowedRoles={["operator", "admin"]}>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}