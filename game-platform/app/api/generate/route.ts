import { NextRequest, NextResponse } from "next/server";
import { callProvider } from "@/lib/providers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const { provider, apiKey, model, system, prompt, maxTokens } = body as {
    provider?: string;
    apiKey?: string;
    model?: string;
    system?: string;
    prompt?: string;
    maxTokens?: number;
  };
  if (!provider || !prompt) {
    return NextResponse.json({ ok: false, error: "provider and prompt are required" }, { status: 400 });
  }
  const result = await callProvider({
    provider,
    apiKey: apiKey ?? "",
    model: model ?? "",
    system: system ?? "You are a game development expert. Answer concisely.",
    prompt,
    maxTokens,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
