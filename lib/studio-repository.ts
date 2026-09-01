import {
  decodeStudioState,
  encodeStudioState,
  type StudioCodecIssue,
  type StudioMigrationWarning,
} from "./studio-codec";
import type { StudioStateV3 } from "./studio-types";

export const STUDIO_STORAGE_KEY = "vision-smart-studio:state";
export const LEGACY_STUDIO_STORAGE_KEY = "vision-smart-studio:phase1";
export const STUDIO_BACKUP_PREFIX = "vision-smart-studio:backup:";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type RepositoryLoadResult =
  | { status: "empty" }
  | { status: "loaded"; state: StudioStateV3 }
  | {
      status: "migrated";
      state: StudioStateV3;
      fromVersion: 1 | 2 | 3;
      sourceKey: string;
      backupKey: string;
      warnings: StudioMigrationWarning[];
    }
  | { status: "corrupt"; storageKey: string; issues: StudioCodecIssue[] }
  | { status: "unsupported_version"; storageKey: string; version: number; issues: StudioCodecIssue[] }
  | {
      status: "storage_error";
      operation: "read" | "backup" | "write" | "verify";
      storageKey: string;
      message: string;
    };

export type RepositorySaveResult =
  | { status: "saved"; state: StudioStateV3 }
  | {
      status: "conflict";
      expectedRevision: number;
      actualRevision: number;
      providedStateRevision: number;
    }
  | { status: "invalid_state"; issues: StudioCodecIssue[] }
  | { status: "migration_required"; storageKey: string; fromVersion: 1 | 2 | 3 }
  | { status: "corrupt"; storageKey: string; issues: StudioCodecIssue[] }
  | { status: "unsupported_version"; storageKey: string; version: number; issues: StudioCodecIssue[] }
  | {
      status: "storage_error";
      operation: "read" | "write" | "verify";
      storageKey: string;
      message: string;
    };

export interface StudioStateRepository {
  load(): Promise<RepositoryLoadResult>;
  save(state: StudioStateV3, expectedRevision: number): Promise<RepositorySaveResult>;
}

export type LocalStorageStudioRepositoryOptions = {
  now?: () => string;
  currentKey?: string;
  legacyKey?: string;
  backupPrefix?: string;
};

type StoredValue = { key: string; raw: string } | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur de stockage inconnue";
}

export class LocalStorageStudioRepository implements StudioStateRepository {
  private readonly now: () => string;
  private readonly currentKey: string;
  private readonly legacyKey: string;
  private readonly backupPrefix: string;

  constructor(
    private readonly storage: StorageLike,
    options: LocalStorageStudioRepositoryOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.currentKey = options.currentKey ?? STUDIO_STORAGE_KEY;
    this.legacyKey = options.legacyKey ?? LEGACY_STUDIO_STORAGE_KEY;
    this.backupPrefix = options.backupPrefix ?? STUDIO_BACKUP_PREFIX;
  }

  private readFirstAvailable():
    | { ok: true; stored: StoredValue }
    | { ok: false; key: string; message: string } {
    let current: string | null;
    try {
      current = this.storage.getItem(this.currentKey);
    } catch (error) {
      return { ok: false, key: this.currentKey, message: errorMessage(error) };
    }
    if (current !== null) return { ok: true, stored: { key: this.currentKey, raw: current } };

    if (this.legacyKey === this.currentKey) return { ok: true, stored: null };
    try {
      const legacy = this.storage.getItem(this.legacyKey);
      return { ok: true, stored: legacy === null ? null : { key: this.legacyKey, raw: legacy } };
    } catch (error) {
      return { ok: false, key: this.legacyKey, message: errorMessage(error) };
    }
  }

  private backupKey(sourceKey: string, timestamp: string): string {
    const safeTimestamp = timestamp.replace(/[^0-9A-Za-z_-]/g, "-");
    const safeSource = sourceKey.replace(/[^0-9A-Za-z_-]/g, "-");
    return `${this.backupPrefix}${safeSource}:${safeTimestamp}`;
  }

  async load(): Promise<RepositoryLoadResult> {
    const read = this.readFirstAvailable();
    if (!read.ok) {
      return {
        status: "storage_error",
        operation: "read",
        storageKey: read.key,
        message: read.message,
      };
    }
    if (read.stored === null) return { status: "empty" };

    const timestamp = this.now();
    const decoded = decodeStudioState(read.stored.raw, { now: () => timestamp });
    if (!decoded.ok) {
      if (decoded.kind === "unsupported_version") {
        return {
          status: "unsupported_version",
          storageKey: read.stored.key,
          version: decoded.version,
          issues: decoded.issues,
        };
      }
      return { status: "corrupt", storageKey: read.stored.key, issues: decoded.issues };
    }

    const requiresPromotion = decoded.migrated || read.stored.key !== this.currentKey;
    if (!requiresPromotion) return { status: "loaded", state: decoded.state };

    const backupKey = this.backupKey(read.stored.key, timestamp);
    try {
      this.storage.setItem(backupKey, read.stored.raw);
    } catch (error) {
      return {
        status: "storage_error",
        operation: "backup",
        storageKey: backupKey,
        message: errorMessage(error),
      };
    }

    const encoded = encodeStudioState(decoded.state);
    if (!encoded.ok) {
      return { status: "corrupt", storageKey: read.stored.key, issues: encoded.issues };
    }
    try {
      this.storage.setItem(this.currentKey, encoded.json);
    } catch (error) {
      return {
        status: "storage_error",
        operation: "write",
        storageKey: this.currentKey,
        message: errorMessage(error),
      };
    }

    let promotedRaw: string | null;
    try {
      promotedRaw = this.storage.getItem(this.currentKey);
    } catch (error) {
      return {
        status: "storage_error",
        operation: "verify",
        storageKey: this.currentKey,
        message: errorMessage(error),
      };
    }
    const promoted = decodeStudioState(promotedRaw);
    if (!promoted.ok || promoted.migrated) {
      return {
        status: "storage_error",
        operation: "verify",
        storageKey: this.currentKey,
        message: "La relecture du snapshot promu a échoué.",
      };
    }

    return {
      status: "migrated",
      state: promoted.state,
      fromVersion: decoded.sourceVersion,
      sourceKey: read.stored.key,
      backupKey,
      warnings: decoded.warnings,
    };
  }

  async save(state: StudioStateV3, expectedRevision: number): Promise<RepositorySaveResult> {
    const encodedInput = encodeStudioState(state);
    if (!encodedInput.ok) return { status: "invalid_state", issues: encodedInput.issues };

    const read = this.readFirstAvailable();
    if (!read.ok) {
      return {
        status: "storage_error",
        operation: "read",
        storageKey: read.key,
        message: read.message,
      };
    }

    let actualRevision = 0;
    if (read.stored !== null) {
      const decoded = decodeStudioState(read.stored.raw);
      if (!decoded.ok) {
        if (decoded.kind === "unsupported_version") {
          return {
            status: "unsupported_version",
            storageKey: read.stored.key,
            version: decoded.version,
            issues: decoded.issues,
          };
        }
        return { status: "corrupt", storageKey: read.stored.key, issues: decoded.issues };
      }
      if (decoded.migrated || read.stored.key !== this.currentKey) {
        return {
          status: "migration_required",
          storageKey: read.stored.key,
          fromVersion: decoded.sourceVersion,
        };
      }
      actualRevision = decoded.state.revision;
    }

    if (actualRevision !== expectedRevision || state.revision !== expectedRevision) {
      return {
        status: "conflict",
        expectedRevision,
        actualRevision,
        providedStateRevision: state.revision,
      };
    }

    const nextState: StudioStateV3 = {
      ...state,
      revision: expectedRevision + 1,
      savedAt: this.now(),
    };
    const encoded = encodeStudioState(nextState);
    if (!encoded.ok) return { status: "invalid_state", issues: encoded.issues };

    try {
      this.storage.setItem(this.currentKey, encoded.json);
    } catch (error) {
      return {
        status: "storage_error",
        operation: "write",
        storageKey: this.currentKey,
        message: errorMessage(error),
      };
    }

    let writtenRaw: string | null;
    try {
      writtenRaw = this.storage.getItem(this.currentKey);
    } catch (error) {
      return {
        status: "storage_error",
        operation: "verify",
        storageKey: this.currentKey,
        message: errorMessage(error),
      };
    }
    const verified = decodeStudioState(writtenRaw);
    if (!verified.ok || verified.migrated) {
      return {
        status: "storage_error",
        operation: "verify",
        storageKey: this.currentKey,
        message: "La relecture du snapshot sauvegardé a échoué.",
      };
    }
    return { status: "saved", state: verified.state };
  }
}
