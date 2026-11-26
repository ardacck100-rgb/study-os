import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./systemPrompt.ts";

const MODEL = process.env.STUDY_OS_MODEL ?? "claude-opus-5-5";
const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.use(express.json({ limit: "1mb" }));

// Kimlik bilgisi ortamdan okunur: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN
// veya `ant auth login` profili.
const client = new Anthropic();

type ChatBody = { messages?: Anthropic.MessageParam[]; context?: string };

function isValidMessages(v: unknown): v is Anthropic.MessageParam[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 60 &&
    v.every(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length <= 40_000,
    ) &&
    v[0].role === "user" &&
    v[v.length - 1].role === "user"
  );
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post("/api/chat", async (req, res) => {
  const { messages, context } = req.body as ChatBody;
  if (!isValidMessages(messages)) {
    res.status(400).json({ error: "Geçersiz mesaj listesi." });
    return;
  }

  // Değişken bağlamı sistem talimatına değil son kullanıcı mesajına ekle,
  // böylece sistem talimatı sabit kalır.
  const convo = messages.map((m) => ({ ...m }));
  if (context && typeof context === "string") {
    const last = convo[convo.length - 1];
    last.content = `[Öğrenci bağlamı]\n${context.slice(0, 4000)}\n[/Öğrenci bağlamı]\n\n${last.content as string}`;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
        output_config: { effort: "medium" },
        // Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında
        // uygun bir modelle yeniden çalıştırılır.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages: convo,
      },
      { signal: controller.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      res.write("\n\n_Bu isteğe yanıt veremiyorum. Soruyu farklı bir şekilde sormayı deneyebilirsin._");
    } else if (final.stop_reason === "max_tokens") {
      res.write("\n\n_(Yanıt uzunluk sınırına ulaştı. \"devam et\" yazabilirsin.)_");
    }
    res.end();
  } catch (error) {
    if (controller.signal.aborted) return;
    let msg = "Asistana şu an ulaşılamıyor. Biraz sonra tekrar dene.";
    if (error instanceof Anthropic.AuthenticationError) {
      msg = "API anahtarı geçersiz ya da eksik. Sunucuyu `ANTHROPIC_API_KEY` ile başlat.";
    } else if (error instanceof Anthropic.RateLimitError) {
      msg = "Çok fazla istek gönderildi. Bir dakika bekleyip tekrar dene.";
    } else if (error instanceof Anthropic.BadRequestError) {
      msg = `İstek reddedildi: ${error.message}`;
    } else if (error instanceof Anthropic.APIError) {
      msg = `API hatası (${error.status ?? "?"}). Biraz sonra tekrar dene.`;
    } else if (error instanceof Anthropic.APIConnectionError) {
      msg = "Asistan sunucusuna bağlanılamadı. İnternet bağlantını kontrol et.";
    } else if (error instanceof Anthropic.AnthropicError) {
      // Ör. hiç kimlik bilgisi yoksa istemci istek göndermeden hata verir.
      msg = "Asistan yapılandırılmamış. Sunucuyu `ANTHROPIC_API_KEY` ile başlat.";
    }
    console.error("[chat]", error);
    if (!res.headersSent) res.status(500);
    res.end(`⚠️ ${msg}`);
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Study-OS API http://localhost:${PORT} (model: ${MODEL})`);
});
