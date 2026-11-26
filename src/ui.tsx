import type { ReactNode } from "react";
import { useStore } from "./store";

export function SubjectTag({ id }: { id?: string | null }) {
  const { state } = useStore();
  const s = state.subjects.find((x) => x.id === id);
  if (!s) return null;
  return (
    <span className="tag" style={{ ["--c" as string]: s.color }}>
      {s.name}
    </span>
  );
}

export function SubjectSelect({
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = "Ders seç (isteğe bağlı)",
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const { state } = useStore();
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {state.subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ""}`}>
      {(title || action) && (
        <header className="card-h">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function PageHeader({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="page-h">
      <h1>{title}</h1>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}
