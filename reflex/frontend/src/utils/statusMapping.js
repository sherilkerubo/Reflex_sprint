// src/utils/statusMapping.js

export const backendToFrontend = {
  "CREATED": "Requested",
  "ASSIGNED": "Assigned",
  "PICKED_UP": "Picked Up",
  "IN_TRANSIT": "In Transit",
  "DELIVERED": "Delivered",
  "CANCELLED": "Cancelled"
};

export const frontendToBackend = {
  "Requested": "CREATED",
  "Assigned": "ASSIGNED",
  "Picked Up": "PICKED_UP",
  "In Transit": "IN_TRANSIT",
  "Delivered": "DELIVERED",
  "Cancelled": "CANCELLED"
};

export const RIDER_STATUSES = ["PICKED_UP", "IN_TRANSIT", "CANCELLED"];

export const STATUS_FLOW = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

export const STATUS_COLORS = {
  "CREATED": { bg: "#E7E2D4", fg: "#6B6459" },
  "ASSIGNED": { bg: "#F5E6C8", fg: "#C9852B" },
  "PICKED_UP": { bg: "#DCE6EF", fg: "#2F5A85" },
  "IN_TRANSIT": { bg: "#DCE6EF", fg: "#2F5A85" },
  "DELIVERED": { bg: "#DCEADD", fg: "#3C7A4E" },
  "CANCELLED": { bg: "#F5E6E6", fg: "#C93B2B" }
};
