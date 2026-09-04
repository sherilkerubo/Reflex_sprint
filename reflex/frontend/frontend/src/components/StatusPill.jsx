const STYLES = {
  CREATED: "bg-bg text-muted border-line",
  ASSIGNED: "bg-amber-soft text-amber border-amber/30",
  PICKED_UP: "bg-amber-soft text-amber border-amber/30",
  IN_TRANSIT: "bg-amber-soft text-amber border-amber/30",
  DELIVERED: "bg-teal-soft text-teal border-teal/30",
  CANCELLED: "bg-red-soft text-red border-red/30",
};

const LABELS = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STYLES[status] || STYLES.CREATED
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
