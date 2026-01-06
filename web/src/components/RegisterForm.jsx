import { useState } from "react";
import { api } from "../lib/api.jsx";

export default function RegisterForm({ onRegistered }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await api.register({ firstName, lastName, phone });
      onRegistered(data.sessionToken);
    } catch (e2) {
      setErr(e2.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h3>Kayıt</h3>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Ad"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          placeholder="Soyad"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          placeholder="Telefon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button disabled={loading} type="submit">
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>

        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
      </form>
    </div>
  );
}
