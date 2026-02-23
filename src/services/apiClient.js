const DEFAULT_BASE_URL =
  "https://bandidos-backend-production.up.railway.app";

const TOKEN_KEY = "bandidos_token";

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function buildUrl(path, params) {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    DEFAULT_BASE_URL;
  const url = new URL(path, baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function handleResponse(res) {
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      payload?.message || payload?.error || res.statusText || "Error";
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function publicRequest(path, { method = "GET", body, params } = {}) {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse(res);
}

export async function apiRequest(
  path,
  { method = "GET", body, params, token: tokenOverride } = {}
) {
  const url = buildUrl(path, params);
  const token = tokenOverride || getStoredToken();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && unauthorizedHandler) {
    const latestToken = getStoredToken();
    if (token && latestToken && token === latestToken) {
      unauthorizedHandler();
    }
  }

  return handleResponse(res);
}
