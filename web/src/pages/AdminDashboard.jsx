import { useEffect, useState } from "react";
import { api } from "../lib/api.jsx";
import { storage } from "../lib/storage.jsx";

function fmtMs(ms) {
  if (ms == null) return "";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}.${String(seconds).padStart(2, "0")}.${String(
    centis
  ).padStart(2, "0")}dk`;
}

export default function AdminDashboard() {
  const [jwt, setJwt] = useState(storage.getAdminJwt());
  const [login, setLogin] = useState({
    username: "admin",
    password: "change_me",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [top3, setTop3] = useState([]);

  // Users / Questions alanları (backend gelince çalışacak)
  const [usersJson, setUsersJson] = useState("");
  const [questionsJson, setQuestionsJson] = useState("");

  async function doLogin(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await api.adminLogin(login);
      storage.setAdminJwt(data.token);
      setJwt(data.token);
      setMsg("Login OK");
    } catch (e2) {
      setErr(e2.message || "Login failed");
    }
  }

  function logout() {
    storage.clearAdminJwt();
    setJwt("");
    setTop3([]);
    setMsg("Logged out");
    setErr("");
  }

  async function startGame() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminStart();
      setMsg(`Game started. startAt=${data.startAt}`);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function endGame() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminEnd();
      setMsg("Game ended. DB persist done.");
      // bazı backend sürümlerinde end response top3 döndürüyor; varsa kullan
      if (data?.top3) setTop3(data.top3);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function refreshTop3() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminTop3();
      setTop3(data.top3 || []);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  // DB users (backend sonraki aşama)
  async function fetchUsers() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminUsers();
      setUsersJson(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function deleteAllUsers() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminUsersDeleteAll();
      setMsg("All users deleted");
      setUsersJson(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2.message);
    }
  }

  // questions crud (backend sonraki aşama)
  async function listQuestions() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminQuestionsList();
      setQuestionsJson(JSON.stringify(data, null, 2));
    } catch (e2) {
      setErr(e2.message);
    }
  }

  useEffect(() => {
    if (!jwt) return;
    refreshTop3().catch(() => {});
  }, [jwt]);

  if (!jwt) {
    return (
      <div style={{ maxWidth: 420 }}>
        <h3>Admin Login</h3>
        <form onSubmit={doLogin} style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Username"
            value={login.username}
            onChange={(e) =>
              setLogin((s) => ({ ...s, username: e.target.value }))
            }
          />
          <input
            placeholder="Password"
            type="password"
            value={login.password}
            onChange={(e) =>
              setLogin((s) => ({ ...s, password: e.target.value }))
            }
          />
          <button type="submit">Login</button>
          {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
          {msg ? <div style={{ color: "green" }}>{msg}</div> : null}
        </form>
      </div>
    );
  }

  return (
    <div>
      <h3>Admin Dashboard</h3>

      <div style={{ marginBottom: 12 }}>
        <button onClick={logout}>Logout</button>
      </div>

      {err ? (
        <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>
      ) : null}
      {msg ? (
        <div style={{ color: "green", marginBottom: 8 }}>{msg}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 1fr",
          gap: 16,
        }}
      >
        {/* Sol: kontrol butonları */}
        <div>
          <h4>Oyun Kontrol</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={startGame}>Oyunu Başlat</button>
            <button onClick={endGame}>Oyunu Bitir</button>
            <button onClick={refreshTop3}>Top3 Yenile</button>

            <hr />

            <h4>DB Kullanıcı İşlemleri</h4>
            <button onClick={fetchUsers}>Kullanıcı Verilerini Çek</button>
            <button onClick={deleteAllUsers}>Tüm Kullanıcıları Sil</button>
            <small>
              Not: Bu iki buton backend’de bir sonraki aşamada eklenecek.
            </small>
          </div>
        </div>

        {/* Orta: Top 3 */}
        <div>
          <h4>Top 3 (Tümü Doğru + En Hızlı)</h4>
          <table
            border="1"
            cellPadding="8"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Süre</th>
              </tr>
            </thead>
            <tbody>
              {top3.length ? (
                top3.map((x) => (
                  <tr key={x.rank}>
                    <td>{x.rank}</td>
                    <td>{`${x.firstName ?? ""} ${x.lastName ?? ""}`.trim()}</td>
                    <td>{x.phone ?? ""}</td>
                    <td>{x.durationText || fmtMs(x.durationMs)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Henüz veri yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sağ: Sorular CRUD placeholder */}
        <div>
          <h4>Sorular & Cevaplar (CRUD)</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={listQuestions}>Soruları Listele</button>
            <small>
              Not: CRUD endpoint’leri backend’de bir sonraki aşamada eklenecek.
            </small>
            <textarea
              rows={18}
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              placeholder="Questions JSON burada görünecek..."
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Users JSON</h4>
        <textarea
          rows={10}
          value={usersJson}
          onChange={(e) => setUsersJson(e.target.value)}
          placeholder="Users JSON burada görünecek..."
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
