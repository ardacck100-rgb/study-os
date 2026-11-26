import { useMemo, useState } from "react";
import { useStore } from "../store";
import { BOX_INTERVALS, MASTERED_BOX, dueCards, parseCards, reviewCard } from "../logic";
import { Card, Empty, PageHeader, SubjectSelect, SubjectTag } from "../ui";
import { uid, ymd } from "../utils";

export function Review() {
  const { state, mutate } = useStore();
  const today = ymd();
  const [subject, setSubject] = useState<string | undefined>();
  const [session, setSession] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const [result, setResult] = useState({ right: 0, wrong: 0 });
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [newSubject, setNewSubject] = useState<string | undefined>();
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const due = useMemo(
    () => dueCards(state.cards, today).filter((c) => !subject || c.subjectId === subject),
    [state.cards, today, subject],
  );

  const start = () => {
    setSession(due.map((c) => c.id).sort(() => Math.random() - 0.5));
    setIdx(0);
    setShow(false);
    setResult({ right: 0, wrong: 0 });
  };

  const answer = (knew: boolean) => {
    if (!session) return;
    const id = session[idx];
    mutate((s) => {
      const i = s.cards.findIndex((c) => c.id === id);
      if (i >= 0) s.cards[i] = reviewCard(s.cards[i], knew, today);
    });
    setResult((r) => (knew ? { ...r, right: r.right + 1 } : { ...r, wrong: r.wrong + 1 }));
    // Bilinmeyen kartı oturumun sonuna tekrar ekle
    if (!knew) setSession((sess) => (sess ? [...sess, id] : sess));
    setIdx((i) => i + 1);
    setShow(false);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || !a.trim()) return;
    mutate((s) => {
      s.cards.push({ id: uid(), q: q.trim(), a: a.trim(), subjectId: newSubject, box: 0, due: today, right: 0, wrong: 0 });
    });
    setQ("");
    setA("");
  };

  const parsedBulk = parseCards(bulk);
  const addBulk = () => {
    mutate((s) => {
      for (const c of parsedBulk) s.cards.push({ id: uid(), ...c, subjectId: newSubject, box: 0, due: today, right: 0, wrong: 0 });
    });
    setBulk("");
    setShowBulk(false);
  };

  // ---- Oturum ekranı ----
  if (session) {
    const current = state.cards.find((c) => c.id === session[idx]);
    if (idx >= session.length || !current) {
      const total = result.right + result.wrong;
      return (
        <div className="stack">
          <PageHeader title="Tekrar bitti 🎉" />
          <Card>
            <div className="stats">
              <div className="stat"><span className="v">{result.right}</span><span className="k">bildin</span></div>
              <div className="stat"><span className="v">{result.wrong}</span><span className="k">tekrar edildi</span></div>
              <div className="stat"><span className="v">{total ? Math.round((result.right / total) * 100) : 0}%</span><span className="k">başarı</span></div>
            </div>
            <p className="muted">
              {result.wrong === 0
                ? "Harika! Bildiğin kartlar daha ileri bir tarihe ertelendi."
                : "Bilemediğin kartlar yarın tekrar karşına çıkacak. Bu normal; tekrar ettikçe yerleşir."}
            </p>
            <button className="btn primary" onClick={() => setSession(null)}>Tamam</button>
          </Card>
        </div>
      );
    }
    return (
      <div className="stack">
        <PageHeader title="Tekrar" sub={`${Math.min(idx + 1, session.length)} / ${session.length}`} />
        <div className="progress"><div style={{ width: `${(idx / session.length) * 100}%` }} /></div>
        <Card className="flash">
          <SubjectTag id={current.subjectId} />
          <p className="flash-q">{current.q}</p>
          {show ? (
            <>
              <hr />
              <p className="flash-a">{current.a}</p>
              <div className="flash-actions">
                <button className="btn danger" onClick={() => answer(false)}>✗ Bilemedim</button>
                <button className="btn success" onClick={() => answer(true)}>✓ Bildim</button>
              </div>
            </>
          ) : (
            <button className="btn primary block" onClick={() => setShow(true)}>Cevabı göster</button>
          )}
        </Card>
        <button className="link" onClick={() => setSession(null)}>Oturumu bitir</button>
      </div>
    );
  }

  // ---- Ana ekran ----
  const boxes = BOX_INTERVALS.map((_, i) => state.cards.filter((c) => c.box === i).length);
  return (
    <div className="stack">
      <PageHeader
        title="Tekrar"
        sub="Aralıklı tekrar: bildiğin kart 1 → 2 → 4 → 7 → 15 → 30 gün sonra tekrar gelir; bilemediğin kart başa döner."
      />

      <Card>
        <div className="review-hero">
          <div>
            <span className="big">{due.length}</span>
            <span className="muted"> kart bugün tekrar bekliyor</span>
          </div>
          <div className="form-row">
            <SubjectSelect value={subject} onChange={setSubject} emptyLabel="Tüm dersler" />
            <button className="btn primary" disabled={due.length === 0} onClick={start}>Tekrara başla</button>
          </div>
        </div>
        <div className="boxes" aria-label="Kutulara göre kart sayısı">
          {boxes.map((n, i) => (
            <div key={i} className={`box ${i >= MASTERED_BOX ? "mastered" : ""}`}>
              <span className="v">{n}</span>
              <span className="k">{i === 0 ? "Yeni" : `${BOX_INTERVALS[i - 1]}+ gün`}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Kart ekle" action={<button className="link" onClick={() => setShowBulk((v) => !v)}>{showBulk ? "Tekli ekle" : "Toplu yapıştır"}</button>}>
        {showBulk ? (
          <div className="stack-sm">
            <textarea
              rows={6}
              placeholder={"S: Türevin tanımı nedir?\nC: Anlık değişim oranı.\n\nS: sin x'in türevi?\nC: cos x"}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <div className="form-row">
              <SubjectSelect value={newSubject} onChange={setNewSubject} emptyLabel="Ders" />
              <button className="btn primary" disabled={!parsedBulk.length} onClick={addBulk}>
                {parsedBulk.length ? `${parsedBulk.length} kart ekle` : "Kart bulunamadı"}
              </button>
            </div>
          </div>
        ) : (
          <form className="form-row" onSubmit={add}>
            <input className="grow" placeholder="Soru" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Soru" />
            <input className="grow" placeholder="Cevap" value={a} onChange={(e) => setA(e.target.value)} aria-label="Cevap" />
            <SubjectSelect value={newSubject} onChange={setNewSubject} emptyLabel="Ders" />
            <button className="btn primary" type="submit">Ekle</button>
          </form>
        )}
        <p className="small muted hint">İpucu: Notlar bölümünde “Tekrar kartı üret” ile notlarından otomatik kart çıkarabilirsin.</p>
      </Card>

      <Card title={`Tüm kartlar (${state.cards.length})`}>
        {state.cards.length === 0 ? (
          <Empty>Henüz kart yok.</Empty>
        ) : (
          <ul className="list cards-list">
            {[...state.cards]
              .filter((c) => !subject || c.subjectId === subject)
              .sort((x, y) => x.due.localeCompare(y.due))
              .map((c) => (
                <li key={c.id}>
                  <div className="grow">
                    <div>{c.q}</div>
                    <div className="small muted">{c.a}</div>
                  </div>
                  <SubjectTag id={c.subjectId} />
                  <span className="small muted nowrap">{c.due <= today ? "Bugün" : c.due.split("-").reverse().slice(0, 2).join(".")}</span>
                  <button className="icon-btn" aria-label="Kartı sil" onClick={() => mutate((s) => { s.cards = s.cards.filter((x) => x.id !== c.id); })}>✕</button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
