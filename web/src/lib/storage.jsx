const KEY_SESSION = "sessionToken";
const KEY_ADMIN = "adminJwt";

export const storage = {
  getSessionToken() {
    return localStorage.getItem(KEY_SESSION) || "";
  },
  setSessionToken(token) {
    localStorage.setItem(KEY_SESSION, token);
  },
  clearSessionToken() {
    localStorage.removeItem(KEY_SESSION);
  },

  getAdminJwt() {
    return localStorage.getItem(KEY_ADMIN) || "";
  },
  setAdminJwt(token) {
    localStorage.setItem(KEY_ADMIN, token);
  },
  clearAdminJwt() {
    localStorage.removeItem(KEY_ADMIN);
  },
};
