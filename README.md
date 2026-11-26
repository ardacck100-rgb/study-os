# Study-OS

Öğrenciler için akıllı çalışma asistanı: plan, görev, not, tekrar, odak ve yapay zekâ destekli asistan tek yerde.

## Özellikler

| Bölüm | Ne yapar |
|---|---|
| **Bugün** | Bugünkü bloklar, öncelikli 3 görev, haftalık odak grafiği, yaklaşan sınavlar, zorlandığın alanlar ve tek bir **“Sonraki adım”** önerisi. |
| **Plan** | Dersleri (ağır/hafif, öncelik, sınav tarihi) ve günlük süreni girersin; 7 günlük dengeli program çıkar. Ağır/hafif dersler dönüşümlü dağıtılır, sınavı yakın derse ağırlık verilir, molalar ve gün sonu tekrar bloğu eklenir. Bloklar “zorlandım” diye işaretlenebilir. |
| **Görevler** | Öncelik (yüksek/orta/düşük), ders ve son tarihle yapılacaklar listesi. Otomatik sıralama, gecikmiş görev uyarısı. |
| **Notlar** | Ders bazlı notlar. Asistanla tek tıkla: **notu düzenle**, **özet + mini test**, **tekrar kartı üret**. |
| **Tekrar** | Aralıklı tekrar (Leitner: 1 → 2 → 4 → 7 → 15 → 30 gün). Kart ekleme, `S: / C:` biçiminde toplu yapıştırma. |
| **Odak** | Pomodoro sayacı (ayarlanabilir süre). Biten bloklar ilerlemeye işlenir; sayfa değiştirince sayaç durmaz. |
| **Asistan** | Study-OS karakterinde sohbet. Seviyeni, derslerini, bugünkü planını ve görevlerini bilerek cevap verir. Hazır kısayollar: plan, konu anlatımı, tekrar soruları, stres, odak. |
| **Ayarlar** | Profil (ad, seviye, hedef), JSON yedek indir/yükle, sıfırla. |

Veriler tarayıcıda (localStorage) saklanır. Asistan dışındaki her şey çevrimdışı çalışır.

## Kurulum

Gereksinim: Node.js 22+

```bash
npm install
```

Asistan için bir Anthropic API anahtarı gerekir (diğer bölümler anahtarsız çalışır):

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Çalıştırma

Geliştirme (arayüz `http://localhost:5173`, API `:8787`):

```bash
npm run dev
```

Üretim (tek sunucu, `http://localhost:8787`):

```bash
npm run build
```

```bash
npm start
```

İsteğe bağlı ortam değişkenleri: `PORT` (varsayılan 8787), `STUDY_OS_MODEL` (varsayılan `claude-opus-5-5`).

## Yapı

```
server/
  index.ts          Express API: /api/chat (akışlı yanıt), /api/health, üretimde dist/ servis eder
  systemPrompt.ts   Study-OS asistan talimatı
src/
  pages/            Bugün, Plan, Görevler, Notlar, Tekrar, Odak, Asistan, Ayarlar
  planner.ts        Haftalık plan algoritması
  logic.ts          Aralıklı tekrar, istatistik, “sonraki adım”, asistan bağlamı
  store.tsx         Durum + localStorage
  focus.tsx         Pomodoro sayacı
  Markdown.tsx      Asistan çıktısı için güvenli markdown işleyici
```
