import type { DeliveryRequestStatus } from "../../types/delivery";

interface DeliveryStatusStepperProps {
  status: DeliveryRequestStatus;
  compact?: boolean;
}

interface StepDef {
  key: DeliveryRequestStatus;
  label: string;
  icon: string;
  desc: string;
}

const DELIVERY_STEPS: StepDef[] = [
  { key: "Assigned", label: "Assigned", icon: "⚡", desc: "Dispatched to you" },
  { key: "Accepted", label: "Accepted", icon: "✓", desc: "En route to kitchen" },
  { key: "PickedUp", label: "Picked Up", icon: "📦", desc: "Food received" },
  { key: "InTransit", label: "In Transit", icon: "🚀", desc: "Delivering to customer" },
  { key: "Delivered", label: "Delivered", icon: "🎉", desc: "Completed & paid" },
];

export function DeliveryStatusStepper({
  status,
  compact = false,
}: DeliveryStatusStepperProps) {
  // Handle cancelled or failed states
  if (status === "Cancelled" || status === "Failed") {
    return (
      <div className="dss-stepper-terminal dss-stepper-terminal--cancelled">
        <span className="dss-terminal-icon">❌</span>
        <div>
          <strong>Delivery Cancelled</strong>
          <p>This delivery request has been cancelled or terminated.</p>
        </div>
      </div>
    );
  }

  // Calculate current active step index (0 to 4)
  const stepKeys = DELIVERY_STEPS.map((s) => s.key);
  let currentIndex = stepKeys.indexOf(status);

  // If status is Searching or Pending before assignment, treat as step 0 upcoming
  if (currentIndex === -1) {
    if (status === "Pending" || status === "Searching") {
      currentIndex = 0;
    } else {
      currentIndex = 0;
    }
  }

  const isAllDelivered = status === "Delivered";

  return (
    <div className={`dss-stepper-container ${compact ? "dss-stepper-compact" : ""}`}>
      <div className="dss-stepper">
        {DELIVERY_STEPS.map((step, idx) => {
          const isCompleted = isAllDelivered || idx < currentIndex;
          const isCurrent = !isAllDelivered && idx === currentIndex;

          return (
            <div
              key={step.key}
              className={`dss-step ${
                isCompleted
                  ? "dss-step--completed"
                  : isCurrent
                  ? "dss-step--current"
                  : "dss-step--upcoming"
              }`}
            >
              {/* Node Circle */}
              <div className="dss-step-node">
                {isCompleted ? (
                  <span className="dss-node-icon">✓</span>
                ) : (
                  <span className="dss-node-icon">{step.icon}</span>
                )}
                <span className="dss-node-num">{idx + 1}</span>
              </div>

              {/* Step Info */}
              <div className="dss-step-meta">
                <span className="dss-step-label">{step.label}</span>
                {!compact && (
                  <span className="dss-step-desc">{step.desc}</span>
                )}
              </div>

              {/* Connecting Line to next step */}
              {idx < DELIVERY_STEPS.length - 1 && (
                <div
                  className={`dss-step-line ${
                    isAllDelivered || idx < currentIndex ? "dss-line--filled" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DeliveryStatusStepper;
