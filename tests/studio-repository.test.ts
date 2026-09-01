import { encodeStudioState } from "@/lib/studio-codec";
import {
  LEGACY_STUDIO_STORAGE_KEY,
  LocalStorageStudioRepository,
  STUDIO_BACKUP_PREFIX,
  STUDIO_STORAGE_KEY,
  type StorageLike,
} from "@/lib/studio-repository";
import type { StudioStateV3 } from "@/lib/studio-types";
import { describe, expect, it } from "vitest";

const NOW = "2026-09-01T10:00:00.000Z";
const NEXT = "2026-09-01T12:00:00.000Z";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  readonly writes: Array<{ key: string; value: string }> = [];
  readonly getErrors = new Set<string>();
  readonly getErrorsAfterWrite = new Set<string>();
  readonly setErrors = new Set<string>();
  failBackupWrites = false;

  getItem(key: string): string | null {
    if (this.getErrors.has(key)) throw new Error(`lecture refusée: ${key}`);
    if (this.getErrorsAfterWrite.has(key) && this.writes.some((write) => write.key === key)) {
      throw new Error(`relecture refusée: ${key}`);
    }
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.setErrors.has(key) || (this.failBackupWrites && key.startsWith(STUDIO_BACKUP_PREFIX))) {
      throw new Error(`écriture refusée: ${key}`);
    }
    this.writes.push({ key, value });
    this.values.set(key, value);
  }
}

function state(revision = 0): StudioStateV3 {
  return {
    version: 3,
    revision,
    savedAt: NOW,
    activeProjectId: "project",
    projects: [
      {
        id: "project",
        name: "Projet",
        description: "Description",
        createdAt: NOW,
        updatedAt: NOW,
        activeMissionId: "mission",
        missions: [
          {
            id: "mission",
            title: "Mission",
            expectedOutcome: "Résultat",
            tasks: [
              {
                id: "task",
                label: "Tâche",
                status: "todo",
                weight: 1,
                progress: 0,
                checkpoints: [
                  { id: "checkpoint", label: "Checkpoint", weight: 1, verified: false, verifiedAt: null },
                ],
                gates: [
                  {
                    id: "quality",
                    label: "Qualité",
                    required: true,
                    status: "pending",
                    checkedAt: null,
                    evidence: null,
                    reason: null,
                  },
                  {
                    id: "security",
                    label: "Sécurité",
                    required: true,
                    status: "pending",
                    checkedAt: null,
                    evidence: null,
                    reason: null,
                  },
                  {
                    id: "documentation",
                    label: "Documentation",
                    required: true,
                    status: "pending",
                    checkedAt: null,
                    evidence: null,
                    reason: null,
                  },
                ],
                blocker: null,
                legacy: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function encode(value: StudioStateV3): string {
  const result = encodeStudioState(value);
  if (!result.ok) throw new Error("Fixture invalide");
  return result.json;
}

function legacyV2(): string {
  return JSON.stringify({
    version: 2,
    activeProjectId: "legacy-project",
    projects: [
      {
        id: "legacy-project",
        name: "Projet legacy",
        description: "Description legacy",
        createdAt: NOW,
        updatedAt: NOW,
        missions: [
          {
            id: "legacy-mission",
            title: "Mission legacy",
            expectedOutcome: "Résultat legacy",
            tasks: [{ id: "legacy-task", label: "Tâche legacy", status: "done", progress: 100 }],
          },
        ],
      },
    ],
  });
}

function repository(storage: MemoryStorage): LocalStorageStudioRepository {
  return new LocalStorageStudioRepository(storage, { now: () => NEXT });
}

describe("LocalStorageStudioRepository.load", () => {
  it("retourne empty sans écrire quand aucune donnée n'existe", async () => {
    const storage = new MemoryStorage();
    expect(await repository(storage).load()).toEqual({ status: "empty" });
    expect(storage.writes).toEqual([]);
  });

  it("charge un v3 valide sans le réécrire", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STUDIO_STORAGE_KEY, encode(state(3)));
    const result = await repository(storage).load();
    expect(result).toMatchObject({ status: "loaded", state: { revision: 3 } });
    expect(storage.writes).toEqual([]);
  });

  it("sauvegarde le brut avant de promouvoir une donnée legacy", async () => {
    const storage = new MemoryStorage();
    const raw = legacyV2();
    storage.values.set(LEGACY_STUDIO_STORAGE_KEY, raw);

    const result = await repository(storage).load();
    expect(result.status).toBe("migrated");
    if (result.status !== "migrated") return;
    expect(result.fromVersion).toBe(2);
    expect(result.state.revision).toBe(0);
    expect(result.state.projects[0].missions[0].tasks[0].legacy).toEqual({
      reportedStatus: "done",
      reportedProgress: 100,
    });
    expect(storage.writes[0].key).toBe(result.backupKey);
    expect(storage.writes[0].value).toBe(raw);
    expect(storage.writes[1].key).toBe(STUDIO_STORAGE_KEY);
    expect(storage.values.get(LEGACY_STUDIO_STORAGE_KEY)).toBe(raw);
  });

  it("sauvegarde aussi avant de migrer un v2 trouvé sous la clé courante", async () => {
    const storage = new MemoryStorage();
    const raw = legacyV2();
    storage.values.set(STUDIO_STORAGE_KEY, raw);
    const result = await repository(storage).load();
    expect(result.status).toBe("migrated");
    expect(storage.writes[0].key.startsWith(STUDIO_BACKUP_PREFIX)).toBe(true);
    expect(storage.writes[0].value).toBe(raw);
  });

  it("n'écrit jamais par-dessus un état corrompu", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STUDIO_STORAGE_KEY, "{corrompu");
    const result = await repository(storage).load();
    expect(result).toMatchObject({ status: "corrupt", storageKey: STUDIO_STORAGE_KEY });
    expect(storage.values.get(STUDIO_STORAGE_KEY)).toBe("{corrompu");
    expect(storage.writes).toEqual([]);
  });

  it("refuse une version future sans écriture", async () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ ...state(), version: 8 });
    storage.values.set(STUDIO_STORAGE_KEY, raw);
    expect(await repository(storage).load()).toMatchObject({ status: "unsupported_version", version: 8 });
    expect(storage.values.get(STUDIO_STORAGE_KEY)).toBe(raw);
    expect(storage.writes).toEqual([]);
  });

  it("retourne une erreur typée quand getItem échoue", async () => {
    const storage = new MemoryStorage();
    storage.getErrors.add(STUDIO_STORAGE_KEY);
    expect(await repository(storage).load()).toMatchObject({
      status: "storage_error",
      operation: "read",
      storageKey: STUDIO_STORAGE_KEY,
    });
  });

  it("n'effectue pas la promotion si le backup échoue", async () => {
    const storage = new MemoryStorage();
    const raw = legacyV2();
    storage.values.set(LEGACY_STUDIO_STORAGE_KEY, raw);
    storage.failBackupWrites = true;
    const result = await repository(storage).load();
    expect(result).toMatchObject({ status: "storage_error", operation: "backup" });
    expect(storage.values.has(STUDIO_STORAGE_KEY)).toBe(false);
    expect(storage.values.get(LEGACY_STUDIO_STORAGE_KEY)).toBe(raw);
  });

  it("conserve le backup si l'écriture du snapshot migré échoue", async () => {
    const storage = new MemoryStorage();
    storage.values.set(LEGACY_STUDIO_STORAGE_KEY, legacyV2());
    storage.setErrors.add(STUDIO_STORAGE_KEY);
    const result = await repository(storage).load();
    expect(result).toMatchObject({ status: "storage_error", operation: "write" });
    expect([...storage.values.keys()].some((key) => key.startsWith(STUDIO_BACKUP_PREFIX))).toBe(true);
  });

  it("signale l'échec de vérification après promotion tout en conservant le backup", async () => {
    const storage = new MemoryStorage();
    storage.values.set(LEGACY_STUDIO_STORAGE_KEY, legacyV2());
    storage.getErrorsAfterWrite.add(STUDIO_STORAGE_KEY);
    const result = await repository(storage).load();
    expect(result).toMatchObject({ status: "storage_error", operation: "verify" });
    expect([...storage.values.keys()].some((key) => key.startsWith(STUDIO_BACKUP_PREFIX))).toBe(true);
  });
});

describe("LocalStorageStudioRepository.save", () => {
  it("crée le premier snapshot avec revision 1", async () => {
    const storage = new MemoryStorage();
    const result = await repository(storage).save(state(0), 0);
    expect(result).toMatchObject({ status: "saved", state: { revision: 1, savedAt: NEXT } });
    expect(storage.values.has(STUDIO_STORAGE_KEY)).toBe(true);
  });

  it("est l'unique propriétaire du passage N vers N+1 après mutation métier", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STUDIO_STORAGE_KEY, encode(state(7)));
    const businessMutation: StudioStateV3 = {
      ...state(7),
      savedAt: NOW,
      projects: state(7).projects.map((project) => ({ ...project, description: "Mutation métier" })),
    };

    const result = await repository(storage).save(businessMutation, 7);
    expect(result).toMatchObject({
      status: "saved",
      state: { revision: 8, savedAt: NEXT, projects: [{ description: "Mutation métier" }] },
    });
  });

  it("détecte le conflit avec la révision réellement stockée", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STUDIO_STORAGE_KEY, encode(state(5)));
    const result = await repository(storage).save(state(4), 4);
    expect(result).toEqual({
      status: "conflict",
      expectedRevision: 4,
      actualRevision: 5,
      providedStateRevision: 4,
    });
    expect(storage.writes).toEqual([]);
  });

  it("détecte aussi une révision fournie incohérente", async () => {
    const storage = new MemoryStorage();
    storage.values.set(STUDIO_STORAGE_KEY, encode(state(2)));
    const result = await repository(storage).save(state(1), 2);
    expect(result).toMatchObject({ status: "conflict", actualRevision: 2, providedStateRevision: 1 });
  });

  it("rejette l'état invalide avant tout accès en écriture", async () => {
    const storage = new MemoryStorage();
    const invalid = state();
    invalid.projects[0].missions[0].tasks[0].progress = 50;
    const result = await repository(storage).save(invalid, 0);
    expect(result.status).toBe("invalid_state");
    expect(storage.writes).toEqual([]);
  });

  it("refuse d'écraser une donnée existante corrompue", async () => {
    const storage = new MemoryStorage();
    const raw = "{corrompu";
    storage.values.set(STUDIO_STORAGE_KEY, raw);
    const result = await repository(storage).save(state(), 0);
    expect(result.status).toBe("corrupt");
    expect(storage.values.get(STUDIO_STORAGE_KEY)).toBe(raw);
    expect(storage.writes).toEqual([]);
  });

  it("impose le chargement/migration avant de sauvegarder sur du legacy", async () => {
    const storage = new MemoryStorage();
    storage.values.set(LEGACY_STUDIO_STORAGE_KEY, legacyV2());
    expect(await repository(storage).save(state(), 0)).toMatchObject({
      status: "migration_required",
      fromVersion: 2,
    });
    expect(storage.writes).toEqual([]);
  });

  it("retourne l'erreur setItem sans annoncer une sauvegarde", async () => {
    const storage = new MemoryStorage();
    storage.setErrors.add(STUDIO_STORAGE_KEY);
    expect(await repository(storage).save(state(), 0)).toMatchObject({
      status: "storage_error",
      operation: "write",
    });
    expect(storage.values.has(STUDIO_STORAGE_KEY)).toBe(false);
  });

  it("n'annonce pas saved lorsque la relecture de contrôle échoue", async () => {
    const storage = new MemoryStorage();
    storage.getErrorsAfterWrite.add(STUDIO_STORAGE_KEY);
    expect(await repository(storage).save(state(), 0)).toMatchObject({
      status: "storage_error",
      operation: "verify",
    });
  });
});
