import type { OrderStatus } from "../../types/restaurant";

interface OrderStatusStepperProps {
  status: OrderStatus;
}

const STEPS = [
  { key: "Pending", label: "Pending", icon: "🕒", desc: "Awaiting approval" },
  { key: "Confirmed", label: "Confirmed", icon: "✓", desc: "Kitchen accepted" },
  { key: "Preparing", label: "Preparing", icon: "👨‍🍳", desc: "Chef cooking" },
  { key: "ReadyForPickup", label: "Ready", icon: "🚀", desc: "AI Courier Dispatched" },
];

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  if (status === "Cancelled" || status === "Failed") {
    return (
      <div className="rst-stepper-cancelled">
        <span style={{ fontSize: "18px" }}>❌</span>
        <div>
          <strong>Order Cancelled</strong>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--grey-600)" }}>
            This order has been cancelled or rejected.
          </p>
        </div>
      </div>
    );
  }

  if (status === "Delivered") {
    return (
      <div className="rst-stepper-delivered">
        <span style={{ fontSize: "18px" }}>🎉</span>
        <div>
          <strong>Order Delivered & Completed</strong>
          <p style={{ margin: 0, fontSize: "12px", color: "#166534" }}>
            The food was successfully delivered to the customer.
          </p>
        </div>
      </div>
    );
  }

  // Get index of current step
  const stepKeys = STEPS.map((s) => s.key);
  let currentIndex = stepKeys.indexOf(status);
  if (status === "PickedUp" || status === "OutForDelivery") {
    currentIndex = 3; // Ready and courier has it
  }

  return (
    <div className="rst-stepper">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div
            key={step.key}
            className={`rst-step ${
              isCompleted
                ? "rst-step--completed"
                : isCurrent
                ? "rst-step--current"
                : "rst-step--upcoming"
            }`}
          >
            <div className="rst-step-icon-wrapper">
              <span className="rst-step-icon">{isCompleted ? "✓" : step.icon}</span>
            </div>
            <div className="rst-step-info">
              <span className="rst-step-label">{step.label}</span>
              <span className="rst-step-desc">{step.desc}</span>
            </div>
            {idx < STEPS.length - 1 && <div className="rst-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default OrderStatusStepper;

