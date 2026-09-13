import { useState } from "react";
import { LoadingSpinner, LoadingOverlay } from "../../components/common/LoadingSpinner";
import {
  SkeletonBox,
  SkeletonText,
  SkeletonCircle,
  FoodCardSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
} from "../../components/common/Skeleton";
import {
  ErrorState,
  ItemUnavailableErrorState,
  AIErrorState,
  NetworkErrorState,
} from "../../components/common/ErrorState";
import {
  EmptyState,
  NoFoodEmptyState,
  NoDriversEmptyState,
  RestaurantPendingEmptyState,
  NoOrdersEmptyState,
} from "../../components/common/EmptyState";
import { SuccessState, SuccessModal } from "../../components/common/SuccessState";
import { ConfirmationModal } from "../../components/common/ConfirmationModal";
import { useToast } from "../../context/ToastContext";

export function AdminUIStatesPage() {
  const toast = useToast();

  // Demo modal states
  const [showFullLoading, setShowFullLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDestructiveConfirm, setIsDestructiveConfirm] = useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Selected preset tab to view
  const [activeTab, setActiveTab] = useState<
    "examples" | "loading" | "skeletons" | "empty" | "error" | "success" | "confirm" | "toasts"
  >("examples");

  const triggerFullPageLoader = () => {
    setShowFullLoading(true);
    setTimeout(() => {
      setShowFullLoading(false);
      toast.success("Page loaded", "Full-screen loading simulation completed.");
    }, 2000);
  };

  const triggerSessionExpired = () => {
    window.dispatchEvent(new Event("savebite:auth-expired"));
  };

  const handleConfirmAction = () => {
    setIsConfirmingAction(true);
    setTimeout(() => {
      setIsConfirmingAction(false);
      setShowConfirmModal(false);
      toast.success("Action confirmed", isDestructiveConfirm ? "Listing deleted permanently." : "Operation completed successfully.");
    }, 1200);
  };

  return (
    <div className="adm-ui-states-page">
      {/* HEADER */}
      <div className="adm-page-header">
        <div>
          <div className="adm-badge-live">🎨 PRODUCTION UI SYSTEM · MILESTONE 23</div>
          <h1 className="adm-page-title">UI States, Loading & Error Component Showcase</h1>
          <p className="adm-page-subtitle">
            Test and inspect all reusable loading spinners, skeletons, error handlers, empty states, confirmation dialogs, and toast notifications.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="adm-filter-toolbar">
        <div className="adm-tabs scrollable">
          <button
            className={`adm-tab-btn ${activeTab === "examples" ? "active" : ""}`}
            onClick={() => setActiveTab("examples")}
          >
            ⭐ 6 Milestone Examples
          </button>
          <button
            className={`adm-tab-btn ${activeTab === "skeletons" ? "active" : ""}`}
            onClick={() => setActiveTab("skeletons")}
          >
            🦴 Skeletons (Shimmer)
          </button>
          <button
            className={`adm-tab-btn ${activeTab === "loading" ? "active" : ""}`}
            onClick={() => setActiveTab("loading")}
          >
            ⏳ Loading Spinners
          </button>
          <button
            className={`adm-tab-btn ${activeTab === "toasts" ? "active" : ""}`}
            onClick={() => setActiveTab("toasts")}
          >
            🍞 Toast Stack
          </button>
          <button
            className={`adm-tab-btn ${activeTab === "confirm" ? "active" : ""}`}
            onClick={() => setActiveTab("confirm")}
          >
            ❓ Confirmation Modals
          </button>
          <button
            className={`adm-tab-btn ${activeTab === "success" ? "active" : ""}`}
            onClick={() => setActiveTab("success")}
          >
            🎉 Success Views
          </button>
        </div>
      </div>

      {/* FULL-PAGE OVERLAY DEMO */}
      {showFullLoading && (
        <LoadingOverlay
          label="Simulating Full-Screen Loading..."
          subtext="Fetching live geospatial data from MongoDB Atlas..."
          fullscreen
        />
      )}

      {/* CONFIRMATION MODAL DEMO */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={isDestructiveConfirm ? "Delete Surplus Food Listing?" : "Confirm Restaurant Approval"}
        message={
          isDestructiveConfirm
            ? "Are you sure you want to permanently delete this surplus food listing? This action cannot be undone."
            : "Are you sure you want to approve this restaurant? They will immediately be able to post food listings and fulfill orders."
        }
        confirmText={isDestructiveConfirm ? "Yes, Delete Listing" : "Yes, Approve Kitchen"}
        cancelText="Cancel"
        isDestructive={isDestructiveConfirm}
        isConfirming={isConfirmingAction}
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* SUCCESS MODAL DEMO */}
      <SuccessModal
        isOpen={showSuccessModal}
        title="Surplus Meal Rescued Successfully!"
        message="Your payment was processed and your order has been transmitted to the kitchen. Autonomous AI dispatch is now searching for the optimal delivery partner."
        badge="Order Confirmed"
        onClose={() => setShowSuccessModal(false)}
        action={
          <button
            type="button"
            className="sb-btn-primary"
            onClick={() => {
              setShowSuccessModal(false);
              toast.info("Navigating to live delivery tracking...");
            }}
          >
            🛵 Track Live Delivery
          </button>
        }
      />

      {/* 1. THE 6 MILESTONE EXAMPLES TAB */}
      {activeTab === "examples" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="adm-card">
            <h3 className="adm-card-title" style={{ marginBottom: "16px" }}>
              Required Concrete Example States (Demonstration Suite)
            </h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              These components are utilized throughout the customer, restaurant, delivery, and admin workflows.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
              {/* Example 1 */}
              <div>
                <span className="sb-example-label">Example 1 (Empty State): Customer Food Page</span>
                <NoFoodEmptyState
                  onExpandRadius={() => toast.info("Searching expanded 10 km radius...")}
                  onResetFilters={() => toast.success("Filters reset to all categories.")}
                />
              </div>

              {/* Example 2 */}
              <div>
                <span className="sb-example-label">Example 2 (Error State): Food Item Expired / Rescued</span>
                <ItemUnavailableErrorState
                  onBrowseMore={() => toast.info("Opening surplus food directory...")}
                />
              </div>

              {/* Example 3 */}
              <div>
                <span className="sb-example-label">Example 3 (Empty State): Courier Matching</span>
                <NoDriversEmptyState
                  onRetry={() => toast.info("Re-dispatching autonomous AI partner search...")}
                />
              </div>

              {/* Example 4 */}
              <div>
                <span className="sb-example-label">Example 4 (Empty State): Restaurant Pending</span>
                <RestaurantPendingEmptyState
                  onContactSupport={() => toast.info("Support request initiated.")}
                />
              </div>

              {/* Example 5 */}
              <div>
                <span className="sb-example-label">Example 5 (Global Modal): Authentication Timeout</span>
                <div className="sb-empty-card sb-empty-bordered">
                  <div className="sb-empty-icon-wrap">🔒</div>
                  <h3 className="sb-empty-title">Session Expiration Trigger</h3>
                  <p className="sb-empty-message">
                    Click the button below to simulate receiving an HTTP 401 Unauthorized from the server, which activates the global <code>SessionExpiredModal</code>.
                  </p>
                  <button
                    type="button"
                    onClick={triggerSessionExpired}
                    className="sb-btn-primary"
                    style={{ marginTop: "12px" }}
                  >
                    🔒 Trigger "Your session has expired."
                  </button>
                </div>
              </div>

              {/* Example 6 */}
              <div>
                <span className="sb-example-label">Example 6 (Error State): AI Recommendation Timeout</span>
                <AIErrorState
                  onRetry={() => toast.info("Re-running LangGraph food matching agent...")}
                />
              </div>

              {/* Bonus / Core Presets */}
              <div>
                <span className="sb-example-label">Bonus Preset: Network Connection Loss</span>
                <NetworkErrorState
                  onRetry={() => toast.success("Connected to SaveBite API!")}
                />
              </div>

              <div>
                <span className="sb-example-label">Bonus Preset: No Orders Empty State</span>
                <NoOrdersEmptyState
                  onExploreFood={() => toast.info("Opening food exploration...")}
                />
              </div>

              <div>
                <span className="sb-example-label">Inline Error State</span>
                <ErrorState
                  inline
                  title="Payment Gateway Notice"
                  message="Card verification delayed by banking switch."
                  onRetry={() => toast.info("Retrying payment verification...")}
                />
              </div>

              <div>
                <span className="sb-example-label">Generic Empty State</span>
                <EmptyState
                  icon="🔔"
                  title="No new notifications"
                  message="You are all caught up on platform activities, order statuses, and delivery updates."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SKELETONS TAB */}
      {activeTab === "skeletons" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="adm-card">
            <h3 className="adm-card-title">Food Card Grid Skeletons</h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              Displayed while customer queries nearby food items or filters by category.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <FoodCardSkeleton />
              <FoodCardSkeleton />
              <FoodCardSkeleton />
            </div>
          </div>

          <div className="adm-card">
            <h3 className="adm-card-title">Table Row Skeletons</h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              Displayed while admin, restaurant, or customer tables load orders and deliveries.
            </p>
            <div className="adm-table-container">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Restaurant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-card">
            <h3 className="adm-card-title">Dashboard Stat Card Skeletons</h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              Displayed while dashboard summary KPIs are calculating.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          <div className="adm-card">
            <h3 className="adm-card-title">Skeleton Primitives</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px" }}>
              <SkeletonCircle size={56} />
              <div style={{ flex: 1 }}>
                <SkeletonBox width="200px" height="20px" style={{ marginBottom: "8px" }} />
                <SkeletonText lines={2} gap={6} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOADING SPINNERS TAB */}
      {activeTab === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="adm-card">
            <h3 className="adm-card-title">Loading Spinner Variants</h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              Spinners across sizes (sm, md, lg, xl) and brand colors.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              <div className="sb-demo-box">
                <LoadingSpinner size="sm" variant="yellow" label="Small (16px)" />
              </div>
              <div className="sb-demo-box">
                <LoadingSpinner size="md" variant="yellow" label="Medium (24px)" />
              </div>
              <div className="sb-demo-box">
                <LoadingSpinner size="lg" variant="yellow" label="Large (36px)" />
              </div>
              <div className="sb-demo-box">
                <LoadingSpinner size="xl" variant="yellow" label="Extra Large (48px)" />
              </div>
              <div className="sb-demo-box">
                <LoadingSpinner size="md" variant="dark" label="Dark Theme" />
              </div>
              <div className="sb-demo-box">
                <LoadingSpinner size="md" variant="green" label="Eco Green" />
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                className="sb-btn-primary"
                onClick={triggerFullPageLoader}
              >
                🖥️ Test Full-Screen Loading Overlay (2 seconds)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TOAST STACK TAB */}
      {activeTab === "toasts" && (
        <div className="adm-card">
          <h3 className="adm-card-title">Global Toast Notification Stack</h3>
          <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
            Click the buttons below to fire live floating toasts into the global notification stack.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="sb-btn-success"
              onClick={() => toast.success("Order Placed! 🎉", "Your food rescue order #ORD-9821 has been submitted.")}
            >
              ✓ Fire Success Toast
            </button>
            <button
              type="button"
              className="sb-btn-danger"
              onClick={() => toast.error("Payment Failed", "Card authorization declined by issuing bank.")}
            >
              ✕ Fire Error Toast
            </button>
            <button
              type="button"
              className="sb-btn-warning"
              onClick={() => toast.warning("Surplus Alert ⚡", "Only 1 portion of Vegan Croissants remaining!")}
            >
              ⚠️ Fire Warning Toast
            </button>
            <button
              type="button"
              className="sb-btn-info"
              onClick={() => toast.info("Driver En Route", "Courier Kasun has picked up your food.")}
            >
              ℹ️ Fire Info Toast
            </button>
          </div>
        </div>
      )}

      {/* 5. CONFIRMATION MODALS TAB */}
      {activeTab === "confirm" && (
        <div className="adm-card">
          <h3 className="adm-card-title">Confirmation Modals</h3>
          <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
            Accessible confirmation dialogs for destructive vs standard operations.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="sb-btn-danger"
              onClick={() => {
                setIsDestructiveConfirm(true);
                setShowConfirmModal(true);
              }}
            >
              🗑️ Test Destructive Confirm (e.g. Delete Food)
            </button>
            <button
              type="button"
              className="sb-btn-primary"
              onClick={() => {
                setIsDestructiveConfirm(false);
                setShowConfirmModal(true);
              }}
            >
              ✓ Test Standard Confirm (e.g. Approve Kitchen)
            </button>
          </div>
        </div>
      )}

      {/* 6. SUCCESS VIEWS TAB */}
      {activeTab === "success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="adm-card">
            <h3 className="adm-card-title">Success State View</h3>
            <p className="adm-table-cell-sub" style={{ marginBottom: "20px" }}>
              Inline celebratory success state for completed goals.
            </p>
            <SuccessState
              title="Restaurant Profile Verified & Approved!"
              message="Welcome to SaveBite! Your commercial kitchen is now certified to list surplus food for rescue across the city."
              badge="Verification Complete"
              action={
                <button type="button" className="sb-btn-primary" onClick={() => toast.success("Opening listing creator...")}>
                  ➕ Add First Surplus Listing
                </button>
              }
              secondaryAction={
                <button type="button" className="sb-btn-secondary" onClick={() => toast.info("Opening kitchen dashboard...")}>
                  📊 View Kitchen Dashboard
                </button>
              }
            />
          </div>

          <div className="adm-card">
            <button
              type="button"
              className="sb-btn-primary"
              onClick={() => setShowSuccessModal(true)}
            >
              🎉 Open Success Modal Popup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUIStatesPage;
