import { storage } from "./storage.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;

async function http(path, { method = "GET", body, admin = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) {
    const jwt = storage.getAdminJwt();
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  register(payload) {
    return http("/kayit", { method: "POST", body: payload });
  },

  adminLogin(payload) {
    return http("/admin/login", { method: "POST", body: payload });
  },
  adminStart() {
    return http("/admin/start", { method: "POST", admin: true });
  },
  adminEnd() {
    return http("/admin/end", { method: "POST", admin: true });
  },
  adminTop3() {
    return http("/admin/top3", { method: "GET", admin: true });
  },

  // Aşağıdakiler backend’de bir sonraki aşamada eklenecek:
  adminUsers() {
    return http("/admin/users", { method: "GET", admin: true });
  },
  adminUsersDeleteAll() {
    return http("/admin/users", { method: "DELETE", admin: true });
  },
  adminQuestionsList() {
    return http("/admin/questions", { method: "GET", admin: true });
  },
  adminQuestionsCreate(payload) {
    return http("/admin/questions", {
      method: "POST",
      body: payload,
      admin: true,
    });
  },
  adminQuestionsUpdate(id, payload) {
    return http(`/admin/questions/${id}`, {
      method: "PUT",
      body: payload,
      admin: true,
    });
  },
  adminQuestionsDelete(id) {
    return http(`/admin/questions/${id}`, { method: "DELETE", admin: true });
  },
};
