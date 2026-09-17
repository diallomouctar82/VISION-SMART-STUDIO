export type SpecificationStage =
  | "ACTIVE" | "INTAKE" | "SPECIFIED" | "NEEDS_CLARIFICATION" | "VALIDATED"
  | "PLANNED" | "TASKED" | "ANALYZED" | "EXECUTING"
  | "CONVERGING" | "CONVERGED" | "BLOCKED_EXTERNAL";

export interface SpecificationSession {
  sessionId: string;
  sessionToken: string;
  missionId?: string | null;
  stage: SpecificationStage;
  message: string;
  question?: string | null;
  turn: number;
  modelBackend?: string | null;
  artifacts?: Record<string, unknown> | unknown[];
}

export interface IntentInput {
  projectId: string;
  missionId?: string;
  intent: string;
  inputMode: "text" | "voice";
  knownContext: Record<string, unknown>;
}

interface AiCoreResponse {
  session_id: string;
  session_token: string;
  mission_id?: string | null;
  state?: SpecificationStage;
  assistant_message?: string;
  question?: string | null;
  turn?: number;
  model_backend?: string | null;
  artifacts?: Record<string, unknown> | unknown[];
}

const localProxy = "/api/ai-core";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toSession(payload: AiCoreResponse): SpecificationSession {
  if (!payload.session_id || !payload.session_token) {
    throw new Error("AI_CORE_INVALID_SESSION");
  }
  const message = payload.assistant_message ?? payload.question ?? "";
  if (!message.trim()) throw new Error("AI_CORE_EMPTY_RESPONSE");
  return {
    sessionId: payload.session_id,
    sessionToken: payload.session_token,
    missionId: payload.mission_id,
    stage: payload.state ?? "ACTIVE",
    message,
    question: payload.question,
    turn: payload.turn ?? 0,
    modelBackend: payload.model_backend,
    artifacts: payload.artifacts,
  };
}

async function post(path: string, body: Record<string, unknown>): Promise<SpecificationSession> {
  const response = await fetch(`${localProxy}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as (AiCoreResponse & {
    error?: { code?: string; message?: string };
  }) | null;
  if (!response.ok) {
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    const message = payload?.error?.message?.trim();
    throw new Error(message ? `${code}:${message}` : `AI_CORE_${code}`);
  }
  if (!payload) throw new Error("AI_CORE_INVALID_RESPONSE");
  return toSession(payload);
}

export async function startSpecificationSession(input: IntentInput): Promise<SpecificationSession> {
  const missionId = input.missionId && uuidPattern.test(input.missionId) ? input.missionId : undefined;
  return post("/specification-sessions", {
    intent: input.intent,
    source: input.inputMode,
    ...(missionId ? { mission_id: missionId } : {}),
    project_context: {
      project_id: input.projectId,
      ...input.knownContext,
    },
  });
}

export async function continueSpecificationSession(
  sessionId: string,
  sessionToken: string,
  message: string,
  knownContext: Record<string, unknown>,
): Promise<SpecificationSession> {
  return post(`/specification-sessions/${encodeURIComponent(sessionId)}/messages`, {
    message,
    session_token: sessionToken,
    known_context: knownContext,
  });
}
