import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import CustomerDashboard from "./pages/dashboards/CustomerDashboard";
import RestaurantDashboard from "./pages/dashboards/RestaurantDashboard";
import DeliveryDashboard from "./pages/dashboards/DeliveryDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public Landing Page */}
          <Route
            path="/"
            element={<LandingPage />}
          />

          {/* Restaurant Owner Authentication */}
          <Route
            path="/restaurant/login"
            element={
              <LoginPage
                role="RestaurantOwner"
                title="Restaurant Owner Login"
                subtitle="Manage your restaurant and rescue surplus food."
                registerPath="/restaurant/register"
              />
            }
          />
          <Route
            path="/restaurant/register"
            element={
              <RegisterPage
                role="RestaurantOwner"
                title="Create Restaurant Account"
                subtitle="Join SaveBite and turn surplus food into revenue."
                loginPath="/restaurant/login"
              />
            }
          />

          {/* Customer Authentication */}
          <Route
            path="/customer/login"
            element={
              <LoginPage
                role="Customer"
                title="Customer Login"
                subtitle="Discover affordable surplus food near you."
                registerPath="/customer/register"
              />
            }
          />
          <Route
            path="/customer/register"
            element={
              <RegisterPage
                role="Customer"
                title="Create Customer Account"
                subtitle="Discover affordable surplus food near you."
                loginPath="/customer/login"
              />
            }
          />

          {/* Delivery Partner Authentication */}
          <Route
            path="/delivery/login"
            element={
              <LoginPage
                role="DeliveryPerson"
                title="Delivery Partner Login"
                subtitle="Manage your deliveries and earn from food rescue."
                registerPath="/delivery/register"
              />
            }
          />
          <Route
            path="/delivery/register"
            element={
              <RegisterPage
                role="DeliveryPerson"
                title="Create Delivery Account"
                subtitle="Earn by delivering eco-friendly food orders."
                loginPath="/delivery/login"
              />
            }
          />

          {/* Role-Protected Dashboards */}
          <Route
            path="/restaurant/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <RestaurantDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <CustomerDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/delivery/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <DeliveryDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/customer/login"
              >
                <AdminDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* Fallback redirect */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;