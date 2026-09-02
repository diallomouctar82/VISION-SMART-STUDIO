import type { AdminEnvironment } from "@/lib/admin-types";

const FORBIDDEN_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u;

export function normalizeAdminText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function requireAdminLabel(value: string, field: string, maxLength = 120): string {
  const normalized = normalizeAdminText(value);
  const length = Array.from(normalized).length;
  if (length < 2 || length > maxLength || FORBIDDEN_CONTROL_CHARACTERS.test(normalized)) {
    throw new Error(`${field} doit contenir entre 2 et ${maxLength} caractères valides.`);
  }
  return normalized;
}

export function optionalAdminText(value: string, field: string, maxLength: number): string | null {
  const normalized = normalizeAdminText(value);
  if (!normalized) return null;
  if (Array.from(normalized).length > maxLength || FORBIDDEN_CONTROL_CHARACTERS.test(normalized)) {
    throw new Error(`${field} dépasse ${maxLength} caractères ou contient un caractère interdit.`);
  }
  return normalized;
}

export function parseAdminList(value: string, field: string, maxItems = 50): string[] {
  const items = value
    .split(/[\n,]/u)
    .map((item) => normalizeAdminText(item))
    .filter(Boolean);
  const unique = [...new Map(items.map((item) => [item.toLocaleLowerCase("fr"), item])).values()];
  if (!unique.length || unique.length > maxItems) {
    throw new Error(`${field} doit contenir entre 1 et ${maxItems} valeurs distinctes.`);
  }
  if (unique.some((item) => Array.from(item).length > 120 || FORBIDDEN_CONTROL_CHARACTERS.test(item))) {
    throw new Error(`${field} contient une valeur invalide.`);
  }
  return unique;
}

export function parseOptionalAdminList(value: string, field: string, maxItems = 50): string[] {
  if (!normalizeAdminText(value)) return [];
  return parseAdminList(value, field, maxItems);
}

export function requireHttpsUrl(value: string, field: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${field} doit être une URL HTTPS valide.`);
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || normalized.length > 2048
  ) {
    throw new Error(`${field} doit être une URL HTTPS sans identifiants, paramètres ni fragment.`);
  }
  return parsed.toString().replace(/\/$/u, "");
}

export function requireSecretReference(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > 255 || !SAFE_TOKEN.test(normalized)) {
    throw new Error("La référence externe doit être un identifiant de coffre, jamais une valeur secrète.");
  }
  return normalized;
}

export function requireEnvironment(value: string): AdminEnvironment {
  if (value !== "development" && value !== "staging" && value !== "production") {
    throw new Error("Environnement invalide.");
  }
  return value;
}

export function optionalPositiveInteger(value: string, field: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${field} doit être un entier positif.`);
  }
  return parsed;
}

export function optionalPositiveNumber(value: string, field: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${field} doit être un nombre positif.`);
  }
  return parsed;
}

export function createIdempotencyKey(targetType: string, targetId: string, action: string): string {
  return `${targetType}:${targetId}:${action}:${crypto.randomUUID()}`;
}
