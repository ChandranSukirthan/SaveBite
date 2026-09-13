import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";
import { ProfileGate } from "./components/auth/ProfileGate";
import { AdminLayout } from "./components/layout/AdminLayout";
import { SignalRProvider } from "./context/SignalRContext";
import { ToastProvider } from "./context/ToastContext";
import { SessionExpiredModal } from "./components/common/SessionExpiredModal";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

// Lazy-loaded pages for fast code-splitting and small initial bundle
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

const CustomerProfileSetupPage = lazy(() => import("./pages/profiles/CustomerProfileSetupPage"));
const RestaurantProfileSetupPage = lazy(() => import("./pages/profiles/RestaurantProfileSetupPage"));
const DeliveryProfileSetupPage = lazy(() => import("./pages/profiles/DeliveryProfileSetupPage"));

const CustomerDashboard = lazy(() => import("./pages/dashboards/CustomerDashboard"));
const FoodDiscoveryPage = lazy(() => import("./pages/customer/FoodDiscoveryPage").then((m) => ({ default: m.FoodDiscoveryPage })));
const FoodDetailsPage = lazy(() => import("./pages/customer/FoodDetailsPage").then((m) => ({ default: m.FoodDetailsPage })));
const CustomerOrdersPage = lazy(() => import("./pages/customer/CustomerOrdersPage").then((m) => ({ default: m.CustomerOrdersPage })));
const AIRecommendationsPage = lazy(() => import("./pages/customer/AIRecommendationsPage").then((m) => ({ default: m.AIRecommendationsPage })));
const DeliveryEstimatePage = lazy(() => import("./pages/customer/DeliveryEstimatePage").then((m) => ({ default: m.DeliveryEstimatePage })));
const OrderTrackingPage = lazy(() => import("./pages/customer/OrderTrackingPage").then((m) => ({ default: m.OrderTrackingPage })));
const CustomerNotificationsPage = lazy(() => import("./pages/customer/CustomerNotificationsPage").then((m) => ({ default: m.CustomerNotificationsPage })));

const RestaurantDashboard = lazy(() => import("./pages/dashboards/RestaurantDashboard"));
const RestaurantProfileView = lazy(() => import("./pages/restaurant/RestaurantProfileView"));
const RestaurantNotificationsPage = lazy(() => import("./pages/restaurant/RestaurantNotificationsPage"));
const FoodListPage = lazy(() => import("./pages/restaurant/FoodListPage"));
const AddFoodPage = lazy(() => import("./pages/restaurant/AddFoodPage"));
const EditFoodPage = lazy(() => import("./pages/restaurant/EditFoodPage"));
const RestaurantOrdersPage = lazy(() => import("./pages/restaurant/RestaurantOrdersPage"));

const DeliveryDashboard = lazy(() => import("./pages/dashboards/DeliveryDashboard"));
const DeliveryProfilePage = lazy(() => import("./pages/delivery/DeliveryProfilePage").then((m) => ({ default: m.DeliveryProfilePage })));
const DeliveryRequestsPage = lazy(() => import("./pages/delivery/DeliveryRequestsPage").then((m) => ({ default: m.DeliveryRequestsPage })));
const DeliveryNotificationsPage = lazy(() => import("./pages/delivery/DeliveryNotificationsPage").then((m) => ({ default: m.DeliveryNotificationsPage })));
const DeliveryActiveNavigationPage = lazy(() => import("./pages/delivery/DeliveryActiveNavigationPage").then((m) => ({ default: m.DeliveryActiveNavigationPage })));

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminRestaurantsPage = lazy(() => import("./pages/admin/AdminRestaurantsPage").then((m) => ({ default: m.AdminRestaurantsPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const AdminDeliveriesPage = lazy(() => import("./pages/admin/AdminDeliveriesPage").then((m) => ({ default: m.AdminDeliveriesPage })));
const AdminAIActivityPage = lazy(() => import("./pages/admin/AdminAIActivityPage").then((m) => ({ default: m.AdminAIActivityPage })));
const AdminUIStatesPage = lazy(() => import("./pages/admin/AdminUIStatesPage").then((m) => ({ default: m.AdminUIStatesPage })));


function App() {
  return (
    <AuthProvider>
      <SignalRProvider>
        <ToastProvider>
          <BrowserRouter>
            <SessionExpiredModal />
            <Suspense
              fallback={
                <div
                  style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-light, #f8f9fa)",
                  }}
                >
                  <LoadingSpinner size="lg" label="Loading SaveBite..." />
                </div>
              }
            >
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

          {/* Administrator Authentication */}
          <Route
            path="/admin/login"
            element={
              <LoginPage
                role="Admin"
                title="Administrator Login"
                subtitle="Access platform administration, verification controls, and telemetry."
                registerPath="/admin/login"
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
            path="/customer/orders/:orderId/track"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <OrderTrackingPage />
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
            path="/customer/notifications"
            element={
              <RoleProtectedRoute
                allowedRole="Customer"
                fallbackLogin="/customer/login"
              >
                <ProfileGate>
                  <CustomerNotificationsPage />
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
            path="/delivery/notifications"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <ProfileGate>
                  <DeliveryNotificationsPage />
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
            path="/delivery/requests"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <ProfileGate>
                  <DeliveryRequestsPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/delivery/active"
            element={
              <RoleProtectedRoute
                allowedRole="DeliveryPerson"
                fallbackLogin="/delivery/login"
              >
                <ProfileGate>
                  <DeliveryActiveNavigationPage />
                </ProfileGate>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/restaurants"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminRestaurantsPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminUsersPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminOrdersPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/deliveries"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminDeliveriesPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/ai-activity"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminAIActivityPage />
                </AdminLayout>
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/admin/ui-states"
            element={
              <RoleProtectedRoute
                allowedRole="Admin"
                fallbackLogin="/admin/login"
              >
                <AdminLayout>
                  <AdminUIStatesPage />
                </AdminLayout>
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
      </Suspense>
      </BrowserRouter>
      </ToastProvider>
      </SignalRProvider>
    </AuthProvider>
  );
}

export default App;