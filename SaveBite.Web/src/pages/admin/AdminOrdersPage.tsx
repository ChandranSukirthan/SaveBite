import { useEffect, useState, useMemo } from "react";
import { getAdminOrders, type AdminOrder } from "../../services/adminService";
import { Pagination } from "../../components/common/Pagination";

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await getAdminOrders(activeStatus, searchQuery);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [activeStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    return <span className={`adm-status-pill adm-status-${s}`}>{status}</span>;
  };

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage, pageSize]);

  return (
    <div className="adm-orders-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Order Monitoring</h1>
          <p className="adm-page-subtitle">Real-time supervision of all customer orders, transactions, and fulfillment states across restaurants.</p>
        </div>
        <button onClick={loadOrders} className="adm-btn-secondary">
          🔄 Refresh Orders
        </button>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="adm-filter-toolbar">
        <div className="adm-tabs scrollable">
          {["all", "Pending", "Confirmed", "Preparing", "ReadyForPickup", "OutForDelivery", "Delivered", "Cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setActiveStatus(s); setCurrentPage(1); }}
              className={`adm-tab-btn ${activeStatus === s ? "active" : ""}`}
            >
              {s === "all" ? "All Orders" : s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="adm-search-box">
          <span className="adm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by order ID, customer, restaurant, or food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="adm-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                loadOrders();
              }}
              className="adm-search-clear"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* ORDERS TABLE */}
      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Loading order data...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="adm-card adm-empty-state">
          <span className="adm-empty-icon">📦</span>
          <h3>No orders found</h3>
          <p>
            {searchQuery
              ? `No orders matching "${searchQuery}".`
              : "No orders found for the selected status."}
          </p>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Restaurant</th>
                  <th>Item</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="adm-id-code" title={o.id}>
                        #{o.id.slice(-6)}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{o.customerName}</div>
                      <div className="adm-table-cell-sub">{o.customerEmail}</div>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{o.restaurantName}</div>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{o.foodName}</div>
                      <div className="adm-table-cell-sub">
                        Qty: {o.quantity} • {o.foodCategory}
                      </div>
                    </td>
                    <td className="adm-font-bold">
                      ${o.totalPrice.toFixed(2)}
                    </td>
                    <td>{statusBadge(o.status)}</td>
                    <td className="adm-table-cell-sub">
                      <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                      <div>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="adm-btn-action-view"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalItems={orders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="orders"
            className="adm-pagination-bar"
          />
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="adm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">Order #{selectedOrder.id}</h3>
                <span className="adm-table-cell-sub">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="adm-modal-close">×</button>
            </div>

            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div className="adm-detail-item">
                  <span className="adm-detail-label">Status</span>
                  <div>{statusBadge(selectedOrder.status)}</div>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Total Amount</span>
                  <span className="adm-detail-value adm-font-bold" style={{ fontSize: "18px", color: "var(--yellow-dark, #b8860b)" }}>
                    ${selectedOrder.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Customer</span>
                  <span className="adm-detail-value">{selectedOrder.customerName}</span>
                  <span className="adm-table-cell-sub">{selectedOrder.customerEmail}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Kitchen / Restaurant</span>
                  <span className="adm-detail-value">{selectedOrder.restaurantName}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Food Item</span>
                  <span className="adm-detail-value">{selectedOrder.foodName} (x{selectedOrder.quantity})</span>
                  <span className="adm-table-cell-sub">Category: {selectedOrder.foodCategory}</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Last Status Update</span>
                  <span className="adm-detail-value">{new Date(selectedOrder.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="adm-detail-block">
                <span className="adm-detail-label">Destination Delivery Address</span>
                <p className="adm-detail-text">{selectedOrder.deliveryAddress}</p>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button onClick={() => setSelectedOrder(null)} className="adm-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage;

