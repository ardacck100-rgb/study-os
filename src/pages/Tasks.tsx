import { useState } from "react";
import { useStore } from "../store";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "../logic";
import type { Priority } from "../types";
import { Card, Empty, PageHeader, SubjectSelect, SubjectTag } from "../ui";
import { uid, ymd } from "../utils";

type Filter = "acik" | "bugun" | "biten";

export function Tasks() {
  const { state, mutate } = useStore();
  const today = ymd();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("orta");
  const [due, setDue] = useState("");
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [filter, setFilter] = useState<Filter>("acik");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    mutate((s) => {
      s.tasks.push({ id: uid(), title: t, priority, due: due || undefined, subjectId, done: false, createdAt: Date.now() });
    });
    setTitle("");
    setDue("");
  };

  const toggle = (id: string) =>
    mutate((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : undefined;
    });

  const sorted = [...state.tasks].sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      a.createdAt - b.createdAt,
  );
  const list =
    filter === "biten"
      ? sorted.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
      : filter === "bugun"
        ? sorted.filter((t) => !t.done && t.due && t.due <= today)
        : sorted.filter((t) => !t.done);

  const openCount = state.tasks.filter((t) => !t.done).length;
  const doneCount = state.tasks.length - openCount;

  return (
    <div className="stack">
      <PageHeader title="Görevler" sub={`${openCount} açık · ${doneCount} tamamlandı. Önce yüksek öncelikliler ve tarihi yakın olanlar gelir.`} />

      <Card>
        <form className="form-row" onSubmit={add}>
          <input className="grow" placeholder="Ne yapılacak? (ör. Türev testi 20 soru)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Görev" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Öncelik">
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
          </select>
          <SubjectSelect value={subjectId} onChange={setSubjectId} emptyLabel="Ders" />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Son tarih" />
          <button className="btn primary" type="submit">Ekle</button>
        </form>
        <p className="small muted hint">
          İpucu: <strong>Yüksek</strong> = sınava/teslime etkisi büyük ve acil. Bir görev 1 saatten uzunsa onu küçük parçalara böl.
        </p>
      </Card>

      <div className="tabs" role="tablist">
        {([
          ["acik", "Açık"],
          ["bugun", "Bugün / gecikmiş"],
          ["biten", "Tamamlanan"],
        ] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <Empty>{filter === "biten" ? "Henüz tamamlanan görev yok." : "Burada görev yok. 🎉"}</Empty>
        ) : (
          <ul className="list tasks">
            {list.map((t) => (
              <li key={t.id} className={t.done ? "done" : ""}>
                <label className="row grow">
                  <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                  <span className={`dot p-${t.priority}`} title={PRIORITY_LABEL[t.priority]} />
                  <span className="grow">{t.title}</span>
                </label>
                <SubjectTag id={t.subjectId} />
                {t.due && (
                  <span className={`small ${!t.done && t.due < today ? "danger" : "muted"}`}>
                    {t.due === today ? "Bugün" : t.due.split("-").reverse().slice(0, 2).join(".")}
                  </span>
                )}
                <button className="icon-btn" aria-label="Görevi sil" onClick={() => mutate((s) => { s.tasks = s.tasks.filter((x) => x.id !== t.id); })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {filter === "biten" && doneCount > 0 && (
          <button className="link danger-link" onClick={() => mutate((s) => { s.tasks = s.tasks.filter((x) => !x.done); })}>
            Tamamlananları temizle
          </button>
        )}
      </Card>
    </div>
  );
}
