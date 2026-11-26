import { useEffect, useState } from "react";
import { useStore } from "./store";
import { useFocus } from "./focus";
import { dueCards, type PageId } from "./logic";
import { Today } from "./pages/Today";
import { Plan } from "./pages/Plan";
import { Tasks } from "./pages/Tasks";
import { Notes } from "./pages/Notes";
import { Review } from "./pages/Review";
import { Focus } from "./pages/Focus";
import { Assistant } from "./pages/Assistant";
import { Settings } from "./pages/Settings";

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: "bugun", label: "Bugün", icon: "🏠" },
  { id: "plan", label: "Plan", icon: "📅" },
  { id: "gorevler", label: "Görevler", icon: "✅" },
  { id: "notlar", label: "Notlar", icon: "📝" },
  { id: "tekrar", label: "Tekrar", icon: "🔁" },
  { id: "odak", label: "Odak", icon: "⏱️" },
  { id: "asistan", label: "Asistan", icon: "💬" },
  { id: "ayarlar", label: "Ayarlar", icon: "⚙️" },
];

const readHash = (): PageId => {
  const h = window.location.hash.replace("#/", "") as PageId;
  return NAV.some((n) => n.id === h) ? h : "bugun";
};

export function App() {
  const [page, setPage] = useState<PageId>(readHash);
  const { state } = useStore();
  const focus = useFocus();

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (p: PageId) => {
    window.location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  const badges: Partial<Record<PageId, number>> = {
    tekrar: dueCards(state.cards).length,
    gorevler: state.tasks.filter((t) => !t.done).length,
  };

  const mm = String(Math.floor(focus.remaining / 60)).padStart(2, "0");
  const ss = String(focus.remaining % 60).padStart(2, "0");

  return (
    <div className="app">
      <nav className="nav" aria-label="Ana menü">
        <div className="brand">
          <span className="logo">S</span>
          <span>Study-OS</span>
        </div>
        <ul>
          {NAV.map((n) => (
            <li key={n.id}>
              <button className={page === n.id ? "on" : ""} aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>
                <span className="ico" aria-hidden="true">{n.icon}</span>
                <span className="lbl">{n.label}</span>
                {n.id === "odak" && focus.running ? (
                  <span className="badge live">{mm}:{ss}</span>
                ) : badges[n.id] ? (
                  <span className="badge">{badges[n.id]}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className={`main ${page === "asistan" ? "main-chat" : ""}`}>
        {page === "bugun" && <Today go={go} />}
        {page === "plan" && <Plan />}
        {page === "gorevler" && <Tasks />}
        {page === "notlar" && <Notes />}
        {page === "tekrar" && <Review />}
        {page === "odak" && <Focus />}
        {page === "asistan" && <Assistant />}
        {page === "ayarlar" && <Settings />}
      </main>
    </div>
  );
}
