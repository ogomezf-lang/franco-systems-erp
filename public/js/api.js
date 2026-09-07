// FRANCO SYSTEMS ERP v2 - cliente API y sesiÃ³n
const FrancoAPI = (() => {
  const ACCESS = "franco_access_token";
  const REFRESH = "franco_refresh_token";
  const USER = "franco_user";

  function getAccessToken() { return localStorage.getItem(ACCESS) || ""; }
  function getRefreshToken() { return localStorage.getItem(REFRESH) || ""; }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER) || "null"); } catch { return null; }
  }
  function setSession(data) {
    if (data.access_token) localStorage.setItem(ACCESS, data.access_token);
    if (data.refresh_token) localStorage.setItem(REFRESH, data.refresh_token);
    if (data.user) localStorage.setItem(USER, JSON.stringify(data.user));
  }
  function clearSession() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  }
  function isLogged() { return Boolean(getAccessToken()); }
  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {}
    clearSession();
    window.location.replace("/");
  }

  async function refreshSession() {
    const refresh = getRefreshToken();
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ refresh_token: refresh || "" }),
      });
      const data = await response.json();
      if (!response.ok || !data.access_token) return false;
      setSession(data);
      return true;
    } catch {
      return false;
    }
  }

  async function apiFetch(url, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers, credentials: "same-origin" });

    if (response.status === 401 && retry) {
      const renewed = await refreshSession();
      if (renewed) return apiFetch(url, options, false);
    }

    let data = null;
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      if (response.status === 401) clearSession();
      const error = new Error(data?.message || `Error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async function downloadAuthenticated(url, fallbackName = "archivo.pdf") {
    const token = getAccessToken();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: "same-origin" });
    if (response.status === 401) {
      const renewed = await refreshSession();
      if (renewed) return downloadAuthenticated(url, fallbackName);
    }
    if (!response.ok) {
      let msg = "No se pudo descargar el archivo.";
      try { msg = (await response.json()).message || msg; } catch {}
      throw new Error(msg);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    let filename = fallbackName;
    if (match?.[1]) {
      try { filename = decodeURIComponent(match[1]); } catch { filename = match[1]; }
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }

  function requireSession() {
    if (!isLogged()) {
      window.location.replace("/");
      return false;
    }
    return true;
  }

  function currency(value) {
    return Number(value || 0).toLocaleString("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    });
  }

  function date(value) {
    if (!value) return "-";
    const [y,m,d] = String(value).slice(0,10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : value;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  return {
    apiFetch, downloadAuthenticated, setSession, clearSession, getUser,
    getAccessToken, requireSession, logout, isLogged, currency, date, esc
  };
})();

