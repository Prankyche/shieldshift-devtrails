const BASE_URL = import.meta.env.VITE_ML_API_URL || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed with ${res.status}`);
  }
  return data;
}

export const mlApi = {
  checkFraud: (payload: Record<string, unknown>) =>
    request("/api/fraud/check", { method: "POST", body: JSON.stringify(payload) }),

  processPayout: (payload: { claim_id: string; amount: number }) =>
    request("/api/payout/process", { method: "POST", body: JSON.stringify(payload) }),

  getWorkerDashboard: (userId: string) =>
    request(`/api/dashboard/worker/${userId}`),

  getAdminDashboard: () => request("/api/dashboard/admin"),

  simulateEvent: (payload: Record<string, unknown>) =>
    request("/api/simulate/event", { method: "POST", body: JSON.stringify(payload) }),
};
