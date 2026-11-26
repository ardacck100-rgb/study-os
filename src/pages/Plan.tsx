import { useState } from "react";
import { useStore } from "../store";
import { generatePlan } from "../planner";
import type { Difficulty, Subject } from "../types";
import { Card, Empty, PageHeader, SubjectTag } from "../ui";
import { DAY_SHORT, SUBJECT_COLORS, addDays, dayLabel, fmtMinutes, uid, ymd } from "../utils";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function Plan() {
  const { state, mutate } = useStore();
  const today = ymd();
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("agir");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [examDate, setExamDate] = useState("");
  const [showSettings, setShowSettings] = useState(state.plan.length === 0);
  const ps = state.planSettings;

  const addSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    mutate((s) => {
      s.subjects.push({
        id: uid(),
        name: n,
        difficulty,
        priority,
        examDate: examDate || undefined,
        color: SUBJECT_COLORS[s.subjects.length % SUBJECT_COLORS.length],
      });
    });
    setName("");
    setExamDate("");
  };

  const updateSubject = (id: string, patch: Partial<Subject>) =>
    mutate((s) => {
      const x = s.subjects.find((y) => y.id === id);
      if (x) Object.assign(x, patch);
    });

  const removeSubject = (id: string) => {
    if (!confirm("Bu ders ve plandaki gelecek blokları silinsin mi?")) return;
    mutate((s) => {
      s.subjects = s.subjects.filter((x) => x.id !== id);
      s.plan = s.plan.filter((b) => !(b.subjectId === id && b.date >= today && !b.done));
    });
  };

  const hasFuture = state.plan.some((b) => b.date >= today && !b.done);
  const build = () => {
    if (hasFuture && !confirm("Bugünden itibaren tamamlanmamış bloklar yeniden oluşturulacak. Devam edilsin mi?")) return;
    mutate((s) => {
      const keep = s.plan.filter((b) => b.date < today || b.done);
      const doneToday = new Set(keep.filter((b) => b.date === today).map((b) => b.start));
      const fresh = generatePlan(s.subjects, s.planSettings, today).filter(
        (b) => !(b.date === today && doneToday.has(b.start)),
      );
      s.plan = [...keep, ...fresh];
    });
    setShowSettings(false);
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const weeklyMin = ps.minutesByDay.reduce((a, b) => a + b, 0);

  return (
    <div className="stack">
      <PageHeader title="Plan" sub="Derslerini ekle, ne kadar vaktin olduğunu söyle; dengeli bir haftalık program çıkarayım." />

      <Card title={`Dersler (${state.subjects.length})`}>
        <form className="form-row" onSubmit={addSubject}>
          <input placeholder="Ders adı (ör. Matematik)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Ders adı" />
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} aria-label="Zorluk">
            <option value="agir">Ağır</option>
            <option value="hafif">Hafif</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)} aria-label="Öncelik">
            <option value={3}>Öncelik: Yüksek</option>
            <option value={2}>Öncelik: Orta</option>
            <option value={1}>Öncelik: Düşük</option>
          </select>
          <label className="inline-field">
            <span className="small muted">Sınav</span>
            <input type="date" value={examDate} min={today} onChange={(e) => setExamDate(e.target.value)} aria-label="Sınav tarihi" />
          </label>
          <button className="btn primary" type="submit">Ekle</button>
        </form>

        {state.subjects.length === 0 ? (
          <Empty>Henüz ders yok. Önce 2–5 ders ekle; ağır dersler (matematik, fizik) ile hafifleri (okuma, ezber) ayır.</Empty>
        ) : (
          <ul className="subjects">
            {state.subjects.map((s) => (
              <li key={s.id}>
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => updateSubject(s.id, { color: e.target.value })}
                  aria-label={`${s.name} rengi`}
                />
                <strong className="grow">{s.name}</strong>
                <select value={s.difficulty} onChange={(e) => updateSubject(s.id, { difficulty: e.target.value as Difficulty })} aria-label="Zorluk">
                  <option value="agir">Ağır</option>
                  <option value="hafif">Hafif</option>
                </select>
                <select value={s.priority} onChange={(e) => updateSubject(s.id, { priority: Number(e.target.value) as 1 | 2 | 3 })} aria-label="Öncelik">
                  <option value={3}>Yüksek</option>
                  <option value={2}>Orta</option>
                  <option value={1}>Düşük</option>
                </select>
                <input
                  type="date"
                  value={s.examDate ?? ""}
                  onChange={(e) => updateSubject(s.id, { examDate: e.target.value || undefined })}
                  aria-label="Sınav tarihi"
                />
                <button className="icon-btn" onClick={() => removeSubject(s.id)} aria-label={`${s.name} sil`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Zaman ayarları"
        action={
          <button className="link" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "Gizle" : `Haftada ${fmtMinutes(weeklyMin)} · Düzenle`}
          </button>
        }
      >
        {showSettings && (
          <div className="stack-sm">
            <div className="days-grid">
              {DAY_ORDER.map((d) => (
                <label key={d} className="day-field">
                  <span>{DAY_SHORT[d]}</span>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    step={10}
                    value={ps.minutesByDay[d]}
                    onChange={(e) => mutate((s) => { s.planSettings.minutesByDay[d] = Math.max(0, Number(e.target.value) || 0); })}
                  />
                  <span className="small muted">dk</span>
                </label>
              ))}
            </div>
            <div className="form-row">
              <label className="inline-field">
                <span className="small muted">Başlangıç</span>
                <input type="time" value={ps.startTime} onChange={(e) => mutate((s) => { s.planSettings.startTime = e.target.value || "17:00"; })} />
              </label>
              <label className="inline-field">
                <span className="small muted">Blok</span>
                <select value={ps.blockMin} onChange={(e) => mutate((s) => { s.planSettings.blockMin = Number(e.target.value); })}>
                  {[25, 30, 40, 45, 50, 60].map((n) => <option key={n} value={n}>{n} dk</option>)}
                </select>
              </label>
              <label className="inline-field">
                <span className="small muted">Mola</span>
                <select value={ps.breakMin} onChange={(e) => mutate((s) => { s.planSettings.breakMin = Number(e.target.value); })}>
                  {[5, 10, 15].map((n) => <option key={n} value={n}>{n} dk</option>)}
                </select>
              </label>
            </div>
            <p className="small muted">Her 3 blokta bir 20 dk uzun mola, 60 dk’dan uzun günlerde sona 20 dk tekrar bloğu eklenir.</p>
          </div>
        )}
        <button className="btn primary block" disabled={state.subjects.length === 0} onClick={build}>
          {hasFuture ? "Planı yeniden oluştur" : "7 günlük plan oluştur"}
        </button>
      </Card>

      {state.plan.some((b) => b.date >= today) && (
        <div className="week">
          {days.map((d) => {
            const list = state.plan.filter((b) => b.date === d).sort((a, b) => a.start.localeCompare(b.start));
            const done = list.filter((b) => b.done).length;
            return (
              <Card key={d} className="day" title={dayLabel(d)} action={list.length > 0 && <span className="small muted">{done}/{list.length}</span>}>
                {list.length === 0 ? (
                  <Empty>Boş gün 🌿</Empty>
                ) : (
                  <ul className="blocks">
                    {list.map((b) => (
                      <li key={b.id} className={b.done ? "done" : ""}>
                        <label>
                          <input
                            type="checkbox"
                            checked={b.done}
                            onChange={() => mutate((s) => { const x = s.plan.find((p) => p.id === b.id); if (x) x.done = !x.done; })}
                          />
                          <span className="time">{b.start}</span>
                          {b.kind === "tekrar" ? <span className="tag tag-review">Tekrar</span> : <SubjectTag id={b.subjectId} />}
                        </label>
                        {b.kind === "calisma" && (
                          <button
                            className={`chip ${b.hard ? "on" : ""}`}
                            title="Bu blokta zorlandım"
                            onClick={() => mutate((s) => { const x = s.plan.find((p) => p.id === b.id); if (x) x.hard = !x.hard; })}
                          >
                            {b.hard ? "Zorlandım" : "Zor mu?"}
                          </button>
                        )}
                        <button
                          className="icon-btn"
                          aria-label="Bloğu sil"
                          onClick={() => mutate((s) => { s.plan = s.plan.filter((p) => p.id !== b.id); })}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
