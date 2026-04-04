
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// ─── Token helpers ───────────────────────────────────────────────
export const getAccessToken = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// ─── Core fetch wrapper ──────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (newToken: string) => {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
};

export const apiFetch = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push(async (newToken) => {
          headers["Authorization"] = `Bearer ${newToken}`;
          resolve(await fetch(`${BASE_URL}${path}`, { ...options, headers }));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });

      if (!refreshRes.ok) {
        clearTokens();
        window.location.href = "/login";
        throw new Error("Session expired");
      }

      const { data } = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      processQueue(data.accessToken);

      headers["Authorization"] = `Bearer ${data.accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } finally {
      isRefreshing = false;
    }
  }

  return res;
};

// ─── Auth API ────────────────────────────────────────────────────
export const authAPI = {
  register: async (payload: {
    full_name: string;
    phone: string;
    password: string;
    city: string;
    work_type: string;
    experience: string;
    avg_daily_earnings: number;
  }) => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  login: async (payload: { phone: string; password: string }) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    clearTokens();
  },

  me: async () => {
    const res = await apiFetch("/api/auth/me");
    return res.json();
  },
};