import { useRef } from "react";
import { initialState, useStore } from "../store";
import { LEVEL_LABEL } from "../logic";
import type { AppState, Level } from "../types";
import { Card, PageHeader } from "../ui";
import { ymd } from "../utils";

export function Settings() {
  const { state, mutate, replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-os-yedek-${ymd()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<AppState>;
      if (!data || typeof data !== "object" || !Array.isArray(data.subjects)) throw new Error();
      if (!confirm("Mevcut verilerin yedekteki verilerle değiştirilecek. Devam edilsin mi?")) return;
      replace({ ...initialState(), ...data, version: 1 });
      alert("Yedek yüklendi.");
    } catch {
      alert("Bu dosya geçerli bir Study-OS yedeği değil.");
    }
  };

  return (
    <div className="stack">
      <PageHeader title="Ayarlar" sub="Profilin, asistanın sana uygun seviyede anlatmasını sağlar." />
      <Card title="Profil">
        <div className="form-grid">
          <label>
            <span>Adın</span>
            <input value={state.profile.name} placeholder="İsteğe bağlı" onChange={(e) => mutate((s) => { s.profile.name = e.target.value; })} />
          </label>
          <label>
            <span>Seviye</span>
            <select value={state.profile.level} onChange={(e) => mutate((s) => { s.profile.level = e.target.value as Level; })}>
              {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            <span>Hedefin</span>
            <input
              value={state.profile.goal}
              placeholder="ör. YKS'de ilk 50 bin, dönem sonu ortalamamı 3'e çıkarmak"
              onChange={(e) => mutate((s) => { s.profile.goal = e.target.value; })}
            />
          </label>
        </div>
      </Card>

      <Card title="Verilerin">
        <p className="small muted">Tüm veriler yalnızca bu tarayıcıda saklanır. Asistan kullanıldığında sadece o anki mesaj ve kısa bir özet (seviye, plan, görevler) gönderilir.</p>
        <div className="form-row">
          <button className="btn" onClick={exportData}>Yedeği indir</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Yedek yükle</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm("Tüm veriler silinecek. Emin misin?")) replace(initialState());
            }}
          >
            Her şeyi sıfırla
          </button>
        </div>
      </Card>
    </div>
  );
}
