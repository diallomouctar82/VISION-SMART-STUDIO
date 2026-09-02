import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase-database.types";

export type PublicSupabaseConfiguration = {
  url: string;
  publishableKey: string;
};

let browserClient: SupabaseClient<Database> | null = null;

export function readPublicSupabaseConfiguration(): PublicSupabaseConfiguration | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) return null;
  } catch {
    return null;
  }

  if (!publishableKey.startsWith("sb_publishable_") || publishableKey.length > 180) return null;
  return { url: url.replace(/\/$/u, ""), publishableKey };
}

export function getBrowserSupabaseClient(
  configuration: PublicSupabaseConfiguration,
): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("Le client Supabase administrateur est réservé au navigateur.");
  }
  if (!browserClient) {
    browserClient = createClient<Database>(configuration.url, configuration.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "vision-smart-studio:admin-auth",
      },
      global: {
        headers: { "X-Client-Info": "vision-smart-studio-admin/0.1" },
      },
    });
  }
  return browserClient;
}
