import { useEffect, useState, useMemo } from "react";
import { getAdminDeliveries, type AdminDelivery } from "../../services/adminService";
import { Pagination } from "../../components/common/Pagination";

export function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [selectedDelivery, setSelectedDelivery] = useState<AdminDelivery | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  async function loadDeliveries() {
    try {
      setLoading(true);
      const data = await getAdminDeliveries(activeStatus);
      setDeliveries(data);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeliveries();
  }, [activeStatus]);

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    return <span className={`adm-status-pill adm-status-${s}`}>{status}</span>;
  };

  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return deliveries.slice(start, start + pageSize);
  }, [deliveries, currentPage, pageSize]);

  return (
    <div className="adm-deliveries-page">
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Delivery Monitoring</h1>
          <p className="adm-page-subtitle">Track courier dispatches, live delivery routes, transit timelines, and autonomous driver assignments.</p>
        </div>
        <button onClick={loadDeliveries} className="adm-btn-secondary">
          🔄 Refresh Deliveries
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="adm-filter-toolbar">
        <div className="adm-tabs scrollable">
          {["all", "Searching", "Assigned", "Accepted", "PickedUp", "InTransit", "Delivered", "Cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setActiveStatus(s); setCurrentPage(1); }}
              className={`adm-tab-btn ${activeStatus === s ? "active" : ""}`}
            >
              {s === "all" ? "All Deliveries" : s}
            </button>
          ))}
        </div>
      </div>

      {/* DELIVERIES TABLE */}
      {loading ? (
        <div className="adm-loading-state">
          <div className="adm-spinner" />
          <p>Loading delivery stream...</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="adm-card adm-empty-state">
          <span className="adm-empty-icon">🚴</span>
          <h3>No delivery tasks found</h3>
          <p>No dispatches matching the selected status filter.</p>
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-table-container">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Pickup Kitchen</th>
                  <th>Assigned Courier</th>
                  <th>Distance & Fee</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDeliveries.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="adm-id-code" title={d.id}>#{d.id.slice(-6)}</span>
                      <div className="adm-table-cell-sub">Order: #{d.orderId?.slice(-6) || "N/A"}</div>
                    </td>
                    <td>
                      <div className="adm-table-cell-title">{d.restaurantName}</div>
                      <div className="adm-table-cell-sub">{d.restaurantAddress || "Kitchen"}</div>
                    </td>
                    <td>
                      {d.status === "Searching" ? (
                        <span className="adm-pill-searching">🤖 Searching (AI)</span>
                      ) : (
                        <div>
                          <div className="adm-table-cell-title">{d.courierName}</div>
                          <div className="adm-table-cell-sub">
                            {d.courierVehicle} {d.courierPhone && `• ${d.courierPhone}`}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="adm-font-bold">{d.distanceInKilometers.toFixed(1)} km</div>
                      <div className="adm-table-cell-sub">${d.deliveryFee.toFixed(2)} fee</div>
                    </td>
                    <td>
                      <span className="adm-pill-count">{d.estimatedMinutes} mins</span>
                    </td>
                    <td>{statusBadge(d.status)}</td>
                    <td className="adm-table-cell-sub">
                      <div>{new Date(d.requestedAt).toLocaleDateString()}</div>
                      <div>{new Date(d.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedDelivery(d)}
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
            totalItems={deliveries.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="deliveries"
            className="adm-pagination-bar"
          />
        </div>
      )}

      {/* DELIVERY DETAILS MODAL */}
      {selectedDelivery && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedDelivery(null)}>
          <div className="adm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div>
                <h3 className="adm-modal-title">Delivery #{selectedDelivery.id}</h3>
                <span className="adm-table-cell-sub">Order Reference: #{selectedDelivery.orderId}</span>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="adm-modal-close">×</button>
            </div>

            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div className="adm-detail-item">
                  <span className="adm-detail-label">Current Dispatch Status</span>
                  <div>{statusBadge(selectedDelivery.status)}</div>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Delivery Fee</span>
                  <span className="adm-detail-value adm-font-bold" style={{ fontSize: "16px" }}>
                    ${selectedDelivery.deliveryFee.toFixed(2)}
                  </span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Distance & Estimated ETA</span>
                  <span className="adm-detail-value">{selectedDelivery.distanceInKilometers.toFixed(1)} km (~{selectedDelivery.estimatedMinutes} mins)</span>
                </div>

                <div className="adm-detail-item">
                  <span className="adm-detail-label">Assigned Courier</span>
                  <span className="adm-detail-value">{selectedDelivery.courierName}</span>
                  <span className="adm-table-cell-sub">{selectedDelivery.courierVehicle} • {selectedDelivery.courierPhone || "No direct phone"}</span>
                </div>
              </div>

              <div className="adm-detail-block">
                <span className="adm-detail-label">Pickup Location (Restaurant)</span>
                <p className="adm-detail-text"><strong>{selectedDelivery.restaurantName}:</strong> {selectedDelivery.restaurantAddress || "Kitchen Location"}</p>
                {selectedDelivery.pickupLocation?.coordinates && (
                  <div className="adm-geo-link">
                    <span>GPS: {selectedDelivery.pickupLocation.coordinates[1]}, {selectedDelivery.pickupLocation.coordinates[0]}</span>
                  </div>
                )}
              </div>

              <div className="adm-detail-block">
                <span className="adm-detail-label">Drop-Off Destination (Customer)</span>
                {selectedDelivery.deliveryLocation?.coordinates && (
                  <div className="adm-geo-link">
                    <span>GPS: {selectedDelivery.deliveryLocation.coordinates[1]}, {selectedDelivery.deliveryLocation.coordinates[0]}</span>
                  </div>
                )}
              </div>

              <div className="adm-timeline-box">
                <span className="adm-detail-label">Lifecycle Timestamps</span>
                <div className="adm-timestamp-list">
                  <div><strong>Requested:</strong> {new Date(selectedDelivery.requestedAt).toLocaleString()}</div>
                  {selectedDelivery.assignedAt && (
                    <div><strong>Assigned:</strong> {new Date(selectedDelivery.assignedAt).toLocaleString()}</div>
                  )}
                  {selectedDelivery.acceptedAt && (
                    <div><strong>Accepted:</strong> {new Date(selectedDelivery.acceptedAt).toLocaleString()}</div>
                  )}
                  {selectedDelivery.completedAt && (
                    <div><strong>Completed:</strong> {new Date(selectedDelivery.completedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button onClick={() => setSelectedDelivery(null)} className="adm-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDeliveriesPage;

