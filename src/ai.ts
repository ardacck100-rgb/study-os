import type { ChatMessage } from "./types";

/** Asistandan akışlı yanıt alır; her parça geldikçe onChunk çağrılır. */
export async function askAssistant(
  messages: ChatMessage[],
  context: string,
  onChunk: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context }),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    const msg = "⚠️ Asistan sunucusuna ulaşılamadı. `npm run dev` ile sunucunun çalıştığından emin ol.";
    onChunk(msg);
    return msg;
  }
  if (!res.body) {
    const t = await res.text();
    onChunk(t);
    return t;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onChunk(text);
  }
  text += decoder.decode();
  onChunk(text);
  return text;
}

/** Tek seferlik görev (not düzenleme, kart üretme vb.). */
export function runTask(prompt: string, context: string, onChunk: (t: string) => void, signal?: AbortSignal) {
  return askAssistant([{ role: "user", content: prompt }], context, onChunk, signal);
}
