import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { buildContext, parseCards } from "../logic";
import { runTask } from "../ai";
import { Markdown } from "../Markdown";
import { Card, Empty, PageHeader, SubjectSelect, SubjectTag } from "../ui";
import { uid, ymd } from "../utils";

type AiMode = "duzenle" | "ozet" | "kart";

const PROMPTS: Record<AiMode, string> = {
  duzenle:
    "Aşağıdaki dağınık notu düzenle: başlıklar oluştur, madde madde yaz, tekrarları sil, önemli yerleri **kalın** yap, en sona kısa bir özet ekle. Sadece düzenlenmiş notu yaz, giriş cümlesi ekleme.",
  ozet:
    "Aşağıdaki not için tekrar paketi hazırla: 5–10 maddelik kısa özet, ardından 5 kısa soru-cevap, ardından cevap anahtarlı 5 soruluk mini test.",
  kart:
    "Aşağıdaki nottan 6–12 adet tekrar kartı üret. Her kart tam olarak iki satır olsun:\nS: <kısa soru>\nC: <kısa cevap>\nKartlar arasında boş satır bırak. Başka hiçbir şey yazma.",
};

export function Notes() {
  const { state, mutate } = useStore();
  const [selected, setSelected] = useState<string | null>(state.notes[0]?.id ?? null);
  const [filter, setFilter] = useState<string | undefined>();
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [aiText, setAiText] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const note = state.notes.find((n) => n.id === selected) ?? null;
  const list = state.notes
    .filter((n) => !filter || n.subjectId === filter)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    abortRef.current?.abort();
    setAiMode(null);
    setAiText("");
    setBusy(false);
  }, [selected]);

  const create = () => {
    const id = uid();
    mutate((s) => {
      s.notes.push({ id, title: "", body: "", subjectId: filter, updatedAt: Date.now() });
    });
    setSelected(id);
  };

  const update = (patch: { title?: string; body?: string; subjectId?: string }) =>
    mutate((s) => {
      const n = s.notes.find((x) => x.id === selected);
      if (n) Object.assign(n, patch, { updatedAt: Date.now() });
    });

  const runAi = async (mode: AiMode) => {
    if (!note || !note.body.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAiMode(mode);
    setAiText("");
    setBusy(true);
    try {
      await runTask(`${PROMPTS[mode]}\n\n---\nBaşlık: ${note.title || "(başlıksız)"}\n\n${note.body}`, buildContext(state), setAiText, ctrl.signal);
    } catch {
      /* iptal edildi */
    } finally {
      if (abortRef.current === ctrl) setBusy(false);
    }
  };

  const parsedCards = aiMode === "kart" ? parseCards(aiText) : [];

  const addCards = () => {
    const today = ymd();
    mutate((s) => {
      for (const c of parsedCards) {
        s.cards.push({ id: uid(), q: c.q, a: c.a, subjectId: note?.subjectId, box: 0, due: today, right: 0, wrong: 0 });
      }
    });
    setAiMode(null);
    setAiText("");
    alert(`${parsedCards.length} kart Tekrar bölümüne eklendi.`);
  };

  return (
    <div className="stack">
      <PageHeader title="Notlar" sub="Dağınık yaz, Study-OS düzenlesin. Notlarından tek tıkla özet ve tekrar kartı çıkar." />
      <div className="notes-layout">
        <Card className="notes-list" title="Notlarım" action={<button className="btn primary sm" onClick={create}>+ Yeni</button>}>
          <SubjectSelect value={filter} onChange={setFilter} emptyLabel="Tüm dersler" />
          {list.length === 0 ? (
            <Empty>Henüz not yok.</Empty>
          ) : (
            <ul className="note-items">
              {list.map((n) => (
                <li key={n.id}>
                  <button className={n.id === selected ? "on" : ""} onClick={() => setSelected(n.id)}>
                    <strong>{n.title || "Başlıksız not"}</strong>
                    <span className="small muted clamp">{n.body.slice(0, 80) || "Boş"}</span>
                    <SubjectTag id={n.subjectId} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="stack">
          {!note ? (
            <Card>
              <Empty>Bir not seç ya da “+ Yeni” ile başla.</Empty>
            </Card>
          ) : (
            <Card>
              <div className="form-row">
                <input className="grow title-input" placeholder="Başlık" value={note.title} onChange={(e) => update({ title: e.target.value })} />
                <SubjectSelect value={note.subjectId} onChange={(v) => update({ subjectId: v })} emptyLabel="Ders" />
                <button
                  className="icon-btn"
                  aria-label="Notu sil"
                  onClick={() => {
                    if (!confirm("Not silinsin mi?")) return;
                    mutate((s) => { s.notes = s.notes.filter((x) => x.id !== note.id); });
                    setSelected(null);
                  }}
                >
                  🗑
                </button>
              </div>
              <textarea
                className="note-body"
                placeholder="Notlarını buraya yaz ya da yapıştır…"
                value={note.body}
                onChange={(e) => update({ body: e.target.value })}
              />
              <div className="ai-actions">
                <button className="btn" disabled={busy || !note.body.trim()} onClick={() => runAi("duzenle")}>✨ Notu düzenle</button>
                <button className="btn" disabled={busy || !note.body.trim()} onClick={() => runAi("ozet")}>📋 Özet + mini test</button>
                <button className="btn" disabled={busy || !note.body.trim()} onClick={() => runAi("kart")}>🃏 Tekrar kartı üret</button>
              </div>
            </Card>
          )}

          {note && aiMode && (
            <Card
              title={aiMode === "duzenle" ? "Düzenlenmiş not" : aiMode === "ozet" ? "Tekrar paketi" : "Kart önerileri"}
              action={busy ? <span className="small muted pulse">Yazıyor…</span> : <button className="link" onClick={() => setAiMode(null)}>Kapat</button>}
            >
              {aiMode === "kart" && parsedCards.length > 0 ? (
                <ul className="list">
                  {parsedCards.map((c, i) => (
                    <li key={i} className="qa">
                      <strong>S:</strong> {c.q}
                      <br />
                      <span className="muted"><strong>C:</strong> {c.a}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Markdown text={aiText || "…"} />
              )}
              {!busy && aiText && (
                <div className="ai-actions">
                  {aiMode === "duzenle" && !aiText.startsWith("⚠️") && (
                    <button className="btn primary" onClick={() => { update({ body: aiText.trim() }); setAiMode(null); }}>
                      Notu bununla değiştir
                    </button>
                  )}
                  {aiMode === "ozet" && (
                    <button
                      className="btn primary"
                      onClick={() => {
                        const id = uid();
                        mutate((s) => {
                          s.notes.push({ id, title: `${note.title || "Not"} — Tekrar`, body: aiText.trim(), subjectId: note.subjectId, updatedAt: Date.now() });
                        });
                        setSelected(id);
                      }}
                    >
                      Yeni not olarak kaydet
                    </button>
                  )}
                  {aiMode === "kart" && parsedCards.length > 0 && (
                    <button className="btn primary" onClick={addCards}>{parsedCards.length} kartı ekle</button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
