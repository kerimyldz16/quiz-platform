import { useEffect, useMemo, useState } from "react";
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
  ).padStart(2, "0")}sn`;
}

function safeJson(val) {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

export default function AdminDashboard() {
  const [jwt, setJwt] = useState(storage.getAdminJwt());
  const [login, setLogin] = useState({
    username: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [top3, setTop3] = useState([]);

  // USERS (Solution A: count-only)
  const [usersCount, setUsersCount] = useState(null);

  // QUESTIONS
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId) || null,
    [questions, selectedId]
  );

  const [qForm, setQForm] = useState({
    text: "",
    optionsText: '["A","B","C","D"]',
    correct: "",
    orderIndex: 1,
  });

  useEffect(() => {
    if (!selected) return;
    setQForm({
      text: selected.text || "",
      optionsText: safeJson(selected.options || []),
      correct: selected.correct || "",
      orderIndex: selected.order_index ?? selected.orderIndex ?? 1,
    });
  }, [selectedId]); // eslint-disable-line

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
    setUsersCount(null);
    setQuestions([]);
    setSelectedId(null);
    setMsg("Logged out");
    setErr("");
  }

  async function startGame() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminStart();
      setMsg(
        `Game started. startAt=${data.startAt}, totalQuestions=${data.totalQuestions}`
      );
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

  // Solution A: Only fetch count (do NOT render/keep full list)
  async function fetchUsers() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminUsers(); // backend should return { count }
      const count = Number.isFinite(Number(data?.count))
        ? Number(data.count)
        : null;

      setUsersCount(count);
      setMsg(
        count == null ? "Kullanıcılar çekildi." : `Toplam kullanıcı: ${count}`
      );
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function deleteAllUsers() {
    setErr("");
    setMsg("");
    if (!confirm("Tüm kullanıcılar silinecek. Emin misin?")) return;
    try {
      await api.adminUsersDeleteAll();
      setUsersCount(0);
      setMsg("All users deleted");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function downloadUsersCsv() {
    const token = storage.getAdminJwt();
    const url = `${import.meta.env.VITE_API_BASE}/admin/users.csv`;

    fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`CSV download failed (${r.status})`);
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "users.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((e) => setErr(e.message));
  }

  async function listQuestions() {
    setErr("");
    setMsg("");
    try {
      const data = await api.adminQuestionsList();
      const qs = data.questions || [];
      setQuestions(qs);
      setSelectedId(qs[0]?.id ?? null);
      setMsg(`Questions fetched: ${qs.length}`);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function parseOptions() {
    let options;
    try {
      options = JSON.parse(qForm.optionsText);
    } catch {
      throw new Error('Options JSON geçersiz. Örn: ["A","B","C"]');
    }
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error("Options array en az 2 eleman olmalı.");
    }
    return options.map(String);
  }

  async function createQuestion() {
    setErr("");
    setMsg("");
    try {
      const options = parseOptions();
      if (!qForm.correct) throw new Error("Correct boş olamaz.");
      if (!options.includes(String(qForm.correct)))
        throw new Error("Correct, options içinde olmalı.");

      const payload = {
        text: qForm.text,
        options,
        correct: String(qForm.correct),
        orderIndex: Number(qForm.orderIndex),
      };

      const data = await api.adminQuestionsCreate(payload);
      setMsg(`Question created. id=${data.id}`);
      await listQuestions();
      setSelectedId(data.id);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function updateQuestion() {
    setErr("");
    setMsg("");
    if (!selectedId) return setErr("Seçili soru yok.");
    try {
      const options = parseOptions();
      if (!qForm.correct) throw new Error("Correct boş olamaz.");
      if (!options.includes(String(qForm.correct)))
        throw new Error("Correct, options içinde olmalı.");

      const payload = {
        text: qForm.text,
        options,
        correct: String(qForm.correct),
        orderIndex: Number(qForm.orderIndex),
      };

      await api.adminQuestionsUpdate(selectedId, payload);
      setMsg("Question updated");
      await listQuestions();
      setSelectedId(selectedId);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function deleteQuestion() {
    setErr("");
    setMsg("");
    if (!selectedId) return setErr("Seçili soru yok.");
    if (!confirm("Bu soru silinecek. Emin misin?")) return;
    try {
      await api.adminQuestionsDelete(selectedId);
      setMsg("Question deleted");
      setSelectedId(null);
      await listQuestions();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  useEffect(() => {
    if (!jwt) return;
    refreshTop3().catch(() => {});
    listQuestions().catch(() => {});
  }, [jwt]); // eslint-disable-line

  if (!jwt) {
    return (
      <div className="card" style={{ maxWidth: 440 }}>
        <h3>Admin Login</h3>
        <form onSubmit={doLogin} style={{ display: "grid", gap: 12 }}>
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
          <button
            className="btn-primary"
            type="submit"
            style={{ width: "100%" }}
          >
            Oturum Aç
          </button>
          {err ? <div className="msg-error">{err}</div> : null}
          {msg ? <div className="msg-success">{msg}</div> : null}
        </form>
      </div>
    );
  }

  return (
    <div>
      <h3>Admin Dashboard</h3>

      <div className="logout-btn">
        <button className="btn-ghost" onClick={logout}>
          Oturumu Kapat
        </button>
      </div>

      {err ? <div className="msg-error">{err}</div> : null}
      {msg ? <div className="msg-success">{msg}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 1fr",
          gap: 24,
        }}
      >
        {/* LEFT */}
        <div>
          <h4>Kontroller</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn-primary" onClick={startGame}>
              Oyunu Başlat
            </button>
            <button className="btn-primary" onClick={endGame}>
              Oyunu Bitir
            </button>
            <button className="btn-primary" onClick={refreshTop3}>
              Top3 Yenile
            </button>

            <hr />

            <h4>Kullanıcılar</h4>
            <button className="btn-ghost" onClick={fetchUsers}>
              Kullanıcı Verilerini Çek (Count)
            </button>
            <button className="btn-ghost" onClick={deleteAllUsers}>
              Tüm Kullanıcıları Sil
            </button>
            <button className="btn-ghost" onClick={downloadUsersCsv}>
              CSV indir
            </button>

            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12 }} className="muted">
                Toplam kullanıcı
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {usersCount == null ? "—" : usersCount}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE */}
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

          <hr style={{ margin: "16px 0" }} />
        </div>

        {/* RIGHT */}
        <div>
          <h4>Sorular (CRUD)</h4>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn-ghost" onClick={listQuestions}>
              Soruları Yenile
            </button>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {/* LIST */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <b>Liste</b>
              </div>
              <select
                size={12}
                style={{ width: "100%" }}
                value={selectedId ?? ""}
                onChange={(e) =>
                  setSelectedId(e.target.value ? Number(e.target.value) : null)
                }
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    #{q.order_index} — {q.text?.slice(0, 60)}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn-ghost"
                  onClick={deleteQuestion}
                  disabled={!selectedId}
                >
                  Sil
                </button>
              </div>
            </div>

            {/* FORM */}
            <div>
              <div style={{ marginBottom: 6 }}>
                <b>{selectedId ? "Düzenle" : "Yeni soru"}</b>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <input
                  placeholder="Soru metni"
                  value={qForm.text}
                  onChange={(e) =>
                    setQForm((s) => ({ ...s, text: e.target.value }))
                  }
                />

                <input
                  placeholder="orderIndex (1..n)"
                  value={qForm.orderIndex}
                  onChange={(e) =>
                    setQForm((s) => ({ ...s, orderIndex: e.target.value }))
                  }
                />

                <textarea
                  rows={6}
                  placeholder='Options JSON (örn: ["A","B","C"])'
                  value={qForm.optionsText}
                  onChange={(e) =>
                    setQForm((s) => ({ ...s, optionsText: e.target.value }))
                  }
                />

                <input
                  placeholder="Correct (options içinden bir değer)"
                  value={qForm.correct}
                  onChange={(e) =>
                    setQForm((s) => ({ ...s, correct: e.target.value }))
                  }
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={createQuestion}>
                    Ekle
                  </button>
                  <button
                    className="btn-primary"
                    onClick={updateQuestion}
                    disabled={!selectedId}
                  >
                    Güncelle
                  </button>
                </div>

                <small>
                  Not: RUNNING state’te soru CRUD backend tarafından engellenir.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
