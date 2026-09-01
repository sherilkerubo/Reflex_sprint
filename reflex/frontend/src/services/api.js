// src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  "Authorization": Bearer 
});

// ---------- AUTH ----------
export const login = async (phone, password) => {
  const response = await fetch(${API_URL}/auth/login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }
  return response.json();
};

export const register = async (name, phone, role, password) => {
  const response = await fetch(${API_URL}/auth/register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, role, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }
  return response.json();
};

// ---------- DELIVERIES ----------
export const createDelivery = async (token, deliveryData) => {
  const response = await fetch(${API_URL}/deliveries, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      customerName: deliveryData.customerName,
      customerPhone: deliveryData.customerPhone,
      deliveryAddress: deliveryData.deliveryAddress,
      itemDescription: deliveryData.itemDescription
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create delivery");
  }
  return response.json();
};

export const getDeliveries = async (token, filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(${API_URL}/deliveries?, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch deliveries");
  }
  return response.json();
};

export const getDelivery = async (token, id) => {
  const response = await fetch(${API_URL}/deliveries/, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch delivery");
  }
  return response.json();
};

export const assignRider = async (token, deliveryId, riderId) => {
  const response = await fetch(${API_URL}/deliveries//assign, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ riderId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to assign rider");
  }
  return response.json();
};

export const updateDeliveryStatus = async (token, deliveryId, status) => {
  const response = await fetch(${API_URL}/deliveries//status, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update status");
  }
  return response.json();
};

export const verifyDelivery = async (token, deliveryId, releaseCode) => {
  const response = await fetch(${API_URL}/deliveries//verify, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ releaseCode })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Verification failed");
  }
  return response.json();
};

export const getRiders = async (token) => {
  const response = await fetch(${API_URL}/auth/riders, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch riders");
  }
  return response.json();
};

export const sendLocation = async (token, deliveryId, latitude, longitude) => {
  const response = await fetch(${API_URL}/deliveries//location, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ latitude, longitude })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send location");
  }
  return response.json();
};
