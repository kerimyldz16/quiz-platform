import { useState } from "react";
import { api } from "../lib/api.jsx";

export default function RegisterForm({ onRegistered }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickName, setNickName] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!privacyAccepted) {
      setErr("Gizlilik Politikasını kabul etmelisiniz.");
      return;
    }

    if (!phone || phone.length < 10) {
      setErr("Geçerli bir telefon numarası giriniz.");
      return;
    }

    if (!/^[0-9]+$/.test(phone)) {
      setErr("Telefon numarası yalnızca rakamlardan oluşmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({ firstName, lastName, nickName, phone });
      onRegistered(data.sessionToken);
    } catch (e2) {
      setErr(e2.message || "Kayıt sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-center">
      <div className="card register-card">
        <div className="register-header">
          <img
            src="/borusanNextlogo.jpeg"
            alt="Borusan NEXT Logo"
            className="register-logo"
          />
        </div>

        <h2 className="register-title">İletişim Bilgileri</h2>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Ad"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{ padding: "10px 12px" }}
          />
          <input
            placeholder="Soyad"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={{ padding: "10px 12px" }}
          />
          <input
            placeholder="Takma Ad"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
            style={{ padding: "10px 12px" }}
          />
          <input
            placeholder="Telefon"
            value={phone}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={11}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              setPhone(onlyDigits);
            }}
            style={{ padding: "10px 12px" }}
          />

          {/* Privacy Policy Checkbox */}
          <div className="privacy-checkbox-wrapper">
            <label className="privacy-checkbox-label">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="privacy-checkbox-input"
              />
              <span className="checkbox-text">
                Okudum onaylıyorum,{" "}
                <a
                  href="/borusan_next_arac_ihale_aydinlatma_metni.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policy-link"
                >
                  Gizlilik Politikası
                </a>
              </span>
            </label>
          </div>

          <button
            className="btn-primary"
            disabled={loading || !privacyAccepted}
            type="submit"
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "12px 16px",
            }}
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>

          {err ? (
            <div className="msg-error" style={{ marginTop: "8px" }}>
              {err}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
