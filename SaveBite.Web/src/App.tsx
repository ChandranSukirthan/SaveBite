import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";
import { ProfileGate } from "./components/auth/ProfileGate";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import CustomerProfileSetupPage from "./pages/profiles/CustomerProfileSetupPage";
import RestaurantProfileSetupPage from "./pages/profiles/RestaurantProfileSetupPage";
import DeliveryProfileSetupPage from "./pages/profiles/DeliveryProfileSetupPage";

import CustomerDashboard from "./pages/dashboards/CustomerDashboard";
import { FoodDiscoveryPage } from "./pages/customer/FoodDiscoveryPage";
import { FoodDetailsPage } from "./pages/customer/FoodDetailsPage";
import { CustomerOrdersPage } from "./pages/customer/CustomerOrdersPage";
import { AIRecommendationsPage } from "./pages/customer/AIRecommendationsPage";
import { DeliveryEstimatePage } from "./pages/customer/DeliveryEstimatePage";
import RestaurantDashboard from "./pages/dashboards/RestaurantDashboard";
import RestaurantProfileView from "./pages/restaurant/RestaurantProfileView";
import RestaurantNotificationsPage from "./pages/restaurant/RestaurantNotificationsPage";
import FoodListPage from "./pages/restaurant/FoodListPage";
import AddFoodPage from "./pages/restaurant/AddFoodPage";
import EditFoodPage from "./pages/restaurant/EditFoodPage";
import RestaurantOrdersPage from "./pages/restaurant/RestaurantOrdersPage";
import DeliveryDashboard from "./pages/dashboards/DeliveryDashboard";
import { DeliveryProfilePage } from "./pages/delivery/DeliveryProfilePage";
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

          {/* Role Profile Setup Routes */}
          <Route
            path="/restaurant/profile-setup"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <RestaurantProfileSetupPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/profile-setup"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <CustomerProfileSetupPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/delivery/profile-setup"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <DeliveryProfileSetupPage />
              </RoleProtectedRoute>
            }
          />

          {/* Role-Protected Dashboards (Guarded by ProfileGate) */}
          <Route
            path="/restaurant/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <RestaurantDashboard />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/profile"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <RestaurantProfileView />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/notifications"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <RestaurantNotificationsPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/food"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <FoodListPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/food/new"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <AddFoodPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/food/:id/edit"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <EditFoodPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/restaurant/orders"
            element={
              <RoleProtectedRoute
                allowedRole="RestaurantOwner"
                fallbackLogin="/restaurant/login"
              >
                <ProfileGate>
                  <RestaurantOrdersPage />
                </ProfileGate>
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
                <ProfileGate>
                  <CustomerDashboard />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/food"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <FoodDiscoveryPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/food/:id"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <FoodDetailsPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/orders"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <CustomerOrdersPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/orders/:orderId/estimate"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <DeliveryEstimatePage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/ai-recommendations"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <AIRecommendationsPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/customer/explore"
            element={<Navigate to="/customer/food" replace />}
          />

          <Route
            path="/delivery/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <ProfileGate>
                  <DeliveryDashboard />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/delivery/profile"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <ProfileGate>
                  <DeliveryProfilePage />
                </ProfileGate>
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