import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = 64 * 1024;
const requestTimeoutMs = 180_000;
const sessionPath = /^specification-sessions\/[0-9a-f-]{36}\/messages$/i;

function allowedPath(segments: string[]): string | null {
  const joined = segments.join("/");
  if (joined === "specification-sessions" || sessionPath.test(joined)) return joined;
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = allowedPath(params.path ?? []);
  if (!path) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Route AI Core non autorisée." } },
      { status: 404 },
    );
  }

  const aiCoreUrl = (process.env.AI_CORE_URL ?? "https://ai-core.moknet.net").replace(/\/$/, "");
  const serviceToken = process.env.AI_CORE_SERVICE_TOKEN?.trim();
  if (!serviceToken) {
    return NextResponse.json(
      {
        error: {
          code: "AI_CORE_NOT_CONFIGURED",
          message: "Le dialogue Studio n'est pas encore autorisé auprès d'AI Core.",
        },
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Message trop volumineux." } },
      { status: 413 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${aiCoreUrl}/v1/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "authorization": `Bearer ${serviceToken}`,
        "x-correlation-id": crypto.randomUUID(),
      },
      body: rawBody,
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({
      error: { code: "AI_CORE_INVALID_RESPONSE", message: "Réponse AI Core invalide." },
    }));
    return NextResponse.json(payload, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "AI_CORE_UNAVAILABLE",
          message: "AI Core est momentanément indisponible. Aucun résultat n'a été simulé.",
        },
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
