import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { askAssistant } from "../ai";
import { buildContext } from "../logic";
import { Markdown } from "../Markdown";
import type { ChatMessage } from "../types";

const QUICK = [
  { label: "📅 Bugün için plan", text: "Bugün için gerçekçi bir çalışma planı yap. Elimdeki verileri kullan." },
  { label: "🧩 Konu anlat", text: "Bir konuyu basitçe anlatır mısın? Konu: " },
  { label: "🔁 Tekrar soruları", text: "Şu konu için 5 maddelik özet, 5 kısa soru-cevap ve cevap anahtarlı mini test hazırla. Konu: " },
  { label: "📈 Durumum nasıl?", text: "İlerlememi değerlendir: neler iyi gidiyor, nerede zorlanıyorum, bir sonraki adımım ne?" },
  { label: "😮‍💨 Stresliyim", text: "Çok stresliyim ve nereden başlayacağımı bilmiyorum." },
  { label: "🎯 Odaklanamıyorum", text: "Odaklanamıyorum, başlamakta zorlanıyorum. Ne yapayım?" },
];

export function Assistant() {
  const { state, mutate } = useStore();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messages = state.chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    mutate((s) => { s.chat.push({ role: "user", content }); });
    setInput("");
    setStreaming("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let final = "";
    try {
      // Son 30 mesajı gönder (bağlamı kısa tut)
      final = await askAssistant(next.slice(-30), buildContext(state), setStreaming, ctrl.signal);
    } catch {
      final = "";
    }
    const reply = final.trim() || (ctrl.signal.aborted ? "_(Durduruldu)_" : "⚠️ Boş yanıt geldi, tekrar dene.");
    mutate((s) => { s.chat.push({ role: "assistant", content: reply }); });
    setStreaming(null);
  };

  const stop = () => abortRef.current?.abort();

  const quick = (text: string) => {
    if (text.endsWith(": ")) {
      setInput(text);
      inputRef.current?.focus();
    } else send(text);
  };

  return (
    <div className="chat">
      <div className="chat-head">
        <div>
          <h1>Asistan</h1>
          <p className="muted small">Plan, konu anlatımı, tekrar, motivasyon. Derslerini ve görevlerini bilir.</p>
        </div>
        {messages.length > 0 && streaming === null && (
          <button className="link" onClick={() => confirm("Sohbet temizlensin mi?") && mutate((s) => { s.chat = []; })}>
            Temizle
          </button>
        )}
      </div>

      <div className="chat-log">
        {messages.length === 0 && streaming === null && (
          <div className="chat-empty">
            <p><strong>Merhaba! Ben Study-OS.</strong> Bugün sana ne kazandırayım?</p>
            <p className="muted small">Örnek: “Yarın fizik sınavım var, konu elektrik, 2 saatim var.”</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" ? <Markdown text={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {streaming !== null && (
          <div className="msg assistant">
            {streaming ? <Markdown text={streaming} /> : <span className="typing"><i /><i /><i /></span>}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="quick">
        {QUICK.map((q) => (
          <button key={q.label} className="chip" disabled={streaming !== null} onClick={() => quick(q.text)}>
            {q.label}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Bir şey sor ya da ne yapmak istediğini yaz…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {streaming !== null ? (
          <button type="button" className="btn" onClick={stop}>Durdur</button>
        ) : (
          <button type="submit" className="btn primary" disabled={!input.trim()}>Gönder</button>
        )}
      </form>
    </div>
  );
}
