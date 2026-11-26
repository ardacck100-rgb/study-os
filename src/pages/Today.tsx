import { useStore } from "../store";
import { dueCards, nextStep, PRIORITY_ORDER, streak, upcomingExams, weakAreas, weekStats, type PageId } from "../logic";
import { Card, Empty, SubjectTag } from "../ui";
import { DAY_SHORT, fmtMinutes, parseYmd, ymd } from "../utils";

export function Today({ go }: { go: (p: PageId) => void }) {
  const { state, mutate } = useStore();
  const today = ymd();
  const step = nextStep(state, today);
  const blocks = state.plan.filter((b) => b.date === today).sort((a, b) => a.start.localeCompare(b.start));
  const tasks = state.tasks
    .filter((t) => !t.done)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due ?? "9").localeCompare(b.due ?? "9"))
    .slice(0, 3);
  const due = dueCards(state.cards, today).length;
  const st = weekStats(state, today);
  const weak = weakAreas(state);
  const exams = upcomingExams(state, today).slice(0, 3);
  const maxFocus = Math.max(30, ...st.focusByDay.map((d) => d.minutes));
  const doneToday = blocks.filter((b) => b.done).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="stack">
      <div className="page-h">
        <h1>
          {greet}
          {state.profile.name ? `, ${state.profile.name}` : ""} 👋
        </h1>
        <p className="muted">
          {blocks.length ? `Bugün ${blocks.length} blok var, ${doneToday} tanesi bitti.` : "Bugün için planlanmış blok yok."}
          {streak(state) > 1 && ` · 🔥 ${streak(state)} gündür çalışıyorsun`}
        </p>
      </div>

      <button className="next-step" onClick={() => go(step.page)}>
        <span className="label">Sonraki adım</span>
        <span className="text">{step.text}</span>
        <span className="arrow">→</span>
      </button>

      <div className="grid-2">
        <Card title="Bugünkü plan" action={<button className="link" onClick={() => go("plan")}>Plan →</button>}>
          {blocks.length === 0 ? (
            <Empty>Plan oluşturduğunda bugünkü blokların burada görünür.</Empty>
          ) : (
            <ul className="blocks">
              {blocks.map((b) => (
                <li key={b.id} className={b.done ? "done" : ""}>
                  <label>
                    <input
                      type="checkbox"
                      checked={b.done}
                      onChange={() => mutate((s) => {
                        const x = s.plan.find((p) => p.id === b.id);
                        if (x) x.done = !x.done;
                      })}
                    />
                    <span className="time">{b.start}</span>
                    {b.kind === "tekrar" ? <span className="tag tag-review">Tekrar</span> : <SubjectTag id={b.subjectId} />}
                    <span className="muted small">{b.minutes} dk</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Öncelikli görevler" action={<button className="link" onClick={() => go("gorevler")}>Tümü →</button>}>
          {tasks.length === 0 ? (
            <Empty>Açık görev yok. 🎉</Empty>
          ) : (
            <ul className="list">
              {tasks.map((t) => (
                <li key={t.id}>
                  <label className="row">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => mutate((s) => {
                        const x = s.tasks.find((p) => p.id === t.id);
                        if (x) {
                          x.done = true;
                          x.doneAt = Date.now();
                        }
                      })}
                    />
                    <span className={`dot p-${t.priority}`} />
                    <span className="grow">{t.title}</span>
                    {t.due && <span className={`small ${t.due < today ? "danger" : "muted"}`}>{t.due.slice(5).split("-").reverse().join(".")}</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="stats">
        <button className="stat" onClick={() => go("tekrar")}>
          <span className="v">{due}</span>
          <span className="k">tekrar bekleyen kart</span>
        </button>
        <div className="stat">
          <span className="v">{st.blocksTotal ? Math.round((st.blocksDone / st.blocksTotal) * 100) : 0}%</span>
          <span className="k">haftalık plan</span>
        </div>
        <div className="stat">
          <span className="v">{fmtMinutes(st.focusMinutes)}</span>
          <span className="k">bu hafta odak</span>
        </div>
        <div className="stat">
          <span className="v">{st.mastered}</span>
          <span className="k">öğrenilmiş kart</span>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Haftalık odak">
          <div className="bars" role="img" aria-label="Bu haftanın günlük odak dakikaları">
            {st.focusByDay.map((d) => (
              <div key={d.date} className={`bar ${d.date === today ? "today" : ""}`}>
                <span className="bar-v">{d.minutes || ""}</span>
                <div className="bar-fill" style={{ height: `${(d.minutes / maxFocus) * 100}%` }} />
                <span className="bar-k">{DAY_SHORT[parseYmd(d.date).getDay()]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Takip">
          {exams.length > 0 && (
            <>
              <h3 className="sub-h">Yaklaşan sınavlar</h3>
              <ul className="list">
                {exams.map((e) => (
                  <li key={e.subject.id} className="row">
                    <SubjectTag id={e.subject.id} />
                    <span className="grow" />
                    <strong className={e.days <= 3 ? "danger" : ""}>{e.days === 0 ? "Bugün" : `${e.days} gün`}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="sub-h">Zorlandığın alanlar</h3>
          {weak.length === 0 ? (
            <Empty>Henüz veri yok. Kart tekrarı yaptıkça ve blokları “zorlandım” diye işaretledikçe burada görünür.</Empty>
          ) : (
            <ul className="list">
              {weak.map((w) => (
                <li key={w.subject.id} className="row">
                  <SubjectTag id={w.subject.id} />
                  <span className="muted small grow">{w.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
