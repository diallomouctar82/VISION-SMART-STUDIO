export type SpecificationStage =
  | "INTAKE" | "SPECIFIED" | "NEEDS_CLARIFICATION" | "VALIDATED"
  | "PLANNED" | "TASKED" | "ANALYZED" | "EXECUTING"
  | "CONVERGING" | "CONVERGED" | "BLOCKED_EXTERNAL";

export interface SpecificationSession {
  sessionId: string;
  missionId: string;
  stage: SpecificationStage;
  message: string;
  question?: string;
  artifacts?: Record<string, unknown>;
}

export interface IntentInput {
  projectId: string;
  missionId: string;
  intent: string;
  inputMode: "text" | "voice";
  knownContext: Record<string, unknown>;
}

const baseUrl = process.env.NEXT_PUBLIC_AI_CORE_URL?.replace(/\/$/, "");

export async function startSpecificationSession(input: IntentInput): Promise<SpecificationSession> {
  if (!baseUrl) throw new Error("AI_CORE_NOT_CONFIGURED");
  const response = await fetch(`${baseUrl}/v1/specification-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`AI_CORE_HTTP_${response.status}`);
  return response.json() as Promise<SpecificationSession>;
}

export async function continueSpecificationSession(
  sessionId: string,
  message: string,
  knownContext: Record<string, unknown>,
): Promise<SpecificationSession> {
  if (!baseUrl) throw new Error("AI_CORE_NOT_CONFIGURED");
  const response = await fetch(`${baseUrl}/v1/specification-sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, knownContext }),
  });
  if (!response.ok) throw new Error(`AI_CORE_HTTP_${response.status}`);
  return response.json() as Promise<SpecificationSession>;
}
