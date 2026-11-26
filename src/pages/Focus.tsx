import { useStore } from "../store";
import { useFocus } from "../focus";
import { Card, PageHeader, SubjectSelect, SubjectTag } from "../ui";
import { fmtMinutes, ymd } from "../utils";

const TIPS = [
  "Telefonu başka odaya koy ya da ekranı ters çevir.",
  "Başlamadan önce bu blokta bitireceğin tek şeyi yaz.",
  "Takıldığın soruyu işaretle, geç; bloğun sonunda dön.",
  "Molada ekrana değil, pencereye bak; su iç, biraz yürü.",
];

export function Focus() {
  const { state } = useStore();
  const f = useFocus();
  const today = ymd();
  const total = (f.phase === "calisma" ? f.workMin : f.breakMin) * 60;
  const pct = total ? 1 - f.remaining / total : 0;
  const mm = String(Math.floor(f.remaining / 60)).padStart(2, "0");
  const ss = String(f.remaining % 60).padStart(2, "0");
  const todaySessions = state.focus.filter((s) => s.date === today);
  const todayMin = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const R = 90;
  const C = 2 * Math.PI * R;

  return (
    <div className="stack">
      <PageHeader title="Odak" sub="Pomodoro: kısa ve net bloklar, ardından mola. Biten her çalışma bloğu ilerlemene eklenir." />

      <Card className={`timer-card ${f.phase}`}>
        <div className="timer-top">
          <span className={`phase-pill ${f.phase}`}>{f.phase === "calisma" ? "Çalışma" : "Mola"}</span>
          <SubjectSelect value={f.subjectId} onChange={f.setSubjectId} emptyLabel="Ders (isteğe bağlı)" />
        </div>
        <div className="ring">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r={R} className="ring-bg" />
            <circle cx="100" cy="100" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="ring-time" aria-live="polite">{mm}:{ss}</div>
        </div>
        <div className="timer-actions">
          {f.running ? (
            <button className="btn primary lg" onClick={f.pause}>Duraklat</button>
          ) : (
            <button className="btn primary lg" onClick={f.start}>{f.remaining < total ? "Devam et" : "Başlat"}</button>
          )}
          <button className="btn" onClick={f.reset}>Sıfırla</button>
          <button className="btn" onClick={f.skip}>{f.phase === "calisma" ? "Molaya geç" : "Molayı atla"}</button>
        </div>
        <div className="form-row center">
          <label className="inline-field">
            <span className="small muted">Çalışma</span>
            <select value={f.workMin} disabled={f.running} onChange={(e) => f.setWorkMin(Number(e.target.value))}>
              {[15, 25, 30, 40, 45, 50, 60].map((n) => <option key={n} value={n}>{n} dk</option>)}
            </select>
          </label>
          <label className="inline-field">
            <span className="small muted">Mola</span>
            <select value={f.breakMin} disabled={f.running} onChange={(e) => f.setBreakMin(Number(e.target.value))}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} dk</option>)}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Bugün">
          <p>
            <strong>{todaySessions.length}</strong> blok · <strong>{fmtMinutes(todayMin)}</strong> odak
          </p>
          <ul className="list">
            {todaySessions.slice(-6).reverse().map((s) => (
              <li key={s.id} className="row">
                <span className="small muted">{new Date(s.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="grow">{s.minutes} dk</span>
                <SubjectTag id={s.subjectId} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Odak ipuçları">
          <ul className="tips">
            {TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
