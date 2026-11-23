import { PROVIDERS } from "./catalog";

export const PROVIDER_ENDPOINTS: Record<string, { url: string; style: "chat" | "anthropic"; authPrefix: string }> = {
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", style: "chat", authPrefix: "Bearer" },
  huggingface: { url: "https://router.huggingface.co/v1/chat/completions", style: "chat", authPrefix: "Bearer" },
  openai: { url: "https://api.openai.com/v1/chat/completions", style: "chat", authPrefix: "Bearer" },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    style: "chat",
    authPrefix: "Bearer",
  },
  anthropic: { url: "https://api.anthropic.com/v1/messages", style: "anthropic", authPrefix: "x-api-key" },
};

export const MODEL_ALIASES: Record<string, string> = {
  openrouter: "openai/gpt-4o-mini",
  huggingface: "meta-llama/Llama-3.1-8B-Instruct",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  google: "gemini-2.0-flash",
};

export interface GenPayload {
  provider: string;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface GenResult {
  ok: boolean;
  text?: string;
  tokens?: number;
  error?: string;
}

export async function callProvider(p: GenPayload): Promise<GenResult> {
  const ep = PROVIDER_ENDPOINTS[p.provider];
  if (!ep) return { ok: false, error: `Unknown provider: ${p.provider}` };
  if (!p.apiKey) return { ok: false, error: "No API key configured for this provider. Add one in Settings → API Keys." };
  const maxTokens = p.maxTokens ?? 1024;
  try {
    let res: Response;
    if (ep.style === "chat") {
      res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.apiKey}`,
          ...(p.provider === "openrouter" ? { "HTTP-Referer": "https://game-platform.local", "X-Title": "GamePlatform" } : {}),
        },
        body: JSON.stringify({
          model: p.model || MODEL_ALIASES[p.provider],
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: p.system },
            { role: "user", content: p.prompt },
          ],
        }),
      });
    } else {
      res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": p.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: p.model || MODEL_ALIASES[p.provider],
          max_tokens: maxTokens,
          system: p.system,
          messages: [{ role: "user", content: p.prompt }],
        }),
      });
    }
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `${res.status}: ${body.slice(0, 300)}` };
    }
    const data = await res.json();
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.content?.[0]?.text ??
      "";
    const tokens = data?.usage?.total_tokens ?? undefined;
    return { ok: true, text: typeof text === "string" ? text : JSON.stringify(text), tokens };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function providerLabel(id: string): string {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}
